/**
 * Particle System for visual effects
 * Handles eating particles, death effects, environmental particles
 */
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 200;
        this.particlePool = []; // Object pool for reusing particles
        this.maxPoolSize = 100;
        
        // Pre-create particle objects for pooling
        this.initializeParticlePool();
    }
    
    /**
     * Initialize particle pool for object reuse
     */
    initializeParticlePool() {
        for (let i = 0; i < this.maxPoolSize; i++) {
            this.particlePool.push(this.createParticleObject());
        }
    }
    
    /**
     * Create a reusable particle object
     */
    createParticleObject() {
        return {
            x: 0,
            y: 0,
            velocityX: 0,
            velocityY: 0,
            life: 0,
            maxLife: 0,
            size: 0,
            color: '#ffffff',
            type: 'default',
            alpha: 1.0,
            targetX: null,
            targetY: null,
            originalSize: 0,
            originalX: 0,
            originalY: 0
        };
    }
    
    /**
     * Get a particle from the pool or create a new one
     */
    getParticle() {
        if (this.particlePool.length > 0) {
            return this.particlePool.pop();
        }
        return this.createParticleObject();
    }
    
    /**
     * Return a particle to the pool for reuse
     */
    returnParticle(particle) {
        if (this.particlePool.length < this.maxPoolSize) {
            // Reset particle properties
            particle.x = 0;
            particle.y = 0;
            particle.velocityX = 0;
            particle.velocityY = 0;
            particle.life = 0;
            particle.maxLife = 0;
            particle.size = 0;
            particle.color = '#ffffff';
            particle.type = 'default';
            particle.alpha = 1.0;
            particle.targetX = null;
            particle.targetY = null;
            particle.originalSize = 0;
            particle.originalX = 0;
            particle.originalY = 0;
            
            this.particlePool.push(particle);
        }
    }
    
    /**
     * Create eating particles when a cell consumes another
     * Optimized with object pooling
     */
    createEatingParticles(eaterX, eaterY, eatenRadius, eaterColor) {
        const particleCount = Math.min(15, Math.floor(eatenRadius * 2));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticle();
            const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
            const speed = 2 + Math.random() * 4;
            const life = 30 + Math.random() * 20;
            
            // Configure particle properties
            particle.x = eaterX + (Math.random() - 0.5) * eatenRadius * 0.5;
            particle.y = eaterY + (Math.random() - 0.5) * eatenRadius * 0.5;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.life = life;
            particle.maxLife = life;
            particle.size = 2 + Math.random() * 3;
            particle.color = eaterColor;
            particle.type = 'eating';
            particle.alpha = 1.0;
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create cell consumption animation - eaten cell moves towards center and fades
     * FIXED: Now uses object pooling to reduce memory allocation
     */
    createCellConsumptionAnimation(eaterX, eaterY, eaterRadius, eatenX, eatenY, eatenRadius, eatenColor) {
        const particleCount = Math.max(8, Math.floor(eatenRadius * 1.5));
        const animationDuration = 45; // frames for the animation
        
        for (let i = 0; i < particleCount; i++) {
            // Start from the eaten cell's position
            const startAngle = (i / particleCount) * Math.PI * 2;
            const startRadius = eatenRadius * (0.3 + Math.random() * 0.4);
            
            const startX = eatenX + Math.cos(startAngle) * startRadius;
            const startY = eatenY + Math.sin(startAngle) * startRadius;
            
            // Calculate direction towards the eater's center
            const dx = eaterX - startX;
            const dy = eaterY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Safety check for division by zero
            if (distance < 0.001) continue;
            
            // Speed towards center (slower for smoother animation)
            const speed = distance / animationDuration;
            
            // FIXED: Use object pool instead of creating new objects
            const particle = this.getParticle();
            const particleSize = eatenRadius * (0.8 + Math.random() * 0.4);
            
            // Configure particle properties
            particle.x = startX;
            particle.y = startY;
            particle.velocityX = (dx / distance) * speed;
            particle.velocityY = (dy / distance) * speed;
            particle.life = animationDuration;
            particle.maxLife = animationDuration;
            particle.size = particleSize;
            particle.color = eatenColor;
            particle.type = 'consumption';
            particle.alpha = 1.0;
            particle.targetX = eaterX;
            particle.targetY = eaterY;
            particle.originalSize = particleSize;
            particle.originalX = startX;
            particle.originalY = startY;
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create death particles when a cell dies
     * FIXED: Now uses object pooling to reduce memory allocation
     */
    createDeathParticles(x, y, radius, color) {
        const particleCount = Math.min(25, Math.floor(radius * 3));
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 6;
            const life = 40 + Math.random() * 30;
            
            // FIXED: Use object pool instead of creating new objects
            const particle = this.getParticle();
            
            // Configure particle properties
            particle.x = x + (Math.random() - 0.5) * radius;
            particle.y = y + (Math.random() - 0.5) * radius;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.life = life;
            particle.maxLife = life;
            particle.size = 1 + Math.random() * 4;
            particle.color = color;
            particle.type = 'death';
            particle.alpha = 1.0;
            // Store gravity in a custom property (not in pool template)
            if (!particle.hasOwnProperty('gravity')) {
                Object.defineProperty(particle, 'gravity', { 
                    value: 0.05, 
                    writable: true, 
                    enumerable: true, 
                    configurable: true 
                });
            } else {
                particle.gravity = 0.05;
            }
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create environmental particles (hazards, biomes, etc.)
     * FIXED: Now uses object pooling to reduce memory allocation
     */
    createEnvironmentalParticles(x, y, type, color, intensity = 1) {
        const particleCount = Math.floor(intensity * 5);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2;
            const life = 60 + Math.random() * 40;
            
            // FIXED: Use object pool instead of creating new objects
            const particle = this.getParticle();
            
            // Configure particle properties
            particle.x = x + (Math.random() - 0.5) * 20;
            particle.y = y + (Math.random() - 0.5) * 20;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.life = life;
            particle.maxLife = life;
            particle.size = 1 + Math.random() * 2;
            particle.color = color;
            particle.type = type;
            particle.alpha = 0.6;
            // Store drift in a custom property
            if (!particle.hasOwnProperty('drift')) {
                Object.defineProperty(particle, 'drift', { 
                    value: Math.random() * 0.02, 
                    writable: true, 
                    enumerable: true, 
                    configurable: true 
                });
            } else {
                particle.drift = Math.random() * 0.02;
            }
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Create power-up collection particles
     * FIXED: Now uses object pooling to reduce memory allocation
     */
    createPowerUpParticles(x, y, powerUpType) {
        const colors = {
            speed: '#00ff00',
            health: '#ff0000',
            size: '#ffff00',
            invincible: '#ffffff'
        };
        
        const color = colors[powerUpType] || '#ffffff';
        
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 3 + Math.random() * 3;
            
            // FIXED: Use object pool instead of creating new objects
            const particle = this.getParticle();
            
            // Configure particle properties
            particle.x = x;
            particle.y = y;
            particle.velocityX = Math.cos(angle) * speed;
            particle.velocityY = Math.sin(angle) * speed;
            particle.life = 30;
            particle.maxLife = 30;
            particle.size = 3 + Math.random() * 2;
            particle.color = color;
            particle.type = 'powerup';
            particle.alpha = 1.0;
            
            this.particles.push(particle);
        }
    }
    
    /**
     * Update all particles
     * FIXED: Optimized particle removal using filter for better performance
     */
    update() {
        // FIXED: Use filter for more efficient particle management
        const deadParticles = [];
        
        // Update existing particles
        this.particles = this.particles.filter(particle => {
            // Update position
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            
            // Special handling for consumption particles
            if (particle.type === 'consumption') {
                // Calculate distance to target - FIXED: Optimized distance calculation
                const dx = particle.targetX - particle.x;
                const dy = particle.targetY - particle.y;
                const distanceSquared = dx * dx + dy * dy;
                const distanceToTarget = Math.sqrt(distanceSquared);
                
                // Slow down as we approach the target
                if (distanceToTarget < particle.originalSize) {
                    particle.velocityX *= 0.95;
                    particle.velocityY *= 0.95;
                }
                
                // Scale down the particle as it gets consumed
                const lifeProgress = 1 - (particle.life / particle.maxLife);
                particle.size = particle.originalSize * (1 - lifeProgress * 0.8); // Shrink to 20% of original size
                
                // Increase fade rate as it gets closer to center
                const fadeRate = 1 - (distanceToTarget / (particle.originalSize * 2));
                particle.alpha = (particle.life / particle.maxLife) * (1 - fadeRate * 0.3);
            }
            
            // Apply gravity for death particles
            if (particle.gravity) {
                particle.velocityY += particle.gravity;
            }
            
            // Apply drift for environmental particles
            if (particle.drift) {
                particle.velocityX += (Math.random() - 0.5) * particle.drift;
                particle.velocityY += (Math.random() - 0.5) * particle.drift;
            }
            
            // Update life
            particle.life--;
            
            // Update alpha based on life (for non-consumption particles)
            if (particle.type !== 'consumption') {
                particle.alpha = particle.life / particle.maxLife;
            }
            
            // Check if particle should be removed
            if (particle.life <= 0) {
                deadParticles.push(particle);
                return false; // Remove from array
            }
            
            return true; // Keep in array
        });
        
        // FIXED: Return dead particles to pool after filtering
        deadParticles.forEach(particle => this.returnParticle(particle));
        
        // Limit particle count for performance - return excess to pool
        if (this.particles.length > this.maxParticles) {
            const excessParticles = this.particles.splice(this.maxParticles);
            excessParticles.forEach(particle => this.returnParticle(particle));
        }
    }
    
    /**
     * Render all particles
     */
    render(ctx, camera) {
        ctx.save();
        
        for (const particle of this.particles) {
            const screenX = particle.x - camera.x;
            const screenY = particle.y - camera.y;
            
            // Skip particles outside viewport
            if (screenX < -50 || screenX > ctx.canvas.width + 50 ||
                screenY < -50 || screenY > ctx.canvas.height + 50) {
                continue;
            }
            
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            
            // Different rendering for different particle types
            switch (particle.type) {
                case 'eating':
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                    
                case 'death':
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    // Add sparkle effect
                    if (Math.random() < 0.3) {
                        ctx.fillStyle = '#ffffff';
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, particle.size * 0.5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                    
                case 'powerup':
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    // Add glow effect
                    ctx.shadowColor = particle.color;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                    break;
                    
                case 'consumption':
                    // Render as a cell-like blob that shrinks and fades
                    const gradient = ctx.createRadialGradient(
                        screenX, screenY, 0,
                        screenX, screenY, particle.size
                    );
                    gradient.addColorStop(0, particle.color);
                    gradient.addColorStop(0.7, particle.color);
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Add subtle border
                    ctx.strokeStyle = particle.color;
                    ctx.lineWidth = 1;
                    ctx.globalAlpha = particle.alpha * 0.5;
                    ctx.stroke();
                    ctx.globalAlpha = particle.alpha;
                    break;
                    
                default: // environmental
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;
            }
        }
        
        ctx.restore();
    }
    
    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }
}

// Export for use in other modules
window.ParticleSystem = ParticleSystem;