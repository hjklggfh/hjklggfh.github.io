/**
 * Projectile entity - flies from tower toward target (enemy or obstacle).
 */
class Projectile {
    /**
     * @param {object} fireData - from Tower.update()
     */
    constructor(fireData) {
        const d = fireData.data;
        const s = d.levels[fireData.tower.level - 1];

        this.x = fireData.x;
        this.y = fireData.y;
        this.target = fireData.target;       // Enemy or Obstacle
        this.targetType = fireData.targetType; // 'enemy' | 'obstacle'
        this.damage = fireData.damage;
        this.speed = d.projectileSpeed * 60; // convert to px/s
        this.alive = true;

        // Effects (only for enemy targeting)
        this.hasSplash = d.hasSplash && this.targetType === 'enemy';
        this.splashRadius = d.splashRadius;
        this.isPenetrating = d.isPenetrating;
        this.appliesSlow = d.appliesSlow && this.targetType === 'enemy';
        this.slowFactor = d.slowFactor;
        this.slowDuration = d.slowDuration;

        // Visual
        this.color = d.projectileColor;
        this.radius = 4;
        this.trail = [];
        this.maxTrailLength = 8;

        this.lifetime = 5;
        this.age = 0;
    }

    update(dt) {
        this.age += dt;
        if (this.age > this.lifetime) {
            this.alive = false;
            return;
        }

        // Move toward target
        let targetX, targetY;
        if (this.target && this.target.alive) {
            targetX = this.target.x;
            targetY = this.target.y;
        } else {
            this.alive = false;
            return;
        }

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 4) {
            this._onHit();
            return;
        }

        const moveDist = this.speed * dt;
        this.x += (dx / dist) * Math.min(moveDist, dist);
        this.y += (dy / dist) * Math.min(moveDist, dist);

        // Trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) this.trail.shift();

        // Check if close enough to hit
        const hitThreshold = this.targetType === 'obstacle' ? this.target.radius + 4 : 10;
        if (dist < hitThreshold) {
            this._onHit();
        }
    }

    _onHit() {
        if (this.targetType === 'obstacle') {
            // Deal damage to obstacle
            if (this.target && this.target.alive) {
                this.target.takeDamage(this.damage);
            }
            this.alive = false;
            return;
        }

        // Enemy targeting
        const enemies = Game.getEnemies ? Game.getEnemies() : [];

        if (this.hasSplash) {
            for (const enemy of enemies) {
                if (!enemy.alive) continue;
                const dx = enemy.x - this.x;
                const dy = enemy.y - this.y;
                if (Math.sqrt(dx * dx + dy * dy) <= this.splashRadius) {
                    this._applyTo(enemy);
                }
            }
        } else if (this.target && this.target.alive) {
            this._applyTo(this.target);
        }

        if (!this.isPenetrating) {
            this.alive = false;
        }
    }

    _applyTo(enemy) {
        enemy.takeDamage(this.damage);
        if (this.appliesSlow) {
            enemy.applySlow(this.slowFactor, this.slowDuration);
        }
    }
}
