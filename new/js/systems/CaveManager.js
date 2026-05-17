const CaveManager = {
    _caveEntrances: {},

    generateCavesForMap(mapId, mapW, mapH, tileSize, excludeZones) {
        if (this._caveEntrances[mapId]) return;

        const TS = tileSize || GameConstants.TILE_SIZE;
        const numCaves = GameConstants.CAVES_PER_MAP;
        const caves = [];
        const minDist = 15; // minimum tile distance from exclusions

        for (let i = 0; i < numCaves * 3 && caves.length < numCaves; i++) {
            const tx = RandomUtils.intBetween(5, mapW - 5);
            const ty = RandomUtils.intBetween(5, mapH - 5);

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
                id: mapId + '_cave_' + i,
                tx: tx, ty: ty,
                x: tx * TS, y: ty * TS,
                width: TS, height: TS
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

        scene.scene.pause();
        scene.scene.launch('CaveInteriorScene', { caveId: caveId, mapId: mapId });
    },

    generateCaveLoot() {
        const loot = [];

        // Always some spirit stones
        loot.push({ itemId: null, name: '灵石', quantity: RandomUtils.intBetween(50, 300), isGold: true });

        // 60% chance of a pill (independent roll)
        if (Math.random() < 0.6) {
            const pills = ItemDatabase.pills.filter(p => p.quality === '凡品' || p.quality === '灵品');
            if (pills.length > 0) {
                const pill = RandomUtils.pick(pills);
                loot.push({ itemId: pill.id, name: pill.name, quantity: RandomUtils.intBetween(1, 3), isGold: false });
            }
        }

        // 30% chance of a technique (independent roll)
        if (Math.random() < 0.3) {
            const techs = ItemDatabase.techniques.filter(t => t.quality === '凡品' || t.quality === '灵品');
            if (techs.length > 0) {
                const tech = RandomUtils.pick(techs);
                loot.push({ itemId: tech.id, name: tech.name, quantity: 1, isGold: false });
            }
        }

        // 15% chance of equipment (independent roll)
        if (Math.random() < 0.15) {
            const eqs = ItemDatabase.equipment.filter(e => e.quality === '凡品' || e.quality === '灵品');
            if (eqs.length > 0) {
                const eq = RandomUtils.pick(eqs);
                loot.push({ itemId: eq.id, name: eq.name, quantity: 1, isGold: false });
            }
        }

        // 10% chance of rare extra item (independent roll)
        if (Math.random() < 0.10) {
            const rares = [
                ...ItemDatabase.pills.filter(p => p.quality === '仙品'),
                ...ItemDatabase.techniques.filter(t => t.quality === '仙品'),
            ];
            if (rares.length > 0) {
                const rare = RandomUtils.pick(rares);
                loot.push({ itemId: rare.id, name: rare.name, quantity: 1, isGold: false });
            }
        }

        return loot;
    }
};
