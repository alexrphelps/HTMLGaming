// levelManagerUtil.js
// Utility functions for LevelManager. Add more as needed.

/**
 * Safely parse a value as an integer, with fallback.
 * @param {any} value - The value to parse.
 * @param {number} fallback - The fallback value if parsing fails.
 * @returns {number}
 */
function parseIntSafe(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Expose to global for use in LevelManager (if not using modules)
window.LevelManagerUtil = {
  parseIntSafe,
  clamp
};
