/**
 * BezierPath - a sequence of cubic bezier segments forming a monster path.
 * Provides position-from-progress and distance-to-end queries.
 */
class BezierPath {
    /**
     * @param {Array<{x:number,y:number}>} controlPoints - N*3+1 points (4 per segment + shared endpoints)
     */
    constructor(controlPoints) {
        this.controlPoints = controlPoints;
        this.segments = [];
        this.totalLength = 0;
        this._buildSegments();
    }

    _buildSegments() {
        const pts = this.controlPoints;
        this.segments = [];
        this.totalLength = 0;

        for (let i = 0; i < pts.length - 1; i += 3) {
            if (i + 3 >= pts.length) break;
            const p0 = pts[i];
            const p1 = pts[i + 1];
            const p2 = pts[i + 2];
            const p3 = pts[Math.min(i + 3, pts.length - 1)];
            const length = Bezier.segmentLength(p0, p1, p2, p3);
            this.segments.push({ p0, p1, p2, p3, length });
            this.totalLength += length;
        }
    }

    /**
     * Get world position at progress t [0, 1] along the entire path.
     */
    getPositionAt(t) {
        if (this.segments.length === 0) return this.controlPoints[0] || { x: 0, y: 0 };
        t = Math.max(0, Math.min(1, t));

        const targetDist = t * this.totalLength;
        let accumulated = 0;

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            if (targetDist <= accumulated + seg.length || i === this.segments.length - 1) {
                const localT = seg.length > 0.001
                    ? (targetDist - accumulated) / seg.length
                    : 0;
                return Bezier.cubic(seg.p0, seg.p1, seg.p2, seg.p3, Math.max(0, Math.min(1, localT)));
            }
            accumulated += seg.length;
        }

        const last = this.segments[this.segments.length - 1];
        return { x: last.p3.x, y: last.p3.y };
    }

    /**
     * Get direction (normalized) at progress t along the path.
     */
    getDirectionAt(t) {
        if (this.segments.length === 0) return { x: 1, y: 0 };
        t = Math.max(0, Math.min(1, t));

        const targetDist = t * this.totalLength;
        let accumulated = 0;

        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            if (targetDist <= accumulated + seg.length || i === this.segments.length - 1) {
                const localT = seg.length > 0.001
                    ? (targetDist - accumulated) / seg.length
                    : 0;
                const d = Bezier.cubicDerivative(seg.p0, seg.p1, seg.p2, seg.p3, Math.max(0, Math.min(1, localT)));
                const len = Math.hypot(d.x, d.y);
                return len > 0.001 ? { x: d.x / len, y: d.y / len } : { x: 1, y: 0 };
            }
            accumulated += seg.length;
        }
        return { x: 1, y: 0 };
    }

    getStartPoint() {
        return this.controlPoints[0] || { x: 0, y: 0 };
    }

    getEndPoint() {
        return this.controlPoints[this.controlPoints.length - 1] || { x: 0, y: 0 };
    }

    getRemainingDistance(progress) {
        return this.totalLength * (1 - progress);
    }
}
