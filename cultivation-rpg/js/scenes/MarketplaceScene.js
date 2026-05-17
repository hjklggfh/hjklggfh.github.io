class MarketplaceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MarketplaceScene' });
    }

    init(data) {
        data = data || {};
        this._town = data.town || null;
        this._npc = data.npcData || null;
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this._mode = 'buy'; // 'buy' or 'sell'
        this._panelExtras = [];

        // Overlay
        this.add.rectangle(w / 2, h / 2, w, h, 0x15231f, 0.78).setInteractive().setDepth(199);

        // Title
        const title = this._town ? this._town.name : (this._npc ? this._npc.name + '的行囊' : '城镇据点');
        this.add.text(w / 2, 12, title, {
            fontSize: '18px', fill: '#fff0b8', fontFamily: 'monospace',
            stroke: '#243b36', strokeThickness: 2
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(210);

        // Gold display
        this._goldText = this.add.text(w - 16, 14, '灵石: ' + GameState.playerGold, {
            fontSize: '13px', fill: '#ffcc44', fontFamily: 'monospace'
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(210);

        // Mode tabs
        this._drawTabs();

        // Generate shop inventory
        MarketManager.generateShopInventory(this._town ? this._town.id : 'default', this._npc ? this._npc.tradeTags : null);

        // Draw panels
        this._drawPanels();

        // Notification text
        this._notifyText = this.add.text(w / 2, h - 18, '', {
            fontSize: '11px', fill: '#ffcc44', fontFamily: 'monospace'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(210);

        // Input
        this.input.keyboard.on('keydown-ESC', () => this._close());
        this.input.keyboard.on('keydown-TAB', () => {
            const modes = ['buy', 'sell', 'rest', 'rumor'];
            this._mode = modes[(modes.indexOf(this._mode) + 1) % modes.length];
            this._drawTabs();
            this._drawPanels();
        });
    }

    _drawTabs() {
        if (this._tabElems) { for (const e of this._tabElems) e.destroy(); }
        this._tabElems = [];

        const tabs = [
            { mode: 'buy', label: '购买', x: 260 },
            { mode: 'sell', label: '出售', x: 400 },
            { mode: 'rest', label: '休息闭关', x: 540 },
            { mode: 'rumor', label: '打探消息', x: 680 }
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
        if (this._panelExtras) {
            for (const e of this._panelExtras) { if (e && e.destroy) e.destroy(); }
        }
        this._panelExtras = [];

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
            this._panelExtras.push(this.add.text(660, 60, '我的背包', {
                fontSize: '12px', fill: '#aaaacc', fontFamily: 'monospace'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(210));

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
                this._panelExtras.push(this.add.text(660, 340, '(无可出售物品)', {
                    fontSize: '11px', fill: '#555555', fontFamily: 'monospace'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(210));
            }
        } else if (this._mode === 'sell') {
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
                this._panelExtras.push(this.add.text(400, 340, '(无可出售物品)', {
                    fontSize: '11px', fill: '#555555', fontFamily: 'monospace'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(210));
            }
        } else if (this._mode === 'rest') {
            this._drawTownService('rest');
        } else if (this._mode === 'rumor') {
            this._drawTownService('rumor');
        }

        // Hints
        this._panelExtras.push(this.add.text(780, 582, 'TAB切换 ESC关闭', {
            fontSize: '9px', fill: '#444455', fontFamily: 'monospace'
        }).setOrigin(1, 1).setScrollFactor(0).setDepth(210));
    }

    _showNotify(text) {
        this._notifyText.setText(text);
        this._notifyText.setAlpha(1);
        this.time.delayedCall(2000, () => {
            this.tweens.add({ targets: this._notifyText, alpha: 0, duration: 500 });
        });
    }

    _drawTownService(mode) {
        const w = this.cameras.main.width;
        const centerX = w / 2;
        const panel = this.add.rectangle(centerX, 315, 520, 330, 0x20352f, 0.94)
            .setStrokeStyle(1, 0xfff0b8).setScrollFactor(0).setDepth(210);
        MarketPanel._elems.push(panel);

        if (mode === 'rest') {
            const cost = 80 + CultivationData.rankOrder.indexOf(GameState.playerRank) * 120;
            const lines = [
                '客栈、静室与灵泉都可使用。',
                '休息：恢复全部气血。',
                '闭关：获得少量灵力，并有机会领悟已携带功法。'
            ];
            for (let i = 0; i < lines.length; i++) {
                MarketPanel._elems.push(this.add.text(centerX, 205 + i * 24, lines[i], {
                    fontSize: '13px', fill: '#d9eadf', fontFamily: 'monospace'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(211));
            }
            const btn = this.add.text(centerX, 330, '支付 ' + cost + ' 灵石并闭关', {
                fontSize: '15px', fill: '#9bffd0', fontFamily: 'monospace',
                padding: { left: 18, right: 18, top: 7, bottom: 7 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(211).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => {
                if (GameState.playerGold < cost) {
                    this._showNotify('灵石不足');
                    return;
                }
                GameState.playerGold -= cost;
                const stats = CultivationData.getEffectiveStats();
                GameState.maxHP = stats.hp;
                GameState.currentHP = stats.hp;
                const qiGain = 120 + CultivationData.rankOrder.indexOf(GameState.playerRank) * 90 + RandomUtils.intBetween(0, 80);
                CultivationSystem.gainQi(qiGain);
                this._goldText.setText('灵石: ' + GameState.playerGold);
                this._showNotify('闭关完成，恢复气血并获得 ' + qiGain + ' 灵力');
                SaveManager.autoSave();
            });
            MarketPanel._elems.push(btn);
        } else {
            const rumors = [
                '山脚与林缘常有洞府入口，入口灵光很淡，需要靠近才明显。',
                '森林可采到炼丹、制符材料，但妖兽也更容易袭击。',
                '大河和山脉皆为天然屏障，传送阵是跨区通行的稳定方式。',
                '洞府只可完整探索一次，宝箱开启后旧禁制会闭合。',
                'NPC修为越高，切磋奖励越好，但战力也会按大境界跃升。'
            ];
            const rumor = RandomUtils.pick(rumors);
            MarketPanel._elems.push(this.add.text(centerX, 235, rumor, {
                fontSize: '14px', fill: '#fff0b8', fontFamily: 'monospace',
                wordWrap: { width: 440 }, lineSpacing: 7
            }).setOrigin(0.5).setScrollFactor(0).setDepth(211));
            const btn = this.add.text(centerX, 380, '记录传闻', {
                fontSize: '14px', fill: '#9bffd0', fontFamily: 'monospace',
                padding: { left: 18, right: 18, top: 6, bottom: 6 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(211).setInteractive({ useHandCursor: true });
            btn.on('pointerdown', () => this._showNotify('已记录：' + rumor.slice(0, 18) + '...'));
            MarketPanel._elems.push(btn);
        }
    }

    _close() {
        MarketPanel.clear();
        if (this._tabElems) { for (const e of this._tabElems) e.destroy(); }
        if (this._panelLabel) this._panelLabel.destroy();
        if (this._panelExtras) { for (const e of this._panelExtras) { if (e && e.destroy) e.destroy(); } }
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
