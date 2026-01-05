; (function () {
  'use strict';

  const { eq, neq, gt, gte, lt, lte } = window.FloatUtils;

  /**
   * Utilities shared across modules
   */
  const Utils = {
    /**
     * Format a number to specified decimal places
     * @param {number} value - The value to format
     * @param {number} decimals - Number of decimal places
     * @returns {string} Formatted number string
     */
    formatNumber(value, decimals) {
      // -0 should be formatted as 0
      if (eq(value, 0)) value = 0;
      return value.toFixed(decimals);
    }
  };

  if (typeof window !== 'undefined') {
    window.Utils = Utils;
  }
})();
