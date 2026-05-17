class NPC extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, npcData) {
        super(scene, x, y, 'npc');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.npcData = npcData || NPCDatabase.generateNPC();
        this.setCollideWorldBounds(true);
        this.setDepth(9);
        // NPCs are immovable so they don't push the player
        this.body.immovable = true;

        this.createAnimations(scene);
        this._applyAppearance();
        this.play('npc_idle_down');
        this._direction = 'down';
        this._nameplate = scene.add.text(x, y - 28, this.npcData.name + '·' + (this.npcData.title || ''), {
            fontSize: '9px', fill: '#fff0b8', fontFamily: 'monospace',
            stroke: '#1d2430', strokeThickness: 2
        }).setOrigin(0.5).setDepth(12);
    }

    createAnimations(scene) {
        if (scene.anims.exists('npc_walk_down')) return;

        // Frame layout: [down:idle,down:walk, left:idle,left:walk, right:idle,right:walk, up:idle,up:walk]
        scene.anims.create({ key: 'npc_walk_down',  frames: [{ key: 'npc', frame: 1 }], frameRate: 4, repeat: -1 });
        scene.anims.create({ key: 'npc_walk_left',  frames: [{ key: 'npc', frame: 3 }], frameRate: 4, repeat: -1 });
        scene.anims.create({ key: 'npc_walk_right', frames: [{ key: 'npc', frame: 5 }], frameRate: 4, repeat: -1 });
        scene.anims.create({ key: 'npc_walk_up',    frames: [{ key: 'npc', frame: 7 }], frameRate: 4, repeat: -1 });
        scene.anims.create({ key: 'npc_idle_down',  frames: [{ key: 'npc', frame: 0 }], frameRate: 1, repeat: -1 });
        scene.anims.create({ key: 'npc_idle_left',  frames: [{ key: 'npc', frame: 2 }], frameRate: 1, repeat: -1 });
        scene.anims.create({ key: 'npc_idle_right', frames: [{ key: 'npc', frame: 4 }], frameRate: 1, repeat: -1 });
        scene.anims.create({ key: 'npc_idle_up',    frames: [{ key: 'npc', frame: 6 }], frameRate: 1, repeat: -1 });
    }

    setDirection(dir) {
        this._direction = dir;
    }

    playWalk(dir) {
        this._direction = dir;
        this.play('npc_walk_' + dir, true);
    }

    playIdle(dir) {
        if (!dir) dir = this._direction;
        this.play('npc_idle_' + dir, true);
    }

    getInteractionPoint() {
        return { x: this.x, y: this.y };
    }

    _applyAppearance() {
        const app = this.npcData.appearance || {};
        if (app.robe) {
            this.setTint(Phaser.Display.Color.HexStringToColor(app.robe).color);
        }
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this._nameplate && this._nameplate.active) {
            this._nameplate.setPosition(this.x, this.y - 28);
        }
    }

    destroy(fromScene) {
        if (this._nameplate) this._nameplate.destroy();
        super.destroy(fromScene);
    }
}
