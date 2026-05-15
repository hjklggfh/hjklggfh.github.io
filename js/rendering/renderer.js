/**
 * Renderer - draws all game entities and effects onto the canvas.
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Effects pool
        this.effects = [];
    }

    clear() {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, '#4a8c3f');
        grad.addColorStop(0.3, '#3d7235');
        grad.addColorStop(1, '#2d5a27');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < this.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }

    drawPath(path) {
        const ctx = this.ctx;

        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 36;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        this._tracePath(ctx, path);
        ctx.stroke();

        ctx.strokeStyle = '#c9a96e';
        ctx.lineWidth = 28;
        ctx.beginPath();
        this._tracePath(ctx, path);
        ctx.stroke();

        ctx.strokeStyle = '#ddc08a';
        ctx.lineWidth = 18;
        ctx.beginPath();
        this._tracePath(ctx, path);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        this._tracePath(ctx, path);
        ctx.stroke();
        ctx.setLineDash([]);

        this._drawPathMarker(ctx, path.getStartPoint(), '#4caf50', '起点');
        this._drawPathMarker(ctx, path.getEndPoint(), '#f44336', '终点');
    }

    _tracePath(ctx, path) {
        const steps = 200;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pt = path.getPositionAt(t);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        }
    }

    _drawPathMarker(ctx, pos, color, label) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, pos.x, pos.y);
    }

    // ── Platforms ──

    drawPlatforms(platforms, selectedPlatform) {
        for (const plat of platforms) {
            const isSelected = plat === selectedPlatform;
            const hasTower = plat.tower !== undefined && plat.tower !== null;

            if (hasTower) {
                this.ctx.strokeStyle = isSelected ? '#ffeb3b' : 'rgba(255,255,255,0.2)';
                this.ctx.lineWidth = isSelected ? 3 : 1.5;
                this.ctx.beginPath();
                this.ctx.arc(plat.x, plat.y, 32, 0, Math.PI * 2);
                this.ctx.stroke();
            } else {
                const alpha = isSelected ? 0.7 : 0.35;
                this.ctx.fillStyle = `rgba(129,199,132,${alpha})`;
                this.ctx.beginPath();
                this.ctx.arc(plat.x, plat.y, 20, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = isSelected ? '#ffeb3b' : 'rgba(255,255,255,0.4)';
                this.ctx.lineWidth = isSelected ? 3 : 1.5;
                this.ctx.stroke();

                // Small plus icon
                this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
                this.ctx.lineWidth = 1.5;
                this.ctx.beginPath();
                this.ctx.moveTo(plat.x - 8, plat.y);
                this.ctx.lineTo(plat.x + 8, plat.y);
                this.ctx.moveTo(plat.x, plat.y - 8);
                this.ctx.lineTo(plat.x, plat.y + 8);
                this.ctx.stroke();
            }
        }
    }

    // ── Obstacles ──

    drawObstacles(obstacles, selectedObstacle) {
        const ctx = this.ctx;

        for (const obs of obstacles) {
            if (!obs.alive) continue;

            const isSelected = obs === selectedObstacle;

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(obs.x, obs.y + 3, obs.radius * 0.8, obs.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = obs.color;
            ctx.beginPath();
            ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#fff' : 'rgba(0,0,0,0.4)';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.stroke();

            // Selection ring
            if (isSelected) {
                ctx.strokeStyle = '#ffeb3b';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.radius + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Icon
            ctx.font = `${obs.radius * 0.9}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obs.icon, obs.x, obs.y);

            // HP bar (when damaged)
            if (obs.hp < obs.maxHP) {
                const barW = obs.radius * 1.8;
                const barH = 4;
                const barY = obs.y - obs.radius - 8;
                const hpPct = obs.getHPPercent();

                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(obs.x - barW / 2, barY, barW, barH);

                const hpColor = hpPct > 0.5 ? '#8d6e63' : hpPct > 0.25 ? '#ff9800' : '#f44336';
                ctx.fillStyle = hpColor;
                ctx.fillRect(obs.x - barW / 2, barY, barW * hpPct, barH);
            }
        }
    }

    // ── Towers ──

    drawTowers(towers, selectedTower) {
        var ctx = this.ctx;

        for (var ti = 0; ti < towers.length; ti++) {
            var tower = towers[ti];
            if (!tower.alive) continue;

            var isSelected = tower === selectedTower;

            // Laser beam line
            if (tower.data.isBeam && tower.beamActive && tower.currentTarget && tower.currentTarget.alive) {
                ctx.strokeStyle = tower.data.projectileColor;
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.7;
                ctx.beginPath();
                ctx.moveTo(tower.x, tower.y);
                ctx.lineTo(tower.beamTargetX, tower.beamTargetY);
                ctx.stroke();
                ctx.globalAlpha = 1;
                // Glow
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(tower.x, tower.y);
                ctx.lineTo(tower.beamTargetX, tower.beamTargetY);
                ctx.stroke();
            }

            if (isSelected) {
                ctx.fillStyle = 'rgba(255,255,255,0.06)';
                ctx.beginPath();
                ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            var baseRadius = 16 + tower.level * 4;
            ctx.fillStyle = tower.data.color;
            ctx.beginPath();
            ctx.arc(tower.x, tower.y, baseRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isSelected ? '#fff' : 'rgba(0,0,0,0.3)';
            ctx.lineWidth = isSelected ? 2.5 : 1.5;
            ctx.stroke();

            ctx.font = (14 + tower.level * 2) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(tower.data.icon, tower.x, tower.y);

            // Barrel (non-beam towers)
            if (!tower.data.isBeam) {
                var barrelLen = 14 + tower.level * 3;
                ctx.strokeStyle = 'rgba(255,255,255,0.8)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(tower.x, tower.y);
                ctx.lineTo(tower.x + Math.cos(tower.angle) * barrelLen, tower.y + Math.sin(tower.angle) * barrelLen);
                ctx.stroke();
            }

            // Level stars
            for (var si = 0; si < tower.level; si++) {
                var sx = tower.x - 10 + si * 10;
                var sy = tower.y - baseRadius - 8;
                ctx.fillStyle = '#ffd700';
                ctx.font = '10px sans-serif';
                ctx.fillText('★', sx, sy);
            }

            // HP bar (if damaged)
            var hpPct = tower.getHPPercent();
            if (hpPct < 1) {
                var barW = 28;
                var barH = 3;
                var barY = tower.y + baseRadius + 8;
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(tower.x - barW / 2, barY, barW, barH);
                var hpColor = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
                ctx.fillStyle = hpColor;
                ctx.fillRect(tower.x - barW / 2, barY, barW * hpPct, barH);
            }
        }
    }

    // ── Enemies ──

    drawEnemies(enemies) {
        const ctx = this.ctx;

        for (const enemy of enemies) {
            if (!enemy.alive) continue;

            // Flying offset
            const yOff = enemy.isFlying ? Math.sin(Date.now() / 200 + enemy.progress * 50) * 5 : 0;
            const ey = enemy.y + yOff;

            // Boss glow / healing aura ring
            if (enemy.isBoss) {
                const pulseAlpha = 0.15 + (enemy._healPulseAlpha || 0) * 0.35;
                ctx.fillStyle = `rgba(255,50,50,${pulseAlpha})`;
                ctx.beginPath();
                ctx.arc(enemy.x, ey, enemy.healRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = `rgba(255,80,80,${pulseAlpha + 0.15})`;
                ctx.lineWidth = 2;
                ctx.setLineDash([8, 6]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.beginPath();
            ctx.ellipse(enemy.x, enemy.y + 2, enemy.radius * 0.8, enemy.radius * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            ctx.arc(enemy.x, ey, enemy.radius, 0, Math.PI * 2);
            ctx.fill();

            // Boss extra visual
            if (enemy.isBoss) {
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 3;
            } else {
                ctx.strokeStyle = 'rgba(0,0,0,0.4)';
                ctx.lineWidth = 1.5;
            }
            ctx.stroke();

            // Icon
            ctx.font = `${enemy.radius}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(enemy.data.icon, enemy.x, ey);

            // Slow effect indicator
            if (enemy._slowFactor < 1 && enemy._slowTimer > 0) {
                ctx.strokeStyle = 'rgba(100,180,255,0.7)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(enemy.x, ey, enemy.radius + 4, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Health bar
            if (enemy.hp < enemy.maxHP) {
                const barW = enemy.radius * 2;
                const barH = 4;
                const barY = ey - enemy.radius - 8;
                const hpPct = enemy.getHPPercent();

                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(enemy.x - barW / 2, barY, barW, barH);

                const hpColor = hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336';
                ctx.fillStyle = hpColor;
                ctx.fillRect(enemy.x - barW / 2, barY, barW * hpPct, barH);

                // Boss label
                if (enemy.isBoss) {
                    ctx.fillStyle = '#ff1744';
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillText(`BOSS Lv.${enemy.data.armor > 15 ? Math.floor((enemy.data.armor - 15) / 5) + 1 : 1}`, enemy.x, barY - 10);
                }
            }
        }
    }

    // ── Projectiles ──

    drawProjectiles(projectiles) {
        const ctx = this.ctx;

        for (const proj of projectiles) {
            if (!proj.alive) continue;

            if (proj.trail.length > 1) {
                ctx.strokeStyle = proj.color + '66';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
                for (let i = 1; i < proj.trail.length; i++) {
                    ctx.lineTo(proj.trail[i].x, proj.trail[i].y);
                }
                ctx.stroke();
            }

            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ── Effects ──

    addExplosionEffect(x, y, radius) {
        this.effects.push({
            x, y, radius,
            maxRadius: radius,
            age: 0,
            duration: 0.3,
            type: 'explosion',
        });
    }

    addPulseEffect(x, y, radius) {
        this.effects.push({
            x: x, y: y, radius: 5,
            maxRadius: radius,
            age: 0,
            duration: 0.5,
            type: 'pulse',
        });
    }

    drawEffects(dt) {
        const ctx = this.ctx;

        for (let i = this.effects.length - 1; i >= 0; i--) {
            const eff = this.effects[i];
            eff.age += dt;
            const progress = eff.age / eff.duration;

            if (progress >= 1) {
                this.effects.splice(i, 1);
                continue;
            }

            if (eff.type === 'explosion') {
                var alpha = 1 - progress;
                var r = eff.radius * (1 + progress * 0.5);
                ctx.strokeStyle = 'rgba(255,200,100,' + alpha + ')';
                ctx.lineWidth = 3 * (1 - progress);
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, r, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = 'rgba(255,150,50,' + (alpha * 0.3) + ')';
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, r, 0, Math.PI * 2);
                ctx.fill();
            } else if (eff.type === 'pulse') {
                var alpha2 = 1 - progress;
                var r2 = 5 + (eff.maxRadius - 5) * progress;
                ctx.strokeStyle = 'rgba(255,200,60,' + alpha2 + ')';
                ctx.lineWidth = 4 * (1 - progress);
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, r2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = 'rgba(255,220,100,' + (alpha2 * 0.2) + ')';
                ctx.beginPath();
                ctx.arc(eff.x, eff.y, r2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
