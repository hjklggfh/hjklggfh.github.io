const MarketManager = {
    _shopInventory: [],

    generateShopInventory(cityId, tags) {
        const items = [];
        const random = this._makeRng((cityId || 'default') + '_' + Math.floor((GameState.playTime || 0) / (GameConstants.WORLD_DAY_MS || 360000)));
        const qualityWeights = [
            { quality: '凡品', weight: 44 },
            { quality: '良品', weight: 26 },
            { quality: '灵品', weight: 17 },
            { quality: '玄品', weight: 8 },
            { quality: '地品', weight: 3 },
            { quality: '天品', weight: 1.5 },
            { quality: '仙品', weight: 0.5 }
        ];
        const totalItems = 16 + Math.floor(random() * 10);

        let allItems = ItemDatabase.getAllTradableItems();
        if (tags && tags.length > 0) {
            const normalized = tags.map(t => t === '武器' ? '装备' : t);
            allItems = allItems.filter(item => normalized.includes(item.category));
        }
        if (allItems.length === 0) allItems = ItemDatabase.getAllTradableItems();

        for (let i = 0; i < totalItems; i++) {
            const qw = this._weightedRandom(qualityWeights, 'weight', random);
            const filtered = allItems.filter(it => it.quality === qw.quality);
            if (filtered.length > 0) {
                const item = filtered[Math.floor(random() * filtered.length)];
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

    _weightedRandom(items, weightKey, random) {
        const total = items.reduce((s, i) => s + (i[weightKey] || 1), 0);
        let r = random() * total;
        for (const item of items) {
            r -= (item[weightKey] || 1);
            if (r <= 0) return item;
        }
        return items[items.length - 1];
    },

    _makeRng(seedText) {
        let seed = 2166136261;
        for (let i = 0; i < seedText.length; i++) {
            seed ^= seedText.charCodeAt(i);
            seed = Math.imul(seed, 16777619);
        }
        return function () {
            seed += 0x6D2B79F5;
            let t = seed;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
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
