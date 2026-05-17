class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
    }

    init(data) {
        this._monsterData = data.monsterData || Monster.pickForArea(GameState.currentMapId);
        this._npcData = data.npcData || null;
    }

    create() {
        this._combatOver = false;

        const result = CombatManager.init(this, this._monsterData);
        this._monster = result.monster;
        this._player = result.player;

        BattleUI.init(this);
        BattleUI.drawBattleScene(this._player, this._monster);

        this._showPlayerActions();

        CombatManager.startCombat();
        if (CombatManager.getPhase() === 'enemy_turn') {
            this._updateDisplay();
            BattleUI.showLog(CombatManager.getLog());
        }

        Events.on('battleAction', (action) => this._handleAction(action), this);
        Events.on('playerTurn', () => this._onPlayerTurn(), this);
        Events.on('combatEnd', (result) => this._onCombatEnd(result), this);
        Events.on('enemyAttacked', () => {
            this._animateEnemyAttack();
            this._updateDisplay();
            BattleUI.showLog(CombatManager.getLog());
        }, this);

        this.input.keyboard.on('keydown-ESC', () => {
            if (!this._combatOver && CombatManager.getPhase() === 'player_turn') {
                this._handleAction('flee');
            }
        });
    }

    _showPlayerActions() {
        BattleUI.showActions(this._player, GameState.playerLearnedTechniques);
        this._updateDisplay();
        BattleUI.showLog(CombatManager.getLog());
    }

    _handleAction(action) {
        if (this._combatOver) return;
        if (CombatManager.getPhase() !== 'player_turn') return;

        if (action === 'attack') {
            const r = CombatManager.playerAttack();
            this._animateAttack(false);
            this._updateDisplay();
            BattleUI.showLog(CombatManager.getLog());
        } else if (action === 'technique') {
            BattleUI.hideActions();
            BattleUI.showTechniqueMenu([], this._player);
        } else if (action === 'back') {
            BattleUI.hideTechniqueMenu();
            this._showPlayerActions();
        } else if (action.startsWith('technique_')) {
            const techId = action.replace('technique_', '');
            const r = CombatManager.playerTechnique(techId);
            BattleUI.hideTechniqueMenu();
            if (r && r.error) {
                BattleUI.showLog([...CombatManager.getLog(), r.error]);
            } else {
                this._animateAttack(true);
                this._updateDisplay();
                BattleUI.showLog(CombatManager.getLog());
            }
        } else if (action === 'item') {
            this._showItemMenu();
        } else if (action === 'flee') {
            CombatManager.playerFlee();
            this._updateDisplay();
            BattleUI.showLog(CombatManager.getLog());
        }
    }

    _showItemMenu() {
        BattleUI.hideActions();
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const pills = InventoryManager.getItemsByCategory('丹药').filter(inv => {
            const def = ItemDatabase.getItemById(inv.itemId);
            return def && def.type === 'heal';
        });

        let ty = h - 120;
        this._itemMenuElems = [];
        this._itemMenuElems.push(this.add.text(w / 2, ty, '使用丹药:', {
            fontSize: '13px', fill: '#aaffaa', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60));
        ty += 20;

        for (const inv of pills) {
            const def = ItemDatabase.getItemById(inv.itemId);
            const label = def.name + ' x' + inv.quantity;
            const btn = this.add.text(w / 2, ty, label, {
                fontSize: '12px', fill: '#aaffaa', fontFamily: 'monospace',
                padding: { left: 8, right: 8, top: 3, bottom: 3 }
            }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout', () => btn.setStyle({ fill: '#aaffaa' }));
            btn.on('pointerdown', () => {
                CombatManager.playerUseItem(inv.itemId);
                for (const e of this._itemMenuElems) { if (e && e.destroy) e.destroy(); }
                this._itemMenuElems = [];
                this._updateDisplay();
                BattleUI.showLog(CombatManager.getLog());
            });
            this._itemMenuElems.push(btn);
            ty += 20;
        }

        const back = this.add.text(w / 2, ty + 10, '返回', {
            fontSize: '12px', fill: '#888888', fontFamily: 'monospace',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => {
            for (const e of this._itemMenuElems) { if (e && e.destroy) e.destroy(); }
            this._itemMenuElems = [];
            this._showPlayerActions();
        });
        this._itemMenuElems.push(back);
    }

    _onPlayerTurn() {
        if (this._combatOver) return;
        BattleUI.hideActions();
        BattleUI.hideTechniqueMenu();
        this._showPlayerActions();
    }

    _animateAttack(isTechnique) {
        if (BattleUI._playerSprite) {
            BattleUI.shakeSprite(BattleUI._playerSprite, isTechnique ? 8 : 4, 200);
        }
        this.time.delayedCall(150, () => {
            if (BattleUI._monsterSprite) {
                BattleUI.flashSprite(BattleUI._monsterSprite, 0xff4444, 300);
            }
        });
    }

    _animateEnemyAttack() {
        if (BattleUI._monsterSprite) {
            BattleUI.shakeSprite(BattleUI._monsterSprite, 5, 200);
        }
        this.time.delayedCall(100, () => {
            if (BattleUI._playerSprite) {
                BattleUI.flashSprite(BattleUI._playerSprite, 0xff4444, 300);
            }
        });
    }

    _updateDisplay() {
        if (!this._monster || !this._monster.active) return;
        BattleUI.updateHP(this._player, this._monster);
    }

    _onCombatEnd(result) {
        this._combatOver = true;
        BattleUI.hideActions();
        BattleUI.hideTechniqueMenu();
        this._updateDisplay();
        BattleUI.showLog(CombatManager.getLog());
        BattleUI.showResult(result, () => { this._close(); });
        SaveManager.autoSave();
    }

    _close() {
        Events.off('battleAction', null, this);
        Events.off('playerTurn', null, this);
        Events.off('combatEnd', null, this);
        Events.off('enemyAttacked', null, this);
        CombatManager.destroy();
        BattleUI.destroy();
        if (this._itemMenuElems) {
            for (const e of this._itemMenuElems) { if (e && e.destroy) e.destroy(); }
        }
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
