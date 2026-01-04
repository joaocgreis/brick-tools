(function () {
    'use strict';

    const TOLERANCE = 1e-6;

    /**
     * Tolerant equality: |a - b| < TOLERANCE
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {boolean} True if numbers are approximately equal
     */
    function eq(a, b) {
        return Math.abs(a - b) < TOLERANCE;
    }

    /**
     * Tolerant inequality: |a - b| >= TOLERANCE
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {boolean} True if numbers are not approximately equal
     */
    function neq(a, b) {
        return !eq(a, b);
    }

    /**
     * Tolerant greater than: a > b + TOLERANCE
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {boolean} True if a is greater than b within tolerance
     */
    function gt(a, b) {
        return a > b + TOLERANCE;
    }

    /**
     * Tolerant greater than or equal: a >= b - TOLERANCE
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {boolean} True if a is greater than or equal to b within tolerance
     */
    function gte(a, b) {
        return a >= b - TOLERANCE;
    }

    /**
     * Tolerant less than: a < b - TOLERANCE
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {boolean} True if a is less than b within tolerance
     */
    function lt(a, b) {
        return a < b - TOLERANCE;
    }

    /**
     * Tolerant less than or equal: a <= b + TOLERANCE
     * @param {number} a - First number
     * @param {number} b - Second number
     * @returns {boolean} True if a is less than or equal to b within tolerance
     */
    function lte(a, b) {
        return a <= b + TOLERANCE;
    }

    // Export to global namespace if in browser
    if (typeof window !== 'undefined') {
        window.FloatUtils = {
            eq: eq,
            neq: neq,
            gt: gt,
            gte: gte,
            lt: lt,
            lte: lte
        };
    }
})();
