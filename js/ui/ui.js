/**
 * UIManager - handles all DOM-based UI updates.
 */
function UIManager() {
    var self = this;
    window.GameConfig = GameConfig;
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
    var pauseHomeBtn = document.querySelector('.pause-home-btn');
    if (pauseHomeBtn) pauseHomeBtn.onclick = function () { window.location.href = 'index.html'; };

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
    var towerBtn = document.getElementById('btn-bestiary-towers');
    if (towerBtn) towerBtn.onclick = function () { UIMgr.showTowerBestiary(); };
    var monsterBtn = document.getElementById('btn-bestiary-monsters');
    if (monsterBtn) monsterBtn.onclick = function () { UIMgr.showMonsterBestiary(); };
    var closeT = document.getElementById('close-towers');
    if (closeT) closeT.onclick = function () { document.getElementById('bestiary-towers').style.display='none'; };
    var closeM = document.getElementById('close-monsters');
    if (closeM) closeM.onclick = function () { document.getElementById('bestiary-monsters').style.display='none'; };
    // Populate bestiary content
    this._populateTowerBestiary();
    this._populateMonsterBestiary();
    // Expose UIMgr globally for button callbacks
    window.UIMgr = this;
};

UIManager.prototype._populateTowerBestiary = function () {
    var body=document.getElementById('bestiary-towers-body');
    if(!body) return;
    var cfg=window.GameConfig;
    if(!cfg||!cfg.towers){body.innerHTML='<p style="color:#f44">无法读取GameConfig数据</p>';return;}
    var h='';
    var keys=Object.keys(cfg.towers);
    for(var ti=0;ti<keys.length;ti++){
        var t=cfg.towers[keys[ti]];
        var desc=t.description||'';
        if(t.appliesSlow)desc+=' · 减速'+Math.round((1-t.slowFactor)*100)+'%';        if(t.hasSplash)desc+=' · 溅射'+t.splashRadius+'px'+(t.splashDamage?'('+t.splashDamage+'伤害)':'');
        if(t.isPenetrating)desc+=' · 穿透';
        if(t.isBeam)desc+=' · 激光束';if(t.isAOE)desc+=' · AOE灼伤';
        if(t.isPulseAOE)desc+=' · 脉冲'+t.pulseRadius+'px';
        if(t.prioritizeBoss)desc+=' · 优先Boss';
        var baseHP=t.towerHP||30;
        h+='<h3><span class="tower-color" style="background:'+t.color+'"></span>'+t.icon+' '+t.name+' — '+desc+'</h3>';
        h+='<table><thead><tr><th>等级</th><th>射程</th><th>攻速/s</th><th>伤害</th><th>HP</th><th>升级费</th><th>售出价</th></tr></thead><tbody>';
        var tc=0;
        for(var l=0;l<t.levels.length;l++){
            var lv=t.levels[l];
            var cost=lv.upgradeCost>0?lv.upgradeCost:0;
            tc+=cost;
            var sell=lv.sellValue||Math.round(tc*0.5);
            var hp=Math.round(baseHP*Math.pow(1.2,l));
            h+='<tr><td>Lv'+(l+1)+'</td><td>'+lv.range+'</td><td>'+lv.fireRate+'</td><td>'+lv.damage+'</td><td>'+hp+'</td><td>'+(lv.upgradeCost>0?lv.upgradeCost:'—')+'</td><td>'+sell+'</td></tr>';
        }
        h+='</tbody></table>';
    }
    body.innerHTML=h;
};
UIManager.prototype._populateMonsterBestiary = function () {
    var body=document.getElementById('bestiary-monsters-body');
    if(!body) return;
    var cfg=window.GameConfig;
    if(!cfg||!cfg.enemies){body.innerHTML='<p style="color:#f44">无法读取GameConfig数据</p>';return;}
    var h='<table><thead><tr><th>图标</th><th>名称</th><th>ID</th><th>基础HP</th><th>速度</th><th>护甲</th><th>金币</th><th>漏怪扣血</th><th>特殊能力</th></tr></thead><tbody>';
    var ekeys=Object.keys(cfg.enemies);
    for(var ei=0;ei<ekeys.length;ei++){
        var e=cfg.enemies[ekeys[ei]];
        var tags=[];
        if(e.isFlying)tags.push('飞行');
        if(e.isImmuneToSlow)tags.push('免疫减速');
        if(e.explodesOnDeath)tags.push('死亡爆炸('+e.explosionRadius+'px)');
        if(e.id==='boss')tags.push('治疗光环');
        h+='<tr><td>'+e.icon+'</td><td>'+e.name+'</td><td>'+e.id+'</td><td>'+e.maxHP+'</td><td>'+e.moveSpeed+'</td><td>'+e.armor+'</td><td>'+e.goldReward+'</td><td>'+e.hpLeakCost+'</td><td>'+(tags.length?tags.join(' · '):'—')+'</td></tr>';
    }
    h+='</tbody></table>';
    h+='<h3>波次成长规则</h3>';
    h+='<table><thead><tr><th>属性</th><th>公式</th></tr></thead><tbody>';
    h+='<tr><td>HP</td><td>基础HP × 1.06^(波次-1) · 无尽额外×1.08^波次</td></tr>';
    h+='<tr><td>速度</td><td>基础速度 × 1.015^(波次-1) · 无尽额外×1.02^波次</td></tr>';
    h+='<tr><td>护甲</td><td>基础护甲 + floor((波次-1)/3) · 无尽每5波额外+2</td></tr>';
    h+='<tr><td>金币</td><td>基础金币 × (1 + (波次-1) × 0.1)</td></tr>';
    h+='</tbody></table>';
    body.innerHTML=h;
};
UIManager.prototype.showTowerBestiary = function () {
    document.getElementById('bestiary-towers').style.display='flex';
};

UIManager.prototype.showMonsterBestiary = function () {
    document.getElementById('bestiary-monsters').style.display='flex';
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

UIManager.prototype.showBuildPanel = function (p) {
    this.hideAllPanels();
    if (!p || p.tower) return;
    var panel = this.buildPanel;
    panel.innerHTML = "";
    panel.style.cssText = "display:flex;flex-direction:row;flex-wrap:wrap;gap:4px;padding:6px;max-width:390px;background:rgba(0,0,0,0.85);border:1px solid rgba(255,255,255,0.3);border-radius:10px;z-index:20;position:absolute";
    var keys = Object.keys(GameConfig.towers);
    for (var k = 0; k < keys.length; k++) {
        (function () {
            var key = keys[k];
            var td = GameConfig.towers[key];
            var cost = td.levels[0].upgradeCost;
            var ok = window.GoldMgr && window.GoldMgr.canAfford(cost);
            var btn = document.createElement("div");
            btn.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;background:" + (ok ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)") + ";border:1px solid rgba(255,255,255,0.2);border-radius:8px;padding:5px 8px;color:#fff;cursor:" + (ok ? "pointer" : "default") + ";font-size:10px;min-width:50px;text-align:center;opacity:" + (ok ? "1" : "0.45") + ";transition:background .2s";
            if (ok) { btn.onmouseenter = function () { this.style.background = "rgba(255,255,255,0.22)"; }; btn.onmouseleave = function () { this.style.background = "rgba(255,255,255,0.12)"; }; }
            var icon = document.createElement("div");
            icon.style.cssText = "width:28px;height:28px;border-radius:50%;background:" + td.color + ";border:2px solid rgba(255,255,255,0.5);display:flex;align-items:center;justify-content:center;font-size:15px";
            icon.textContent = td.icon;
            var nm = document.createElement("div");
            nm.style.cssText = "font-weight:bold;font-size:10px";
            nm.textContent = td.name;
            var cs = document.createElement("div");
            cs.style.cssText = "color:#ffd700;font-size:10px";
            cs.textContent = "💰" + cost;
            btn.appendChild(icon); btn.appendChild(nm); btn.appendChild(cs);
            if (ok) btn.addEventListener("click", function () { Events.emit("buildTower", key, p); });
            panel.appendChild(btn);
        })();
    }
    this._positionPanelV2(panel, p.x, p.y);
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
        + '<button class="info-btn info-btn-upgrade" ' + (canUpgrade ? '' : 'disabled') + '>升级 💰' + (tower.level < 10 ? upgradeCost : 'MAX') + '</button>'
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

UIManager.prototype._positionPanelV2 = function (panel, wx, wy) {
    var container = document.getElementById("game-container");
    var containerRect = container.getBoundingClientRect();
    var scaleX = containerRect.width / 1024;
    var scaleY = containerRect.height / 768;
    var cx = containerRect.left;
    var cy = containerRect.top;
    var worldSX = cx + wx * scaleX;
    var worldSY = cy + wy * scaleY;
    var panelW = panel.offsetWidth || 300;
    var panelH = panel.offsetHeight || 100;
    // Default: center horizontally above the platform
    var sx = worldSX - panelW / 2;
    var sy = worldSY - panelH - 30;
    // If above goes off-screen, put below
    if (sy < cy + 5) sy = worldSY + 25;
    // If below also goes off, put above and near bottom
    if (sy + panelH > cy + 768 - 5) sy = cy + 768 - panelH - 5;
    // Clamp left/right to container
    if (sx < cx + 5) sx = cx + 5;
    if (sx + panelW > cx + 1024 - 5) sx = cx + 1024 - panelW - 5;
    panel.style.left = sx + "px";
    panel.style.top = sy + "px";
};

UIManager.prototype._positionPanel = function (panel, wx, wy) {
    // Delegate to V2 for all panels
    this._positionPanelV2(panel, wx, wy);
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
