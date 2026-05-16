/**
 * Game - main controller that owns all state and runs the game loop.
 */
var Game = {
    state: 'BOOT',
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

    gameMode: 'normal',
    endlessWaveCount: 0,
    bossWaveCounter: 0,
    endlessStarted: false,

    lastTime: 0,
    gameSpeed: 1,
    paused: false,

    // ── Init ──

    init: function () {
        try {
            console.log('[Game] Initializing...');
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) throw new Error('Canvas not found');
            this.renderer = new Renderer(this.canvas);
            this.path = new BezierPath(GameConfig.pathPoints);
            this.state = 'MODE_SELECT';
            this.ui = new UIManager();
            this.ui.showModeSelection();
            console.log('[Game] Init complete.');
        } catch (e) {
            console.error('[Game] Init failed:', e);
            alert('Init error: ' + e.message);
        }
    },

    startGame: function (mode) {
        try {
            console.log('[Game] Starting:', mode);
            this.gameMode = mode;
            GameConfig.gameMode = mode;
            GameConfig.autoAdvanceWaves = false; // manual start for endless
            this.endlessWaveCount = 0;
            this.bossWaveCounter = 0;
            this.endlessStarted = false;
            this.paused = false;

            this.platforms = GameConfig.platforms.map(function (p, i) {
                return { id: i, x: p.x, y: p.y, tower: null };
            });

            this._spawnObstacles();

            this.goldMgr = new GoldManager();
            if (mode === 'endless') this.goldMgr.gold = GameConfig.endlessStartingGold;
            this.carrotMgr = new CarrotManager();
            this.waveMgr = new WaveManager(this.path);

            var self = this;
            this.waveMgr.onNeedNextWave = function () {
                if (self.gameMode === 'endless' && self.endlessStarted) {
                    self._startEndlessWave();
                }
            };

            window.GoldMgr = this.goldMgr;
            window.WaveMgr = this.waveMgr;

            this.ui.hideModeSelection();
            this.ui.updateGold(this.goldMgr.gold);

            this.input = new InputHandler(this.canvas, this.platforms, this.towers, this.obstacles);
            window.Input = this.input;

            this._wireEvents();
            this.state = 'PRE_WAVE';
            this.ui.updateHearts(this.carrotMgr.hp, this.carrotMgr.maxHP);

            if (mode === 'endless') {
                this.ui.updateWave('无尽模式 — 点击"开始无尽"');
                document.getElementById('btn-endless-start').style.display = 'block';
                document.getElementById('btn-next-wave').style.display = 'none';
            } else {
                this.ui.updateWave('准备战斗 — 点击"下一波"');
                document.getElementById('btn-next-wave').style.display = 'block';
            }

            this._showHUD();

            this.lastTime = performance.now();
            requestAnimationFrame(function (t) { self._loop(t); });
            console.log('[Game] Game started.');
        } catch (e) {
            console.error('[Game] startGame failed:', e);
            alert('Start error: ' + e.message);
        }
    },

    _showHUD: function () {
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('hud-right').style.display = 'flex';
        document.getElementById('btn-back').style.display = 'block';
    },

    // ── Obstacles ──

    _spawnObstacles: function () {
        this.obstacles = [];
        var types = Object.keys(GameConfig.obstacles);
        var wmap = { chest: 1, rock: 2, tree: 2 };
        var weighted = [];
        for (var ti = 0; ti < types.length; ti++) {
            var w = wmap[types[ti]] || 1;
            for (var j = 0; j < w; j++) weighted.push(types[ti]);
        }
        var count = GameConfig.obstacleCount || 8;
        var offR = GameConfig.obstacleOffsetRange || 60;
        for (var i = 0; i < count; i++) {
            var prog = 0.1 + Math.random() * 0.8;
            var pos = this.path.getPositionAt(prog);
            var dir = this.path.getDirectionAt(prog);
            var side = (Math.random() < 0.5) ? -1 : 1;
            var off = 40 + Math.random() * offR;
            var ox = pos.x + (-dir.y) * side * off;
            var oy = pos.y + dir.x * side * off;
            ox = Math.max(30, Math.min(994, ox));
            oy = Math.max(30, Math.min(738, oy));
            var tooClose = false;
            for (var pi = 0; pi < this.platforms.length; pi++) {
                var pdx = ox - this.platforms[pi].x;
                var pdy = oy - this.platforms[pi].y;
                if (Math.sqrt(pdx * pdx + pdy * pdy) < 35) { tooClose = true; break; }
            }
            if (tooClose) continue;
            var type = weighted[Math.floor(Math.random() * weighted.length)];
            var obs = new Obstacle(type, ox, oy);
            obs.platform = null;
            this.obstacles.push(obs);
        }
    },

    _spawnNewObstacles: function () {
        var types = Object.keys(GameConfig.obstacles);
        var wmap = { chest: 1, rock: 2, tree: 2 };
        var weighted = [];
        for (var ti = 0; ti < types.length; ti++) {
            var w = wmap[types[ti]] || 1;
            for (var j = 0; j < w; j++) weighted.push(types[ti]);
        }
        var count = 3;
        var offR = GameConfig.obstacleOffsetRange || 60;
        for (var i = 0; i < count; i++) {
            var prog = 0.1 + Math.random() * 0.8;
            var pos = this.path.getPositionAt(prog);
            var dir = this.path.getDirectionAt(prog);
            var side = (Math.random() < 0.5) ? -1 : 1;
            var off = 40 + Math.random() * offR;
            var ox = pos.x + (-dir.y) * side * off;
            var oy = pos.y + dir.x * side * off;
            ox = Math.max(30, Math.min(994, ox));
            oy = Math.max(30, Math.min(738, oy));
            var tooClose = false;
            for (var pi = 0; pi < this.platforms.length; pi++) {
                var pdx = ox - this.platforms[pi].x;
                var pdy = oy - this.platforms[pi].y;
                if (Math.sqrt(pdx * pdx + pdy * pdy) < 35) { tooClose = true; break; }
            }
            if (tooClose) continue;
            var type = weighted[Math.floor(Math.random() * weighted.length)];
            var obs = new Obstacle(type, ox, oy);
            obs.platform = null;
            this.obstacles.push(obs);
        }
    },

    // ── Events ──

    _wireEvents: function () {
        var self = this;

        Events.on('enemySpawned', function (enemy) { self.enemies.push(enemy); });

        Events.on('enemyDied', function (enemy, goldReward) {
            self.goldMgr.earn(goldReward);
            self.renderer.addExplosionEffect(enemy.x, enemy.y, enemy.isBoss ? 50 : 25);
            self.waveMgr.onEnemyDied();
        });

        Events.on('enemyExploded', function (enemy, radius, dmg) {
            // Bomber explosion damages nearby towers
            self.renderer.addExplosionEffect(enemy.x, enemy.y, radius);
            for (var i = 0; i < self.towers.length; i++) {
                var t = self.towers[i];
                if (!t.alive) continue;
                var dx = t.x - enemy.x;
                var dy = t.y - enemy.y;
                if (Math.sqrt(dx * dx + dy * dy) <= radius) {
                    t.takeDamage(dmg);
                }
            }
        });

        Events.on('towerDestroyed', function (tower) {
            // Free the platform
            for (var pi = 0; pi < self.platforms.length; pi++) {
                if (self.platforms[pi].tower === tower) {
                    self.platforms[pi].tower = null;
                    break;
                }
            }
            self.renderer.addExplosionEffect(tower.x, tower.y, 30);
            self.input.deselectAll();
        });

        Events.on('enemyLeaked', function (enemy, hpCost) {
            self.carrotMgr.takeDamage(hpCost);
            self.waveMgr.onEnemyLeaked();
        });

        Events.on('obstacleDestroyed', function (obstacle, reward) {
            if (reward > 0) self.goldMgr.earn(reward);
            self.renderer.addExplosionEffect(obstacle.x, obstacle.y, 20);
        });

        Events.on('buildTower', function (towerKey, platform) { self._buildTower(towerKey, platform); });
        Events.on('upgradeTower', function (tower) { self._upgradeTower(tower); });
        Events.on('sellTower', function (tower) { self._sellTower(tower); });
        Events.on('repairTower', function (tower) { self._repairTower(tower); });

        Events.on('waveEnded', function () { self.state = 'POST_WAVE'; });

        Events.on('allWavesComplete', function () {
            if (self.gameMode === 'endless') return;
            self.state = 'VICTORY';
            Events.emit('gameWon');
        });

        Events.on('gameWon', function () { self.state = 'VICTORY'; });
        Events.on('gameLost', function () { self.state = 'GAME_OVER'; });
    },

    // ── Tower Actions ──

    _buildTower: function (towerKey, platform) {
        if (platform.tower) return;
        var data = GameConfig.towers[towerKey];
        if (!data) return;
        var cost = data.levels[0].upgradeCost;
        if (!this.goldMgr.spend(cost)) return;
        var tower = new Tower(data, platform.x, platform.y);
        this.towers.push(tower);
        platform.tower = tower;
        this.input.deselectAll();
    },

    _upgradeTower: function (tower) {
        if (!tower.canUpgrade()) return;
        var cost = tower.getUpgradeCost();
        if (!this.goldMgr.spend(cost)) return;
        tower.upgrade();
        Events.emit('towerSelected', tower);
    },

    _sellTower: function (tower) {
        var value = tower.getSellValue();
        this.goldMgr.earn(value);
        for (var i = 0; i < this.platforms.length; i++) {
            if (this.platforms[i].tower === tower) { this.platforms[i].tower = null; break; }
        }
        var idx = this.towers.indexOf(tower);
        if (idx !== -1) this.towers.splice(idx, 1);
        this.input.deselectAll();
    },

    _repairTower: function (tower) {
        if (tower.hp >= tower.maxHP) return;
        var cost = tower.getRepairCost();
        if (cost <= 0) return;
        tower.repair();
        Events.emit('towerSelected', tower);
    },

    // ── Wave Control ──

    startNextWave: function () {
        if (this.state === 'GAME_OVER' || this.state === 'VICTORY') return;
        this.state = 'WAVE_ACTIVE';
        document.getElementById('btn-next-wave').style.display = 'none';
        document.getElementById('btn-endless-start').style.display = 'none';
        if (this.gameMode === 'endless') {
            this._startEndlessWave();
        } else {
            this.waveMgr.startNextWave();
        }
    },

    startEndlessWaves: function () {
        if (this.gameMode !== 'endless') return;
        this.endlessStarted = true;
        this.state = 'WAVE_ACTIVE';
        document.getElementById('btn-endless-start').style.display = 'none';
        GameConfig.autoAdvanceWaves = true;
        this._startEndlessWave();
    },

    _startEndlessWave: function () {
        this.endlessWaveCount++;
        var cfg = GameConfig.endless;
        var waveNum = this.endlessWaveCount;
        var isBossWave = (waveNum % cfg.bossWaveInterval === 0);

        if (waveNum > 1 && waveNum % 3 === 0) this._spawnNewObstacles();

        var entries = [];
        var waveName;

        if (waveNum <= GameConfig.waves.length && !isBossWave) {
            var preset = GameConfig.waves[waveNum - 1];
            entries = preset.entries.map(function (e) {
                return {
                    enemyId: e.enemyId,
                    count: Math.max(2, e.count + Math.floor(waveNum / 3)),
                    interval: Math.max(0.3, e.interval - waveNum * 0.02),
                    preDelay: e.preDelay
                };
            });
            waveName = '第' + waveNum + '波 (无尽)';
        } else {
            var baseCount = cfg.baseEnemyCount + Math.floor(waveNum * cfg.enemyCountGrowth / 5);
            var hpScale = Math.pow(cfg.hpScalePerWave, waveNum);
            var spdScale = Math.pow(cfg.speedScalePerWave, waveNum);
            var armorBonus = Math.floor(waveNum / 5) * cfg.armorGrowthPer5Wave;

            if (isBossWave) {
                this.bossWaveCounter++;
                var bossHpMult = Math.pow(cfg.bossHPMultiplier, this.bossWaveCounter);
                var bossSpdMult = Math.pow(cfg.bossSpeedMultiplier, this.bossWaveCounter);
                var bossArmor = 15 + this.bossWaveCounter * cfg.bossArmorGrowth;
                entries.push({ enemyId: 'boss', count: 1, interval: 0, preDelay: 0, _isBoss: true, _hpScale: hpScale * bossHpMult, _speedScale: spdScale * bossSpdMult, _armor: bossArmor });
                var escort = 3 + this.bossWaveCounter * 2;
                entries.push({ enemyId: 'heavy', count: escort, interval: 0.8, preDelay: 2, _hpScale: hpScale * 1.3, _speedScale: spdScale, _armor: armorBonus + 5 });
                entries.push({ enemyId: 'normal', count: baseCount + 5, interval: 0.4, preDelay: 4, _hpScale: hpScale, _speedScale: spdScale, _armor: armorBonus });
                waveName = '⚠️ Boss波 ' + this.bossWaveCounter + ' (第' + waveNum + '波)';
            } else {
                var types = ['normal', 'fast', 'heavy'];
                for (var t = 0; t < types.length; t++) {
                    var c = types[t] === 'normal' ? baseCount + 2 : types[t] === 'fast' ? Math.floor(baseCount * 0.6) : Math.floor(baseCount * 0.3);
                    if (c > 0) entries.push({ enemyId: types[t], count: c, interval: types[t] === 'heavy' ? 1.2 : types[t] === 'fast' ? 0.4 : 0.6, preDelay: entries.length === 0 ? 0 : 1.5, _hpScale: hpScale, _speedScale: spdScale, _armor: armorBonus });
                }
                // Bomber starts appearing after wave 10
                if (waveNum > 10) {
                    var bomberCount = Math.floor(waveNum / 5);
                    entries.push({ enemyId: 'bomber', count: bomberCount, interval: 1.0, preDelay: 2, _hpScale: hpScale, _speedScale: spdScale, _armor: armorBonus });
                }
                waveName = '第' + waveNum + '波 (无尽)';
            }
        }

        this.waveMgr.pushEndlessWave({ name: waveName, entries: entries, interWaveDelay: cfg.interWaveDelay, waveNumber: waveNum });
        this.waveMgr.startNextWave();
    },

    // ── Pause ──

    togglePause: function () {
        if (this.state === 'GAME_OVER' || this.state === 'VICTORY' || this.state === 'MODE_SELECT') return;
        this.paused = !this.paused;
        if (this.paused) {
            document.getElementById('pause-overlay').style.display = 'flex';
        } else {
            document.getElementById('pause-overlay').style.display = 'none';
            this.lastTime = performance.now();
        }
    },

    toggleSpeed: function () {
        this.gameSpeed = this.gameSpeed >= 2 ? 1 : 2;
        document.getElementById('btn-speed').textContent = this.gameSpeed + 'x';
    },

    // ── Main Loop ──

    _loop: function (timestamp) {
        var self = this;
        if (this.state === 'MODE_SELECT') { requestAnimationFrame(function (t) { self._loop(t); }); return; }

        if (this.state === 'GAME_OVER' || this.state === 'VICTORY') {
            this.renderer.clear();
            this.renderer.drawPath(this.path);
            this.renderer.drawPlatforms(this.platforms, this.input ? this.input.selectedPlatform : null);
            this.renderer.drawObstacles(this.obstacles, this.input ? this.input.selectedObstacle : null);
            this.renderer.drawTowers(this.towers, this.input ? this.input.selectedTower : null);
            this.renderer.drawEnemies(this.enemies);
            this.renderer.drawProjectiles(this.projectiles);
            return;
        }

        var rawDt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        var dt = Math.min(rawDt, 0.1) * (this.paused ? 0 : this.gameSpeed);

        this._update(dt);
        this._cleanup();
        this._render(dt);

        requestAnimationFrame(function (t) { self._loop(t); });
    },

    _update: function (dt) {
        this.waveMgr.update(dt);

        // Update enemies (pass all for boss healing)
        for (var i = 0; i < this.enemies.length; i++) this.enemies[i].update(dt, this.enemies);

        // Update towers + apply beam damage
        for (var j = 0; j < this.towers.length; j++) {
            var tower = this.towers[j];
            if (!tower.alive) continue;

            var fireData = tower.update(dt, this.enemies, this.obstacles);

            // Laser beam: deal continuous damage while beam is active
            if (tower.data.isBeam && tower.beamActive && tower.currentTarget && tower.currentTarget.alive && tower.currentTargetType === 'enemy') {
                // Beam deals damage per tick (fireRate times per second)
                if (fireData) {
                    // fireData indicates a "tick" just occurred (cooldown expired)
                    // Apply instant beam damage to target
                    var target = tower.currentTarget;
                    target.takeDamage(tower.damage, tower.data.armorPiercing === true);
                    // Beam splash
                    if (tower.data.hasSplash && tower.data.splashRadius > 0) {
                        for (var k = 0; k < this.enemies.length; k++) {
                            var e2 = this.enemies[k];
                            if (!e2.alive || e2 === target) continue;
                            var edx = e2.x - target.x;
                            var edy = e2.y - target.y;
                            if (Math.sqrt(edx * edx + edy * edy) <= tower.data.splashRadius) {
                                e2.takeDamage(tower.damage * 0.5, tower.data.armorPiercing === true);
                            }
                        }
                    }
                    // Don't create a projectile for beam towers
                    continue;
                }
                // Beam is active but cooling down, don't fire projectile
                continue;
            }

            if (fireData) {
                var proj = new Projectile(fireData);
                this.projectiles.push(proj);
                if (fireData.isPulse) this.renderer.addPulseEffect(fireData.x, fireData.y, fireData.pulseRadius || 70);
            }
        }

        // Update projectiles
        for (var p = 0; p < this.projectiles.length; p++) this.projectiles[p].update(dt);
    },

    _cleanup: function () {
        this.enemies = this.enemies.filter(function (e) { return e.alive; });
        this.projectiles = this.projectiles.filter(function (p) { return p.alive; });
        this.obstacles = this.obstacles.filter(function (o) { return o.alive; });

        // Remove destroyed towers
        var removedTowers = [];
        for (var i = 0; i < this.towers.length; i++) {
            if (!this.towers[i].alive) removedTowers.push(i);
        }
        for (var j = removedTowers.length - 1; j >= 0; j--) {
            this.towers.splice(removedTowers[j], 1);
        }
    },

    _render: function (dt) {
        this.renderer.clear();
        this.renderer.drawPath(this.path);
        this.renderer.drawPlatforms(this.platforms, this.input ? this.input.selectedPlatform : null);
        this.renderer.drawObstacles(this.obstacles, this.input ? this.input.selectedObstacle : null);
        this.renderer.drawTowers(this.towers, this.input ? this.input.selectedTower : null);
        this.renderer.drawEnemies(this.enemies);
        this.renderer.drawProjectiles(this.projectiles);
        this.renderer.drawEffects(dt);
    },

    // ── Public ──

    getEnemies: function () { return this.enemies; },

    restart: function () {
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.obstacles = [];
        this.endlessWaveCount = 0;
        this.bossWaveCounter = 0;
        this.endlessStarted = false;
        this.paused = false;
        document.getElementById('pause-overlay').style.display = 'none';

        for (var i = 0; i < this.platforms.length; i++) this.platforms[i].tower = null;
        this.goldMgr.reset();
        this.carrotMgr.reset();
        this.waveMgr = new WaveManager(this.path);
        window.WaveMgr = this.waveMgr;

        var self = this;
        this.waveMgr.onNeedNextWave = function () {
            if (self.gameMode === 'endless' && self.endlessStarted) self._startEndlessWave();
        };

        if (this.gameMode === 'endless') {
            this.goldMgr.gold = GameConfig.endlessStartingGold;
        }

        this._spawnObstacles();
        this.state = 'PRE_WAVE';
        this.gameSpeed = 1;
        document.getElementById('btn-speed').textContent = '1x';
        this.ui.hideGameOver();
        this.ui.updateGold(this.goldMgr.gold);
        this.ui.updateHearts(this.carrotMgr.hp, this.carrotMgr.maxHP);

        if (this.gameMode === 'endless') {
            this.ui.updateWave('无尽模式 — 点击"开始无尽"');
            document.getElementById('btn-endless-start').style.display = 'block';
            document.getElementById('btn-next-wave').style.display = 'none';
        } else {
            this.ui.updateWave('准备战斗');
            document.getElementById('btn-next-wave').style.display = 'block';
            document.getElementById('btn-endless-start').style.display = 'none';
        }

        this.input = new InputHandler(this.canvas, this.platforms, this.towers, this.obstacles);
        window.Input = this.input;
        this._wireEvents();
        this.lastTime = performance.now();
        var self2 = this;
        requestAnimationFrame(function (t) { self2._loop(t); });
    }
};

window.Game = Game;
