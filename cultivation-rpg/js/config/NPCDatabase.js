const NPCDatabase = {
    surnames: ['云', '风', '柳', '白', '墨', '叶', '苏', '萧', '林', '秦', '花', '月', '寒', '玄', '灵'],
    givenNames: ['逸', '尘', '清', '雪', '瑶', '轩', '宇', '然', '羽', '痕', '无极', '子真', '知微', '照夜', '听澜'],

    archetypes: [
        {
            id: 'herbalist',
            title: '采药师',
            personality: '谨慎温和，重视草木生机。',
            background: '常年往返雾林，熟知灵草分布和妖兽巢穴。',
            robe: '#6fbc72', inner: '#d7f1a8', hair: '#33291d', accent: '#f2d16b',
            home: '药庐', work: '灵草圃', evening: '茶摊',
            dialogueTree: 'herbalist_greeting',
            tradeTags: ['丹药', '材料']
        },
        {
            id: 'sword_guard',
            title: '巡山剑修',
            personality: '直率守信，厌恶邪修。',
            background: '曾是宗门外门弟子，负责巡视山道与传送阵。',
            robe: '#5a87d8', inner: '#e8eefc', hair: '#16191f', accent: '#b9d6ff',
            home: '值房', work: '城门', evening: '校场',
            dialogueTree: 'guard_greeting',
            tradeTags: ['武器', '符箓']
        },
        {
            id: 'merchant',
            title: '行商',
            personality: '精明健谈，消息灵通。',
            background: '经营跨州商路，常以洞府传闻换取人情。',
            robe: '#bd7f45', inner: '#ffe0a3', hair: '#282018', accent: '#7ee7d5',
            home: '客栈', work: '市集', evening: '酒肆',
            dialogueTree: 'merchant_greeting',
            tradeTags: ['丹药', '武器', '功法', '符箓', '材料']
        },
        {
            id: 'talisman_master',
            title: '符师',
            personality: '寡言严谨，凡事讲究因果。',
            background: '在旧观中修补残阵，能辨认洞府禁制。',
            robe: '#815fb5', inner: '#eadcff', hair: '#1d1725', accent: '#ffda7a',
            home: '旧观', work: '符室', evening: '碑林',
            dialogueTree: 'talisman_greeting',
            tradeTags: ['符箓', '材料']
        },
        {
            id: 'recluse',
            title: '散修',
            personality: '沉静疏离，只尊重有实力的人。',
            background: '早年探索洞府受伤，自此在城镇边缘闭关。',
            robe: '#56606b', inner: '#b4c3c7', hair: '#303030', accent: '#9bffd0',
            home: '竹舍', work: '崖台', evening: '河岸',
            dialogueTree: 'recluse_greeting',
            tradeTags: ['功法', '材料']
        },
        {
            id: 'young_noble',
            title: '世家子弟',
            personality: '骄矜好胜，但并非无礼。',
            background: '随家族长辈游历三州，搜罗稀有法器。',
            robe: '#d85c75', inner: '#fff0f0', hair: '#201515', accent: '#ffd7ef',
            home: '别院', work: '宝阁', evening: '观景台',
            dialogueTree: 'noble_greeting',
            tradeTags: ['装备', '功法']
        }
    ],

    dialogueTrees: {
        generic_greeting: {
            id: 'generic_greeting',
            text: '道友安好。此地山水有灵，但夜间妖气也重，行路多加小心。',
            choices: [
                { text: '打探消息', nextNode: 'generic_hint', effect: null },
                { text: '开始交易', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '切磋一下', nextNode: null, effect: null, action: 'spar', condition: 'npc_rank <= player_rank + 2' },
                { text: '告辞', nextNode: null, effect: 'favorability -1' }
            ]
        },
        generic_hint: {
            id: 'generic_hint',
            text: '近来地脉翻涌，森林和山脚常露出旧洞府入口。若见异光，不妨靠近探查。',
            choices: [
                { text: '多谢提醒', nextNode: null, effect: 'favorability +3' },
                { text: '还有别的传闻吗', nextNode: 'rumor_more', effect: null }
            ]
        },
        rumor_more: {
            id: 'rumor_more',
            text: '城镇可休息闭关，市集会随地域刷新货物。高阶修士通常不会在凡俗小镇久留。',
            choices: [
                { text: '记下了', nextNode: null, effect: 'favorability +2' }
            ]
        },
        herbalist_greeting: {
            id: 'herbalist_greeting',
            text: '我刚从林中回来，露重处多有凝露灵草，也常有妖狼循味而来。',
            choices: [
                { text: '请教采集路线', nextNode: 'herbalist_hint', effect: 'favorability +2' },
                { text: '买些丹药材料', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '切磋', nextNode: null, action: 'spar', condition: 'favorability >= 35' },
                { text: '告辞', nextNode: null, effect: null }
            ]
        },
        herbalist_hint: {
            id: 'herbalist_hint',
            text: '进入森林后沿浅色草径走，若脚下灵雾变浓，附近多半有洞府或珍稀材料。',
            choices: [{ text: '多谢', nextNode: null, effect: 'favorability +4' }]
        },
        guard_greeting: {
            id: 'guard_greeting',
            text: '山脉与大河不可硬闯。真想越界，找传送阵，别拿性命试阵风。',
            choices: [
                { text: '打听邪修踪迹', nextNode: 'guard_hint', effect: null },
                { text: '购置武器符箓', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '请赐教', nextNode: null, action: 'spar' },
                { text: '告辞', nextNode: null, effect: null }
            ]
        },
        guard_hint: {
            id: 'guard_hint',
            text: '邪修常在河湾和洞府外徘徊。他们修为不低，至少筑基后再主动招惹。',
            choices: [{ text: '明白', nextNode: null, effect: 'favorability +2' }]
        },
        merchant_greeting: {
            id: 'merchant_greeting',
            text: '货随山水转，消息也一样。你若有灵石，我有丹药、功法，也有洞府传闻。',
            choices: [
                { text: '看看货物', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '买一条传闻', nextNode: 'merchant_rumor', effect: 'favorability +1' },
                { text: '告辞', nextNode: null, effect: null }
            ]
        },
        merchant_rumor: {
            id: 'merchant_rumor',
            text: '每张大地图都有三到五处隐秘洞府。入口不会摆在城门口，山脚、林缘、河湾最值得找。',
            choices: [{ text: '这消息值了', nextNode: null, effect: 'favorability +3' }]
        },
        talisman_greeting: {
            id: 'talisman_greeting',
            text: '符不是纸，是借来的规矩。规矩用错，会先伤自己。',
            choices: [
                { text: '请看符箓', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '询问禁制', nextNode: 'talisman_hint', effect: null },
                { text: '告辞', nextNode: null, effect: null }
            ]
        },
        talisman_hint: {
            id: 'talisman_hint',
            text: '洞府内路径会变化，但宝箱灵光最难遮掩。探完就离开，旧禁制不会给第二次机会。',
            choices: [{ text: '受教', nextNode: null, effect: 'favorability +4' }]
        },
        recluse_greeting: {
            id: 'recluse_greeting',
            text: '喧闹处难见大道。若想突破，灵力够只是门槛，心性才是最后一道门。',
            choices: [
                { text: '请教突破', nextNode: 'recluse_hint', effect: 'favorability +2' },
                { text: '交换功法残卷', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '切磋印证', nextNode: null, action: 'spar', condition: 'npc_rank <= player_rank + 1' },
                { text: '告辞', nextNode: null, effect: null }
            ]
        },
        recluse_hint: {
            id: 'recluse_hint',
            text: '大境界跃升很大，越往后失败代价越重。准备突破丹，不丢人。',
            choices: [{ text: '记住了', nextNode: null, effect: 'favorability +3' }]
        },
        noble_greeting: {
            id: 'noble_greeting',
            text: '这地方虽偏，偶尔也有好东西。若你眼力够，或许能从洞府里捡到上古法器。',
            choices: [
                { text: '看看法器', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '比试一场', nextNode: null, action: 'spar' },
                { text: '告辞', nextNode: null, effect: null }
            ]
        }
    },

    generateName() {
        const s = this.surnames[Math.floor(Math.random() * this.surnames.length)];
        const g = this.givenNames[Math.floor(Math.random() * this.givenNames.length)];
        return s + g;
    },

    generateNPC(rank, mapId, index) {
        const ranksByMap = {
            'world-1': ['炼气', '炼气', '筑基', '筑基', '金丹'],
            'world-2': ['筑基', '筑基', '金丹', '元婴', '化神'],
            'world-3': ['金丹', '元婴', '化神', '炼虚']
        };
        const rankPool = ranksByMap[mapId] || CultivationData.rankOrder.slice(0, 4);
        const npcRank = rank || rankPool[Math.floor(Math.random() * rankPool.length)];
        const archetype = this.archetypes[index % this.archetypes.length];
        const stats = this._statsForRank(npcRank, archetype.id);
        const id = [mapId || 'world', archetype.id, index, Math.floor(Math.random() * 10000)].join('_');

        return {
            id,
            name: this.generateName(),
            title: archetype.title,
            archetype: archetype.id,
            rank: npcRank,
            favorability: 28 + Math.floor(Math.random() * 38),
            personality: archetype.personality,
            background: archetype.background,
            appearance: {
                robe: archetype.robe,
                inner: archetype.inner,
                hair: archetype.hair,
                accent: archetype.accent
            },
            routine: {
                home: archetype.home,
                work: archetype.work,
                evening: archetype.evening
            },
            tradeTags: archetype.tradeTags,
            inventory: [],
            combatStats: stats,
            dialogueTree: archetype.dialogueTree || 'generic_greeting'
        };
    },

    _statsForRank(rank, archetypeId) {
        const idx = Math.max(0, CultivationData.rankOrder.indexOf(rank));
        const scale = Math.pow(2.25, idx);
        const roleBonus = {
            herbalist: { hp: 1.0, atk: 0.85, def: 0.9, spd: 1.0 },
            sword_guard: { hp: 1.1, atk: 1.25, def: 1.05, spd: 1.05 },
            merchant: { hp: 0.95, atk: 0.9, def: 0.9, spd: 1.1 },
            talisman_master: { hp: 0.9, atk: 1.15, def: 0.95, spd: 1.0 },
            recluse: { hp: 1.15, atk: 1.2, def: 1.2, spd: 0.9 },
            young_noble: { hp: 1.05, atk: 1.15, def: 1.0, spd: 1.18 }
        }[archetypeId] || { hp: 1, atk: 1, def: 1, spd: 1 };
        return {
            hp: Math.floor((80 + idx * 45) * scale * roleBonus.hp),
            atk: Math.floor((10 + idx * 7) * scale * roleBonus.atk),
            def: Math.floor((5 + idx * 5) * scale * roleBonus.def),
            spd: Math.floor((7 + idx * 3) * roleBonus.spd + idx * 2)
        };
    }
};
