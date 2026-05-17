class MarketplaceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MarketplaceScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this._mode = 'buy'; // 'buy' or 'sell'

        // Overlay
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55).setInteractive().setDepth(199);

        // Title
        this.add.text(w / 2, 12, '集市', {
            fontSize: '18px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(210);

        // Gold display
        this._goldText = this.add.text(w - 16, 14, '灵石: ' + GameState.playerGold, {
            fontSize: '13px', fill: '#ffcc44', fontFamily: 'monospace'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(210);

        // Mode tabs
        this._drawTabs();

        // Generate shop inventory
        MarketManager.generateShopInventory('default');

        // Draw panels
        this._drawPanels();

        // Notification text
        this._notifyText = this.add.text(w / 2, h - 18, '', {
            fontSize: '11px', fill: '#ffcc44', fontFamily: 'monospace'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(210);

        // Input
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-TAB', () => {
            this._mode = this._mode === 'buy' ? 'sell' : 'buy';
            this._drawTabs();
            this._drawPanels();
        });
    }

    _drawTabs() {
        if (this._tabElems) { for (const e of this._tabElems) e.destroy(); }
        this._tabElems = [];

        const tabs = [
            { mode: 'buy', label: '购买', x: 260 },
            { mode: 'sell', label: '出售', x: 540 }
        ];

        for (const t of tabs) {
            const isActive = this._mode === t.mode;
            const txt = this.add.text(t.x, 38, t.label, {
                fontSize: '14px',
                fill: isActive ? '#ffcc00' : '#888888',
                fontFamily: 'monospace',
                padding: { left: 10, right: 10, top: 4, bottom: 4 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });

            txt.on('pointerdown', () => {
                this._mode = t.mode;
                this._drawTabs();
                this._drawPanels();
            });
            txt.on('pointerover', () => { if (!isActive) txt.setStyle({ fill: '#cccccc' }); });
            txt.on('pointerout', () => { if (!isActive) txt.setStyle({ fill: '#888888' }); });

            this._tabElems.push(txt);
        }
    }

    _drawPanels() {
        MarketPanel.clear();
        if (this._panelLabel) { this._panelLabel.destroy(); }

        if (this._mode === 'buy') {
            // Shop items on left
            const shopItems = MarketManager.getShopInventory();
            this._panelLabel = this.add.text(140, 60, '商店商品', {
                fontSize: '12px', fill: '#aaaacc', fontFamily: 'monospace'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(210);

            MarketPanel.render(this, shopItems, 140, 340, {
                mode: 'buy',
                onAction: (itemId) => {
                    const r = MarketManager.buyItem(itemId);
                    if (r.error) {
                        this._showNotify(r.error);
                    } else {
                        this._showNotify('购买成功: ' + r.item.name);
                        this._goldText.setText('灵石: ' + GameState.playerGold);
                        this._drawPanels();
                    }
                }
            });

            // Sellable inventory on right
            const sellItems = MarketManager.getSellableInventory();
            this.add.text(660, 60, '我的背包', {
                fontSize: '12px', fill: '#aaaacc', fontFamily: 'monospace'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(210);

            if (sellItems.length > 0) {
                MarketPanel.render(this, sellItems.slice(0, 14), 660, 340, {
                    mode: 'sell',
                    onAction: (itemId) => {
                        const r = MarketManager.sellItem(itemId);
                        if (r.error) {
                            this._showNotify(r.error);
                        } else {
                            this._showNotify('出售: ' + r.name + ' +' + r.price + '灵石');
                            this._goldText.setText('灵石: ' + GameState.playerGold);
                            this._drawPanels();
                        }
                    }
                });
            } else {
                this.add.text(660, 340, '(无可出售物品)', {
                    fontSize: '11px', fill: '#555555', fontFamily: 'monospace'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(210);
            }
        } else {
            // Sell mode: show player inventory on left
            const sellItems = MarketManager.getSellableInventory();
            this._panelLabel = this.add.text(400, 60, '选择要出售的物品', {
                fontSize: '12px', fill: '#aaaacc', fontFamily: 'monospace'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(210);

            if (sellItems.length > 0) {
                MarketPanel.render(this, sellItems, 400, 340, {
                    mode: 'sell',
                    onAction: (itemId) => {
                        const r = MarketManager.sellItem(itemId);
                        if (r.error) {
                            this._showNotify(r.error);
                        } else {
                            this._showNotify('出售: ' + r.name + ' +' + r.price + '灵石');
                            this._goldText.setText('灵石: ' + GameState.playerGold);
                            this._drawPanels();
                        }
                    }
                });
            } else {
                this.add.text(400, 340, '(无可出售物品)', {
                    fontSize: '11px', fill: '#555555', fontFamily: 'monospace'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(210);
            }
        }

        // Hints
        this.add.text(780, 582, 'TAB切换 ESC关闭', {
            fontSize: '9px', fill: '#444455', fontFamily: 'monospace'
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(210);
    }

    _showNotify(text) {
        this._notifyText.setText(text);
        this._notifyText.setAlpha(1);
        this.time.delayedCall(2000, () => {
            this.tweens.add({ targets: this._notifyText, alpha: 0, duration: 500 });
        });
    }

    _close() {
        MarketPanel.clear();
        if (this._tabElems) { for (const e of this._tabElems) e.destroy(); }
        if (this._panelLabel) this._panelLabel.destroy();
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
