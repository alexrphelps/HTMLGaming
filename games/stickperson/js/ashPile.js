/**
 * AshPile Class - Handles the ash pile effect when player is vaporized
 * Creates falling gray particles that represent the remains of the stickman
 */
class AshPile {
  constructor(x, y) {
    this.x = x; // World X position where player was vaporized
    this.y = y; // World Y position where player was vaporized
    this.particles = [];
    this.active = true;
    
    // Create ash particles
    this.createParticles();
  }

  createParticles() {
    const particleCount = GAME_CONSTANTS.GAME_OVER.ASH_PARTICLES * 2; // Double the particles for more visibility
    
    for (let i = 0; i < particleCount; i++) {
      // Create particles with random positions around the player
      const offsetX = (Math.random() - 0.5) * 60; // Increased spread horizontally
      const offsetY = (Math.random() - 0.5) * 30; // Increased spread vertically
      
      const particle = {
        x: this.x + offsetX,
        y: this.y + offsetY,
        vx: (Math.random() - 0.5) * 4, // Increased horizontal velocity
        vy: Math.random() * -5 - 2, // Increased upward velocity
        size: Math.random() * 4 + 2, // Increased size range
        rotation: Math.random() * Math.PI * 2, // Random rotation
        rotationSpeed: (Math.random() - 0.5) * 0.3, // Increased rotation speed
        life: 1.0, // Life starts at 1.0 and decreases
        decayRate: Math.random() * 0.008 + 0.003, // Slower decay for longer visibility
        onGround: false, // Whether particle has hit the ground
        color: Math.random() > 0.5 ? 'rgba(128, 128, 128, 1)' : 'rgba(96, 96, 96, 1)' // Vary ash color
      };
      
      this.particles.push(particle);
    }
  }

  update() {
    if (!this.active) return;
    
    let allParticlesDead = true;
    
    for (const particle of this.particles) {
      if (particle.life > 0) {
        allParticlesDead = false;
        
        // Update particle physics
        if (!particle.onGround) {
          // Apply gravity
          particle.vy += 0.1; // Gravity effect
          
          // Update position
          particle.x += particle.vx;
          particle.y += particle.vy;
          
          // Check if particle hits ground
          if (particle.y >= GAME_CONSTANTS.CANVAS.GROUND_Y) {
            particle.y = GAME_CONSTANTS.CANVAS.GROUND_Y;
            particle.vy = 0;
            particle.vx *= 0.5; // Slow down on ground
            particle.onGround = true;
          }
        } else {
          // On ground - slow down horizontal movement
          particle.vx *= 0.95;
          particle.x += particle.vx;
        }
        
        // Update rotation
        particle.rotation += particle.rotationSpeed;
        
        // Decrease life
        particle.life -= particle.decayRate;
        
        // Ensure life doesn't go below 0
        if (particle.life < 0) {
          particle.life = 0;
        }
      }
    }
    
    // If all particles are dead, deactivate ash pile
    if (allParticlesDead) {
      this.active = false;
    }
  }

  draw(ctx, camera) {
    if (!this.active) return;
    
    ctx.save();
    
    for (const particle of this.particles) {
      if (particle.life > 0) {
        const screenPos = camera.worldToScreen(particle.x, particle.y);
        
        // Don't draw if off-screen
        if (screenPos.x < -10 || screenPos.x > GAME_CONSTANTS.CANVAS.WIDTH + 10) continue;
        
        // Set particle color with alpha based on life
        const alpha = particle.life;
        const baseColor = particle.color;
        ctx.fillStyle = baseColor.replace('1)', `${alpha})`);
        ctx.strokeStyle = `rgba(32, 32, 32, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        
        // Draw particle as a small irregular shape
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);
        ctx.rotate(particle.rotation);
        
        // Draw irregular ash particle
        ctx.beginPath();
        ctx.moveTo(0, -particle.size);
        ctx.lineTo(particle.size * 0.7, -particle.size * 0.3);
        ctx.lineTo(particle.size, particle.size * 0.5);
        ctx.lineTo(particle.size * 0.3, particle.size);
        ctx.lineTo(-particle.size * 0.3, particle.size * 0.7);
        ctx.lineTo(-particle.size, particle.size * 0.2);
        ctx.lineTo(-particle.size * 0.5, -particle.size * 0.5);
        ctx.closePath();
        
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
      }
    }
    
    ctx.restore();
  }

  isActive() {
    return this.active;
  }
}
