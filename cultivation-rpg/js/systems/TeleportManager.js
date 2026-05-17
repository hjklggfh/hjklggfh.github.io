const TeleportManager = {
    getTeleportCost(fromMap, toMap) {
        const conn = GameConstants.TELEPORT_CONNECTIONS.find(
            c => c.from === fromMap && c.to === toMap
        );
        return conn ? conn.cost : -1;
    },

    canTeleport(cost) {
        return GameState.playerGold >= cost;
    },

    getAvailableDestinations(fromMap) {
        return GameConstants.TELEPORT_CONNECTIONS
            .filter(c => c.from === fromMap)
            .map(c => ({
                mapId: c.to,
                name: GameConstants.MAP_NAMES[c.to] || c.to,
                cost: c.cost,
                affordable: GameState.playerGold >= c.cost
            }));
    },

    getTargetPortals(targetMap, fromMap) {
        // Returns the portal positions on the target map that connect back to fromMap
        // These are the landing spots
        const TS = GameConstants.TILE_SIZE;
        const TW = GameConstants.MAP_WIDTH_TILES;
        if (targetMap === 'world-1') {
            return fromMap === 'world-2'
                ? [{ x: 52 * TS, y: 45 * TS }]
                : [{ x: 35 * TS, y: 50 * TS }];
        } else if (targetMap === 'world-2') {
            return fromMap === 'world-1'
                ? [{ x: 25 * TS, y: 65 * TS }]
                : [{ x: 75 * TS, y: 30 * TS }];
        } else {
            return fromMap === 'world-1'
                ? [{ x: 50 * TS, y: 50 * TS }]
                : [{ x: 48 * TS, y: 48 * TS }];
        }
    }
};
