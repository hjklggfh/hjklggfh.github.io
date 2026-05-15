/**
 * Game - main controller that owns all state and runs the game loop.
 */
const Game = {
    // State
    state: 'BOOT',  // BOOT, MODE_SELECT, PRE_WAVE, WAVE_ACTIVE, POST_WAVE, PAUSED, GAME_OVER, VICTORY
    canvas: null,
    renderer: null,
    path: null,
    platforms: [],
    towers: [],
    enemies: [],
    projectiles: [],
    obstacles: [],
    input: null,
    ui: null,
    waveMgr: null,
    goldMgr: null,
    carrotMgr: null,

    // Game mode
    gameMode: 'normal',  // 'normal' | 'endless'
    endlessWaveCount: 0,
    bossWaveCounter: 0,

    // Timing
    lastTime: 0,
    gameSpeed: 1,

    // ── Initialization ──

    init() {
        try {
            console.log('[Game] Initializing...');

            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) throw new Error('Canvas #game-canvas not found');

            this.renderer = new Renderer(this.canvas);
            this.path = new BezierPath(GameConfig.pathPoints);

            // Show mode selection first
            this.state = 'MODE_SELECT';
            this.ui = new UIManager();
            this.ui.showModeSelection();

            console.log('[Game] Init complete. Awaiting mode selection.');
        } catch (e) {
            console.error('[Game] Init failed:', e);
            alert('游戏初始化失败: ' + e.message);
        }
    },

    /** Called by UI after player picks a mode. */
    startGame(mode) {
        try {
            console.log('[Game] Starting game mode:', mode);

            this.gameMode = mode;
            GameConfig.gameMode = mode;
            GameConfig.autoAdvanceWaves = (mode === 'endless');
            this.endlessWaveCount = 0;
            this.bossWaveCounter = 0;

            // Build platforms
            this.platforms = GameConfig.platforms.map((p, i) => ({
                id: i,
                x: p.x,
                y: p.y,
                tower: null,
            }));

            // Spawn obstacles on some platforms
            this._spawnObstacles();

            // Managers
            this.goldMgr = new GoldManager();
            if (mode === 'endless') {
                this.goldMgr.gold = GameConfig.endlessStartingGold;
            }
            this.carrotMgr = new CarrotManager();
            this.waveMgr = new WaveManager(this.path);

            // Endless mode: wire callback so WaveManager asks Game for new waves
            var self = this;
            this.waveMgr.onNeedNextWave = function () {
                if (self.gameMode === 'endless') {
                    self._startEndlessWave();
                }
            };

            // Expose globals for UI callbacks
            window.GoldMgr = this.goldMgr;
            window.WaveMgr = this.waveMgr;

            // UI (re-init after mode selection removed)
            this.ui.hideModeSelection();
            this.ui.updateGold(this.goldMgr.gold);

            // Input
            this.input = new InputHandler(this.canvas, this.platforms, this.towers, this.obstacles);
            window.Input = this.input;

            // Event wiring
            this._wireEvents();

            // Initial render
            this.state = 'PRE_WAVE';
            this.ui.updateHearts(this.carrotMgr.hp, this.carrotMgr.maxHP);

            if (mode === 'endless') {
                this.ui.updateWave('无尽模式 — 自动开始');
                setTimeout(() => this.startNextWave(), 1500);
            } else {
                this.ui.updateWave('准备战斗 — 点击"下一波"开始');
                document.getElementById('btn-next-wave').style.display = 'block';
            }

            // Start game loop
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this._loop(t));

            console.log('[Game] Game started successfully.');
        } catch (e) {
            console.error('[Game] startGame failed:', e);
            alert('游戏启动失败: ' + e.message);
        }
    },

    // ── Obstacles ──

    _spawnObstacles() {
        this.obstacles = [];
        var types = Object.keys(GameConfig.obstacles);
        var weights = { chest: 1, rock: 2, tree: 2 };

        var weighted = [];
        for (var ti = 0; ti < types.length; ti++) {
            var w = weights[types[ti]] || 1;
            for (var j = 0; j < w; j++) weighted.push(types[ti]);
        }

        var count = GameConfig.obstacleCount || 8;
        var offsetRange = GameConfig.obstacleOffsetRange || 60;

        for (var i = 0; i < count; i++) {
            // Place obstacle at random progress along the path, offset to side
            var progress = 0.1 + Math.random() * 0.8; // avoid start/end
            var pos = this.path.getPositionAt(progress);

            // Random side offset (perpendicular to path direction)
            var dir = this.path.getDirectionAt(progress);
            var perpX = -dir.y;
            var perpY = dir.x;
            var side = (Math.random() < 0.5) ? -1 : 1;
            var offset = 40 + Math.random() * offsetRange;

            var ox = pos.x + perpX * side * offset;
            var oy = pos.y + perpY * side * offset;

            // Clamp to canvas
            ox = Math.max(30, Math.min(994, ox));
            oy = Math.max(30, Math.min(738, oy));

            // Don't place on top of platforms
            var tooCloseToPlatform = false;
            for (var pi = 0; pi < this.platforms.length; pi++) {
                var dx = ox - this.platforms[pi].x;
                var dy2 = oy - this.platforms[pi].y;
                if (Math.sqrt(dx * dx + dy2 * dy2) < 35) {
                    tooCloseToPlatform = true;
                    break;
                }
            }
            if (tooCloseToPlatform) continue;

            var type = weighted[Math.floor(Math.random() * weighted.length)];
            var obs = new Obstacle(type, ox, oy);
            obs.platform = null; // not attached to any platform
            this.obstacles.push(obs);
        }
    },

    // ── Event Wiring ──

    _wireEvents() {
        // NOTE: Do NOT call Events.clear() — it would wipe UIManager's listeners
        // registered in its constructor during Game.init()

        Events.on('enemySpawned', (enemy) => {
            this.enemies.push(enemy);
        });

        Events.on('enemyDied', (enemy, goldReward) => {
            this.goldMgr.earn(goldReward);
            this.renderer.addExplosionEffect(enemy.x, enemy.y, enemy.isBoss ? 50 : 25);
            this.waveMgr.onEnemyDied();
        });

        Events.on('enemyLeaked', (enemy, hpCost) => {
            this.carrotMgr.takeDamage(hpCost);
            this.waveMgr.onEnemyLeaked();
        });

        Events.on('obstacleDestroyed', (obstacle, reward) => {
            if (reward > 0) {
                this.goldMgr.earn(reward);
            }
            this.renderer.addExplosionEffect(obstacle.x, obstacle.y, 20);
        });

        Events.on('buildTower', (towerKey, platform) => {
            console.log('[Game] buildTower event:', towerKey, 'at', platform.x, platform.y);
            this._buildTower(towerKey, platform);
        });

        Events.on('upgradeTower', (tower) => {
            this._upgradeTower(tower);
        });

        Events.on('sellTower', (tower) => {
            this._sellTower(tower);
        });

        Events.on('attackObstacle', (obstacle) => {
            // Player clicks an obstacle to target it
            this.input.selectObstacle(obstacle);
        });

        Events.on('platformSelected', () => {});
        Events.on('towerSelected', () => {});
        Events.on('obstacleSelected', () => {});

        Events.on('deselectAll', () => {});

        Events.on('waveEnded', (waveIndex) => {
            this.state = 'POST_WAVE';
        });

        Events.on('allWavesComplete', () => {
            if (this.gameMode === 'endless') {
                // In endless mode, "allWavesComplete" just means current wave is done
                // WaveManager will auto-start next via autoAdvanceWaves
                return;
            }
            this.state = 'VICTORY';
            Events.emit('gameWon');
        });

        Events.on('gameWon', () => {
            this.state = 'VICTORY';
        });

        Events.on('gameLost', () => {
            this.state = 'GAME_OVER';
        });
    },

    // ── Tower Actions ──

    _buildTower(towerKey, platform) {
        console.log('[Game] _buildTower:', towerKey, 'at', platform.x, platform.y);

        // Platform already occupied?
        if (platform.tower) {
            console.log('[Game] Platform already has tower');
            return;
        }

        var data = GameConfig.towers[towerKey];
        if (!data) {
            console.log('[Game] No tower data for key:', towerKey);
            return;
        }

        var cost = data.levels[0].upgradeCost;
        console.log('[Game] Tower cost:', cost, 'gold:', this.goldMgr.gold);
        if (!this.goldMgr.spend(cost)) {
            console.log('[Game] Cannot afford');
            return;
        }

        var tower = new Tower(data, platform.x, platform.y);
        this.towers.push(tower);
        platform.tower = tower;

        console.log('[Game] Tower built. Total towers:', this.towers.length);
        this.input.deselectAll();
    },

    _upgradeTower(tower) {
        if (!tower.canUpgrade()) return;
        const cost = tower.getUpgradeCost();
        if (!this.goldMgr.spend(cost)) return;
        tower.upgrade();
        Events.emit('towerSelected', tower);
    },

    _sellTower(tower) {
        const value = tower.getSellValue();
        this.goldMgr.earn(value);

        for (const plat of this.platforms) {
            if (plat.tower === tower) {
                plat.tower = null;
                break;
            }
        }

        const idx = this.towers.indexOf(tower);
        if (idx !== -1) this.towers.splice(idx, 1);

        this.input.deselectAll();
    },

    // ── Wave Control ──

    startNextWave() {
        if (this.state === 'GAME_OVER' || this.state === 'VICTORY') return;
        this.state = 'WAVE_ACTIVE';
        document.getElementById('btn-next-wave').style.display = 'none';

        if (this.gameMode === 'endless') {
            this._startEndlessWave();
        } else {
            this.waveMgr.startNextWave();
        }
    },

    // ── Endless Wave Generation ──

    _startEndlessWave() {
        this.endlessWaveCount++;
        var cfg = GameConfig.endless;
        var waveNum = this.endlessWaveCount;
        var isBossWave = (waveNum % cfg.bossWaveInterval === 0);

        // Check for new obstacles every 3 waves
        if (waveNum > 1 && waveNum % 3 === 0) {
            this._spawnNewObstacles();
        }

        let entries = [];
        let waveName;

        if (waveNum <= GameConfig.waves.length && !isBossWave) {
            // Use predefined waves for initial variety
            const preset = GameConfig.waves[waveNum - 1];
            entries = preset.entries.map(e => ({
                enemyId: e.enemyId,
                count: Math.max(2, e.count + Math.floor(waveNum / 3)),
                interval: Math.max(0.3, e.interval - waveNum * 0.02),
                preDelay: e.preDelay,
            }));
            waveName = `第${waveNum}波 (无尽)`;
        } else {
            // Procedural generation
            const baseCount = cfg.baseEnemyCount + Math.floor(waveNum * cfg.enemyCountGrowth / 5);
            const hpScale = Math.pow(cfg.hpScalePerWave, waveNum);
            const speedScale = Math.pow(cfg.speedScalePerWave, waveNum);
            const armorBonus = Math.floor(waveNum / 5) * cfg.armorGrowthPer5Wave;

            if (isBossWave) {
                this.bossWaveCounter++;
                // Super boss: heavily scaled
                const bossHpMult = Math.pow(cfg.bossHPMultiplier, this.bossWaveCounter);
                const bossSpeedMult = Math.pow(cfg.bossSpeedMultiplier, this.bossWaveCounter);
                const bossArmor = 15 + this.bossWaveCounter * cfg.bossArmorGrowth;

                entries.push({
                    enemyId: 'boss',
                    count: 1,
                    interval: 0,
                    preDelay: 0,
                    _isBoss: true,
                    _hpScale: hpScale * bossHpMult,
                    _speedScale: speedScale * bossSpeedMult,
                    _armor: bossArmor,
                });

                // Escort enemies
                const escortCount = 3 + this.bossWaveCounter * 2;
                entries.push({
                    enemyId: 'heavy',
                    count: escortCount,
                    interval: 0.8,
                    preDelay: 2,
                    _hpScale: hpScale * 1.3,
                    _speedScale: speedScale,
                    _armor: armorBonus + 5,
                });
                entries.push({
                    enemyId: 'normal',
                    count: baseCount + 5,
                    interval: 0.4,
                    preDelay: 4,
                    _hpScale: hpScale,
                    _speedScale: speedScale,
                    _armor: armorBonus,
                });

                waveName = `⚠️ Boss波 ${this.bossWaveCounter} (第${waveNum}波)`;
            } else {
                // Normal endless wave
                const types = ['normal', 'fast', 'heavy'];
                for (const type of types) {
                    const count = type === 'normal' ? baseCount + 2
                        : type === 'fast' ? Math.floor(baseCount * 0.6)
                        : Math.floor(baseCount * 0.3);
                    if (count > 0) {
                        entries.push({
                            enemyId: type,
                            count,
                            interval: type === 'heavy' ? 1.2 : type === 'fast' ? 0.4 : 0.6,
                            preDelay: entries.length === 0 ? 0 : 1.5,
                            _hpScale: hpScale,
                            _speedScale: speedScale,
                            _armor: armorBonus,
                        });
                    }
                }
                waveName = `第${waveNum}波 (无尽)`;
            }
        }

        // Push a synthetic wave to WaveManager
        this.waveMgr.pushEndlessWave({
            name: waveName,
            entries: entries,
            interWaveDelay: cfg.interWaveDelay,
            waveNumber: waveNum,
        });

        this.waveMgr.startNextWave();
    },

    /** Occasionally spawn new obstacles along the path. */
    _spawnNewObstacles() {
        var types = Object.keys(GameConfig.obstacles);
        var weighted = [];
        for (var ti = 0; ti < types.length; ti++) {
            var w = { chest: 1, rock: 2, tree: 2 }[types[ti]] || 1;
            for (var j = 0; j < w; j++) weighted.push(types[ti]);
        }

        var count = 3; // spawn 3 new obstacles
        var offsetRange = GameConfig.obstacleOffsetRange || 60;
        var self = this;

        for (var i = 0; i < count; i++) {
            var progress = 0.1 + Math.random() * 0.8;
            var pos = this.path.getPositionAt(progress);
            var dir = this.path.getDirectionAt(progress);
            var side = (Math.random() < 0.5) ? -1 : 1;
            var offset = 40 + Math.random() * offsetRange;
            var ox = pos.x + (-dir.y) * side * offset;
            var oy = pos.y + dir.x * side * offset;
            ox = Math.max(30, Math.min(994, ox));
            oy = Math.max(30, Math.min(738, oy));

            var tooClose = false;
            for (var pi = 0; pi < this.platforms.length; pi++) {
                var dx = ox - this.platforms[pi].x;
                var dy2 = oy - this.platforms[pi].y;
                if (Math.sqrt(dx * dx + dy2 * dy2) < 35) { tooClose = true; break; }
            }
            if (tooClose) continue;

            var type = weighted[Math.floor(Math.random() * weighted.length)];
            var obs = new Obstacle(type, ox, oy);
            obs.platform = null;
            this.obstacles.push(obs);
        }
    },

    toggleSpeed() {
        this.gameSpeed = this.gameSpeed >= 2 ? 1 : 2;
        document.getElementById('btn-speed').textContent = this.gameSpeed + 'x';
    },

    // ── Main Loop ──

    _loop(timestamp) {
        if (this.state === 'MODE_SELECT') {
            requestAnimationFrame((t) => this._loop(t));
            return;
        }

        if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            this.renderer.clear();
            this.renderer.drawPath(this.path);
            this.renderer.drawPlatforms(this.platforms, this.input?.selectedPlatform);
            this.renderer.drawObstacles(this.obstacles, this.input?.selectedObstacle);
            this.renderer.drawTowers(this.towers, this.input?.selectedTower);
            this.renderer.drawEnemies(this.enemies);
            this.renderer.drawProjectiles(this.projectiles);
            return;
        }

        const rawDt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = Math.min(rawDt, 0.1) * this.gameSpeed;

        this._update(dt);
        this._cleanup();
        this._render(dt);

        requestAnimationFrame((t) => this._loop(t));
    },

    _update(dt) {
        this.waveMgr.update(dt);

        // Update enemies (pass allEnemies for boss healing)
        for (const enemy of this.enemies) {
            enemy.update(dt, this.enemies);
        }

        // Update obstacles (heal decay only)
        for (const obs of this.obstacles) {
            if (!obs.alive) continue;
        }

        // Update towers (pass obstacles for LOS check)
        for (const tower of this.towers) {
            const fireData = tower.update(dt, this.enemies, this.obstacles);
            if (fireData) {
                this.projectiles.push(new Projectile(fireData));
            }
        }

        // Update projectiles
        for (const proj of this.projectiles) {
            proj.update(dt);
        }
    },

    _cleanup() {
        this.enemies = this.enemies.filter(e => {
            if (!e.alive && e.reachedEnd) return false;
            if (!e.alive && e.hp <= 0) return false;
            return true;
        });

        this.projectiles = this.projectiles.filter(p => p.alive);
        this.obstacles = this.obstacles.filter(o => o.alive);
    },

    _render(dt) {
        this.renderer.clear();
        this.renderer.drawPath(this.path);
        this.renderer.drawPlatforms(this.platforms, this.input?.selectedPlatform);
        this.renderer.drawObstacles(this.obstacles, this.input?.selectedObstacle);
        this.renderer.drawTowers(this.towers, this.input?.selectedTower);
        this.renderer.drawEnemies(this.enemies);
        this.renderer.drawProjectiles(this.projectiles);
        this.renderer.drawEffects(dt);
    },

    // ── Public API ──

    getEnemies() {
        return this.enemies;
    },

    restart() {
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.obstacles = [];
        this.platforms.forEach(p => p.tower = null);

        this.goldMgr.reset();
        this.carrotMgr.reset();
        this.waveMgr = new WaveManager(this.path);
        window.WaveMgr = this.waveMgr;
        var self2 = this;
        this.waveMgr.onNeedNextWave = function () {
            if (self2.gameMode === 'endless') {
                self2._startEndlessWave();
            }
        };
        this.endlessWaveCount = 0;
        this.bossWaveCounter = 0;

        if (this.gameMode === 'endless') {
            this.goldMgr.gold = GameConfig.endlessStartingGold;
            GameConfig.autoAdvanceWaves = true;
        } else {
            GameConfig.autoAdvanceWaves = false;
        }

        this._spawnObstacles();
        this.state = 'PRE_WAVE';
        this.gameSpeed = 1;

        // Re-create input handler with fresh array references
        this.input = new InputHandler(this.canvas, this.platforms, this.towers, this.obstacles);
        window.Input = this.input;
        document.getElementById('btn-speed').textContent = '1x';
        this.ui.hideGameOver();
        this.ui.updateGold(this.goldMgr.gold);
        this.ui.updateHearts(this.carrotMgr.hp, this.carrotMgr.maxHP);

        if (this.gameMode === 'endless') {
            this.ui.updateWave('无尽模式 — 自动开始');
            setTimeout(() => this.startNextWave(), 1500);
            document.getElementById('btn-next-wave').style.display = 'none';
        } else {
            this.ui.updateWave('准备战斗');
            document.getElementById('btn-next-wave').style.display = 'block';
        }

        this.lastTime = performance.now();
        requestAnimationFrame((t) => this._loop(t));
    },
};

window.Game = Game;
