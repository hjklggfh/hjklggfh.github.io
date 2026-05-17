const DialogueManager = {
    getTree(treeId) {
        const tree = NPCDatabase.dialogueTrees[treeId];
        return tree || null;
    },

    getNode(treeId, nodeId) {
        // nodeId IS the dialogue node key in the tree
        const key = nodeId || treeId;
        return NPCDatabase.dialogueTrees[key] || null;
    },

    processChoice(node, choiceIndex) {
        if (!node || !node.choices || choiceIndex >= node.choices.length) return null;
        return node.choices[choiceIndex];
    },

    parseEffect(effectStr, npcData) {
        if (!effectStr) return;
        const parts = effectStr.trim().split(/\s+/);
        if (parts.length < 2) return;

        const type = parts[0];
        const value = parseInt(parts[1], 10);

        if (type === 'favorability' && !isNaN(value)) {
            npcData.favorability = Math.max(0, Math.min(100, npcData.favorability + value));
            // Also persist to GameState
            GameState.npcFavorability[npcData.id] = npcData.favorability;
        } else if (type === 'open_trade') {
            Events.emit('openTrade', npcData);
        }
    },

    getAvailableChoices(node, npcData) {
        if (!node || !node.choices) return [];
        return node.choices.filter(c => {
            if (!c.condition) return true;
            // Parse simple conditions like "npc_rank <= player_rank + 1"
            return this._evaluateCondition(c.condition, npcData);
        });
    },

    _evaluateCondition(condition, npcData) {
        // Simple condition evaluator
        // Format: "npc_rank <= player_rank + 1" or "favorability >= 50"
        try {
            const rankOrder = ['炼气', '筑基', '金丹', '元婴', '化神'];
            let expr = condition
                .replace('npc_rank', String(rankOrder.indexOf(npcData.rank)))
                .replace('player_rank', String(rankOrder.indexOf(GameState.playerRank)))
                .replace('favorability', String(npcData.favorability));
            return Function('"use strict"; return (' + expr + ')')();
        } catch (e) {
            return true;
        }
    }
};
