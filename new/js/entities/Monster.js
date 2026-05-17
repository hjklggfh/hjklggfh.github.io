class Monster extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, monsterData) {
        super(scene, x, y, 'monster');
        scene.add.existing(this);
        this.monsterData = monsterData || {
            name: '小妖', hp: 50, atk: 8, def: 3, spd: 5,
            qiReward: 30, goldReward: 20, rarity: 'common'
        };
        this.currentHP = this.monsterData.hp;
        this.maxHP = this.monsterData.hp;
        this.setDepth(20);
    }

    takeDamage(amount) {
        this.currentHP = Math.max(0, this.currentHP - amount);
        // Flash red
        this.setTint(0xff4444);
        if (this.scene) {
            this.scene.time.delayedCall(150, () => {
                if (this.active) this.clearTint();
            });
        }
        return this.currentHP <= 0;
    }

    isAlive() {
        return this.currentHP > 0;
    }

    getStats() {
        return {
            hp: this.currentHP,
            maxHP: this.maxHP,
            atk: this.monsterData.atk,
            def: this.monsterData.def,
            spd: this.monsterData.spd,
            name: this.monsterData.name
        };
    }

    getRewards() {
        return {
            qi: this.monsterData.qiReward || 30,
            gold: this.monsterData.goldReward || 20
        };
    }
}

// Static method to pick a random monster based on area difficulty
Monster.pickForArea = function (mapId) {
    const templates = GameConstants.MONSTERS;
    const weights = { common: 50, uncommon: 30, rare: 15, boss: 5 };
    if (mapId === 'world-2') {
        weights.uncommon = 40; weights.rare = 25;
    } else if (mapId === 'world-3') {
        weights.uncommon = 30; weights.rare = 35; weights.boss = 15;
    }

    // Pick rarity first, then a monster of that rarity
    const rarityList = Object.entries(weights);
    const total = rarityList.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    let pickedRarity = rarityList[0][0];
    for (const [rarity, w] of rarityList) {
        r -= w;
        if (r <= 0) { pickedRarity = rarity; break; }
    }
    const pool = templates.filter(t => t.rarity === pickedRarity);
    return { ...(pool[Math.floor(Math.random() * pool.length)] || templates[0]) };
};
