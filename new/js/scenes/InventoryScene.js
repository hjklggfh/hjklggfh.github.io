class InventoryScene extends Phaser.Scene {
    constructor() {
        super({ key: 'InventoryScene' });
    }

    create() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        this._category = null;
        this._selectedItem = null;

        // Full-screen semi-transparent overlay
        this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55).setInteractive().setDepth(199);

        // Title
        this.add.text(w / 2, 12, '背包 & 角色', {
            fontSize: '18px', fill: '#ffcc00', fontFamily: 'monospace'
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(210);

        // Category tabs
        this._drawTabs();

        // Character panel (left side)
        this._charX = 150;
        this._charY = 310;
        this._drawCharacterPanel();

        // Inventory grid (right side)
        this._gridX = 520;
        this._gridY = 300;
        this._drawGrid();

        // Action area
        this._drawActions();

        // Input handlers
        this.input.keyboard.on('keydown-I', () => this._close());
        this.input.keyboard.on('keydown-ESC', () => this._close());

        // Listen for changes
        Events.on('inventoryChanged', () => this._refresh(), this);
        Events.on('equipmentChanged', () => this._refresh(), this);
    }

    _drawTabs() {
        const categories = [null, '功法', '丹药', '符箓', '装备'];
        const labels = ['全部', '功法', '丹药', '符箓', '装备'];
        const tabW = 80;
        const startX = 160;

        if (this._tabElements) {
            for (const e of this._tabElements) e.destroy();
        }
        this._tabElements = [];

        for (let i = 0; i < categories.length; i++) {
            const tx = startX + i * (tabW + 8);
            const isActive = this._category === categories[i];
            const tab = this.add.text(tx, 38, labels[i], {
                fontSize: '12px',
                fill: isActive ? '#ffcc00' : '#888888',
                fontFamily: 'monospace',
                padding: { left: 6, right: 6, top: 3, bottom: 3 }
            }).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });

            tab.on('pointerdown', () => {
                this._category = categories[i];
                this._selectedItem = null;
                this._drawTabs();
                this._drawGrid();
                this._drawActions();
            });
            tab.on('pointerover', () => { if (!isActive) tab.setStyle({ fill: '#cccccc' }); });
            tab.on('pointerout', () => { if (!isActive) tab.setStyle({ fill: '#888888' }); });

            this._tabElements.push(tab);
        }
    }

    _drawCharacterPanel() {
        if (this._charElements) {
            for (const e of this._charElements) e.destroy();
        }
        this._charElements = [];
        CharacterPanel.render(this, this._charX, this._charY, {
            onUnequip: () => this._refresh()
        });
        this._charElements = CharacterPanel._elements.slice();
    }

    _drawGrid() {
        if (this._gridElements) {
            for (const e of this._gridElements) e.destroy();
        }
        this._gridElements = [];

        InventoryGrid.render(this, this._gridX, this._gridY, {
            cols: 6,
            slotSize: 38,
            category: this._category,
            onSelect: (item) => {
                this._selectedItem = item;
                this._drawActions();
            }
        });
        this._gridElements = InventoryGrid._elements.slice();
    }

    _drawActions() {
        if (this._actionElements) {
            for (const e of this._actionElements) e.destroy();
        }
        this._actionElements = [];

        const item = this._selectedItem;
        const y = 540;

        // Item detail
        if (item && item.definition) {
            const def = item.definition;
            const qColor = GameConstants.QUALITY_COLORS[def.quality] || '#aaaaaa';
            let detail = def.name + ' [' + def.quality + ']';
            if (def.description) detail += '\n' + def.description;
            if (def.damage) detail += '\n伤害: ' + def.damage;
            if (def.statBonus) {
                for (const k in def.statBonus) {
                    detail += '\n' + ({ atk: '攻击', def: '防御', hp: '气血', spd: '速度' }[k] || k) + ' +' + def.statBonus[k];
                }
            }
            if (def.slot) detail += '\n槽位: ' + ({ weapon: '武器', armor: '防具', accessory: '饰品' }[def.slot] || def.slot);

            const detailText = this.add.text(160, y - 40, detail, {
                fontSize: '10px', fill: qColor, fontFamily: 'monospace', lineSpacing: 3
            }).setScrollFactor(0).setDepth(210);
            this._actionElements.push(detailText);

            // Action buttons
            let btnX = 420;

            // Learn button (for techniques)
            if (def.category === 'technique' && def.damage) {
                const canLearn = !GameState.playerLearnedTechniques.includes(item.itemId);
                const rankIdx = CultivationData.rankOrder.indexOf(GameState.playerRank);
                const reqIdx = CultivationData.rankOrder.indexOf(def.requiredRank);
                const rankOk = rankIdx >= reqIdx;
                const learnLabel = !canLearn ? '已学' : (!rankOk ? '(境界不足)' : '学习');
                const learnColor = !canLearn ? '#888888' : (!rankOk ? '#664444' : '#44aaff');
                const learnBtn = this.add.text(btnX, y, learnLabel, {
                    fontSize: '13px', fill: learnColor, fontFamily: 'monospace',
                    padding: { left: 10, right: 10, top: 4, bottom: 4 }
                }).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: canLearn && rankOk });
                if (canLearn && rankOk) {
                    learnBtn.on('pointerdown', () => {
                        GameState.playerLearnedTechniques.push(item.itemId);
                        Notification.show(this, '学会了 ' + def.name + '！');
                        this._refresh();
                    });
                }
                learnBtn.on('pointerover', () => { if (canLearn && rankOk) learnBtn.setStyle({ fill: '#ffffff' }); });
                learnBtn.on('pointerout', () => { if (canLearn && rankOk) learnBtn.setStyle({ fill: learnColor }); });
                this._actionElements.push(learnBtn);
                btnX += 70;
            }

            // Equip/Unequip button (for equipment)
            if (def.slot) {
                const canEquip = InventoryManager.canEquip(item.itemId);
                const isEquipped = item.equipped;
                const btnLabel = isEquipped ? '卸下' : (canEquip ? '装备' : '(境界不足)');
                const btnColor = isEquipped ? '#ff8888' : (canEquip ? '#44ff44' : '#664444');

                const eqBtn = this.add.text(btnX, y, btnLabel, {
                    fontSize: '13px', fill: btnColor, fontFamily: 'monospace',
                    padding: { left: 10, right: 10, top: 4, bottom: 4 }
                }).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: canEquip || isEquipped });

                if (canEquip || isEquipped) {
                    eqBtn.on('pointerdown', () => {
                        if (isEquipped) {
                            InventoryManager.unequipItem(item.itemId);
                        } else {
                            InventoryManager.equipItem(item.itemId);
                        }
                    });
                }
                eqBtn.on('pointerover', () => eqBtn.setStyle({ fill: '#ffffff' }));
                eqBtn.on('pointerout', () => eqBtn.setStyle({ fill: btnColor }));
                this._actionElements.push(eqBtn);
                btnX += 80;
            }

            // Use button (for pills and talismans)
            if (def.category === 'pill' || def.category === 'talisman') {
                const useBtn = this.add.text(btnX, y, '使用', {
                    fontSize: '13px', fill: '#44ff88', fontFamily: 'monospace',
                    padding: { left: 10, right: 10, top: 4, bottom: 4 }
                }).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });

                useBtn.on('pointerdown', () => {
                    InventoryManager.useItem(item.itemId);
                    this._selectedItem = null;
                    this._refresh();
                });
                useBtn.on('pointerover', () => useBtn.setStyle({ fill: '#ffffff' }));
                useBtn.on('pointerout', () => useBtn.setStyle({ fill: '#44ff88' }));
                this._actionElements.push(useBtn);
                btnX += 70;
            }

            // Drop button
            const dropBtn = this.add.text(btnX, y, '丢弃', {
                fontSize: '13px', fill: '#ff4444', fontFamily: 'monospace',
                padding: { left: 10, right: 10, top: 4, bottom: 4 }
            }).setScrollFactor(0).setDepth(210).setInteractive({ useHandCursor: true });

            dropBtn.on('pointerdown', () => {
                const qty = item.quantity > 1 ? 1 : 1;
                InventoryManager.dropItem(item.itemId, qty);
                this._selectedItem = null;
                this._refresh();
            });
            dropBtn.on('pointerover', () => dropBtn.setStyle({ fill: '#ff8888' }));
            dropBtn.on('pointerout', () => dropBtn.setStyle({ fill: '#ff4444' }));
            this._actionElements.push(dropBtn);
        } else {
            const hint = this.add.text(400, y - 10, '点击物品查看详情和操作', {
                fontSize: '11px', fill: '#555566', fontFamily: 'monospace'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(210);
            this._actionElements.push(hint);
        }

        // Close hints
        this._actionElements.push(
            this.add.text(760, 580, 'I/ESC 关闭', {
                fontSize: '9px', fill: '#444455', fontFamily: 'monospace'
            }).setOrigin(1, 1).setScrollFactor(0).setDepth(210)
        );
    }

    _refresh() {
        // Re-draw tab bar
        this._drawTabs();
        // Redraw character panel
        this._drawCharacterPanel();
        // Redraw grid
        this._drawGrid();
        // Redraw actions (clear selection)
        this._selectedItem = InventoryGrid.getSelectedItem();
        this._drawActions();
    }

    _close() {
        Events.off('inventoryChanged', null, this);
        Events.off('equipmentChanged', null, this);
        if (this._tabElements) { for (const e of this._tabElements) e.destroy(); this._tabElements = []; }
        if (this._charElements) { for (const e of this._charElements) e.destroy(); this._charElements = []; }
        if (this._gridElements) { for (const e of this._gridElements) e.destroy(); this._gridElements = []; }
        if (this._actionElements) { for (const e of this._actionElements) e.destroy(); this._actionElements = []; }
        InventoryGrid.clear();
        CharacterPanel.clear();
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
