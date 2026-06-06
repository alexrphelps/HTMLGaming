// Obstacle class represents platforms and overhead obstacles in the infinite world
// Handles rendering, collision detection, and interaction with the player

class Obstacle {
  constructor(x, type) {
    this.x = x; // World X position
    this.type = type; // 'platform' or 'overhead'
    
    if (type === 'platform') {
      this.setupPlatform();
    } else if (type === 'overhead') {
      this.setupOverhead();
    }
  }

  /**
   * Setup platform obstacle properties
   */
  setupPlatform() {
    // Random width within range
    this.width = GAME_CONSTANTS.OBSTACLES.PLATFORM_MIN_WIDTH + 
      Math.random() * (GAME_CONSTANTS.OBSTACLES.PLATFORM_MAX_WIDTH - GAME_CONSTANTS.OBSTACLES.PLATFORM_MIN_WIDTH);
    
    this.height = GAME_CONSTANTS.OBSTACLES.PLATFORM_HEIGHT;
    
    // Random height above ground
    const heightAboveGround = GAME_CONSTANTS.OBSTACLES.PLATFORM_MIN_HEIGHT + 
      Math.random() * (GAME_CONSTANTS.OBSTACLES.PLATFORM_MAX_HEIGHT - GAME_CONSTANTS.OBSTACLES.PLATFORM_MIN_HEIGHT);
    
    this.y = GAME_CONSTANTS.CANVAS.GROUND_Y - heightAboveGround;
    this.color = GAME_CONSTANTS.OBSTACLES.PLATFORM_COLOR;
  }

  /**
   * Setup overhead obstacle properties
   */
  setupOverhead() {
    // Random width within range
    this.width = GAME_CONSTANTS.OBSTACLES.OVERHEAD_MIN_WIDTH + 
      Math.random() * (GAME_CONSTANTS.OBSTACLES.OVERHEAD_MAX_WIDTH - GAME_CONSTANTS.OBSTACLES.OVERHEAD_MIN_WIDTH);
    
    this.height = GAME_CONSTANTS.OBSTACLES.OVERHEAD_HEIGHT;
    
    // Random height above ground (lower than platforms, to force ducking)
    const heightAboveGround = GAME_CONSTANTS.OBSTACLES.OVERHEAD_MIN_HEIGHT + 
      Math.random() * (GAME_CONSTANTS.OBSTACLES.OVERHEAD_MAX_HEIGHT - GAME_CONSTANTS.OBSTACLES.OVERHEAD_MIN_HEIGHT);
    
    this.y = GAME_CONSTANTS.CANVAS.GROUND_Y - heightAboveGround;
    this.color = GAME_CONSTANTS.OBSTACLES.OVERHEAD_COLOR;
  }

  /**
   * Draw the obstacle on screen
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Camera} camera - Camera for world-to-screen conversion
   */
  draw(ctx, camera) {
    const screenPos = camera.worldToScreen(this.x, this.y);
    
    // Draw obstacle rectangle
    ctx.fillStyle = this.color;
    ctx.fillRect(screenPos.x, screenPos.y, this.width, this.height);
    
    // Add border for better visibility
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenPos.x, screenPos.y, this.width, this.height);
  }

  /**
   * Check collision with player
   * @param {Player} player - Player object
   * @returns {Object|null} Collision info or null
   */
  checkCollision(player) {
    const playerBounds = StickpersonGeometry.getPlayerBounds(player);
    const obstacleBounds = this.getBounds();
    
    // Check if rectangles overlap
    if (StickpersonGeometry.overlaps(playerBounds, obstacleBounds)) {
      
      // Determine collision type and direction
      const overlapLeft = playerBounds.right - obstacleBounds.left;
      const overlapRight = obstacleBounds.right - playerBounds.left;
      const overlapTop = playerBounds.bottom - obstacleBounds.top;
      const overlapBottom = obstacleBounds.bottom - playerBounds.top;
      
      // Find the smallest overlap (collision direction)
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      
      let direction;
      if (minOverlap === overlapTop) {
        direction = 'top'; // Player hitting obstacle from above (landing on platform)
      } else if (minOverlap === overlapBottom) {
        direction = 'bottom'; // Player hitting obstacle from below (head bump)
      } else if (minOverlap === overlapLeft) {
        direction = 'left'; // Player hitting obstacle from left
      } else {
        direction = 'right'; // Player hitting obstacle from right
      }
      
      return {
        obstacle: this,
        direction: direction,
        overlap: minOverlap
      };
    }
    
    return null; // No collision
  }

  /**
   * Check if player can stand on this obstacle (platforms only)
   * @param {Player} player - Player object
   * @returns {boolean} True if player can stand on this obstacle
   */
  canStandOn(player) {
    if (this.type !== 'platform') return false;
    
    const playerBounds = StickpersonGeometry.getPlayerBounds(player);
    const platformLeft = this.x;
    const platformRight = this.x + this.width;
    
    // Check if player is above the platform and within its horizontal bounds
    // Player Y position is now the bottom, so check if player bottom is near platform top
    // Player can stand if any part of their body is on the platform
    return playerBounds.right > platformLeft &&
           playerBounds.left < platformRight &&
           Math.abs(playerBounds.bottom - this.y) <= 10; // Small tolerance
  }

  /**
   * Get the top Y position of the obstacle (for landing on platforms)
   * @returns {number} Top Y position
   */
  getTopY() {
    return this.y;
  }

  /**
   * Get obstacle bounds for advanced collision detection
   * @returns {Object} Bounds {left, right, top, bottom}
   */
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    };
  }

  /**
   * Check if obstacle is dangerous (overhead obstacles that hurt player)
   * @returns {boolean} True if obstacle is dangerous
   */
  isDangerous() {
    return this.type === 'overhead';
  }

  /**
   * Get obstacle center position
   * @returns {Object} Center position {x, y}
   */
  getCenter() {
    return {
      x: this.x + this.width / 2,
      y: this.y + this.height / 2
    };
  }
}
