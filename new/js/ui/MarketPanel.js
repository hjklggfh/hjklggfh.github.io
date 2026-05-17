const MarketPanel = {
    _elems: [],
    _onAction: null,

    render(scene, items, x, y, opts) {
        this.clear();
        opts = opts || {};
        this._onAction = opts.onAction || null;
        const mode = opts.mode || 'buy'; // 'buy' or 'sell'

        const itemH = 26;
        const maxRows = 14;
        const panelW = 280;
        const visible = items.slice(0, maxRows);

        // Background
        this._elems.push(scene.add.rectangle(x, y, panelW + 8, visible.length * itemH + 16, 0x222233, 0.9)
            .setStrokeStyle(1, 0x444466).setScrollFactor(0).setDepth(200));

        const startY = y - (visible.length * itemH) / 2 + itemH / 2;

        for (let i = 0; i < visible.length; i++) {
            const item = visible[i];
            const iy = startY + i * itemH;
            const qColor = GameConstants.QUALITY_COLORS[item.quality] || '#aaaaaa';

            // Row bg
            const rowBg = scene.add.rectangle(x, iy, panelW, itemH - 2,
                i % 2 === 0 ? 0x2a2a3a : 0x252535, 1)
                .setStrokeStyle(1, 0x333344).setScrollFactor(0).setDepth(201);
            this._elems.push(rowBg);

            // Quality indicator
            this._elems.push(scene.add.rectangle(x - panelW / 2 + 6, iy, 4, itemH - 4, qColor)
                .setScrollFactor(0).setDepth(202));

            // Name
            const price = mode === 'buy' ? item.price : item.sellPrice;
            const label = item.name + (item.quantity > 1 ? ' x' + item.quantity : '');
            const nameColor = qColor;
            this._elems.push(scene.add.text(x - panelW / 2 + 16, iy, label, {
                fontSize: '11px', fill: nameColor, fontFamily: 'monospace'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(202));

            // Price
            this._elems.push(scene.add.text(x + panelW / 2 - 60, iy, price + '灵石', {
                fontSize: '10px', fill: '#ffcc44', fontFamily: 'monospace'
            }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(202));

            // Action button
            const btnLabel = mode === 'buy' ? '买' : '卖';
            const btnColor = mode === 'buy' ? '#44ff44' : '#ff8844';
            const btn = scene.add.text(x + panelW / 2 - 6, iy, btnLabel, {
                fontSize: '11px', fill: btnColor, fontFamily: 'monospace',
                padding: { left: 6, right: 6, top: 2, bottom: 2 }
            }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(202).setInteractive({ useHandCursor: true });

            const itemId = item.itemId;
            btn.on('pointerover', () => btn.setStyle({ fill: '#ffffff' }));
            btn.on('pointerout', () => btn.setStyle({ fill: btnColor }));
            btn.on('pointerdown', () => {
                if (this._onAction) this._onAction(itemId);
            });
            this._elems.push(btn);
        }
    },

    clear() {
        for (const e of this._elems) { if (e && e.active) e.destroy(); }
        this._elems = [];
    }
};
