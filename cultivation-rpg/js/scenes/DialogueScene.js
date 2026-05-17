class DialogueScene extends Phaser.Scene {
    constructor() {
        super({ key: 'DialogueScene' });
    }

    init(data) {
        this.npcData = data.npcData;
        this.dialogueTreeId = data.dialogueTreeId || 'generic_greeting';
        this.currentNodeId = this.dialogueTreeId;
    }

    create() {
        // ESC to close
        this.input.keyboard.on('keydown-ESC', () => this._close());

        // Show current dialogue node
        this._showNode(this.currentNodeId);
    }

    _showNode(nodeId) {
        DialogueBox.hide();

        const node = DialogueManager.getNode(this.dialogueTreeId, nodeId);
        if (!node) {
            this._close();
            return;
        }

        this.currentNodeId = nodeId;

        // Get available choices (filtered by conditions)
        const choices = DialogueManager.getAvailableChoices(node, this.npcData);

        DialogueBox.show(this, {
            npcName: this.npcData.name,
            npcRank: this.npcData.rank,
            favorability: this.npcData.favorability,
            personality: this.npcData.title ? this.npcData.title + '：' + this.npcData.personality : this.npcData.personality,
            background: this.npcData.background,
            text: node.text,
            choices: choices.map(c => ({ text: c.text })),
            onTextComplete: () => {},
            onChoice: (index) => {
                const choice = choices[index];
                if (!choice) return;

                // Apply effect
                DialogueManager.parseEffect(choice.effect, this.npcData);

                // Handle special actions
                if (choice.action === 'trade') {
                    this._close();
                    Events.emit('openTrade', this.npcData);
                    return;
                }
                if (choice.action === 'spar') {
                    DialogueBox.hide();
                    const monsterData = {
                        name: this.npcData.name,
                        hp: this.npcData.combatStats.hp,
                        atk: this.npcData.combatStats.atk,
                        def: this.npcData.combatStats.def,
                        spd: this.npcData.combatStats.spd,
                        qiReward: 80,
                        goldReward: 50,
                        rarity: 'uncommon'
                    };
                    // Launch BattleScene, then stop self
                    this.scene.launch('BattleScene', { monsterData, npcData: this.npcData });
                    this.scene.stop();
                    return;
                }

                // Navigate to next node
                if (choice.nextNode) {
                    this._showNode(choice.nextNode);
                } else {
                    this._close();
                }
            }
        });
    }

    _close() {
        DialogueBox.hide();
        this.scene.stop();
        this.scene.resume('GameScene');
    }
}
