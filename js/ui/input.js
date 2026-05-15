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
    }

    _onClick(e) {
        var rect = this.canvas.getBoundingClientRect();
        var scaleX = this.canvas.width / rect.width;
        var scaleY = this.canvas.height / rect.height;
        var mx = (e.clientX - rect.left) * scaleX;
        var my = (e.clientY - rect.top) * scaleY;

        console.log('[Input] Click at world(' + Math.round(mx) + ',' + Math.round(my)
            + '), platforms=' + this.platforms.length
            + ', towers=' + this.towers.length
            + ', obstacles=' + this.obstacles.length);

        // Check tower clicks first
        for (var i = 0; i < this.towers.length; i++) {
            var tower = this.towers[i];
            var dx = mx - tower.x;
            var dy = my - tower.y;
            if (Math.sqrt(dx * dx + dy * dy) < 22) {
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
            if (Math.sqrt(odx * odx + ody * ody) < obs.radius + 4) {
                console.log('[Input] Obstacle clicked:', obs.type);
                this.selectObstacle(obs);
                return;
            }
        }

        // Check platform clicks
        var closestPlat = null;
        var closestDist = 24;
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
}
