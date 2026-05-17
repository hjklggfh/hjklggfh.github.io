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

        this.cameras.main.setBackgroundColor('#0a0a14');

        // Cave room: 10x10 tiles centered
        const roomTiles = GameConstants.CAVE_INTERIOR_SIZE;
        const roomPx = roomTiles * TS;
        const ox = (w - roomPx) / 2;
        const oy = (h - roomPx) / 2;

        // Draw cave floor
        const gfx = this.add.graphics();
        for (let y = 0; y < roomTiles; y++) {
            for (let x = 0; x < roomTiles; x++) {
                const isWall = (x === 0 || x === roomTiles - 1 || y === 0 || y === roomTiles - 1);
                gfx.fillStyle(isWall ? 0x332244 : 0x1a1a2e, 1);
                gfx.fillRect(ox + x * TS, oy + y * TS, TS, TS);
                gfx.lineStyle(1, isWall ? 0x443355 : 0x222233, 0.5);
                gfx.strokeRect(ox + x * TS, oy + y * TS, TS, TS);
            }
        }

        // Title
        this.add.text(w / 2, oy - 30, '隐秘洞府', {
            fontSize: '20px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Treasure chest (center of room)
        const cx = ox + (roomTiles / 2) * TS;
        const cy = oy + (roomTiles / 2) * TS;

        // Draw chest
        const chest = this.add.rectangle(cx, cy, 40, 32, 0x886622);
        chest.setStrokeStyle(2, 0xaa8833);
        const chestLid = this.add.rectangle(cx, cy - 12, 44, 10, 0x997744);

        this.add.text(cx, cy + 30, '宝箱', {
            fontSize: '11px', fill: '#ffcc00', fontFamily: 'monospace'
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

        const panelBg = this.add.rectangle(0, 0, 280, 200, 0x222233, 0.95);
        panelBg.setStrokeStyle(1, 0x886622);
        this.lootPanel.add(panelBg);

        this.lootPanel.add(this.add.text(0, -75, '获得宝物！', {
            fontSize: '16px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5));

        let ly = -45;
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
            fontSize: '15px', fill: '#4488ff', fontFamily: 'monospace',
            padding: { left: 15, right: 15, top: 5, bottom: 5 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(10);

        this.leaveBtn.on('pointerover', () => this.leaveBtn.setStyle({ fill: '#88bbff' }));
        this.leaveBtn.on('pointerout', () => this.leaveBtn.setStyle({ fill: '#4488ff' }));
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
}
