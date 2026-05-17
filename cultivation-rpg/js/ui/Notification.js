const Notification = {
    _activeNotifications: [],

    show(scene, text, duration) {
        duration = duration || 2500;
        const w = scene.cameras.main.width;

        const textW = text.replace(/[^\x00-\xff]/g, 'aa').length * 6 + 40;
        const bg = scene.add.rectangle(w / 2, 30, textW, 30, 0x000000, 0.7)
            .setScrollFactor(0).setDepth(200);
        const txt = scene.add.text(w / 2, 30, text, {
            fontSize: '13px', fill: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

        const container = { bg, txt, scene: scene };

        scene.tweens.add({
            targets: [bg, txt],
            y: '-=10',
            alpha: 0,
            duration: 400,
            delay: duration - 400,
            onComplete: () => {
                bg.destroy();
                txt.destroy();
            }
        });

        // Shift existing notifications down
        for (const n of this._activeNotifications) {
            if (n.bg && n.bg.active) {
                scene.tweens.add({ targets: [n.bg, n.txt], y: '+=32', duration: 150 });
            }
        }
        this._activeNotifications.push(container);
        this._activeNotifications = this._activeNotifications.filter(n => n.bg && n.bg.active);
    }
};
