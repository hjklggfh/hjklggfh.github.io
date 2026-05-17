class TeleportScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TeleportScene' });
    }

    init(data) {
        this.portalData = data;
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const fromMap = this.portalData ? this.portalData.fromMap : GameState.currentMapId;

        // Semi-transparent overlay
        const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6);
        overlay.setInteractive();

        // Panel background
        const panelW = 400, panelH = 340;
        this.add.rectangle(w / 2, h / 2, panelW, panelH, 0x222244, 0.95).setStrokeStyle(2, 0x4488ff);

        // Title
        const mapName = GameConstants.MAP_NAMES[fromMap] || fromMap;
        this.add.text(w / 2, h / 2 - 145, '传送阵 — ' + mapName, {
            fontSize: '18px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Available destinations
        const destinations = TeleportManager.getAvailableDestinations(fromMap);
        this.add.text(w / 2, h / 2 - 115, '选择传送目标:', {
            fontSize: '13px', fill: '#aaaacc', fontFamily: 'monospace'
        }).setOrigin(0.5);

        if (destinations.length === 0) {
            this.add.text(w / 2, h / 2, '此处传送阵暂不可用', {
                fontSize: '14px', fill: '#888888', fontFamily: 'monospace'
            }).setOrigin(0.5);
        }

        let startY = h / 2 - 85;
        for (const dest of destinations) {
            const costStr = dest.cost + ' 灵石';
            const affordable = dest.affordable;

            // Destination button
            const btnY = startY;
            const btn = this.add.rectangle(w / 2, btnY + 15, 300, 36, 0x333355, 1)
                .setStrokeStyle(1, affordable ? 0x4488ff : 0x664444)
                .setInteractive({ useHandCursor: true });

            if (affordable) {
                btn.on('pointerover', () => btn.setFillStyle(0x444466));
                btn.on('pointerout', () => btn.setFillStyle(0x333355));
                btn.on('pointerdown', () => {
                    this._confirmTeleport(fromMap, dest);
                });
            }

            this.add.text(w / 2 - 140, btnY, dest.name, {
                fontSize: '15px', fill: affordable ? '#ffffff' : '#666666', fontFamily: 'monospace'
            }).setOrigin(0, 0.5);

            this.add.text(w / 2 + 140, btnY, costStr, {
                fontSize: '13px', fill: affordable ? '#ffcc00' : '#884444', fontFamily: 'monospace'
            }).setOrigin(1, 0.5);

            startY += 50;
        }

        // Gold display
        this.add.text(w / 2, h / 2 + 115, '当前灵石: ' + GameState.playerGold, {
            fontSize: '12px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Cancel button
        const cancelBtn = this.add.text(w / 2, h / 2 + 150, '离 开', {
            fontSize: '16px', fill: '#aaaaaa', fontFamily: 'monospace',
            padding: { left: 20, right: 20, top: 6, bottom: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        cancelBtn.on('pointerover', () => cancelBtn.setStyle({ fill: '#ffffff' }));
        cancelBtn.on('pointerout', () => cancelBtn.setStyle({ fill: '#aaaaaa' }));
        cancelBtn.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });

        // Close on ESC
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }

    _confirmTeleport(fromMap, dest) {
        const cost = dest.cost;
        if (!TeleportManager.canTeleport(cost)) {
            Notification.show(this, '灵石不足！');
            return;
        }

        // Show confirmation
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        this.children.removeAll(true);

        this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setInteractive();
        this.add.rectangle(w / 2, h / 2, 280, 180, 0x222244, 0.95).setStrokeStyle(2, 0x4488ff);

        this.add.text(w / 2, h / 2 - 50, '确认传送至', {
            fontSize: '14px', fill: '#aaaacc', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(w / 2, h / 2 - 25, dest.name, {
            fontSize: '20px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.add.text(w / 2, h / 2 + 10, '费用: ' + cost + ' 灵石', {
            fontSize: '13px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Confirm button
        const yesBtn = this.add.text(w / 2 - 60, h / 2 + 55, '确认传送', {
            fontSize: '15px', fill: '#44ff44', fontFamily: 'monospace',
            padding: { left: 12, right: 12, top: 4, bottom: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        yesBtn.on('pointerover', () => yesBtn.setStyle({ fill: '#88ff88' }));
        yesBtn.on('pointerout', () => yesBtn.setStyle({ fill: '#44ff44' }));
        yesBtn.on('pointerdown', () => {
            this.scene.stop();
            Events.emit('teleportTo', dest.mapId);
        });

        // Cancel button
        const noBtn = this.add.text(w / 2 + 60, h / 2 + 55, '取消', {
            fontSize: '15px', fill: '#ff4444', fontFamily: 'monospace',
            padding: { left: 12, right: 12, top: 4, bottom: 4 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        noBtn.on('pointerover', () => noBtn.setStyle({ fill: '#ff8888' }));
        noBtn.on('pointerout', () => noBtn.setStyle({ fill: '#ff4444' }));
        noBtn.on('pointerdown', () => {
            this.scene.stop();
            this.scene.resume('GameScene');
        });
    }
}
