const CombatManager = {
    _scene: null,
    _monster: null,
    _player: null,
    _turn: 0,
    _phase: 'init',
    _log: [],

    init(scene, monsterData) {
        this._scene = scene;
        this._turn = 0;
        this._phase = 'init';
        this._log = [];

        // Create monster entity
        this._monster = new Monster(scene, 600, 280, monsterData);

        // Player combat stats
        this._player = {
            name: GameState.playerName || '修士',
            hp: GameState.currentHP,
            maxHP: GameState.maxHP,
            atk: CultivationData.getEffectiveStats().atk,
            def: CultivationData.getEffectiveStats().def,
            spd: CultivationData.getEffectiveStats().spd,
            qi: GameState.playerQi
        };

        return { monster: this._monster, player: this._player };
    },

    startCombat() {
        this._phase = 'active';
        this._nextTurn();
    },

    _nextTurn() {
        this._turn++;
        const pSpd = this._player.spd;
        const mSpd = this._monster.monsterData.spd;

        // Player goes first if speed is higher or equal
        if (pSpd >= mSpd) {
            this._phase = 'player_turn';
            return 'player';
        } else {
            this._phase = 'enemy_turn';
            this._doEnemyTurn();
            return 'enemy';
        }
    },

    playerAttack() {
        if (this._phase !== 'player_turn') return null;
        const dmg = this._calcDamage(this._player.atk, this._monster.monsterData.def, 1);
        const killed = this._monster.takeDamage(dmg);
        this._log.push('你对 ' + this._monster.monsterData.name + ' 造成 ' + dmg + ' 点伤害');
        const result = { action: 'attack', damage: dmg, killed };
        if (killed) {
            this._endCombat('victory');
        } else {
            this._phase = 'enemy_turn';
            this._doEnemyTurn();
        }
        return result;
    },

    playerTechnique(techId) {
        if (this._phase !== 'player_turn') return null;
        const tech = ItemDatabase.getItemById(techId);
        if (!tech || tech.category !== 'technique') return null;
        if (this._player.qi < tech.qiCost) return { error: '灵力不足' };

        this._player.qi -= tech.qiCost;
        const mult = GameConstants.COMBAT_TECHNIQUE_MULTIPLIER;
        const dmg = this._calcDamage(this._player.atk, this._monster.monsterData.def, mult);
        const killed = this._monster.takeDamage(dmg);
        this._log.push('你使用 ' + tech.name + ' 造成 ' + dmg + ' 点伤害');
        const result = { action: 'technique', tech: tech.name, damage: dmg, killed, qiCost: tech.qiCost };
        if (killed) {
            this._endCombat('victory');
        } else {
            this._phase = 'enemy_turn';
            this._doEnemyTurn();
        }
        return result;
    },

    playerFlee() {
        if (this._phase !== 'player_turn') return null;
        const spdDiff = this._player.spd - this._monster.monsterData.spd;
        const chance = GameConstants.COMBAT_FLEE_BASE_CHANCE + spdDiff * GameConstants.COMBAT_FLEE_SPEED_FACTOR;
        const success = Math.random() < Math.max(0.1, Math.min(0.95, chance));
        if (success) {
            this._log.push('你成功逃脱了！');
            this._endCombat('fled');
            return { success: true };
        } else {
            this._log.push('逃脱失败！');
            this._phase = 'enemy_turn';
            this._doEnemyTurn();
            return { success: false };
        }
    },

    playerUseItem(itemId) {
        if (this._phase !== 'player_turn') return null;
        const item = ItemDatabase.getItemById(itemId);
        if (!item) return null;

        if (item.category === 'pill' && item.type === 'heal') {
            const healAmt = item.value || 30;
            this._player.hp = Math.min(this._player.maxHP, this._player.hp + healAmt);
            InventoryManager.useItem(itemId);
            this._log.push('你使用 ' + item.name + ' 恢复了 ' + healAmt + ' 点气血');
            this._phase = 'enemy_turn';
            this._doEnemyTurn();
            return { action: 'heal', amount: healAmt };
        }
        return { error: '战斗中无法使用此物品' };
    },

    _doEnemyTurn() {
        if (!this._monster.isAlive()) return;
        this._scene.time.delayedCall(600, () => {
            const action = CombatAI.decideAction(this._monster, this._player);
            if (action.type === 'attack') {
                const dmg = this._calcDamage(this._monster.monsterData.atk, this._player.def, 1);
                this._player.hp = Math.max(0, this._player.hp - dmg);
                this._log.push(this._monster.monsterData.name + ' 攻击造成 ' + dmg + ' 点伤害');
                Events.emit('enemyAttacked', dmg);
                if (this._player.hp <= 0) {
                    this._endCombat('defeat');
                    return;
                }
            }
            this._phase = 'player_turn';
            Events.emit('playerTurn');
        });
    },

    _calcDamage(atk, def, multiplier) {
        const raw = atk * multiplier - def * GameConstants.COMBAT_DEFENSE_RATIO;
        return Math.max(GameConstants.COMBAT_DAMAGE_MIN, Math.floor(raw));
    },

    _endCombat(result) {
        this._phase = result;
        if (result === 'victory') {
            const rewards = this._monster.getRewards();
            CultivationSystem.gainQi(rewards.qi);
            GameState.playerGold += rewards.gold;
            GameState.currentHP = this._player.hp;
            this._log.push('战斗胜利！获得 ' + rewards.qi + ' 灵力, ' + rewards.gold + ' 灵石');
            if (this._monster.monsterData.drops && Math.random() < 0.55) {
                const dropId = RandomUtils.pick(this._monster.monsterData.drops);
                const qty = RandomUtils.intBetween(1, 3);
                if (InventoryManager.addItem(dropId, qty)) {
                    const item = ItemDatabase.getItemById(dropId);
                    this._log.push('获得材料：' + (item ? item.name : dropId) + (qty > 1 ? ' x' + qty : ''));
                }
            }
            // 10% chance for random technique scroll
            if (Math.random() < 0.12) {
                const techs = ItemDatabase.techniques.filter(t => ['凡品', '良品', '灵品'].includes(t.quality));
                if (techs.length > 0) {
                    const t = techs[Math.floor(Math.random() * techs.length)];
                    InventoryManager.addItem(t.id, 1);
                }
            }
        } else if (result === 'defeat') {
            GameState.playerGold = Math.max(0, GameState.playerGold - Math.floor(GameState.playerGold * 0.2));
            GameState.currentHP = Math.floor(GameState.maxHP * 0.3);
            this._log.push('你被击败了... 损失了部分灵石');
        } else if (result === 'fled') {
            GameState.currentHP = this._player.hp;
        }
        GameState.playerQi = this._player.qi;
        Events.emit('combatEnd', result);
    },

    getPhase() { return this._phase; },
    getLog() { return this._log; },
    getMonster() { return this._monster; },
    getPlayer() { return this._player; },

    destroy() {
        if (this._monster && this._monster.active) {
            this._monster.destroy();
        }
        this._monster = null;
        this._player = null;
        this._scene = null;
        this._log = [];
    }
};
