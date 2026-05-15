/**
 * UIManager - handles all DOM-based UI updates.
 */
class UIManager {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.hudHearts = document.getElementById('hud-hearts');
        this.hudGold = document.getElementById('hud-gold');
        this.hudWave = document.getElementById('hud-wave');
        this.btnNextWave = document.getElementById('btn-next-wave');
        this.btnSpeed = document.getElementById('btn-speed');
        this.buildPanel = document.getElementById('build-panel');
        this.towerInfoPanel = document.getElementById('tower-info-panel');
        this.waveAnnounce = document.getElementById('wave-announce');
        this.gameOverPanel = document.getElementById('game-over-panel');
        this.gameOverTitle = document.getElementById('game-over-title');
        this.gameOverSubtitle = document.getElementById('game-over-subtitle');
        this.modeSelectPanel = document.getElementById('mode-select');
        this._bindEvents();
    }

    _bindEvents() {
        Events.on('goldChanged', (gold) => this.updateGold(gold));
        Events.on('carrotHPChanged', (hp, max) => this.updateHearts(hp, max));
        Events.on('waveStarted', (current, total, waveName) => this.onWaveStarted(current, total, waveName));
        Events.on('waveEnded', (waveIndex) => this.onWaveEnded(waveIndex));
        Events.on('gameWon', () => this.showGameOver(true));
        Events.on('gameLost', () => this.showGameOver(false));
        Events.on('platformSelected', (plat) => this.showBuildPanel(plat));
        Events.on('towerSelected', (tower) => this.showTowerInfo(tower));
        Events.on('obstacleSelected', (obs) => this.showObstacleInfo(obs));
        Events.on('deselectAll', () => this.hideAllPanels());
    }

    // ── Mode Selection ──

    showModeSelection() {
        if (this.modeSelectPanel) {
            this.modeSelectPanel.style.display = 'flex';
        }
        document.getElementById('hud').style.display = 'none';

        var normalBtn = document.querySelector('.mode-btn-normal');
        var endlessBtn = document.querySelector('.mode-btn-endless');
        if (normalBtn) {
            normalBtn.onclick = function () {
                if (window.Game && typeof window.Game.startGame === 'function') {
                    window.Game.startGame('normal');
                } else {
                    console.error('[UI] Game.startGame not available');
                }
            };
        }
        if (endlessBtn) {
            endlessBtn.onclick = function () {
                if (window.Game && typeof window.Game.startGame === 'function') {
                    window.Game.startGame('endless');
                } else {
                    console.error('[UI] Game.startGame not available');
                }
            };
        }
        console.log('[UI] Mode selection shown. Buttons bound:', !!normalBtn, !!endlessBtn);
    }

    hideModeSelection() {
        if (this.modeSelectPanel) {
            this.modeSelectPanel.style.display = 'none';
        }
        document.getElementById('hud').style.display = 'flex';
    }

    // ── HUD ──

    initHearts(maxHP) {
        this.hudHearts.innerHTML = '';
        for (var i = 0; i < maxHP; i++) {
            var span = document.createElement('span');
            span.className = 'hud-heart';
            span.textContent = '❤️';
            this.hudHearts.appendChild(span);
        }
    }

    updateHearts(hp, maxHP) {
        var hearts = this.hudHearts.children;
        if (hearts.length !== maxHP) this.initHearts(maxHP);
        for (var i = 0; i < hearts.length; i++) {
            hearts[i].textContent = i < hp ? '❤️' : '🖤';
        }
    }

    updateGold(gold) {
        this.hudGold.textContent = gold;
    }

    updateWave(text) {
        this.hudWave.textContent = text;
    }

    onWaveStarted(current, total, waveName) {
        if (GameConfig.gameMode === 'endless' || total > 99) {
            this.updateWave('∞ 无尽 第' + current + '波');
        } else {
            this.updateWave('Wave ' + current + '/' + total);
        }
        this.btnNextWave.style.display = 'none';

        var name = waveName || '第 ' + current + ' 波';
        this._announceWave(name);
    }

    onWaveEnded(waveIndex) {
        if (GameConfig.gameMode === 'endless') {
            this.updateWave('∞ 第' + waveIndex + '波 已清除');
        } else {
            this.updateWave('第' + waveIndex + '波 已清除');
        }
        if (!GameConfig.autoAdvanceWaves && typeof WaveMgr !== 'undefined' && WaveMgr && WaveMgr.hasMoreWaves()) {
            this.btnNextWave.style.display = 'block';
        }
    }

    _announceWave(text) {
        var el = this.waveAnnounce;
        el.textContent = text;
        el.style.opacity = '1';
        clearTimeout(this._announceTimer);
        this._announceTimer = setTimeout(function () {
            el.style.opacity = '0';
        }, GameConfig.waveAnnounceDuration);
    }

    // ── Build Panel ──

    showBuildPanel(platform) {
        this.hideAllPanels();
        if (!platform) return;

        if (platform.tower) return;

        var panel = this.buildPanel;
        panel.innerHTML = '';
        var self = this;

        Object.entries(GameConfig.towers).forEach(function (entry) {
            var key = entry[0];
            var towerData = entry[1];
            var cost = towerData.levels[0].upgradeCost;
            var canAfford = window.GoldMgr && window.GoldMgr.canAfford(cost);

            var btn = document.createElement('div');
            btn.className = 'tower-btn' + (canAfford ? '' : ' disabled');
            btn.innerHTML = '<div class="tower-btn-icon" style="background:' + towerData.color + '">' + towerData.icon + '</div>'
                + '<div class="tower-btn-info">'
                + '<div class="tower-btn-name">' + towerData.name + '</div>'
                + '<div class="tower-btn-cost">💰' + cost + '</div>'
                + '<div class="tower-btn-desc">' + towerData.description + '</div>'
                + '</div>';

            if (canAfford) {
                btn.addEventListener('click', function () {
                    Events.emit('buildTower', key, platform);
                });
            }

            panel.appendChild(btn);
        });

        this._positionPanel(panel, platform.x, platform.y);
        panel.style.display = 'flex';
    }

    // ── Tower Info Panel ──

    showTowerInfo(tower) {
        this.hideAllPanels();
        if (!tower) return;

        var panel = this.towerInfoPanel;
        var stats = tower.stats;
        var data = tower.data;
        var canUpgrade = tower.canUpgrade() && window.GoldMgr && window.GoldMgr.canAfford(tower.getUpgradeCost());
        var upgradeCost = tower.getUpgradeCost();

        var statsHtml = 'DMG: ' + stats.damage + '<br>射程: ' + stats.range + '<br>攻速: ' + stats.fireRate + '/s';
        if (data.appliesSlow) statsHtml += '<br>减速: ' + Math.round((1 - data.slowFactor) * 100) + '%';
        if (data.hasSplash) statsHtml += '<br>溅射: ' + data.splashRadius;
        if (data.isPenetrating) statsHtml += '<br>穿透';

        panel.innerHTML = '<div class="tower-info-header">'
            + '<span class="tower-info-name">' + data.icon + ' ' + data.name + '</span>'
            + '<span class="tower-info-level">Lv.' + tower.level + ' ' + '★'.repeat(tower.level) + '</span>'
            + '<button class="info-btn-close">✕</button>'
            + '</div>'
            + '<div class="tower-info-stats">' + statsHtml + '</div>'
            + '<div class="tower-info-buttons">'
            + '<button class="info-btn info-btn-upgrade" ' + (canUpgrade ? '' : 'disabled') + '>'
            + '升级 💰' + (tower.level < 3 ? upgradeCost : 'MAX')
            + '</button>'
            + '<button class="info-btn info-btn-sell">'
            + '卖出 💰' + tower.getSellValue()
            + '</button>'
            + '</div>';

        panel.querySelector('.info-btn-close').addEventListener('click', function () {
            if (window.Input) window.Input.deselectAll();
        });

        if (canUpgrade) {
            panel.querySelector('.info-btn-upgrade').addEventListener('click', function () {
                Events.emit('upgradeTower', tower);
            });
        }

        panel.querySelector('.info-btn-sell').addEventListener('click', function () {
            Events.emit('sellTower', tower);
        });

        this._positionPanel(panel, tower.x, tower.y);
        panel.style.display = 'flex';
    }

    // ── Obstacle Info Panel ──

    showObstacleInfo(obstacle) {
        this.hideAllPanels();
        if (!obstacle) return;

        var panel = this.towerInfoPanel;
        var hpPct = Math.round(obstacle.getHPPercent() * 100);
        var obsName = GameConfig.obstacles[obstacle.type].name;

        panel.innerHTML = '<div class="tower-info-header">'
            + '<span class="tower-info-name">' + obstacle.icon + ' ' + obsName + '</span>'
            + '<button class="info-btn-close">✕</button>'
            + '</div>'
            + '<div class="tower-info-stats">'
            + 'HP: ' + Math.round(obstacle.hp) + '/' + obstacle.maxHP + ' (' + hpPct + '%)<br>'
            + '类型: 障碍物 — 阻挡视线<br>'
            + (obstacle.reward > 0 ? '摧毁奖励: 💰' + obstacle.reward : '摧毁奖励: 无')
            + '</div>'
            + '<div style="font-size:11px;color:#aaa;padding:4px 0;">'
            + '点击空地建造炮塔，炮塔会自动攻击障碍物'
            + '</div>';

        panel.querySelector('.info-btn-close').addEventListener('click', function () {
            if (window.Input) window.Input.deselectAll();
        });

        this._positionPanel(panel, obstacle.x, obstacle.y);
        panel.style.display = 'flex';
    }

    _positionPanel(panel, wx, wy) {
        var rect = this.canvas.getBoundingClientRect();
        var scaleX = rect.width / this.canvas.width;
        var scaleY = rect.height / this.canvas.height;
        var sx = rect.left + wx * scaleX + 40;
        var sy = rect.top + wy * scaleY - 60;

        if (sx + 200 > window.innerWidth) sx = sx - 240;
        if (sy + 200 > window.innerHeight) sy = sy - 180;
        if (sx < 5) sx = 5;
        if (sy < 5) sy = 5;

        panel.style.left = sx + 'px';
        panel.style.top = sy + 'px';
    }

    hideAllPanels() {
        this.buildPanel.style.display = 'none';
        this.towerInfoPanel.style.display = 'none';
    }

    // ── Game Over ──

    showGameOver(won) {
        var subtitle;
        if (GameConfig.gameMode === 'endless') {
            var waves = window.Game && window.Game.endlessWaveCount ? window.Game.endlessWaveCount : 0;
            subtitle = won ? '无尽模式 — 坚持了 ' + waves + ' 波!' : '无尽模式 — 在第 ' + waves + ' 波被击败';
        } else {
            subtitle = won ? '你成功保卫了萝卜!' : '萝卜被吃掉了...';
        }

        this.gameOverPanel.style.display = 'flex';
        this.gameOverTitle.textContent = won ? '🎉 胜利!' : '💀 失败!';
        this.gameOverTitle.style.color = won ? '#ffd700' : '#f44336';
        this.gameOverSubtitle.textContent = subtitle;
    }

    hideGameOver() {
        this.gameOverPanel.style.display = 'none';
    }
}
