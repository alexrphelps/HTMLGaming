/**
 * PowerUp Class - Handles temporary power-ups and buffs
 * Types: speed boots, magnet, shrink, grow
 */
class PowerUp {
  constructor(x, y, type, game) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.game = game;
    this.active = true;
    this.animationTime = 0;
    this.radius = 15;
    
    // Initialize power-up specific properties
    this.initializePowerUp();
  }

  initializePowerUp() {
    switch (this.type) {
      case 'speed':
        this.color = GAME_CONSTANTS.POWER_UPS.SPEED_BOOTS_COLOR;
        this.duration = GAME_CONSTANTS.POWER_UPS.SPEED_BOOTS_DURATION;
        this.multiplier = GAME_CONSTANTS.POWER_UPS.SPEED_BOOTS_MULTIPLIER;
        break;
        
      case 'magnet':
        this.color = GAME_CONSTANTS.POWER_UPS.MAGNET_COLOR;
        this.duration = GAME_CONSTANTS.POWER_UPS.MAGNET_DURATION;
        this.range = GAME_CONSTANTS.POWER_UPS.MAGNET_RANGE;
        this.force = GAME_CONSTANTS.POWER_UPS.MAGNET_FORCE;
        break;
        
      case 'shrink':
        this.color = GAME_CONSTANTS.POWER_UPS.SHRINK_COLOR;
        this.duration = GAME_CONSTANTS.POWER_UPS.SIZE_DURATION;
        this.multiplier = GAME_CONSTANTS.POWER_UPS.SHRINK_MULTIPLIER;
        break;
        
      case 'grow':
        this.color = GAME_CONSTANTS.POWER_UPS.GROW_COLOR;
        this.duration = GAME_CONSTANTS.POWER_UPS.SIZE_DURATION;
        this.multiplier = GAME_CONSTANTS.POWER_UPS.GROW_MULTIPLIER;
        break;
    }
  }

  update() {
    this.animationTime += 0.016; // ~60fps
  }

  draw(ctx, camera) {
    if (!this.active) return;
    
    const screenX = camera.worldToScreen(this.x);
    const screenY = this.y;
    
    // Don't draw if off-screen
    if (screenX < -this.radius || screenX > GAME_CONSTANTS.CANVAS.WIDTH + this.radius) return;
    
    ctx.save();
    
    // Draw power-up with pulsing effect
    const pulse = Math.sin(this.animationTime * 5) * 0.2 + 1;
    const currentRadius = this.radius * pulse;
    
    // Draw glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;
    
    // Draw main circle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, currentRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw outline
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw power-up symbol
    this.drawSymbol(ctx, screenX, screenY, currentRadius);
    
    ctx.restore();
  }

  drawSymbol(ctx, x, y, radius) {
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    switch (this.type) {
      case 'speed':
        // Draw lightning bolt
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.3, y - radius * 0.6);
        ctx.lineTo(x + radius * 0.2, y - radius * 0.2);
        ctx.lineTo(x - radius * 0.1, y);
        ctx.lineTo(x + radius * 0.3, y + radius * 0.6);
        ctx.lineTo(x - radius * 0.2, y + radius * 0.2);
        ctx.lineTo(x + radius * 0.1, y);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'magnet':
        // Draw magnet symbol
        ctx.beginPath();
        ctx.arc(x - radius * 0.3, y, radius * 0.4, 0, Math.PI * 2);
        ctx.arc(x + radius * 0.3, y, radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw connecting lines
        ctx.beginPath();
        ctx.moveTo(x - radius * 0.7, y);
        ctx.lineTo(x - radius * 0.1, y);
        ctx.moveTo(x + radius * 0.1, y);
        ctx.lineTo(x + radius * 0.7, y);
        ctx.stroke();
        break;
        
      case 'shrink':
        // Draw down arrow
        ctx.beginPath();
        ctx.moveTo(x, y - radius * 0.4);
        ctx.lineTo(x - radius * 0.3, y + radius * 0.2);
        ctx.lineTo(x + radius * 0.3, y + radius * 0.2);
        ctx.closePath();
        ctx.fill();
        break;
        
      case 'grow':
        // Draw up arrow
        ctx.beginPath();
        ctx.moveTo(x, y + radius * 0.4);
        ctx.lineTo(x - radius * 0.3, y - radius * 0.2);
        ctx.lineTo(x + radius * 0.3, y - radius * 0.2);
        ctx.closePath();
        ctx.fill();
        break;
    }
  }

  checkCollision(player) {
    if (!this.active) return false;
    
    const playerCenterX = player.worldX + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const playerCenterY = player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT / 2;
    
    const distance = Math.sqrt(
      Math.pow(playerCenterX - this.x, 2) + 
      Math.pow(playerCenterY - this.y, 2)
    );
    
    return distance <= this.radius + 10; // Small buffer for easier collection
  }

  collect() {
    this.active = false;
    return this.type;
  }

  // Static method to create random power-up
  static createRandomPowerUp(x, y, game) {
    const powerUpTypes = ['speed', 'magnet', 'shrink', 'grow'];
    const weights = [0.3, 0.3, 0.2, 0.2]; // Probability weights
    
    let random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < powerUpTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return new PowerUp(x, y, powerUpTypes[i], game);
      }
    }
    
    return new PowerUp(x, y, 'speed', game); // Default fallback
  }
}
