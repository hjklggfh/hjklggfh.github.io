import type { AssetScanReport } from '../core/AssetManager';
import { itemDefinition, SPELL_LIBRARY, type EquipmentSlot, type Inventory, type ItemCategory, type ItemStack } from '../inventory/Inventory';
import type { Player } from '../entities/Player';
import type { NPC, DialogueNode } from '../entities/NPC';
import type { RenderStats } from '../render/CanvasRenderer';
import type { WorldAtmosphere } from '../world/WorldAtmosphere';
import type { WorldMap } from '../world/WorldMap';
import type { BeastSpawn, MarketInventoryItem, RoadsideInn, Sect, Settlement, TeleportNode } from '../world/WorldMap';
import type { CombatAction, CombatViewState } from '../combat/CombatTypes';
import { discipleRankIndex, sectRankDiscount, sectRankMeritThreshold, type SectTaskState } from '../sect/SectTypes';

type PanelMode = 'inventory' | 'character' | 'market' | 'teleport' | 'inn' | 'sect' | null;

export interface UIActions {
  onInventory: () => void;
  onCharacter: () => void;
  onSave: () => void;
  onAssets: () => void;
  onRegenerate: () => void;
  onNPCAction: (npc: NPC, action: 'trade' | 'spar' | 'battle' | 'gift') => string;
  onBuyMarketItem: (settlement: Settlement, item: MarketInventoryItem) => string;
  onEquipItem: (itemId: string) => string;
  onUnequipSlot: (slot: EquipmentSlot) => string;
  onUseItem: (itemId: string) => string;
  onLearnItem: (itemId: string) => string;
  onTeleport: (nodeId: number) => string;
  onBreakthrough: () => string;
  onAddTalent: (stat: 'attack' | 'defense' | 'mana' | 'hp') => string;
  onCombatAction: (action: CombatAction) => void;
  onRedeemCode: (code: string) => string;
  onInnService: (inn: RoadsideInn, service: 'rest' | 'wine_mana' | 'wine_exp' | 'wine_body' | 'rumor') => string;
  onJoinSect: (sect: Sect) => string;
  onSectService: (sect: Sect, service: 'resources' | 'pool' | 'promote') => string;
  onBuySectItem: (sect: Sect, itemId: string) => string;
  onAcceptSectTask: (sect: Sect, type: 'gather' | 'hunt' | 'rival') => string;
  onClaimSectTask: (taskId: string) => string;
  onToggleAutoPath: () => string;
}

export class UIManager {
  private hud!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private dialogue!: HTMLDivElement;
  private combat!: HTMLDivElement;
  private toast!: HTMLDivElement;
  private tooltip!: HTMLDivElement;
  private joystick!: HTMLDivElement;
  private joystickStick!: HTMLDivElement;
  private actionButton!: HTMLButtonElement;
  private panelMode: PanelMode = null;
  private panelDirty = true;
  private inventoryFilter: ItemCategory | '全部' = '全部';
  private lastPlayer: Player | null = null;
  private lastInventory: Inventory | null = null;
  private activeNPC: NPC | null = null;
  private activeNode = 'root';
  private activeSettlement: Settlement | null = null;
  private activeInn: RoadsideInn | null = null;
  private activeSect: Sect | null = null;
  private sectTasks: SectTaskState[] = [];
  private autoPathActive = false;
  private teleportNodes: TeleportNode[] = [];
  private currentTeleportNodeId: number | null = null;
  private toastTimer: number | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly actions: UIActions,
  ) {
    this.build();
  }

  getMobileControls(): { joystick: HTMLElement; stick: HTMLElement; actionButton: HTMLButtonElement } {
    return { joystick: this.joystick, stick: this.joystickStick, actionButton: this.actionButton };
  }

  updateHUD(player: Player, map: WorldMap, atmosphere: WorldAtmosphere, stats: RenderStats, nearbyNPC: NPC | null, nearbyInn: RoadsideInn | null = null, nearbyBeast: BeastSpawn | null = null): void {
    const tile = player.currentTile();
    const settlement = map.settlements.find((entry) => Math.hypot(entry.x - tile.x, entry.y - tile.y) < entry.radius);
    const sect = map.sects.find((entry) => Math.hypot(entry.x - tile.x, entry.y - tile.y) < entry.radius);
    this.hud.querySelector('[data-rank]')!.textContent = player.stats.rank;
    const totalStats = player.totalStats();
    this.hud.querySelector('[data-hp]')!.textContent = `${player.stats.hp}/${totalStats.maxHp}`;
    this.hud.querySelector('[data-mana]')!.textContent = `${player.stats.mana}/${totalStats.maxMana}`;
    this.hud.querySelector('[data-pos]')!.textContent = `${tile.x}, ${tile.y}`;
    this.hud.querySelector('[data-time]')!.textContent = atmosphere.label();
    this.hud.querySelector('[data-weather]')!.textContent = this.weatherLabel(atmosphere.weather);
    this.hud.querySelector('[data-chunks]')!.textContent = `${stats.visibleChunks}/${stats.cachedChunks}`;
    this.hud.querySelector('[data-region]')!.textContent = sect?.name ?? settlement?.name ?? '荒野';
    const teleport = map.teleportNodes.find((entry) => Math.hypot(entry.x - tile.x, entry.y - tile.y) < 4);
    const caveFeature = map.caveFeatures.find((entry) => Math.hypot(entry.x - tile.x, entry.y - tile.y) < 3 && (!entry.claimed || entry.kind === 'exit'));
    const market =
      settlement &&
      settlement.gate &&
      Math.hypot(
        Math.round(settlement.x - settlement.gate.ny * Math.max(2, settlement.radius * 0.28)) - tile.x,
        Math.round(settlement.y + settlement.gate.nx * Math.max(2, settlement.radius * 0.28)) - tile.y,
      ) < 5;
    const sectFacility = sect ? this.sectFacilityLabel(sect, tile.x, tile.y) : '';
    this.hud.querySelector('[data-nearby]')!.textContent = nearbyNPC
      ? `E 交互：${nearbyNPC.profile.name}`
      : nearbyInn
        ? `E 休息：${nearbyInn.name}`
        : nearbyBeast
          ? `E 挑战：${nearbyBeast.name}`
        : caveFeature
          ? `E ${caveFeature.kind === 'exit' ? '离开洞窟' : caveFeature.kind === 'treasure' ? '开启宝箱' : caveFeature.kind === 'herb' ? '采集灵草' : '探查妖兽'}`
          : sectFacility
          ? `E ${sectFacility}：${sect?.name}`
          : teleport
            ? `E 传送阵：${teleport.name}`
            : market
              ? `E 集市：${settlement.name}`
              : 'E 探查';
  }

  setQuestState(tasks: SectTaskState[], autoPathActive: boolean): void {
    this.sectTasks = tasks;
    this.autoPathActive = autoPathActive;
    const active = tasks.find((task) => !task.completed);
    this.hud.querySelector('[data-quest-label]')!.textContent = active ? `${active.title} · ${active.progress}/${active.required}` : '暂无任务';
    const button = this.hud.querySelector<HTMLButtonElement>('[data-action="autopath"]');
    if (button) {
      button.disabled = !active;
      button.textContent = autoPathActive ? '停止寻路' : '自动寻路';
    }
  }

  renderPanel(player: Player, inventory: Inventory): void {
    this.lastPlayer = player;
    this.lastInventory = inventory;
    if (!this.panelMode) {
      this.panel.hidden = true;
      this.panelDirty = false;
      return;
    }
    if (!this.panelDirty && !this.panel.hidden) return;
    this.panel.hidden = false;
    if (this.panelMode === 'inventory') {
      this.renderInventory(inventory);
    } else if (this.panelMode === 'character') {
      this.renderCharacter(player);
    } else if (this.panelMode === 'market' && this.activeSettlement) {
      this.renderMarket(this.activeSettlement, inventory);
    } else if (this.panelMode === 'teleport') {
      this.renderTeleport(inventory);
    } else if (this.panelMode === 'inn' && this.activeInn) {
      this.renderInn(this.activeInn, inventory);
    } else if (this.panelMode === 'sect' && this.activeSect) {
      this.renderSect(this.activeSect, player, inventory);
    }
    this.panelDirty = false;
  }

  toggleInventory(player: Player, inventory: Inventory): void {
    this.panelMode = this.panelMode === 'inventory' ? null : 'inventory';
    this.panelDirty = true;
    this.renderPanel(player, inventory);
  }

  toggleCharacter(player: Player, inventory: Inventory): void {
    this.panelMode = this.panelMode === 'character' ? null : 'character';
    this.panelDirty = true;
    this.renderPanel(player, inventory);
  }

  markPanelDirty(player?: Player, inventory?: Inventory): void {
    if (player) this.lastPlayer = player;
    if (inventory) this.lastInventory = inventory;
    this.panelDirty = true;
    if (this.panelMode && this.lastPlayer && this.lastInventory) {
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
  }

  openMarket(settlement: Settlement, player: Player, inventory: Inventory): void {
    this.activeSettlement = settlement;
    this.panelMode = 'market';
    this.panelDirty = true;
    this.renderPanel(player, inventory);
  }

  openTeleport(nodes: TeleportNode[], currentNodeId: number, player: Player, inventory: Inventory): void {
    this.teleportNodes = nodes;
    this.currentTeleportNodeId = currentNodeId;
    this.panelMode = 'teleport';
    this.panelDirty = true;
    this.renderPanel(player, inventory);
  }

  openInn(inn: RoadsideInn, player: Player, inventory: Inventory): void {
    this.activeInn = inn;
    this.panelMode = 'inn';
    this.panelDirty = true;
    this.renderPanel(player, inventory);
  }

  openSect(sect: Sect, tasks: SectTaskState[], player: Player, inventory: Inventory): void {
    this.activeSect = sect;
    this.sectTasks = tasks;
    this.panelMode = 'sect';
    this.panelDirty = true;
    this.renderPanel(player, inventory);
  }

  showToast(message: string, timeout = 2200): void {
    this.toast.textContent = message;
    this.toast.hidden = false;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toast.hidden = true;
    }, timeout);
  }

  showAssetReport(report: AssetScanReport): void {
    const warning = report.warnings.length > 0 ? `，警告 ${report.warnings.length} 条` : '';
    const sourceTile = report.sourceTileSize ? `，源tile=${report.sourceTileSize}` : '';
    this.showToast(`素材扫描完成：${report.loadedImages} 张图片，${report.generatedTiles} 个 Tile，运行tile=${report.tileSize}${sourceTile}${warning}`);
  }

  openDialogue(npc: NPC): void {
    this.activeNPC = npc;
    this.activeNode = 'root';
    this.root.classList.add('ui--dialogue-open');
    this.renderDialogue();
  }

  closeDialogue(): void {
    this.activeNPC = null;
    this.dialogue.hidden = true;
    this.root.classList.remove('ui--dialogue-open');
  }

  renderCombat(state: CombatViewState | null): void {
    if (!state) {
      this.combat.hidden = true;
      this.hideTooltip();
      return;
    }
    this.combat.hidden = false;
    const playerHpPct = Math.max(0, Math.min(100, (state.player.hp / state.player.maxHp) * 100));
    const enemyHpPct = Math.max(0, Math.min(100, (state.enemy.hp / state.enemy.maxHp) * 100));
    this.combat.innerHTML = `
      <div class="combat__stage">
        <div class="combat__topline">
          <div class="combat__title">${state.title}</div>
          ${state.phase === 'ended' ? '<button type="button" data-combat-close>离开</button>' : ''}
        </div>
        <div class="combat__fighters">
          ${this.renderCombatant(state.player, playerHpPct, 'player')}
          ${this.renderCombatant(state.enemy, enemyHpPct, 'enemy')}
        </div>
        <div class="combat__log">
          ${state.log.slice(-6).map((line) => `<div>${line}</div>`).join('')}
        </div>
        <div class="combat__commands">
          <button type="button" data-combat-action="attack" ${state.phase === 'ended' ? 'disabled' : ''}>攻击</button>
          <details>
            <summary>法术</summary>
            <div class="combat__submenu">
              ${state.spells.map((spell) => `<button type="button" data-combat-spell="${spell.id}" ${this.tooltipAttrs({ title: spell.name, meta: '法术', body: spell.description })} ${spell.disabled || state.phase === 'ended' ? 'disabled' : ''}>${spell.name}</button>`).join('') || '<span>未学会可用法术</span>'}
            </div>
          </details>
          <details>
            <summary>符箓</summary>
            <div class="combat__submenu">
              ${state.talismans.map((item) => `<button type="button" data-combat-talisman="${item.id}" ${this.tooltipAttrs({ title: item.name, meta: `符箓 ×${item.quantity ?? 1}`, body: item.description })} ${item.disabled || state.phase === 'ended' ? 'disabled' : ''}>${item.name} ×${item.quantity ?? 1}</button>`).join('') || '<span>没有符箓</span>'}
            </div>
          </details>
          <details>
            <summary>丹药</summary>
            <div class="combat__submenu">
              ${state.pills.map((item) => `<button type="button" data-combat-item="${item.id}" ${this.tooltipAttrs({ title: item.name, meta: `丹药 ×${item.quantity ?? 1}`, body: item.description })} ${item.disabled || state.phase === 'ended' ? 'disabled' : ''}>${item.name} ×${item.quantity ?? 1}</button>`).join('') || '<span>没有丹药</span>'}
            </div>
          </details>
          <button type="button" data-combat-action="flee" ${!state.canFlee || state.phase === 'ended' ? 'disabled' : ''}>逃跑</button>
        </div>
      </div>
    `;
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="hud">
        <div class="hud__cluster">
          <div class="hud__line"><span>位阶</span><strong data-rank></strong></div>
          <div class="hud__line"><span>气血</span><strong data-hp></strong></div>
          <div class="hud__line"><span>灵力</span><strong data-mana></strong></div>
          <div class="hud__line"><span>区域</span><strong data-region></strong></div>
        </div>
        <div class="hud__cluster">
          <div class="hud__line"><span>坐标</span><strong data-pos></strong></div>
          <div class="hud__line"><span>时辰</span><strong data-time></strong></div>
          <div class="hud__line"><span>天气</span><strong data-weather></strong></div>
          <div class="hud__line"><span>Chunk</span><strong data-chunks></strong></div>
          <div class="hud__line"><span data-nearby></span></div>
        </div>
        <div class="toolbar">
          <button type="button" data-action="inventory" title="背包 I">背包</button>
          <button type="button" data-action="character" title="角色 C">角色</button>
          <button type="button" data-action="save" title="本地存档 F5">存档</button>
          <button type="button" data-action="assets" title="扫描浏览器素材目录">素材</button>
          <button type="button" data-action="regen" title="重新生成世界">重生</button>
        </div>
        <div class="quest-tracker">
          <div data-quest-label>暂无任务</div>
          <button type="button" data-action="autopath" disabled>自动寻路</button>
        </div>
      </div>
      <div class="panel" hidden></div>
      <div class="dialogue" hidden></div>
      <div class="combat" hidden></div>
      <div class="toast" hidden></div>
      <div class="tooltip" hidden></div>
      <div class="joystick"><div class="joystick__stick"></div></div>
      <div class="action-pad"><button type="button" data-action="interact">E</button></div>
    `;
    this.hud = this.root.querySelector('.hud') as HTMLDivElement;
    this.panel = this.root.querySelector('.panel') as HTMLDivElement;
    this.dialogue = this.root.querySelector('.dialogue') as HTMLDivElement;
    this.combat = this.root.querySelector('.combat') as HTMLDivElement;
    this.toast = this.root.querySelector('.toast') as HTMLDivElement;
    this.tooltip = this.root.querySelector('.tooltip') as HTMLDivElement;
    this.joystick = this.root.querySelector('.joystick') as HTMLDivElement;
    this.joystickStick = this.root.querySelector('.joystick__stick') as HTMLDivElement;
    this.actionButton = this.root.querySelector('[data-action="interact"]') as HTMLButtonElement;

    this.root.querySelector('[data-action="inventory"]')?.addEventListener('click', this.actions.onInventory);
    this.root.querySelector('[data-action="character"]')?.addEventListener('click', this.actions.onCharacter);
    this.root.querySelector('[data-action="save"]')?.addEventListener('click', this.actions.onSave);
    this.root.querySelector('[data-action="assets"]')?.addEventListener('click', this.actions.onAssets);
    this.root.querySelector('[data-action="regen"]')?.addEventListener('click', this.actions.onRegenerate);
    this.root.querySelector('[data-action="autopath"]')?.addEventListener('click', () => this.showToast(this.actions.onToggleAutoPath()));
    this.panel.addEventListener('click', (event) => this.handlePanelClick(event));
    this.panel.addEventListener('pointermove', (event) => this.handleTooltipMove(event));
    this.panel.addEventListener('pointerleave', () => this.hideTooltip());
    this.combat.addEventListener('click', (event) => this.handleCombatClick(event));
    this.combat.addEventListener('pointermove', (event) => this.handleTooltipMove(event));
    this.combat.addEventListener('pointerleave', () => this.hideTooltip());
  }

  private renderInventory(inventory: Inventory): void {
    const player = this.lastPlayer;
    const categories: (ItemCategory | '全部')[] = ['全部', '功法', '丹药', '符咒', '装备', '材料'];
    const items = this.inventoryFilter === '全部' ? inventory.items : inventory.items.filter((item) => item.category === this.inventoryFilter);
    const equipmentEntries = player ? (Object.entries(player.equipment) as [EquipmentSlot, string | null][]) : [];
    this.panel.innerHTML = `
      <div class="panel__head">
        <div class="panel__title">背包 · 装备</div>
        <button type="button" data-close>关闭</button>
      </div>
      <div class="inventory-layout">
        <div class="equipment-panel">
          <div class="equipment-panel__power">战力 <strong>${player?.combatPower() ?? 0}</strong></div>
          ${player ? this.renderInventoryStats(player) : ''}
          ${equipmentEntries
            .map(([slot, itemId]) => {
              const item = itemId ? itemDefinition(itemId) : null;
              return `
                <div class="equipment-slot">
                  <div ${item ? this.tooltipAttrs(this.itemTooltip(item)) : ''}>
                    <div class="equipment-slot__label">${this.slotLabel(slot)}</div>
                    <strong>${item?.name ?? '空'}</strong>
                    <div class="equipment-slot__meta">${item ? this.statsText(item) : '未装备'}</div>
                  </div>
                  ${item ? `<button type="button" data-unequip="${slot}">卸下</button>` : ''}
                </div>
              `;
            })
            .join('')}
        </div>
        <div class="inventory-main">
          <div class="tabs">
            ${categories.map((category) => `<button type="button" data-filter="${category}" data-active="${category === this.inventoryFilter}">${category}</button>`).join('')}
          </div>
          <div class="inventory-grid">
            ${items.map((item) => this.renderItemCell(item)).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderCharacter(player: Player): void {
    const expPct = Math.min(100, (player.stats.exp / player.stats.expToNext) * 100);
    const totals = player.totalStats();
    this.panel.innerHTML = `
      <div class="panel__head">
        <div class="panel__title">角色</div>
        <button type="button" data-close>关闭</button>
      </div>
      <div>等级 ${player.stats.level} · ${player.stats.rank} · 战力 ${player.combatPower()}</div>
      <div class="progress"><span style="width:${expPct}%"></span></div>
      <div class="stats">
        <div class="stat">气血<br><strong>${player.stats.hp}/${totals.maxHp}</strong></div>
        <div class="stat">灵力<br><strong>${player.stats.mana}/${totals.maxMana}</strong></div>
        <div class="stat">攻击<br><strong>${totals.attack}</strong></div>
        <div class="stat">防御<br><strong>${totals.defense}</strong></div>
        <div class="stat">速度<br><strong>${totals.speed}</strong></div>
        <div class="stat">经验<br><strong>${player.stats.exp}/${player.stats.expToNext}</strong></div>
        <div class="stat">天赋点<br><strong>${player.stats.talentPoints}</strong></div>
        <div class="stat">突破<br><strong>${player.stats.breakthroughReady ? '可尝试' : '未到瓶颈'}</strong></div>
      </div>
      <div class="character-actions">
        <button type="button" data-breakthrough ${player.stats.breakthroughReady ? '' : 'disabled'}>突破位阶</button>
        <button type="button" data-talent="attack" ${player.stats.talentPoints > 0 ? '' : 'disabled'}>攻击天赋</button>
        <button type="button" data-talent="defense" ${player.stats.talentPoints > 0 ? '' : 'disabled'}>防御天赋</button>
        <button type="button" data-talent="mana" ${player.stats.talentPoints > 0 ? '' : 'disabled'}>灵力天赋</button>
        <button type="button" data-talent="hp" ${player.stats.talentPoints > 0 ? '' : 'disabled'}>气血天赋</button>
      </div>
      <div class="redeem-box">
        <input type="text" data-redeem-code placeholder="兑换码" maxlength="32" />
        <button type="button" data-redeem-submit>兑换</button>
      </div>
      <h3>装备</h3>
      <div class="stats">
        ${Object.entries(player.equipment)
          .map(([slot, item]) => {
            const definition = item ? itemDefinition(item) : undefined;
            return `<div class="stat" ${definition ? this.tooltipAttrs(this.itemTooltip(definition)) : ''}>${this.slotLabel(slot)}<br><strong>${definition?.name ?? item ?? '空'}</strong></div>`;
          })
          .join('')}
      </div>
      <h3>功法</h3>
      <div>${player.learnedArts
        .map((art) => {
          const spell = SPELL_LIBRARY.find((entry) => entry.id === art);
          return `<span class="stat" style="display:inline-block;margin:0 6px 6px 0" ${spell ? this.tooltipAttrs(this.spellTooltip(spell)) : ''}>${spell?.name ?? art}</span>`;
        })
        .join('')}</div>
    `;
  }

  private renderInventoryStats(player: Player): string {
    const totals = player.totalStats();
    const expPct = Math.min(100, (player.stats.exp / player.stats.expToNext) * 100);
    return `
      <div class="inventory-stats">
        <div class="inventory-stats__title">${player.stats.rank} · 等级 ${player.stats.level}</div>
        <div class="progress"><span style="width:${expPct}%"></span></div>
        <div class="inventory-stats__line">经验 <strong>${player.stats.exp}/${player.stats.expToNext}</strong>${player.stats.breakthroughReady ? ' · 可突破' : ''}</div>
        <div class="inventory-stats__grid">
          <span>气血 ${player.stats.hp}/${totals.maxHp} <em>基${player.stats.maxHp}</em></span>
          <span>灵力 ${player.stats.mana}/${totals.maxMana} <em>基${player.stats.maxMana}</em></span>
          <span>攻击 ${totals.attack} <em>基${player.stats.attack}</em></span>
          <span>防御 ${totals.defense} <em>基${player.stats.defense}</em></span>
          <span>速度 ${totals.speed} <em>基${player.stats.speed}</em></span>
          <span>天赋 ${player.stats.talentPoints}</span>
        </div>
      </div>
    `;
  }

  private renderMarket(settlement: Settlement, inventory: Inventory): void {
    const stones = inventory.items.find((item) => item.id === 'spirit-stone')?.quantity ?? 0;
    this.panel.innerHTML = `
      <div class="panel__head">
        <div class="panel__title">${settlement.name} · 集市</div>
        <button type="button" data-close>关闭</button>
      </div>
      <div class="market-balance">下品灵石：<strong>${stones}</strong></div>
      <div class="market-list">
        ${settlement.marketInventory
          .map(
            (item) => `
          <div class="market-item">
            <div>
              <div class="market-item__name">${item.name}</div>
              <div class="market-item__desc">${item.category} · ${item.description}</div>
              <div class="market-item__meta">价格 ${item.price} · 库存 ${item.stock}</div>
            </div>
            <button type="button" data-buy="${item.itemId}" ${item.stock <= 0 ? 'disabled' : ''}>购买</button>
          </div>`,
          )
          .join('')}
      </div>
    `;
  }

  private renderTeleport(inventory: Inventory): void {
    const stones = inventory.items.find((item) => item.id === 'spirit-stone')?.quantity ?? 0;
    const unlocked = this.teleportNodes.filter((node) => node.unlocked);
    this.panel.innerHTML = `
      <div class="panel__head">
        <div class="panel__title">传送阵</div>
        <button type="button" data-close>关闭</button>
      </div>
      <div class="market-balance">下品灵石：<strong>${stones}</strong> · 传送费用 12</div>
      <div class="market-list">
        ${unlocked
          .map(
            (node) => `
          <div class="market-item">
            <div>
              <div class="market-item__name">${node.name}</div>
              <div class="market-item__desc">${node.kind === 'sect' ? '宗门传送阵' : '城镇传送阵'} · 坐标 ${node.x}, ${node.y}</div>
            </div>
            <button type="button" data-teleport="${node.id}" ${node.id === this.currentTeleportNodeId ? 'disabled' : ''}>传送</button>
          </div>`,
          )
          .join('')}
      </div>
    `;
  }

  private renderInn(inn: RoadsideInn, inventory: Inventory): void {
    const stones = inventory.items.find((item) => item.id === 'spirit-stone')?.quantity ?? 0;
    const services = [
      { id: 'rest', name: '住宿休息', meta: `价格 ${inn.price}`, desc: '恢复全部气血，推进少许时间。' },
      { id: 'wine_mana', name: '饮竹叶灵酒', meta: '价格 8', desc: '清冽温和，恢复 60 点灵力。' },
      { id: 'wine_exp', name: '饮百花灵酿', meta: '价格 18', desc: '花气入脉，获得 45 点经验。经验已满时不会饮用。' },
      { id: 'wine_body', name: '饮烈阳烧', meta: '价格 24', desc: '酒性炽烈，恢复 35 气血与 25 灵力，并获得 20 点经验。' },
      { id: 'rumor', name: '打探情报', meta: '价格 3', desc: '向掌柜和行脚客打听附近传闻，为后续任务系统预留入口。' },
    ] as const;
    this.panel.innerHTML = `
      <div class="panel__head">
        <div class="panel__title">${inn.name}</div>
        <button type="button" data-close>关闭</button>
      </div>
      <div class="market-balance">下品灵石：<strong>${stones}</strong></div>
      <div class="market-list">
        ${services
          .map(
            (service) => `
          <div class="market-item">
            <div>
              <div class="market-item__name">${service.name}</div>
              <div class="market-item__desc">${service.desc}</div>
              <div class="market-item__meta">${service.meta}</div>
            </div>
            <button type="button" data-inn-service="${service.id}">选择</button>
          </div>`,
          )
          .join('')}
      </div>
    `;
  }

  private renderSect(sect: Sect, player: Player, inventory: Inventory): void {
    const stones = inventory.items.find((item) => item.id === 'spirit-stone')?.quantity ?? 0;
    const membership = player.sectMembership;
    const isMember = membership?.sectId === sect.id;
    const rank = isMember ? membership.rank : '外人';
    const discount = isMember ? sectRankDiscount(membership.rank) : 1.18;
    const hostile = (sect.relations.hostileNames?.length ? sect.relations.hostileNames : sect.relations.hostile.map((id) => this.sectNameById(id))).join('、') || '暂无明确敌宗';
    const friendly = (sect.relations.friendlyNames?.length ? sect.relations.friendlyNames : sect.relations.friendly.map((id) => this.sectNameById(id))).join('、') || '暂无盟友';
    const tasks = this.sectTasks.filter((task) => task.sectId === sect.id);
    this.panel.innerHTML = `
      <div class="panel__head">
        <div class="panel__title">${sect.name} · 宗门</div>
        <button type="button" data-close>关闭</button>
      </div>
      <div class="sect-summary">
        <div><strong>身份</strong> ${isMember ? `${membership.rank} · 功勋 ${membership.merit}` : '散修 / 外人'}</div>
        <div><strong>绝学</strong> ${sect.signatureSpellIds.map((id) => SPELL_LIBRARY.find((spell) => spell.id === id)?.name ?? id).join('、')}</div>
        <div><strong>关系</strong> 友好：${friendly}；敌对：${hostile}</div>
        <div><strong>折扣</strong> ${Math.round(discount * 100)}% · 灵石 ${stones}</div>
      </div>
      <div class="sect-actions">
        <button type="button" data-join-sect="${sect.id}" ${isMember ? 'disabled' : ''}>拜入宗门</button>
        <button type="button" data-sect-service="resources" ${isMember ? '' : 'disabled'}>领取月俸</button>
        <button type="button" data-sect-service="pool" ${isMember ? '' : 'disabled'}>灵气池修炼</button>
        <button type="button" data-sect-service="promote" ${isMember && membership.merit >= sectRankMeritThreshold(membership.rank) ? '' : 'disabled'}>晋升身份</button>
      </div>
      <h3>宗门商店</h3>
      <div class="market-list">
        ${sect.marketInventory
          .map((item) => {
            const rankOk = isMember && discipleRankIndex(membership.rank) >= discipleRankIndex(item.minRank);
            const price = Math.max(1, Math.round(item.price * discount));
            return `
              <div class="market-item">
                <div>
                  <div class="market-item__name">${item.name}</div>
                  <div class="market-item__desc">${item.category} · ${item.description}</div>
                  <div class="market-item__meta">价格 ${price} · 库存 ${item.stock} · 需求 ${item.minRank}</div>
                </div>
                <button type="button" data-buy-sect="${item.itemId}" ${rankOk && item.stock > 0 ? '' : 'disabled'}>兑换</button>
              </div>`;
          })
          .join('')}
      </div>
      <h3>宗门任务</h3>
      <div class="sect-actions">
        <button type="button" data-accept-task="gather" ${isMember ? '' : 'disabled'}>采摘灵药</button>
        <button type="button" data-accept-task="hunt" ${isMember ? '' : 'disabled'}>清剿妖兽</button>
        <button type="button" data-accept-task="rival" ${isMember ? '' : 'disabled'}>挑战敌宗</button>
      </div>
      <div class="market-list">
        ${tasks
          .map(
            (task) => `
          <div class="market-item">
            <div>
              <div class="market-item__name">${task.title}</div>
              <div class="market-item__desc">${task.description}</div>
              <div class="market-item__meta">目标 ${task.targetName} · 进度 ${task.progress}/${task.required} · 奖励功勋 ${task.rewardMerit}</div>
            </div>
            <button type="button" data-claim-task="${task.id}" ${task.progress >= task.required ? '' : 'disabled'}>${task.completed ? '已完成' : '交付'}</button>
          </div>`,
          )
          .join('') || '<div class="market-item"><div>暂无已接任务</div></div>'}
      </div>
    `;
  }

  private renderItemCell(item: ItemStack): string {
    const canEquip = item.itemType === 'equipment' && item.equipmentSlot;
    const canUse = item.itemType === 'consumable';
    const canLearn = (item.itemType === 'manual' || item.itemType === 'spellbook') && item.spellId;
    return `
      <div class="item-cell" ${this.tooltipAttrs(this.itemTooltip(item))}>
        <div>
          <div class="item-cell__name">${item.name}</div>
          <div class="item-cell__qty">${item.category} ×${item.quantity}</div>
          <div class="item-cell__desc">${item.description}</div>
          ${item.stats ? `<div class="item-cell__meta">${this.statsText(item)}</div>` : ''}
        </div>
        <div class="item-cell__actions">
          ${canEquip ? `<button type="button" data-equip="${item.id}">装备</button>` : ''}
          ${canUse ? `<button type="button" data-use="${item.id}">服用</button>` : ''}
          ${canLearn ? `<button type="button" data-learn="${item.id}">学习</button>` : ''}
        </div>
      </div>`;
  }

  private handlePanelClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
    if (!button || !this.panel.contains(button)) return;
    if (button.hasAttribute('data-close')) {
      this.panelMode = null;
      this.panel.hidden = true;
      this.panelDirty = false;
      return;
    }
    const filter = button.dataset.filter as ItemCategory | '全部' | undefined;
    if (filter) {
      this.inventoryFilter = filter;
      this.panelDirty = true;
      if (this.lastPlayer && this.lastInventory) {
        this.renderPanel(this.lastPlayer, this.lastInventory);
      }
    }
    const buyId = button.dataset.buy;
    if (buyId && this.activeSettlement && this.lastPlayer && this.lastInventory) {
      const item = this.activeSettlement.marketInventory.find((entry) => entry.itemId === buyId);
      if (!item) return;
      this.showToast(this.actions.onBuyMarketItem(this.activeSettlement, item));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const equipId = button.dataset.equip;
    if (equipId && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onEquipItem(equipId));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const unequipSlot = button.dataset.unequip as EquipmentSlot | undefined;
    if (unequipSlot && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onUnequipSlot(unequipSlot));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const useId = button.dataset.use;
    if (useId && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onUseItem(useId));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const learnId = button.dataset.learn;
    if (learnId && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onLearnItem(learnId));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const teleportId = button.dataset.teleport;
    if (teleportId && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onTeleport(Number(teleportId)));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const innService = button.dataset.innService as 'rest' | 'wine_mana' | 'wine_exp' | 'wine_body' | 'rumor' | undefined;
    if (innService && this.activeInn && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onInnService(this.activeInn, innService));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    if (button.dataset.joinSect && this.activeSect && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onJoinSect(this.activeSect), 3600);
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const sectService = button.dataset.sectService as 'resources' | 'pool' | 'promote' | undefined;
    if (sectService && this.activeSect && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onSectService(this.activeSect, sectService), 3200);
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const sectBuyId = button.dataset.buySect;
    if (sectBuyId && this.activeSect && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onBuySectItem(this.activeSect, sectBuyId));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const taskType = button.dataset.acceptTask as 'gather' | 'hunt' | 'rival' | undefined;
    if (taskType && this.activeSect && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onAcceptSectTask(this.activeSect, taskType), 3200);
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const claimTaskId = button.dataset.claimTask;
    if (claimTaskId && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onClaimSectTask(claimTaskId));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    if (button.hasAttribute('data-breakthrough') && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onBreakthrough());
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    const talent = button.dataset.talent as 'attack' | 'defense' | 'mana' | 'hp' | undefined;
    if (talent && this.lastPlayer && this.lastInventory) {
      this.showToast(this.actions.onAddTalent(talent));
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
    if (button.hasAttribute('data-redeem-submit') && this.lastPlayer && this.lastInventory) {
      const input = this.panel.querySelector<HTMLInputElement>('[data-redeem-code]');
      this.showToast(this.actions.onRedeemCode(input?.value.trim() ?? ''));
      if (input) input.value = '';
      this.panelDirty = true;
      this.renderPanel(this.lastPlayer, this.lastInventory);
    }
  }

  private handleCombatClick(event: MouseEvent): void {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('button');
    if (!button || !this.combat.contains(button)) return;
    if (button.hasAttribute('data-combat-close')) {
      this.actions.onCombatAction({ type: 'close' });
      return;
    }
    if (button.dataset.combatAction === 'attack') this.actions.onCombatAction({ type: 'attack' });
    if (button.dataset.combatAction === 'flee') this.actions.onCombatAction({ type: 'flee' });
    if (button.dataset.combatSpell) this.actions.onCombatAction({ type: 'spell', id: button.dataset.combatSpell });
    if (button.dataset.combatTalisman) this.actions.onCombatAction({ type: 'talisman', id: button.dataset.combatTalisman });
    if (button.dataset.combatItem) this.actions.onCombatAction({ type: 'item', id: button.dataset.combatItem });
  }

  private handleTooltipMove(event: PointerEvent): void {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-tooltip-title]');
    if (!target || (!this.panel.contains(target) && !this.combat.contains(target))) {
      this.hideTooltip();
      return;
    }
    const title = target.dataset.tooltipTitle ?? '';
    const body = target.dataset.tooltipBody ?? '';
    const meta = target.dataset.tooltipMeta ?? '';
    this.tooltip.innerHTML = `
      <div class="tooltip__title">${title}</div>
      ${meta ? `<div class="tooltip__meta">${meta}</div>` : ''}
      ${body ? `<div class="tooltip__body">${body}</div>` : ''}
    `;
    this.tooltip.hidden = false;
    this.positionTooltip(event.clientX, event.clientY);
  }

  private hideTooltip(): void {
    if (this.tooltip) this.tooltip.hidden = true;
  }

  private positionTooltip(clientX: number, clientY: number): void {
    const margin = 14;
    const rect = this.tooltip.getBoundingClientRect();
    let x = clientX + 16;
    let y = clientY + 16;
    if (x + rect.width + margin > window.innerWidth) x = clientX - rect.width - 16;
    if (y + rect.height + margin > window.innerHeight) y = clientY - rect.height - 16;
    this.tooltip.style.left = `${Math.max(margin, x)}px`;
    this.tooltip.style.top = `${Math.max(margin, y)}px`;
  }

  private renderDialogue(): void {
    if (!this.activeNPC) return;
    const node = this.activeNPC.profile.dialogue[this.activeNode] ?? this.activeNPC.profile.dialogue.root;
    this.dialogue.hidden = false;
    this.dialogue.innerHTML = `
      <div class="dialogue__name">${this.activeNPC.profile.name} · ${this.activeNPC.profile.rank} · ${this.npcIdentityLabel(this.activeNPC)} · 好感 ${this.activeNPC.profile.favor}</div>
      <div class="dialogue__text">${node.text}</div>
      <div class="dialogue__choices">
        ${node.choices.map((choice, index) => `<button type="button" data-choice="${index}">${choice.label}</button>`).join('')}
      </div>
    `;
    this.dialogue.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => this.chooseDialogue(node, Number(button.dataset.choice)));
    });
  }

  private renderCombatant(combatant: CombatViewState['player'], hpPct: number, side: 'player' | 'enemy'): string {
    const manaPct = Math.max(0, Math.min(100, (combatant.mana / Math.max(1, combatant.maxMana)) * 100));
    return `
      <div class="combatant combatant--${side}">
        <div class="combatant__name">${combatant.name}${combatant.rank ? ` · ${combatant.rank}` : ''}</div>
        <div class="combatant__power">战力 ${combatant.power}</div>
        <div class="combatant__bar combatant__bar--hp"><span style="width:${hpPct}%"></span></div>
        <div class="combatant__stats">气血 ${combatant.hp}/${combatant.maxHp}</div>
        <div class="combatant__bar combatant__bar--mana"><span style="width:${manaPct}%"></span></div>
        <div class="combatant__stats">灵力 ${combatant.mana}/${combatant.maxMana}</div>
        <div class="combatant__stats">攻 ${combatant.attack} · 防 ${combatant.defense} · 速 ${combatant.speed}</div>
      </div>
    `;
  }

  private chooseDialogue(node: DialogueNode, index: number): void {
    const npc = this.activeNPC;
    if (!npc) return;
    const choice = node.choices[index];
    if (!choice) return;
    if (choice.favorDelta) npc.profile.favor += choice.favorDelta;
    switch (choice.action) {
      case 'trade':
        this.showToast(this.actions.onNPCAction(npc, 'trade'));
        this.activeNode = 'root';
        this.renderDialogue();
        return;
      case 'spar':
        this.showToast(this.actions.onNPCAction(npc, 'spar'));
        this.closeDialogue();
        return;
      case 'battle':
        this.showToast(this.actions.onNPCAction(npc, 'battle'));
        this.closeDialogue();
        return;
      case 'gift':
        this.showToast(this.actions.onNPCAction(npc, 'gift'));
        this.activeNode = 'root';
        this.renderDialogue();
        return;
      case 'close':
        this.closeDialogue();
        return;
    }
    if (choice.next) {
      this.activeNode = choice.next;
      this.renderDialogue();
    }
  }

  private weatherLabel(weather: string): string {
    switch (weather) {
      case 'rain':
        return '灵雨';
      case 'fog':
        return '薄雾';
      case 'wind':
        return '山风';
      default:
        return '晴';
    }
  }

  private sectFacilityLabel(sect: Sect, x: number, y: number): string {
    if (Math.hypot(sect.shop.x - x, sect.shop.y - y) < 4) return '宗门商店';
    if (Math.hypot(sect.spiritPool.x - x, sect.spiritPool.y - y) < 4) return '灵气池';
    if (Math.hypot(sect.taskBoard.x - x, sect.taskBoard.y - y) < 4) return '任务榜';
    if (Math.hypot(sect.x - x, sect.y - y) < 6) return '宗门大殿';
    return '';
  }

  private sectNameById(id: number): string {
    return `宗门#${id + 1}`;
  }

  private npcIdentityLabel(npc: NPC): string {
    if (npc.profile.identity === '门派弟子') {
      return `${npc.profile.sectName ?? '未知宗门'}${npc.profile.discipleRank ? ` · ${npc.profile.discipleRank}` : ''}`;
    }
    return '散修';
  }

  private slotLabel(slot: string): string {
    switch (slot) {
      case 'weapon':
        return '武器';
      case 'armor':
        return '法衣';
      case 'talisman':
        return '符物';
      case 'boots':
        return '靴履';
      default:
        return slot;
    }
  }

  private statsText(item: Pick<ItemStack, 'stats'>): string {
    if (!item.stats) return '';
    const parts = [
      item.stats.hp ? `气血 ${item.stats.hp > 0 ? '+' : ''}${item.stats.hp}` : '',
      item.stats.mana ? `灵力 ${item.stats.mana > 0 ? '+' : ''}${item.stats.mana}` : '',
      item.stats.attack ? `攻击 ${item.stats.attack > 0 ? '+' : ''}${item.stats.attack}` : '',
      item.stats.defense ? `防御 ${item.stats.defense > 0 ? '+' : ''}${item.stats.defense}` : '',
      item.stats.speed ? `速度 ${item.stats.speed > 0 ? '+' : ''}${item.stats.speed}` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  }

  private itemTooltip(item: Pick<ItemStack, 'name' | 'category' | 'description' | 'value' | 'itemType' | 'equipmentSlot' | 'stats' | 'effect' | 'spellId'>): {
    title: string;
    body: string;
    meta: string;
  } {
    const spell = item.spellId ? SPELL_LIBRARY.find((entry) => entry.id === item.spellId) : undefined;
    const effect = this.effectText(item);
    const stats = this.statsText(item);
    const slot = item.equipmentSlot ? ` · ${this.slotLabel(item.equipmentSlot)}` : '';
    const metaParts = [`${item.category}${slot}`, `价值 ${item.value}`];
    if (spell) metaParts.push(`学习：${spell.name}`);
    return {
      title: item.name,
      meta: metaParts.join(' · '),
      body: [item.description, stats, effect, spell ? `${spell.description} 消耗灵力 ${spell.manaCost}，威力 ${spell.power}。` : ''].filter(Boolean).join('<br>'),
    };
  }

  private spellTooltip(spell: (typeof SPELL_LIBRARY)[number]): { title: string; body: string; meta: string } {
    return {
      title: spell.name,
      meta: `法术 · 灵力消耗 ${spell.manaCost} · 威力 ${spell.power} · 位阶需求 ${spell.rankRequired + 1}`,
      body: spell.description,
    };
  }

  private effectText(item: Pick<ItemStack, 'effect'>): string {
    if (!item.effect) return '';
    const parts = [
      item.effect.hp ? `恢复气血 ${item.effect.hp}` : '',
      item.effect.mana ? `恢复灵力 ${item.effect.mana}` : '',
      item.effect.exp ? `获得经验 ${item.effect.exp}` : '',
    ].filter(Boolean);
    return parts.join(' · ');
  }

  private tooltipAttrs(tooltip: { title: string; body: string; meta: string }): string {
    return `data-tooltip-title="${this.escapeAttr(tooltip.title)}" data-tooltip-meta="${this.escapeAttr(tooltip.meta)}" data-tooltip-body="${this.escapeAttr(tooltip.body)}"`;
  }

  private escapeAttr(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
