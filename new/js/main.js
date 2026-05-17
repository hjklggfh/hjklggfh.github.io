window.addEventListener('DOMContentLoaded', () => {
    const config = {
        type: Phaser.AUTO,
        width: GameConstants.GAME_WIDTH,
        height: GameConstants.GAME_HEIGHT,
        parent: 'game-container',
        pixelArt: true,
        roundPixels: true,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 0 },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [
            BootScene,
            MenuScene,
            GameScene,
            BattleScene,
            DialogueScene,
            InventoryScene,
            MarketplaceScene,
            BreakthroughScene,
            TeleportScene,
            CaveInteriorScene
        ]
    };

    const game = new Phaser.Game(config);
});
