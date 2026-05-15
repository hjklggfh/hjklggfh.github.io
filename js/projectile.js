/**
 * Projectile entity - flies from tower toward target.
 * Supports: normal projectiles, AOE instant-strike (artillery), beam damage (laser).
 */
class Projectile {
    constructor(fireData) {
        var d = fireData.data;
        var s = d.levels[fireData.tower.level - 1];

        this.x = fireData.x;
        this.y = fireData.y;
        this.tower = fireData.tower;
        this.target = fireData.target;
        this.targetType = fireData.targetType;
        this.damage = fireData.damage;
        this.speed = (d.projectileSpeed || 8) * 60;
        this.alive = true;

        // AOE artillery: instant strike at target position
        this.isAOE = fireData.isAOE === true;
        this.aoeRadius = fireData.aoeRadius || 40;
        this.dotDps = fireData.dotDps || 0;
        this.dotDuration = fireData.dotDuration || 0;

        // Normal projectile effects
        this.hasSplash = d.hasSplash && !this.isAOE;
        this.splashRadius = d.splashRadius;
        this.isPenetrating = d.isPenetrating || this.isAOE;
        this.appliesSlow = d.appliesSlow && !this.isAOE;
        this.slowFactor = d.slowFactor;
        this.slowDuration = d.slowDuration;

        // Visual
        this.color = d.projectileColor;
        this.radius = this.isAOE ? 6 : 4;
        this.trail = [];
        this.maxTrailLength = 8;

        this.lifetime = this.isAOE ? 0.5 : 5;
        this.age = 0;

        // AOE applies instantly
        if (this.isAOE) this._applyAOE();
    }

    update(dt) {
        if (!this.alive) return;
        if (this.isAOE) {
            this.age += dt;
            if (this.age > this.lifetime) this.alive = false;
            return;
        }

        this.age += dt;
        if (this.age > this.lifetime) { this.alive = false; return; }

        var targetX, targetY;
        if (this.target && this.target.alive) {
            targetX = this.target.x;
            targetY = this.target.y;
        } else {
            this.alive = false;
            return;
        }

        var dx = targetX - this.x;
        var dy = targetY - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) { this._onHit(); return; }

        var moveDist = this.speed * dt;
        this.x += (dx / dist) * Math.min(moveDist, dist);
        this.y += (dy / dist) * Math.min(moveDist, dist);

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) this.trail.shift();

        var hitThreshold = this.targetType === 'obstacle' ? (this.target.radius + 4) : 10;
        if (dist < hitThreshold) this._onHit();
    }

    _applyAOE() {
        var enemies = window.Game && window.Game.getEnemies ? window.Game.getEnemies() : [];
        for (var i = 0; i < enemies.length; i++) {
            var enemy = enemies[i];
            if (!enemy.alive) continue;
            var dx = enemy.x - this.x;
            var dy = enemy.y - this.y;
            if (Math.sqrt(dx * dx + dy * dy) <= this.aoeRadius) {
                this._applyTo(enemy);
                // Apply DoT burn effect
                if (this.dotDps > 0) {
                    enemy.applyDot(this.dotDps, this.dotDuration);
                }
            }
        }
        // Also hit obstacles in AOE
        var obstacles = window.Game && window.Game.obstacles ? window.Game.obstacles : [];
        for (var j = 0; j < obstacles.length; j++) {
            var obs = obstacles[j];
            if (!obs.alive) continue;
            var odx = obs.x - this.x;
            var ody = obs.y - this.y;
            if (Math.sqrt(odx * odx + ody * ody) <= this.aoeRadius) {
                obs.takeDamage(this.damage);
            }
        }
    }

    _onHit() {
        if (this.targetType === 'obstacle') {
            if (this.target && this.target.alive) this.target.takeDamage(this.damage);
            this.alive = false;
            return;
        }

        var enemies = window.Game && window.Game.getEnemies ? window.Game.getEnemies() : [];

        if (this.hasSplash) {
            for (var i = 0; i < enemies.length; i++) {
                var enemy = enemies[i];
                if (!enemy.alive) continue;
                var dx = enemy.x - this.x;
                var dy = enemy.y - this.y;
                if (Math.sqrt(dx * dx + dy * dy) <= this.splashRadius) this._applyTo(enemy);
            }
        } else if (this.target && this.target.alive) {
            this._applyTo(this.target);
        }

        if (!this.isPenetrating) this.alive = false;
    }

    _applyTo(enemy) {
        enemy.takeDamage(this.damage);
        if (this.appliesSlow) enemy.applySlow(this.slowFactor, this.slowDuration);
    }
}
