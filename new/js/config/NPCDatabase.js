const NPCDatabase = {
    surnames: ['云', '风', '柳', '白', '墨', '叶', '苏', '萧', '林', '秦', '花', '月', '寒', '玄', '灵'],
    givenNames: ['逸', '尘', '清', '雪', '瑶', '轩', '宇', '然', '羽', '痕', '无', '极', '子', '道', '真'],

    dialogueTrees: {
        'generic_greeting': {
            id: 'generic_greeting',
            text: '道友安好，今日天气不错。',
            choices: [
                { text: '是啊，不知这附近可有什么机缘？', nextNode: 'generic_hint', effect: null },
                { text: '我这里有些丹药，想与你交易。', nextNode: 'generic_trade', effect: null },
                { text: '切磋一下如何？', nextNode: null, effect: null, action: 'spar' },
                { text: '告辞。', nextNode: null, effect: 'favorability -1' }
            ]
        },
        'generic_hint': {
            id: 'generic_hint',
            text: '听说附近有座隐秘洞府，若有缘者自会遇见。',
            choices: [
                { text: '多谢告知！', nextNode: null, effect: 'favorability +3' },
                { text: '能否带我前去？', nextNode: 'generic_refuse', effect: null }
            ]
        },
        'generic_trade': {
            id: 'generic_trade',
            text: '好说好说，道友请看。',
            choices: [
                { text: '开始交易', nextNode: null, effect: 'open_trade', action: 'trade' },
                { text: '算了。', nextNode: null, effect: null }
            ]
        },
        'generic_refuse': {
            id: 'generic_refuse',
            text: '机缘需自行寻觅，道友请自便。',
            choices: [
                { text: '好吧，告辞。', nextNode: null, effect: 'favorability -2' }
            ]
        }
    },

    generateName() {
        const s = this.surnames[Math.floor(Math.random() * this.surnames.length)];
        const g = this.givenNames[Math.floor(Math.random() * this.givenNames.length)];
        return s + g;
    },

    generateNPC(rank) {
        const ranks = ['炼气', '筑基', '金丹', '元婴', '化神'];
        const npcRank = rank || ranks[Math.floor(Math.random() * Math.min(3, ranks.length))];
        return {
            id: 'npc_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
            name: this.generateName(),
            rank: npcRank,
            favorability: 30 + Math.floor(Math.random() * 30),
            inventory: [],
            combatStats: {
                hp: 80 + Math.random() * 40,
                atk: 8 + Math.random() * 10,
                def: 3 + Math.random() * 8,
                spd: 5 + Math.random() * 10
            },
            dialogueTree: 'generic_greeting'
        };
    }
};
