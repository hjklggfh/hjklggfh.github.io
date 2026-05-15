/**
 * Tower entity - placed on platforms, auto-targets and shoots enemies.
 * Line-of-sight blocked by obstacles.
 */
class Tower {
    /**
     * @param {object} data - TowerData from GameConfig.towers
     * @param {number} x - world x position
     * @param {number} y - world y position
     */
    constructor(data, x, y) {
        this.data = data;
        this.x = x;
        this.y = y;
        this.level = 1;
        this.cooldownTimer = 0;
        this.currentTarget = null;
        this.currentTargetType = 'enemy'; // 'enemy' | 'obstacle'
        this.angle = 0;

        this.id = Tower._nextId++;
    }

    static _nextId = 1;

    get stats() {
        return this.data.levels[this.level - 1];
    }

    get range() { return this.stats.range; }
    get fireRate() { return this.stats.fireRate; }
    get damage() { return this.stats.damage; }

    /**
     * Check if line-of-sight from tower to target is blocked by any obstacle.
     */
    _hasLineOfSight(targetX, targetY, obstacles) {
        if (!obstacles || obstacles.length === 0) return true;
        for (const obs of obstacles) {
            if (!obs.alive || !obs.blocksLOS) continue;
            if (obs.blocksLine(this.x, this.y, targetX, targetY)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find best enemy target. Priority: closest to end (highest progress).
     * Requires unobstructed line-of-sight.
     */
    findTarget(enemies, obstacles) {
        const inRange = enemies.filter(e => {
            if (!e.alive) return false;
            const dx = e.x - this.x;
            const dy = e.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) > this.range) return false;
            return this._hasLineOfSight(e.x, e.y, obstacles);
        });

        if (inRange.length > 0) {
            // Keep current if still valid
            if (this.currentTarget && this.currentTarget.alive && this.currentTargetType === 'enemy') {
                const dx = this.currentTarget.x - this.x;
                const dy = this.currentTarget.y - this.y;
                if (Math.sqrt(dx * dx + dy * dy) <= this.range
                    && this._hasLineOfSight(this.currentTarget.x, this.currentTarget.y, obstacles)) {
                    return this.currentTarget;
                }
            }

            // Sort by progress (descending = closest to end first)
            inRange.sort((a, b) => b.progress - a.progress);
            this.currentTarget = inRange[0];
            this.currentTargetType = 'enemy';
            return this.currentTarget;
        }

        return null;
    }

    /**
     * Find nearest obstacle target (lower priority than enemies).
     */
    findObstacleTarget(obstacles) {
        if (!obstacles || obstacles.length === 0) return null;

        var nearest = null;
        var nearestDist = this.range;

        for (var i = 0; i < obstacles.length; i++) {
            var obs = obstacles[i];
            if (!obs.alive) continue;
            var dx = obs.x - this.x;
            var dy = obs.y - this.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            // Check LOS against OTHER obstacles (skip self)
            var blocked = false;
            for (var j = 0; j < obstacles.length; j++) {
                if (j === i) continue; // skip the target itself
                var other = obstacles[j];
                if (!other.alive || !other.blocksLOS) continue;
                if (other.blocksLine(this.x, this.y, obs.x, obs.y)) {
                    blocked = true;
                    break;
                }
            }
            if (dist <= nearestDist && !blocked) {
                nearestDist = dist;
                nearest = obs;
            }
        }

        if (nearest) {
            this.currentTarget = nearest;
            this.currentTargetType = 'obstacle';
            return nearest;
        }
        return null;
    }

    /**
     * Update tower logic: targeting, cooldown, firing.
     * @param {number} dt - delta time
     * @param {Array<Enemy>} enemies
     * @param {Array<Obstacle>} obstacles
     * @returns {object|null} projectile fire data if fired, null otherwise
     */
    update(dt, enemies, obstacles = []) {
        this.cooldownTimer -= dt;

        // Priority 1: enemies
        let target = this.findTarget(enemies, obstacles);

        // Priority 2: obstacles (only if no enemies in range)
        if (!target) {
            target = this.findObstacleTarget(obstacles);
        }

        if (!target) return null;

        // Rotate toward target
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        this.angle = Math.atan2(dy, dx);

        if (this.cooldownTimer > 0) return null;

        // Fire
        this.cooldownTimer = 1 / this.fireRate;
        return {
            tower: this,
            target: target,
            targetType: this.currentTargetType,
            x: this.x,
            y: this.y,
            damage: this.damage,
            data: this.data,
        };
    }

    canUpgrade() {
        return this.level < 3;
    }

    getUpgradeCost() {
        if (this.level >= 3) return -1;
        return this.data.levels[this.level].upgradeCost;
    }

    upgrade() {
        if (this.level >= 3) return false;
        this.level++;
        return true;
    }

    getSellValue() {
        let totalCost = this.data.levels[0].upgradeCost;
        for (let i = 1; i < this.level; i++) {
            totalCost += this.data.levels[i].upgradeCost;
        }
        return Math.floor(totalCost * GameConfig.sellRefundRatio);
    }
}
