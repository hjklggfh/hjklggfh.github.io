/**
 * LayoutManager - device detection and container scaling.
 *
 * Strategy:
 *  - Desktop: container at native 1024x768, centered in viewport.
 *  - Mobile: container CSS-scaled to fit viewport, maintaining 4:3 ratio.
 *    Black letterbox bars fill empty space.
 *  - The 1024x768 logical world is NEVER changed.
 */
(function () {
    'use strict';

    var GAME_WIDTH = 1024;
    var GAME_HEIGHT = 768;
    var _isMobile = false;
    var _scaleFactor = 1;

    function detectMobile() {
        var hasTouch = ('ontouchstart' in window)
            || (navigator.maxTouchPoints > 0)
            || (navigator.msMaxTouchPoints > 0);
        var isSmallScreen = window.innerWidth < 1024 || window.innerHeight < 768;
        var ua = navigator.userAgent || '';
        var isMobileUA = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
        var isCoarsePointer = window.matchMedia
            && window.matchMedia('(pointer: coarse)').matches;
        return hasTouch && (isSmallScreen || isMobileUA || isCoarsePointer);
    }

    function computeScale() {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        return Math.min(vw / GAME_WIDTH, vh / GAME_HEIGHT);
    }

    function applyScaling(container, scale) {
        if (scale >= 1) {
            container.style.width = GAME_WIDTH + 'px';
            container.style.height = GAME_HEIGHT + 'px';
            container.style.transform = 'none';
            container.style.position = 'relative';
            container.style.top = '';
            container.style.left = '';
            container.style.marginTop = '';
            container.style.marginLeft = '';
            document.body.classList.remove('mobile-layout');
        } else {
            container.style.width = GAME_WIDTH + 'px';
            container.style.height = GAME_HEIGHT + 'px';
            container.style.transform = 'scale(' + scale + ')';
            container.style.transformOrigin = 'center center';
            container.style.position = 'absolute';
            container.style.top = '50%';
            container.style.left = '50%';
            container.style.marginTop = -(GAME_HEIGHT / 2) + 'px';
            container.style.marginLeft = -(GAME_WIDTH / 2) + 'px';
            document.body.classList.add('mobile-layout');
        }
        return scale;
    }

    function resizeHandler() {
        var container = document.getElementById('game-container');
        if (!container) return;
        if (!_isMobile) _isMobile = detectMobile();
        var scale = _isMobile ? computeScale() : 1;
        _scaleFactor = applyScaling(container, Math.min(scale, 1));
    }

    function init() {
        _isMobile = detectMobile();
        resizeHandler();
        window.addEventListener('resize', function () {
            clearTimeout(window._resizeTimer);
            window._resizeTimer = setTimeout(resizeHandler, 150);
        });
        window.addEventListener('orientationchange', function () {
            setTimeout(resizeHandler, 300);
        });
    }

    window.LayoutManager = {
        init: init,
        isMobile: function () { return _isMobile; },
        getScale: function () { return _scaleFactor; },
        GAME_WIDTH: GAME_WIDTH,
        GAME_HEIGHT: GAME_HEIGHT,
        resize: resizeHandler
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
