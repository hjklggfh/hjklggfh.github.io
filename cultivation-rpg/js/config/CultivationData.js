const CultivationData = {
    ranks: {
        '炼气': { qiRequired: 0, breakthroughRate: 0.92, skillSlots: 1, statBonus: { hp: 0, atk: 0, def: 0, spd: 0 }, threshold: '感应灵气，开辟气海' },
        '筑基': { qiRequired: 1200, breakthroughRate: 0.74, skillSlots: 2, statBonus: { hp: 80, atk: 16, def: 8, spd: 2 }, threshold: '气海凝实，需破障丹稳固根基' },
        '金丹': { qiRequired: 6500, breakthroughRate: 0.56, skillSlots: 3, statBonus: { hp: 240, atk: 42, def: 24, spd: 5 }, threshold: '灵力压缩成丹，需承受丹火淬体' },
        '元婴': { qiRequired: 28000, breakthroughRate: 0.38, skillSlots: 4, statBonus: { hp: 620, atk: 96, def: 58, spd: 10 }, threshold: '金丹破壳化婴，神识初成' },
        '化神': { qiRequired: 120000, breakthroughRate: 0.25, skillSlots: 5, statBonus: { hp: 1500, atk: 220, def: 130, spd: 18 }, threshold: '元婴通神，可借天地法则' },
        '炼虚': { qiRequired: 420000, breakthroughRate: 0.16, skillSlots: 6, statBonus: { hp: 3600, atk: 520, def: 310, spd: 30 }, threshold: '神魂映虚空，需渡虚空心劫' },
        '合体': { qiRequired: 1500000, breakthroughRate: 0.10, skillSlots: 7, statBonus: { hp: 8200, atk: 1180, def: 720, spd: 45 }, threshold: '元神肉身合一，战力跨越凡界极限' },
        '大乘': { qiRequired: 5200000, breakthroughRate: 0.07, skillSlots: 8, statBonus: { hp: 18000, atk: 2600, def: 1600, spd: 65 }, threshold: '大道圆满，需天地认可' },
        '渡劫': { qiRequired: 18000000, breakthroughRate: 0.04, skillSlots: 9, statBonus: { hp: 42000, atk: 6200, def: 3900, spd: 90 }, threshold: '九重天劫降临，成则近仙' }
    },

    rankOrder: ['炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫'],

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
            spd: base.spd + (bonus.spd || 0) + eqBonus.spd
        };
    }
};
