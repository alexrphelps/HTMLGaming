// Utility functions used across multiple modules

const SnakeUtils = {
  /**
   * Generates a random position within the game grid
   * @returns {Object} Position with x and y coordinates
   */
  randomPosition() {
    return {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT)
    };
  },

  /**
   * Capitalizes the first letter of a string
   * @param {string} str - The input string
   * @returns {string} The string with first letter capitalized
   */
  capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },
  
  /**
   * Checks if a point is within the specified rectangle
   * @param {Object} p - Point with x,y coordinates
   * @param {Object} r - Rectangle with x,y,width,height properties
   * @returns {boolean} True if point is in rectangle
   */
  pointInRect(p, r) {
    return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
  },
  
  /**
   * Checks if two rectangles overlap
   * @param {Object} r1 - First rectangle with x,y,width,height
   * @param {Object} r2 - Second rectangle with x,y,width,height
   * @returns {boolean} True if rectangles overlap
   */
  rectsOverlap(r1, r2) {
    return !(r2.x >= r1.x + r1.width ||
            r2.x + r2.width <= r1.x ||
            r2.y >= r1.y + r1.height ||
            r2.y + r2.height <= r1.y);
  }
};