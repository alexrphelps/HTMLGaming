/**
 * Player Class - The blob-like cell controlled by the player
 */
class Player {
    constructor(options = {}) {
        // Position and size
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 20;
        
        // Visual properties
        this.color = options.color || '#4a90e2';
        this.strokeColor = options.strokeColor || '#357abd';
        this.strokeWidth = 3;
        
        // Movement properties
        this.velocityX = 0;
        this.velocityY = 0;
        this.maxSpeed = options.maxSpeed || 3;
        this.acceleration = 0.3;
        this.friction = 0.85;
        
        // Growth properties
        this.baseRadius = this.radius;
        this.growthSpeed = 0.02;
        this.maxRadius = 1000; // Increased maximum size to 1000
        
        // Growth animation properties
        this.targetRadius = this.radius; // Target size to grow towards
        this.growthAnimationDuration = 30; // Frames for growth animation
        this.growthAnimationProgress = 0; // Current progress (0-1)
        this.isGrowing = false; // Whether currently animating growth
        this.growthStartRadius = this.radius; // Starting size when growth begins
        
        // Health system
        this.health = 100;
        this.maxHealth = 100;
        this.healthRegen = 0.01; // per frame
        
        // Visual effects
        this.pulsePhase = 0;
        this.pulseSpeed = 0.1;
        
        // Fixed shape seed - never changes
        this.shapeSeed = Math.floor(Math.random() * 10000);
        
        // Wobble effect for fluidity
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.wobbleSpeed = 0.02 + Math.random() * 0.03; // Slow, gentle wobble
        this.wobbleIntensity = 0.8 + Math.random() * 0.4; // Subtle wobble strength
        
        // Power-up properties
        this.powerUpSpeed = null;
        this.powerUpSpeedEnd = null;
        this.powerUpSize = null;
        this.powerUpSizeEnd = null;
        this.powerUpInvincible = false;
        this.powerUpInvincibleEnd = null;
        this.powerUpMagnet = null;
        this.powerUpMagnetEnd = null;
        
        // Talent system properties
        this.talentPoints = 0;
        this.talentLevels = {}; // Track talent levels: {talentId: level}
        
        // Speed Demon talent
        this.hasSpeedDemon = false;
        this.speedMultiplier = 1.0;
        
        // Magnetic Field talent
        this.hasMagneticField = false;
        this.sporeAttractionRadius = 0;
        this.sporeAttractionStrength = 0;
        
        // Regeneration talent
        this.hasRegeneration = false;
        this.regenRate = 0;
        this.combatThreshold = 300;
        this.lastRegenTime = 0;
        
        // Camouflage talent
        this.hasCamouflage = false;
        this.visibilityReduction = 0;
        this.stationaryTimeThreshold = 2000;
        this.stationaryStartTime = 0;
        this.isStationary = false;
        
        // Predator talent
        this.hasPredator = false;
        this.eatSizeModifier = 1.0;
        
        // Energy Efficiency talent
        this.hasEnergyEfficiency = false;
        this.growthMultiplier = 1.0;
        
        // Phase Shift talent
        this.hasPhaseShift = false;
        this.phaseShiftTriggerHealth = 0.25;
        this.phaseShiftDuration = 3000;
        this.phaseShiftCooldown = 30000;
        this.phaseShiftLastUsed = 0;
        this.isPhaseShifted = false;
        this.phaseShiftStartTime = 0;
        
        console.log('🔬 Player created');
    }
    
    /**
     * Update player logic
     */
    update(input, zoom = 1.0) {
        // Handle movement input
        this.handleMovement(input);
        
        // Apply physics with zoom adjustment
        this.applyPhysics(zoom);
        
        // Update visual effects
        this.updateVisualEffects();
        
        // Regenerate health
        this.regenerateHealth();
        
        // Update growth animation
        this.updateGrowthAnimation();
        
        // Update size based on growth
        this.updateSize();
        
        // Apply magnet effect if active
        this.applyMagnetEffect();
    }
    
    /**
     * Handle movement input
     * FIXED: Enhanced input validation and error recovery
     */
    handleMovement(input) {
        // FIXED: Enhanced null safety and input validation
        if (!input || typeof input !== 'object') {
            console.warn('Player.handleMovement: Invalid input provided, using defaults');
            input = { left: false, right: false, up: false, down: false };
        }
        
        // FIXED: Validate input is not frozen or sealed
        try {
            if (Object.isFrozen(input) || Object.isSealed(input)) {
                input = { ...input }; // Create a copy if input is immutable
            }
        } catch (error) {
            console.warn('Player.handleMovement: Error checking input mutability:', error);
            input = { left: false, right: false, up: false, down: false };
        }
        
        // Ensure all required properties exist with strict type checking
        const defaultInput = { left: false, right: false, up: false, down: false };
        const safeInput = {};
        
        // Validate each input property
        Object.keys(defaultInput).forEach(key => {
            safeInput[key] = Boolean(input[key]);
        });
        
        let targetVelocityX = 0;
        let targetVelocityY = 0;
        
        // Update max speed based on size and speed boosts
        this.updateMaxSpeed();
        
        // Calculate current max speed with power-up modifications and safety checks
        let currentMaxSpeed = Math.max(0.1, this.maxSpeed || 3); // Ensure positive, non-zero speed
        if (this.powerUpSpeed && typeof this.powerUpSpeed === 'number' && this.powerUpSpeed > 0) {
            currentMaxSpeed *= this.powerUpSpeed;
        }
        
        // Calculate target velocity based on validated input
        if (safeInput.left) targetVelocityX = -currentMaxSpeed;
        if (safeInput.right) targetVelocityX = currentMaxSpeed;
        if (safeInput.up) targetVelocityY = -currentMaxSpeed;
        if (safeInput.down) targetVelocityY = currentMaxSpeed;
        
        // Diagonal movement - normalize to prevent faster diagonal movement
        if (targetVelocityX !== 0 && targetVelocityY !== 0) {
            const diagonalFactor = CELLVIVE_CONSTANTS.PERFORMANCE?.DIAGONAL_MOVEMENT_FACTOR || 0.707;
            targetVelocityX *= diagonalFactor;
            targetVelocityY *= diagonalFactor;
        }
        
        // Apply acceleration towards target velocity with safety checks
        const acceleration = Math.max(0.01, this.acceleration || CELLVIVE_CONSTANTS.PERFORMANCE?.DEFAULT_ACCELERATION || 0.3);
        
        // Initialize velocities if they don't exist or are invalid
        if (typeof this.velocityX !== 'number' || isNaN(this.velocityX)) this.velocityX = 0;
        if (typeof this.velocityY !== 'number' || isNaN(this.velocityY)) this.velocityY = 0;
        
        this.velocityX += (targetVelocityX - this.velocityX) * acceleration;
        this.velocityY += (targetVelocityY - this.velocityY) * acceleration;
        
        // Clamp velocities to prevent extreme values
        const maxVelocity = currentMaxSpeed * 2; // Allow some overshoot
        this.velocityX = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocityX));
        this.velocityY = Math.max(-maxVelocity, Math.min(maxVelocity, this.velocityY));
    }
    
    /**
     * Apply physics (friction, movement)
     */
    applyPhysics(zoom = 1.0) {
        // Apply friction
        this.velocityX *= this.friction || CELLVIVE_CONSTANTS.PERFORMANCE.DEFAULT_FRICTION;
        this.velocityY *= this.friction || CELLVIVE_CONSTANTS.PERFORMANCE.DEFAULT_FRICTION;
        
        // Scale movement by zoom to maintain consistent feel
        const zoomSpeedMultiplier = 1.0 / zoom;
        
        // Update position
        this.x += this.velocityX * zoomSpeedMultiplier;
        this.y += this.velocityY * zoomSpeedMultiplier;
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
     * Regenerate health over time
     */
    regenerateHealth() {
        if (this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.healthRegen);
        }
    }
    
    /**
     * Update size based on growth
     */
    updateSize() {
        if (this.radius < this.baseRadius) {
            this.radius = Math.min(this.baseRadius, this.radius + this.growthSpeed);
        }
    }
    
    /**
     * Handle eating another cell
     */
    /**
     * Player eats another cell with validation
     * @param {Cell} cell - Cell to consume
     * @returns {boolean} Success status
     */
    eat(cell) {
        // ✅ Input validation
        if (!cell) {
            console.error('[Player] Cannot eat null cell');
            return false;
        }
        
        if (typeof cell.radius !== 'number' || cell.radius <= 0) {
            console.error('[Player] Invalid cell radius:', cell.radius);
            return false;
        }
        
        if (typeof cell.x !== 'number' || typeof cell.y !== 'number') {
            console.error('[Player] Invalid cell position:', { x: cell.x, y: cell.y });
            return false;
        }
        
        // Handle different cell types
        try {
            if (cell.isSpore && cell.sporeType) {
                this.handleSporeConsumption(cell);
            } else {
                // Regular cell consumption
                this.handleRegularCellConsumption(cell);
            }
            
            // Restore some health
            this.health = Math.min(this.maxHealth, this.health + 5);
            
            // Create visual feedback
            this.createEatEffect();
            
            return true;
        } catch (error) {
            console.error('[Player] Error eating cell:', error);
            return false;
        }
    }
    
    /**
     * Handle consuming different types of spores
     */
    handleSporeConsumption(spore) {
        switch (spore.sporeType) {
            case 'growth_hormone':
                this.handleGreenSpore(spore);
                break;
            case 'speed_boost':
                this.handleYellowSpore(spore);
                break;
            case 'talent_upgrade':
                this.handleOrangeSpore(spore);
                break;
            default:
                // Fallback to regular cell consumption
                this.handleRegularCellConsumption(spore);
        }
    }
    
    /**
     * Handle green growth hormone spore
     * Requirements: Give energy, increase size, and increase health
     */
    handleGreenSpore(spore) {
        // Safety check: Ensure sporeData exists
        if (!spore.sporeData) {
            console.error('❌ Spore missing sporeData:', spore);
            // Fallback: treat as regular cell
            this.handleRegularCellConsumption(spore);
            return;
        }
        
        let growthAmount = spore.sporeData.growth || 1;
        const sporeSize = spore.sporeData.size || 1; // Size 1-5
        
        // REQUIREMENT: If cell is very large, only size 4 and 5 give benefit increases
        const isVeryLarge = this.baseRadius >= 40; // Large cell threshold
        if (isVeryLarge && sporeSize < 4) {
            GameLogger.debug(`🌱 Cell too large (${this.baseRadius.toFixed(1)}) - size ${sporeSize} spore gives no benefit`);
            // Still give energy/health but no growth
            growthAmount = 0;
        }
        
        // Apply energy efficiency talent
        if (this.hasEnergyEfficiency && this.growthMultiplier && growthAmount > 0) {
            growthAmount *= this.growthMultiplier;
            GameLogger.debug(`🔋 Energy Efficiency: Growth multiplied by ${this.growthMultiplier}`);
        }
        
        // REQUIREMENT: Green spores give energy (health), increase size, and increase health
        const healthGain = 10 + (sporeSize * 2); // 12-20 health based on size
        this.health = Math.min(this.maxHealth, this.health + healthGain);
        
        // Apply size increase if not too large
        if (growthAmount > 0) {
            const newTargetRadius = Math.min(this.maxRadius, this.baseRadius + growthAmount);
            this.startGrowthAnimation(newTargetRadius);
        }
        
        GameLogger.debug(`💚 Green Spore (size ${sporeSize}): +${growthAmount} size, +${healthGain} health`);
    }
    
    /**
     * Handle yellow energy spore
     * Requirements: Give energy, health, and increase max energy
     */
    handleYellowSpore(spore) {
        // REQUIREMENT: Yellow spores give energy (health), restore health, and increase max energy
        const energyGain = 15; // Base energy restore
        const healthGain = 20; // Health restore
        const maxEnergyIncrease = 5; // Permanent max energy increase
        
        // Restore health (energy)
        this.health = Math.min(this.maxHealth, this.health + healthGain);
        
        // Increase max energy (max health) permanently
        this.maxHealth += maxEnergyIncrease;
        
        GameLogger.debug(`⚡ Yellow Energy Spore: +${healthGain} health, max energy ${this.maxHealth - maxEnergyIncrease} → ${this.maxHealth}`);
    }
    
    /**
     * Handle orange talent upgrade spore
     * Requirements: Give energy and +1 talent point
     */
    handleOrangeSpore(spore) {
        // REQUIREMENT: Orange spores give energy (health) and +1 talent point
        const energyGain = 15; // Base energy restore
        
        // Restore health (energy)
        this.health = Math.min(this.maxHealth, this.health + energyGain);
        
        // Add +1 talent point
        if (window.game && window.game.talentSystem) {
            window.game.talentSystem.addTalentPoints(1);
            GameLogger.debug(`🍊 Orange Talent Spore: +${energyGain} health, +1 talent point`);
        } else {
            console.error('❌ Talent system not available');
        }
        
        // Open talent system UI if available
        if (window.game && window.game.openTalentSystem) {
            window.game.openTalentSystem();
        }
    }
    
    /**
     * Handle regular cell consumption (non-spore)
     */
    handleRegularCellConsumption(cell) {
        // Calculate growth amount based on eaten cell
        const growthAmount = cell.radius * CELLVIVE_CONSTANTS.PLAYER.GROWTH_AMOUNT_MULTIPLIER;
        const newTargetRadius = Math.min(this.maxRadius, this.baseRadius + growthAmount);
        
        // Start growth animation
        this.startGrowthAnimation(newTargetRadius);
    }
    
    /**
     * Update max speed based on current size and speed boosts
     */
    updateMaxSpeed() {
        // Base speed calculation with size reduction
        const baseSpeed = CELLVIVE_CONSTANTS.PLAYER.STARTING_SPEED;
        let sizeFactor = Math.max(0.3, 1 - (this.radius - 20) / 200);
        
        // Apply resilience talent if unlocked
        if (this.hasResilience && this.resilienceModifier) {
            // Reduce speed penalty by resilience modifier
            const speedPenalty = 1 - sizeFactor;
            const reducedPenalty = speedPenalty * this.resilienceModifier;
            sizeFactor = 1 - reducedPenalty;
        }
        
        // FIXED: Yellow spores no longer provide speed boost (now they boost max energy)
        // Legacy speedBoosts property no longer used
        const speedBoostMultiplier = 1;
        
        // Apply speed demon talent
        let talentSpeedMultiplier = 1;
        if (this.hasSpeedDemon && this.speedMultiplier) {
            talentSpeedMultiplier = this.speedMultiplier;
        }
        
        // Calculate final max speed
        this.maxSpeed = baseSpeed * sizeFactor * speedBoostMultiplier * talentSpeedMultiplier;
        
        // Ensure minimum speed
        this.maxSpeed = Math.max(0.5, this.maxSpeed);
    }
    
    /**
     * Start a smooth growth animation
     */
    startGrowthAnimation(targetRadius) {
        this.targetRadius = targetRadius;
        this.growthStartRadius = this.baseRadius;
        this.growthAnimationProgress = 0;
        this.isGrowing = true;
        
        // console.log(`🔬 Starting growth animation: ${this.growthStartRadius} → ${this.targetRadius}`); // Disabled to reduce spam
    }
    
    /**
     * Update growth animation
     */
    updateGrowthAnimation() {
        if (!this.isGrowing) return;
        
        // Increase animation progress
        this.growthAnimationProgress += 1 / this.growthAnimationDuration;
        
        if (this.growthAnimationProgress >= 1) {
            // Animation complete
            this.growthAnimationProgress = 1;
            this.isGrowing = false;
            this.baseRadius = this.targetRadius;
            // console.log(`🔬 Growth animation complete: ${this.baseRadius}`); // Disabled to reduce spam
        } else {
            // Interpolate between start and target radius
            const progress = this.easeOutCubic(this.growthAnimationProgress);
            this.baseRadius = this.growthStartRadius + (this.targetRadius - this.growthStartRadius) * progress;
        }
    }
    
    /**
     * Easing function for smooth growth animation
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    /**
     * Create visual effect when eating
     */
    createEatEffect() {
        // For now, just a temporary size increase
        this.radius = this.baseRadius * 1.1;
        
        // Could add particle effects here later
    }
    
    /**
     * Take damage
     */
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            console.log('🔬 Player died');
            return true; // Player died
        }
        
        return false; // Player survived
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
     * Check if player is moving
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
    /**
     * Apply magnet effect to nearby cells
     */
    applyMagnetEffect() {
        if (!this.powerUpMagnet) return;
        
        // Find nearby cells within magnet range
        const magnetRange = this.powerUpMagnet;
        const nearbyCells = window.game ? window.game.cells : [];
        
        for (const cell of nearbyCells) {
            if (cell === this) continue;
            
            const distance = Math.hypot(cell.x - this.x, cell.y - this.y);
            if (distance <= magnetRange && distance > this.radius + cell.radius) {
                // Pull cell towards player
                const pullStrength = 0.1 * (1 - distance / magnetRange);
                const dx = this.x - cell.x;
                const dy = this.y - cell.y;
                
                cell.velocityX += dx * pullStrength * 0.01;
                cell.velocityY += dy * pullStrength * 0.01;
            }
        }
    }
    
    /**
     * Update talent effects each frame
     */
    updateTalentEffects(deltaTime, game) {
        // Update regeneration
        if (this.hasRegeneration) {
            this.updateRegeneration(deltaTime, game);
        }
        
        // Update camouflage
        if (this.hasCamouflage) {
            this.updateCamouflage(deltaTime);
        }
        
        // Update phase shift
        if (this.hasPhaseShift) {
            this.updatePhaseShift(deltaTime);
        }
        
        // Update magnetic field
        if (this.hasMagneticField) {
            this.updateMagneticField(game);
        }
    }
    
    /**
     * Update regeneration talent
     */
    updateRegeneration(deltaTime, game) {
        const currentTime = Date.now();
        
        // Check if in combat (enemies nearby)
        const enemiesNearby = game.enemies && game.enemies.some(enemy => {
            const distance = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
            return distance < this.combatThreshold;
        });
        
        if (!enemiesNearby && this.health < this.maxHealth) {
            if (currentTime - this.lastRegenTime > 1000) { // Regen every second
                this.health = Math.min(this.maxHealth, this.health + this.regenRate);
                this.lastRegenTime = currentTime;
            }
        }
    }
    
    /**
     * Update camouflage talent
     */
    updateCamouflage(deltaTime) {
        const currentTime = Date.now();
        
        // Check if stationary
        const speed = Math.sqrt(this.velocityX ** 2 + this.velocityY ** 2);
        const isCurrentlyStationary = speed < 0.1;
        
        if (isCurrentlyStationary && !this.isStationary) {
            this.stationaryStartTime = currentTime;
            this.isStationary = true;
        } else if (!isCurrentlyStationary && this.isStationary) {
            this.isStationary = false;
        }
    }
    
    /**
     * Update phase shift talent
     */
    updatePhaseShift(deltaTime) {
        const currentTime = Date.now();
        
        // Check if should trigger phase shift
        if (this.health <= this.maxHealth * this.phaseShiftTriggerHealth && 
            !this.isPhaseShifted &&
            currentTime - this.phaseShiftLastUsed > this.phaseShiftCooldown) {
            
            this.isPhaseShifted = true;
            this.phaseShiftStartTime = currentTime;
            this.phaseShiftLastUsed = currentTime;
            
            GameLogger.debug(`🌀 Phase Shift activated!`);
        }
        
        // Check if phase shift should end
        if (this.isPhaseShifted && 
            currentTime - this.phaseShiftStartTime > this.phaseShiftDuration) {
            
            this.isPhaseShifted = false;
            GameLogger.debug(`🌀 Phase Shift ended`);
        }
    }
    
    /**
     * Update magnetic field talent
     */
    updateMagneticField(game) {
        if (!game.cells) return;
        
        // Attract nearby spores
        game.cells.forEach(cell => {
            if (cell.isSpore && cell.sporeType === 'growth_hormone') {
                const distance = Math.sqrt((cell.x - this.x) ** 2 + (cell.y - this.y) ** 2);
                
                if (distance < this.sporeAttractionRadius) {
                    // Apply attraction force
                    const dx = this.x - cell.x;
                    const dy = this.y - cell.y;
                    const attractionForce = this.sporeAttractionStrength / (distance + 1);
                    
                    cell.velocityX += dx * attractionForce * 0.01;
                    cell.velocityY += dy * attractionForce * 0.01;
                }
            }
        });
    }
    
    /**
     * Check if player can eat a cell (with predator talent)
     */
    canEatCell(cell) {
        const baseSizeRatio = 1.1; // Can normally eat cells 10% larger
        const sizeRatio = this.hasPredator ? 
            baseSizeRatio * this.eatSizeModifier : 
            baseSizeRatio;
            
        return this.radius > cell.radius * sizeRatio;
    }
    
    getRenderProps() {
        return {
            x: this.x,
            y: this.y,
            radius: this.getVisualRadius(),
            color: this.color,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            health: this.health,
            maxHealth: this.maxHealth,
            isMoving: this.isMoving(),
            direction: this.getDirection(),
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            isBlob: true, // Player is a blob shape
            shapeSeed: this.shapeSeed, // Fixed seed for consistent shape
            wobblePhase: this.wobblePhase,
            wobbleIntensity: this.wobbleIntensity,
            // Power-up visual effects
            isInvincible: this.powerUpInvincible,
            magnetRange: this.powerUpMagnet
        };
    }
}

// Export for use in other modules
window.Player = Player;
