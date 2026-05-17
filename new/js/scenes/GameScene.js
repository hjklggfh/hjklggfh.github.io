class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Setup input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyI = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.keyB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Load map
        MapManager.loadMap(this, GameState.currentMapId);

        // Draw tile grid if procedural
        if (MapManager.isProcedural) {
            this._drawTileGrid();
        }

        // Create player at saved position
        const pos = GameState.mapPositions[GameState.currentMapId];
        this.player = new Player(this, pos.x, pos.y);

        // Camera follow
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        this.cameras.main.setZoom(1);

        // Collision with map obstacles
        if (MapManager.collisionLayer) {
            this.physics.add.collider(this.player, MapManager.collisionLayer);
        }
        if (MapManager.getProceduralObstacles()) {
            this.physics.add.collider(this.player, MapManager.getProceduralObstacles());
        }

        // Player-NPC collision
        for (const npc of NPCSpawner.getNPCs()) {
            this.physics.add.collider(this.player, npc);
        }

        // Spawn NPCs (must happen before player-NPC collision setup)
        NPCSpawner.spawnNPCs(this);

        // HUD
        HUD.init(this);

        // Map name display
        const mapName = GameConstants.MAP_NAMES[GameState.currentMapId] || GameState.currentMapId;
        this.mapNameText = this.add.text(400, 15, mapName, {
            fontSize: '16px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
        this.time.delayedCall(3000, () => {
            if (this.mapNameText) this.mapNameText.setAlpha(0);
        });

        // Events
        Events.on('qiChanged', () => HUD.update(), this);
        Events.on('itemAcquired', (itemId, qty) => {
            const item = ItemDatabase.getItemById(itemId);
            if (item) Notification.show(this, '获得 ' + item.name + (qty > 1 ? ' x' + qty : ''));
            HUD.update();
        }, this);
        Events.on('teleportTo', (targetMap) => this._doTeleport(targetMap), this);
        Events.on('resumeFromOverlay', () => {
            this.scene.resume('GameScene');
        }, this);

        // Input: ESC opens menu (MenuScene handles its own close)
        this.keyESC.on('down', () => {
            this.scene.launch('MenuScene');
            this.scene.pause();
        });
        // Input: I opens inventory (InventoryScene handles its own close)
        this.keyI.on('down', () => {
            this.scene.launch('InventoryScene');
            this.scene.pause();
        });
        // Input: E for interact
        this.keyE.on('down', () => {
            this._tryInteract();
        });
        // Input: B for breakthrough
        this.keyB.on('down', () => {
            this.scene.pause();
            this.scene.launch('BreakthroughScene');
        });

        // Auto-save timer
        this.autoSaveTimer = this.time.addEvent({
            delay: GameConstants.AUTO_SAVE_INTERVAL,
            callback: () => SaveManager.autoSave(),
            loop: true
        });

        Events.emit('mapLoaded', GameState.currentMapId);
    }

    _drawTileGrid() {
        const tileData = MapManager.getTileData();
        if (!tileData) return;

        const gfx = this.add.graphics();
        gfx.setDepth(-1);
        const TS = GameConstants.TILE_SIZE;
        const TW = GameConstants.MAP_WIDTH_TILES;
        const TH = GameConstants.MAP_HEIGHT_TILES;
        const theme = GameConstants.MAP_THEMES[GameState.currentMapId] || GameConstants.MAP_THEMES['world-1'];

        // Tile colors from map theme
        const themeColors = {
            'world-1': [0x2d5a1e, 0x3a6b2a, 0x335588, 0x777777, 0x225522, 0x8b7355, 0x3a1a3e, 0x4a2a4e],
            'world-2': [0x6a7a6a, 0x7a8a7a, 0x8899aa, 0x999999, 0x556655, 0xccbb88, 0x5a5a6a, 0x6a6a7a],
            'world-3': [0x2a1a2e, 0x3a2a3e, 0x662233, 0x553344, 0x1a0a1e, 0x553355, 0x3a1a3e, 0x4a2a4e]
        };
        const colors = themeColors[GameState.currentMapId] || themeColors['world-1'];

        for (let y = 0; y < TH; y++) {
            for (let x = 0; x < TW; x++) {
                const tile = tileData[y * TW + x];
                const color = colors[tile] || colors[0];
                gfx.fillStyle(color, 1);
                gfx.fillRect(x * TS, y * TS, TS, TS);
                // Subtle grid lines
                gfx.lineStyle(1, color, 0.2);
                gfx.strokeRect(x * TS, y * TS, TS, TS);
            }
        }

        // Draw town outlines
        if (MapManager.townAreas) {
            for (const town of MapManager.townAreas) {
                gfx.lineStyle(2, 0xffcc88, 0.5);
                gfx.strokeRect(town.x, town.y, town.w, town.h);
            }
        }
    }

    _tryInteract() {
        const px = this.player.x;
        const py = this.player.y;
        const range = GameConstants.PLAYER_INTERACT_RANGE;

        // Check NPC proximity (highest priority)
        const npc = NPCSpawner.getNearbyNPC(px, py, range);
        if (npc && npc.npcData) {
            this.scene.launch('DialogueScene', {
                npcData: npc.npcData,
                dialogueTreeId: npc.npcData.dialogueTree
            });
            this.scene.pause();
            return;
        }

        // Check market (town tile, no NPC nearby)
        const tile = MapManager.getTileAt(px, py);
        if (tile === 5) {
            this.scene.launch('MarketplaceScene');
            this.scene.pause();
            return;
        }

        // Check portal proximity
        const portals = MapManager.getPortals();
        for (const p of portals) {
            const dist = Phaser.Math.Distance.Between(px, py, p.x + 32, p.y + 32);
            if (dist < range) {
                this.scene.pause();
                this.scene.launch('TeleportScene', {
                    portal: p,
                    fromMap: GameState.currentMapId
                });
                return;
            }
        }

        // Check cave proximity
        const caves = MapManager.getCaves();
        for (const c of caves) {
            const dist = Phaser.Math.Distance.Between(px, py, c.x + 16, c.y + 16);
            if (dist < range) {
                const discovered = GameState.discoveredCaves[GameState.currentMapId] || [];
                if (!discovered.includes(c.id)) {
                    CaveManager.discoverCave(GameState.currentMapId, c.id);
                    Notification.show(this, '发现隐秘洞府！');
                    // Update marker alpha
                    if (MapManager.caveMarkers) {
                        const idx = caves.indexOf(c);
                        if (idx >= 0 && MapManager.caveMarkers[idx]) {
                            MapManager.caveMarkers[idx].setAlpha(0.7);
                        }
                    }
                }
                CaveManager.enterCave(this, c.id);
                return;
            }
        }
    }

    _doTeleport(targetMap) {
        NPCSpawner.despawnAll();
        const cost = TeleportManager.getTeleportCost(GameState.currentMapId, targetMap);
        GameState.playerGold -= cost;

        // Get landing position near target portal
        const portals = TeleportManager.getTargetPortals(targetMap, GameState.currentMapId);
        const landing = portals.length > 0
            ? { x: portals[0].x + GameConstants.TELEPORT_LANDING_OFFSET,
                y: portals[0].y + GameConstants.TELEPORT_LANDING_OFFSET }
            : { x: 1600, y: 1600 };

        GameState.mapPositions[GameState.currentMapId] = { x: this.player.x, y: this.player.y };
        GameState.currentMapId = targetMap;
        GameState.mapPositions[targetMap] = landing;

        SaveManager.autoSave();

        // Restart scene with new map (no fade since scene may be paused)
        this.scene.resume('GameScene');
        this.time.delayedCall(50, () => { this.scene.restart(); });
    }

    _checkEncounter(time, delta) {
        if (this.scene.isActive('BattleScene')) return;
        GameState.encounterCooldown -= delta;
        if (GameState.encounterCooldown > 0) return;

        // Only encounter on wild tiles (grass=0, forest=4, dark=6,7)
        const tile = MapManager.getTileAt(this.player.x, this.player.y);
        const wildTiles = [0, 1, 4, 6, 7];
        if (!wildTiles.includes(tile)) return;

        // Check if player is moving
        const vx = this.player.body ? this.player.body.velocity.x : 0;
        const vy = this.player.body ? this.player.body.velocity.y : 0;
        if (Math.abs(vx) < 1 && Math.abs(vy) < 1) return;

        const chance = GameConstants.ENCOUNTER_CHANCE_PER_STEP;
        if (Math.random() < chance) {
            GameState.encounterCooldown = GameConstants.ENCOUNTER_COOLDOWN;
            const monsterData = Monster.pickForArea(GameState.currentMapId);
            this.scene.launch('BattleScene', { monsterData: monsterData });
            this.scene.pause();
        }
    }

    update(time, delta) {
        if (!this.player || !this.player.body) return;

        this.player.handleMovement(this.cursors, this.wasd);

        GameState.mapPositions[GameState.currentMapId] = {
            x: this.player.x,
            y: this.player.y
        };

        GameState.playTime += delta;

        // Update NPCs
        NPCSpawner.update(time, delta);

        // Random encounter check
        this._checkEncounter(time, delta);

        // Water tile slow effect
        if (MapManager.isProcedural) {
            const tile = MapManager.getTileAt(this.player.x, this.player.y);
            if (tile === 2) {
                this.player.setVelocity(
                    this.player.body.velocity.x * 0.5,
                    this.player.body.velocity.y * 0.5
                );
            }
        }
    }

    shutdown() {
        NPCSpawner.despawnAll();
        Events.off('qiChanged', null, this);
        Events.off('itemAcquired', null, this);
        Events.off('teleportTo', null, this);
        Events.off('resumeFromOverlay', null, this);
        if (this.autoSaveTimer) this.autoSaveTimer.destroy();
    }
}
