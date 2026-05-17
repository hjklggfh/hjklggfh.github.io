/**
 * GoldManager - handles currency.
 */
class GoldManager {
    constructor() {
        this.gold = GameConfig.startingGold;
    }

    canAfford(amount) {
        return this.gold >= amount;
    }

    spend(amount) {
        if (!this.canAfford(amount)) return false;
        this.gold -= amount;
        Events.emit('goldChanged', this.gold);
        return true;
    }

    earn(amount) {
        this.gold += amount;
        Events.emit('goldChanged', this.gold);
    }

    reset() {
        this.gold = GameConfig.startingGold;
        Events.emit('goldChanged', this.gold);
    }
}

/**
 * Carrot health manager.
 */
class CarrotManager {
    constructor() {
        this.maxHP = GameConfig.carrotMaxHP;
        this.hp = this.maxHP;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        Events.emit('carrotHPChanged', this.hp, this.maxHP);
        if (this.hp <= 0) {
            Events.emit('gameLost');
        }
    }

    reset() {
        this.hp = this.maxHP;
        Events.emit('carrotHPChanged', this.hp, this.maxHP);
    }
}
