const NPCSpawner = {
    _npcs: [],

    spawnNPCs(scene, count) {
        this.despawnAll();
        count = count || GameConstants.NPC_MAX_PER_MAP;

        // Get spawn zones (town areas are safe zones for NPCs)
        const towns = MapManager.townAreas || [];
        if (towns.length === 0) {
            // Fallback: spawn near map center
            for (let i = 0; i < count; i++) {
                const x = 1500 + Math.random() * 200;
                const y = 1500 + Math.random() * 200;
                this._createNPC(scene, x, y);
            }
            return;
        }

        for (let i = 0; i < count; i++) {
            const town = towns[i % towns.length];
            const attempts = 20;
            let placed = false;
            for (let a = 0; a < attempts; a++) {
                const x = town.x + 32 + Math.random() * (town.w - 64);
                const y = town.y + 32 + Math.random() * (town.h - 64);
                if (!this._isBlocked(scene, x, y)) {
                    this._createNPC(scene, x, y, i, town);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                // Fallback position at town center
                this._createNPC(scene, town.x + town.w / 2, town.y + town.h / 2, i, town);
            }
        }
    },

    _createNPC(scene, x, y, index, town) {
        const npcData = NPCDatabase.generateNPC(null, GameState.currentMapId, index || 0);
        const npc = new NPC(scene, x, y, npcData);

        // AI state
        npc._ai = {
            state: 'routine',
            idleTimer: RandomUtils.intBetween(1500, 4000),
            walkTimer: 0,
            walkDuration: 0,
            walkDir: 'down',
            baseX: x,
            baseY: y,
            homeX: town ? town.x + town.w * 0.25 + RandomUtils.intBetween(-24, 25) : x,
            homeY: town ? town.y + town.h * 0.3 + RandomUtils.intBetween(-24, 25) : y,
            workX: town ? town.x + town.w * 0.65 + RandomUtils.intBetween(-36, 37) : x,
            workY: town ? town.y + town.h * 0.52 + RandomUtils.intBetween(-36, 37) : y,
            eveningX: town ? town.x + town.w * 0.48 + RandomUtils.intBetween(-48, 49) : x,
            eveningY: town ? town.y + town.h * 0.78 + RandomUtils.intBetween(-24, 25) : y,
            currentRoutine: ''
        };

        // Set initial animation
        npc.play('npc_idle_down');

        // Collide with map obstacles
        if (MapManager.collisionLayer) {
            scene.physics.add.collider(npc, MapManager.collisionLayer);
        }
        if (MapManager.getProceduralObstacles()) {
            scene.physics.add.collider(npc, MapManager.getProceduralObstacles());
        }

        // NPC-NPC collision
        for (const other of this._npcs) {
            scene.physics.add.collider(npc, other);
        }

        this._npcs.push(npc);
        return npc;
    },

    _isBlocked(scene, wx, wy) {
        const TS = GameConstants.TILE_SIZE;
        const tile = MapManager.getTileAt(wx, wy);
        // Blocked by mountains and large rivers.
        if (tile === 2 || tile === 3) return true;

        // Avoid player spawn position (keep 3 tile distance)
        const ppos = GameState.mapPositions[GameState.currentMapId];
        if (ppos) {
            const pdist = Phaser.Math.Distance.Between(wx, wy, ppos.x, ppos.y);
            if (pdist < TS * 3) return true;
        }

        // Check portal proximity
        for (const p of MapManager.getPortals()) {
            const dist = Phaser.Math.Distance.Between(wx, wy, p.x + TS, p.y + TS);
            if (dist < 80) return true;
        }

        // Check cave proximity
        for (const c of MapManager.getCaves()) {
            const dist = Phaser.Math.Distance.Between(wx, wy, c.x + TS / 2, c.y + TS / 2);
            if (dist < 64) return true;
        }

        return false;
    },

    getNPCs() {
        return this._npcs;
    },

    getNearbyNPC(px, py, range) {
        let closest = null;
        let closestDist = range;
        for (const npc of this._npcs) {
            if (!npc.body) continue;
            const dist = Phaser.Math.Distance.Between(px, py, npc.x, npc.y);
            if (dist < closestDist) {
                closestDist = dist;
                closest = npc;
            }
        }
        return closest;
    },

    update(time, delta) {
        for (const npc of this._npcs) {
            NPCAI.updateNPC(npc, time, delta);
        }
    },

    despawnAll() {
        for (const npc of this._npcs) {
            if (npc && npc.body) {
                npc.destroy();
            }
        }
        this._npcs = [];
    }
};
