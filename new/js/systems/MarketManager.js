const MarketManager = {
    _shopInventory: [],

    generateShopInventory(cityId) {
        const items = [];
        const qualityWeights = [
            { quality: '凡品', weight: 70 },
            { quality: '灵品', weight: 25 },
            { quality: '仙品', weight: 5 }
        ];
        const totalItems = 10 + Math.floor(Math.random() * 10);

        // Gather all buyable items from database
        const allItems = [
            ...ItemDatabase.techniques.map(i => ({ ...i, category: '功法' })),
            ...ItemDatabase.pills.map(i => ({ ...i, category: '丹药' })),
            ...ItemDatabase.talismans.map(i => ({ ...i, category: '符箓' })),
            ...ItemDatabase.equipment.map(i => ({ ...i, category: '装备' }))
        ];

        for (let i = 0; i < totalItems; i++) {
            const qw = RandomUtils.weightedRandom(qualityWeights, 'weight');
            const filtered = allItems.filter(it => it.quality === qw.quality);
            if (filtered.length > 0) {
                const item = RandomUtils.pick(filtered);
                const price = PriceCalculator.buyPrice(item);
                items.push({
                    itemId: item.id,
                    name: item.name,
                    quality: item.quality,
                    category: item.category,
                    price: price
                });
            }
        }

        // Deduplicate
        this._shopInventory = items.filter((it, idx, arr) =>
            arr.findIndex(x => x.itemId === it.itemId) === idx
        );
        return this._shopInventory;
    },

    getShopInventory() {
        if (this._shopInventory.length === 0) {
            this.generateShopInventory('default');
        }
        return this._shopInventory;
    },

    buyItem(itemId) {
        const shopItem = this._shopInventory.find(s => s.itemId === itemId);
        if (!shopItem) return { error: '商品不存在' };
        if (GameState.playerGold < shopItem.price) return { error: '灵石不足' };

        GameState.playerGold -= shopItem.price;
        InventoryManager.addItem(itemId, 1);
        Events.emit('goldChanged');
        HUD.update();
        return { success: true, item: shopItem };
    },

    sellItem(itemId) {
        const invItem = GameState.inventory.find(i => i.itemId === itemId && !i.equipped);
        if (!invItem) return { error: '没有可出售的此物品' };

        const def = ItemDatabase.getItemById(itemId);
        if (!def) return { error: '未知物品' };

        const sellPrice = PriceCalculator.sellPrice(def);
        GameState.playerGold += sellPrice;
        InventoryManager.removeItem(itemId, 1);
        Events.emit('goldChanged');
        HUD.update();
        return { success: true, price: sellPrice, name: def.name };
    },

    refreshShop() {
        this._shopInventory = [];
        this.generateShopInventory('default');
    },

    getSellableInventory() {
        return GameState.inventory.filter(i => !i.equipped).map(inv => {
            const def = ItemDatabase.getItemById(inv.itemId);
            if (!def) return null;
            return {
                itemId: inv.itemId,
                name: def.name,
                quality: def.quality,
                category: def.category || '',
                quantity: inv.quantity,
                sellPrice: PriceCalculator.sellPrice(def)
            };
        }).filter(Boolean);
    }
};
