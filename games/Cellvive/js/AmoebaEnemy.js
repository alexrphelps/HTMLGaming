/**
 * Amoeba Enemy Class - Engulfing, blob-like enemies with unpredictable movement
 * Features: slow but unpredictable movement, can engulf larger cells, soft translucent appearance
 */
class AmoebaEnemy extends Enemy {
    constructor(options = {}) {
        // Set amoeba-specific defaults
        const amoebaOptions = {
            enemyType: 'amoeba',
            speed: 0.3 + Math.random() * 0.4, // Slower than regular cells
            dangerLevel: 2,
            huntRange: 150,
            aggression: 0.7,
            color: `rgba(${Math.floor(Math.random() * 100 + 100)}, ${Math.floor(Math.random() * 100 + 150)}, ${Math.floor(Math.random() * 100 + 200)}, 0.7)`, // Soft, translucent colors
            strokeColor: '#4a90e2',
            strokeWidth: 1,
            ...options
        };
        
        super(amoebaOptions);
        
        // Amoeba-specific properties
        this.engulfRadius = this.radius * 1.5; // Can engulf cells up to 1.5x its radius
        this.unpredictability = 0.8; // High unpredictability
        this.directionChangeTimer = 0;
        this.directionChangeInterval = 60 + Math.random() * 120; // Random direction changes
        
        // Enhanced wobble for amoeba-like movement
        this.wobbleSpeed = 0.03 + Math.random() * 0.04; // Slower, more pronounced wobble
        this.wobbleIntensity = 1.2 + Math.random() * 0.6; // More intense wobble
        
        // Soft, flowing visual properties
        this.flowPhase = Math.random() * Math.PI * 2;
        this.flowSpeed = 0.02;
        
        console.log(`🦠 Amoeba enemy created with engulf radius: ${this.engulfRadius}`);
    }
    
    /**
     * Override canEat to allow engulfing larger cells
     */
    canEat(other) {
        // Amoebas can engulf cells up to 1.5x their radius
        return other.radius <= this.engulfRadius && other.radius < this.radius * 0.9;
    }
    
    /**
     * Update method - calls parent update for movement and survival
     */
    update(deltaTime, nearbyCells) {
        // Call parent update for basic movement and survival mechanics
        super.update(deltaTime, nearbyCells);
        
        // Update AI behavior if we have nearby cells to analyze
        if (nearbyCells && nearbyCells.length > 0) {
            this.updateAI(nearbyCells);
        }
        
        // Update amoeba-specific properties
        this.engulfRadius = this.radius * 1.5; // Update engulf radius as amoeba grows
    }
    
    /**
     * Enhanced AI with unpredictable movement
     */
    updateAI(nearbyCells) {
        // Update direction change timer
        this.directionChangeTimer++;
        
        // Random direction changes for unpredictability
        if (this.directionChangeTimer >= this.directionChangeInterval) {
            this.directionChangeTimer = 0;
            this.directionChangeInterval = 60 + Math.random() * 120;
            this.aiState = 'wander'; // Force wandering to create unpredictability
        }
        
        // Find engulfable prey
        const engulfablePrey = nearbyCells.filter(cell => {
            if (cell === this) return false;
            const distance = this.distanceTo(cell);
            return distance < this.huntRange && this.canEat(cell);
        }).sort((a, b) => this.distanceTo(a) - this.distanceTo(b));
        
        // Hunt engulfable prey
        if (engulfablePrey.length > 0 && this.health < this.hungerThreshold) {
            this.aiState = 'hunt';
            this.currentTarget = engulfablePrey[0];
            return;
        }
        
        // Check for threats (larger cells)
        const threats = nearbyCells.filter(cell => {
            if (cell === this) return false;
            const distance = this.distanceTo(cell);
            return distance < 100 && cell.radius > this.radius * 1.2;
        });
        
        if (threats.length > 0) {
            this.aiState = 'flee';
            this.currentTarget = threats[0];
            return;
        }
        
        // Default to unpredictable wandering
        this.aiState = 'wander';
        this.currentTarget = null;
    }
    
    /**
     * Enhanced wandering with unpredictable movement
     */
    wanderBehavior() {
        // Pick a new random target more frequently for unpredictability
        if (Math.random() < 0.03) { // 3% chance per frame
            const angle = Math.random() * Math.PI * 2;
            const distance = 80 + Math.random() * 120;
            
            this.targetX = this.x + Math.cos(angle) * distance;
            this.targetY = this.y + Math.sin(angle) * distance;
        }
        
        this.moveTowardsTarget();
        
        // Add random velocity changes for unpredictable movement
        if (Math.random() < 0.02) { // 2% chance per frame
            this.velocityX += (Math.random() - 0.5) * 0.2;
            this.velocityY += (Math.random() - 0.5) * 0.2;
        }
    }
    
    /**
     * Enhanced hunting behavior - slow but persistent
     * FIXED: Optimized distance calculations
     */
    huntBehavior() {
        if (this.currentTarget) {
            const dx = this.currentTarget.x - this.x;
            const dy = this.currentTarget.y - this.y;
            const distanceSquared = dx * dx + dy * dy;
            
            // FIXED: Use squared distance for comparison to avoid sqrt
            if (distanceSquared > 25) { // 5 * 5 = 25
                const distance = Math.sqrt(distanceSquared);
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Slow but persistent movement
                this.velocityX = normalizedX * this.maxSpeed * 0.8;
                this.velocityY = normalizedY * this.maxSpeed * 0.8;
            }
        } else {
            this.wanderBehavior();
        }
    }
    
    /**
     * Enhanced fleeing behavior
     */
    fleeBehavior() {
        if (this.currentTarget) {
            const dx = this.x - this.currentTarget.x;
            const dy = this.y - this.currentTarget.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const normalizedX = dx / distance;
                const normalizedY = dy / distance;
                
                // Slow fleeing - amoebas aren't fast
                this.velocityX = normalizedX * this.maxSpeed * 1.1;
                this.velocityY = normalizedY * this.maxSpeed * 1.1;
            }
        } else {
            this.wanderBehavior();
        }
    }
    
    /**
     * Enhanced visual effects for amoeba
     */
    updateEnemyEffects() {
        super.updateEnemyEffects();
        
        // Update flow phase for soft, flowing appearance
        this.flowPhase += this.flowSpeed;
        if (this.flowPhase > Math.PI * 2) {
            this.flowPhase -= Math.PI * 2;
        }
    }
    
    /**
     * Enhanced eating behavior - engulfing
     */
    onEnemyEat(other) {
        super.onEnemyEat(other);
        
        // Amoebas grow more when engulfing
        const growthAmount = other.radius * 0.4; // 40% of eaten cell's radius
        this.radius = Math.min(150, this.radius + growthAmount);
        this.engulfRadius = this.radius * 1.5; // Update engulf radius
        
        // Restore more health
        this.health = Math.min(this.maxHealth, this.health + 30);
        
        console.log(`🦠 Amoeba engulfed cell, new radius: ${this.radius}`);
    }
    
    /**
     * Get enhanced render properties for amoeba
     */
    getRenderProps() {
        const baseProps = super.getRenderProps();
        
        // Add amoeba-specific visual properties
        baseProps.amoebaFlow = this.flowPhase;
        baseProps.engulfRadius = this.engulfRadius;
        baseProps.translucency = 0.7; // Semi-transparent
        baseProps.softness = 1.0; // Soft, flowing appearance
        
        return baseProps;
    }
    
    /**
     * Amoebas don't cluster
     */
    shouldClusterWith(otherEnemy) {
        return false;
    }
}

// Export for use in other modules
window.AmoebaEnemy = AmoebaEnemy;
