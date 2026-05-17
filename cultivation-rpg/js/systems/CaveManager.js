const CaveManager = {
    _caveEntrances: {},

    generateCavesForMap(mapId, mapW, mapH, tileSize, excludeZones) {
        if (this._caveEntrances[mapId]) return;

        const TS = tileSize || GameConstants.TILE_SIZE;
        const seedBonus = (mapId || '').split('').reduce((s, ch) => s + ch.charCodeAt(0), 0);
        const minCaves = GameConstants.CAVES_PER_MAP_MIN || GameConstants.CAVES_PER_MAP || 4;
        const maxCaves = GameConstants.CAVES_PER_MAP_MAX || GameConstants.CAVES_PER_MAP || 4;
        const numCaves = minCaves + (seedBonus % (maxCaves - minCaves + 1));
        const random = MapManager._makeRng ? MapManager._makeRng(mapId + '_caves') : Math.random;
        const caves = [];
        const minDist = 15; // minimum tile distance from exclusions

        for (let i = 0; i < numCaves * 6 && caves.length < numCaves; i++) {
            const tx = Math.floor(random() * (mapW - 10)) + 5;
            const ty = Math.floor(random() * (mapH - 10)) + 5;
            const tile = MapManager.getTileAt(tx * TS, ty * TS);
            if (tile === 2 || tile === 3 || tile === 5) continue;

            // Check distance from excluded zones
            let tooClose = false;
            for (const zone of excludeZones) {
                const zcx = zone.tx + zone.tw / 2;
                const zcy = zone.ty + zone.th / 2;
                const dist = Math.sqrt((tx - zcx) ** 2 + (ty - zcy) ** 2);
                if (dist < minDist) { tooClose = true; break; }
            }
            // Check distance from existing caves
            for (const c of caves) {
                const dist = Math.sqrt((tx - c.tx) ** 2 + (ty - c.ty) ** 2);
                if (dist < 8) { tooClose = true; break; }
            }
            if (tooClose) continue;

            caves.push({
                id: mapId + '_cave_' + (seedBonus + i),
                tx: tx, ty: ty,
                x: tx * TS, y: ty * TS,
                width: TS, height: TS,
                explored: false
            });
        }

        this._caveEntrances[mapId] = caves;
    },

    getCaveEntrances(mapId) {
        return this._caveEntrances[mapId] || [];
    },

    getCaveById(mapId, caveId) {
        const caves = this._caveEntrances[mapId] || [];
        return caves.find(c => c.id === caveId) || null;
    },

    discoverCave(mapId, caveId) {
        if (!GameState.discoveredCaves[mapId]) {
            GameState.discoveredCaves[mapId] = [];
        }
        if (!GameState.discoveredCaves[mapId].includes(caveId)) {
            GameState.discoveredCaves[mapId].push(caveId);
            Events.emit('caveDiscovered', mapId, caveId);
        }
    },

    enterCave(scene, caveId) {
        const mapId = GameState.currentMapId;
        const cave = this.getCaveById(mapId, caveId);
        if (!cave) return;
        if ((GameState.completedCaves[mapId] || []).includes(caveId)) {
            Notification.show(scene, '此洞府已探索完毕，只余残痕。');
            return;
        }

        scene.scene.pause();
        scene.scene.launch('CaveInteriorScene', { caveId: caveId, mapId: mapId });
    },

    completeCave(mapId, caveId) {
        if (!GameState.completedCaves[mapId]) GameState.completedCaves[mapId] = [];
        if (!GameState.completedCaves[mapId].includes(caveId)) {
            GameState.completedCaves[mapId].push(caveId);
            Events.emit('caveCompleted', mapId, caveId);
        }
    },

    generateCaveLoot() {
        const loot = [];

        // Always some spirit stones
        loot.push({ itemId: null, name: '灵石', quantity: RandomUtils.intBetween(90, 620), isGold: true });

        if (Math.random() < 0.75) {
            const pills = ItemDatabase.pills.filter(p => ['凡品', '良品', '灵品', '玄品'].includes(p.quality));
            if (pills.length > 0) {
                const pill = RandomUtils.pick(pills);
                loot.push({ itemId: pill.id, name: pill.name, quantity: RandomUtils.intBetween(1, 3), isGold: false });
            }
        }

        if (Math.random() < 0.42) {
            const techs = ItemDatabase.techniques.filter(t => ['凡品', '良品', '灵品', '玄品', '地品'].includes(t.quality));
            if (techs.length > 0) {
                const tech = RandomUtils.pick(techs);
                loot.push({ itemId: tech.id, name: tech.name, quantity: 1, isGold: false });
            }
        }

        if (Math.random() < 0.28) {
            const eqs = ItemDatabase.equipment.filter(e => ['凡品', '良品', '灵品', '玄品', '地品'].includes(e.quality));
            if (eqs.length > 0) {
                const eq = RandomUtils.pick(eqs);
                loot.push({ itemId: eq.id, name: eq.name, quantity: 1, isGold: false });
            }
        }

        if (Math.random() < 0.72) {
            const mats = ItemDatabase.materials;
            if (mats.length > 0) {
                const mat = RandomUtils.pick(mats);
                loot.push({ itemId: mat.id, name: mat.name, quantity: RandomUtils.intBetween(2, 6), isGold: false });
            }
        }

        if (Math.random() < 0.14) {
            const rares = [
                ...ItemDatabase.pills.filter(p => ['天品', '仙品'].includes(p.quality)),
                ...ItemDatabase.techniques.filter(t => ['天品', '仙品'].includes(t.quality)),
                ...ItemDatabase.equipment.filter(e => ['天品', '仙品'].includes(e.quality)),
                ...ItemDatabase.materials.filter(m => ['地品', '仙品'].includes(m.quality))
            ];
            if (rares.length > 0) {
                const rare = RandomUtils.pick(rares);
                loot.push({ itemId: rare.id, name: rare.name, quantity: 1, isGold: false });
            }
        }

        return loot;
    }
};
