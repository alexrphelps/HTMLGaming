// Collectible class handles collectible items that the player can collect
// Manages position, rendering, and respawning of collectibles

class Collectible {
  constructor(game) {
    this.game = game;
    this.x = 0;
    this.y = 0;
    this.radius = GAME_CONSTANTS.COLLECTIBLES.RADIUS;
    
    // Spawn the collectible at a random valid position
    this.respawn();
  }

  /**
   * Generate a new random position for the collectible
   * Ensures the collectible spawns above ground and within canvas bounds
   */
  respawn() {
    // Calculate valid spawn area using constants
    const minX = GAME_CONSTANTS.COLLECTIBLES.MIN_X;
    const maxX = GAME_CONSTANTS.CANVAS.WIDTH - GAME_CONSTANTS.COLLECTIBLES.MAX_X_OFFSET;
    
    // Random X position within valid range
    this.x = minX + Math.random() * (maxX - minX);
    
    // Random Y position above ground
    const minY = GAME_CONSTANTS.COLLECTIBLES.MIN_Y;
    const maxY = GAME_CONSTANTS.CANVAS.GROUND_Y - GAME_CONSTANTS.COLLECTIBLES.MAX_Y_OFFSET;
    
    this.y = minY + Math.random() * (maxY - minY);
  }

  /**
   * Check if the collectible collides with the player
   * Very forgiving collision - checks multiple points on stickman's body
   * @param {Player} player - The player object to check collision with
   * @returns {boolean} True if collision detected
   */
  checkCollision(player) {
    const playerCenterX = player.x + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const currentHeight = player.isCrouching ? 
      GAME_CONSTANTS.PLAYER.CROUCH_HEIGHT : 
      GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT;
    
    // Check multiple points on the stickman for very forgiving collision:
    
    // 1. Head position
    const headX = playerCenterX;
    const headY = player.y + GAME_CONSTANTS.BODY.HEAD_RADIUS;
    
    // 2. Body center
    const bodyCenterX = playerCenterX;
    const bodyCenterY = player.y + currentHeight / 2;
    
    // 3. Feet position
    const feetX = playerCenterX;
    const feetY = player.y + currentHeight;
    
    // 4. Left side (arms/body extend left)
    const leftSideX = player.x;
    const leftSideY = player.y + currentHeight / 2;
    
    // 5. Right side (arms/body extend right)
    const rightSideX = player.x + GAME_CONSTANTS.PLAYER.WIDTH;
    const rightSideY = player.y + currentHeight / 2;
    
    // Check collision points array for any collision
    const collisionPoints = [
      { x: headX, y: headY },
      { x: bodyCenterX, y: bodyCenterY },
      { x: feetX, y: feetY },
      { x: leftSideX, y: leftSideY },
      { x: rightSideX, y: rightSideY }
    ];
    
    // Check if any collision point is within collection distance
    for (const point of collisionPoints) {
      const deltaX = this.x - point.x;
      const deltaY = this.y - point.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance <= GAME_CONSTANTS.COLLECTIBLES.COLLECTION_DISTANCE) {
        return true; // Collision detected!
      }
    }
    
    return false; // No collision
  }

  /**
   * Handle collection of this collectible
   * Called when player collides with the collectible
   * @param {Score} score - Score object to update
   */
  collect(score) {
    // Add points to score
    score.addPoints(GAME_CONSTANTS.COLLECTIBLES.SCORE_VALUE);
    
    // Respawn at new location
    this.respawn();
  }

  /**
   * Render the collectible on the canvas
   * Draws a red circle with dark red outline for visibility
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  draw(ctx) {
    // Draw filled circle
    ctx.fillStyle = GAME_CONSTANTS.COLLECTIBLES.COLOR;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw outline for better visibility
    ctx.strokeStyle = GAME_CONSTANTS.COLLECTIBLES.OUTLINE_COLOR;
    ctx.lineWidth = GAME_CONSTANTS.COLLECTIBLES.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Add a small highlight to make it look more appealing
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.4, 0, 2 * Math.PI);
    ctx.fill();
  }

  /**
   * Get the current position of the collectible
   * @returns {Object} Object with x and y coordinates
   */
  getPosition() {
    return { x: this.x, y: this.y };
  }

  /**
   * Get the collectible's radius for advanced collision detection
   * @returns {number} The radius of the collectible
   */
  getRadius() {
    return this.radius;
  }
}
