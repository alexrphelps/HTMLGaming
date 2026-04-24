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
    // Simple AABB (Axis-Aligned Bounding Box) collision detection
    // Use player's world coordinates for collision detection
    // Player Y position now represents the bottom of the player
    const playerHeight = player.normalHeight + (player.crouchHeight - player.normalHeight) * player.crouchTransition;
    const playerLeft = player.worldX - player.width / 2;
    const playerRight = player.worldX + player.width / 2;
    const playerTop = player.y - playerHeight; // Top of player
    const playerBottom = player.y; // Bottom of player
    
    const obstacleLeft = this.x;
    const obstacleRight = this.x + this.width;
    const obstacleTop = this.y;
    const obstacleBottom = this.y + this.height;
    
    // Check if rectangles overlap
    if (playerRight > obstacleLeft && 
        playerLeft < obstacleRight && 
        playerBottom > obstacleTop && 
        playerTop < obstacleBottom) {
      
      // Determine collision type and direction
      const overlapLeft = playerRight - obstacleLeft;
      const overlapRight = obstacleRight - playerLeft;
      const overlapTop = playerBottom - obstacleTop;
      const overlapBottom = obstacleBottom - playerTop;
      
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
    
    // Use player's world coordinates for collision detection
    const playerLeft = player.worldX - player.width / 2;
    const playerRight = player.worldX + player.width / 2;
    const platformLeft = this.x;
    const platformRight = this.x + this.width;
    
    // Check if player is above the platform and within its horizontal bounds
    // Player Y position is now the bottom, so check if player bottom is near platform top
    // Player can stand if any part of their body is on the platform
    return playerRight > platformLeft && 
           playerLeft < platformRight && 
           Math.abs(player.y - this.y) <= 10; // Small tolerance
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
