const CultivationSystem = {
    gainQi(amount) {
        GameState.playerQi += amount;
        Events.emit('qiChanged', GameState.playerQi);
    },

    canBreakthrough() {
        const nextRank = CultivationData.getNextRank(GameState.playerRank);
        if (!nextRank) return false;
        const data = CultivationData.getRankData(nextRank);
        return GameState.playerQi >= data.qiRequired;
    },

    getBreakthroughChance(pillBonus) {
        let chance = CultivationData.getBreakthroughRate(GameState.playerRank);
        if (pillBonus) chance += pillBonus;
        return Math.min(0.95, Math.max(0.05, chance));
    },

    attemptBreakthrough(pillBonus) {
        if (!this.canBreakthrough()) return { success: false, reason: '灵力不足，无法突破' };

        const nextRank = CultivationData.getNextRank(GameState.playerRank);
        const chance = this.getBreakthroughChance(pillBonus);
        const roll = Math.random();
        const success = roll < chance;

        if (success) {
            const prevRank = GameState.playerRank;
            GameState.playerRank = nextRank;
            const nextData = CultivationData.getRankData(nextRank);
            GameState.playerQi -= nextData.qiRequired;
            const stats = CultivationData.getEffectiveStats();
            GameState.maxHP = stats.hp;
            GameState.currentHP = GameState.maxHP;
            // Learn a technique for first breakthrough
            if (GameState.playerLearnedTechniques.length === 0) {
                GameState.playerLearnedTechniques.push('fire_palm');
            }
            // Consume breakthrough pill if used
            if (pillBonus > 0) {
                const pills = GameState.inventory.filter(inv => {
                    const def = ItemDatabase.getItemById(inv.itemId);
                    return def && def.category === 'pill' && def.type === 'breakthrough';
                });
                if (pills.length > 0) InventoryManager.removeItem(pills[0].itemId, 1);
            }
            Events.emit('breakthroughSuccess', prevRank, nextRank);
            Events.emit('qiChanged', GameState.playerQi);
            SaveManager.autoSave();
            return { success: true, prevRank, newRank: nextRank, roll, chance };
        } else {
            // Failure: lose some qi (10-30%)
            const loss = Math.floor(GameState.playerQi * (0.1 + Math.random() * 0.2));
            GameState.playerQi = Math.max(0, GameState.playerQi - loss);
            Events.emit('breakthroughFail', loss);
            Events.emit('qiChanged', GameState.playerQi);
            SaveManager.autoSave();
            return { success: false, qiLoss: loss, roll, chance };
        }
    },

    getEquipmentStatBonus() {
        let bonus = { hp: 0, atk: 0, def: 0, spd: 0 };
        for (const slot of ['weapon', 'armor', 'accessory']) {
            const itemId = GameState.playerEquipped[slot];
            if (!itemId) continue;
            const item = ItemDatabase.getItemById(itemId);
            if (item && item.statBonus) {
                for (const stat in item.statBonus) {
                    bonus[stat] = (bonus[stat] || 0) + item.statBonus[stat];
                }
            }
        }
        return bonus;
    }
};
