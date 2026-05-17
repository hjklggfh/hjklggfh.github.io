class CaveInteriorScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CaveInteriorScene' });
    }

    init(data) {
        this.caveId = data.caveId;
        this.mapId = data.mapId;
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const TS = GameConstants.TILE_SIZE;

        this.cameras.main.setBackgroundColor('#100c16');

        const roomTiles = GameConstants.CAVE_INTERIOR_SIZE + RandomUtils.intBetween(0, 4);
        const roomPx = roomTiles * TS;
        const ox = (w - roomPx) / 2;
        const oy = (h - roomPx) / 2;

        const gfx = this.add.graphics();
        const path = this._generatePath(roomTiles);
        for (let y = 0; y < roomTiles; y++) {
            for (let x = 0; x < roomTiles; x++) {
                const key = x + ',' + y;
                const isWall = !path.has(key);
                gfx.fillStyle(isWall ? 0x332244 : ((x + y) % 2 === 0 ? 0x1f2631 : 0x1a202b), 1);
                gfx.fillRect(ox + x * TS, oy + y * TS, TS, TS);
                gfx.lineStyle(1, isWall ? 0x4d3b62 : 0x304250, 0.55);
                gfx.strokeRect(ox + x * TS, oy + y * TS, TS, TS);
                if (!isWall && (x * 11 + y * 5) % 13 === 0) {
                    gfx.fillStyle(0x8ed3b0, 0.35);
                    gfx.fillCircle(ox + x * TS + 16, oy + y * TS + 16, 2);
                }
            }
        }

        // Title
        this.add.text(w / 2, oy - 30, '隐秘洞府', {
            fontSize: '20px', fill: '#fff0b8', fontFamily: 'monospace'
        }).setOrigin(0.5);

        const end = this._pathEnd(path, roomTiles);
        const cx = ox + end.x * TS + TS / 2;
        const cy = oy + end.y * TS + TS / 2;

        // Draw chest
        const chest = this.add.rectangle(cx, cy, 40, 32, 0x8f5b31);
        chest.setStrokeStyle(2, 0xffd166);
        const chestLid = this.add.rectangle(cx, cy - 12, 44, 10, 0xb77a3b);

        this.add.text(cx, cy + 30, '宝箱', {
            fontSize: '11px', fill: '#fff0b8', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Glow animation
        this.tweens.add({
            targets: [chest, chestLid],
            alpha: 0.7,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // Generate loot
        const loot = CaveManager.generateCaveLoot();

        // Loot panel (hidden until opened)
        this.lootPanel = this.add.container(w / 2, h / 2 + 20);
        this.lootPanel.setVisible(false);

        const panelBg = this.add.rectangle(0, 0, 320, 230, 0x17322c, 0.96);
        panelBg.setStrokeStyle(1, 0xffd166);
        this.lootPanel.add(panelBg);

        this.lootPanel.add(this.add.text(0, -75, '获得宝物！', {
            fontSize: '16px', fill: '#fff0b8', fontFamily: 'monospace'
        }).setOrigin(0.5));

        let ly = -72;
        for (const item of loot) {
            const color = item.isGold ? '#ffcc00' : '#aaddff';
            const prefix = item.isGold ? '' : '获得 ';
            this.lootPanel.add(this.add.text(0, ly, prefix + item.name + (item.quantity > 1 ? ' x' + item.quantity : ''), {
                fontSize: '13px', fill: color, fontFamily: 'monospace'
            }).setOrigin(0.5));
            ly += 22;
        }

        // Leave button (hidden until opened)
        this.leaveBtn = this.add.text(cx, cy + 100, '离开洞府', {
            fontSize: '15px', fill: '#9bffd0', fontFamily: 'monospace',
            padding: { left: 15, right: 15, top: 5, bottom: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

        this.leaveBtn.on('pointerover', () => this.leaveBtn.setStyle({ fill: '#ffffff' }));
        this.leaveBtn.on('pointerout', () => this.leaveBtn.setStyle({ fill: '#9bffd0' }));
        this.leaveBtn.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
        this.leaveBtn.setVisible(false);

        // Click chest to open
        chest.setInteractive({ useHandCursor: true });
        chest.on('pointerdown', () => {
            if (this._opened) return;
            this._opened = true;
            chest.setAlpha(0.5);
            chestLid.setAlpha(0.5);
            chest.disableInteractive();

            // Add items to inventory
            for (const item of loot) {
                if (item.isGold) {
                    GameState.playerGold += item.quantity;
                } else if (item.itemId) {
                    InventoryManager.addItem(item.itemId, item.quantity);
                }
            }

            CaveManager.completeCave(this.mapId, this.caveId);

            // Show loot panel
            this.lootPanel.setVisible(true);
            this.leaveBtn.setVisible(true);
            this.tweens.add({
                targets: this.lootPanel,
                alpha: { from: 0, to: 1 },
                duration: 400
            });

            HUD.update();
            SaveManager.autoSave();
        });

        // Close on ESC
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }

    _generatePath(roomTiles) {
        const path = new Set();
        let x = 1;
        let y = Math.floor(roomTiles / 2);
        path.add(x + ',' + y);
        while (x < roomTiles - 2) {
            if (Math.random() < 0.62) x++;
            else y += Math.random() < 0.5 ? -1 : 1;
            y = Math.max(1, Math.min(roomTiles - 2, y));
            path.add(x + ',' + y);
            if (Math.random() < 0.35) {
                const branchY = Math.max(1, Math.min(roomTiles - 2, y + (Math.random() < 0.5 ? -1 : 1)));
                path.add(x + ',' + branchY);
                if (x + 1 < roomTiles - 1) path.add((x + 1) + ',' + branchY);
            }
        }
        for (let i = 0; i < roomTiles; i++) {
            path.add('1,' + i);
            path.add((roomTiles - 2) + ',' + Math.max(1, Math.min(roomTiles - 2, y + i % 3 - 1)));
        }
        return path;
    }

    _pathEnd(path, roomTiles) {
        let best = { x: roomTiles - 2, y: Math.floor(roomTiles / 2) };
        for (const key of path) {
            const parts = key.split(',');
            const x = parseInt(parts[0], 10);
            const y = parseInt(parts[1], 10);
            if (x > best.x || (x === best.x && Math.abs(y - roomTiles / 2) < Math.abs(best.y - roomTiles / 2))) {
                best = { x, y };
            }
        }
        return best;
    }
}
