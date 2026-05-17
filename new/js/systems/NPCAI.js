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

        // Check for nearby player — stop and face them
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

        if (ai.state === 'idle') {
            ai.idleTimer -= delta;
            npc.setVelocity(0, 0);
            npc.playIdle(ai.walkDir);

            if (ai.idleTimer <= 0) {
                ai.state = 'walking';
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
    }
};
