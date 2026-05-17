class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDepth(10);

        this.createAnimations(scene);
    }

    createAnimations(scene) {
        if (!scene.anims.exists('player_walk_down')) {
            // Frame layout: [down:idle,down:w1,down:w2, left:idle,left:w1,left:w2, right:idle,right:w1,right:w2, up:idle,up:w1,up:w2]
            const gen = (start) => scene.anims.generateFrameNumbers('player', { start, end: start + 1 });
            scene.anims.create({ key: 'player_walk_down',  frames: gen(1), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: 'player_walk_left',  frames: gen(4), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: 'player_walk_right', frames: gen(7), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: 'player_walk_up',    frames: gen(10), frameRate: 6, repeat: -1 });
            scene.anims.create({ key: 'player_idle_down',  frames: [{ key: 'player', frame: 0 }], frameRate: 1, repeat: -1 });
            scene.anims.create({ key: 'player_idle_left',  frames: [{ key: 'player', frame: 3 }], frameRate: 1, repeat: -1 });
            scene.anims.create({ key: 'player_idle_right', frames: [{ key: 'player', frame: 6 }], frameRate: 1, repeat: -1 });
            scene.anims.create({ key: 'player_idle_up',    frames: [{ key: 'player', frame: 9 }], frameRate: 1, repeat: -1 });
        }
    }

    handleMovement(cursors, wasd) {
        const speed = GameConstants.PLAYER_SPEED;
        let vx = 0, vy = 0;

        if (cursors.left.isDown  || (wasd && wasd.left.isDown))  vx = -speed;
        if (cursors.right.isDown || (wasd && wasd.right.isDown)) vx = speed;
        if (cursors.up.isDown    || (wasd && wasd.up.isDown))    vy = -speed;
        if (cursors.down.isDown  || (wasd && wasd.down.isDown))  vy = speed;

        this.setVelocity(vx, vy);

        const moving = vx !== 0 || vy !== 0;
        if (moving) {
            if (Math.abs(vx) >= Math.abs(vy)) {
                this.play(vx > 0 ? 'player_walk_right' : 'player_walk_left', true);
            } else {
                this.play(vy > 0 ? 'player_walk_down' : 'player_walk_up', true);
            }
        } else {
            const animKey = this.anims.currentAnim ? this.anims.currentAnim.key : 'player_idle_down';
            const dir = animKey.replace('player_walk_', '');
            this.play('player_idle_' + dir, true);
            this.setVelocity(0, 0);
        }
    }

    getDirection() {
        const key = this.anims.currentAnim ? this.anims.currentAnim.key : 'player_idle_down';
        return key.replace('player_walk_', '').replace('player_idle_', '');
    }
}
