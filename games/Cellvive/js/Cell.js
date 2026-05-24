/**
 * Cell Class - AI-controlled cells in the game world
 */
class Cell {
    constructor(options = {}) {
        // Position and size
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 10;
        
        // Visual properties
        this.color = options.color || '#ff6b6b';
        this.strokeColor = options.strokeColor || 'transparent'; // No border for food cells
        this.strokeWidth = 0; // No border width
        
        // Movement properties - simplified for spore-like behavior
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = options.speed || 0.3; // Much slower, more spore-like
        this.maxSpeed = this.speed;
        
        // AI behavior - simplified for spore-like behavior
        this.targetX = this.x;
        this.targetY = this.y;
        this.aiState = 'drift'; // Simple drifting behavior
        this.aiTimer = 0;
        this.aiUpdateInterval = 120; // Much less frequent updates (2 seconds at 60fps)
        this.currentTarget = null; // No hunting behavior for spores
        this.lastStateChange = 0;
        
        // Survival mechanics
        this.health = 100;
        this.maxHealth = 100;
        this.healthDecay = 0.005; // Health decreases over time
        this.hungerThreshold = 30; // When to start actively hunting
        this.dangerThreshold = 1.2; // How much larger a cell needs to be to flee
        
        // Visual effects
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.05 + Math.random() * 0.05;
        
        // Fixed shape seed - never changes
        this.shapeSeed = Math.floor(Math.random() * 10000);
        
        // Wobble effect for fluidity
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.03; // Slow, gentle wobble
        this.wobbleIntensity = 0.8 + Math.random() * 0.4; // Subtle wobble strength
        
        // Cell type
        this.type = this.determineType();
        
        // Spore properties - IMPORTANT: Must be stored to identify food spores
        this.isSpore = options.isSpore || false;
        this.sporeType = options.sporeType || null;
        this.sporeData = options.sporeData || null;
        
        // Debug: Log spore creation
        if (this.isSpore && typeof GameLogger !== 'undefined') {
            GameLogger.debug(`🌟 Spore cell created: type=${this.sporeType}, radius=${this.radius.toFixed(1)}, isSpore=${this.isSpore}`);
        }
    }
    
    /**
     * Determine cell type based on size
     */
    determineType() {
        if (this.radius < 8) return 'small';
        if (this.radius < 15) return 'medium';
        if (this.radius < 25) return 'large';
        return 'giant';
    }
    
    /**
     * Update cell logic
     */
    update(deltaTime, nearbyCells) {
        // Update survival mechanics
        this.updateSurvival();
        
        // Update AI behavior with nearby cells information
        if (nearbyCells && nearbyCells.length > 0) {
            this.updateAI(nearbyCells);
        }
        
        // Apply movement
        this.updateMovement();
        
        // Update visual effects
        this.updateVisualEffects();
        
        // Update size based on health
        this.updateSize();
    }
    
    /**
     * Update survival mechanics
     */
    updateSurvival() {
        // Decrease health over time (hunger)
        this.health = Math.max(0, this.health - this.healthDecay);
        
        // Update max speed based on health (slower when starving)
        const healthFactor = Math.max(0.3, this.health / this.maxHealth);
        this.maxSpeed = this.speed * healthFactor;
    }
    
    /**
     * Update AI behavior - simplified for spore-like behavior
     */
    updateAI(nearbyCells = []) {
        this.aiTimer++;
        
        // Update AI state much less frequently for spores
        if (this.aiTimer >= this.aiUpdateInterval) {
            this.aiTimer = 0;
            this.updateAIState(nearbyCells);
        }
        
        // Execute current AI behavior - only drifting for spores
        switch (this.aiState) {
            case 'drift':
                this.driftBehavior();
                break;
            case 'wander':
                this.wanderBehavior();
                break;
            default:
                this.driftBehavior();
        }
    }
    
    /**
     * Update AI state - simplified for spore-like behavior
     */
    updateAIState(nearbyCells) {
        // Spores don't hunt or flee - they just drift around
        // Occasionally change from drift to wander for variety
        if (Math.random() < 0.1) { // 10% chance to change behavior
            this.aiState = Math.random() < 0.5 ? 'drift' : 'wander';
        }
        this.currentTarget = null; // No targets for spores
    }
    
    /**
     * Find threats (larger cells nearby)
     */
    findThreats(cells) {
        return cells.filter(cell => {
            if (cell === this) return false;
            const distance = this.distanceTo(cell);
            return distance < 200 && cell.radius > this.radius * this.dangerThreshold;
        }).sort((a, b) => this.distanceTo(a) - this.distanceTo(b));
    }
    
    /**
     * Find prey (smaller cells nearby)
     */
    findPrey(cells) {
        return cells.filter(cell => {
            if (cell === this) return false;
            const distance = this.distanceTo(cell);
            return distance < 150 && this.canEat(cell);
        }).sort((a, b) => this.distanceTo(a) - this.distanceTo(b));
    }
    
    /**
     * Drift behavior - very slow, gentle movement like spores
     */
    driftBehavior() {
        // Very slow, gentle movement
        if (Math.random() < 0.005) { // Much less frequent direction changes
            const angle = Math.random() * Math.PI * 2;
            const distance = 20 + Math.random() * 40; // Shorter distances
            
            this.targetX = this.x + Math.cos(angle) * distance;
            this.targetY = this.y + Math.sin(angle) * distance;
        }
        
        this.moveTowardsTarget();
    }
    
    /**
     * Wander behavior - slightly more active than drift
     */
    wanderBehavior() {
        // Pick a new random target occasionally
        if (Math.random() < 0.01) { // Less frequent than before
            const angle = Math.random() * Math.PI * 2;
            const distance = 30 + Math.random() * 60; // Shorter distances
            
            this.targetX = this.x + Math.cos(angle) * distance;
            this.targetY = this.y + Math.sin(angle) * distance;
        }
        
        this.moveTowardsTarget();
    }
    
    /**
     * Hunt behavior - move towards smaller cells
     */
    huntBehavior() {
        if (this.currentTarget) {
            // Move towards target
            const dx = this.currentTarget.x - this.x;
            const dy = this.currentTarget.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Move faster when hunting
                this.velocityX = normalizedX * this.maxSpeed * 1.2;
                this.velocityY = normalizedY * this.maxSpeed * 1.2;
            }
        } else {
            // No target, fall back to wandering
            this.wanderBehavior();
        }
    }
    
    /**
     * Flee behavior - move away from larger cells
     */
    fleeBehavior() {
        if (this.currentTarget) {
            // Move away from threat
            const dx = this.x - this.currentTarget.x;
            const dy = this.y - this.currentTarget.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Move faster when fleeing
                this.velocityX = normalizedX * this.maxSpeed * 1.3;
                this.velocityY = normalizedY * this.maxSpeed * 1.3;
            }
        } else {
            // No threat, fall back to wandering
            this.wanderBehavior();
        }
    }
    
    /**
     * Move towards current target - simplified for spore-like behavior
     * FIXED: Enhanced safety checks for division by zero and NaN values
     */
    moveTowardsTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // FIXED: Enhanced safety checks for NaN and invalid values
        if (!isFinite(distance) || !isFinite(dx) || !isFinite(dy)) {
            console.warn('Invalid movement calculation detected, resetting velocities');
            this.velocityX = 0;
            this.velocityY = 0;
            return;
        }
        
        // Safety check: prevent division by zero
        if (distance > 0.001) { // Use small epsilon instead of exact zero
            if (distance > 3) { // Smaller threshold for spores
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // FIXED: Validate normalized values before use
                if (isFinite(normalizedX) && isFinite(normalizedY)) {
                    // Much slower movement for spores
                    this.velocityX = normalizedX * this.maxSpeed * 0.5; // Half speed
                    this.velocityY = normalizedY * this.maxSpeed * 0.5;
                } else {
                    // Fallback: stop movement if normalization failed
                    this.velocityX *= 0.8;
                    this.velocityY *= 0.8;
                }
            } else {
                // Reached target, slow down more gradually
                this.velocityX *= 0.8;
                this.velocityY *= 0.8;
            }
        } else {
            // At target, stop moving
            this.velocityX *= 0.8;
            this.velocityY *= 0.8;
        }
        
        // FIXED: Final safety check to prevent NaN velocities
        if (!isFinite(this.velocityX)) this.velocityX = 0;
        if (!isFinite(this.velocityY)) this.velocityY = 0;
    }
    
    /**
     * Update movement physics - simplified for spore-like behavior
     */
    updateMovement() {
        // Apply velocity to position
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Apply more friction for spore-like behavior (slower, more floaty)
        this.velocityX *= 0.95; // More friction than before
        this.velocityY *= 0.95;
    }
    
    /**
     * Update visual effects
     */
    updateVisualEffects() {
        // Update wobble phase for fluid movement
        this.wobblePhase += this.wobbleSpeed;
        if (this.wobblePhase > Math.PI * 2) {
            this.wobblePhase -= Math.PI * 2;
        }
    }
    
    /**
     * Set target position (for AI)
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * Get current speed
     */
    getSpeed() {
        return Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    }
    
    /**
     * Get direction of movement
     */
    getDirection() {
        if (this.getSpeed() === 0) return 0;
        return Math.atan2(this.velocityY, this.velocityX);
    }
    
    /**
     * Check if cell is moving
     */
    isMoving() {
        return this.getSpeed() > 0.1;
    }
    
    /**
     * Get visual radius (no pulse effect)
     */
    getVisualRadius() {
        return this.radius; // Completely static radius
    }
    
    /**
     * Get render properties for the renderer
     */
    getRenderProps() {
        // Modify color based on health status
        let displayColor = this.color;
        if (this.health < 30) {
            // Starving cells appear darker
            displayColor = this.darkenColor(this.color, 0.4);
        } else if (this.health > 80) {
            // Well-fed cells appear brighter
            displayColor = this.lightenColor(this.color, 0.2);
        }
        
        return {
            x: this.x,
            y: this.y,
            radius: this.getVisualRadius(),
            color: displayColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            type: this.type,
            isMoving: this.isMoving(),
            direction: this.getDirection(),
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            health: this.health,
            maxHealth: this.maxHealth,
            aiState: this.aiState,
            isBlob: false, // Food cells are simple circles
            shapeSeed: this.shapeSeed, // Fixed seed for consistent shape
            wobblePhase: this.wobblePhase,
            wobbleIntensity: this.wobbleIntensity
        };
    }
    
    /**
     * Lighten a color
     */
    lightenColor(color, amount) {
        // Simple color lightening - could be enhanced
        return color;
    }
    
    /**
     * Darken a color
     */
    darkenColor(color, amount) {
        // Simple color darkening - could be enhanced
        return color;
    }
    
    /**
     * Create a copy of this cell (for splitting or reproduction)
     */
    clone() {
        return new Cell({
            x: this.x + (Math.random() - 0.5) * 20,
            y: this.y + (Math.random() - 0.5) * 20,
            radius: this.radius * 0.8,
            color: this.color,
            speed: this.speed
        });
    }
    
    /**
     * Get distance to another object
     */
    distanceTo(other) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check if this cell can eat another cell
     */
    canEat(other) {
        return this.radius > other.radius * 1.1; // Need to be 10% larger
    }
    
    /**
     * Update size based on health
     */
    updateSize() {
        // Cells shrink when they're starving
        if (this.health < 50) {
            const shrinkAmount = (50 - this.health) * 0.01;
            this.radius = Math.max(5, this.radius - shrinkAmount);
        }
        
        // Update type based on current radius
        this.type = this.determineType();
    }
    
    /**
     * Eat another cell and grow
     */
    eat(other) {
        // console.log(`🔬 Cell ate another cell: ${other.type}`); // Disabled to reduce spam
        
        // Grow based on eaten cell size
        const growthAmount = other.radius * 0.3;
        this.radius = Math.min(1000, this.radius + growthAmount); // Increased max size to 1000
        
        // Restore health
        this.health = Math.min(this.maxHealth, this.health + 20);
        
        // Update type if necessary
        this.type = this.determineType();
        
        // Update speed (larger cells move slower)
        this.speed = Math.max(0.5, 2 - (this.radius / 100));
        this.maxSpeed = this.speed;
        
        // Clear current target since we just ate
        this.currentTarget = null;
    }
}

// Export for use in other modules
window.Cell = Cell;
