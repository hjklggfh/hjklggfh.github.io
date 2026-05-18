import { AssetManager } from './AssetManager';
import { Camera } from './Camera';
import { Clock } from './Clock';
import { clamp, distance, normalize } from './math';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { MiniMapRenderer } from '../render/MiniMapRenderer';
import { WorldGenerator } from '../world/WorldGenerator';
import { WorldAtmosphere } from '../world/WorldAtmosphere';
import { ObjectKind, TerrainKind, TILE_SIZE, WORLD_GENERATION_VERSION, WORLD_PIXELS } from '../world/constants';
import type { WorldMap } from '../world/WorldMap';
import type { BeastSpawn, CaveEntrance, CaveFeature, MarketInventoryItem, RoadsideInn, Settlement, TeleportNode } from '../world/WorldMap';
import { InputManager } from '../input/InputManager';
import { Player } from '../entities/Player';
import { createNPCs, type NPC } from '../entities/NPC';
import { createItem, itemDefinition, type EquipmentSlot } from '../inventory/Inventory';
import { SPELL_LIBRARY, type ItemStack } from '../inventory/Inventory';
import { Inventory } from '../inventory/Inventory';
import { UIManager } from '../ui/UIManager';
import { SaveSystem, type SaveData } from '../save/SaveSystem';
import type { CombatAction, CombatMode, CombatViewState, CombatantView } from '../combat/CombatTypes';
import { DISCIPLE_RANKS, discipleRankIndex, sectRankDiscount, sectRankMeritThreshold, type SectMembership, type SectTaskState, type SectTaskType } from '../sect/SectTypes';
import type { Sect } from '../sect/SectTypes';

const FIXED_WORLD_SEED = 'xiuxian-fixed-world-v1';

interface CombatRuntime {
  mode: CombatMode;
  title: string;
  enemy: CombatantView;
  log: string[];
  source: { kind: 'npc'; npc: NPC } | { kind: 'beast'; beast: BeastSpawn; feature?: CaveFeature };
  result?: 'win' | 'lose' | 'escape';
}

export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly clock = new Clock();
  private readonly assets = new AssetManager();
  private readonly generator = new WorldGenerator();
  private readonly atmosphere = new WorldAtmosphere();
  private readonly inventory = new Inventory();
  private readonly saveSystem = new SaveSystem();
  private readonly input: InputManager;
  private readonly ui: UIManager;
  private renderer!: CanvasRenderer;
  private minimap: MiniMapRenderer;
  private camera!: Camera;
  private worldMap!: WorldMap;
  private map!: WorldMap;
  private player!: Player;
  private npcs: NPC[] = [];
  private animationHandle = 0;
  private running = false;
  private seed = FIXED_WORLD_SEED;
  private nearbyNPC: NPC | null = null;
  private nearbyInn: RoadsideInn | null = null;
  private nearbyBeast: BeastSpawn | null = null;
  private nearbySect: Sect | null = null;
  private activeCave: CaveEntrance | null = null;
  private returnFromCave: { x: number; y: number } | null = null;
  private combat: CombatRuntime | null = null;
  private sectTasks: SectTaskState[] = [];
  private activeSectTaskId: string | null = null;
  private completedSectTaskIds = new Set<string>();
  private autoPathTarget: { x: number; y: number } | null = null;
  private autoPathActive = false;
  private autosaveTimer = 0;
  private autosaveNoticeTimer = 0;
  private readonly autosaveInterval = 45;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    uiRoot: HTMLElement,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas2D is unavailable.');
    this.ctx = ctx;
    this.input = new InputManager(uiRoot);
    this.ui = new UIManager(uiRoot, {
      onInventory: () => this.toggleInventory(),
      onCharacter: () => this.toggleCharacter(),
      onSave: () => this.saveFromUI(),
      onAssets: () => void this.importAssets(),
      onRegenerate: () => this.regenerate(),
      onNPCAction: (npc, action) => this.handleNPCAction(npc, action),
      onBuyMarketItem: (settlement, item) => this.buyMarketItem(settlement, item),
      onEquipItem: (itemId) => this.equipItem(itemId),
      onUnequipSlot: (slot) => this.unequipSlot(slot),
      onUseItem: (itemId) => this.useItem(itemId),
      onLearnItem: (itemId) => this.learnItem(itemId),
      onTeleport: (nodeId) => this.teleportTo(nodeId),
      onBreakthrough: () => this.breakthrough(),
      onAddTalent: (stat) => this.addTalent(stat),
      onCombatAction: (action) => this.handleCombatAction(action),
      onRedeemCode: (code) => this.redeemCode(code),
      onInnService: (inn, service) => this.handleInnService(inn, service),
      onJoinSect: (sect) => this.joinSect(sect),
      onSectService: (sect, service) => this.handleSectService(sect, service),
      onBuySectItem: (sect, itemId) => this.buySectItem(sect, itemId),
      onAcceptSectTask: (sect, type) => this.acceptSectTask(sect, type),
      onClaimSectTask: (taskId) => this.claimSectTask(taskId),
      onToggleAutoPath: () => this.toggleAutoPath(),
    });
    this.minimap = new MiniMapRenderer(uiRoot);
    const mobile = this.ui.getMobileControls();
    this.input.bindMobileControls(mobile.joystick, mobile.stick, mobile.actionButton);
    window.addEventListener('resize', this.resize);
  }

  async start(): Promise<void> {
    await this.assets.loadProjectAssets();
    this.ui.showAssetReport(this.assets.report);
    const save = this.saveSystem.load();
    this.seed = FIXED_WORLD_SEED;
    this.bootstrapWorld(save);
    this.running = true;
    this.animationHandle = requestAnimationFrame(this.loop);
  }

  save(): void {
    if (!this.player || !this.worldMap) return;
    this.saveSystem.save(this.seed, this.player, this.inventory, this.atmosphere, this.npcs, this.worldMap, {
      activeMap: this.activeCave ? 'cave' : 'world',
      activeCaveId: this.activeCave?.id ?? null,
      returnFromCave: this.returnFromCave,
      sectTasks: this.sectTasks,
      activeSectTaskId: this.activeSectTaskId,
      completedSectTaskIds: [...this.completedSectTaskIds],
    });
  }

  private toggleInventory(): void {
    if (!this.player) return;
    this.ui.toggleInventory(this.player, this.inventory);
  }

  private toggleCharacter(): void {
    if (!this.player) return;
    this.ui.toggleCharacter(this.player, this.inventory);
  }

  private saveFromUI(): void {
    if (!this.player) return;
    this.save();
    this.ui.showToast('已保存到本地浏览器。');
  }

  private updateAutosave(delta: number): void {
    if (!this.player || !this.worldMap) return;
    this.autosaveTimer += delta;
    this.autosaveNoticeTimer = Math.max(0, this.autosaveNoticeTimer - delta);
    if (this.autosaveTimer < this.autosaveInterval) return;
    this.autosaveTimer = 0;
    this.save();
    if (this.autosaveNoticeTimer <= 0) {
      this.autosaveNoticeTimer = 120;
      this.ui.showToast('已自动存档。', 1400);
    }
  }

  private bootstrapWorld(save: SaveData | null): void {
    if (save && save.generationVersion !== WORLD_GENERATION_VERSION) save = null;
    this.worldMap = this.generator.generate(this.seed);
    this.map = this.worldMap;
    this.renderer = new CanvasRenderer(this.ctx, this.assets.registry);
    this.player = new Player(this.worldMap.spawn.x, this.worldMap.spawn.y, this.worldMap);
    this.npcs = createNPCs(this.worldMap, 48, this.seed);
    this.camera = new Camera(this.canvas.clientWidth, this.canvas.clientHeight, WORLD_PIXELS, WORLD_PIXELS);
    this.camera.targetZoom = this.defaultZoom();
    this.camera.zoom = this.camera.targetZoom;
    this.activeCave = null;
    this.returnFromCave = null;

    if (save) {
      this.player.stats = this.normalizePlayerStats(save.player.stats);
      const savedEquipment = save.player.equipment ?? { weapon: null, armor: null, talisman: null, boots: null };
      this.player.equipment = {
        weapon: itemDefinition(savedEquipment.weapon ?? '') ? savedEquipment.weapon : null,
        armor: itemDefinition(savedEquipment.armor ?? '') ? savedEquipment.armor : null,
        talisman: itemDefinition(savedEquipment.talisman ?? '') ? savedEquipment.talisman : null,
        boots: itemDefinition(savedEquipment.boots ?? '') ? savedEquipment.boots : null,
      };
      this.player.learnedArts = save.player.learnedArts?.length ? save.player.learnedArts : this.player.learnedArts;
      this.player.sectMembership = save.player.sectMembership ?? null;
      this.inventory.items.splice(0, this.inventory.items.length, ...save.inventory);
      this.inventory.normalize();
      this.atmosphere.timeOfDay = save.atmosphere.timeOfDay;
      this.atmosphere.weather = save.atmosphere.weather;
      for (const index of save.discoveredTiles ?? []) {
        if (this.worldMap.cells[index]) this.worldMap.cells[index].discovered = true;
      }
      for (const market of save.markets ?? []) {
        const settlement = this.worldMap.settlements.find((entry) => entry.id === market.settlementId);
        if (!settlement) continue;
        for (const item of settlement.marketInventory) {
          item.stock = market.stock[item.itemId] ?? item.stock;
        }
      }
      for (const nodeId of save.unlockedTeleportIds ?? []) {
        const node = this.worldMap.teleportNodes.find((entry) => entry.id === nodeId);
        if (node) node.unlocked = true;
      }
      const claimed = new Set(save.claimedCaveFeatureIds ?? []);
      for (const cave of this.worldMap.caves) {
        for (const feature of cave.map.caveFeatures) {
          if (!claimed.has(feature.id)) continue;
          feature.claimed = true;
          const cell = cave.map.get(feature.x, feature.y);
          if (feature.kind === 'treasure' || feature.kind === 'herb') cell.object = ObjectKind.None;
        }
      }
      for (const savedNPC of save.npcs) {
        const npc = this.npcs.find((entry) => entry.id === savedNPC.id);
        if (npc) {
          npc.position = { x: savedNPC.x, y: savedNPC.y };
          npc.profile.favor = savedNPC.favor;
        }
      }
      if (save.activeMap === 'cave' && typeof save.activeCaveId === 'number') {
        const cave = this.worldMap.caves.find((entry) => entry.id === save.activeCaveId);
        if (cave) {
          this.activeCave = cave;
          this.returnFromCave = save.returnFromCave ?? { x: this.worldMap.spawn.x, y: this.worldMap.spawn.y };
          this.map = cave.map;
          this.player.setMap(cave.map);
        }
      }
      this.player.position = { x: save.player.x, y: save.player.y };
      this.sectTasks = save.sectTasks ?? [];
      this.activeSectTaskId = save.activeSectTaskId ?? this.sectTasks.find((task) => !task.completed)?.id ?? null;
      this.completedSectTaskIds = new Set(save.completedSectTaskIds ?? this.sectTasks.filter((task) => task.completed).map((task) => task.id));
    }
    this.removeEquippedItemsFromInventory();

    this.resize();
    this.camera.setWorldSize(this.map.width * TILE_SIZE, this.map.height * TILE_SIZE);
    this.camera.setImmediateCenter(this.player.position.x, this.player.position.y);
  }

  private readonly loop = (now: number): void => {
    if (!this.running) return;
    this.clock.begin(now);
    while (this.clock.consumeFixedStep()) {
      this.update(this.clock.fixedStep);
    }
    this.render(now / 1000);
    this.input.afterUpdate();
    this.animationHandle = requestAnimationFrame(this.loop);
  };

  private update(delta: number): void {
    this.input.beforeUpdate();
    this.updateAutosave(delta);
    if (this.combat) {
      if (this.input.cancelPressed && this.combat.result) this.closeCombat();
      this.ui.updateHUD(this.player, this.map, this.atmosphere, this.renderer.stats, this.nearbyNPC, this.nearbyInn, this.nearbyBeast);
      this.ui.setQuestState(this.sectTasks.filter((task) => !task.completed), this.autoPathActive);
      return;
    }
    this.camera.targetZoom = clamp(this.camera.targetZoom + this.input.zoomDelta, 1.25, 3.4);
    this.player.move(this.autoPathActive ? this.autoPathMovement() : this.input.movement, delta);
    this.player.update(delta);
    this.atmosphere.update(delta);

    for (const npc of this.npcs) {
      const distToPlayer = distance(npc.position, this.player.position);
      if (distToPlayer < 900) npc.update(delta);
    }

    const tile = this.player.currentTile();
    this.map.markDiscovered(tile.x, tile.y, 10);
    this.unlockNearbyTeleport(tile.x, tile.y);
    this.nearbyNPC = this.activeCave ? null : this.findNearbyNPC();
    this.nearbyInn = this.activeCave ? null : this.findNearbyInn(tile.x, tile.y);
    this.nearbyBeast = this.findNearbyBeast(tile.x, tile.y);
    this.nearbySect = this.activeCave ? null : this.findNearbySect(tile.x, tile.y);
    this.updateSectTaskProgress(tile.x, tile.y);
    if (this.input.interactPressed) this.interact();
    if (this.input.inventoryPressed) this.ui.toggleInventory(this.player, this.inventory);
    if (this.input.characterPressed) this.ui.toggleCharacter(this.player, this.inventory);
    if (this.input.mapPressed) this.minimap.toggleExpanded();
    if (this.input.cancelPressed) this.minimap.closeExpanded();
    if (this.input.savePressed) {
      this.save();
      this.ui.showToast('已保存到本地浏览器。');
    }
    this.camera.follow(this.player.position.x, this.player.position.y, delta);
    this.ui.updateHUD(this.player, this.map, this.atmosphere, this.renderer.stats, this.nearbyNPC, this.nearbyInn, this.nearbyBeast);
    this.ui.setQuestState(this.sectTasks.filter((task) => !task.completed), this.autoPathActive);
  }

  private render(timeSeconds: number): void {
    this.renderer.render(this.map, this.camera, this.atmosphere.state(), timeSeconds);
    this.renderEntities(timeSeconds);
    this.minimap.render(this.map, this.player);
  }

  private renderEntities(timeSeconds: number): void {
    const ctx = this.ctx;
    const visible = this.camera.visibleWorldRect(TILE_SIZE * 2);
    const entities: (
      | { kind: 'npc'; entity: NPC }
      | { kind: 'player'; entity: Player }
      | { kind: 'beast'; entity: BeastSpawn }
    )[] = [];
    if (!this.activeCave) {
      for (const npc of this.npcs) {
        entities.push({ kind: 'npc', entity: npc });
      }
    }
    for (const beast of this.map.beasts) {
      entities.push({ kind: 'beast', entity: beast });
    }
    entities.push({ kind: 'player', entity: this.player });

    const visibleEntities = entities.filter(({ kind, entity }) => {
      if (kind === 'beast') {
        const x = entity.x * TILE_SIZE + TILE_SIZE / 2;
        const y = entity.y * TILE_SIZE + TILE_SIZE / 2;
        return x > visible.x && x < visible.x + visible.w && y > visible.y && y < visible.y + visible.h;
      }
      return entity.position.x > visible.x && entity.position.x < visible.x + visible.w && entity.position.y > visible.y && entity.position.y < visible.y + visible.h;
    });
    visibleEntities.sort((a, b) => this.entitySortY(a) - this.entitySortY(b));

    for (const entry of visibleEntities) {
      if (entry.kind === 'player') {
        this.drawSprite(this.playerSpriteId(entry.entity), entry.entity.position.x, entry.entity.position.y, timeSeconds, true);
      } else if (entry.kind === 'beast') {
        this.drawSprite(entry.entity.spriteId, entry.entity.x * TILE_SIZE + TILE_SIZE / 2, entry.entity.y * TILE_SIZE + TILE_SIZE / 2, timeSeconds, false);
      } else {
        this.drawSprite(entry.entity.sprite, entry.entity.position.x, entry.entity.position.y, timeSeconds, false);
        if (entry.entity === this.nearbyNPC) this.drawInteractMarker(entry.entity.position.x, entry.entity.position.y, timeSeconds);
      }
    }
    if (this.nearbyInn) this.drawInteractMarker(this.nearbyInn.x * TILE_SIZE + TILE_SIZE / 2, this.nearbyInn.y * TILE_SIZE, timeSeconds);
    if (this.nearbySect) this.drawInteractMarker(this.nearbySect.x * TILE_SIZE + TILE_SIZE / 2, this.nearbySect.y * TILE_SIZE, timeSeconds);
    const task = this.activeTask();
    if (!this.activeCave && task) this.drawTaskMarker(task, timeSeconds);
  }

  private entitySortY(entry: { kind: 'npc'; entity: NPC } | { kind: 'player'; entity: Player } | { kind: 'beast'; entity: BeastSpawn }): number {
    return entry.kind === 'beast' ? entry.entity.y * TILE_SIZE + TILE_SIZE / 2 : entry.entity.position.y;
  }

  private drawSprite(spriteId: string, x: number, y: number, timeSeconds: number, isPlayer: boolean): void {
    const sprite = this.assets.registry.sprites[spriteId];
    const screen = this.camera.worldToScreen(x - TILE_SIZE / 2, y - TILE_SIZE / 2);
    const size = TILE_SIZE * this.camera.zoom;
    this.ctx.save();
    this.ctx.globalAlpha = 0.28;
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.ellipse(screen.x + size / 2, screen.y + size * 0.88, size * 0.24, size * 0.08, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
    const bob = Math.sin(timeSeconds * 8) * (isPlayer ? 1.2 : 0.5);
    if (sprite) {
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(sprite, screen.x, screen.y + bob * this.camera.zoom, size, size);
    } else {
      this.ctx.fillStyle = isPlayer ? '#4c7f9c' : '#607a48';
      this.ctx.fillRect(screen.x + size * 0.28, screen.y + size * 0.2, size * 0.44, size * 0.62);
    }
    this.ctx.restore();
  }

  private drawInteractMarker(x: number, y: number, timeSeconds: number): void {
    const screen = this.camera.worldToScreen(x, y - 26);
    this.ctx.save();
    this.ctx.globalAlpha = 0.9;
    this.ctx.fillStyle = '#f0d36d';
    this.ctx.beginPath();
    this.ctx.arc(screen.x, screen.y + Math.sin(timeSeconds * 5) * 3, 4 * this.camera.zoom, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private drawTaskMarker(task: SectTaskState, timeSeconds: number): void {
    const screen = this.camera.worldToScreen(task.targetX * TILE_SIZE + TILE_SIZE / 2, task.targetY * TILE_SIZE - 12);
    if (screen.x < -40 || screen.y < -40 || screen.x > this.canvas.clientWidth + 40 || screen.y > this.canvas.clientHeight + 40) return;
    this.ctx.save();
    this.ctx.globalAlpha = 0.9;
    this.ctx.fillStyle = '#f3e27d';
    this.ctx.strokeStyle = '#554b22';
    this.ctx.lineWidth = Math.max(1, this.camera.zoom);
    this.ctx.beginPath();
    const bob = Math.sin(timeSeconds * 4) * 4 * this.camera.zoom;
    this.ctx.moveTo(screen.x, screen.y + bob);
    this.ctx.lineTo(screen.x - 8 * this.camera.zoom, screen.y - 14 * this.camera.zoom + bob);
    this.ctx.lineTo(screen.x + 8 * this.camera.zoom, screen.y - 14 * this.camera.zoom + bob);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.restore();
  }

  private playerSpriteId(player: Player): string {
    const frame = player.isMoving ? player.walkFrame : 0;
    return `player_${player.facingDirection}_${frame}`;
  }

  private findNearbyNPC(): NPC | null {
    let best: NPC | null = null;
    let bestDist = 48;
    for (const npc of this.npcs) {
      const d = distance(npc.position, this.player.position);
      if (d < bestDist) {
        best = npc;
        bestDist = d;
      }
    }
    return best;
  }

  private findNearbyBeast(tileX: number, tileY: number): BeastSpawn | null {
    let best: BeastSpawn | null = null;
    let bestDist = 3.2;
    for (const beast of this.map.beasts) {
      const d = Math.hypot(beast.x - tileX, beast.y - tileY);
      if (d < bestDist) {
        best = beast;
        bestDist = d;
      }
    }
    return best;
  }

  private interact(): void {
    if (this.nearbyNPC) {
      this.ui.openDialogue(this.nearbyNPC);
      return;
    }
    const tile = this.player.currentTile();
    if (this.nearbyBeast) {
      this.startBeastCombat(this.nearbyBeast);
      return;
    }
    const caveFeature = this.findNearbyCaveFeature(tile.x, tile.y);
    if (caveFeature) {
      this.handleCaveFeature(caveFeature);
      return;
    }
    const caveEntrance = this.findNearbyCaveEntrance(tile.x, tile.y);
    if (caveEntrance) {
      this.enterCave(caveEntrance);
      return;
    }
    if (this.nearbyInn) {
      this.ui.openInn(this.nearbyInn, this.player, this.inventory);
      return;
    }
    if (this.nearbySect) {
      this.ui.openSect(this.nearbySect, this.sectTasks, this.player, this.inventory);
      return;
    }
    const teleport = this.findNearbyTeleport(tile.x, tile.y);
    if (teleport) {
      teleport.unlocked = true;
      this.ui.openTeleport(this.worldMap.teleportNodes, teleport.id, this.player, this.inventory);
      return;
    }
    const settlement = this.findNearbyMarket(tile.x, tile.y);
    if (settlement) {
      this.ui.openMarket(settlement, this.player, this.inventory);
      return;
    }
    const interest = this.map.interestPoints.find((point) => Math.hypot(point.x - tile.x, point.y - tile.y) < 4);
    if (interest) {
      interest.discovered = true;
    this.inventory.add({
        id: `find-${interest.id}`,
        name: interest.kind === 'herb' ? '野生灵草' : '旧符残片',
        category: interest.kind === 'herb' ? '材料' : '符咒',
        quantity: 1,
        description: `来自${interest.name}。`,
        value: 12,
      });
      this.ui.markPanelDirty(this.player, this.inventory);
      this.ui.showToast(`发现 ${interest.name}，获得少量物资。`);
    } else {
      this.ui.showToast('附近没有可交互目标。');
    }
  }

  private findNearbyCaveEntrance(tileX: number, tileY: number): CaveEntrance | null {
    if (this.activeCave) return null;
    let best: CaveEntrance | null = null;
    let bestDist = 4;
    for (const cave of this.worldMap.caves) {
      const d = Math.hypot(cave.x - tileX, cave.y - tileY);
      if (d < bestDist) {
        best = cave;
        bestDist = d;
      }
    }
    return best;
  }

  private findNearbyCaveFeature(tileX: number, tileY: number): CaveFeature | null {
    if (!this.activeCave) return null;
    let best: CaveFeature | null = null;
    let bestDist = 3;
    for (const feature of this.activeCave.map.caveFeatures) {
      if (feature.claimed && feature.kind !== 'exit') continue;
      const d = Math.hypot(feature.x - tileX, feature.y - tileY);
      if (d < bestDist) {
        best = feature;
        bestDist = d;
      }
    }
    return best;
  }

  private handleCaveFeature(feature: CaveFeature): void {
    if (feature.kind === 'exit') {
      this.leaveCave();
      return;
    }
    if (feature.kind === 'treasure' || feature.kind === 'herb') {
      if (feature.claimed) {
        this.ui.showToast('这里已经被搜寻过。');
        return;
      }
      const loot = feature.loot ?? [];
      for (const item of loot) this.inventory.add(item);
      feature.claimed = true;
      this.map.get(feature.x, feature.y).object = ObjectKind.None;
      this.renderer.invalidateTile(feature.x, feature.y);
      this.ui.markPanelDirty(this.player, this.inventory);
      this.ui.showToast(`${feature.kind === 'treasure' ? '开启宝箱' : '采得灵草'}：${loot.map((item) => `${item.name}×${item.quantity}`).join('、') || '无所得'}`);
      return;
    }
    if (feature.kind === 'beast' && feature.beast) {
      this.startBeastCombat(feature.beast, feature);
      return;
    }
  }

  private enterCave(cave: CaveEntrance): void {
    this.activeCave = cave;
    const worldTile = this.player.currentTile();
    this.returnFromCave = { x: worldTile.x, y: worldTile.y + 1 };
    this.map = cave.map;
    this.player.setMap(this.map);
    this.player.position = {
      x: this.map.spawn.x * TILE_SIZE + TILE_SIZE / 2,
      y: this.map.spawn.y * TILE_SIZE + TILE_SIZE / 2,
    };
    this.switchCameraToActiveMap();
    this.map.markDiscovered(this.map.spawn.x, this.map.spawn.y, 8);
    this.ui.showToast(`进入${cave.name}。`);
  }

  private leaveCave(): void {
    if (!this.activeCave) return;
    const target = this.returnFromCave ?? { x: this.activeCave.x, y: this.activeCave.y + 1 };
    this.activeCave = null;
    this.returnFromCave = null;
    this.map = this.worldMap;
    this.player.setMap(this.worldMap);
    this.player.position = {
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_SIZE + TILE_SIZE / 2,
    };
    this.switchCameraToActiveMap();
    this.ui.showToast('离开洞窟，回到山外。');
  }

  private findNearbyTeleport(tileX: number, tileY: number): TeleportNode | null {
    if (this.activeCave) return null;
    let best: TeleportNode | null = null;
    let bestDist = 4;
    for (const node of this.worldMap.teleportNodes) {
      const d = Math.hypot(node.x - tileX, node.y - tileY);
      if (d < bestDist) {
        best = node;
        bestDist = d;
      }
    }
    return best;
  }

  private unlockNearbyTeleport(tileX: number, tileY: number): void {
    if (this.activeCave) return;
    const settlement = this.worldMap.settlements.find((entry) => Math.hypot(entry.x - tileX, entry.y - tileY) < entry.radius);
    const sect = this.worldMap.sects.find((entry) => Math.hypot(entry.x - tileX, entry.y - tileY) < entry.radius);
    const node = settlement
      ? this.worldMap.teleportNodes.find((entry) => entry.settlementId === settlement.id)
      : sect
        ? this.worldMap.teleportNodes.find((entry) => entry.sectId === sect.id)
        : null;
    if (!node || node.unlocked) return;
    node.unlocked = true;
    this.ui.showToast(`已解锁${node.name}传送阵。`);
  }

  private findNearbyMarket(tileX: number, tileY: number): Settlement | null {
    let best: Settlement | null = null;
    let bestDist = 5;
    for (const settlement of this.map.settlements) {
      const marketPoint = this.marketPoint(settlement);
      const d = Math.hypot(marketPoint.x - tileX, marketPoint.y - tileY);
      if (d < bestDist) {
        best = settlement;
        bestDist = d;
      }
    }
    return best;
  }

  private findNearbyInn(tileX: number, tileY: number): RoadsideInn | null {
    let best: RoadsideInn | null = null;
    let bestDist = 5;
    for (const inn of this.map.inns) {
      const d = Math.hypot(inn.x - tileX, inn.y - tileY);
      if (d < bestDist) {
        best = inn;
        bestDist = d;
      }
    }
    return best;
  }

  private findNearbySect(tileX: number, tileY: number): Sect | null {
    let best: Sect | null = null;
    let bestDist = 6;
    for (const sect of this.worldMap.sects) {
      const points = [sect.shop, sect.spiritPool, sect.taskBoard, sect.teleport, { x: sect.x, y: sect.y }];
      const d = Math.min(...points.map((point) => Math.hypot(point.x - tileX, point.y - tileY)));
      if (d < bestDist) {
        best = sect;
        bestDist = d;
      }
    }
    return best;
  }

  private restAtInn(inn: RoadsideInn): void {
    if (!this.inventory.remove('spirit-stone', inn.price)) {
      this.ui.showToast(`${inn.name} 休息需要 ${inn.price} 枚下品灵石。`);
      return;
    }
    this.player.stats.hp = this.player.stats.maxHp;
    this.player.stats.mana = this.player.stats.maxMana;
    this.atmosphere.timeOfDay = (this.atmosphere.timeOfDay + 0.18) % 1;
    this.ui.markPanelDirty(this.player, this.inventory);
    this.ui.showToast(`在${inn.name}歇脚调息，气血与灵力已恢复。`);
  }

  private handleInnService(inn: RoadsideInn, service: 'rest' | 'wine_mana' | 'wine_exp' | 'wine_body' | 'rumor'): string {
    const totals = this.player.totalStats();
    const pay = (amount: number): boolean => this.inventory.remove('spirit-stone', amount);
    if (service === 'rest') {
      if (!pay(inn.price)) return `${inn.name} 休息需要 ${inn.price} 枚下品灵石。`;
      this.player.stats.hp = totals.maxHp;
      this.atmosphere.timeOfDay = (this.atmosphere.timeOfDay + 0.14) % 1;
      this.ui.markPanelDirty(this.player, this.inventory);
      return `在${inn.name}安睡一阵，气血已恢复。`;
    }
    if (service === 'wine_mana') {
      if (!pay(8)) return '竹叶灵酒需要 8 枚下品灵石。';
      this.player.stats.mana = Math.min(totals.maxMana, this.player.stats.mana + 60);
      this.ui.markPanelDirty(this.player, this.inventory);
      return '饮下竹叶灵酒，灵力回转。';
    }
    if (service === 'wine_exp') {
      if (this.player.stats.breakthroughReady || this.player.stats.exp >= this.player.stats.expToNext) return '经验已满，饮用百花灵酿不会生效。';
      if (!pay(18)) return '百花灵酿需要 18 枚下品灵石。';
      this.player.gainExp(45);
      this.ui.markPanelDirty(this.player, this.inventory);
      return '饮下百花灵酿，修为有所精进。';
    }
    if (service === 'wine_body') {
      if (this.player.stats.breakthroughReady || this.player.stats.exp >= this.player.stats.expToNext) return '经验已满，烈阳烧的修炼药性会浪费。';
      if (!pay(24)) return '烈阳烧需要 24 枚下品灵石。';
      this.player.stats.hp = Math.min(totals.maxHp, this.player.stats.hp + 35);
      this.player.stats.mana = Math.min(totals.maxMana, this.player.stats.mana + 25);
      this.player.gainExp(20);
      this.ui.markPanelDirty(this.player, this.inventory);
      return '烈阳烧入喉，气血、灵力与修为皆有增长。';
    }
    if (!pay(3)) return '打探情报需要 3 枚下品灵石。';
    this.ui.markPanelDirty(this.player, this.inventory);
    const rumors = ['掌柜低声提到，北侧山壁近来有洞窟妖气外泄。', '行脚客说，沿主路的客栈常能听到坊市货物流向。', '有人在林间见过旧阵台残光，或许以后可引出任务。'];
    return rumors[Math.floor(Math.random() * rumors.length)];
  }

  private joinSect(sect: Sect): string {
    if (this.player.sectMembership) return `你已是${this.player.sectMembership.sectName}${this.player.sectMembership.rank}。`;
    const hostile = sect.relations.hostile.map((id) => this.worldMap.sects.find((entry) => entry.id === id)?.name).filter(Boolean).join('、') || '暂无明确敌宗';
    const membership: SectMembership = {
      sectId: sect.id,
      sectName: sect.name,
      rank: '外门弟子',
      merit: 0,
      lastResourceDay: -1,
    };
    this.player.sectMembership = membership;
    const node = this.worldMap.teleportNodes.find((entry) => entry.sectId === sect.id);
    if (node) node.unlocked = true;
    this.ui.markPanelDirty(this.player, this.inventory);
    this.save();
    return `拜入${sect.name}，成为外门弟子。入门需谨记：敌对宗门为 ${hostile}。`;
  }

  private handleSectService(sect: Sect, service: 'resources' | 'pool' | 'promote'): string {
    const membership = this.requireSectMembership(sect);
    if (typeof membership === 'string') return membership;
    if (service === 'resources') {
      const day = Math.floor(this.atmosphere.timeOfDay * 1000 + performance.now() / 1000 / 420);
      if (membership.lastResourceDay === day) return '今日宗门月俸已经领取过。';
      const rankIndex = discipleRankIndex(membership.rank);
      membership.lastResourceDay = day;
      this.inventory.add(createItem('spirit-stone', 18 + rankIndex * 16));
      this.inventory.add(createItem(rankIndex >= 2 ? 'marrow-wash-pill' : 'sect-qi-pill', 1 + Math.floor(rankIndex / 2)));
      this.ui.markPanelDirty(this.player, this.inventory);
      this.save();
      return `领取${membership.rank}月俸：灵石与修炼丹药已入背包。`;
    }
    if (service === 'pool') {
      const rankIndex = discipleRankIndex(membership.rank);
      const cost = Math.max(6, 14 - rankIndex * 3);
      if (this.player.stats.breakthroughReady || this.player.stats.exp >= this.player.stats.expToNext) return '你已到瓶颈，继续修炼不会增加经验。';
      if (!this.inventory.remove('spirit-stone', cost)) return `灵气池修炼需要 ${cost} 枚下品灵石。`;
      this.player.stats.mana = this.player.totalStats().maxMana;
      this.player.gainExp(35 + rankIndex * 25);
      this.ui.markPanelDirty(this.player, this.inventory);
      this.save();
      return `在${sect.name}灵气池修炼，灵力充盈，修为增长。`;
    }
    const threshold = sectRankMeritThreshold(membership.rank);
    if (membership.merit < threshold) return `晋升还需要功勋 ${threshold}，当前 ${membership.merit}。`;
    const nextRank = DISCIPLE_RANKS[discipleRankIndex(membership.rank) + 1];
    if (!nextRank) return '你已是宗门最高弟子身份。';
    membership.rank = nextRank;
    this.player.stats.maxMana += 10;
    this.player.stats.attack += 1;
    this.ui.markPanelDirty(this.player, this.inventory);
    this.save();
    return `晋升为${nextRank}，宗门资源与商店折扣提升。`;
  }

  private buySectItem(sect: Sect, itemId: string): string {
    const membership = this.requireSectMembership(sect);
    if (typeof membership === 'string') return membership;
    const item = sect.marketInventory.find((entry) => entry.itemId === itemId);
    if (!item) return '宗门商店没有这件物品。';
    if (item.stock <= 0) return `${item.name} 已兑换完。`;
    if (discipleRankIndex(membership.rank) < discipleRankIndex(item.minRank)) return `需要${item.minRank}身份才能兑换。`;
    const price = Math.max(1, Math.round(item.price * sectRankDiscount(membership.rank)));
    if (!this.inventory.remove('spirit-stone', price)) return `需要 ${price} 枚下品灵石兑换 ${item.name}。`;
    item.stock -= 1;
    this.inventory.add(createItem(item.itemId, 1));
    this.ui.markPanelDirty(this.player, this.inventory);
    this.save();
    return `在${sect.name}兑换 ${item.name}。`;
  }

  private acceptSectTask(sect: Sect, type: SectTaskType): string {
    const membership = this.requireSectMembership(sect);
    if (typeof membership === 'string') return membership;
    if (this.sectTasks.some((task) => !task.completed && task.sectId === sect.id && task.type === type)) return '同类宗门任务已经在进行中。';
    const task = this.createSectTask(sect, type);
    this.sectTasks.push(task);
    this.activeSectTaskId = task.id;
    this.autoPathTarget = { x: task.targetX, y: task.targetY };
    this.ui.setQuestState(this.sectTasks.filter((entry) => !entry.completed), this.autoPathActive);
    this.save();
    return `接取任务：${task.title}。目标已标记在地图上，可使用自动寻路。`;
  }

  private claimSectTask(taskId: string): string {
    const task = this.sectTasks.find((entry) => entry.id === taskId);
    if (!task) return '没有找到该任务。';
    if (task.completed) return '该任务已经完成。';
    if (task.progress < task.required) return '任务尚未完成。';
    const membership = this.player.sectMembership;
    if (!membership || membership.sectId !== task.sectId) return '只有本宗弟子可以交付该任务。';
    task.completed = true;
    membership.merit += task.rewardMerit;
    this.inventory.add(createItem('spirit-stone', task.rewardStones));
    if (task.rewardItemId) this.inventory.add(createItem(task.rewardItemId, 1));
    this.completedSectTaskIds.add(task.id);
    if (this.activeSectTaskId === task.id) this.activeSectTaskId = this.sectTasks.find((entry) => !entry.completed)?.id ?? null;
    this.autoPathActive = false;
    this.ui.markPanelDirty(this.player, this.inventory);
    this.ui.setQuestState(this.sectTasks.filter((entry) => !entry.completed), this.autoPathActive);
    this.save();
    return `交付${task.title}，获得功勋 ${task.rewardMerit} 与灵石 ${task.rewardStones}。`;
  }

  private requireSectMembership(sect: Sect): SectMembership | string {
    const membership = this.player.sectMembership;
    if (!membership || membership.sectId !== sect.id) return `你尚未拜入${sect.name}。`;
    return membership;
  }

  private marketPoint(settlement: Settlement): { x: number; y: number } {
    const gate = settlement.gate;
    if (!gate) return { x: settlement.x, y: settlement.y };
    return {
      x: Math.round(settlement.x - gate.ny * Math.max(2, settlement.radius * 0.28)),
      y: Math.round(settlement.y + gate.nx * Math.max(2, settlement.radius * 0.28)),
    };
  }

  private createSectTask(sect: Sect, type: SectTaskType): SectTaskState {
    const rankIndex = discipleRankIndex(this.player.sectMembership?.rank);
    const base = {
      id: `sect-task-${sect.id}-${type}-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`,
      sectId: sect.id,
      sectName: sect.name,
      type,
      completed: false,
      required: 1,
      progress: 0,
      rewardMerit: 28 + rankIndex * 14,
      rewardStones: 16 + rankIndex * 10,
      rewardItemId: rankIndex >= 1 ? 'sect-qi-pill' : undefined,
    };
    if (type === 'gather') {
      const target = this.findNearestInterest(sect.x, sect.y, 'herb') ?? this.findNearestCaveOrHerb(sect.x, sect.y);
      return {
        ...base,
        title: `${sect.name}采药令`,
        description: '前往标记地点采摘灵药，供宗门丹房炼制月俸。',
        targetName: target?.name ?? '野外灵药点',
        targetX: target?.x ?? Math.round(sect.x + 24),
        targetY: target?.y ?? Math.round(sect.y + 24),
        targetId: target ? `interest-${target.id}` : undefined,
      };
    }
    if (type === 'hunt') {
      const beast = this.findNearestBeast(sect.x, sect.y);
      return {
        ...base,
        title: `${sect.name}清剿妖兽`,
        description: '清理宗门外缘妖兽，保障弟子往来安全。',
        targetName: beast?.name ?? '野外妖兽',
        targetX: beast?.x ?? Math.round(sect.x + 32),
        targetY: beast?.y ?? Math.round(sect.y + 32),
        targetId: beast?.id,
        rewardMerit: base.rewardMerit + 18,
        rewardStones: base.rewardStones + 12,
        rewardItemId: 'beast-core',
      };
    }
    const rivalId = sect.relations.hostile[0] ?? this.worldMap.sects.find((entry) => entry.id !== sect.id)?.id;
    const rival = this.worldMap.sects.find((entry) => entry.id === rivalId) ?? sect;
    return {
      ...base,
      title: `${sect.name}敌宗试炼`,
      description: `前往${rival.name}边界挑战敌对宗门弟子。当前版本抵达目标区域即可记录试炼完成。`,
      targetName: rival.name,
      targetX: rival.gate.x,
      targetY: rival.gate.y,
      targetSectId: rival.id,
      rewardMerit: base.rewardMerit + 26,
      rewardStones: base.rewardStones + 18,
    };
  }

  private findNearestInterest(x: number, y: number, kind: 'herb' | 'cave' | 'hidden' | 'shrine'): { id: number; name: string; x: number; y: number } | null {
    return (
      [...this.worldMap.interestPoints]
        .filter((point) => point.kind === kind)
        .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] ?? null
    );
  }

  private findNearestCaveOrHerb(x: number, y: number): { id: number; name: string; x: number; y: number } | null {
    const interest = [...this.worldMap.interestPoints].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (interest) return interest;
    const cave = [...this.worldMap.caves].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    return cave ?? null;
  }

  private findNearestBeast(x: number, y: number): BeastSpawn | null {
    return [...this.worldMap.beasts].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0] ?? null;
  }

  private activeTask(): SectTaskState | null {
    return this.sectTasks.find((task) => task.id === this.activeSectTaskId && !task.completed) ?? this.sectTasks.find((task) => !task.completed) ?? null;
  }

  private buyMarketItem(_settlement: Settlement, item: MarketInventoryItem): string {
    if (item.stock <= 0) return `${item.name} 已售罄。`;
    const paid = this.inventory.remove('spirit-stone', item.price);
    if (!paid) return `需要 ${item.price} 枚下品灵石购买 ${item.name}。`;
    item.stock -= 1;
    this.inventory.add(createItem(item.itemId, 1));
    this.ui.markPanelDirty(this.player, this.inventory);
    return `购得 ${item.name}。`;
  }

  private equipItem(itemId: string): string {
    const stack = this.inventory.find(itemId);
    const definition = itemDefinition(itemId);
    if (!stack || !definition || definition.itemType !== 'equipment' || !definition.equipmentSlot) return '这件物品不能装备。';
    const slot = definition.equipmentSlot;
    const previous = this.player.equipment[slot];
    if (!this.inventory.remove(itemId, 1)) return '背包中没有这件装备。';
    if (previous && previous !== itemId) this.inventory.add(createItem(previous, 1));
    this.player.equipment[slot] = itemId;
    this.player.stats.hp = Math.min(this.player.stats.hp, this.player.totalStats().maxHp);
    this.player.stats.mana = Math.min(this.player.stats.mana, this.player.totalStats().maxMana);
    this.ui.markPanelDirty(this.player, this.inventory);
    return previous && previous !== itemId ? `已换上${definition.name}，卸下${itemDefinition(previous)?.name ?? previous}。` : `已装备${definition.name}。`;
  }

  private unequipSlot(slot: EquipmentSlot): string {
    const itemId = this.player.equipment[slot];
    if (!itemId) return '该部位没有装备。';
    this.player.equipment[slot] = null;
    this.inventory.add(createItem(itemId, 1));
    this.player.stats.hp = Math.min(this.player.stats.hp, this.player.totalStats().maxHp);
    this.player.stats.mana = Math.min(this.player.stats.mana, this.player.totalStats().maxMana);
    this.ui.markPanelDirty(this.player, this.inventory);
    return `已卸下${itemDefinition(itemId)?.name ?? itemId}。`;
  }

  private useItem(itemId: string): string {
    const stack = this.inventory.find(itemId);
    const definition = itemDefinition(itemId);
    if (!stack || !definition || definition.itemType !== 'consumable' || !definition.effect) return '这件物品现在不能使用。';
    if (definition.effect.exp && (this.player.stats.breakthroughReady || this.player.stats.exp >= this.player.stats.expToNext)) {
      return `${definition.name} 对当前瓶颈无效，未消耗。`;
    }
    if (!this.inventory.remove(itemId, 1)) return '物品数量不足。';
    const totals = this.player.totalStats();
    if (definition.effect.hp) this.player.stats.hp = Math.min(totals.maxHp, this.player.stats.hp + definition.effect.hp);
    if (definition.effect.mana) this.player.stats.mana = Math.min(totals.maxMana, this.player.stats.mana + definition.effect.mana);
    if (definition.effect.exp) this.player.gainExp(definition.effect.exp);
    this.ui.markPanelDirty(this.player, this.inventory);
    return `服用${definition.name}。`;
  }

  private learnItem(itemId: string): string {
    const stack = this.inventory.find(itemId);
    const definition = itemDefinition(itemId);
    if (!stack || !definition || !definition.spellId) return '这件物品不能用于学习。';
    this.inventory.remove(itemId, 1);
    if (!this.player.learnSpell(definition.spellId)) {
      this.ui.markPanelDirty(this.player, this.inventory);
      return `你已学过${definition.name}，残卷化作心得消散。`;
    }
    this.ui.markPanelDirty(this.player, this.inventory);
    return `研读${definition.name}，领悟新法术。`;
  }

  private teleportTo(nodeId: number): string {
    const target = this.worldMap.teleportNodes.find((node) => node.id === nodeId);
    if (!target || !target.unlocked) return '目标传送阵尚未解锁。';
    const current = this.findNearbyTeleport(this.player.currentTile().x, this.player.currentTile().y);
    if (current?.id === nodeId) return '已经在此处。';
    const cost = 12;
    if (!this.inventory.remove('spirit-stone', cost)) return `传送需要 ${cost} 枚下品灵石。`;
    if (this.activeCave) this.leaveCave();
    this.map = this.worldMap;
    this.player.setMap(this.worldMap);
    this.player.position = {
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: (target.y + 1) * TILE_SIZE + TILE_SIZE / 2,
    };
    this.worldMap.markDiscovered(target.x, target.y, 10);
    this.switchCameraToActiveMap();
    this.ui.markPanelDirty(this.player, this.inventory);
    return `传送至${target.name}。`;
  }

  private breakthrough(): string {
    if (!this.player.breakthrough()) return '尚未达到突破瓶颈。';
    this.ui.markPanelDirty(this.player, this.inventory);
    return `突破成功，当前位阶提升为 ${this.player.stats.rank}，获得天赋点。`;
  }

  private addTalent(stat: 'attack' | 'defense' | 'mana' | 'hp'): string {
    if (!this.player.addTalent(stat)) return '没有可用天赋点。';
    this.ui.markPanelDirty(this.player, this.inventory);
    switch (stat) {
      case 'attack':
        return '攻击天赋提升。';
      case 'defense':
        return '防御天赋提升。';
      case 'mana':
        return '灵力天赋提升。';
      case 'hp':
        return '气血天赋提升。';
    }
  }

  private redeemCode(code: string): string {
    if (code !== '123456') return '兑换码无效。';
    this.inventory.add(createItem('spirit-stone', 10000));
    this.inventory.add(createItem('cultivation-pill', 1000));
    this.ui.markPanelDirty(this.player, this.inventory);
    return '兑换成功：获得 10000 下品灵石与 1000 枚聚气丹。';
  }

  private handleNPCAction(npc: NPC, action: 'trade' | 'spar' | 'battle' | 'gift'): string {
    switch (action) {
      case 'trade':
        return this.tradeWithNPC(npc);
      case 'gift':
        return this.giftNPC(npc);
      case 'spar':
        this.startNPCCombat(npc, 'spar');
        return `与${npc.profile.name}点到为止。`;
      case 'battle':
        this.startNPCCombat(npc, 'battle');
        return `与${npc.profile.name}进入战斗。`;
    }
  }

  private tradeWithNPC(npc: NPC): string {
    const item = npc.profile.inventory.find((entry) => entry.quantity > 0);
    if (!item) return `${npc.profile.name} 今日没有可交易的物品。`;
    const price = Math.max(1, item.value);
    const paid = this.inventory.remove('spirit-stone', price);
    if (!paid) return `需要 ${price} 枚下品灵石购买 ${item.name}。`;
    this.inventory.add({ ...item, quantity: 1 });
    item.quantity -= 1;
    npc.profile.favor += 1;
    this.ui.markPanelDirty(this.player, this.inventory);
    return `用 ${price} 枚下品灵石购得 ${item.name}。`;
  }

  private giftNPC(npc: NPC): string {
    const gift = this.inventory.items.find((item) => item.category === '材料' && item.id !== 'spirit-stone') ?? this.inventory.items.find((item) => item.id === 'spirit-stone');
    if (!gift) return '背包里没有适合赠送的物品。';
    this.inventory.remove(gift.id, 1);
    npc.profile.favor += Math.max(1, Math.floor(gift.value / 3));
    this.ui.markPanelDirty(this.player, this.inventory);
    return `赠送 ${gift.name}，${npc.profile.name} 的好感提升到 ${npc.profile.favor}。`;
  }

  private updateSectTaskProgress(tileX: number, tileY: number): void {
    let changed = false;
    for (const task of this.sectTasks) {
      if (task.completed || task.progress >= task.required) continue;
      if (task.type === 'gather') {
        const near = Math.hypot(task.targetX - tileX, task.targetY - tileY) < 4;
        if (near && this.inventory.items.some((item) => item.id === 'spirit-herb' || item.id === 'moss-flower' || item.id === 'yellow-root')) {
          task.progress = task.required;
          changed = true;
          this.ui.showToast(`${task.title}目标已完成，可回宗门交付。`);
        }
      } else if (task.type === 'rival') {
        if (Math.hypot(task.targetX - tileX, task.targetY - tileY) < 7) {
          task.progress = task.required;
          changed = true;
          this.ui.showToast(`${task.title}试炼记录完成，可回宗门交付。`);
        }
      } else if (task.type === 'hunt') {
        const missing = task.targetId && !this.worldMap.beasts.some((beast) => beast.id === task.targetId) && !this.map.beasts.some((beast) => beast.id === task.targetId);
        if (missing) {
          task.progress = task.required;
          changed = true;
          this.ui.showToast(`${task.title}妖兽已清除，可回宗门交付。`);
        }
      }
    }
    if (changed) {
      this.autoPathActive = false;
      this.ui.setQuestState(this.sectTasks.filter((task) => !task.completed), this.autoPathActive);
      this.save();
    }
  }

  private toggleAutoPath(): string {
    const task = this.activeTask();
    if (!task) return '当前没有可追踪任务。';
    if (this.activeCave) return '洞窟内无法使用自动寻路。';
    this.autoPathActive = !this.autoPathActive;
    this.autoPathTarget = this.autoPathActive ? { x: task.targetX, y: task.targetY } : null;
    this.ui.setQuestState(this.sectTasks.filter((entry) => !entry.completed), this.autoPathActive);
    return this.autoPathActive ? `开始沿主路前往：${task.targetName}。` : '已停止自动寻路。';
  }

  private autoPathMovement(): { x: number; y: number } {
    const task = this.activeTask();
    const target = this.autoPathTarget ?? (task ? { x: task.targetX, y: task.targetY } : null);
    if (!target) {
      this.autoPathActive = false;
      return { x: 0, y: 0 };
    }
    const tile = this.player.currentTile();
    const dx = target.x - tile.x;
    const dy = target.y - tile.y;
    if (Math.hypot(dx, dy) < 2.5) {
      this.autoPathActive = false;
      this.ui.showToast('已抵达任务目标附近。');
      return { x: 0, y: 0 };
    }
    const next = this.nextRoadBiasedStep(tile.x, tile.y, target.x, target.y);
    return normalize({ x: next.x - tile.x, y: next.y - tile.y });
  }

  private nextRoadBiasedStep(x: number, y: number, targetX: number, targetY: number): { x: number; y: number } {
    const options = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
      { x: x + 1, y: y + 1 },
      { x: x - 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y - 1 },
    ].filter((point) => this.worldMap.inBounds(point.x, point.y) && !this.worldMap.isBlockedTile(point.x, point.y));
    options.sort((a, b) => this.pathScore(a.x, a.y, targetX, targetY) - this.pathScore(b.x, b.y, targetX, targetY));
    return options[0] ?? { x, y };
  }

  private pathScore(x: number, y: number, targetX: number, targetY: number): number {
    const cell = this.worldMap.get(x, y);
    const roadBonus = cell.road > 0.1 || cell.terrain === TerrainKind.Road || cell.terrain === TerrainKind.Town || cell.terrain === TerrainKind.SectGround ? 8 : 0;
    return Math.hypot(targetX - x, targetY - y) - roadBonus;
  }

  private sparNPC(npc: NPC): string {
    const playerPower = this.player.stats.attack + this.player.stats.defense + this.player.stats.speed * 0.08;
    const npcPower = npc.profile.combat.attack + npc.profile.combat.defense + npc.profile.combat.speed * 0.08;
    const win = playerPower >= npcPower * 0.86 || Math.random() > 0.62;
    this.player.stats.exp = Math.min(this.player.stats.expToNext, this.player.stats.exp + (win ? 8 : 4));
    this.player.stats.hp = Math.max(1, this.player.stats.hp - (win ? 3 : 9));
    npc.profile.favor += win ? 2 : 0;
    this.ui.markPanelDirty(this.player, this.inventory);
    return win ? `切磋胜过 ${npc.profile.name}，获得少量经验。` : `切磋落败，气血有所损耗。`;
  }

  private battleNPC(npc: NPC): string {
    const playerPower = this.player.stats.attack * 1.4 + this.player.stats.defense + this.player.stats.hp * 0.08;
    const npcPower = npc.profile.combat.attack * 1.4 + npc.profile.combat.defense + npc.profile.combat.hp * 0.08;
    const win = playerPower > npcPower || Math.random() > 0.72;
    npc.profile.favor -= 20;
    if (!win) {
      this.player.stats.hp = Math.max(1, this.player.stats.hp - Math.max(12, npc.profile.combat.attack));
      this.ui.markPanelDirty(this.player, this.inventory);
      return `战斗失利，${npc.profile.name} 没有追击。`;
    }
    const loot = npc.profile.inventory.find((item) => item.quantity > 0);
    if (loot) {
      loot.quantity -= 1;
      this.inventory.add({ ...loot, quantity: 1 });
      this.player.stats.exp = Math.min(this.player.stats.expToNext, this.player.stats.exp + 15);
      this.ui.markPanelDirty(this.player, this.inventory);
      return `战胜 ${npc.profile.name}，夺得 ${loot.name}。`;
    }
    this.player.stats.exp = Math.min(this.player.stats.expToNext, this.player.stats.exp + 12);
    this.ui.markPanelDirty(this.player, this.inventory);
    return `战胜 ${npc.profile.name}，但对方没有可夺取物品。`;
  }

  private startNPCCombat(npc: NPC, mode: Extract<CombatMode, 'spar' | 'battle'>): void {
    const enemy = this.enemyFromNPC(npc);
    this.combat = {
      mode,
      title: mode === 'spar' ? `切磋 · ${npc.profile.name}` : `战斗 · ${npc.profile.name}`,
      enemy,
      source: { kind: 'npc', npc },
      log: [mode === 'spar' ? `${npc.profile.name}拱手示意，切磋开始。` : `${npc.profile.name}杀意已起，战斗开始。`],
    };
    this.ui.renderCombat(this.combatView());
  }

  private startBeastCombat(beast: BeastSpawn, feature?: CaveFeature): void {
    this.combat = {
      mode: 'beast',
      title: `遭遇妖兽 · ${beast.name}`,
      enemy: this.enemyFromBeast(beast),
      source: { kind: 'beast', beast, feature },
      log: [`${beast.name}从阴影中扑出，战力显现：${this.enemyFromBeast(beast).power}。`],
    };
    this.ui.renderCombat(this.combatView());
  }

  private handleCombatAction(action: CombatAction): void {
    if (!this.combat) return;
    if (action.type === 'close') {
      if (this.combat.result) this.closeCombat();
      return;
    }
    if (this.combat.result) return;
    switch (action.type) {
      case 'attack':
        this.playerStrike('attack');
        break;
      case 'spell':
        this.playerCastSpell(action.id);
        break;
      case 'talisman':
        this.playerUseTalisman(action.id);
        break;
      case 'item':
        this.playerUseCombatItem(action.id);
        this.ui.renderCombat(this.combatView());
        return;
      case 'flee':
        this.tryFlee();
        this.ui.renderCombat(this.combatView());
        return;
    }
    if (!this.combat.result) this.enemyTurn();
    this.ui.renderCombat(this.combatView());
  }

  private playerStrike(kind: 'attack' | 'spell' | 'talisman', power = 1): void {
    if (!this.combat) return;
    const stats = this.player.totalStats();
    const base = kind === 'attack' ? stats.attack : stats.attack * 0.65 + power;
    const damage = Math.max(3, Math.round(base * (0.85 + Math.random() * 0.28) - this.combat.enemy.defense * 0.42));
    this.combat.enemy.hp = Math.max(0, this.combat.enemy.hp - damage);
    this.combat.log.push(kind === 'attack' ? `你挥击命中，造成 ${damage} 点伤害。` : `灵光迸发，造成 ${damage} 点伤害。`);
    if (this.combat.enemy.hp <= 0) this.finishCombat('win');
  }

  private playerCastSpell(spellId: string): void {
    const spell = SPELL_LIBRARY.find((entry) => entry.id === spellId);
    if (!spell || !this.combat) return;
    if (this.player.stats.mana < spell.manaCost) {
      this.combat.log.push('灵力不足，法术未能成形。');
      return;
    }
    this.player.stats.mana -= spell.manaCost;
    this.playerStrike('spell', spell.power);
  }

  private playerUseTalisman(itemId: string): void {
    if (!this.combat) return;
    const item = this.inventory.find(itemId);
    if (!item || !this.inventory.remove(itemId, 1)) {
      this.combat.log.push('符箓不足。');
      return;
    }
    const power = item.id.includes('thunder') ? 48 : item.id.includes('fire') ? 34 : item.id.includes('guard') || item.id.includes('earth') ? 18 : 22;
    if (item.id.includes('guard') || item.id.includes('earth')) {
      this.player.stats.defense += 1;
      this.combat.log.push(`${item.name}化作护体灵光，防御暂时提升。`);
    }
    this.playerStrike('talisman', power);
    this.ui.markPanelDirty(this.player, this.inventory);
  }

  private playerUseCombatItem(itemId: string): void {
    if (!this.combat) return;
    const beforeHp = this.player.stats.hp;
    const beforeMana = this.player.stats.mana;
    const message = this.useItem(itemId);
    this.combat.log.push(`${message} 气血 ${beforeHp}->${this.player.stats.hp}，灵力 ${beforeMana}->${this.player.stats.mana}。`);
    if (!message.includes('服用')) return;
    this.enemyTurn();
  }

  private tryFlee(): void {
    if (!this.combat) return;
    const stats = this.player.totalStats();
    const chance = this.combat.mode === 'battle' ? 0.42 : 0.72;
    const speedBias = (stats.speed - this.combat.enemy.speed) / 260;
    if (Math.random() < chance + speedBias) {
      this.finishCombat('escape');
      return;
    }
    this.combat.log.push('你试图脱身，但被拦了下来。');
    this.enemyTurn();
  }

  private enemyTurn(): void {
    if (!this.combat || this.combat.result) return;
    const stats = this.player.totalStats();
    const damage = Math.max(2, Math.round(this.combat.enemy.attack * (0.82 + Math.random() * 0.3) - stats.defense * 0.38));
    this.player.stats.hp = Math.max(0, this.player.stats.hp - damage);
    this.combat.log.push(`${this.combat.enemy.name}反击，造成 ${damage} 点伤害。`);
    if (this.player.stats.hp <= 0) this.finishCombat('lose');
  }

  private finishCombat(result: 'win' | 'lose' | 'escape'): void {
    if (!this.combat) return;
    this.combat.result = result;
    if (result === 'escape') {
      this.combat.log.push('你脱离战斗。');
      return;
    }
    if (result === 'lose') {
      this.player.stats.hp = 1;
      this.combat.log.push(this.combat.mode === 'spar' ? '切磋落败，对方及时收手。' : '你败下阵来，勉强保住性命。');
      return;
    }
    const exp = this.combat.mode === 'beast' ? 32 + this.combat.enemy.power / 8 : this.combat.mode === 'battle' ? 24 : 14;
    this.player.gainExp(Math.round(exp));
    this.combat.log.push(`战斗胜利，获得 ${Math.round(exp)} 点经验。`);
    if (this.combat.source.kind === 'npc') {
      this.combat.source.npc.profile.favor += this.combat.mode === 'spar' ? 2 : -18;
      const loot = this.combat.mode === 'battle' ? this.combat.source.npc.profile.inventory.find((item) => item.quantity > 0) : undefined;
      if (loot) {
        loot.quantity -= 1;
        this.inventory.add({ ...loot, quantity: 1 });
        this.combat.log.push(`夺得 ${loot.name}。`);
      }
    } else {
      const loot = Math.random() > 0.45 ? createItem('beast-core', 1) : createItem('beast-bone', 1);
      this.inventory.add(loot);
      this.combat.log.push(`获得 ${loot.name}。`);
      this.removeBeastFromMap(this.combat.source.beast, this.combat.source.feature);
    }
    this.ui.markPanelDirty(this.player, this.inventory);
  }

  private closeCombat(): void {
    this.combat = null;
    this.ui.renderCombat(null);
    this.ui.markPanelDirty(this.player, this.inventory);
  }

  private combatView(): CombatViewState | null {
    if (!this.combat) return null;
    const player = this.playerCombatant();
    const spells = this.player.learnedArts.map((spellId) => {
      const spell = SPELL_LIBRARY.find((entry) => entry.id === spellId);
      return {
        id: spellId,
        name: spell?.name ?? spellId,
        description: spell?.description ?? '',
        disabled: !spell || this.player.stats.mana < spell.manaCost,
      };
    });
    const talismans = this.inventory.items
      .filter((item) => item.category === '符咒')
      .map((item) => ({ id: item.id, name: item.name, description: item.description, quantity: item.quantity }));
    const pills = this.inventory.items
      .filter((item) => item.category === '丹药' && item.itemType === 'consumable')
      .map((item) => ({ id: item.id, name: item.name, description: item.description, quantity: item.quantity }));
    return {
      title: this.combat.title,
      mode: this.combat.mode,
      phase: this.combat.result ? 'ended' : 'player',
      player,
      enemy: this.combat.enemy,
      log: this.combat.log,
      spells,
      talismans,
      pills,
      canFlee: this.combat.mode !== 'battle',
      result: this.combat.result,
    };
  }

  private playerCombatant(): CombatantView {
    const stats = this.player.totalStats();
    return {
      name: '你',
      rank: this.player.stats.rank,
      hp: this.player.stats.hp,
      maxHp: stats.maxHp,
      mana: this.player.stats.mana,
      maxMana: stats.maxMana,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      power: this.player.combatPower(),
    };
  }

  private enemyFromNPC(npc: NPC): CombatantView {
    const c = npc.profile.combat;
    const power = Math.round(c.attack * 3.2 + c.defense * 2.4 + c.hp * 0.42 + c.mana * 0.48 + c.speed * 0.28);
    return { name: npc.profile.name, rank: npc.profile.rank, hp: c.hp, maxHp: c.hp, mana: c.mana, maxMana: c.mana, attack: c.attack, defense: c.defense, speed: c.speed, power };
  }

  private enemyFromBeast(beast: BeastSpawn): CombatantView {
    const level = beast.level;
    const hp = 48 + level * 24;
    const mana = 8 + level * 8;
    const attack = 9 + level * 4;
    const defense = 4 + level * 3;
    const speed = 54 + level * 7;
    const power = Math.round(attack * 3.4 + defense * 2.4 + hp * 0.45 + speed * 0.24 + level * 10);
    return { name: beast.name, rank: `妖兽 ${level} 级`, hp, maxHp: hp, mana, maxMana: mana, attack, defense, speed, power };
  }

  private removeBeastFromMap(beast: BeastSpawn, feature?: CaveFeature): void {
    const list = this.map.beasts;
    const index = list.findIndex((entry) => entry.id === beast.id);
    if (index >= 0) list.splice(index, 1);
    if (feature) feature.claimed = true;
  }

  private async importAssets(): Promise<void> {
    try {
      const report = await this.assets.loadBrowserDirectory();
      if (!this.renderer) {
        this.ui.showAssetReport(report);
        return;
      }
      this.renderer = this.renderer.setRegistry(this.assets.registry);
      this.renderer.invalidateAll();
      this.ui.showAssetReport(report);
    } catch (error) {
      this.ui.showToast(error instanceof Error ? error.message : '素材导入失败。');
    }
  }

  private regenerate(): void {
    const discoveredTiles = this.worldMap?.cells.reduce<number[]>((acc, cell, index) => {
      if (cell.discovered) acc.push(index);
      return acc;
    }, []);
    const unlockedTeleportIds = this.worldMap?.teleportNodes.filter((node) => node.unlocked).map((node) => node.id) ?? [];
    const claimedCaveFeatureIds = this.worldMap?.caves.flatMap((cave) => cave.map.caveFeatures.filter((feature) => feature.claimed).map((feature) => feature.id)) ?? [];
    const sectTasks = this.sectTasks.map((task) => ({ ...task }));
    const activeSectTaskId = this.activeSectTaskId;
    const completedSectTaskIds = new Set(this.completedSectTaskIds);
    this.seed = FIXED_WORLD_SEED;
    this.bootstrapWorld(null);
    this.sectTasks = sectTasks;
    this.activeSectTaskId = activeSectTaskId;
    this.completedSectTaskIds = completedSectTaskIds;
    for (const index of discoveredTiles ?? []) {
      if (this.worldMap.cells[index]) this.worldMap.cells[index].discovered = true;
    }
    for (const nodeId of unlockedTeleportIds) {
      const node = this.worldMap.teleportNodes.find((entry) => entry.id === nodeId);
      if (node) node.unlocked = true;
    }
    const claimed = new Set(claimedCaveFeatureIds);
    for (const cave of this.worldMap.caves) {
      for (const feature of cave.map.caveFeatures) {
        if (!claimed.has(feature.id)) continue;
        feature.claimed = true;
        if (feature.kind === 'treasure' || feature.kind === 'herb') cave.map.get(feature.x, feature.y).object = ObjectKind.None;
      }
    }
    this.save();
    this.ui.showToast(`已按固定种子重生，并保留已探索地图。`);
  }

  private readonly resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.camera?.resize(rect.width || window.innerWidth, rect.height || window.innerHeight);
    this.camera?.setWorldSize((this.map?.width ?? this.worldMap?.width ?? 500) * TILE_SIZE, (this.map?.height ?? this.worldMap?.height ?? 500) * TILE_SIZE);
    if (this.camera) {
      this.camera.targetZoom = this.defaultZoom();
      this.camera.zoom = this.camera.targetZoom;
    }
  };

  private switchCameraToActiveMap(): void {
    this.camera.setWorldSize(this.map.width * TILE_SIZE, this.map.height * TILE_SIZE);
    this.camera.setImmediateCenter(this.player.position.x, this.player.position.y);
    this.renderer.invalidateAll();
  }

  private normalizePlayerStats(stats: Player['stats']): Player['stats'] {
    const base = new Player(1, 1, this.worldMap).stats;
    return {
      ...base,
      ...stats,
      rankIndex: stats.rankIndex ?? base.rankIndex,
      talentPoints: stats.talentPoints ?? base.talentPoints,
      breakthroughReady: stats.breakthroughReady ?? stats.exp >= stats.expToNext,
    };
  }

  private removeEquippedItemsFromInventory(): void {
    for (const itemId of Object.values(this.player.equipment)) {
      if (itemId) this.inventory.remove(itemId, 1);
    }
  }

  private defaultZoom(): number {
    return Math.min(2.6, Math.max(1.45, Math.min(window.innerWidth, window.innerHeight) / 390));
  }

  dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.animationHandle);
    this.input.dispose();
    window.removeEventListener('resize', this.resize);
  }
}
