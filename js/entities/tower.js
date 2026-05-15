/**
 * Tower entity - placed on platforms, auto-targets and shoots enemies.
 * Has HP, can be damaged, repaired, and destroyed.
 * Supports beam (laser) and AOE (artillery) attack modes.
 */
class Tower {
    constructor(data, x, y) {
        this.data = data;
        this.x = x;
        this.y = y;
        this.level = 1;
        this.cooldownTimer = 0;
        this.currentTarget = null;
        this.currentTargetType = 'enemy';
        this.angle = 0;
        this.id = Tower._nextId++;
        this.alive = true;

        // HP system: base HP * 1.2^(level-1)
        this.baseHP = data.towerHP || 30;
        this.maxHP = this.baseHP;
        this.hp = this.maxHP;

        // Laser beam visual state
        this.beamActive = false;
        this.beamTargetX = 0;
        this.beamTargetY = 0;
    }

    static _nextId = 1;

    get stats() { return this.data.levels[this.level - 1]; }
    get range() { return this.stats.range; }
    get fireRate() { return this.stats.fireRate; }
    get damage() { return this.stats.damage; }

    _recalcHP() {
        var mult = Math.pow(1.2, this.level - 1);
        this.maxHP = Math.round(this.baseHP * mult);
        this.hp = Math.min(this.hp, this.maxHP);
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            Events.emit('towerDestroyed', this);
        }
    }

    getHPPercent() { return this.maxHP > 0 ? this.hp / this.maxHP : 0; }

    getRepairCost() {
        if (this.hp >= this.maxHP) return 0;
        var missing = this.maxHP - this.hp;
        var ratio = missing / this.maxHP;
        return Math.max(1, Math.round(this.getSellValue() * GameConfig.repairCostRatio * ratio));
    }

    repair() {
        var cost = this.getRepairCost();
        if (cost <= 0) return 0;
        if (typeof GoldMgr !== 'undefined' && GoldMgr && !GoldMgr.spend(cost)) return 0;
        this.hp = this.maxHP;
        return cost;
    }

    _hasLineOfSight(targetX, targetY, obstacles) {
        if (!obstacles || obstacles.length === 0) return true;
        for (var i = 0; i < obstacles.length; i++) {
            var obs = obstacles[i];
            if (!obs.alive || !obs.blocksLOS) continue;
            if (obs.blocksLine(this.x, this.y, targetX, targetY)) return false;
        }
        return true;
    }

    findTarget(enemies, obstacles) {
        var self = this;
        var isLaser = this.data.isBeam === true;

        var inRange = [];
        for (var i = 0; i < enemies.length; i++) {
            var e = enemies[i];
            if (!e.alive) continue;
            var dx = e.x - this.x;
            var dy = e.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) > this.range) continue;
            if (!this._hasLineOfSight(e.x, e.y, obstacles)) continue;
            inRange.push(e);
        }

        if (inRange.length === 0) { this.currentTarget = null; return null; }

        // Keep current if still valid
        if (this.currentTarget && this.currentTarget.alive && this.currentTargetType === 'enemy') {
            var cdx = this.currentTarget.x - this.x;
            var cdy = this.currentTarget.y - this.y;
            if (Math.sqrt(cdx * cdx + cdy * cdy) <= this.range
                && this._hasLineOfSight(this.currentTarget.x, this.currentTarget.y, obstacles)) {
                return this.currentTarget;
            }
        }

        // Laser: prioritize boss, then frontmost (highest progress)
        if (isLaser) {
            var bossTarget = null;
            for (var j = 0; j < inRange.length; j++) {
                if (inRange[j].isBoss || inRange[j].data.id === 'boss') {
                    bossTarget = inRange[j];
                    break;
                }
            }
            if (bossTarget) {
                this.currentTarget = bossTarget;
                this.currentTargetType = 'enemy';
                return bossTarget;
            }
        }

        // Default: closest to end (highest progress)
        inRange.sort(function (a, b) { return b.progress - a.progress; });
        this.currentTarget = inRange[0];
        this.currentTargetType = 'enemy';
        return this.currentTarget;
    }

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
            if (dist > this.range) continue;
            // Check LOS against OTHER obstacles
            var blocked = false;
            for (var j = 0; j < obstacles.length; j++) {
                if (j === i) continue;
                var other = obstacles[j];
                if (!other.alive || !other.blocksLOS) continue;
                if (other.blocksLine(this.x, this.y, obs.x, obs.y)) { blocked = true; break; }
            }
            if (!blocked && dist < nearestDist) { nearestDist = dist; nearest = obs; }
        }
        if (nearest) { this.currentTarget = nearest; this.currentTargetType = 'obstacle'; }
        return nearest;
    }

    update(dt, enemies, obstacles) {
        if (!this.alive) return null;
        if (!obstacles) obstacles = [];

        this.cooldownTimer -= dt;

        var target = this.findTarget(enemies, obstacles);
        if (!target) target = this.findObstacleTarget(obstacles);
        if (!target) {
            this.beamActive = false;
            return null;
        }

        var tx = target.x;
        var ty = target.y;
        var dx = tx - this.x;
        var dy = ty - this.y;
        this.angle = Math.atan2(dy, dx);

        // Update beam visual state for laser
        if (this.data.isBeam) {
            this.beamActive = true;
            this.beamTargetX = tx;
            this.beamTargetY = ty;
        }

        if (this.cooldownTimer > 0) return null;

        this.cooldownTimer = 1 / this.fireRate;

        // Artillery AOE: target position is enemy position (not tracking projectile)
        if (this.data.isPulseAOE) {
            return {
                tower: this, target: null, targetType: "enemy",
                x: this.x, y: this.y,
                damage: this.damage, data: this.data,
                isPulse: true, pulseRadius: this.data.pulseRadius || 70
            };
        }
        if (this.data.isAOE) {
            return {
                tower: this,
                target: target,
                targetType: this.currentTargetType,
                x: tx, y: ty, // strike at enemy position
                damage: this.damage,
                data: this.data,
                isAOE: true,
                aoeRadius: this.data.aoeRadius || 40,
                dotDps: this.data.dotDps || 0,
                dotDuration: this.data.dotDuration || 0,
            };
        }

        // Normal projectile
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

    canUpgrade() { return this.level < 10 && this.alive; }
    getUpgradeCost() {
        if (this.level >= 10) return -1;
        return this.data.levels[this.level].upgradeCost;
    }

    upgrade() {
        if (this.level >= 10 || !this.alive) return false;
        this.level++;
        this._recalcHP();
        this.hp = this.maxHP;
        return true;
    }

    getSellValue() {
        var total = this.data.levels[0].upgradeCost;
        for (var i = 1; i < this.level; i++) total += this.data.levels[i].upgradeCost;
        return Math.floor(total * GameConfig.sellRefundRatio);
    }
}
