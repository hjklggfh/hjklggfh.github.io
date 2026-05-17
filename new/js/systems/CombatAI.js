const CombatAI = {
    decideAction(monster, player) {
        if (!monster || !monster.monsterData) return { type: 'attack' };

        const mHP = monster.currentHP;
        const mMaxHP = monster.maxHP;
        const hpRatio = mHP / mMaxHP;
        const md = monster.monsterData;

        // Boss AI: use technique if available and HP > 30%
        if (md.rarity === 'boss' && md.hasTechnique && hpRatio > 0.3 && Math.random() < 0.4) {
            return { type: 'technique', name: '魔焰焚天', multiplier: 2.0 };
        }

        // Uncommon with technique: occasional skill use
        if (md.hasTechnique && Math.random() < 0.25) {
            return { type: 'technique', name: '邪功', multiplier: 1.6 };
        }

        // Low HP: go aggressive (slight damage boost)
        if (hpRatio < 0.3) {
            return { type: 'attack', desperate: true };
        }

        // Default: basic attack
        return { type: 'attack' };
    }
};
