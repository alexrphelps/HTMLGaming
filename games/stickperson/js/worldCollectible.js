// WorldCollectible class for collectibles in the infinite scrolling world
// Different from original Collectible - these have fixed world positions

class WorldCollectible {
  constructor(x, y, variant = 'normal') {
    this.x = x; // World X position (fixed)
    this.y = y; // World Y position (fixed)
    this.variant = variant; // 'normal', 'golden', 'rotten'
    this.radius = GAME_CONSTANTS.COLLECTIBLES.RADIUS;
    this.collected = false; // Track if this collectible has been collected
    
    // Animation properties for visual appeal
    this.animationTime = Math.random() * Math.PI * 2; // Random start time
    this.bobAmount = 5; // How much to bob up and down
    this.bobSpeed = 0.05; // Speed of bobbing animation
    
    // Initialize variant-specific properties
    this.initializeVariant();
  }

  initializeVariant() {
    const variantData = GAME_CONSTANTS.APPLE_VARIANTS[this.variant.toUpperCase()];
    this.color = variantData.COLOR;
    this.outlineColor = variantData.OUTLINE_COLOR;
    this.scoreValue = variantData.SCORE_VALUE;
  }

  /**
   * Update collectible animation
   */
  update() {
    if (!this.collected) {
      this.animationTime += this.bobSpeed;
    }
  }

  /**
   * Check collision with player using forgiving multi-point detection
   * @param {Player} player - Player object
   * @returns {boolean} True if collision detected
   */
  checkCollision(player) {
    if (this.collected) return false;
    
    // Use player's world coordinates for collision detection
    // Player Y position now represents the bottom of the player
    const playerCenterX = player.worldX;
    const currentHeight = player.normalHeight + (player.crouchHeight - player.normalHeight) * player.crouchTransition;
    
    // Check multiple points on the stickman for very forgiving collision:
    
    // 1. Head position
    const headX = playerCenterX;
    const headY = player.y - currentHeight + GAME_CONSTANTS.BODY.HEAD_RADIUS;
    
    // 2. Body center
    const bodyCenterX = playerCenterX;
    const bodyCenterY = player.y - currentHeight / 2;
    
    // 3. Feet position
    const feetX = playerCenterX;
    const feetY = player.y;
    
    // 4. Left side (arms/body extend left)
    const leftSideX = player.worldX - player.width / 2;
    const leftSideY = player.y - currentHeight / 2;
    
    // 5. Right side (arms/body extend right)
    const rightSideX = player.worldX + player.width / 2;
    const rightSideY = player.y - currentHeight / 2;
    
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
   * Collect this collectible
   * @param {Score} score - Score object to update
   */
  collect(score) {
    if (this.collected) return;
    
    this.collected = true;
    score.addPoints(this.scoreValue);
  }

  /**
   * Draw the collectible with animation
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Camera} camera - Camera for world-to-screen conversion
   */
  draw(ctx, camera) {
    if (this.collected) return; // Don't draw if collected
    
    // Calculate animated position (bobbing effect)
    const bobOffset = Math.sin(this.animationTime) * this.bobAmount;
    const animatedY = this.y + bobOffset;
    
    const screenPos = camera.worldToScreen(this.x, animatedY);
    
    // Don't draw if off-screen
    if (screenPos.x + this.radius < 0 || screenPos.x - this.radius > GAME_CONSTANTS.CANVAS.WIDTH) {
      return;
    }
    
    // Draw filled circle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw outline for better visibility
    ctx.strokeStyle = this.outlineColor;
    ctx.lineWidth = GAME_CONSTANTS.COLLECTIBLES.OUTLINE_WIDTH;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, this.radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Add a small highlight with animation for extra appeal
    const highlightOpacity = 0.3 + Math.sin(this.animationTime * 2) * 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${highlightOpacity})`;
    ctx.beginPath();
    ctx.arc(
      screenPos.x - this.radius * 0.3, 
      screenPos.y - this.radius * 0.3, 
      this.radius * 0.4, 
      0, 2 * Math.PI
    );
    ctx.fill();
  }

  /**
   * Check if collectible is collected
   * @returns {boolean} True if collected
   */
  isCollected() {
    return this.collected;
  }

  /**
   * Get world position
   * @returns {Object} Position {x, y}
   */
  getPosition() {
    return { x: this.x, y: this.y };
  }

  /**
   * Get the collectible's radius
   * @returns {number} The radius of the collectible
   */
  getRadius() {
    return this.radius;
  }

  /**
   * Check if this collectible should be cleaned up (too far from player)
   * @param {number} playerX - Player's world X position
   * @returns {boolean} True if should be cleaned up
   */
  shouldCleanup(playerX) {
    const distance = Math.abs(this.x - playerX);
    return distance > GAME_CONSTANTS.WORLD.CLEANUP_DISTANCE;
  }

  /**
   * Static method to create random apple variant
   * @param {number} x - World X position
   * @param {number} y - World Y position
   * @returns {WorldCollectible} Random apple variant
   */
  static createRandomApple(x, y) {
    const variants = ['normal', 'golden', 'rotten'];
    const weights = [
      GAME_CONSTANTS.APPLE_VARIANTS.NORMAL.SPAWN_CHANCE,
      GAME_CONSTANTS.APPLE_VARIANTS.GOLDEN.SPAWN_CHANCE,
      GAME_CONSTANTS.APPLE_VARIANTS.ROTTEN.SPAWN_CHANCE
    ];
    
    let random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < variants.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return new WorldCollectible(x, y, variants[i]);
      }
    }
    
    return new WorldCollectible(x, y, 'normal'); // Default fallback
  }
}
