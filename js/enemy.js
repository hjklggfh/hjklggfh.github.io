/**
 * Enemy entity that walks along a BezierPath.
 * Boss enemies have a healing aura that periodically heals nearby allies.
 */
class Enemy {
    /**
     * @param {object} data - EnemyData from GameConfig.enemies
     * @param {BezierPath} path
     * @param {boolean} [isBoss=false]
     */
    constructor(data, path, isBoss = false) {
        this.data = data;
        this.path = path;
        this.progress = 0;          // 0..1
        this.hp = data.maxHP;
        this.maxHP = data.maxHP;
        this.baseSpeed = data.moveSpeed;
        this.currentSpeed = data.moveSpeed;
        this.armor = data.armor;
        this.alive = true;
        this.reachedEnd = false;

        // Boss flag
        this.isBoss = isBoss;

        // Slow effect state
        this._slowFactor = 1;
        this._slowTimer = 0;

        // Position (world coords)
        this.x = 0;
        this.y = 0;

        // Visual
        this.radius = data.radius || 10;
        this.color = data.color;
        this.icon = data.icon;

        // Rewards
        this.goldReward = data.goldReward;
        this.hpLeakCost = data.hpLeakCost;

        // Flags
        this.isFlying = data.isFlying;
        this.isImmuneToSlow = data.isImmuneToSlow;

        // Effects
        this.activeEffects = [];

        // Boss healing aura (only active if isBoss)
        this._healTimer = 0;
        this.healRadius = GameConfig.endless.bossHealRadius;
        this.healPercent = GameConfig.endless.bossHealPercent;
        this.healInterval = GameConfig.endless.bossHealInterval;
        this._healPulseAlpha = 0;
    }

    /** Called each frame by Game. All enemies array is passed for boss healing lookup. */
    update(dt, allEnemies = null) {
        if (!this.alive) return;

        // Check reached end
        if (this.progress >= 1) {
            if (!this.reachedEnd) {
                this.reachedEnd = true;
                this.alive = false;
                Events.emit('enemyLeaked', this, this.hpLeakCost);
            }
            return;
        }

        // Update slow
        if (this._slowTimer > 0) {
            this._slowTimer -= dt;
            if (this._slowTimer <= 0) {
                this._slowFactor = 1;
            }
        }
        this.currentSpeed = this.baseSpeed * this._slowFactor;

        // Update DoT effects
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const eff = this.activeEffects[i];
            eff.remaining -= dt;
            if (eff.type === 'dot') {
                this.takeDamage(eff.dps * dt);
            }
            if (eff.remaining <= 0) {
                this.activeEffects.splice(i, 1);
            }
        }

        // Boss healing aura
        if (this.isBoss && allEnemies && allEnemies.length > 0) {
            this._healTimer -= dt;
            if (this._healTimer <= 0) {
                this._healTimer = this.healInterval;
                this._healAura(allEnemies);
            }
            // Decay pulse alpha
            this._healPulseAlpha = Math.max(0, this._healPulseAlpha - dt * 2);
        }

        // Move along path
        const dist = this.currentSpeed * dt;
        if (this.path.totalLength > 0) {
            this.progress += dist / this.path.totalLength;
        }
        this.progress = Math.min(1, this.progress);

        const pos = this.path.getPositionAt(this.progress);
        this.x = pos.x;
        this.y = pos.y;
    }

    /** Boss heals nearby enemies within healRadius. */
    _healAura(allEnemies) {
        let healedAny = false;
        for (const enemy of allEnemies) {
            if (enemy === this || !enemy.alive) continue;
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= this.healRadius) {
                const healAmount = enemy.maxHP * this.healPercent;
                enemy.hp = Math.min(enemy.maxHP, enemy.hp + healAmount);
                healedAny = true;
            }
        }
        if (healedAny) {
            this._healPulseAlpha = 1.0;
        }
    }

    takeDamage(baseDamage) {
        if (!this.alive) return;

        const effective = Math.max(1, baseDamage - this.armor);
        this.hp -= effective;

        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    /** Heal by a flat amount (used by boss aura). Can be called externally. */
    heal(amount) {
        if (!this.alive) return;
        this.hp = Math.min(this.maxHP, this.hp + amount);
    }

    applySlow(factor, duration) {
        if (this.isImmuneToSlow) return;
        this._slowFactor = Math.min(this._slowFactor, factor);
        this._slowTimer = Math.max(this._slowTimer, duration);
    }

    applyDot(dps, duration) {
        this.activeEffects.push({ type: 'dot', dps, remaining: duration });
    }

    die() {
        if (!this.alive) return;
        this.alive = false;
        Events.emit('enemyDied', this, this.goldReward);
    }

    getDistanceToEnd() {
        return this.path.getRemainingDistance(this.progress);
    }

    getHPPercent() {
        return this.hp / this.maxHP;
    }
}
