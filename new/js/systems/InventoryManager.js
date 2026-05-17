const InventoryManager = {
    addItem(itemId, quantity) {
        quantity = quantity || 1;
        if (!ItemDatabase.getItemById(itemId)) return false;
        const existing = GameState.inventory.find(i => i.itemId === itemId);
        if (existing) { existing.quantity += quantity; }
        else { GameState.inventory.push({ itemId, quantity, equipped: false }); }
        Events.emit('itemAcquired', itemId, quantity);
        Events.emit('inventoryChanged');
        return true;
    },

    removeItem(itemId, quantity) {
        quantity = quantity || 1;
        const idx = GameState.inventory.findIndex(i => i.itemId === itemId);
        if (idx === -1) return false;
        // Unequip first if equipped
        if (GameState.inventory[idx].equipped) {
            this.unequipItem(itemId);
        }
        GameState.inventory[idx].quantity -= quantity;
        if (GameState.inventory[idx].quantity <= 0) GameState.inventory.splice(idx, 1);
        Events.emit('inventoryChanged');
        return true;
    },

    equipItem(itemId) {
        const item = ItemDatabase.getItemById(itemId);
        if (!item || !item.slot) return false;
        if (item.requiredRank) {
            const rankIdx = CultivationData.rankOrder.indexOf(GameState.playerRank);
            const reqIdx = CultivationData.rankOrder.indexOf(item.requiredRank);
            if (rankIdx < reqIdx) return false;
        }
        const invEntry = GameState.inventory.find(i => i.itemId === itemId);
        if (!invEntry) return false;

        const slot = item.slot;
        // Unequip current item in that slot
        if (GameState.playerEquipped[slot]) {
            this.unequipItem(GameState.playerEquipped[slot]);
        }
        GameState.playerEquipped[slot] = itemId;
        invEntry.equipped = true;
        Events.emit('equipmentChanged');
        Events.emit('inventoryChanged');
        return true;
    },

    unequipItem(itemId) {
        for (const slot of ['weapon', 'armor', 'accessory']) {
            if (GameState.playerEquipped[slot] === itemId) {
                GameState.playerEquipped[slot] = null;
                const invEntry = GameState.inventory.find(i => i.itemId === itemId);
                if (invEntry) invEntry.equipped = false;
                Events.emit('equipmentChanged');
                Events.emit('inventoryChanged');
                return true;
            }
        }
        return false;
    },

    useItem(itemId) {
        const item = ItemDatabase.getItemById(itemId);
        if (!item) return false;
        const invEntry = GameState.inventory.find(i => i.itemId === itemId);
        if (!invEntry || invEntry.quantity <= 0) return false;

        if (item.category === 'pill') {
            if (item.type === 'heal') {
                const healAmt = item.value || 30;
                GameState.currentHP = Math.min(GameState.maxHP, GameState.currentHP + healAmt);
                Events.emit('itemUsed', item);
                this.removeItem(itemId, 1);
                Notification.show(null, '恢复了 ' + healAmt + ' 点气血');
                return true;
            } else if (item.type === 'buff' || item.type === 'breakthrough') {
                Events.emit('itemUsed', item);
                this.removeItem(itemId, 1);
                return true;
            }
        } else if (item.category === 'talisman') {
            Events.emit('itemUsed', item);
            this.removeItem(itemId, 1);
            return true;
        }
        return false;
    },

    dropItem(itemId, quantity) {
        quantity = quantity || 1;
        const idx = GameState.inventory.findIndex(i => i.itemId === itemId);
        if (idx === -1) return false;
        if (GameState.inventory[idx].equipped) {
            this.unequipItem(itemId);
        }
        GameState.inventory[idx].quantity -= quantity;
        if (GameState.inventory[idx].quantity <= 0) GameState.inventory.splice(idx, 1);
        Events.emit('inventoryChanged');
        return true;
    },

    canEquip(itemId) {
        const item = ItemDatabase.getItemById(itemId);
        if (!item || !item.slot) return false;
        if (!item.requiredRank) return true;
        const rankIdx = CultivationData.rankOrder.indexOf(GameState.playerRank);
        const reqIdx = CultivationData.rankOrder.indexOf(item.requiredRank);
        return rankIdx >= reqIdx;
    },

    getItemsByCategory(category) {
        const dbItems = ItemDatabase.getItemsByCategory(category);
        return GameState.inventory.filter(inv => dbItems.some(i => i.id === inv.itemId));
    },

    getCapacity() {
        return GameConstants.INVENTORY_BASE_CAPACITY +
            CultivationData.rankOrder.indexOf(GameState.playerRank) * GameConstants.INVENTORY_CAPACITY_PER_RANK;
    },

    getItemCount() {
        return GameState.inventory.reduce((s, i) => s + i.quantity, 0);
    },

    getAllItems() {
        return GameState.inventory.map(inv => {
            const def = ItemDatabase.getItemById(inv.itemId);
            return { ...inv, definition: def };
        });
    }
};
