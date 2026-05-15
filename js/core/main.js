/**
 * Entry point - initializes the game shell on page load.
 * Game waits for player to select a mode before starting.
 */
(function () {
    'use strict';

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Game.init());
    } else {
        Game.init();
    }

    console.log('🛡️  Tower Defense Framework Ready');
    console.log('   🗺️  普通模式 — 8波预设关卡');
    console.log('   ♾️  无尽模式 — 无限波次, Boss每5波');
    console.log('   📦 障碍物系统 — 宝箱/石头/树木阻挡视线');
    console.log('   💀 Boss治疗光环 — 为周围怪物恢复血量');
    console.log('   Controls:');
    console.log('   - Click empty platform → build tower');
    console.log('   - Click tower → upgrade/sell');
    console.log('   - Click obstacle → view info');
    console.log('   - Right click → deselect');
    console.log('   - Speed button → 1x/2x toggle');
    console.log('   📁 Config: edit js/data.js to tweak balance');
})();
