const GameConstants = {
    // Display
    GAME_WIDTH: 800,
    GAME_HEIGHT: 600,

    // Tile & Map
    TILE_SIZE: 32,
    MAP_WIDTH_TILES: 100,
    MAP_HEIGHT_TILES: 100,
    MAP_WIDTH_PX: 3200,
    MAP_HEIGHT_PX: 3200,

    // Player
    PLAYER_SPEED: 150,
    PLAYER_INTERACT_RANGE: 48,

    // NPC
    NPC_WANDER_RADIUS: 5,
    NPC_WANDER_IDLE_MIN: 1500,
    NPC_WANDER_IDLE_MAX: 4000,
    NPC_WALK_SPEED: 60,
    NPC_MAX_PER_MAP: 8,

    // Caves
    CAVES_PER_MAP: 4,
    CAVE_DISCOVERY_RADIUS: 48,
    CAVE_INTERIOR_SIZE: 10,

    // Maps
    MAP_NAMES: {
        'world-1': '凡尘大陆',
        'world-2': '灵域仙山',
        'world-3': '幽冥秘境'
    },

    MAP_THEMES: {
        'world-1': {
            ground: [0, 0, 0, 0, 1, 0, 2, 0],  // tile indices
            obstacleColor: 0x336633,
            groundColor: 0x2d5a1e,
            townColor: 0x8b7355,
            waterColor: 0x335588,
            decorColor: 0x44aa44,
            name: '凡尘大陆'
        },
        'world-2': {
            ground: [3, 3, 4, 3, 5, 3, 3, 4],
            obstacleColor: 0x888888,
            groundColor: 0x6a7a6a,
            townColor: 0xccbb88,
            waterColor: 0x8899aa,
            decorColor: 0xaaaaaa,
            name: '灵域仙山'
        },
        'world-3': {
            ground: [6, 6, 7, 6, 6, 7, 6, 7],
            obstacleColor: 0x442244,
            groundColor: 0x2a1a2e,
            townColor: 0x553355,
            waterColor: 0x662233,
            decorColor: 0x664444,
            name: '幽冥秘境'
        }
    },

    // Teleport
    TELEPORT_CONNECTIONS: [
        { from: 'world-1', to: 'world-2', cost: 200 },
        { from: 'world-2', to: 'world-1', cost: 200 },
        { from: 'world-2', to: 'world-3', cost: 500 },
        { from: 'world-3', to: 'world-2', cost: 500 },
        { from: 'world-1', to: 'world-3', cost: 800 },
        { from: 'world-3', to: 'world-1', cost: 800 },
    ],

    TELEPORT_LANDING_OFFSET: 64,

    // Inventory
    INVENTORY_BASE_CAPACITY: 20,
    INVENTORY_CAPACITY_PER_RANK: 10,

    // Save
    SAVE_SLOTS: 3,
    AUTO_SAVE_SLOT: 0,
    SAVE_KEY_PREFIX: 'xiuxian_save_',
    SAVE_VERSION: 1,
    AUTO_SAVE_INTERVAL: 300000,

    // Quality tiers
    QUALITY_COMMON: '凡品',
    QUALITY_RARE: '灵品',
    QUALITY_LEGENDARY: '仙品',

    QUALITY_COLORS: {
        '凡品': '#aaaaaa',
        '灵品': '#4488ff',
        '仙品': '#ff8800'
    },

    // Item categories
    CATEGORY_TECHNIQUE: '功法',
    CATEGORY_PILL: '丹药',
    CATEGORY_TALISMAN: '符箓',
    CATEGORY_EQUIPMENT: '装备',
    CATEGORY_MATERIAL: '材料',

    // Equipment slots
    SLOT_WEAPON: 'weapon',
    SLOT_ARMOR: 'armor',
    SLOT_ACCESSORY: 'accessory',

    // Pill types
    PILL_HEAL: 'heal',
    PILL_BUFF: 'buff',
    PILL_BREAKTHROUGH: 'breakthrough',

    // Combat
    COMBAT_FLEE_BASE_CHANCE: 0.4,
    COMBAT_FLEE_SPEED_FACTOR: 0.05,
    COMBAT_DAMAGE_MIN: 1,
    COMBAT_DEFENSE_RATIO: 0.5,
    COMBAT_TECHNIQUE_MULTIPLIER: 1.5,
    COMBAT_QI_REWARD_PER_ENEMY: 50,
    COMBAT_GOLD_REWARD_BASE: 20,
    ENCOUNTER_CHANCE_PER_STEP: 0.002,
    ENCOUNTER_COOLDOWN: 5000,

    // Monster templates
    MONSTERS: [
        { name: '小妖', hp: 40, atk: 8, def: 3, spd: 5, qiReward: 30, goldReward: 20, rarity: 'common' },
        { name: '妖狼', hp: 60, atk: 12, def: 5, spd: 8, qiReward: 50, goldReward: 35, rarity: 'common' },
        { name: '石魔', hp: 90, atk: 15, def: 12, spd: 3, qiReward: 70, goldReward: 50, rarity: 'uncommon' },
        { name: '邪修', hp: 70, atk: 18, def: 6, spd: 9, qiReward: 100, goldReward: 80, rarity: 'uncommon', hasTechnique: true },
        { name: '妖兽统领', hp: 150, atk: 25, def: 15, spd: 7, qiReward: 200, goldReward: 150, rarity: 'rare' },
        { name: '古魔残魂', hp: 250, atk: 35, def: 20, spd: 10, qiReward: 400, goldReward: 300, rarity: 'boss' },
    ],
};
