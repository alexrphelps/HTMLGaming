/**
 * Base Enemy Class - Extends Cell with enemy-specific behaviors
 * This serves as the foundation for specialized enemy types
 */
class Enemy extends Cell {
    constructor(options = {}) {
        // Call parent constructor
        super(options);
        
        // Enemy-specific properties
        this.enemyType = options.enemyType || 'basic';
        this.aggression = options.aggression || 0.5;
        this.dangerLevel = options.dangerLevel || 1;
        this.uniqueId = Math.random().toString(36).substr(2, 9);
        
        // Enhanced AI for enemies
        this.huntRange = options.huntRange || 200;
        this.attackCooldown = 0;
        this.lastAttackTime = 0;
        
        // Visual enhancements for enemies
        this.threatGlow = 0;
        this.threatGlowSpeed = 0.05;
        
        console.log(`🔬 Enemy created: ${this.enemyType}, danger level: ${this.dangerLevel}`);
    }
    
    /**
     * Enhanced update method for enemies
     */
    update(deltaTime, nearbyCells) {
        // Update base cell behavior
        super.update(deltaTime, nearbyCells);
        
        // Update enemy-specific effects
        this.updateEnemyEffects();
        
        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
    }
    
    /**
     * Update enemy-specific visual effects
     */
    updateEnemyEffects() {
        // Update threat glow effect
        this.threatGlow += this.threatGlowSpeed;
        if (this.threatGlow > Math.PI * 2) {
            this.threatGlow -= Math.PI * 2;
        }
    }
    
    /**
     * Enhanced AI behavior for enemies
     */
    updateAI(nearbyCells) {
        // More aggressive hunting behavior
        const threats = this.findThreats(nearbyCells);
        const prey = this.findPrey(nearbyCells);
        
        // Prioritize fleeing from immediate threats
        if (threats.length > 0) {
            const immediateThreat = threats.find(t => this.distanceTo(t) < 50);
            if (immediateThreat) {
                this.aiState = 'flee';
                this.currentTarget = immediateThreat;
                return;
            }
        }
        
        // Enhanced hunting behavior
        if (prey.length > 0 && this.health < this.hungerThreshold * 1.5) {
            this.aiState = 'hunt';
            this.currentTarget = prey[0];
            return;
        }
        
        // Default to wandering with more unpredictability
        this.aiState = 'wander';
        this.currentTarget = null;
    }
    
    /**
     * Enhanced prey detection for enemies
     */
    findPrey(cells) {
        return cells.filter(cell => {
            if (cell === this) return false;
            const distance = this.distanceTo(cell);
            return distance < this.huntRange && this.canEat(cell);
        }).sort((a, b) => this.distanceTo(a) - this.distanceTo(b));
    }
    
    /**
     * Check if this enemy can attack/eat another cell
     * Override in subclasses for specific behaviors
     */
    canEat(other) {
        // Base enemy can eat cells up to 10% larger (more aggressive than regular cells)
        return this.radius > other.radius * 0.9;
    }
    
    /**
     * Enhanced eating behavior for enemies
     */
    eat(other) {
        console.log(`🔬 ${this.enemyType} enemy ate ${other.type || 'cell'}`);
        
        // Call parent eat method
        super.eat(other);
        
        // Enemy-specific effects
        this.onEnemyEat(other);
        
        // Set attack cooldown
        this.attackCooldown = 30; // 30 frames before can attack again
    }
    
    /**
     * Override in subclasses for specific eating behaviors
     */
    onEnemyEat(other) {
        // Base implementation - can be overridden
        this.health = Math.min(this.maxHealth, this.health + 25); // Enemies restore more health
    }
    
    /**
     * Get enhanced render properties for enemies
     */
    getRenderProps() {
        const baseProps = super.getRenderProps();
        
        // Add enemy-specific properties
        baseProps.enemyType = this.enemyType;
        baseProps.dangerLevel = this.dangerLevel;
        baseProps.threatGlow = this.threatGlow;
        baseProps.isEnemy = true;
        
        return baseProps;
    }
    
    /**
     * Get distance to another enemy (for clustering behaviors)
     */
    distanceToEnemy(otherEnemy) {
        return this.distanceTo(otherEnemy);
    }
    
    /**
     * Check if this enemy should cluster with others
     */
    shouldClusterWith(otherEnemy) {
        // Base implementation - can be overridden
        return false;
    }
}

// Export for use in other modules
window.Enemy = Enemy;
