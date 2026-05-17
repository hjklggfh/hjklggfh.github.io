const HUD = {
    init(scene) {
        this.scene = scene;
        this.rankText = scene.add.text(10, 10, '', {
            fontSize: '14px', fill: '#fff', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.hpText = scene.add.text(10, 28, '', {
            fontSize: '11px', fill: '#f88', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.qiText = scene.add.text(10, 42, '', {
            fontSize: '11px', fill: '#aaf', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(100);
        this.goldText = scene.add.text(10, 56, '', {
            fontSize: '11px', fill: '#ff0', fontFamily: 'monospace'
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
