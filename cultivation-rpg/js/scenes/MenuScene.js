class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;

        // Background
        this.cameras.main.setBackgroundColor('#17322c');
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x20352f, 0x20352f, 0x171421, 0x101b18, 1);
        bg.fillRect(0, 0, w, h);

        // Title
        this.add.text(w / 2, 80, '修 仙 传', {
            fontSize: '48px', fill: '#fff0b8', fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#243b36', strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(w / 2, 130, '青岚、玄霄、烬月三域重制版', {
            fontSize: '14px', fill: '#9bffd0', fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Decorative particles
        for (let i = 0; i < 20; i++) {
            const px = Phaser.Math.Between(50, w - 50);
            const py = Phaser.Math.Between(150, h - 50);
            const dot = this.add.circle(px, py, Phaser.Math.Between(1, 3), 0xfff0b8, 0.45);
            this.tweens.add({
                targets: dot,
                alpha: 0.2,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1
            });
        }

        // Menu buttons
        const hasSave = SaveManager.hasAnySave();

        this._createButton(w / 2, 220, '新 游 戏', () => {
            GameState.reset();
            GameState.playerName = '云逸';
            // Starter items
            InventoryManager.addItem('fire_palm', 1);
            InventoryManager.addItem('heal_low', 5);
            InventoryManager.addItem('heal_mid', 2);
            InventoryManager.addItem('seal_paper', 3);
            InventoryManager.addItem('spirit_herb', 4);
            InventoryManager.addItem('iron_sword', 1);
            InventoryManager.addItem('cloth_armor', 1);
            InventoryManager.equipItem('iron_sword');
            InventoryManager.equipItem('cloth_armor');
            // Full HP after equipping
            const stats = CultivationData.getEffectiveStats();
            GameState.currentHP = stats.hp;
            GameState.maxHP = stats.hp;
            if (this.scene.isActive('GameScene')) {
                this.scene.stop('GameScene');
            }
            this.scene.start('GameScene');
        });

        if (hasSave) {
            this._createButton(w / 2, 290, '继续游戏', () => {
                if (SaveManager.load(0)) {
                    if (this.scene.isActive('GameScene')) {
                        this.scene.stop('GameScene');
                    }
                    this.scene.start('GameScene');
                }
            });
        }

        // Show "Back to Game" only when GameScene is paused (overlay mode)
        if (this.scene.isActive('GameScene')) {
            this._createButton(w / 2, hasSave ? 360 : 290, '返回游戏', () => {
                this.scene.stop();
                this.scene.resume('GameScene');
            });
        }

        // ESC handler — close overlay if GameScene is underneath
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.scene.isActive('GameScene')) {
                this.scene.stop();
                this.scene.resume('GameScene');
            }
        });

        // Controls hint
        this.add.text(w / 2, h - 40, '方向键/WASD 移动  |  E 交互  |  I 背包  |  ESC 菜单', {
            fontSize: '10px', fill: '#666666', fontFamily: 'monospace'
        }).setOrigin(0.5);
    }

    _createButton(x, y, text, callback) {
        const btn = this.add.text(x, y, text, {
            fontSize: '22px', fill: '#d9eadf', fontFamily: 'monospace',
            padding: { left: 30, right: 30, top: 10, bottom: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        btn.on('pointerover', () => btn.setStyle({ fill: '#fff0b8' }));
        btn.on('pointerout', () => btn.setStyle({ fill: '#d9eadf' }));
        btn.on('pointerdown', callback);

        return btn;
    }
}
