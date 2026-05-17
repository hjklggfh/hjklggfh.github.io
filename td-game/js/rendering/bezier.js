/**
 * Cubic Bezier curve utilities.
 */
class Bezier {
    /**
     * Evaluate a cubic bezier at parameter t [0, 1].
     */
    static cubic(p0, p1, p2, p3, t) {
        const u = 1 - t;
        const uu = u * u;
        const uuu = uu * u;
        const tt = t * t;
        const ttt = tt * t;
        return {
            x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
            y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
        };
    }

    /**
     * Derivative at t (tangent direction).
     */
    static cubicDerivative(p0, p1, p2, p3, t) {
        const u = 1 - t;
        const uu = u * u;
        const tt = t * t;
        return {
            x: 3 * uu * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * tt * (p3.x - p2.x),
            y: 3 * uu * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * tt * (p3.y - p2.y)
        };
    }

    /**
     * Approximate arc length of a bezier segment by sampling.
     */
    static segmentLength(p0, p1, p2, p3, samples = 30) {
        let length = 0;
        let prev = { x: p0.x, y: p0.y };
        for (let i = 1; i <= samples; i++) {
            const pt = Bezier.cubic(p0, p1, p2, p3, i / samples);
            length += Math.hypot(pt.x - prev.x, pt.y - prev.y);
            prev = pt;
        }
        return length;
    }
}
