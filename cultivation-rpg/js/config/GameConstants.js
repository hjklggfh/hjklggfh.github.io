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
    PLAYER_SPEED: 155,
    PLAYER_INTERACT_RANGE: 52,

    // NPC
    NPC_WANDER_RADIUS: 5,
    NPC_WANDER_IDLE_MIN: 1500,
    NPC_WANDER_IDLE_MAX: 4000,
    NPC_WALK_SPEED: 60,
    NPC_MAX_PER_MAP: 12,
    WORLD_DAY_MS: 360000,

    // Caves
    CAVES_PER_MAP_MIN: 3,
    CAVES_PER_MAP_MAX: 5,
    CAVES_PER_MAP: 4,
    CAVE_DISCOVERY_RADIUS: 48,
    CAVE_INTERIOR_SIZE: 10,

    // Maps
    MAP_NAMES: {
        'world-1': '青岚州',
        'world-2': '玄霄群峰',
        'world-3': '烬月幽泽'
    },

    MAP_THEMES: {
        'world-1': {
            ground: [0, 0, 0, 1, 1, 8, 0, 9],
            obstacleColor: 0x5b7865,
            groundColor: 0x7cae75,
            townColor: 0xc59761,
            waterColor: 0x3f93a6,
            decorColor: 0xf0d57a,
            skyColor: 0xd8f1e5,
            accentColor: 0xffd166,
            name: '青岚州'
        },
        'world-2': {
            ground: [10, 10, 11, 12, 10, 11, 0, 8],
            obstacleColor: 0xa5b7bb,
            groundColor: 0xb7d2c6,
            townColor: 0xd9c58b,
            waterColor: 0x8bc4d1,
            decorColor: 0xffffff,
            skyColor: 0xeaf7ff,
            accentColor: 0x9bffd0,
            name: '玄霄群峰'
        },
        'world-3': {
            ground: [13, 13, 14, 15, 13, 14, 8, 9],
            obstacleColor: 0x6d4d75,
            groundColor: 0x493c64,
            townColor: 0x8f6b55,
            waterColor: 0x7e4866,
            decorColor: 0xd0a0ff,
            skyColor: 0x170f22,
            accentColor: 0xff7ab6,
            name: '烬月幽泽'
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
        '凡品': '#d6d2c4',
        '良品': '#7fd17f',
        '灵品': '#58b8ff',
        '玄品': '#b485ff',
        '地品': '#ff9f43',
        '天品': '#ffdd66',
        '仙品': '#ff6bcb'
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
        { name: '青鬃妖狼', hp: 58, atk: 12, def: 5, spd: 10, qiReward: 55, goldReward: 28, rarity: 'common', drops: ['wolf_fang', 'beast_bone'] },
        { name: '雾林藤妖', hp: 72, atk: 10, def: 9, spd: 5, qiReward: 68, goldReward: 34, rarity: 'common', drops: ['spirit_herb', 'wood_essence'] },
        { name: '赤羽妖禽', hp: 66, atk: 16, def: 5, spd: 14, qiReward: 82, goldReward: 45, rarity: 'uncommon', drops: ['crimson_feather'] },
        { name: '岩甲石魈', hp: 130, atk: 20, def: 18, spd: 4, qiReward: 125, goldReward: 80, rarity: 'uncommon', drops: ['cold_iron', 'earth_core'] },
        { name: '巡山邪修', hp: 110, atk: 27, def: 10, spd: 12, qiReward: 180, goldReward: 130, rarity: 'rare', hasTechnique: true, drops: ['seal_paper', 'ink_jade'] },
        { name: '幽泽鬼将', hp: 230, atk: 42, def: 26, spd: 11, qiReward: 420, goldReward: 280, rarity: 'rare', drops: ['soul_crystal'] },
        { name: '古魔残魂', hp: 420, atk: 62, def: 36, spd: 16, qiReward: 900, goldReward: 620, rarity: 'boss', drops: ['ancient_relic'] },
    ],
};
