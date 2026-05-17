const GameState = {
    playerName: '',
    playerRank: '炼气',
    playerQi: 0,
    playerBaseStats: { hp: 100, atk: 10, def: 5, spd: 10 },
    currentHP: 100,
    maxHP: 100,
    playerLearnedTechniques: [],
    playerEquipped: { weapon: null, armor: null, accessory: null },
    playerGold: 500,
    inventory: [],
    encounterCooldown: 0,
    currentMapId: 'world-1',
    mapPositions: {
        'world-1': { x: 1600, y: 1600 },
        'world-2': { x: 1600, y: 1600 },
        'world-3': { x: 1600, y: 1600 }
    },
    discoveredCaves: {
        'world-1': [],
        'world-2': [],
        'world-3': []
    },
    npcFavorability: {},
    npcStates: {},
    questFlags: {},
    playTime: 0,

    reset() {
        this.playerName = '';
        this.playerRank = '炼气';
        this.playerQi = 0;
        this.playerBaseStats = { hp: 100, atk: 10, def: 5, spd: 10 };
        this.currentHP = 100;
        this.maxHP = 100;
        this.playerLearnedTechniques = [];
        this.playerEquipped = { weapon: null, armor: null, accessory: null };
        this.playerGold = 500;
        this.inventory = [];
        this.encounterCooldown = 0;
        this.currentMapId = 'world-1';
        this.mapPositions = {
            'world-1': { x: 1600, y: 1600 },
            'world-2': { x: 1600, y: 1600 },
            'world-3': { x: 1600, y: 1600 }
        };
        this.discoveredCaves = { 'world-1': [], 'world-2': [], 'world-3': [] };
        this.npcFavorability = {};
        this.npcStates = {};
        this.questFlags = {};
        this.playTime = 0;
    }
};
