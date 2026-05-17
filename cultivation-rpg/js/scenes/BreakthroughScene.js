class BreakthroughScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BreakthroughScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this._resolved = false;

        // Overlay
        this.add.rectangle(w / 2, h / 2, w, h, 0x000022, 0.85).setDepth(50);

        // Title
        const nextRank = CultivationData.getNextRank(GameState.playerRank);
        this.add.text(w / 2, 60, '突破 ' + (nextRank || '???'), {
            fontSize: '24px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60);

        // Current rank
        this.add.text(w / 2, 95, GameState.playerRank + ' → ' + (nextRank || '已满'), {
            fontSize: '14px', fill: '#aaaacc', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60);

        // Qi info
        const nextData = nextRank ? CultivationData.getRankData(nextRank) : null;
        const qiText = nextData ? '当前灵力: ' + GameState.playerQi + ' / 需要: ' + nextData.qiRequired : '已达最高境界';
        this.add.text(w / 2, 120, qiText, {
            fontSize: '12px', fill: '#aaddff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60);

        // Success rate (include pill bonus in display)
        this._pillBonus = 0;
        const pills = GameState.inventory.filter(inv => {
            const def = ItemDatabase.getItemById(inv.itemId);
            return def && def.category === 'pill' && def.type === 'breakthrough';
        });
        if (pills.length > 0) {
            const pill = ItemDatabase.getItemById(pills[0].itemId);
            this._pillBonus = pill.bonus || 0;
        }
        const baseChance = this._getBreakthroughChance();
        const displayChance = baseChance + this._pillBonus;
        const chancePct = Math.floor(Math.min(0.95, displayChance) * 100);
        const chanceColor = chancePct >= 70 ? '#44ff44' : chancePct >= 40 ? '#ffaa44' : '#ff4444';
        this.add.text(w / 2, 145, '成功率: ' + chancePct + '%', {
            fontSize: '16px', fill: chanceColor, fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60);

        // Warning
        if (chancePct < 50) {
            this.add.text(w / 2, 170, '⚠ 突破失败可能损失灵力', {
                fontSize: '11px', fill: '#ff8888', fontFamily: 'monospace'
            }).setOrigin(0.5).setDepth(60);
        }

        // Breakthrough pills available
        if (pills.length > 0) {
            const pill = ItemDatabase.getItemById(pills[0].itemId);
            this.add.text(w / 2, 195, '可用突破丹: ' + pill.name + ' (+' + Math.floor(this._pillBonus * 100) + '%)', {
                fontSize: '11px', fill: '#ffcc44', fontFamily: 'monospace'
            }).setOrigin(0.5).setDepth(60);
        }

        // Attempt button
        const canAttempt = CultivationSystem.canBreakthrough();
        const btnY = 250;
        if (canAttempt) {
            const btn = this.add.text(w / 2, btnY, '开始突破', {
                fontSize: '20px', fill: '#ffcc00', fontFamily: 'monospace',
                padding: { left: 30, right: 30, top: 10, bottom: 10 }
            }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout', () => btn.setStyle({ fill: '#ffcc00' }));
            btn.on('pointerdown', () => this._doBreakthrough());
        } else {
            this.add.text(w / 2, btnY, '灵力不足，无法突破', {
                fontSize: '14px', fill: '#888888', fontFamily: 'monospace'
            }).setOrigin(0.5).setDepth(60);
        }

        // Close button
        const closeBtn = this.add.text(w / 2, btnY + 50, '返回', {
            fontSize: '14px', fill: '#888888', fontFamily: 'monospace',
            padding: { left: 15, right: 15, top: 5, bottom: 5 }
        }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });

        closeBtn.on('pointerdown', () => this._close());
        closeBtn.on('pointerover', () => closeBtn.setStyle({ fill: '#ffffff' }));

        this.input.keyboard.on('keydown-ESC', () => this._close());
    }

    _getBreakthroughChance() {
        return CultivationSystem.getBreakthroughChance();
    }

    _doBreakthrough() {
        if (this._resolved) return;
        this._resolved = true;

        // Remove all UI
        this.children.removeAll(true);

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this.add.rectangle(w / 2, h / 2, w, h, 0x000022, 0.85).setDepth(50);

        // Dramatic pause + animation
        this.add.text(w / 2, h / 2 - 40, '突破中...', {
            fontSize: '22px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60);

        // Pulse effect
        const pulse = this.add.circle(w / 2, h / 2, 10, 0x4488ff, 0.5).setDepth(55);
        this.tweens.add({
            targets: pulse, scaleX: 20, scaleY: 20, alpha: 0,
            duration: 2000, ease: 'Power2'
        });

        this.time.delayedCall(1800, () => {
            const result = CultivationSystem.attemptBreakthrough(this._pillBonus);
            this.children.removeAll(true);
            this.add.rectangle(w / 2, h / 2, w, h, 0x000022, 0.85).setDepth(50);

            if (result.success) {
                this.add.text(w / 2, h / 2 - 30, '突破成功！', {
                    fontSize: '32px', fill: '#ffcc00', fontFamily: 'monospace'
                }).setOrigin(0.5).setDepth(60);
                this.add.text(w / 2, h / 2 + 15, '境界提升至 ' + result.newRank, {
                    fontSize: '18px', fill: '#44ff88', fontFamily: 'monospace'
                }).setOrigin(0.5).setDepth(60);
                Notification.show(this, '突破成功！晋升 ' + result.newRank + '！');
            } else {
                this.add.text(w / 2, h / 2 - 30, '突破失败', {
                    fontSize: '32px', fill: '#ff4444', fontFamily: 'monospace'
                }).setOrigin(0.5).setDepth(60);
                this.add.text(w / 2, h / 2 + 15, '损失灵力: ' + result.qiLoss, {
                    fontSize: '16px', fill: '#ff8888', fontFamily: 'monospace'
                }).setOrigin(0.5).setDepth(60);
                Notification.show(this, '突破失败...损失' + result.qiLoss + '灵力');
            }

            this.time.delayedCall(2500, () => this._close());
        });
    }

    _close() {
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
