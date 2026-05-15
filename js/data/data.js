/**
 * All game configuration data — replaces Unity ScriptableObjects.
 * Modify these objects to tune game balance.
 */
const GameConfig = {
    // ── Game Mode ──
    gameMode: 'normal',  // 'normal' or 'endless'
    endlessStartingGold: 300,
    carrotMaxHP: 10,

    // ── Economy ──
    startingGold: 200,
    sellRefundRatio: 0.5,
    repairCostRatio: 0.3,  // repair cost = 30% of sell value

    // ── Gameplay ──
    autoAdvanceWaves: false,  // endless mode always auto-advances
    defaultGameSpeed: 1,
    waveAnnounceDuration: 2000,

    // ── Obstacles ──
    obstacleCount: 8,         // number of obstacles to spawn along path
    obstacleOffsetRange: 60,  // max pixel offset from path center
    obstacles: {
        chest: {
            id: 'chest', name: '宝箱', icon: '📦', color: '#c8956c',
            hp: 30, radius: 16, blocksLOS: true,
            rewardMin: 50, rewardMax: 100,
        },
        rock: {
            id: 'rock', name: '石头', icon: '🪨', color: '#9e9e9e',
            hp: 100, radius: 18, blocksLOS: true,
            rewardMin: 0, rewardMax: 0,
        },
        tree: {
            id: 'tree', name: '树木', icon: '🌳', color: '#5d8c4a',
            hp: 60, radius: 20, blocksLOS: true,
            rewardMin: 20, rewardMax: 35,
        },
    },

    // ── Per-wave enemy scaling (applies to both modes) ──
    waveScaling: {
        hpPerWave: 1.06,       // +6% HP per wave
        speedPerWave: 1.015,    // +1.5% speed per wave
        armorPer3Waves: 1,     // +1 armor every 3 waves
    },

    // ── Endless Mode Config ──
    endless: {
        bossWaveInterval: 5,     // every 5 waves
        baseEnemyCount: 4,       // starting enemies per wave beyond predefined
        enemyCountGrowth: 2,     // +2 enemies per wave
        hpScalePerWave: 1.08,    // 8% HP increase per wave
        speedScalePerWave: 1.02, // 2% speed increase per wave
        armorGrowthPer5Wave: 2,  // +2 armor every 5 waves
        bossHPMultiplier: 1.5,   // boss HP multiplier per boss wave (cumulative)
        bossSpeedMultiplier: 1.15,
        bossArmorGrowth: 5,
        // Boss healing aura
        bossHealRadius: 120,
        bossHealPercent: 0.05,   // heal 5% maxHP per tick
        bossHealInterval: 2.0,   // seconds between heal ticks
        interWaveDelay: 3,       // shorter delay between endless waves
    },

    // ── Path control points (world coordinates) ──
    // Each group of 4 points = 1 cubic bezier segment
    // P0,P1,P2,P3 : P3 of segment N is P0 of segment N+1
    pathPoints: [
        // Segment 1: entry from left, curve down-right
        { x: 20,  y: 300 }, { x: 120, y: 300 }, { x: 180, y: 400 }, { x: 200, y: 480 },
        // Segment 2: curve right
        { x: 200, y: 480 }, { x: 220, y: 560 }, { x: 400, y: 560 }, { x: 500, y: 480 },
        // Segment 3: curve down-left
        { x: 500, y: 480 }, { x: 600, y: 400 }, { x: 600, y: 200 }, { x: 500, y: 120 },
        // Segment 4: curve right to exit
        { x: 500, y: 120 }, { x: 400, y: 40  }, { x: 800, y: 40  }, { x: 1010, y: 120 },
    ],

    // ── Platform positions (auto-generated along both sides of the path) ──
    // The init code in main.js will call GameConfig.generatePlatforms() to fill this
    platforms: [
        // Left side platforms (below path entry curve)
        { x: 30, y: 200 },  { x: 30, y: 280 },  { x: 30, y: 360 },
        { x: 110, y: 160 }, { x: 110, y: 240 }, { x: 110, y: 440 },
        // Around the first bend (left side of downward curve)
        { x: 80, y: 520 },  { x: 160, y: 540 }, { x: 80, y: 600 },
        // Bottom area (below horizontal section)
        { x: 240, y: 560 }, { x: 320, y: 560 }, { x: 400, y: 560 },
        { x: 240, y: 620 }, { x: 320, y: 620 }, { x: 400, y: 620 },
        // Right side of bottom path
        { x: 560, y: 560 }, { x: 640, y: 560 },
        { x: 540, y: 620 }, { x: 620, y: 620 }, { x: 700, y: 620 },
        { x: 780, y: 620 }, { x: 860, y: 620 }, { x: 940, y: 620 },
        // Middle area - right side
        { x: 560, y: 440 }, { x: 560, y: 360 }, { x: 560, y: 280 },
        { x: 640, y: 440 }, { x: 640, y: 360 }, { x: 640, y: 280 },
        { x: 720, y: 440 }, { x: 720, y: 360 }, { x: 720, y: 280 },
        // Top area - right side
        { x: 560, y: 80 },  { x: 640, y: 80 },  { x: 720, y: 80 },
        { x: 800, y: 80 },  { x: 880, y: 80 },  { x: 960, y: 80 },
        // Top area - left side of upper path
        { x: 420, y: 80 },  { x: 420, y: 160 }, { x: 340, y: 160 },
        { x: 340, y: 80 },  { x: 260, y: 160 },
        // Far left middle
        { x: 30, y: 440 },  { x: 30, y: 520 },
        // Bottom right corner
        { x: 860, y: 520 }, { x: 940, y: 520 },
        { x: 860, y: 440 }, { x: 940, y: 440 },
        { x: 860, y: 360 }, { x: 940, y: 360 },
        // Extra coverage
        { x: 160, y: 620 }, { x: 780, y: 520 },
        { x: 860, y: 160 }, { x: 940, y: 200 },
        { x: 700, y: 520 }, { x: 780, y: 440 },
    ],

    // ── Tower Definitions ──
    towers: {
        bottleCannon: {
            id: 'bottleCannon',
            name: '瓶子炮',
            type: 'BOTTLE',
            icon: '🔵',
            color: '#4da6ff',
            description: '单体攻击+溅射',
            projectileColor: '#88ccff',
            projectileSpeed: 10,
            hasSplash: true,
            splashRadius: 50,
            splashDamage: 40,
            isPenetrating: false,
            appliesSlow: false,
            slowFactor: 1,
            slowDuration: 0,
            towerHP: 40,
                                    levels: [
                { range: 120, fireRate: 1.5, damage: 20, upgradeCost: 100, sellValue: 50 },
                { range: 127, fireRate: 1.7, damage: 27, upgradeCost: 130, sellValue: 115 },
                { range: 134, fireRate: 1.8, damage: 34, upgradeCost: 169, sellValue: 200 },
                { range: 142, fireRate: 2, damage: 41, upgradeCost: 220, sellValue: 310 },
                { range: 149, fireRate: 2.1, damage: 48, upgradeCost: 286, sellValue: 453 },
                { range: 156, fireRate: 2.3, damage: 55, upgradeCost: 371, sellValue: 638 },
                { range: 163, fireRate: 2.4, damage: 62, upgradeCost: 483, sellValue: 880 },
                { range: 170, fireRate: 2.6, damage: 69, upgradeCost: 627, sellValue: 1193 },
                { range: 178, fireRate: 2.7, damage: 76, upgradeCost: 816, sellValue: 1601 },
                { range: 185, fireRate: 2.8, damage: 83, upgradeCost: -1, sellValue: 1601 }
            ]
        },
        iceStar: {
            id: 'iceStar',
            name: '冰冻星',
            type: 'ICE',
            icon: '❄️',
            color: '#80deea',
            description: '群体减速',
            projectileColor: '#b3e5fc',
            projectileSpeed: 6,
            hasSplash: true,
            splashRadius: 80,
            isPenetrating: false,
            appliesSlow: true,
            slowFactor: 0.4,
            slowDuration: 2.5,
            towerHP: 30,
                        levels: [
                { range: 100, fireRate: 0.8, damage: 8, upgradeCost: 120, sellValue: 60 },
                { range: 106, fireRate: 0.9, damage: 11, upgradeCost: 156, sellValue: 138 },
                { range: 112, fireRate: 1, damage: 14, upgradeCost: 203, sellValue: 240 },
                { range: 118, fireRate: 1, damage: 16, upgradeCost: 264, sellValue: 372 },
                { range: 124, fireRate: 1.1, damage: 19, upgradeCost: 343, sellValue: 543 },
                { range: 130, fireRate: 1.2, damage: 22, upgradeCost: 446, sellValue: 766 },
                { range: 136, fireRate: 1.3, damage: 25, upgradeCost: 579, sellValue: 1056 },
                { range: 142, fireRate: 1.4, damage: 28, upgradeCost: 753, sellValue: 1432 },
                { range: 148, fireRate: 1.4, damage: 30, upgradeCost: 979, sellValue: 1922 },
                { range: 154, fireRate: 1.5, damage: 33, upgradeCost: -1, sellValue: 1922 }
            ]
        },
        sunFlower: {
            id: 'sunFlower',
            name: '太阳花',
            type: 'FIRE',
            icon: '🌻',
            color: '#ffb74d',
            description: '范围穿透伤害',
            projectileColor: '#ffcc80',
            projectileSpeed: 7,
            hasSplash: true,
            splashRadius: 60,
            isPenetrating: true,
            appliesSlow: false,
            slowFactor: 1,
            slowDuration: 0,
            isPulseAOE: true,
            pulseRadius: 200,
            towerHP: 30,
                        levels: [
                { range: 110, fireRate: 1, damage: 20, upgradeCost: 150, sellValue: 75 },
                { range: 117, fireRate: 1.1, damage: 27, upgradeCost: 195, sellValue: 173 },
                { range: 123, fireRate: 1.2, damage: 34, upgradeCost: 254, sellValue: 300 },
                { range: 130, fireRate: 1.3, damage: 41, upgradeCost: 330, sellValue: 465 },
                { range: 136, fireRate: 1.4, damage: 48, upgradeCost: 428, sellValue: 679 },
                { range: 143, fireRate: 1.5, damage: 55, upgradeCost: 557, sellValue: 957 },
                { range: 150, fireRate: 1.6, damage: 62, upgradeCost: 724, sellValue: 1319 },
                { range: 156, fireRate: 1.7, damage: 69, upgradeCost: 941, sellValue: 1790 },
                { range: 163, fireRate: 1.8, damage: 76, upgradeCost: 1224, sellValue: 2402 },
                { range: 169, fireRate: 1.9, damage: 83, upgradeCost: -1, sellValue: 2402 }
            ]
        },
        rocket: {
            id: 'rocket',
            name: '火箭炮',
            type: 'FIRE',
            icon: '🚀',
            color: '#ef5350',
            description: '高伤害范围爆炸',
            projectileColor: '#ff8a80',
            projectileSpeed: 5,
            hasSplash: true,
            splashRadius: 100,
            isPenetrating: false,
            appliesSlow: false,
            slowFactor: 1,
            slowDuration: 0,
            towerHP: 40,
                        levels: [
                { range: 130, fireRate: 0.5, damage: 40, upgradeCost: 200, sellValue: 100 },
                { range: 138, fireRate: 0.6, damage: 54, upgradeCost: 260, sellValue: 230 },
                { range: 146, fireRate: 0.6, damage: 68, upgradeCost: 338, sellValue: 399 },
                { range: 153, fireRate: 0.7, damage: 82, upgradeCost: 439, sellValue: 619 },
                { range: 161, fireRate: 0.7, damage: 96, upgradeCost: 571, sellValue: 904 },
                { range: 169, fireRate: 0.8, damage: 110, upgradeCost: 743, sellValue: 1276 },
                { range: 177, fireRate: 0.8, damage: 124, upgradeCost: 965, sellValue: 1758 },
                { range: 185, fireRate: 0.9, damage: 138, upgradeCost: 1255, sellValue: 2386 },
                { range: 192, fireRate: 0.9, damage: 152, upgradeCost: 1631, sellValue: 3201 },
                { range: 200, fireRate: 1, damage: 166, upgradeCost: -1, sellValue: 3201 }
            ]
        },
        laserCannon: {
            id: 'laserCannon',
            name: '激光炮',
            type: 'LASER',
            icon: '⚡',
            color: '#e040fb',
            description: '激光束 · 优先Boss',
            projectileColor: '#ea80fc',
            projectileSpeed: 999,
            hasSplash: true,
            splashRadius: 20,
            isPenetrating: true,
            appliesSlow: false,
            slowFactor: 1,
            slowDuration: 0,
            isBeam: true,
            prioritizeBoss: true,
            towerHP: 30,
                        levels: [
                { range: 300, fireRate: 1, damage: 25, upgradeCost: 300, sellValue: 150 },
                { range: 318, fireRate: 1.1, damage: 32, upgradeCost: 390, sellValue: 345 },
                { range: 336, fireRate: 1.2, damage: 39, upgradeCost: 507, sellValue: 599 },
                { range: 354, fireRate: 1.3, damage: 46, upgradeCost: 659, sellValue: 928 },
                { range: 372, fireRate: 1.4, damage: 53, upgradeCost: 857, sellValue: 1357 },
                { range: 390, fireRate: 1.5, damage: 60, upgradeCost: 1114, sellValue: 1914 },
                { range: 408, fireRate: 1.6, damage: 67, upgradeCost: 1448, sellValue: 2638 },
                { range: 426, fireRate: 1.7, damage: 74, upgradeCost: 1882, sellValue: 3579 },
                { range: 444, fireRate: 1.8, damage: 81, upgradeCost: 2447, sellValue: 4802 },
                { range: 462, fireRate: 1.9, damage: 88, upgradeCost: -1, sellValue: 4802 }
            ]
        },
        artilleryCannon: {
            id: 'artilleryCannon',
            name: '火炮',
            type: 'FIRE',
            icon: '💥',
            color: '#ff7043',
            description: 'AOE灼伤 · 范围打击',
            projectileColor: '#ffab91',
            projectileSpeed: 999,
            hasSplash: true,
            splashRadius: 150,
            isPenetrating: true,
            appliesSlow: false,
            slowFactor: 1,
            slowDuration: 0,
            isAOE: true,
            aoeRadius: 40,
            appliesDot: true,
            dotDps: 10,
            dotDuration: 3,
            towerHP: 25,
                        levels: [
                { range: 250, fireRate: 2, damage: 50, upgradeCost: 350, sellValue: 175 },
                { range: 265, fireRate: 2.2, damage: 68, upgradeCost: 455, sellValue: 403 },
                { range: 280, fireRate: 2.4, damage: 85, upgradeCost: 592, sellValue: 699 },
                { range: 295, fireRate: 2.6, damage: 102, upgradeCost: 769, sellValue: 1083 },
                { range: 310, fireRate: 2.8, damage: 120, upgradeCost: 1000, sellValue: 1583 },
                { range: 325, fireRate: 3, damage: 138, upgradeCost: 1300, sellValue: 2233 },
                { range: 340, fireRate: 3.2, damage: 155, upgradeCost: 1689, sellValue: 3078 },
                { range: 355, fireRate: 3.4, damage: 173, upgradeCost: 2196, sellValue: 4176 },
                { range: 370, fireRate: 3.6, damage: 190, upgradeCost: 2855, sellValue: 5603 },
                { range: 385, fireRate: 3.8, damage: 208, upgradeCost: -1, sellValue: 5603 }
            ]
        }
    },

    // ── Enemy Definitions ──
    enemies: {
        normal: {
            id: 'normal',
            name: '小怪',
            icon: '👾',
            color: '#a0d468',
            maxHP: 80,
            moveSpeed: 80,
            armor: 0,
            goldReward: 10,
            hpLeakCost: 1,
            isFlying: false,
            isImmuneToSlow: false,
            radius: 10,
        },
        fast: {
            id: 'fast',
            name: '飞行怪',
            icon: '🦇',
            color: '#e8a0f0',
            maxHP: 40,
            moveSpeed: 180,
            armor: 0,
            goldReward: 15,
            hpLeakCost: 1,
            isFlying: true,
            isImmuneToSlow: true,
            radius: 8,
        },
        heavy: {
            id: 'heavy',
            name: '重甲怪',
            icon: '🛡️',
            color: '#8c8c8c',
            maxHP: 350,
            moveSpeed: 45,
            armor: 8,
            goldReward: 25,
            hpLeakCost: 2,
            isFlying: false,
            isImmuneToSlow: false,
            radius: 14,
        },
        boss: {
            id: 'boss',
            name: 'Boss',
            icon: '👹',
            color: '#ff5252',
            maxHP: 1200,
            moveSpeed: 40,
            armor: 15,
            goldReward: 100,
            hpLeakCost: 5,
            isFlying: false,
            isImmuneToSlow: true,
            radius: 22,
        },
        bomber: {
            id: 'bomber',
            name: '自爆怪',
            icon: '💣',
            color: '#ff9800',
            maxHP: 120,
            moveSpeed: 70,
            armor: 3,
            goldReward: 20,
            hpLeakCost: 2,
            isFlying: false,
            isImmuneToSlow: false,
            radius: 12,
            explodesOnDeath: true,
            explosionRadius: 100,
            explosionDamage: 15,
        },
    },

    // ── Wave Definitions ──
    waves: [
        {
            name: '第1波',
            entries: [
                { enemyId: 'normal', count: 5, interval: 1.0, preDelay: 0 },
            ],
            interWaveDelay: 4,
        },
        {
            name: '第2波',
            entries: [
                { enemyId: 'normal', count: 8, interval: 0.9, preDelay: 0 },
            ],
            interWaveDelay: 5,
        },
        {
            name: '第3波',
            entries: [
                { enemyId: 'normal', count: 5,  interval: 0.8, preDelay: 0 },
                { enemyId: 'fast',   count: 3,  interval: 0.6, preDelay: 2 },
            ],
            interWaveDelay: 5,
        },
        {
            name: '第4波',
            entries: [
                { enemyId: 'heavy',  count: 3,  interval: 1.5, preDelay: 0 },
                { enemyId: 'normal', count: 6,  interval: 0.8, preDelay: 2 },
            ],
            interWaveDelay: 5,
        },
        {
            name: '第5波',
            entries: [
                { enemyId: 'normal', count: 8,  interval: 0.6, preDelay: 0 },
                { enemyId: 'fast',   count: 6,  interval: 0.5, preDelay: 1 },
                { enemyId: 'heavy',  count: 2,  interval: 1.2, preDelay: 2 },
            ],
            interWaveDelay: 5,
        },
        {
            name: '第6波',
            entries: [
                { enemyId: 'heavy',  count: 5,  interval: 1.0, preDelay: 0 },
                { enemyId: 'fast',   count: 8,  interval: 0.4, preDelay: 2 },
            ],
            interWaveDelay: 6,
        },
        {
            name: '第7波',
            entries: [
                { enemyId: 'normal', count: 10, interval: 0.5, preDelay: 0 },
                { enemyId: 'heavy',  count: 4,  interval: 1.0, preDelay: 2 },
                { enemyId: 'fast',   count: 5,  interval: 0.5, preDelay: 3 },
            ],
            interWaveDelay: 6,
        },
        {
            name: 'Boss波',
            entries: [
                { enemyId: 'boss',   count: 1,  interval: 0,   preDelay: 0 },
                { enemyId: 'heavy',  count: 3,  interval: 1.0, preDelay: 3 },
                { enemyId: 'normal', count: 8,  interval: 0.5, preDelay: 5 },
            ],
            interWaveDelay: 8,
        },
    ],
};
