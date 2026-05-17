const InventoryGrid = {
    _elements: [],
    _items: [],
    _selectedIdx: -1,
    _categoryFilter: null,
    _onSelect: null,
    _onAction: null,
    _slotSize: 36,
    _cols: 6,

    render(scene, x, y, opts) {
        this.clear();
        opts = opts || {};
        this._cols = opts.cols || 6;
        this._slotSize = opts.slotSize || 36;
        this._onSelect = opts.onSelect || null;
        this._onAction = opts.onAction || null;
        this._categoryFilter = opts.category || null;
        this._selectedIdx = -1;

        // Filter items
        let allItems = InventoryManager.getAllItems();
        if (this._categoryFilter) {
            const catItems = ItemDatabase.getItemsByCategory(this._categoryFilter);
            allItems = allItems.filter(inv => catItems.some(c => c.id === inv.itemId));
        }
        this._items = allItems;

        const pad = 4;
        const capacity = InventoryManager.getCapacity();
        const rows = Math.max(2, Math.ceil(capacity / this._cols));
        const totalW = this._cols * (this._slotSize + pad) + pad;
        const totalH = rows * (this._slotSize + pad) + pad;

        // Background
        const bg = scene.add.rectangle(x, y, totalW + 8, totalH + 8, 0x222233, 0.9)
            .setStrokeStyle(1, 0x444466).setScrollFactor(0).setDepth(200);
        this._elements.push(bg);

        // Slots
        this._slotElements = [];
        for (let i = 0; i < capacity; i++) {
            const sx = x - totalW / 2 + pad + (i % this._cols) * (this._slotSize + pad) + this._slotSize / 2;
            const sy = y - totalH / 2 + pad + Math.floor(i / this._cols) * (this._slotSize + pad) + this._slotSize / 2;

            // Slot bg
            const slotBg = scene.add.rectangle(sx, sy, this._slotSize, this._slotSize,
                i < this._items.length ? 0x333344 : 0x1a1a2a, 1)
                .setStrokeStyle(1, i < this._items.length ? 0x555577 : 0x2a2a3a)
                .setScrollFactor(0).setDepth(201);
            this._elements.push(slotBg);

            if (i < this._items.length) {
                const inv = this._items[i];
                const def = inv.definition;
                if (def) {
                    // Quality color indicator
                    const qColor = GameConstants.QUALITY_COLORS[def.quality] || '#aaaaaa';
                    const colorBar = scene.add.rectangle(sx, sy - this._slotSize / 2 + 2, this._slotSize - 4, 3, qColor)
                        .setScrollFactor(0).setDepth(202);
                    this._elements.push(colorBar);

                    // Item name (scale font for long names)
                    const displayName = def.name;
                    const fontSize = displayName.length > 4 ? '7px' : '9px';
                    const nameText = scene.add.text(sx, sy + 2, displayName, {
                        fontSize: fontSize, fill: qColor, fontFamily: 'monospace'
                    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
                    this._elements.push(nameText);

                    // Quantity
                    if (inv.quantity > 1) {
                        const qtyText = scene.add.text(sx + this._slotSize / 2 - 4, sy + this._slotSize / 2 - 10,
                            'x' + inv.quantity, {
                                fontSize: '8px', fill: '#cccccc', fontFamily: 'monospace'
                            }).setOrigin(1, 0).setScrollFactor(0).setDepth(202);
                        this._elements.push(qtyText);
                    }

                    // Equipped badge
                    if (inv.equipped) {
                        const eqBadge = scene.add.text(sx, sy - this._slotSize / 2 + 6, 'E', {
                            fontSize: '8px', fill: '#ffcc00', fontFamily: 'monospace'
                        }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
                        this._elements.push(eqBadge);
                    }

                    // Make slot interactive
                    slotBg.setInteractive({ useHandCursor: true });
                    const idx = i;
                    slotBg.on('pointerdown', () => {
                        this._selectItem(scene, idx);
                    });
                    slotBg.on('pointerover', () => slotBg.setStrokeStyle(2, 0x88aaff));
                    slotBg.on('pointerout', () => {
                        if (this._selectedIdx !== idx) slotBg.setStrokeStyle(1, 0x555577);
                    });
                }
            }
            this._slotElements.push(slotBg);
        }

        // Capacity text
        const capText = scene.add.text(x + totalW / 2 - 4, y + totalH / 2 + 2,
            InventoryManager.getItemCount() + '/' + capacity, {
                fontSize: '9px', fill: '#666688', fontFamily: 'monospace'
            }).setOrigin(1, 0).setScrollFactor(0).setDepth(202);
        this._elements.push(capText);
    },

    _selectItem(scene, idx) {
        // Deselect previous
        if (this._selectedIdx >= 0 && this._selectedIdx < this._slotElements.length) {
            this._slotElements[this._selectedIdx].setStrokeStyle(1, 0x555577);
        }
        this._selectedIdx = idx;
        this._slotElements[idx].setStrokeStyle(2, 0xffcc00);

        if (this._onSelect && idx < this._items.length) {
            this._onSelect(this._items[idx], idx);
        }
    },

    getSelectedItem() {
        if (this._selectedIdx >= 0 && this._selectedIdx < this._items.length) {
            return this._items[this._selectedIdx];
        }
        return null;
    },

    clear() {
        for (const elem of this._elements) {
            if (elem && elem.destroy) elem.destroy();
        }
        this._elements = [];
        this._slotElements = [];
        this._items = [];
        this._selectedIdx = -1;
    }
};
