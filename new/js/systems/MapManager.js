const MapManager = {
    currentMap: null,
    currentTileset: null,
    collisionLayer: null,
    portalObjects: [],
    caveEntrances: [],
    isProcedural: false,
    proceduralObstacles: null,
    portalMarkers: [],
    caveMarkers: [],
    townAreas: [],
    _tileData: null,

    loadMap(scene, mapId) {
        const mapKey = mapId || GameState.currentMapId;

        this._cleanup(scene);

        const mapData = scene.cache.json.get(mapKey);
        const hasTileData = mapData && mapData.layers &&
            mapData.layers.some(l => l.type === 'tilelayer' && l.data && l.data.length > 0);

        if (!hasTileData) {
            this._createProceduralMap(scene, mapKey);
            GameState.currentMapId = mapKey;
            return;
        }

        this.currentMap = scene.make.tilemap({ data: mapData, tileWidth: 32, tileHeight: 32 });
        const tilesetName = mapData.tilesets[0] ? mapData.tilesets[0].name : 'terrain';
        this.currentTileset = this.currentMap.addTilesetImage(tilesetName, 'terrain');
        this.currentMap.createLayer(0, this.currentTileset, 0, 0).setDepth(0);
        if (this.currentMap.layers.length > 1) {
            this.collisionLayer = this.currentMap.createLayer(1, this.currentTileset, 0, 0);
            this.collisionLayer.setDepth(1);
            this.collisionLayer.setCollisionByExclusion([-1]);
        }

        const objectLayer = this.currentMap.getObjectLayer('objects');
        if (objectLayer) {
            for (const obj of objectLayer.objects) {
                if (obj.type === 'portal') this.portalObjects.push(obj);
                else if (obj.type === 'cave') this.caveEntrances.push(obj);
            }
        }

        scene.physics.world.setBounds(0, 0, GameConstants.MAP_WIDTH_PX, GameConstants.MAP_HEIGHT_PX);
        scene.cameras.main.setBounds(0, 0, GameConstants.MAP_WIDTH_PX, GameConstants.MAP_HEIGHT_PX);
        GameState.currentMapId = mapKey;
    },

    _cleanup(scene) {
        if (this.proceduralObstacles) {
            this.proceduralObstacles.clear(true, true);
            this.proceduralObstacles = null;
        }
        for (const m of this.portalMarkers) m.destroy();
        for (const m of this.caveMarkers) m.destroy();
        this.portalMarkers = [];
        this.caveMarkers = [];
        this.portalObjects = [];
        this.caveEntrances = [];
        this.collisionLayer = null;
        this.currentMap = null;
        this.isProcedural = false;
        this.townAreas = [];
        this._tileData = null;
    },

    _createProceduralMap(scene, mapKey) {
        this.isProcedural = true;
        const TW = GameConstants.MAP_WIDTH_TILES;
        const TH = GameConstants.MAP_HEIGHT_TILES;
        const TS = GameConstants.TILE_SIZE;
        const theme = GameConstants.MAP_THEMES[mapKey] || GameConstants.MAP_THEMES['world-1'];

        // Initialize tile grid
        this._tileData = new Array(TW * TH).fill(0);
        const tileAt = (tx, ty) => this._tileData[ty * TW + tx];

        // --- TERRAIN GENERATION ---
        // Base ground with noise
        for (let y = 0; y < TH; y++) {
            for (let x = 0; x < TW; x++) {
                this._tileData[y * TW + x] = theme.ground[Math.floor(Math.random() * theme.ground.length)];
            }
        }

        // River 1 (horizontal-ish, winding)
        this._drawRiver(TW, TH, 10, 30, 90, 35, 1);
        // River 2 (vertical-ish, winding)
        this._drawRiver(TW, TH, 55, 5, 60, 90, 1);

        // Mountain clusters (collision)
        const mountainSeed = mapKey.charCodeAt(mapKey.length - 1) * 137;
        const rand = (n) => ((n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        let seed = mountainSeed;
        for (let c = 0; c < 8; c++) {
            const cx = Math.floor(rand(seed++) * (TW - 20)) + 10;
            const cy = Math.floor(rand(seed++) * (TH - 20)) + 10;
            const r = Math.floor(rand(seed++) * 6) + 3;
            for (let y = cy - r; y <= cy + r; y++) {
                for (let x = cx - r; x <= cx + r; x++) {
                    if (x < 0 || x >= TW || y < 0 || y >= TH) continue;
                    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                    if (dist < r) this._tileData[y * TW + x] = 3;
                }
            }
        }

        // Forest patches (collision for dense trees)
        for (let c = 0; c < 15; c++) {
            const cx = Math.floor(rand(seed++) * (TW - 15)) + 8;
            const cy = Math.floor(rand(seed++) * (TH - 15)) + 8;
            const r = Math.floor(rand(seed++) * 4) + 2;
            for (let y = cy - r; y <= cy + r; y++) {
                for (let x = cx - r; x <= cx + r; x++) {
                    if (x < 0 || x >= TW || y < 0 || y >= TH) continue;
                    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                    if (dist < r && rand(seed++) > 0.3) this._tileData[y * TW + x] = 4;
                }
            }
        }

        // Town area (clear rectangle, no collision)
        const towns = [];
        if (mapKey === 'world-1') {
            towns.push({ tx: 42, ty: 42, tw: 16, th: 14 });
        } else if (mapKey === 'world-2') {
            towns.push({ tx: 20, ty: 60, tw: 14, th: 12 });
            towns.push({ tx: 70, ty: 25, tw: 10, th: 8 });
        } else {
            towns.push({ tx: 45, ty: 45, tw: 12, th: 10 });
        }

        for (const town of towns) {
            for (let y = town.ty; y < town.ty + town.th; y++) {
                for (let x = town.tx; x < town.tx + town.tw; x++) {
                    if (x < TW && y < TH) this._tileData[y * TW + x] = 5;
                }
            }
        }
        this.townAreas = towns.map(t => ({
            x: t.tx * TS, y: t.ty * TS,
            w: t.tw * TS, h: t.th * TS
        }));

        // --- COLLISION ---
        this.proceduralObstacles = scene.physics.add.staticGroup();
        const collisionTiles = new Set([3, 4]); // mountains and forests block movement
        for (let y = 0; y < TH; y++) {
            for (let x = 0; x < TW; x++) {
                if (collisionTiles.has(this._tileData[y * TW + x])) {
                    const obs = scene.add.rectangle(
                        x * TS + TS / 2, y * TS + TS / 2,
                        TS - 2, TS - 2, 0x000000, 0
                    );
                    scene.physics.add.existing(obs, true);
                    this.proceduralObstacles.add(obs);
                }
            }
        }

        // --- PORTALS ---
        const portalPositions = this._getPortalPositions(mapKey, TW, TH, TS);
        for (const p of portalPositions) {
            this.portalObjects.push({
                id: p.id, targetMap: p.targetMap,
                x: p.x, y: p.y, width: TS * 2, height: TS * 2
            });
            // Visual marker
            const marker = scene.add.circle(p.x + TS, p.y + TS, 20, 0x4488ff, 0.6);
            marker.setDepth(15);
            this.portalMarkers.push(marker);
            scene.tweens.add({
                targets: marker, alpha: 0.3, duration: 800, yoyo: true, repeat: -1
            });
            // Label
            const label = scene.add.text(p.x + TS, p.y + TS - 30, '传送阵', {
                fontSize: '10px', fill: '#aaddff', fontFamily: 'monospace'
            }).setOrigin(0.5).setDepth(15);
            this.portalMarkers.push(label);
        }

        // --- CAVES ---
        CaveManager.generateCavesForMap(mapKey, TW, TH, TS,
            towns.concat(portalPositions.map(p => ({ tx: p.tx, ty: p.ty, tw: 2, th: 2 }))));
        const discovered = GameState.discoveredCaves[mapKey] || [];
        const allCaves = CaveManager.getCaveEntrances(mapKey);

        for (const cave of allCaves) {
            this.caveEntrances.push({
                id: cave.id, x: cave.x, y: cave.y,
                width: TS, height: TS, discovered: discovered.includes(cave.id)
            });
            const alpha = discovered.includes(cave.id) ? 0.7 : 0.2;
            const marker = scene.add.circle(cave.x + TS / 2, cave.y + TS / 2, 14, 0xffaa00, alpha);
            marker.setDepth(14);
            this.caveMarkers.push(marker);
            if (!discovered.includes(cave.id)) {
                scene.tweens.add({
                    targets: marker, alpha: 0.5, duration: 1200, yoyo: true, repeat: -1
                });
            }
        }

        // Set world bounds
        scene.physics.world.setBounds(0, 0, GameConstants.MAP_WIDTH_PX, GameConstants.MAP_HEIGHT_PX);
        scene.cameras.main.setBounds(0, 0, GameConstants.MAP_WIDTH_PX, GameConstants.MAP_HEIGHT_PX);
        GameState.currentMapId = mapKey;
    },

    _drawRiver(TW, TH, startX, startY, endX, endY, width) {
        let x = startX, y = startY;
        while (Math.abs(x - endX) > 2 || Math.abs(y - endY) > 2) {
            for (let w = -width; w <= width; w++) {
                const rx = Math.round(x) + w;
                const ry = Math.round(y);
                if (rx >= 0 && rx < TW && ry >= 0 && ry < TH) {
                    this._tileData[ry * TW + rx] = 2;
                }
            }
            const dx = endX - x, dy = endY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = 1 + Math.random() * 1.5;
            x += (dx / dist) * step + (Math.random() - 0.5) * 1.2;
            y += (dy / dist) * step + (Math.random() - 0.5) * 1.2;
        }
    },

    _getPortalPositions(mapKey, TW, TH, TS) {
        if (mapKey === 'world-1') {
            return [
                { id: 'p1_w2', targetMap: 'world-2', tx: 52, ty: 45, x: 52 * TS, y: 45 * TS },
                { id: 'p1_w3', targetMap: 'world-3', tx: 35, ty: 50, x: 35 * TS, y: 50 * TS }
            ];
        } else if (mapKey === 'world-2') {
            return [
                { id: 'p2_w1', targetMap: 'world-1', tx: 25, ty: 65, x: 25 * TS, y: 65 * TS },
                { id: 'p2_w3', targetMap: 'world-3', tx: 75, ty: 30, x: 75 * TS, y: 30 * TS }
            ];
        } else {
            return [
                { id: 'p3_w1', targetMap: 'world-1', tx: 50, ty: 50, x: 50 * TS, y: 50 * TS },
                { id: 'p3_w2', targetMap: 'world-2', tx: 48, ty: 48, x: 48 * TS, y: 48 * TS }
            ];
        }
    },

    getTileData() { return this._tileData; },

    getTileAt(worldX, worldY) {
        if (!this._tileData) return 0;
        const tx = Math.floor(worldX / GameConstants.TILE_SIZE);
        const ty = Math.floor(worldY / GameConstants.TILE_SIZE);
        const TW = GameConstants.MAP_WIDTH_TILES;
        if (tx < 0 || tx >= TW || ty < 0 || ty >= TW) return -1;
        return this._tileData[ty * TW + tx];
    },

    getCollisionLayer() { return this.collisionLayer || null; },
    getProceduralObstacles() { return this.proceduralObstacles || null; },
    getPortals() { return this.portalObjects; },
    getCaves() { return this.caveEntrances; }
};
