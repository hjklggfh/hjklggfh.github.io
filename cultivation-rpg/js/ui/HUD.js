const HUD = {
    init(scene) {
        this.scene = scene;
        this.bg = scene.add.rectangle(106, 47, 196, 76, 0x17322c, 0.72)
            .setStrokeStyle(1, 0x8ed3b0, 0.7).setScrollFactor(0).setDepth(99);
        this.rankText = scene.add.text(16, 12, '', {
            fontSize: '14px', fill: '#fff0b8', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.hpText = scene.add.text(16, 30, '', {
            fontSize: '11px', fill: '#ff9a8a', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.qiText = scene.add.text(16, 44, '', {
            fontSize: '11px', fill: '#8bd3ff', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.goldText = scene.add.text(16, 58, '', {
            fontSize: '11px', fill: '#fff0b8', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.update();
    },

    update() {
        if (!this.scene) return;
        const nextRank = CultivationData.getNextRank(GameState.playerRank);
        const nextData = nextRank ? CultivationData.getRankData(nextRank) : null;

        this.rankText.setText('境界: ' + GameState.playerRank);
        this.hpText.setText('气血: ' + GameState.currentHP + '/' + GameState.maxHP);
        this.qiText.setText('灵力: ' + GameState.playerQi + (nextData ? ' / ' + nextData.qiRequired : ' (已满)'));
        this.goldText.setText('灵石: ' + GameState.playerGold);
    }
};
