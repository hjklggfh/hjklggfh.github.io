class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Loading bar
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const bar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x333333, 0.8);
        progressBox.fillRect(w / 2 - 160, h / 2 - 15, 320, 30);

        const loadingText = this.add.text(w / 2, h / 2 - 40, '加载中...', {
            fontSize: '18px', fill: '#ffffff', fontFamily: 'monospace'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            bar.clear();
            bar.fillStyle(0x44aaff, 1);
            bar.fillRect(w / 2 - 150, h / 2 - 5, 300 * value, 10);
        });

        this.load.on('complete', () => {
            bar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Generate placeholder textures
        this._generatePlaceholderTextures();

        // Load map JSON files (if they exist, otherwise we use procedural)
        this.load.json('world-1', 'assets/maps/world-1.json');
        this.load.json('world-2', 'assets/maps/world-2.json');
        this.load.json('world-3', 'assets/maps/world-3.json');
    }

    _generatePlaceholderTextures() {
        // Player: 12 frames (4 dirs × 3 frames), 32×32 each = 384×32
        const playerCanvas = this.textures.createCanvas('player', 384, 32);
        const pctx = playerCanvas.context;
        const pColors = { hair: '#2a1a0a', skin: '#ffcc88', robe: '#4488ff', inner: '#5599ff', pants: '#334477', shoes: '#332211', belt: '#ccaa44', eyes: '#222222' };
        for (let dir = 0; dir < 4; dir++) {
            for (let f = 0; f < 3; f++) {
                this._drawHumanoid(pctx, (dir * 3 + f) * 32, 0, dir, f, pColors);
            }
        }
        playerCanvas.refresh();
        // Add spritesheet frame data so Phaser can reference individual 32x32 frames
        const ptex = this.textures.get('player');
        for (let i = 0; i < 12; i++) { ptex.add(i, 0, i * 32, 0, 32, 32); }

        // NPC: 8 frames (4 dirs × 2 frames), 32×32 each = 256×32
        const npcCanvas = this.textures.createCanvas('npc', 256, 32);
        const nctx = npcCanvas.context;
        const nColors = { hair: '#1a1a1a', skin: '#eebb77', robe: '#669944', inner: '#88bb66', pants: '#445533', shoes: '#332211', belt: '#886622', eyes: '#222222' };
        for (let dir = 0; dir < 4; dir++) {
            for (let f = 0; f < 2; f++) {
                this._drawHumanoid(nctx, (dir * 2 + f) * 32, 0, dir, f === 0 ? 0 : 1, nColors);
            }
        }
        npcCanvas.refresh();
        const ntex = this.textures.get('npc');
        for (let i = 0; i < 8; i++) { ntex.add(i, 0, i * 32, 0, 32, 32); }

        // Monster: 32×32 single frame — demon/slime shape
        const monCanvas = this.textures.createCanvas('monster', 32, 32);
        const mctx = monCanvas.context;
        this._drawMonster(mctx, 0, 0);
        monCanvas.refresh();
        const mtex = this.textures.get('monster');
        mtex.add(0, 0, 0, 0, 32, 32);

        // Terrain tileset: 8 tile types, 32×32 each
        const terCanvas = this.textures.createCanvas('terrain', 256, 32);
        const tctx = terCanvas.context;
        const tileColors = ['#2d5a1e', '#1a4a0a', '#3d6a2e', '#8b6914', '#5a8aae', '#555555', '#8b7355', '#4a8a3a'];
        for (let i = 0; i < 8; i++) {
            const ox = i * 32;
            tctx.fillStyle = tileColors[i];
            tctx.fillRect(ox, 0, 32, 32);
            tctx.strokeStyle = 'rgba(0,0,0,0.1)';
            tctx.strokeRect(ox, 0, 32, 32);
        }
        terCanvas.refresh();
        const ttex = this.textures.get('terrain');
        for (let i = 0; i < 8; i++) { ttex.add(i, 0, i * 32, 0, 32, 32); }
    }

    _drawHumanoid(ctx, ox, oy, dir, frame, c) {
        // dir: 0=down, 1=left, 2=right, 3=up
        // frame: 0=idle, 1=walk1, 2=walk2
        const isWalk = frame > 0;
        const legShift = isWalk ? (frame === 1 ? 1 : -1) : 0;

        const fill = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(ox + x, oy + y, w, h); };

        if (dir === 0) {
            // --- FACING DOWN (front) ---
            // Hair
            fill(11, 0, 10, 2, c.hair); fill(10, 1, 12, 2, c.hair);
            // Head
            fill(10, 2, 12, 5, c.skin); fill(11, 1, 10, 1, c.skin);
            fill(12, 7, 8, 1, c.skin);
            // Eyes
            fill(13, 4, 2, 2, c.eyes); fill(17, 4, 2, 2, c.eyes);
            // Neck
            fill(13, 8, 6, 2, c.skin);
            // Robe body
            fill(9, 10, 14, 10, c.robe);
            fill(8, 11, 2, 8, c.robe); fill(22, 11, 2, 8, c.robe);
            // Inner robe (center line)
            fill(14, 10, 4, 10, c.inner);
            // Belt
            fill(9, 16, 14, 2, c.belt);
            // Arms
            const armSwing = isWalk ? (frame === 1 ? 1 : -1) : 0;
            fill(7, 11, 2, 6, c.skin); fill(6 + armSwing, 17, 3, 2, c.skin);
            fill(23, 11, 2, 6, c.skin); fill(23 - armSwing, 17, 3, 2, c.skin);
            // Pants
            fill(11, 18, 4, 7, c.pants); fill(17, 18, 4, 7, c.pants);
            // Legs
            fill(11 + legShift, 20, 3, 6, c.pants); fill(18 - legShift, 20, 3, 6, c.pants);
            // Shoes
            fill(10 + legShift, 26, 5, 3, c.shoes); fill(17 - legShift, 26, 5, 3, c.shoes);
        } else if (dir === 1) {
            // --- FACING LEFT ---
            // Hair (side/back)
            fill(10, 0, 12, 2, c.hair); fill(9, 1, 14, 2, c.hair);
            // Head (profile)
            fill(10, 2, 10, 5, c.skin); fill(9, 3, 2, 3, c.skin);
            fill(11, 7, 8, 1, c.skin);
            // Eye (visible side)
            fill(14, 4, 2, 2, c.eyes);
            // Neck
            fill(12, 8, 5, 2, c.skin);
            // Robe body (side view, narrower)
            fill(10, 10, 10, 10, c.robe);
            fill(9, 11, 2, 8, c.robe); fill(20, 11, 1, 8, c.robe);
            // Inner
            fill(13, 10, 3, 10, c.inner);
            // Belt
            fill(10, 16, 10, 2, c.belt);
            // Arms
            const armSwing = isWalk ? (frame === 1 ? 1 : -1) : 0;
            fill(8, 11, 2, 6, c.skin); fill(7 + armSwing, 17, 3, 2, c.skin);
            fill(19, 12, 2, 5, c.skin);
            // Pants
            fill(12, 18, 4, 7, c.pants);
            // Legs
            fill(12 + legShift, 20, 3, 6, c.pants); fill(16 - legShift, 20, 3, 6, c.pants);
            // Shoes
            fill(11 + legShift, 26, 5, 3, c.shoes); fill(15 - legShift, 26, 5, 3, c.shoes);
        } else if (dir === 2) {
            // --- FACING RIGHT (mirror of left) ---
            fill(10, 0, 12, 2, c.hair); fill(9, 1, 14, 2, c.hair);
            fill(12, 2, 10, 5, c.skin); fill(21, 3, 2, 3, c.skin);
            fill(13, 7, 8, 1, c.skin);
            fill(16, 4, 2, 2, c.eyes);
            fill(15, 8, 5, 2, c.skin);
            fill(12, 10, 10, 10, c.robe);
            fill(11, 11, 2, 8, c.robe); fill(22, 11, 1, 8, c.robe);
            fill(16, 10, 3, 10, c.inner);
            fill(12, 16, 10, 2, c.belt);
            const armSwing = isWalk ? (frame === 1 ? 1 : -1) : 0;
            fill(22, 11, 2, 6, c.skin); fill(22 - armSwing, 17, 3, 2, c.skin);
            fill(11, 12, 2, 5, c.skin);
            fill(16, 18, 4, 7, c.pants);
            fill(16 + legShift, 20, 3, 6, c.pants); fill(12 - legShift, 20, 3, 6, c.pants);
            fill(16 + legShift, 26, 5, 3, c.shoes); fill(12 - legShift, 26, 5, 3, c.shoes);
        } else {
            // --- FACING UP (back view) ---
            // Hair (full back of head)
            fill(9, 0, 14, 3, c.hair); fill(8, 3, 16, 1, c.hair);
            // Head (back — mostly hair with skin edges)
            fill(10, 3, 12, 4, c.hair); fill(10, 7, 12, 1, c.skin);
            // Neck (back)
            fill(13, 8, 6, 2, c.skin);
            // Robe (back view)
            fill(9, 10, 14, 10, c.robe);
            fill(8, 11, 2, 8, c.robe); fill(22, 11, 2, 8, c.robe);
            fill(14, 10, 4, 10, c.inner);
            // Belt
            fill(9, 16, 14, 2, c.belt);
            // Arms (back)
            const armSwing = isWalk ? (frame === 1 ? 1 : -1) : 0;
            fill(7, 11, 2, 6, c.skin); fill(6 + armSwing, 17, 3, 2, c.skin);
            fill(23, 11, 2, 6, c.skin); fill(23 - armSwing, 17, 3, 2, c.skin);
            // Pants
            fill(11, 18, 4, 7, c.pants); fill(17, 18, 4, 7, c.pants);
            // Legs
            fill(11 + legShift, 20, 3, 6, c.pants); fill(18 - legShift, 20, 3, 6, c.pants);
            // Shoes
            fill(10 + legShift, 26, 5, 3, c.shoes); fill(17 - legShift, 26, 5, 3, c.shoes);
        }
    }

    _drawMonster(ctx, ox, oy) {
        const fill = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(ox + x, oy + y, w, h); };
        // Dark body blob
        fill(6, 4, 20, 22, '#442244');
        fill(4, 6, 4, 16, '#442244');
        fill(24, 6, 4, 16, '#442244');
        fill(8, 2, 16, 4, '#553355');
        // Eyes (glowing red)
        fill(10, 8, 4, 4, '#ff3333');
        fill(18, 8, 4, 4, '#ff3333');
        fill(11, 9, 2, 2, '#ff8888');
        fill(19, 9, 2, 2, '#ff8888');
        // Mouth
        fill(12, 16, 8, 3, '#331122');
        fill(13, 17, 6, 1, '#ff4444');
        // Claws/feet
        fill(8, 26, 6, 3, '#332244');
        fill(18, 26, 6, 3, '#332244');
        // Horns
        fill(8, 0, 3, 4, '#553344');
        fill(21, 0, 3, 4, '#553344');
    }

    create() {
        this.scene.start('MenuScene');
    }
}
