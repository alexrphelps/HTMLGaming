// Camera class handles the side-scrolling view that follows the player
// Manages world offset and screen positioning for infinite scrolling

class Camera {
  constructor() {
    this.x = 0; // Camera's world position (what part of world we're viewing)
    this.targetX = 0; // Where the camera wants to be (follows player)
    this.smoothing = GAME_CONSTANTS.WORLD.CAMERA_FOLLOW_SPEED;
    this.offsetX = GAME_CONSTANTS.WORLD.CAMERA_OFFSET_X;
    
    // Directional tracking for smooth camera transitions
    this.currentDirection = 0; // Current camera direction (-1, 0, 1)
    this.directionChangePosition = null; // Position where direction last changed (null = not set yet)
    this.targetOffsetX = GAME_CONSTANTS.WORLD.CAMERA_OFFSET_X; // Target offset for smooth transitions
  }

  /**
   * Update camera position to follow the target (usually the player)
   * Uses smooth interpolation for natural camera movement
   * @param {number} targetWorldX - World X position to follow
   * @param {number} playerDirection - Player's movement direction (1 for right, -1 for left, 0 for stationary)
   */
  update(targetWorldX, playerDirection = 0) {
    // Initialize direction tracking on first movement
    if (this.directionChangePosition === null) {
      this.directionChangePosition = targetWorldX;
      this.currentDirection = playerDirection;
      return; // Don't change camera position on first frame
    }
    
    // Check if we should change camera direction based on movement threshold
    const distanceMoved = Math.abs(targetWorldX - this.directionChangePosition);
    const shouldChangeDirection = distanceMoved > GAME_CONSTANTS.WORLD.CAMERA_DIRECTION_THRESHOLD;
    
    // Only change camera direction if:
    // 1. We've moved 300px from the last direction change, AND
    // 2. The player direction is different from current camera direction, AND
    // 3. The player is actually moving (not stationary)
    if (shouldChangeDirection && playerDirection !== this.currentDirection && playerDirection !== 0) {
      // Update the direction change position to current position
      this.directionChangePosition = targetWorldX;
      this.currentDirection = playerDirection;
      
      // Set new target offset based on direction
      if (playerDirection < 0) {
        // Moving left - position player more to the right side of screen
        this.targetOffsetX = GAME_CONSTANTS.WORLD.CAMERA_OFFSET_X_LEFT;
      } else if (playerDirection > 0) {
        // Moving right - position player more to the left side of screen
        this.targetOffsetX = GAME_CONSTANTS.WORLD.CAMERA_OFFSET_X_RIGHT;
      }
    }
    
    // Smoothly transition between offsets for natural camera movement
    this.offsetX += (this.targetOffsetX - this.offsetX) * GAME_CONSTANTS.WORLD.CAMERA_TRANSITION_SPEED;
    
    // Calculate desired camera position (player should be at offsetX from left edge)
    this.targetX = targetWorldX - this.offsetX;
    
    // Smoothly interpolate camera position for natural movement
    this.x += (this.targetX - this.x) * this.smoothing;
  }

  /**
   * Convert world coordinates to screen coordinates
   * @param {number} worldX - X position in world space
   * @param {number} worldY - Y position in world space
   * @returns {Object} Screen coordinates {x, y}
   */
  worldToScreen(worldX, worldY = null) {
    const screenX = worldX - this.x;
    const screenY = worldY !== null ? worldY : 0; // Y doesn't change in side-scrolling
    return { x: screenX, y: screenY };
  }

  /**
   * Convert screen coordinates to world coordinates
   * @param {number} screenX - X position on screen
   * @param {number} screenY - Y position on screen
   * @returns {Object} World coordinates {x, y}
   */
  screenToWorld(screenX, screenY = null) {
    const worldX = screenX + this.x;
    const worldY = screenY !== null ? screenY : 0;
    return { x: worldX, y: worldY };
  }

  /**
   * Check if a world position is visible on screen
   * @param {number} worldX - World X position
   * @param {number} width - Width of object (optional)
   * @returns {boolean} True if visible on screen
   */
  isVisible(worldX, width = 0) {
    const screenX = worldX - this.x;
    return screenX + width > 0 && screenX < GAME_CONSTANTS.CANVAS.WIDTH;
  }

  /**
   * Get the current camera bounds in world coordinates
   * @returns {Object} Camera bounds {left, right, top, bottom}
   */
  getBounds() {
    return {
      left: this.x,
      right: this.x + GAME_CONSTANTS.CANVAS.WIDTH,
      top: 0,
      bottom: GAME_CONSTANTS.CANVAS.HEIGHT
    };
  }

  /**
   * Get camera position for debugging
   * @returns {number} Current camera X position
   */
  getX() {
    return this.x;
  }

  /**
   * Instantly set camera position (no smoothing)
   * @param {number} x - New camera X position
   */
  setPosition(x) {
    this.x = x;
    this.targetX = x;
  }
}
