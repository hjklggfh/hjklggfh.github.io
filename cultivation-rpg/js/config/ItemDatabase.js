const ItemDatabase = {
    techniques: [
        { id: 'fire_palm', name: '烈焰掌', quality: '凡品', qiCost: 10, damage: 26, element: 'fire', path: '掌法', requiredRank: '炼气', price: 150, description: '基础火系掌法，适合初入道途者。' },
        { id: 'water_shield', name: '水幕护身', quality: '凡品', qiCost: 14, damage: 0, element: 'water', path: '心法', requiredRank: '炼气', price: 180, description: '引水灵气护体，短时间提升防御。', buff: { def: 10, turns: 3 } },
        { id: 'cloud_step', name: '流云步', quality: '良品', qiCost: 18, damage: 18, element: 'wind', path: '身法', requiredRank: '炼气', price: 320, description: '身随云转，攻守之间提升速度。', buff: { spd: 8, turns: 3 } },
        { id: 'greenwood_formula', name: '青木诀', quality: '良品', qiCost: 18, damage: 20, element: 'wood', path: '心法', requiredRank: '炼气', price: 360, description: '借草木生机回转气血。', buff: { hp: 25, turns: 1 } },
        { id: 'wind_blade', name: '风刃斩', quality: '灵品', qiCost: 26, damage: 48, element: 'wind', path: '剑法', requiredRank: '筑基', price: 700, description: '凝风成刃，可远距离斩击。' },
        { id: 'thunder_strike', name: '惊雷引', quality: '灵品', qiCost: 32, damage: 62, element: 'thunder', path: '术法', requiredRank: '筑基', price: 820, description: '以神识牵引天雷，爆发力强。' },
        { id: 'earth_armor', name: '厚土灵甲', quality: '灵品', qiCost: 24, damage: 0, element: 'earth', path: '心法', requiredRank: '筑基', price: 680, description: '厚土灵力凝甲，适合持久战。', buff: { def: 28, turns: 3 } },
        { id: 'moon_sword', name: '揽月剑诀', quality: '玄品', qiCost: 42, damage: 86, element: 'moon', path: '剑法', requiredRank: '金丹', price: 1800, description: '剑光如月轮，兼具破防与追击。' },
        { id: 'fire_storm', name: '焚天火雨', quality: '地品', qiCost: 55, damage: 118, element: 'fire', path: '术法', requiredRank: '金丹', price: 3200, description: '召火雨压制一片战场。' },
        { id: 'ice_seal', name: '玄冰封脉', quality: '地品', qiCost: 50, damage: 92, element: 'water', path: '封印', requiredRank: '金丹', price: 3000, description: '寒气入脉，伤敌并削弱速度。', debuff: { spd: -12, turns: 2 } },
        { id: 'soul_lamp', name: '元婴照魂法', quality: '天品', qiCost: 88, damage: 165, element: 'soul', path: '心法', requiredRank: '元婴', price: 7200, description: '以元婴神光照破邪祟。' },
        { id: 'void_slash', name: '虚空裂隙剑', quality: '仙品', qiCost: 140, damage: 280, element: 'void', path: '剑法', requiredRank: '化神', price: 18000, description: '撕开一线虚空，极难抵御。' },
        { id: 'star_fall', name: '星河坠仙式', quality: '仙品', qiCost: 220, damage: 460, element: 'star', path: '术法', requiredRank: '炼虚', price: 52000, description: '借星辉镇压强敌，非高阶修士不可承受。' }
    ],

    pills: [
        { id: 'heal_low', name: '回春丹', type: 'heal', quality: '凡品', value: 36, price: 50, description: '常见疗伤丹药。' },
        { id: 'heal_mid', name: '大还丹', type: 'heal', quality: '灵品', value: 110, price: 240, description: '快速续命的中阶丹药。' },
        { id: 'heal_high', name: '九转还魂丹', type: 'heal', quality: '天品', value: 420, price: 1800, description: '濒死时仍可吊住一口真气。' },
        { id: 'qi_small', name: '聚气散', type: 'buff', quality: '凡品', effect: { atk: 6, turns: 4 }, price: 90, description: '短时提升灵力运转。' },
        { id: 'buff_atk', name: '金刚丹', type: 'buff', quality: '灵品', effect: { atk: 18, turns: 5 }, price: 330, description: '强化筋骨与爆发。' },
        { id: 'buff_def', name: '铁骨丹', type: 'buff', quality: '灵品', effect: { def: 18, turns: 5 }, price: 330, description: '提升抗击打能力。' },
        { id: 'swift_pill', name: '御风丹', type: 'buff', quality: '玄品', effect: { spd: 18, turns: 4 }, price: 760, description: '身法修士常备丹药。' },
        { id: 'breakthrough_low', name: '破障丹', type: 'breakthrough', quality: '凡品', bonus: 0.10, price: 220, description: '突破筑基前常用。' },
        { id: 'breakthrough_mid', name: '凝神丹', type: 'breakthrough', quality: '灵品', bonus: 0.20, price: 720, description: '凝聚神识，降低心魔干扰。' },
        { id: 'breakthrough_high', name: '天元破境丹', type: 'breakthrough', quality: '地品', bonus: 0.32, price: 2600, description: '金丹以上突破时仍有显著助益。' },
        { id: 'immortal_seed_pill', name: '仙胎造化丹', type: 'breakthrough', quality: '仙品', bonus: 0.45, price: 18000, description: '罕见仙丹，可护住大道根基。' }
    ],

    talismans: [
        { id: 'fire_talisman', name: '烈火符', quality: '凡品', effect: { damage: 34 }, price: 80, description: '注入火灵气即可引燃。' },
        { id: 'ice_talisman', name: '寒冰符', quality: '凡品', effect: { damage: 28, debuff: { spd: -5, turns: 2 } }, price: 100, description: '迟滞敌方行动。' },
        { id: 'thunder_talisman', name: '天雷符', quality: '灵品', effect: { damage: 70 }, price: 360, description: '雷法修士绘制的攻击符。' },
        { id: 'shield_talisman', name: '护身符', quality: '灵品', effect: { buff: { def: 24, turns: 3 } }, price: 280, description: '遇险时展开灵光盾。' },
        { id: 'seal_talisman', name: '镇妖符', quality: '玄品', effect: { damage: 55, debuff: { atk: -10, turns: 3 } }, price: 820, description: '对妖兽和邪祟尤其有效。' },
        { id: 'escape_talisman', name: '小挪移符', quality: '良品', effect: { flee: true }, price: 180, description: '撕开短距遁光。' },
        { id: 'spirit_eye_talisman', name: '灵眼符', quality: '灵品', effect: { reveal: true }, price: 420, description: '用于寻找洞府和灵材。' }
    ],

    equipment: [
        { id: 'iron_sword', name: '青锋铁剑', slot: 'weapon', quality: '凡品', statBonus: { atk: 6 }, requiredRank: '炼气', price: 100, description: '入门剑器。' },
        { id: 'spirit_sword', name: '寒泉灵剑', slot: 'weapon', quality: '灵品', statBonus: { atk: 20, spd: 2 }, requiredRank: '筑基', price: 620, description: '剑身含寒泉灵矿。' },
        { id: 'moon_blade', name: '碎月弯刀', slot: 'weapon', quality: '玄品', statBonus: { atk: 44, spd: 6 }, requiredRank: '金丹', price: 1900, description: '刀光偏冷，适合快攻。' },
        { id: 'heaven_sword', name: '仙剑·天问', slot: 'weapon', quality: '天品', statBonus: { atk: 110, spd: 12 }, requiredRank: '元婴', price: 9000, description: '剑鸣可动云海。' },
        { id: 'void_relic_sword', name: '太虚古剑', slot: 'weapon', quality: '仙品', statBonus: { atk: 260, spd: 24 }, requiredRank: '化神', price: 38000, description: '剑身刻有虚空道纹。' },
        { id: 'cloth_armor', name: '青布法衣', slot: 'armor', quality: '凡品', statBonus: { def: 4, hp: 12 }, requiredRank: '炼气', price: 80, description: '缝入少量护身符线。' },
        { id: 'iron_armor', name: '玄铁甲', slot: 'armor', quality: '灵品', statBonus: { def: 18, hp: 50 }, requiredRank: '筑基', price: 520, description: '沉重但可靠。' },
        { id: 'spirit_armor', name: '流霞灵铠', slot: 'armor', quality: '地品', statBonus: { def: 56, hp: 180 }, requiredRank: '金丹', price: 3600, description: '灵光流转，能卸去冲击。' },
        { id: 'cloud_robe', name: '云纹仙袍', slot: 'armor', quality: '仙品', statBonus: { def: 180, hp: 620, spd: 18 }, requiredRank: '化神', price: 42000, description: '云纹自成阵法。' },
        { id: 'jade_ring', name: '温玉戒', slot: 'accessory', quality: '凡品', statBonus: { hp: 28 }, requiredRank: '炼气', price: 120, description: '温养气血。' },
        { id: 'spirit_pendant', name: '清心灵佩', slot: 'accessory', quality: '灵品', statBonus: { spd: 10, def: 6 }, requiredRank: '筑基', price: 540, description: '镇定神识。' },
        { id: 'dragon_scale', name: '蛟鳞护符', slot: 'accessory', quality: '天品', statBonus: { hp: 380, def: 80 }, requiredRank: '元婴', price: 12500, description: '残留蛟龙威压。' }
    ],

    materials: [
        { id: 'spirit_herb', name: '凝露灵草', quality: '凡品', use: '炼丹', price: 24, description: '森林边缘常见灵草。' },
        { id: 'red_ginseng', name: '赤参', quality: '良品', use: '炼丹', price: 70, description: '气血类丹药主材。' },
        { id: 'moon_moss', name: '月华苔', quality: '灵品', use: '炼丹', price: 160, description: '夜间吸纳月华。' },
        { id: 'seal_paper', name: '空纹符纸', quality: '凡品', use: '制符', price: 32, description: '基础符箓载体。' },
        { id: 'ink_jade', name: '墨玉砂', quality: '灵品', use: '制符', price: 180, description: '绘制封印类符箓。' },
        { id: 'cold_iron', name: '寒铁矿', quality: '良品', use: '炼器', price: 90, description: '炼制灵剑的常用矿石。' },
        { id: 'earth_core', name: '地脉晶核', quality: '玄品', use: '炼器', price: 420, description: '山脉深处的地脉凝结物。' },
        { id: 'beast_bone', name: '妖兽骨', quality: '凡品', use: '炼器', price: 46, description: '可磨成炼器粉末。' },
        { id: 'wolf_fang', name: '妖狼牙', quality: '良品', use: '炼器', price: 68, description: '锋利坚韧。' },
        { id: 'crimson_feather', name: '赤羽', quality: '灵品', use: '制符', price: 140, description: '火系符箓的上佳引材。' },
        { id: 'wood_essence', name: '青木精魄', quality: '玄品', use: '炼丹', price: 360, description: '藤妖体内凝出的生机精魄。' },
        { id: 'soul_crystal', name: '幽魂晶', quality: '地品', use: '炼器', price: 880, description: '幽泽深处的魂力结晶。' },
        { id: 'ancient_relic', name: '上古残片', quality: '仙品', use: '炼器', price: 6200, description: '可从中悟出失传阵纹。' }
    ],

    getItemById(id) {
        const catMap = {
            techniques: 'technique',
            pills: 'pill',
            talismans: 'talisman',
            equipment: 'equipment',
            materials: 'material'
        };
        for (const cat of ['techniques', 'pills', 'talismans', 'equipment', 'materials']) {
            const item = this[cat].find(i => i.id === id);
            if (item) return { ...item, category: catMap[cat], categoryName: { techniques: '功法', pills: '丹药', talismans: '符箓', equipment: '装备', materials: '材料' }[cat] };
        }
        return null;
    },

    getItemsByCategory(category) {
        const map = {
            '功法': 'techniques',
            '丹药': 'pills',
            '符箓': 'talismans',
            '装备': 'equipment',
            '材料': 'materials'
        };
        const key = map[category];
        return key ? this[key] : [];
    },

    getAllTradableItems() {
        return [
            ...this.techniques.map(i => ({ ...i, category: '功法' })),
            ...this.pills.map(i => ({ ...i, category: '丹药' })),
            ...this.talismans.map(i => ({ ...i, category: '符箓' })),
            ...this.equipment.map(i => ({ ...i, category: '装备' })),
            ...this.materials.map(i => ({ ...i, category: '材料' }))
        ];
    }
};
