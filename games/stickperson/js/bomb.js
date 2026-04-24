/**
 * Bomb Class - Explosive hazard that spawns on the ground
 * When touched by the player, it triggers the dramatic death animation
 */
class Bomb {
  constructor(x, y) {
    this.x = x; // World X position
    this.y = y; // World Y position (on ground)
    this.width = GAME_CONSTANTS.BOMB.BODY_WIDTH;
    this.height = GAME_CONSTANTS.BOMB.BODY_HEIGHT;
    this.active = true;
    
    // Animation properties
    this.fuseFlicker = 0; // For flickering fuse flame
    this.rotation = 0; // Slight rotation for visual interest
  }

  update() {
    if (!this.active) return;
    
    // Animate fuse flicker
    this.fuseFlicker += GAME_CONSTANTS.BOMB.FUSE_FLICKER_SPEED;
    
    // Slight rotation animation
    this.rotation = Math.sin(this.fuseFlicker * 0.5) * 0.1;
  }

  draw(ctx, camera) {
    if (!this.active) return;
    
    const screenPos = camera.worldToScreen(this.x, this.y);
    
    // Don't draw if off-screen
    if (screenPos.x < -50 || screenPos.x > GAME_CONSTANTS.CANVAS.WIDTH + 50) return;
    
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(this.rotation);
    
    // Draw bomb body with gradient effect
    const gradient = ctx.createRadialGradient(0, -5, 0, 0, 0, this.width / 2);
    gradient.addColorStop(0, '#8B0000'); // Dark red center
    gradient.addColorStop(0.7, '#A52A2A'); // Medium red
    gradient.addColorStop(1, '#DC143C'); // Bright red edge
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#2F0000'; // Very dark red outline
    ctx.lineWidth = 3;
    
    // Draw main bomb body (rounded rectangle)
    ctx.beginPath();
    ctx.roundRect(-this.width / 2, -this.height / 2, this.width, this.height, 8);
    ctx.fill();
    ctx.stroke();
    
    // Draw metallic bands around the bomb
    ctx.strokeStyle = '#C0C0C0'; // Silver
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-this.width / 2 + 5, -this.height / 2 + 8);
    ctx.lineTo(this.width / 2 - 5, -this.height / 2 + 8);
    ctx.moveTo(-this.width / 2 + 5, this.height / 2 - 8);
    ctx.lineTo(this.width / 2 - 5, this.height / 2 - 8);
    ctx.stroke();
    
    // Draw warning symbol (skull and crossbones style)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☠', 0, 0);
    
    // Draw spikes around the bomb (more menacing)
    ctx.fillStyle = '#2F2F2F'; // Dark gray
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    
    for (let i = 0; i < GAME_CONSTANTS.BOMB.SPIKES_COUNT; i++) {
      const angle = (i / GAME_CONSTANTS.BOMB.SPIKES_COUNT) * Math.PI * 2;
      const spikeX = Math.cos(angle) * (this.width / 2 + 3);
      const spikeY = Math.sin(angle) * (this.height / 2 + 3);
      const spikeEndX = Math.cos(angle) * (this.width / 2 + GAME_CONSTANTS.BOMB.SPIKES_LENGTH);
      const spikeEndY = Math.sin(angle) * (this.height / 2 + GAME_CONSTANTS.BOMB.SPIKES_LENGTH);
      
      // Draw spike as a triangle
      ctx.beginPath();
      ctx.moveTo(spikeX, spikeY);
      ctx.lineTo(spikeEndX, spikeEndY);
      ctx.lineTo(spikeX + Math.cos(angle + 0.3) * 3, spikeY + Math.sin(angle + 0.3) * 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    
    // Draw fuse with better styling
    ctx.strokeStyle = '#8B4513'; // Brown fuse
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -this.height / 2);
    ctx.lineTo(0, -this.height / 2 - GAME_CONSTANTS.BOMB.FUSE_LENGTH);
    ctx.stroke();
    
    // Draw flickering flame on fuse with multiple colors
    const flameVisible = Math.sin(this.fuseFlicker) > 0;
    if (flameVisible) {
      // Outer flame (orange)
      ctx.fillStyle = '#FF4500';
      ctx.beginPath();
      ctx.arc(0, -this.height / 2 - GAME_CONSTANTS.BOMB.FUSE_LENGTH, GAME_CONSTANTS.BOMB.FUSE_FLAME_SIZE + 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Inner flame (yellow)
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, -this.height / 2 - GAME_CONSTANTS.BOMB.FUSE_LENGTH, GAME_CONSTANTS.BOMB.FUSE_FLAME_SIZE, 0, Math.PI * 2);
      ctx.fill();
      
      // Core flame (white)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -this.height / 2 - GAME_CONSTANTS.BOMB.FUSE_LENGTH, GAME_CONSTANTS.BOMB.FUSE_FLAME_SIZE - 1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  checkCollision(player) {
    if (!this.active) return false;
    
    // Calculate player's current height (considering crouch state)
    const playerHeight = player.normalHeight + (player.crouchHeight - player.normalHeight) * player.crouchTransition;
    
    // Simple AABB collision detection
    // Player Y position represents the bottom of the player
    const playerLeft = player.worldX - player.width / 2;
    const playerRight = player.worldX + player.width / 2;
    const playerTop = player.y - playerHeight; // Top of player
    const playerBottom = player.y; // Bottom of player (at ground level when standing)
    
    const bombLeft = this.x - this.width / 2;
    const bombRight = this.x + this.width / 2;
    const bombTop = this.y - this.height / 2;
    const bombBottom = this.y + this.height / 2;
    
    // Check collision detection
    const collision = playerLeft < bombRight && 
                     playerRight > bombLeft && 
                     playerTop < bombBottom && 
                     playerBottom > bombTop;
    
    return collision;
  }

  explode() {
    this.active = false;
  }

  isActive() {
    return this.active;
  }
}
