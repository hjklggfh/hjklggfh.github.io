/**
 * WaveManager - handles wave progression and enemy spawning.
 * Supports both predefined waves and dynamically pushed endless waves.
 */
class WaveManager {
    constructor(path) {
        this.path = path;
        this.waves = [...GameConfig.waves]; // shallow copy
        this.currentWaveIndex = -1;
        this.enemiesAlive = 0;
        this.isSpawning = false;
        this.waveActive = false;

        this._spawnQueue = [];
        this._spawnTimer = 0;
        this._spawnIndex = 0;
        this._entryIndex = 0;
        this._preDelay = 0;
        this._interWaveTimer = 0;
        this._waitingForClear = false;

        // Total waves: predefined count, but can grow in endless mode
        this._totalWaves = this.waves.length;

        // Callback for generating next wave (used by endless mode)
        this.onNeedNextWave = null;
    }

    startFirstWave() {
        this.currentWaveIndex = -1;
        this.startNextWave();
    }

    /** Push a procedurally generated wave for endless mode. */
    pushEndlessWave(waveDef) {
        this.waves.push(waveDef);
        this._totalWaves = this.waves.length;
    }

    startNextWave() {
        this.currentWaveIndex++;
        if (this.currentWaveIndex >= this.waves.length) {
            Events.emit('allWavesComplete');
            return;
        }

        const wave = this.waves[this.currentWaveIndex];
        this.isSpawning = true;
        this.waveActive = true;
        this._spawnQueue = [];
        this._entryIndex = 0;
        this._spawnIndex = 0;
        this._waitingForClear = false;

        // Build spawn queue from wave entries
        for (const entry of wave.entries) {
            const baseData = GameConfig.enemies[entry.enemyId];
            if (!baseData) {
                console.warn(`[WaveManager] Unknown enemy type: ${entry.enemyId}`);
                continue;
            }

            // Clone and scale enemy data for endless mode AND per-wave scaling
            var enemyData = Object.assign({}, baseData);
            var waveNum = wave.waveNumber || this.currentWaveIndex + 1;
            var wcfg = GameConfig.waveScaling || {};

            // Apply global per-wave scaling (both normal and endless)
            var hpScale = Math.pow(wcfg.hpPerWave || 1.06, waveNum - 1);
            var spdScale = Math.pow(wcfg.speedPerWave || 1.015, waveNum - 1);
            var armorBonus = Math.floor((waveNum - 1) / 3) * (wcfg.armorPer3Waves || 1);

            enemyData.maxHP = Math.round(baseData.maxHP * hpScale);
            enemyData.moveSpeed = Math.round(baseData.moveSpeed * spdScale);
            enemyData.armor = baseData.armor + armorBonus;

            // Apply additional endless-mode scaling on top
            if (entry._hpScale) enemyData.maxHP = Math.round(enemyData.maxHP * entry._hpScale);
            if (entry._speedScale) enemyData.moveSpeed = Math.round(enemyData.moveSpeed * entry._speedScale);
            if (entry._armor !== undefined) enemyData.armor = entry._armor;

            // Boss flag
            const isBoss = entry._isBoss === true;

            for (let i = 0; i < entry.count; i++) {
                this._spawnQueue.push({
                    enemyData,
                    interval: entry.interval,
                    preDelay: (i === 0) ? entry.preDelay : 0,
                    isBoss,
                });
            }
        }

        if (this._spawnQueue.length > 0) {
            this._preDelay = this._spawnQueue[0].preDelay;
        }

        this._spawnTimer = 0;

        Events.emit('waveStarted', waveNum, this._totalWaves, wave.name);
    }

    update(dt) {
        if (!this.isSpawning) {
            if (this._waitingForClear && GameConfig.autoAdvanceWaves) {
                this._interWaveTimer -= dt;
                if (this._interWaveTimer <= 0) {
                    this._waitingForClear = false;
                    if (this.onNeedNextWave) {
                        this.onNeedNextWave();
                    } else {
                        this.startNextWave();
                    }
                }
            }
            return;
        }

        if (this._preDelay > 0) {
            this._preDelay -= dt;
            return;
        }

        this._spawnTimer -= dt;
        if (this._spawnTimer > 0) return;

        if (this._spawnIndex < this._spawnQueue.length) {
            const entry = this._spawnQueue[this._spawnIndex];
            const enemy = new Enemy(entry.enemyData, this.path, entry.isBoss);
            this.enemiesAlive++;
            Events.emit('enemySpawned', enemy);
            this._spawnTimer = entry.interval;
            this._spawnIndex++;
        } else {
            this.isSpawning = false;
            this._waitingForClear = true;
            const wave = this.waves[this.currentWaveIndex];
            this._interWaveTimer = wave.interWaveDelay || 3;
        }
    }

    onEnemyDied() {
        this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);
        this._checkWaveClear();
    }

    onEnemyLeaked() {
        this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);
        this._checkWaveClear();
    }

    _checkWaveClear() {
        if (!this._waitingForClear) return;
        if (this.enemiesAlive <= 0 && !this.isSpawning) {
            this.waveActive = false;
            Events.emit('waveEnded', this.currentWaveIndex + 1);
        }
    }

    hasMoreWaves() {
        return this.currentWaveIndex < this.waves.length - 1;
    }

    getCurrentWaveIndex() {
        return this.currentWaveIndex;
    }

    getTotalWaves() {
        return this._totalWaves;
    }
}
