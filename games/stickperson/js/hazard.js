/**
 * Hazard Class - Handles all environmental hazards
 * Types: spikes, fire pits, pendulums, collapsing platforms, quicksand, wind zones
 */
class Hazard {
  constructor(x, y, type, game) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.game = game;
    this.active = true;
    this.animationTime = 0;
    
    // Initialize hazard-specific properties
    this.initializeHazard();
  }

  initializeHazard() {
    switch (this.type) {
      case 'spike':
        this.width = GAME_CONSTANTS.HAZARDS.SPIKE_WIDTH;
        this.height = GAME_CONSTANTS.HAZARDS.SPIKE_HEIGHT;
        this.damage = GAME_CONSTANTS.HAZARDS.SPIKE_DAMAGE;
        break;
        
      case 'fire':
        this.width = GAME_CONSTANTS.HAZARDS.FIRE_WIDTH;
        this.height = GAME_CONSTANTS.HAZARDS.FIRE_HEIGHT;
        this.damage = GAME_CONSTANTS.HAZARDS.FIRE_DAMAGE;
        break;
        
      case 'pendulum':
        this.radius = GAME_CONSTANTS.HAZARDS.PENDULUM_RADIUS;
        this.chainLength = GAME_CONSTANTS.HAZARDS.PENDULUM_CHAIN_LENGTH;
        this.angle = Math.random() * Math.PI; // Random starting angle
        this.damage = GAME_CONSTANTS.HAZARDS.PENDULUM_DAMAGE;
        break;
        
      case 'collapsing':
        this.width = 100;
        this.height = 20;
        this.collapsed = false;
        this.collapseTimer = 0;
        this.fallSpeed = GAME_CONSTANTS.HAZARDS.COLLAPSING_FALL_SPEED;
        break;
        
      case 'quicksand':
        this.width = 80;
        this.height = 20;
        this.slowFactor = GAME_CONSTANTS.HAZARDS.QUICKSAND_SLOW_FACTOR;
        this.jumpReduction = GAME_CONSTANTS.HAZARDS.QUICKSAND_JUMP_REDUCTION;
        break;
        
      case 'wind':
        this.width = 200;
        this.height = 100;
        this.direction = Math.random() < 0.5 ? -1 : 1; // Left or right
        this.force = GAME_CONSTANTS.HAZARDS.WIND_FORCE;
        this.duration = GAME_CONSTANTS.HAZARDS.WIND_DURATION;
        this.cooldown = GAME_CONSTANTS.HAZARDS.WIND_COOLDOWN;
        this.activeTime = 0;
        this.cooldownTime = 0;
        this.isActive = false;
        break;
    }
  }

  update() {
    this.animationTime += 0.016; // ~60fps
    
    switch (this.type) {
      case 'fire':
        // Fire animation - flickering effect
        break;
        
      case 'pendulum':
        // Pendulum swinging motion
        this.angle += GAME_CONSTANTS.HAZARDS.PENDULUM_SWING_SPEED;
        break;
        
      case 'collapsing':
        // Handle collapsing platform logic
        if (this.collapseTimer > 0) {
          this.collapseTimer -= 16; // ~60fps
          if (this.collapseTimer <= 0) {
            this.collapsed = true;
          }
        }
        
        if (this.collapsed) {
          this.y += this.fallSpeed;
        }
        break;
        
      case 'wind':
        // Wind activation cycle
        if (this.isActive) {
          this.activeTime += 16;
          if (this.activeTime >= this.duration) {
            this.isActive = false;
            this.cooldownTime = 0;
          }
        } else {
          this.cooldownTime += 16;
          if (this.cooldownTime >= this.cooldown) {
            this.isActive = true;
            this.activeTime = 0;
          }
        }
        break;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    
    const screenX = camera.worldToScreen(this.x);
    const screenY = this.y;
    
    // Don't draw if off-screen
    if (screenX < -100 || screenX > GAME_CONSTANTS.CANVAS.WIDTH + 100) return;
    
    ctx.save();
    
    switch (this.type) {
      case 'spike':
        this.drawSpike(ctx, screenX, screenY);
        break;
        
      case 'fire':
        this.drawFire(ctx, screenX, screenY);
        break;
        
      case 'pendulum':
        this.drawPendulum(ctx, screenX, screenY);
        break;
        
      case 'collapsing':
        this.drawCollapsingPlatform(ctx, screenX, screenY);
        break;
        
      case 'quicksand':
        this.drawQuicksand(ctx, screenX, screenY);
        break;
        
      case 'wind':
        this.drawWind(ctx, screenX, screenY);
        break;
    }
    
    ctx.restore();
  }

  drawSpike(ctx, x, y) {
    ctx.fillStyle = GAME_CONSTANTS.HAZARDS.SPIKE_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + this.width / 2, y - this.height);
    ctx.lineTo(x + this.width, y);
    ctx.closePath();
    ctx.fill();
  }

  drawFire(ctx, x, y) {
    // Animated fire effect
    const flicker = Math.sin(this.animationTime * GAME_CONSTANTS.HAZARDS.FIRE_ANIMATION_SPEED * 10) * 0.1;
    const fireHeight = this.height + flicker * 10;
    
    ctx.fillStyle = GAME_CONSTANTS.HAZARDS.FIRE_COLOR;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + this.width / 3, y - fireHeight);
    ctx.lineTo(x + this.width * 2 / 3, y - fireHeight * 0.8);
    ctx.lineTo(x + this.width, y);
    ctx.closePath();
    ctx.fill();
  }

  drawPendulum(ctx, x, y) {
    // Draw chain
    const chainX = x + this.chainLength * Math.sin(this.angle);
    const chainY = y - this.chainLength * Math.cos(this.angle);
    
    ctx.strokeStyle = 'gray';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(chainX, chainY);
    ctx.stroke();
    
    // Draw pendulum ball
    ctx.fillStyle = GAME_CONSTANTS.HAZARDS.PENDULUM_COLOR;
    ctx.beginPath();
    ctx.arc(chainX, chainY, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCollapsingPlatform(ctx, x, y) {
    const color = this.collapsed ? 'red' : GAME_CONSTANTS.HAZARDS.COLLAPSING_COLOR;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, this.width, this.height);
    
    // Draw warning cracks if about to collapse
    if (this.collapseTimer > 0 && this.collapseTimer < 500) {
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + this.width / 3, y);
      ctx.lineTo(x + this.width / 3, y + this.height);
      ctx.moveTo(x + this.width * 2 / 3, y);
      ctx.lineTo(x + this.width * 2 / 3, y + this.height);
      ctx.stroke();
    }
  }

  drawQuicksand(ctx, x, y) {
    ctx.fillStyle = GAME_CONSTANTS.HAZARDS.QUICKSAND_COLOR;
    ctx.fillRect(x, y, this.width, this.height);
    
    // Draw bubbles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 3; i++) {
      const bubbleX = x + (i + 1) * this.width / 4;
      const bubbleY = y - Math.sin(this.animationTime + i) * 5;
      ctx.beginPath();
      ctx.arc(bubbleX, bubbleY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawWind(ctx, x, y) {
    if (!this.isActive) return;
    
    // Draw wind effect
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < 5; i++) {
      const windY = y + i * 20;
      const windX = x + (this.direction > 0 ? 0 : this.width);
      const windEndX = x + (this.direction > 0 ? this.width : 0);
      
      ctx.beginPath();
      ctx.moveTo(windX, windY);
      ctx.lineTo(windEndX, windY);
      ctx.stroke();
    }
  }

  checkCollision(player) {
    if (!this.active) return null;
    
    switch (this.type) {
      case 'spike':
      case 'fire':
        return this.checkRectangularCollision(player);
        
      case 'pendulum':
        return this.checkPendulumCollision(player);
        
      case 'collapsing':
        return this.checkCollapsingCollision(player);
        
      case 'quicksand':
        return this.checkQuicksandCollision(player);
        
      case 'wind':
        return this.checkWindCollision(player);
    }
    
    return null;
  }

  checkRectangularCollision(player) {
    const playerLeft = player.worldX;
    const playerRight = player.worldX + GAME_CONSTANTS.PLAYER.WIDTH;
    const playerTop = player.y;
    const playerBottom = player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT;
    
    const hazardLeft = this.x;
    const hazardRight = this.x + this.width;
    const hazardTop = this.y - this.height;
    const hazardBottom = this.y;
    
    if (playerRight > hazardLeft && 
        playerLeft < hazardRight && 
        playerBottom > hazardTop && 
        playerTop < hazardBottom) {
      return { type: 'damage', damage: this.damage };
    }
    
    return null;
  }

  checkPendulumCollision(player) {
    const chainX = this.x + this.chainLength * Math.sin(this.angle);
    const chainY = this.y - this.chainLength * Math.cos(this.angle);
    
    const playerCenterX = player.worldX + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const playerCenterY = player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT / 2;
    
    const distance = Math.sqrt(
      Math.pow(playerCenterX - chainX, 2) + 
      Math.pow(playerCenterY - chainY, 2)
    );
    
    if (distance < this.radius + 10) { // Small buffer
      return { type: 'damage', damage: this.damage };
    }
    
    return null;
  }

  checkCollapsingCollision(player) {
    if (this.collapsed) return null;
    
    const playerCenterX = player.worldX + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const platformLeft = this.x;
    const platformRight = this.x + this.width;
    
    // Check if player is standing on platform
    if (playerCenterX >= platformLeft && 
        playerCenterX <= platformRight && 
        player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT <= this.y + 10) {
      
      // Start collapse timer if not already started
      if (this.collapseTimer === 0) {
        this.collapseTimer = GAME_CONSTANTS.HAZARDS.COLLAPSING_DELAY;
      }
      
      return { type: 'platform', platform: this };
    }
    
    return null;
  }

  checkQuicksandCollision(player) {
    const playerCenterX = player.worldX + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const quicksandLeft = this.x;
    const quicksandRight = this.x + this.width;
    
    if (playerCenterX >= quicksandLeft && 
        playerCenterX <= quicksandRight && 
        player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT >= this.y) {
      return { type: 'quicksand', hazard: this };
    }
    
    return null;
  }

  checkWindCollision(player) {
    if (!this.isActive) return null;
    
    const playerCenterX = player.worldX + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const playerCenterY = player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT / 2;
    
    if (playerCenterX >= this.x && 
        playerCenterX <= this.x + this.width &&
        playerCenterY >= this.y && 
        playerCenterY <= this.y + this.height) {
      return { type: 'wind', direction: this.direction, force: this.force };
    }
    
    return null;
  }

  // Static method to create random hazard
  static createRandomHazard(x, y, game) {
    const hazardTypes = ['spike', 'fire', 'pendulum', 'collapsing', 'quicksand', 'wind'];
    const weights = [0.3, 0.2, 0.1, 0.2, 0.1, 0.1]; // Probability weights
    
    let random = Math.random();
    let cumulativeWeight = 0;
    
    for (let i = 0; i < hazardTypes.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return new Hazard(x, y, hazardTypes[i], game);
      }
    }
    
    return new Hazard(x, y, 'spike', game); // Default fallback
  }
}
