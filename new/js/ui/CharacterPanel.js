const CharacterPanel = {
    _elements: [],
    _onUnequip: null,

    render(scene, x, y, opts) {
        this.clear();
        opts = opts || {};
        this._onUnequip = opts.onUnequip || null;

        const w = 240;
        const stats = CultivationData.getEffectiveStats();
        let cy = y - 130;

        // Panel background
        const bg = scene.add.rectangle(x, y, w + 8, 280, 0x222233, 0.9)
            .setStrokeStyle(1, 0x444466).setScrollFactor(0).setDepth(200);
        this._elements.push(bg);

        const leftX = x - w / 2 + 8;
        const rightX = x + w / 2 - 8;
        const addT = (text, tx, ty, color, size) => {
            const t = scene.add.text(tx, ty, text, {
                fontSize: (size || 12) + 'px', fill: color || '#ffffff', fontFamily: 'monospace'
            }).setScrollFactor(0).setDepth(202);
            this._elements.push(t);
            return t;
        };

        // Name + Rank header
        addT(GameState.playerName || '修士', x, cy, '#ffcc00', 16).setOrigin(0.5, 0);
        cy += 20;
        addT('境界: ' + GameState.playerRank, x, cy, '#ffaa00', 13).setOrigin(0.5, 0);
        cy += 18;

        // Qi bar
        const nextRank = CultivationData.getNextRank(GameState.playerRank);
        const nextData = nextRank ? CultivationData.getRankData(nextRank) : null;
        if (nextData) {
            const qiPct = Math.min(1, GameState.playerQi / nextData.qiRequired);
            addT('灵力: ' + GameState.playerQi + '/' + nextData.qiRequired, leftX, cy, '#aaaacc', 10);
            const barW = w - 16;
            const barBg = scene.add.rectangle(x, cy + 10, barW, 6, 0x333344).setScrollFactor(0).setDepth(200);
            const barFill = scene.add.rectangle(x - barW / 2 + (barW * qiPct) / 2, cy + 10, barW * qiPct, 4, 0x4488ff)
                .setScrollFactor(0).setDepth(201);
            this._elements.push(barBg, barFill);
            cy += 20;
        }

        // Stats
        cy += 4;
        addT('━ 属性 ━', x, cy, '#8888aa', 11).setOrigin(0.5, 0);
        cy += 16;
        const statDefs = [
            { label: '气血', key: 'hp' },
            { label: '攻击', key: 'atk' },
            { label: '防御', key: 'def' },
            { label: '速度', key: 'spd' }
        ];
        for (const s of statDefs) {
            addT(s.label + ': ' + stats[s.key], leftX + 10, cy, '#cccccc', 11);
            cy += 14;
        }
        addT('灵石: ' + GameState.playerGold, leftX + 10, cy, '#ffcc44', 11);
        cy += 16;

        // Equipment slots
        addT('━ 装备 ━', x, cy, '#8888aa', 11).setOrigin(0.5, 0);
        cy += 16;
        const slotLabels = { weapon: '武器', armor: '防具', accessory: '饰品' };
        for (const slot of ['weapon', 'armor', 'accessory']) {
            const eqId = GameState.playerEquipped[slot];
            const eqItem = eqId ? ItemDatabase.getItemById(eqId) : null;
            const label = slotLabels[slot];
            const slotX = leftX + 10;
            const text = eqItem ? label + ': ' + eqItem.name : label + ': (空)';
            const color = eqItem ? (GameConstants.QUALITY_COLORS[eqItem.quality] || '#cccccc') : '#555555';
            const eqText = addT(text, slotX, cy, color, 10);
            cy += 14;

            if (eqItem) {
                // Click to unequip
                eqText.setInteractive({ useHandCursor: true });
                eqText.on('pointerdown', () => {
                    InventoryManager.unequipItem(eqId);
                    this.render(scene, x, y, opts);
                    if (this._onUnequip) this._onUnequip();
                });
            }
        }

        // Learned techniques
        cy += 2;
        addT('━ 功法 ━', x, cy, '#8888aa', 11).setOrigin(0.5, 0);
        cy += 16;
        const learned = GameState.playerLearnedTechniques;
        if (learned.length === 0) {
            addT('(未学习功法)', leftX + 10, cy, '#555555', 10);
        } else {
            for (const techId of learned) {
                const tech = ItemDatabase.getItemById(techId);
                if (tech) {
                    addT(tech.name, leftX + 10, cy, '#aaccff', 10);
                    cy += 14;
                }
            }
        }

        return this;
    },

    clear() {
        for (const elem of this._elements) {
            if (elem && elem.destroy) elem.destroy();
        }
        this._elements = [];
    }
};
