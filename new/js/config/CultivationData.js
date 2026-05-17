const CultivationData = {
    ranks: {
        '炼气': { qiRequired: 0,     breakthroughRate: 0.90, skillSlots: 1, statBonus: { hp: 0,   atk: 0,   def: 0   }, spd: 0 },
        '筑基': { qiRequired: 1000,  breakthroughRate: 0.70, skillSlots: 2, statBonus: { hp: 50,  atk: 10,  def: 5   }, spd: 0 },
        '金丹': { qiRequired: 5000,  breakthroughRate: 0.50, skillSlots: 3, statBonus: { hp: 150, atk: 25,  def: 15  }, spd: 0 },
        '元婴': { qiRequired: 20000, breakthroughRate: 0.35, skillSlots: 4, statBonus: { hp: 400, atk: 60,  def: 35  }, spd: 0 },
        '化神': { qiRequired: 80000, breakthroughRate: 0.30, skillSlots: 5, statBonus: { hp: 1000,atk: 150, def: 80  }, spd: 0 }
    },

    rankOrder: ['炼气', '筑基', '金丹', '元婴', '化神'],

    getNextRank(currentRank) {
        const idx = this.rankOrder.indexOf(currentRank);
        if (idx === -1 || idx >= this.rankOrder.length - 1) return null;
        return this.rankOrder[idx + 1];
    },

    getRankData(rank) {
        return this.ranks[rank] || null;
    },

    getBreakthroughRate(rank) {
        const data = this.ranks[rank];
        return data ? data.breakthroughRate : 0;
    },

    getEffectiveStats() {
        const rankData = this.ranks[GameState.playerRank];
        if (!rankData) return GameState.playerBaseStats;
        const bonus = rankData.statBonus;
        const base = GameState.playerBaseStats;
        const eqBonus = CultivationSystem ? CultivationSystem.getEquipmentStatBonus() : { hp: 0, atk: 0, def: 0, spd: 0 };
        return {
            hp:  base.hp  + bonus.hp  + eqBonus.hp,
            atk: base.atk + bonus.atk + eqBonus.atk,
            def: base.def + bonus.def + eqBonus.def,
            spd: base.spd + bonus.spd + eqBonus.spd
        };
    }
};
