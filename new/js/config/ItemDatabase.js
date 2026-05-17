const ItemDatabase = {
    techniques: [
        { id: 'fire_palm', name: '烈焰掌', quality: '凡品', qiCost: 10, damage: 25, element: 'fire', requiredRank: '炼气', price: 150, description: '基础火系功法，以灵力凝聚火焰于掌心' },
        { id: 'water_shield', name: '水盾术', quality: '凡品', qiCost: 15, damage: 0, element: 'water', requiredRank: '炼气', price: 180, description: '以水灵力形成护盾，提升防御一回合', buff: { def: 10, turns: 3 } },
        { id: 'wind_blade', name: '风刃斩', quality: '灵品', qiCost: 25, damage: 45, element: 'wind', requiredRank: '筑基', price: 600, description: '凝风成刃，远程斩击敌人' },
        { id: 'thunder_strike', name: '雷霆一击', quality: '灵品', qiCost: 30, damage: 55, element: 'thunder', requiredRank: '筑基', price: 700, description: '引天雷之力，对敌人造成大量伤害' },
        { id: 'earth_armor', name: '土灵护体', quality: '灵品', qiCost: 20, damage: 0, element: 'earth', requiredRank: '筑基', price: 550, description: '大地灵力护体，大幅提升防御', buff: { def: 25, turns: 3 } },
        { id: 'fire_storm', name: '焚天火雨', quality: '仙品', qiCost: 50, damage: 90, element: 'fire', requiredRank: '金丹', price: 3000, description: '召唤火雨覆盖战场，仙品火系功法' },
        { id: 'ice_seal', name: '玄冰封印', quality: '仙品', qiCost: 45, damage: 70, element: 'water', requiredRank: '金丹', price: 2800, description: '以极寒玄冰封印敌人，造成伤害并减速', debuff: { spd: -10, turns: 2 } },
        { id: 'void_slash', name: '虚空裂空斩', quality: '仙品', qiCost: 60, damage: 120, element: 'void', requiredRank: '元婴', price: 5000, description: '撕裂虚空，仙品顶级攻击功法' },
    ],

    pills: [
        { id: 'heal_low', name: '回春丹', type: 'heal', quality: '凡品', value: 30, price: 50 },
        { id: 'heal_mid', name: '大还丹', type: 'heal', quality: '灵品', value: 80, price: 200 },
        { id: 'heal_high', name: '九转还魂丹', type: 'heal', quality: '仙品', value: 200, price: 800 },
        { id: 'buff_atk', name: '金刚丹', type: 'buff', quality: '灵品', effect: { atk: 15, turns: 5 }, price: 300 },
        { id: 'buff_def', name: '铁骨丹', type: 'buff', quality: '灵品', effect: { def: 15, turns: 5 }, price: 300 },
        { id: 'breakthrough_low', name: '破障丹', type: 'breakthrough', quality: '凡品', bonus: 0.10, price: 200 },
        { id: 'breakthrough_mid', name: '凝神丹', type: 'breakthrough', quality: '灵品', bonus: 0.20, price: 600 },
        { id: 'breakthrough_high', name: '天元破境丹', type: 'breakthrough', quality: '仙品', bonus: 0.35, price: 2000 },
    ],

    talismans: [
        { id: 'fire_talisman', name: '烈火符', quality: '凡品', effect: { damage: 30 }, price: 80 },
        { id: 'ice_talisman', name: '寒冰符', quality: '凡品', effect: { damage: 25, debuff: { spd: -5, turns: 2 } }, price: 100 },
        { id: 'thunder_talisman', name: '天雷符', quality: '灵品', effect: { damage: 60 }, price: 300 },
        { id: 'shield_talisman', name: '护身符', quality: '灵品', effect: { buff: { def: 20, turns: 3 } }, price: 250 },
        { id: 'escape_talisman', name: '遁走符', quality: '凡品', effect: { flee: true }, price: 150 },
    ],

    equipment: [
        { id: 'iron_sword', name: '铁剑', slot: 'weapon', quality: '凡品', statBonus: { atk: 5 }, requiredRank: '炼气', price: 100 },
        { id: 'spirit_sword', name: '灵剑', slot: 'weapon', quality: '灵品', statBonus: { atk: 15 }, requiredRank: '筑基', price: 500 },
        { id: 'heaven_sword', name: '仙剑·天问', slot: 'weapon', quality: '仙品', statBonus: { atk: 40 }, requiredRank: '金丹', price: 3000 },
        { id: 'cloth_armor', name: '布衣', slot: 'armor', quality: '凡品', statBonus: { def: 3 }, requiredRank: '炼气', price: 80 },
        { id: 'iron_armor', name: '铁甲', slot: 'armor', quality: '灵品', statBonus: { def: 12 }, requiredRank: '筑基', price: 400 },
        { id: 'spirit_armor', name: '灵铠', slot: 'armor', quality: '仙品', statBonus: { def: 30 }, requiredRank: '金丹', price: 2500 },
        { id: 'jade_ring', name: '玉戒', slot: 'accessory', quality: '凡品', statBonus: { hp: 20 }, requiredRank: '炼气', price: 120 },
        { id: 'spirit_pendant', name: '灵佩', slot: 'accessory', quality: '灵品', statBonus: { spd: 10 }, requiredRank: '筑基', price: 450 },
    ],

    getItemById(id) {
        const catMap = { techniques: 'technique', pills: 'pill', talismans: 'talisman', equipment: 'equipment' };
        for (const cat of ['techniques', 'pills', 'talismans', 'equipment']) {
            const item = this[cat].find(i => i.id === id);
            if (item) return { ...item, category: catMap[cat] };
        }
        return null;
    },

    getItemsByCategory(category) {
        const map = {
            '功法': 'techniques',
            '丹药': 'pills',
            '符箓': 'talismans',
            '装备': 'equipment'
        };
        const key = map[category];
        return key ? this[key] : [];
    }
};
