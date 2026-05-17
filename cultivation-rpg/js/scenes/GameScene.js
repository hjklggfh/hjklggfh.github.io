class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const theme = GameConstants.MAP_THEMES[GameState.currentMapId] || GameConstants.MAP_THEMES['world-1'];
        this.cameras.main.setBackgroundColor(theme.skyColor || '#d8f1e5');

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

        // Spawn NPCs (must happen before player-NPC collision setup)
        NPCSpawner.spawnNPCs(this);
        for (const npc of NPCSpawner.getNPCs()) {
            this.physics.add.collider(this.player, npc);
        }

        // HUD
        HUD.init(this);

        // Map name display
        const mapName = GameConstants.MAP_NAMES[GameState.currentMapId] || GameState.currentMapId;
        this.mapNameText = this.add.text(400, 15, mapName, {
            fontSize: '16px', fill: '#fff0b8', fontFamily: 'monospace',
            stroke: '#243b36', strokeThickness: 3
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
        Events.on('openTrade', (npcData) => {
            this.scene.launch('MarketplaceScene', {
                town: MapManager.getCurrentTown(this.player.x, this.player.y),
                npcData: npcData || null
            });
            this.scene.pause();
        }, this);
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
        const heightData = MapManager.getHeightData();

        const themeColors = {
            'world-1': [0x7cae75, 0x8bbf7e, 0x3f93a6, 0x8a8f80, 0x2f7d58, 0xc59761, 0x5c4b6d, 0x6b557c, 0xdac46f, 0xa8d1a0, 0xb7d2c6, 0xe0eee7, 0xc7dbca, 0x493c64, 0x5b4a72, 0x6b5062],
            'world-2': [0xa7ccb9, 0xb7d2c6, 0x8bc4d1, 0xa5b7bb, 0x4f8f72, 0xd9c58b, 0x6d5c86, 0x7d6b94, 0xe9f3ed, 0xc6e1cc, 0xb7d2c6, 0xe9f8ff, 0xc9d7d8, 0x493c64, 0x5b4a72, 0x6b5062],
            'world-3': [0x3f3656, 0x4a3d62, 0x7e4866, 0x6d4d75, 0x274d48, 0x8f6b55, 0x5a4265, 0x70516d, 0xb48a58, 0x5f7f66, 0x695c7a, 0x7d6f8e, 0x5c5368, 0x493c64, 0x5b4a72, 0x6b5062]
        };
        const colors = themeColors[GameState.currentMapId] || themeColors['world-1'];

        for (let y = 0; y < TH; y++) {
            for (let x = 0; x < TW; x++) {
                const tile = tileData[y * TW + x];
                const color = colors[tile] || colors[0];
                const hgt = heightData ? heightData[y * TW + x] : 0;
                const base = Phaser.Display.Color.IntegerToColor(color);
                const shade = Math.min(34, hgt * 8);
                const finalColor = Phaser.Display.Color.GetColor(
                    Math.min(255, base.red + shade),
                    Math.min(255, base.green + shade),
                    Math.min(255, base.blue + shade)
                );
                const px = x * TS;
                const py = y * TS - hgt * 2;
                gfx.fillStyle(finalColor, 1);
                gfx.fillRect(px, py, TS, TS + hgt * 2);
                if (hgt > 0) {
                    gfx.fillStyle(0x000000, 0.08);
                    gfx.fillRect(px, py + TS, TS, hgt * 2);
                    gfx.lineStyle(1, 0xffffff, 0.08);
                    gfx.lineBetween(px, py, px + TS, py);
                }
            }
        }

        this._drawTerrainDetails(gfx, tileData, heightData, TS, TW, TH);

        if (MapManager.townAreas) {
            for (const town of MapManager.townAreas) {
                gfx.fillStyle(0xfff0b8, 0.09);
                gfx.fillRect(town.x + 6, town.y + 6, town.w - 12, town.h - 12);
                gfx.lineStyle(2, 0xfff0b8, 0.65);
                gfx.strokeRect(town.x, town.y, town.w, town.h);
            }
        }
    }

    _drawTerrainDetails(gfx, tileData, heightData, TS, TW, TH) {
        for (let y = 1; y < TH - 1; y++) {
            for (let x = 1; x < TW - 1; x++) {
                const tile = tileData[y * TW + x];
                const hgt = heightData ? heightData[y * TW + x] : 0;
                const px = x * TS;
                const py = y * TS - hgt * 2;
                if (tile === 2) {
                    gfx.fillStyle(0xffffff, 0.18);
                    gfx.fillEllipse(px + 16, py + 16, 20, 5);
                } else if (tile === 3) {
                    gfx.fillStyle(0xf1f2e0, 0.28);
                    gfx.fillTriangle(px + 8, py + 8, px + 16, py - 2, px + 24, py + 8);
                    gfx.fillStyle(0x3d3a45, 0.18);
                    gfx.fillTriangle(px + 16, py - 2, px + 24, py + 8, px + 16, py + 14);
                } else if (tile === 4 && (x + y) % 3 === 0) {
                    gfx.fillStyle(0x133d2f, 0.55);
                    gfx.fillCircle(px + 15, py + 11, 8);
                    gfx.fillStyle(0x2f7d58, 0.85);
                    gfx.fillCircle(px + 18, py + 13, 7);
                    gfx.fillStyle(0x5a3a24, 0.8);
                    gfx.fillRect(px + 14, py + 17, 5, 11);
                } else if (tile === 5) {
                    gfx.fillStyle(0x6f4b32, 0.85);
                    gfx.fillRect(px + 7, py + 12, 18, 12);
                    gfx.fillStyle(0xd8a75f, 0.9);
                    gfx.fillTriangle(px + 5, py + 13, px + 16, py + 4, px + 27, py + 13);
                } else if ((tile === 8 || tile === 9) && (x * 13 + y * 7) % 17 === 0) {
                    gfx.fillStyle(0xfff0b8, 0.55);
                    gfx.fillCircle(px + 12, py + 18, 2);
                    gfx.fillCircle(px + 20, py + 10, 1.5);
                }
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

        const town = MapManager.getCurrentTown(px, py);
        if (town) {
            this.scene.launch('MarketplaceScene', { town });
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
                if (c.completed) {
                    Notification.show(this, '洞府已探索完毕。');
                    return;
                }
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

        if (MapManager.isForestTile(px, py)) {
            this._forageForest();
            return;
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

        // Only encounter on wild tiles.
        const tile = MapManager.getTileAt(this.player.x, this.player.y);
        const wildTiles = [0, 1, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
        if (!wildTiles.includes(tile)) return;

        // Check if player is moving
        const vx = this.player.body ? this.player.body.velocity.x : 0;
        const vy = this.player.body ? this.player.body.velocity.y : 0;
        if (Math.abs(vx) < 1 && Math.abs(vy) < 1) return;

        const chance = GameConstants.ENCOUNTER_CHANCE_PER_STEP;
        if (Math.random() < chance) {
            GameState.encounterCooldown = GameConstants.ENCOUNTER_COOLDOWN;
            const monsterData = Monster.pickForArea(GameState.currentMapId, tile);
            this.scene.launch('BattleScene', { monsterData: monsterData });
            this.scene.pause();
        }
    }

    _forageForest() {
        GameState.encounterCooldown = Math.max(GameState.encounterCooldown, 1000);
        if (Math.random() < 0.42) {
            const pool = ItemDatabase.materials.filter(m => ['凡品', '良品', '灵品', '玄品'].includes(m.quality));
            const item = RandomUtils.pick(pool);
            InventoryManager.addItem(item.id, RandomUtils.intBetween(1, 3));
            Notification.show(this, '采集到 ' + item.name);
        } else if (Math.random() < 0.36) {
            Notification.show(this, '林中妖气逼近！');
            this.scene.launch('BattleScene', { monsterData: Monster.pickForArea(GameState.currentMapId, 4) });
            this.scene.pause();
        } else {
            Notification.show(this, '林雾很深，暂未发现可采之物。');
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

        // Forest slows movement while remaining explorable.
        if (MapManager.isProcedural) {
            const tile = MapManager.getTileAt(this.player.x, this.player.y);
            if (tile === 4) {
                this.player.setVelocity(
                    this.player.body.velocity.x * 0.74,
                    this.player.body.velocity.y * 0.74
                );
            }
        }
    }

    shutdown() {
        NPCSpawner.despawnAll();
        Events.off('qiChanged', null, this);
        Events.off('itemAcquired', null, this);
        Events.off('teleportTo', null, this);
        Events.off('openTrade', null, this);
        Events.off('resumeFromOverlay', null, this);
        if (this.autoSaveTimer) this.autoSaveTimer.destroy();
    }
}
