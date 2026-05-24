/**
 * UFO Class - Handles flying alien enemies
 * Features: floating movement, collision detection, vaporization effect
 */
class UFO {
  constructor(x, y, game) {
    this.x = x; // World X position
    this.y = y; // World Y position
    this.game = game;
    this.active = true;
    this.animationTime = 0;
    
    // UFO properties from constants
    this.width = GAME_CONSTANTS.UFO.BODY_WIDTH;
    this.height = GAME_CONSTANTS.UFO.BODY_HEIGHT;
    this.domeRadius = GAME_CONSTANTS.UFO.DOME_RADIUS;
    this.lightRadius = GAME_CONSTANTS.UFO.LIGHT_RADIUS;
    
    // Movement properties
    this.speed = GAME_CONSTANTS.UFO.SPEED;
    this.direction = Math.random() < 0.5 ? -1 : 1; // Random direction (left or right)
    this.baseY = y; // Store original Y for floating animation
    this.floatAmplitude = GAME_CONSTANTS.UFO.FLOAT_AMPLITUDE;
    this.floatSpeed = GAME_CONSTANTS.UFO.FLOAT_SPEED;
    
    // Animation properties
    this.lightAnimationOffset = Math.random() * Math.PI * 2; // Random light blinking start
  }

  update() {
    if (!this.active) return;
    
    this.animationTime += 0.016; // ~60fps
    
    // Move horizontally
    this.x += this.speed * this.direction;
    
    // Floating animation - gentle up and down movement
    this.y = this.baseY + Math.sin(this.animationTime * this.floatSpeed) * this.floatAmplitude;
    
    // Remove UFO if it goes too far off screen (for performance)
    const playerX = this.game.player.worldX;
    if (Math.abs(this.x - playerX) > GAME_CONSTANTS.WORLD.CLEANUP_DISTANCE) {
      this.active = false;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    
    const screenPos = camera.worldToScreen(this.x, this.y);
    const screenX = screenPos.x;
    const screenY = screenPos.y;
    
    // Don't draw if off-screen
    if (screenX < -this.width || screenX > GAME_CONSTANTS.CANVAS.WIDTH + this.width) return;
    
    // Debug: Draw a simple red circle first to make sure UFOs are visible
    ctx.save();
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(screenX, screenY, 15, 0, 2 * Math.PI); // Increased from 10 to 15
    ctx.fill();
    ctx.restore();
    
    ctx.save();
    
    // Draw UFO body (elliptical)
    ctx.fillStyle = GAME_CONSTANTS.UFO.BODY_COLOR;
    ctx.strokeStyle = GAME_CONSTANTS.UFO.OUTLINE_COLOR;
    ctx.lineWidth = 2;
    
    // Draw elliptical body
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, this.width / 2, this.height / 2, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw dome (top half of circle)
    ctx.fillStyle = GAME_CONSTANTS.UFO.DOME_COLOR;
    ctx.beginPath();
    ctx.arc(screenX, screenY - this.height / 4, this.domeRadius, 0, Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Draw lights around the edge (animated blinking)
    const lightCount = 8; // Increased for more lights
    for (let i = 0; i < lightCount; i++) {
      const angle = (i / lightCount) * 2 * Math.PI;
      const lightX = screenX + Math.cos(angle) * (this.width / 2 - 5);
      const lightY = screenY + Math.sin(angle) * (this.height / 2 - 5);
      
      // Alternate between yellow and red lights
      const isRedLight = i % 2 === 0; // Even indices are red, odd are yellow
      ctx.fillStyle = isRedLight ? GAME_CONSTANTS.UFO.RED_LIGHT_COLOR : GAME_CONSTANTS.UFO.LIGHT_COLOR;
      
      // Animated blinking effect - red lights blink faster and more intensely
      const blinkSpeed = isRedLight ? 5 : 3; // Red lights blink faster
      const blinkPhase = Math.sin(this.animationTime * blinkSpeed + this.lightAnimationOffset + i) * 0.5 + 0.5;
      const currentLightRadius = this.lightRadius * blinkPhase;
      
      ctx.beginPath();
      ctx.arc(lightX, lightY, currentLightRadius, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw center light (red warning light - more prominent and menacing)
    const centerBlink = Math.sin(this.animationTime * 4 + this.lightAnimationOffset) * 0.4 + 0.6; // Faster, more intense blinking
    ctx.fillStyle = `rgba(255, 0, 0, ${centerBlink})`; // Red center light
    ctx.beginPath();
    ctx.arc(screenX, screenY - this.height / 4, this.lightRadius * 1.5, 0, 2 * Math.PI);
    ctx.fill();
    
    ctx.restore();
  }

  checkCollision(player) {
    if (!this.active) return false;
    
    // Calculate player's current height (considering crouch state)
    const playerHeight = player.normalHeight + (player.crouchHeight - player.normalHeight) * player.crouchTransition;
    
    // Player Y position now represents the bottom of the player
    const playerLeft = player.worldX - player.width / 2;
    const playerRight = player.worldX + player.width / 2;
    const playerTop = player.y - playerHeight; // Top of player
    const playerBottom = player.y; // Bottom of player
    
    // UFO collision bounds (elliptical)
    const ufoLeft = this.x - this.width / 2;
    const ufoRight = this.x + this.width / 2;
    const ufoTop = this.y - this.height / 2;
    const ufoBottom = this.y + this.height / 2;
    
    // Add collision buffer for more forgiving detection
    const buffer = GAME_CONSTANTS.UFO.COLLISION_BUFFER;
    
    // Simple rectangular collision with buffer
    if (playerRight > ufoLeft + buffer && 
        playerLeft < ufoRight - buffer && 
        playerBottom > ufoTop + buffer && 
        playerTop < ufoBottom - buffer) {
      return true;
    }
    
    return false;
  }

  // Static method to create random UFO
  static createRandomUFO(x, y, game) {
    return new UFO(x, y, game);
  }
}
