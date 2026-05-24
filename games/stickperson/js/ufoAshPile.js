/**
 * UFOAshPile Class - Creates a falling ash pile for UFO deaths
 * Particles fall straight down to form a small hill of ashes
 */
class UFOAshPile {
  constructor(x, y) {
    this.x = x; // World X position where player was vaporized
    this.y = y; // World Y position where player was vaporized
    this.particles = [];
    this.active = true;
    
    // Create falling ash particles
    this.createParticles();
  }

  createParticles() {
    const particleCount = 12; // More particles for a better pile
    
    for (let i = 0; i < particleCount; i++) {
      // Create particles with random positions around the player
      const offsetX = (Math.random() - 0.5) * 30; // Smaller horizontal spread
      const offsetY = (Math.random() - 0.5) * 15; // Smaller vertical spread
      
      const particle = {
        x: this.x + offsetX,
        y: this.y + offsetY,
        vx: (Math.random() - 0.5) * 0.5, // Very small horizontal velocity
        vy: Math.random() * 2 + 1, // Downward velocity (positive Y)
        size: Math.random() * 3 + 2, // Size range
        rotation: Math.random() * Math.PI * 2, // Random rotation
        rotationSpeed: (Math.random() - 0.5) * 0.1, // Slow rotation
        life: 1.0, // Life starts at 1.0 and decreases
        decayRate: Math.random() * 0.005 + 0.002, // Slower decay for longer visibility
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
          // Apply gravity (stronger for falling effect)
          particle.vy += 0.2; // Stronger gravity
          
          // Update position
          particle.x += particle.vx;
          particle.y += particle.vy;
          
          // Check if particle hits ground
          if (particle.y >= GAME_CONSTANTS.CANVAS.GROUND_Y) {
            particle.y = GAME_CONSTANTS.CANVAS.GROUND_Y;
            particle.vy = 0;
            particle.vx *= 0.3; // Slow down more on ground
            particle.onGround = true;
          }
        } else {
          // On ground - slow down horizontal movement
          particle.vx *= 0.9;
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


