const NPCAI = {
    updateNPC(npc, time, delta) {
        if (!npc || !npc.body || !npc._ai) return;

        const ai = npc._ai;
        const dirs = ['down', 'left', 'right', 'up'];
        const dirVectors = {
            down:  { vx: 0,  vy: 1 },
            left:  { vx: -1, vy: 0 },
            right: { vx: 1,  vy: 0 },
            up:    { vx: 0,  vy: -1 }
        };

        this._updateRoutineTarget(npc, time);

        // Check for nearby player - stop and face them.
        const scene = npc.scene;
        if (scene && scene.player) {
            const dist = Phaser.Math.Distance.Between(npc.x, npc.y, scene.player.x, scene.player.y);
            if (dist < 80) {
                npc.setVelocity(0, 0);
                npc.playIdle(ai.walkDir);
                ai.state = 'idle';
                ai.idleTimer = 500;
                // Face toward player
                const dx = scene.player.x - npc.x;
                const dy = scene.player.y - npc.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    ai.walkDir = dx > 0 ? 'right' : 'left';
                } else {
                    ai.walkDir = dy > 0 ? 'down' : 'up';
                }
                npc.playIdle(ai.walkDir);
                return;
            }
        }

        if (ai.state === 'routine') {
            const dx = ai.targetX - npc.x;
            const dy = ai.targetY - npc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 10) {
                const speed = GameConstants.NPC_WALK_SPEED * (0.85 + CultivationData.rankOrder.indexOf(npc.npcData.rank) * 0.05);
                const vx = dx / dist * speed;
                const vy = dy / dist * speed;
                npc.setVelocity(vx, vy);
                if (Math.abs(vx) > Math.abs(vy)) ai.walkDir = vx > 0 ? 'right' : 'left';
                else ai.walkDir = vy > 0 ? 'down' : 'up';
                npc.playWalk(ai.walkDir);
                return;
            }
            npc.setVelocity(0, 0);
            npc.playIdle(ai.walkDir);
            ai.idleTimer -= delta;
            if (ai.idleTimer <= 0) {
                ai.state = 'idle';
                ai.idleTimer = RandomUtils.intBetween(1200, 2800);
            }
        } else if (ai.state === 'idle') {
            ai.idleTimer -= delta;
            npc.setVelocity(0, 0);
            npc.playIdle(ai.walkDir);

            if (ai.idleTimer <= 0) {
                ai.state = Math.random() < 0.55 ? 'routine' : 'walking';
                ai.walkDir = dirs[Math.floor(Math.random() * 4)];
                ai.walkDuration = RandomUtils.intBetween(800, 2500);
                ai.walkTimer = 0;
                npc.playWalk(ai.walkDir);
            }
        } else if (ai.state === 'walking') {
            ai.walkTimer += delta;
            const vec = dirVectors[ai.walkDir];
            const speed = GameConstants.NPC_WALK_SPEED;
            npc.setVelocity(vec.vx * speed, vec.vy * speed);

            // If stuck (velocity near zero but should be moving), change direction
            if (ai.walkTimer > 300 && Math.abs(npc.body.velocity.x) < 5 && Math.abs(npc.body.velocity.y) < 5) {
                ai.walkDir = dirs[Math.floor(Math.random() * 4)];
                npc.playWalk(ai.walkDir);
            }

            if (ai.walkTimer >= ai.walkDuration) {
                ai.state = 'idle';
                ai.idleTimer = RandomUtils.intBetween(
                    GameConstants.NPC_WANDER_IDLE_MIN,
                    GameConstants.NPC_WANDER_IDLE_MAX
                );
                npc.setVelocity(0, 0);
                npc.playIdle(ai.walkDir);
            }
        }
    },

    _updateRoutineTarget(npc, time) {
        const ai = npc._ai;
        const day = GameConstants.WORLD_DAY_MS || 360000;
        const phase = ((GameState.playTime || 0) % day) / day;
        let slot = 'work';
        if (phase < 0.22 || phase > 0.86) slot = 'home';
        else if (phase > 0.62) slot = 'evening';
        if (ai.currentRoutine === slot && ai.targetX && ai.targetY) return;

        ai.currentRoutine = slot;
        if (slot === 'home') {
            ai.targetX = ai.homeX; ai.targetY = ai.homeY;
        } else if (slot === 'evening') {
            ai.targetX = ai.eveningX; ai.targetY = ai.eveningY;
        } else {
            ai.targetX = ai.workX; ai.targetY = ai.workY;
        }
        ai.state = 'routine';
    }
};
