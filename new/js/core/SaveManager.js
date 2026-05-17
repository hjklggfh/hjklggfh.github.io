const SaveManager = {
    _getKey(slotIndex) {
        return GameConstants.SAVE_KEY_PREFIX + slotIndex;
    },

    save(slotIndex) {
        const data = {
            version: GameConstants.SAVE_VERSION,
            timestamp: Date.now(),
            playTime: GameState.playTime,
            slotName: slotIndex === 0 ? '自动存档' : '存档 ' + slotIndex,
            gameState: {
                playerName: GameState.playerName,
                playerRank: GameState.playerRank,
                playerQi: GameState.playerQi,
                playerBaseStats: { ...GameState.playerBaseStats },
                currentHP: GameState.currentHP,
                maxHP: GameState.maxHP,
                playerLearnedTechniques: [...GameState.playerLearnedTechniques],
                playerEquipped: { ...GameState.playerEquipped },
                playerGold: GameState.playerGold,
                inventory: GameState.inventory.map(i => ({ ...i })),
                currentMapId: GameState.currentMapId,
                mapPositions: JSON.parse(JSON.stringify(GameState.mapPositions)),
                discoveredCaves: JSON.parse(JSON.stringify(GameState.discoveredCaves)),
                npcFavorability: { ...GameState.npcFavorability },
                npcStates: JSON.parse(JSON.stringify(GameState.npcStates)),
                questFlags: { ...GameState.questFlags }
            }
        };
        try {
            localStorage.setItem(this._getKey(slotIndex), JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    load(slotIndex) {
        try {
            const raw = localStorage.getItem(this._getKey(slotIndex));
            if (!raw) return false;
            const data = JSON.parse(raw);
            if (data.version > GameConstants.SAVE_VERSION) return false;

            const gs = data.gameState;
            GameState.playerName = gs.playerName;
            GameState.playerRank = gs.playerRank;
            GameState.playerQi = gs.playerQi;
            GameState.playerBaseStats = { ...gs.playerBaseStats };
            GameState.currentHP = gs.currentHP || GameState.playerBaseStats.hp;
            GameState.maxHP = gs.maxHP || GameState.playerBaseStats.hp;
            GameState.playerLearnedTechniques = [...gs.playerLearnedTechniques];
            GameState.playerEquipped = { ...gs.playerEquipped };
            GameState.playerGold = gs.playerGold;
            GameState.inventory = gs.inventory.map(i => ({ ...i }));
            GameState.currentMapId = gs.currentMapId;
            GameState.mapPositions = JSON.parse(JSON.stringify(gs.mapPositions));
            GameState.discoveredCaves = JSON.parse(JSON.stringify(gs.discoveredCaves));
            GameState.npcFavorability = { ...gs.npcFavorability };
            GameState.npcStates = JSON.parse(JSON.stringify(gs.npcStates));
            GameState.questFlags = { ...gs.questFlags };
            GameState.playTime = data.playTime;
            return true;
        } catch (e) {
            console.error('Load failed:', e);
            return false;
        }
    },

    delete(slotIndex) {
        localStorage.removeItem(this._getKey(slotIndex));
    },

    listSlots() {
        const slots = [];
        for (let i = 0; i <= GameConstants.SAVE_SLOTS; i++) {
            try {
                const raw = localStorage.getItem(this._getKey(i));
                if (raw) {
                    const data = JSON.parse(raw);
                    slots.push({
                        slotIndex: i,
                        timestamp: data.timestamp,
                        playerName: data.gameState.playerName,
                        rank: data.gameState.playerRank,
                        playTime: data.playTime,
                        slotName: data.slotName
                    });
                }
            } catch (e) { /* slot empty or corrupt */ }
        }
        return slots;
    },

    autoSave() {
        this.save(GameConstants.AUTO_SAVE_SLOT);
    },

    hasAnySave() {
        return this.listSlots().length > 0;
    }
};
