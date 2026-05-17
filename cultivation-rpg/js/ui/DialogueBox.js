const DialogueBox = {
    _elements: [],
    _typewriterTimer: null,
    _typewriterIndex: 0,
    _typewriterText: '',
    _typewriterCallback: null,

    show(scene, config) {
        this.hide();
        const w = scene.cameras.main.width;
        const h = scene.cameras.main.height;
        const boxH = 180;
        const boxY = h - boxH - 10;
        const pad = 16;

        const elems = this._elements;

        // Semi-transparent overlay (not full screen, just darken bottom area)
        const overlay = scene.add.rectangle(w / 2, boxY, w - 20, boxH, 0x17322c, 0.92)
            .setStrokeStyle(2, 0x8ed3b0).setScrollFactor(0).setDepth(200);
        elems.push(overlay);

        // NPC name + rank
        const nameText = (config.npcName || '???') + '  [' + (config.npcRank || '??') + ']';
        elems.push(scene.add.text(pad, boxY + pad, nameText, {
            fontSize: '14px', fill: '#fff0b8', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(201));

        if (config.personality || config.background) {
            elems.push(scene.add.text(pad + 190, boxY + pad + 1, config.personality || '', {
                fontSize: '10px', fill: '#9bffd0', fontFamily: 'monospace'
            }).setScrollFactor(0).setDepth(201));
        }

        // Favorability bar
        const fav = config.favorability || 50;
        const favBarX = w - pad - 120;
        elems.push(scene.add.text(favBarX - 5, boxY + pad, '好感:', {
            fontSize: '11px', fill: '#888888', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(201));
        const favBg = scene.add.rectangle(favBarX + 25, boxY + pad + 7, 100, 8, 0x333333)
            .setScrollFactor(0).setDepth(200);
        const favFill = scene.add.rectangle(favBarX + 25 - 50 + (fav * 50 / 100), boxY + pad + 7, fav, 6,
            fav > 60 ? 0x44cc44 : fav > 30 ? 0xccaa44 : 0xcc4444)
            .setScrollFactor(0).setDepth(201);
        elems.push(favBg, favFill);

        // Dialogue text area
        const textY = boxY + pad + 28;
        const dialogueText = scene.add.text(pad + 4, textY, '', {
            fontSize: '13px', fill: '#d9eadf', fontFamily: 'monospace',
            wordWrap: { width: w - pad * 2 - 8 }
        }).setScrollFactor(0).setDepth(201);
        elems.push(dialogueText);

        // Start typewriter effect
        this._typewriterText = config.text || '';
        this._typewriterIndex = 0;
        this._typewriterCallback = config.onTextComplete || null;
        if (this._typewriterTimer) this._typewriterTimer.destroy();

        let fullText = this._typewriterText;
        scene.time.addEvent({
            delay: 30,
            repeat: fullText.length - 1,
            callback: () => {
                this._typewriterIndex++;
                dialogueText.setText(fullText.slice(0, this._typewriterIndex));
                if (this._typewriterIndex >= fullText.length && this._typewriterCallback) {
                    this._typewriterCallback();
                    this._typewriterCallback = null;
                }
            }
        });

        // Choices (show after typewriter completes or immediately)
        if (config.choices && config.choices.length > 0) {
            const choiceContainer = [];
            const choiceStartY = boxY + boxH - 50;
            let cx = pad + 4;

            for (let i = 0; i < config.choices.length; i++) {
                const choice = config.choices[i];
                const label = (i + 1) + '. ' + choice.text;
                const choiceText = scene.add.text(cx, choiceStartY, label, {
                    fontSize: '12px', fill: '#bfeee0', fontFamily: 'monospace',
                    padding: { left: 8, right: 8, top: 3, bottom: 3 }
                }).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

                choiceText.on('pointerover', () => choiceText.setStyle({ fill: '#ffffff' }));
                choiceText.on('pointerout', () => choiceText.setStyle({ fill: '#aaaacc' }));
                choiceText.on('pointerdown', () => {
                    if (config.onChoice) config.onChoice(i);
                });

                elems.push(choiceText);
                cx += choiceText.width + 10;
            }
        }

        // Close hint
        elems.push(scene.add.text(w - pad - 4, boxY + boxH - 14, 'ESC 关闭', {
            fontSize: '9px', fill: '#555555', fontFamily: 'monospace'
        }).setScrollFactor(0).setDepth(201).setOrigin(1, 0));
    },

    hide() {
        if (this._typewriterTimer) {
            this._typewriterTimer.destroy();
            this._typewriterTimer = null;
        }
        for (const elem of this._elements) {
            if (elem && elem.destroy) elem.destroy();
        }
        this._elements = [];
        this._typewriterCallback = null;
    }
};
