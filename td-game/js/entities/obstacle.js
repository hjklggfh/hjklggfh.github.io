/**
 * Obstacle - blocks platform placement and line-of-sight.
 * Can be destroyed by towers for rewards.
 */
class Obstacle {
    /**
     * @param {string} type - 'chest' | 'rock' | 'tree'
     * @param {number} x - world x
     * @param {number} y - world y
     */
    constructor(type, x, y) {
        const cfg = GameConfig.obstacles[type];
        this.type = type;
        this.x = x;
        this.y = y;
        this.hp = cfg.hp;
        this.maxHP = cfg.hp;
        this.reward = cfg.rewardMin + Math.floor(Math.random() * (cfg.rewardMax - cfg.rewardMin + 1));
        this.color = cfg.color;
        this.icon = cfg.icon;
        this.radius = cfg.radius;
        this.blocksLOS = cfg.blocksLOS;
        this.alive = true;
        this.platform = null; // assigned when placed on a platform
    }

    takeDamage(amount) {
        if (!this.alive) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
    }

    die() {
        if (!this.alive) return;
        this.alive = false;
        Events.emit('obstacleDestroyed', this, this.reward);
    }

    getHPPercent() {
        return this.hp / this.maxHP;
    }

    /**
     * Check if this obstacle blocks a line segment from (x1,y1) to (x2,y2).
     * Uses circle-line segment intersection test.
     */
    blocksLine(x1, y1, x2, y2) {
        if (!this.blocksLOS || !this.alive) return false;

        const cx = this.x;
        const cy = this.y;
        const r = this.radius + 4; // slight buffer

        // Vector from line start to circle center
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;

        const a = dx * dx + dy * dy;
        if (a < 0.001) {
            // Line is a point
            return Math.sqrt(fx * fx + fy * fy) <= r;
        }

        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;
        let discriminant = b * b - 4 * a * c;

        if (discriminant < 0) return false;

        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        // Check if either intersection is on the segment [0, 1]
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
    }
}
