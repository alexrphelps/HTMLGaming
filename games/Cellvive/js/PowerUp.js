/**
 * PowerUp Class - Temporary abilities that spawn in the world
 * Adds strategic depth and temporary advantages
 */
class PowerUp {
    constructor(options = {}) {
        // Basic properties
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 12;
        
        // Power-up type and effects
        this.type = options.type || this.getRandomType();
        this.duration = options.duration || this.getDurationForType(this.type);
        this.value = options.value || this.getValueForType(this.type);
        
        // Visual properties
        this.color = this.getColorForType(this.type);
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.08;
        this.rotation = 0;
        this.rotationSpeed = 0.02;
        
        // Collection properties
        this.isCollected = false;
        this.collectionTime = 0;
        this.spawnTime = Date.now();
        this.lifetime = 30000; // 30 seconds before disappearing
        
        // Glow effect
        this.glowIntensity = 0;
        this.glowDirection = 1;
        
        // console.log(`⚡ PowerUp created: ${this.type} at (${this.x}, ${this.y})`); // Disabled to reduce spam
    }
    
    /**
     * Get random power-up type - simplified to basic energy/size cells
     */
    getRandomType() {
        const types = ['energy', 'size_boost', 'health']; // Removed temporary power-ups
        return types[Math.floor(Math.random() * types.length)];
    }
    
    /**
     * Get duration for power-up type - simplified for basic cells
     */
    getDurationForType(type) {
        const durations = {
            energy: 1,        // Instant - permanent energy boost
            size_boost: 1,    // Instant - permanent size increase
            health: 1         // Instant - permanent health boost
        };
        return durations[type] || 1;
    }
    
    /**
     * Get value for power-up type - simplified for basic cells
     */
    getValueForType(type) {
        const values = {
            energy: 30,       // 30 energy points (permanent)
            size_boost: 5,    // 5 radius increase (permanent)
            health: 50        // 50 health points (permanent)
        };
        return values[type] || 1;
    }
    
    /**
     * Get color for power-up type - simplified for basic cells
     */
    getColorForType(type) {
        // Basic cell-like colors for energy/size/health
        const colors = {
            energy: '#FFD700',     // Golden yellow (energy cells)
            size_boost: '#32CD32', // Lime green (growth cells)
            health: '#FF69B4'      // Hot pink (health cells)
        };
        return colors[type] || '#FFD700';
    }
    
    /**
     * Check if a cell can collect this power-up
     */
    canBeCollectedBy(cell) {
        if (this.isCollected) return false;
        
        const distance = Math.hypot(cell.x - this.x, cell.y - this.y);
        return distance <= (cell.radius + this.radius);
    }
    
    /**
     * Apply power-up effects to a cell - simplified for basic cells
     */
    applyTo(cell) {
        this.isCollected = true;
        this.collectionTime = Date.now();
        
        // Log power-up collection
        GameLogger.debug(`💎 Collected ${this.type}, value: ${this.value}`);
        
        switch (this.type) {
            case 'energy':
                // Permanent energy boost - increase max health
                cell.maxHealth += this.value;
                cell.health = Math.min(cell.maxHealth, cell.health + this.value);
                GameLogger.debug(`💎 Energy: maxHealth ${cell.maxHealth - this.value} → ${cell.maxHealth}`);
                break;
                
            case 'size_boost':
                // Permanent size increase
                const oldRadius = cell.radius;
                cell.radius += this.value;
                GameLogger.debug(`💎 Size: ${oldRadius.toFixed(1)} → ${cell.radius.toFixed(1)} (+${this.value})`);
                // Update speed based on new size (larger cells move slower)
                cell.speed = Math.max(0.5, 2 - (cell.radius / 100));
                cell.maxSpeed = cell.speed;
                break;
                
            case 'health':
                // Permanent health boost
                const oldHealth = cell.health;
                cell.health = Math.min(cell.maxHealth, cell.health + this.value);
                GameLogger.debug(`💎 Health: ${oldHealth.toFixed(0)} → ${cell.health.toFixed(0)}`);
                break;
        }
        
        // Create collection particles
        if (window.game && window.game.particleSystem) {
            window.game.particleSystem.createPowerUpParticles(this.x, this.y, this.type);
        }
    }
    
    /**
     * Update power-up animation
     */
    update() {
        if (this.isCollected) return;
        
        // Update pulse animation
        this.pulsePhase += this.pulseSpeed;
        if (this.pulsePhase > Math.PI * 2) {
            this.pulsePhase -= Math.PI * 2;
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed;
        if (this.rotation > Math.PI * 2) {
            this.rotation -= Math.PI * 2;
        }
        
        // Update glow effect
        this.glowIntensity += this.glowDirection * 0.02;
        if (this.glowIntensity >= 1) {
            this.glowIntensity = 1;
            this.glowDirection = -1;
        } else if (this.glowIntensity <= 0) {
            this.glowIntensity = 0;
            this.glowDirection = 1;
        }
    }
    
    /**
     * Check if power-up should be removed
     */
    shouldRemove() {
        if (this.isCollected) return true;
        
        // Remove if lifetime expired
        return (Date.now() - this.spawnTime) > this.lifetime;
    }
    
    /**
     * Get render properties
     */
    getRenderProps() {
        return {
            type: this.type,
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: this.color,
            pulsePhase: this.pulsePhase,
            rotation: this.rotation,
            glowIntensity: this.glowIntensity,
            isCollected: this.isCollected
        };
    }
}

/**
 * PowerUp Manager - Handles spawning and managing power-ups
 */
class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.config = {
            maxPowerUps: 8,
            spawnRate: 0.001, // Very low spawn rate
            minSpawnDistance: 200, // Minimum distance from player
            maxSpawnDistance: 800  // Maximum distance from player
        };
    }
    
    /**
     * Update all power-ups
     */
    update() {
        // Update existing power-ups
        this.powerUps.forEach(powerUp => powerUp.update());
        
        // Remove collected or expired power-ups
        this.powerUps = this.powerUps.filter(powerUp => !powerUp.shouldRemove());
        
        // Spawn new power-ups
        this.spawnPowerUps();
        
        // Check for collections
        this.checkCollections();
    }
    
    /**
     * Spawn new power-ups
     */
    spawnPowerUps() {
        if (this.powerUps.length >= this.config.maxPowerUps) return;
        if (!this.game.player) return;
        
        if (Math.random() < this.config.spawnRate) {
            // Generate spawn position away from player
            const angle = Math.random() * Math.PI * 2;
            const distance = this.config.minSpawnDistance + 
                           Math.random() * (this.config.maxSpawnDistance - this.config.minSpawnDistance);
            
            const x = this.game.player.x + Math.cos(angle) * distance;
            const y = this.game.player.y + Math.sin(angle) * distance;
            
            // Keep within world bounds
            const boundedX = Math.max(50, Math.min(this.game.config.worldWidth - 50, x));
            const boundedY = Math.max(50, Math.min(this.game.config.worldHeight - 50, y));
            
            // Check if position is clear
            const isClear = this.isPositionClear(boundedX, boundedY);
            
            if (isClear) {
                const powerUp = new PowerUp({
                    x: boundedX,
                    y: boundedY
                });
                this.powerUps.push(powerUp);
                // Log first 3 power-up spawns for verification
                if (this.powerUps.length <= 3) {
                    GameLogger.debug(`🌟 Power-up #${this.powerUps.length}: ${powerUp.type} at (${boundedX.toFixed(0)}, ${boundedY.toFixed(0)})`);
                }
            }
        }
    }
    
    /**
     * Check if position is clear of obstacles
     */
    isPositionClear(x, y) {
        // Check distance from player
        const playerDistance = Math.hypot(x - this.game.player.x, y - this.game.player.y);
        if (playerDistance < 100) return false;
        
        // Check distance from other power-ups
        for (const powerUp of this.powerUps) {
            const distance = Math.hypot(x - powerUp.x, y - powerUp.y);
            if (distance < 80) return false;
        }
        
        // Check distance from obstacles
        if (this.game.environmentManager) {
            for (const obstacle of this.game.environmentManager.obstacles) {
                const distance = Math.hypot(x - obstacle.x, y - obstacle.y);
                if (distance < obstacle.width + 50) return false;
            }
        }
        
        return true;
    }
    
    /**
     * Check for power-up collections
     */
    checkCollections() {
        // Check player collection
        if (this.game.player) {
            for (const powerUp of this.powerUps) {
                if (powerUp.canBeCollectedBy(this.game.player)) {
                    // Log when player touches power-up
                    GameLogger.debug(`💎 Player touched ${powerUp.type} at (${powerUp.x.toFixed(0)}, ${powerUp.y.toFixed(0)})`);
                    powerUp.applyTo(this.game.player);
                }
            }
        }
        
        // Check AI cell collections (rare)
        for (const cell of this.game.cells) {
            if (Math.random() < 0.001) { // Very rare for AI to collect power-ups
                for (const powerUp of this.powerUps) {
                    if (powerUp.canBeCollectedBy(cell)) {
                        powerUp.applyTo(cell);
                        break; // One power-up per cell per check
                    }
                }
            }
        }
    }
    
    /**
     * Get all power-ups for rendering
     */
    getRenderPowerUps() {
        return this.powerUps.filter(powerUp => !powerUp.isCollected);
    }
    
    /**
     * Clear all power-ups
     */
    clear() {
        this.powerUps = [];
    }
}

// Export for use in other modules
window.PowerUp = PowerUp;
window.PowerUpManager = PowerUpManager;