; (function () {
  'use strict';

  /**
   * Point class for geometric calculations
   */
  class Point {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }

    /**
     * Calculate distance to another point
     * @param {Point} other - The other point
     * @returns {number} Distance between points
     */
    distanceTo(other) {
      return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
    }

    /**
     * Find intersection points of two circles
     * Circle 1: centered at this point with radius r0
     * Circle 2: centered at other point with radius r1
     * @param {number} r0 - Radius of circle centered at this point
     * @param {Point} other - Center of second circle
     * @param {number} r1 - Radius of second circle
     * @returns {Point[]} Array of 0, 1, or 2 intersection points
     */
    circleIntersections(r0, other, r1) {
      const d = this.distanceTo(other);

      // No solution cases
      if (d > r0 + r1 || d < Math.abs(r0 - r1) || d === 0) {
        return [];
      }

      const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
      const h2 = r0 * r0 - a * a;
      if (h2 < 0) return [];
      const h = Math.sqrt(h2);

      // Point on line between centers
      const px = this.x + a * (other.x - this.x) / d;
      const py = this.y + a * (other.y - this.y) / d;

      // Offset perpendicular to line
      const rx = -(other.y - this.y) * h / d;
      const ry = (other.x - this.x) * h / d;

      if (h === 0) {
        return [new Point(px, py)];
      }
      return [new Point(px + rx, py + ry), new Point(px - rx, py - ry)];
    }
  }

  // Export to global namespace if in browser
  if (typeof window !== 'undefined') {
    window.Point = Point;
  }
})();
