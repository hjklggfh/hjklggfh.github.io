/**
 * UIManager - handles all DOM-based UI updates.
 */
function UIManager() {
    var self = this;
    this.canvas = document.getElementById('game-canvas');
    this.hudHearts = document.getElementById('hud-hearts');
    this.hudGold = document.getElementById('hud-gold');
    this.hudWave = document.getElementById('hud-wave');
    this.btnNextWave = document.getElementById('btn-next-wave');
    this.btnEndlessStart = document.getElementById('btn-endless-start');
    this.btnSpeed = document.getElementById('btn-speed');
    this.btnPause = document.getElementById('btn-pause');
    this.buildPanel = document.getElementById('build-panel');
    this.towerInfoPanel = document.getElementById('tower-info-panel');
    this.waveAnnounce = document.getElementById('wave-announce');
    this.gameOverPanel = document.getElementById('game-over-panel');
    this.gameOverTitle = document.getElementById('game-over-title');
    this.gameOverSubtitle = document.getElementById('game-over-subtitle');
    this.modeSelectPanel = document.getElementById('mode-select');

    // Wire static buttons
    if (this.btnNextWave) this.btnNextWave.onclick = function () { window.Game.startNextWave(); };
    if (this.btnEndlessStart) this.btnEndlessStart.onclick = function () { window.Game.startEndlessWaves(); };
    if (this.btnSpeed) this.btnSpeed.onclick = function () { window.Game.toggleSpeed(); };
    if (this.btnPause) this.btnPause.onclick = function () { window.Game.togglePause(); };

    var gameOverBtn = document.getElementById('game-over-btn');
    if (gameOverBtn) gameOverBtn.onclick = function () { window.Game.restart(); };

    var pauseResumeBtn = document.querySelector('.pause-resume-btn');
    if (pauseResumeBtn) pauseResumeBtn.onclick = function () { window.Game.togglePause(); };

    this._bindEvents();
}

UIManager.prototype._bindEvents = function () {
    var self = this;
    Events.on('goldChanged', function (g) { self.updateGold(g); });
    Events.on('carrotHPChanged', function (hp, max) { self.updateHearts(hp, max); });
    Events.on('waveStarted', function (current, total, waveName) { self.onWaveStarted(current, total, waveName); });
    Events.on('waveEnded', function (waveIndex) { self.onWaveEnded(waveIndex); });
    Events.on('gameWon', function () { self.showGameOver(true); });
    Events.on('gameLost', function () { self.showGameOver(false); });
    Events.on('platformSelected', function (plat) { self.showBuildPanel(plat); });
    Events.on('towerSelected', function (tower) { self.showTowerInfo(tower); });
    Events.on('obstacleSelected', function (obs) { self.showObstacleInfo(obs); });
    Events.on('deselectAll', function () { self.hideAllPanels(); });
};

UIManager.prototype.showModeSelection = function () {
    if (this.modeSelectPanel) this.modeSelectPanel.style.display = 'flex';
    var normalBtn = document.getElementById('btn-mode-normal');
    var endlessBtn = document.getElementById('btn-mode-endless');
    if (normalBtn) normalBtn.onclick = function () { window.Game.startGame('normal'); };
    if (endlessBtn) endlessBtn.onclick = function () { window.Game.startGame('endless'); };
};

UIManager.prototype.hideModeSelection = function () {
    if (this.modeSelectPanel) this.modeSelectPanel.style.display = 'none';
};

UIManager.prototype.initHearts = function (maxHP) {
    this.hudHearts.innerHTML = '';
    for (var i = 0; i < maxHP; i++) {
        var span = document.createElement('span');
        span.className = 'hud-heart';
        span.textContent = '❤️';
        this.hudHearts.appendChild(span);
    }
};

UIManager.prototype.updateHearts = function (hp, maxHP) {
    var hearts = this.hudHearts.children;
    if (hearts.length !== maxHP) this.initHearts(maxHP);
    for (var i = 0; i < hearts.length; i++) {
        hearts[i].textContent = i < hp ? '❤️' : '🖤';
    }
};

UIManager.prototype.updateGold = function (gold) { this.hudGold.textContent = gold; };
UIManager.prototype.updateWave = function (text) { this.hudWave.textContent = text; };

UIManager.prototype.onWaveStarted = function (current, total, waveName) {
    if (GameConfig.gameMode === 'endless' || total > 99) {
        this.updateWave('∞ 第' + current + '波');
    } else {
        this.updateWave('Wave ' + current + '/' + total);
    }
    this.btnNextWave.style.display = 'none';
    this.btnEndlessStart.style.display = 'none';
    var name = waveName || ('第 ' + current + ' 波');
    this._announceWave(name);
};

UIManager.prototype.onWaveEnded = function (waveIndex) {
    if (GameConfig.gameMode === 'endless') {
        this.updateWave('∞ 第' + waveIndex + '波 清除');
    } else {
        this.updateWave('第' + waveIndex + '波 清除');
    }
    if (!GameConfig.autoAdvanceWaves && GameConfig.gameMode !== 'endless' && window.WaveMgr && window.WaveMgr.hasMoreWaves()) {
        this.btnNextWave.style.display = 'block';
    }
};

UIManager.prototype._announceWave = function (text) {
    var el = this.waveAnnounce;
    el.textContent = text;
    el.style.opacity = '1';
    clearTimeout(this._announceTimer);
    var self = this;
    this._announceTimer = setTimeout(function () { el.style.opacity = '0'; }, GameConfig.waveAnnounceDuration);
};

UIManager.prototype.showBuildPanel = function (platform) {
    this.hideAllPanels();
    if (!platform || platform.tower) return;

    var panel = this.buildPanel;
    panel.innerHTML = '';
    var self = this;

    var keys = Object.keys(GameConfig.towers);
    for (var k = 0; k < keys.length; k++) {
        (function () {
            var key = keys[k];
            var towerData = GameConfig.towers[key];
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
        })();
    }

    this._positionPanel(panel, platform.x, platform.y);
    panel.style.display = 'flex';
};

UIManager.prototype.showTowerInfo = function (tower) {
    this.hideAllPanels();
    if (!tower || !tower.alive) return;

    var panel = this.towerInfoPanel;
    var stats = tower.stats;
    var data = tower.data;
    var canUpgrade = tower.canUpgrade() && window.GoldMgr && window.GoldMgr.canAfford(tower.getUpgradeCost());
    var upgradeCost = tower.getUpgradeCost();
    var hpPct = Math.round(tower.getHPPercent() * 100);
    var needsRepair = tower.hp < tower.maxHP;
    var canRepair = needsRepair && window.GoldMgr && window.GoldMgr.canAfford(tower.getRepairCost());
    var repairCost = tower.getRepairCost();

    var hpBarClass = hpPct > 50 ? '' : hpPct > 25 ? 'warn' : 'danger';

    var statsHtml = 'DMG: ' + stats.damage + '<br>射程: ' + stats.range + '<br>攻速: ' + stats.fireRate + '/s';
    if (data.appliesSlow) statsHtml += '<br>减速: ' + Math.round((1 - data.slowFactor) * 100) + '%';
    if (data.hasSplash) statsHtml += '<br>溅射: ' + data.splashRadius;
    if (data.isPenetrating) statsHtml += '<br>穿透';
    if (data.isBeam) statsHtml += '<br>⚡激光束 · 优先Boss';
    if (data.isAOE) statsHtml += '<br>💥AOE灼伤';

    panel.innerHTML = '<div class="tower-info-header">'
        + '<span class="tower-info-name">' + data.icon + ' ' + data.name + '</span>'
        + '<span class="tower-info-level">Lv.' + tower.level + ' ' + '★'.repeat(tower.level) + '</span>'
        + '<button class="info-btn-close">✕</button>'
        + '</div>'
        + '<div style="font-size:11px;color:#ccc;margin:2px 0;">HP: ' + Math.round(tower.hp) + '/' + tower.maxHP + ' (' + hpPct + '%)</div>'
        + '<div class="tower-info-hpbar"><div class="tower-info-hpfill ' + hpBarClass + '" style="width:' + hpPct + '%"></div></div>'
        + '<div class="tower-info-stats">' + statsHtml + '</div>'
        + '<div class="tower-info-buttons">'
        + '<button class="info-btn info-btn-upgrade" ' + (canUpgrade ? '' : 'disabled') + '>升级 💰' + (tower.level < 3 ? upgradeCost : 'MAX') + '</button>'
        + '<button class="info-btn info-btn-repair" ' + (canRepair ? '' : 'disabled') + '>修理 💰' + (needsRepair ? repairCost : '0') + '</button>'
        + '<button class="info-btn info-btn-sell">卖出 💰' + tower.getSellValue() + '</button>'
        + '</div>';

    (function (t) {
        panel.querySelector('.info-btn-close').addEventListener('click', function () { if (window.Input) window.Input.deselectAll(); });
        if (canUpgrade) panel.querySelector('.info-btn-upgrade').addEventListener('click', function () { Events.emit('upgradeTower', t); });
        if (canRepair) panel.querySelector('.info-btn-repair').addEventListener('click', function () { Events.emit('repairTower', t); });
        panel.querySelector('.info-btn-sell').addEventListener('click', function () { Events.emit('sellTower', t); });
    })(tower);

    this._positionPanel(panel, tower.x, tower.y);
    panel.style.display = 'flex';
};

UIManager.prototype.showObstacleInfo = function (obstacle) {
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
        + '</div>';

    panel.querySelector('.info-btn-close').addEventListener('click', function () { if (window.Input) window.Input.deselectAll(); });
    this._positionPanel(panel, obstacle.x, obstacle.y);
    panel.style.display = 'flex';
};

UIManager.prototype._positionPanel = function (panel, wx, wy) {
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
};

UIManager.prototype.hideAllPanels = function () {
    this.buildPanel.style.display = 'none';
    this.towerInfoPanel.style.display = 'none';
};

UIManager.prototype.showGameOver = function (won) {
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
};

UIManager.prototype.hideGameOver = function () {
    this.gameOverPanel.style.display = 'none';
};
