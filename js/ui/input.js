/**
 * InputHandler - processes mouse/touch clicks on the game canvas.
 */
class InputHandler {
    constructor(canvas, platforms, towers, obstacles) {
        if (!obstacles) obstacles = [];
        this.canvas = canvas;
        this.platforms = platforms;
        this.towers = towers;
        this.obstacles = obstacles;

        this.selectedPlatform = null;
        this.selectedTower = null;
        this.selectedObstacle = null;

        console.log('[Input] Init: platforms=' + platforms.length
            + ', towers=' + towers.length
            + ', obstacles=' + obstacles.length);

        this._onClick = this._onClick.bind(this);
        this.canvas.addEventListener('click', this._onClick);
        this.canvas.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        // Touch events
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this.canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
        this.canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
        this.canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
        this.canvas.addEventListener('touchcancel', function (e) { e.preventDefault(); });
        this._touchStartTime = 0;
        this._touchStartPos = null;
        this._longPressTimer = null;
        this._isDragging = false;
        this._handledTouch = false; // guard against double-firing with click
    }

    _onClick(e) {
        // Ignore synthetic click that follows touch handling
        if (this._handledTouch) { this._handledTouch = false; return; }
        var rect = this.canvas.getBoundingClientRect();
        var scaleX = this.canvas.width / rect.width;
        var scaleY = this.canvas.height / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;
        // Mobile: widen hit radius to compensate for visual shrinkage
        var isMobile = window.LayoutManager && window.LayoutManager.isMobile();
        var scale = window.LayoutManager ? window.LayoutManager.getScale() : 1;
        var hitScale = isMobile ? 1 / Math.max(scale, 0.4) : 1;

        console.log('[Input] Click at world(' + Math.round(mx) + ',' + Math.round(my)
            + '), platforms=' + this.platforms.length
            + ', towers=' + this.towers.length
            + ', obstacles=' + this.obstacles.length);

        // Check tower clicks first
        for (var i = 0; i < this.towers.length; i++) {
            var tower = this.towers[i];
            var dx = mx - tower.x;
            var dy = my - tower.y;
            if (Math.sqrt(dx * dx + dy * dy) < 22 * hitScale) {
                console.log('[Input] Tower clicked:', tower.data.towerName);
                this.selectTower(tower);
                return;
            }
        }

        // Check obstacle clicks
        for (var j = 0; j < this.obstacles.length; j++) {
            var obs = this.obstacles[j];
            if (!obs.alive) continue;
            var odx = mx - obs.x;
            var ody = my - obs.y;
            if (Math.sqrt(odx * odx + ody * ody) < (obs.radius + 4) * hitScale) {
                console.log('[Input] Obstacle clicked:', obs.type);
                this.selectObstacle(obs);
                return;
            }
        }

        // Check platform clicks
        var closestPlat = null;
        var closestDist = 24 * hitScale;
        for (var k = 0; k < this.platforms.length; k++) {
            var plat = this.platforms[k];
            var pdx = mx - plat.x;
            var pdy = my - plat.y;
            var pdist = Math.sqrt(pdx * pdx + pdy * pdy);
            if (pdist < closestDist) {
                closestDist = pdist;
                closestPlat = plat;
            }
        }

        if (closestPlat) {
            console.log('[Input] Platform clicked at (' + closestPlat.x + ',' + closestPlat.y
                + '), tower=' + !!closestPlat.tower);
            var blocked = null;
            for (var m = 0; m < this.obstacles.length; m++) {
                if (this.obstacles[m].platform === closestPlat && this.obstacles[m].alive) {
                    blocked = this.obstacles[m];
                    break;
                }
            }
            if (blocked) {
                this.selectObstacle(blocked);
            } else if (closestPlat.tower) {
                this.selectTower(closestPlat.tower);
            } else {
                this.selectPlatform(closestPlat);
            }
            return;
        }

        // Clicked empty space
        console.log('[Input] Empty space clicked, deselecting');
        this.deselectAll();
    }

    selectPlatform(platform) {
        this.selectedTower = null;
        this.selectedObstacle = null;
        this.selectedPlatform = platform;
        console.log('[Input] Platform selected, emitting event');
        Events.emit('platformSelected', platform);
    }

    selectTower(tower) {
        this.selectedPlatform = null;
        this.selectedObstacle = null;
        this.selectedTower = tower;
        console.log('[Input] Tower selected, emitting event');
        Events.emit('towerSelected', tower);
    }

    selectObstacle(obstacle) {
        this.selectedPlatform = null;
        this.selectedTower = null;
        this.selectedObstacle = obstacle;
        console.log('[Input] Obstacle selected, emitting event');
        Events.emit('obstacleSelected', obstacle);
    }

    deselectAll() {
        this.selectedPlatform = null;
        this.selectedTower = null;
        this.selectedObstacle = null;
        Events.emit('deselectAll');
    }

    _onTouchStart(e) {
        e.preventDefault();
        if (e.touches.length !== 1) return;
        var touch = e.touches[0];
        this._touchStartTime = Date.now();
        this._touchStartPos = { x: touch.clientX, y: touch.clientY };
        this._isDragging = false;
        var self = this;
        this._longPressTimer = setTimeout(function () {
            self.deselectAll();
            self._isDragging = true;
        }, 500);
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (!this._touchStartPos) return;
        var touch = e.touches[0];
        var dx = touch.clientX - this._touchStartPos.x;
        var dy = touch.clientY - this._touchStartPos.y;
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
            this._isDragging = true;
            if (this._longPressTimer) {
                clearTimeout(this._longPressTimer);
                this._longPressTimer = null;
            }
        }
    }

    _onTouchEnd(e) {
        e.preventDefault();
        if (this._longPressTimer) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
        }
        if (this._isDragging || !this._touchStartPos) return;
        var pos = this._touchStartPos;
        this._onClick({ clientX: pos.x, clientY: pos.y });
        this._handledTouch = true;
        var self = this;
        setTimeout(function () { self._handledTouch = false; }, 400);
    }
}
