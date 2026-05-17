const BattleUI = {
    _scene: null,
    _elems: [],
    _hpBars: {},
    _actionBtns: [],
    _techBtns: [],
    _logTexts: [],

    init(scene) {
        this._scene = scene;
        this._elems = [];
        this._hpBars = {};
        this._actionBtns = [];
        this._techBtns = [];
        this._logTexts = [];
    },

    drawBattleScene(player, monster) {
        const w = this._scene.cameras.main.width;
        const h = this._scene.cameras.main.height;
        const E = this._elems;

        // Dark overlay
        E.push(this._scene.add.rectangle(w / 2, h / 2, w, h, 0x000022, 0.85).setDepth(50));

        // --- Player side (left) ---
        const px = 180, py = 250;
        E.push(this._scene.add.rectangle(px, py, 130, 160, 0x222244, 0.8).setStrokeStyle(1, 0x4488ff).setDepth(55));
        const pSprite = this._scene.add.image(px, py - 15, 'player', 0).setScale(2.2).setDepth(56);
        E.push(pSprite);
        this._playerSprite = pSprite;
        E.push(this._scene.add.text(px, py + 55, player.name, {
            fontSize: '12px', fill: '#aaddff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));

        // Player HP bar
        const hpBarY = py + 70;
        this._drawBar(px, hpBarY, 100, 8, player.hp, player.maxHP, 'hp', '#44cc44', '#cc4444');
        E.push(this._scene.add.text(px, hpBarY + 10, 'HP:' + player.hp + '/' + player.maxHP, {
            fontSize: '9px', fill: '#cccccc', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));

        // Player Qi bar (blue, below HP)
        const qiBarY = hpBarY + 18;
        const maxQi = GameState.playerQi > 0 ? (CultivationData.getRankData(CultivationData.getNextRank(GameState.playerRank) || GameState.playerRank).qiRequired || 100) : 100;
        this._drawBar(px, qiBarY, 100, 6, player.qi, Math.max(player.qi, maxQi), 'qi', '#4488ff', '#334466');
        E.push(this._scene.add.text(px, qiBarY + 8, '灵:' + player.qi, {
            fontSize: '9px', fill: '#88aaff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));

        // --- VS ---
        E.push(this._scene.add.text(w / 2, py, 'VS', {
            fontSize: '22px', fill: '#ff4444', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));

        // --- Monster side (right) ---
        const mx = 620, my = 250;
        E.push(this._scene.add.rectangle(mx, my, 140, 160, 0x442222, 0.8).setStrokeStyle(1, 0xcc4444).setDepth(55));
        const mSprite = this._scene.add.image(mx, my - 15, 'monster', 0).setScale(2.5).setDepth(56);
        E.push(mSprite);
        this._monsterSprite = mSprite;
        E.push(this._scene.add.text(mx, my + 55, monster.getStats().name, {
            fontSize: '12px', fill: '#ffaaaa', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));

        // Monster HP bar
        this._drawBar(mx, my + 70, 110, 8, monster.currentHP, monster.maxHP, 'mhp', '#44cc44', '#cc4444');
        E.push(this._scene.add.text(mx, my + 70 + 10, 'HP:' + monster.currentHP + '/' + monster.maxHP, {
            fontSize: '9px', fill: '#cccccc', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));
    },

    _drawBar(cx, cy, width, height, current, max, key, fillColor, bgColor) {
        const E = this._elems;
        const bg = this._scene.add.rectangle(cx, cy, width, height, bgColor || 0x333333).setDepth(56);
        E.push(bg);
        const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
        const barW = Math.max(0, width * pct);
        const fill = this._scene.add.rectangle(cx - width / 2 + barW / 2, cy, barW, height - 2,
            fillColor || 0x44cc44).setDepth(57);
        E.push(fill);
        this._hpBars[key] = { bg, fill, cx, cy, width, height, fillColor, bgColor };
    },

    _updateBar(key, current, max) {
        const bar = this._hpBars[key];
        if (!bar || !bar.fill || !bar.fill.active) return;
        const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
        const barW = Math.max(0, bar.width * pct);
        bar.fill.setPosition(bar.cx - bar.width / 2 + barW / 2, bar.cy);
        bar.fill.setSize(barW, bar.height - 2);
        // Color shift based on HP%
        if (key.startsWith('hp') || key.startsWith('mhp')) {
            const color = pct > 0.5 ? 0x44cc44 : pct > 0.25 ? 0xccaa44 : 0xcc4444;
            bar.fill.setFillStyle(color);
        }
    },

    showActions(player, techniques) {
        this.hideActions();
        const w = this._scene.cameras.main.width;
        const h = this._scene.cameras.main.height;
        const btnY = h - 50;
        const buttons = [
            { label: '攻击', color: '#ff8844', action: 'attack' },
            { label: '功法', color: '#4488ff', action: 'technique' },
            { label: '物品', color: '#44ff88', action: 'item' },
            { label: '逃跑', color: '#888888', action: 'flee' }
        ];

        let bx = w / 2 - 170;
        for (const b of buttons) {
            const btn = this._scene.add.text(bx, btnY, b.label, {
                fontSize: '14px', fill: b.color, fontFamily: 'monospace',
                padding: { left: 12, right: 12, top: 5, bottom: 5 }
            }).setOrigin(0, 0.5).setDepth(60).setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout', () => btn.setStyle({ fill: b.color }));
            btn.on('pointerdown', () => Events.emit('battleAction', b.action));

            this._elems.push(btn);
            this._actionBtns.push(btn);
            bx += 85;
        }
    },

    showTechniqueMenu(techniques, player) {
        this.hideActions();
        this.hideTechniqueMenu();
        const w = this._scene.cameras.main.width;
        const h = this._scene.cameras.main.height;

        let ty = h - 130;
        this._elems.push(this._scene.add.text(w / 2, ty, '选择功法:', {
            fontSize: '13px', fill: '#aaccff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(60));
        ty += 22;

        const techIds = GameState.playerLearnedTechniques.length > 0
            ? GameState.playerLearnedTechniques : ['fire_palm'];

        for (const tid of techIds) {
            const tech = ItemDatabase.getItemById(tid);
            if (!tech || tech.category !== 'technique') continue;
            const canUse = player.qi >= tech.qiCost;
            const label = tech.name + ' (' + tech.qiCost + '灵)';
            const btn = this._scene.add.text(w / 2, ty, label, {
                fontSize: '12px', fill: canUse ? '#aaddff' : '#555555', fontFamily: 'monospace',
                padding: { left: 8, right: 8, top: 3, bottom: 3 }
            }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: canUse });

            if (canUse) {
                btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
                btn.on('pointerout', () => btn.setStyle({ fill: '#aaddff' }));
                btn.on('pointerdown', () => Events.emit('battleAction', 'technique_' + tid));
            }
            this._elems.push(btn);
            this._techBtns.push(btn);
            ty += 22;
        }

        // Back
        const back = this._scene.add.text(w / 2, ty + 8, '← 返回', {
            fontSize: '12px', fill: '#888888', fontFamily: 'monospace',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(0.5).setDepth(60).setInteractive({ useHandCursor: true });
        back.on('pointerdown', () => {
            this.hideTechniqueMenu();
            Events.emit('battleAction', 'back');
        });
        this._elems.push(back);
        this._techBtns.push(back);
    },

    hideActions() {
        for (const b of this._actionBtns) { if (b && b.active) b.destroy(); }
        this._actionBtns = [];
    },

    hideTechniqueMenu() {
        for (const b of this._techBtns) { if (b && b.active) b.destroy(); }
        this._techBtns = [];
    },

    updateHP(player, monster) {
        this._updateBar('hp', player.hp, player.maxHP);
        this._updateBar('qi', player.qi, Math.max(player.qi,
            (CultivationData.getRankData(CultivationData.getNextRank(GameState.playerRank) || GameState.playerRank) || {}).qiRequired || 100));
        if (monster && monster.active) {
            this._updateBar('mhp', monster.currentHP, monster.maxHP);
        }
        // Update HP text labels (destroy and recreate near bars)
        this._refreshHPLabels(player, monster);
    },

    _refreshHPLabels(player, monster) {
        if (this._hpLabelTexts) {
            for (const t of this._hpLabelTexts) { if (t && t.active) t.destroy(); }
        }
        this._hpLabelTexts = [];
        const px = 180, py = 250;
        this._hpLabelTexts.push(this._scene.add.text(px, py + 80, 'HP:' + player.hp + '/' + player.maxHP, {
            fontSize: '9px', fill: '#cccccc', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));
        this._hpLabelTexts.push(this._scene.add.text(px, py + 96, '灵:' + player.qi, {
            fontSize: '9px', fill: '#88aaff', fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(56));
        if (monster && monster.active) {
            const mx = 620, my = 250;
            this._hpLabelTexts.push(this._scene.add.text(mx, my + 80, 'HP:' + monster.currentHP + '/' + monster.maxHP, {
                fontSize: '9px', fill: '#cccccc', fontFamily: 'monospace'
            }).setOrigin(0.5).setDepth(56));
        }
    },

    showLog(logLines) {
        for (const t of this._logTexts) { if (t && t.active) t.destroy(); }
        this._logTexts = [];
        const recent = logLines.slice(-4);
        for (let i = 0; i < recent.length; i++) {
            const t = this._scene.add.text(12, 12 + i * 15, recent[i], {
                fontSize: '10px', fill: '#dddddd', fontFamily: 'monospace'
            }).setScrollFactor(0).setDepth(60);
            this._elems.push(t);
            this._logTexts.push(t);
        }
    },

    shakeSprite(sprite, intensity, duration) {
        if (!sprite || !sprite.active) return;
        const ox = sprite.x;
        this._scene.tweens.add({
            targets: sprite,
            x: ox + intensity,
            duration: 50,
            yoyo: true,
            repeat: Math.floor(duration / 100),
            onComplete: () => { sprite.x = ox; }
        });
    },

    flashSprite(sprite, color, duration) {
        if (!sprite || !sprite.active) return;
        sprite.setTint(color);
        this._scene.time.delayedCall(duration || 200, () => {
            if (sprite.active) sprite.clearTint();
        });
    },

    showResult(result, callback) {
        const w = this._scene.cameras.main.width;
        const h = this._scene.cameras.main.height;
        const label = result === 'victory' ? '战斗胜利！' : result === 'defeat' ? '战斗失败' : '逃脱成功';
        const color = result === 'victory' ? '#ffcc00' : '#ff4444';
        const text = this._scene.add.text(w / 2, h / 2 - 30, label, {
            fontSize: '28px', fill: color, fontFamily: 'monospace'
        }).setOrigin(0.5).setDepth(70);
        this._elems.push(text);
        this._scene.time.delayedCall(2000, () => { if (callback) callback(); });
    },

    destroy() {
        for (const e of this._elems) { if (e && e.active) e.destroy(); }
        this._elems = [];
        this._hpBars = {};
        this._actionBtns = [];
        this._techBtns = [];
        this._logTexts = [];
        this._hpLabelTexts = [];
        this._playerSprite = null;
        this._monsterSprite = null;
        this._scene = null;
    }
};
