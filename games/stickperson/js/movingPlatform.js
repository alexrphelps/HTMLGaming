/**
 * MovingPlatform Class - Handles platforms that move horizontally or vertically
 */
class MovingPlatform {
  constructor(x, y, movementType, game) {
    this.x = x;
    this.y = y;
    this.game = game;
    this.movementType = movementType; // 'horizontal' or 'vertical'
    
    // Platform properties
    this.width = GAME_CONSTANTS.MOVING_PLATFORMS.WIDTH;
    this.height = GAME_CONSTANTS.MOVING_PLATFORMS.HEIGHT;
    this.color = GAME_CONSTANTS.MOVING_PLATFORMS.COLOR;
    
    // Movement properties
    this.speed = movementType === 'horizontal' ? 
      GAME_CONSTANTS.MOVING_PLATFORMS.HORIZONTAL_SPEED : 
      GAME_CONSTANTS.MOVING_PLATFORMS.VERTICAL_SPEED;
    
    this.range = GAME_CONSTANTS.MOVING_PLATFORMS.MOVEMENT_RANGE;
    
    // Initialize movement bounds
    this.initializeMovement();
    
    // Player interaction
    this.playerOnPlatform = false;
    this.playerOffset = 0; // How far player is from platform center
  }

  initializeMovement() {
    if (this.movementType === 'horizontal') {
      this.startX = this.x;
      this.endX = this.x + this.range;
      this.direction = 1; // 1 for right, -1 for left
    } else {
      this.startY = this.y;
      this.endY = this.y + this.range;
      this.direction = 1; // 1 for down, -1 for up
    }
  }

  update(deltaMs = GAME_CONSTANTS.PERFORMANCE.FRAME_TIME) {
    const frameScale = StickpersonGeometry.getFrameScale(deltaMs);
    const previousX = this.x;
    const previousY = this.y;

    // Update platform position
    if (this.movementType === 'horizontal') {
      this.x += this.speed * this.direction * frameScale;
      
      // Reverse direction at bounds
      if (this.x >= this.endX) {
        this.x = this.endX;
        this.direction = -1;
      } else if (this.x <= this.startX) {
        this.x = this.startX;
        this.direction = 1;
      }
    } else {
      this.y += this.speed * this.direction * frameScale;
      
      // Reverse direction at bounds
      if (this.y >= this.endY) {
        this.y = this.endY;
        this.direction = -1;
      } else if (this.y <= this.startY) {
        this.y = this.startY;
        this.direction = 1;
      }
    }
    
    // Update player position if on platform
    if (this.playerOnPlatform) {
      this.updatePlayerPosition(this.x - previousX, this.y - previousY);
    }
  }

  updatePlayerPosition(deltaX, deltaY) {
    const player = this.game.player;
    
    if (this.movementType === 'horizontal') {
      // Move player horizontally with platform
      player.worldX += deltaX;
    } else {
      // Move player vertically with platform
      player.y += deltaY;
      
      // Check if player is still on platform
      if (Math.abs(StickpersonGeometry.getPlayerBounds(player).bottom - this.y) > 10) {
        this.playerOnPlatform = false;
        player.standingOnPlatform = null;
      }
    }
  }

  draw(ctx, camera) {
    const screenX = camera.worldToScreen(this.x);
    const screenY = this.y;
    
    // Don't draw if off-screen
    if (screenX < -this.width || screenX > GAME_CONSTANTS.CANVAS.WIDTH + this.width) return;
    
    // Draw platform
    ctx.fillStyle = this.color;
    ctx.fillRect(screenX, screenY, this.width, this.height);
    
    // Draw movement indicator arrows
    this.drawMovementIndicator(ctx, screenX, screenY);
  }

  drawMovementIndicator(ctx, x, y) {
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    if (this.movementType === 'horizontal') {
      // Draw horizontal arrows
      const arrowY = y - 10;
      const arrowSize = 8;
      
      // Left arrow
      ctx.beginPath();
      ctx.moveTo(x + 10, arrowY);
      ctx.lineTo(x + 10 + arrowSize, arrowY - arrowSize/2);
      ctx.lineTo(x + 10 + arrowSize, arrowY + arrowSize/2);
      ctx.closePath();
      ctx.stroke();
      
      // Right arrow
      ctx.beginPath();
      ctx.moveTo(x + this.width - 10, arrowY);
      ctx.lineTo(x + this.width - 10 - arrowSize, arrowY - arrowSize/2);
      ctx.lineTo(x + this.width - 10 - arrowSize, arrowY + arrowSize/2);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Draw vertical arrows
      const arrowX = x + this.width / 2;
      const arrowSize = 8;
      
      // Up arrow
      ctx.beginPath();
      ctx.moveTo(arrowX, y - 10);
      ctx.lineTo(arrowX - arrowSize/2, y - 10 + arrowSize);
      ctx.lineTo(arrowX + arrowSize/2, y - 10 + arrowSize);
      ctx.closePath();
      ctx.stroke();
      
      // Down arrow
      ctx.beginPath();
      ctx.moveTo(arrowX, y + this.height + 10);
      ctx.lineTo(arrowX - arrowSize/2, y + this.height + 10 - arrowSize);
      ctx.lineTo(arrowX + arrowSize/2, y + this.height + 10 - arrowSize);
      ctx.closePath();
      ctx.stroke();
    }
  }

  checkCollision(player) {
    const playerBounds = StickpersonGeometry.getPlayerBounds(player);
    const platformBounds = StickpersonGeometry.getRectBounds(this.x, this.y, this.width, this.height);
    
    // Check if rectangles overlap
    if (StickpersonGeometry.overlaps(playerBounds, platformBounds)) {
      
      // Determine collision direction
      const overlapX = Math.min(playerBounds.right, platformBounds.right) - Math.max(playerBounds.left, platformBounds.left);
      const overlapY = Math.min(playerBounds.bottom, platformBounds.bottom) - Math.max(playerBounds.top, platformBounds.top);
      
      if (overlapX < overlapY) {
        return { direction: player.worldX < this.x ? 'left' : 'right' };
      } else {
        return { direction: playerBounds.bottom <= this.y + this.height ? 'top' : 'bottom' };
      }
    }
    
    return null; // No collision
  }

  canStandOn(player) {
    const playerBounds = StickpersonGeometry.getPlayerBounds(player);
    const playerCenterX = playerBounds.centerX;
    const platformLeft = this.x;
    const platformRight = this.x + this.width;
    
    // Check if player is above the platform and within its horizontal bounds
    return playerCenterX >= platformLeft && 
           playerCenterX <= platformRight && 
           Math.abs(playerBounds.bottom - this.y) <= 10; // Small tolerance
  }

  getTopY() {
    return this.y;
  }

  // Static method to create random moving platform
  static createRandomMovingPlatform(x, y, game) {
    const movementTypes = ['horizontal', 'vertical'];
    const randomType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
    
    return new MovingPlatform(x, y, randomType, game);
  }
}
