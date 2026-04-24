/**
 * Food Spawner Class - Natural, organic spawners that release food spores
 * Replaces the old square obstacles with cell-like organisms that spawn food
 */
class FoodSpawner {
    constructor(options = {}) {
        // Spawner identification
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.type = options.type || 'spawner';
        
        // Position and dimensions
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 25; // Smaller than hazards, natural size
        
        // Visual properties - organic cell-like appearance
        this.color = options.color || '#4A90E2'; // Blue-green cell color
        this.strokeColor = options.strokeColor || '#2E5B8A';
        this.strokeWidth = options.strokeWidth || 1;
        
        // Natural polygon shape properties
        this.numPoints = options.numPoints || 6; // Hexagonal shape
        this.irregularity = options.irregularity || 0.3; // Natural variation
        this.points = this.generateNaturalPolygon();
        
        // Spawning properties
        this.spawnRate = options.spawnRate || 0.02; // Probability per frame
        this.lastSpawnTime = 0;
        this.spawnInterval = options.spawnInterval || 3000; // 3 seconds between spawns
        this.maxSpawnDistance = options.maxSpawnDistance || 200;
        
        // Spore types from constants
        this.sporeTypes = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES;
        
        // Animation properties
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseSpeed = 0.03;
        this.breathingIntensity = 0.1;
        
        GameLogger.debug(`🌱 Spawner Anomalie created at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) - Type: ${this.type}`);
    }
    
    /**
     * Generate a natural, irregular polygon shape
     */
    generateNaturalPolygon() {
        const points = [];
        const angleStep = (Math.PI * 2) / this.numPoints;
        
        for (let i = 0; i < this.numPoints; i++) {
            const baseAngle = i * angleStep;
            const irregularity = (Math.random() - 0.5) * this.irregularity;
            const angle = baseAngle + irregularity;
            
            // Vary the radius slightly for natural look
            const radiusVariation = 1 + (Math.random() - 0.5) * 0.3;
            const radius = this.radius * radiusVariation;
            
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            
            points.push({ x, y });
        }
        
        return points;
    }
    
    /**
     * Update the spawner (called each frame)
     */
    update(deltaTime, game) {
        this.pulsePhase += this.pulseSpeed * deltaTime;
        
        // Check if we should spawn a spore
        const currentTime = Date.now();
        if (currentTime - this.lastSpawnTime >= this.spawnInterval) {
            if (Math.random() < this.spawnRate) {
                this.spawnSpore(game);
                this.lastSpawnTime = currentTime;
            }
        }
    }
    
    /**
     * Spawn a food spore from this spawner
     */
    spawnSpore(game) {
        if (!game || !game.cells) return;
        
        // Determine zone for zone-based spawning
        const zone = game.getZoneAtPosition ? game.getZoneAtPosition(this.x, this.y) : 'NORMAL_ZONE';
        
        // Select spore type based on zone and weights
        const sporeType = this.selectSporeTypeByZone(zone);
        
        // Spawn position near the spawner edge
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDistance = this.radius + 5 + Math.random() * 10; // Just outside spawner
        const spawnX = this.x + Math.cos(spawnAngle) * spawnDistance;
        const spawnY = this.y + Math.sin(spawnAngle) * spawnDistance;
        
        // Random velocity towards a destination
        const targetDistance = 50 + Math.random() * this.maxSpawnDistance;
        const targetAngle = Math.random() * Math.PI * 2;
        const targetX = spawnX + Math.cos(targetAngle) * targetDistance;
        const targetY = spawnY + Math.sin(targetAngle) * targetDistance;
        
        // Calculate velocity to reach target
        const dx = targetX - spawnX;
        const dy = targetY - spawnY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const speed = 0.5 + Math.random() * 1.0; // Random speed
            const velocityX = (dx / distance) * speed;
            const velocityY = (dy / distance) * speed;
            
            // Get spore properties based on type
            const sporeProps = this.getSporeProperties(sporeType, zone);
            
            // Create the spore cell
            const spore = new Cell({
                x: spawnX,
                y: spawnY,
                radius: sporeProps.radius,
                color: sporeType.COLOR,
                speed: speed,
                velocityX: velocityX,
                velocityY: velocityY,
                targetX: targetX,
                targetY: targetY,
                isSpore: true,
                sporeType: sporeType.TYPE,
                sporeData: sporeProps
            });
            
            game.cells.push(spore);
            GameLogger.debug(`🌱 Spawned ${sporeType.NAME} from spawner at (${this.x.toFixed(0)}, ${this.y.toFixed(0)})`);
        }
    }
    
    /**
     * Select spore type based on zone
     */
    selectSporeTypeByZone(zone) {
        const random = Math.random();
        
        // Adjust weights based on zone
        let greenWeight = this.sporeTypes.GREEN.SPAWN_WEIGHT;
        let yellowWeight = this.sporeTypes.YELLOW.SPAWN_WEIGHT;
        let orangeWeight = this.sporeTypes.ORANGE.SPAWN_WEIGHT;
        
        // Zone-based adjustments
        if (zone === 'SAFE_ZONE' || zone === 'NORMAL_ZONE') {
            greenWeight *= 1.5; // More green spores in center
            orangeWeight *= 0.3; // Fewer orange spores in center
        } else if (zone === 'DANGER_ZONE' || zone === 'DEATH_ZONE') {
            greenWeight *= 0.7; // Fewer green spores in outer zones
            orangeWeight *= 2.0; // More orange spores in outer zones
        }
        
        // Normalize weights
        const totalWeight = greenWeight + yellowWeight + orangeWeight;
        greenWeight /= totalWeight;
        yellowWeight /= totalWeight;
        orangeWeight /= totalWeight;
        
        // Select based on weighted random
        if (random < greenWeight) {
            return this.sporeTypes.GREEN;
        } else if (random < greenWeight + yellowWeight) {
            return this.sporeTypes.YELLOW;
        } else {
            return this.sporeTypes.ORANGE;
        }
    }
    
    /**
     * Get spore properties based on type and zone
     */
    getSporeProperties(sporeType, zone) {
        switch (sporeType.TYPE) {
            case 'growth_hormone':
                // Green spores - size varies by zone
                const growthValues = Object.values(sporeType.GROWTH_VALUES);
                let sizeIndex = 0;
                
                if (zone === 'SAFE_ZONE') {
                    sizeIndex = Math.floor(Math.random() * 3); // Small, Medium, Large
                } else if (zone === 'NORMAL_ZONE') {
                    sizeIndex = Math.floor(Math.random() * 4); // Small to XLarge
                } else {
                    sizeIndex = Math.floor(Math.random() * 5); // All sizes, including XXLarge
                }
                
                const growthValue = growthValues[sizeIndex];
                return {
                    radius: growthValue.radius,
                    growth: growthValue.growth,
                    size: sizeIndex + 1, // Add size property (1-5) for large cell logic
                    type: 'growth_hormone'
                };
                
            case 'speed_boost':
                // Yellow spores - fixed properties
                return {
                    radius: sporeType.RADIUS,
                    growth: sporeType.GROWTH,
                    type: 'speed_boost',
                    speedBoost: sporeType.SPEED_BOOST
                };
                
            case 'talent_upgrade':
                // Orange spores - fixed properties
                return {
                    radius: sporeType.RADIUS,
                    growth: sporeType.GROWTH,
                    type: 'talent_upgrade'
                };
                
            default:
                return {
                    radius: 4,
                    growth: 1,
                    type: 'unknown'
                };
        }
    }
    
    /**
     * Check if a point is inside this spawner (for rendering)
     */
    containsPoint(x, y) {
        // Simple circular check for spawner
        const distance = Math.hypot(x - this.x, y - this.y);
        return distance <= this.radius;
    }
    
    /**
     * Get render properties for this spawner
     */
    getRenderProps() {
        // Calculate pulsing radius for breathing effect
        const pulseRadius = this.radius + Math.sin(this.pulsePhase) * this.breathingIntensity * this.radius;
        
        return {
            type: 'food_spawner',
            x: this.x,
            y: this.y,
            radius: pulseRadius,
            color: this.color,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            points: this.points,
            numPoints: this.numPoints,
            pulsePhase: this.pulsePhase
        };
    }
}

/**
 * Predefined Food Spawner Types
 */
class SpawnerTypes {
    static get ORGANIC() {
        return {
            type: 'organic',
            color: '#4A90E2',
            strokeColor: '#2E5B8A',
            strokeWidth: 1,
            numPoints: 6,
            irregularity: 0.3
        };
    }
    
    static get CRYSTALLINE() {
        return {
            type: 'crystalline',
            color: '#9370DB',
            strokeColor: '#4B0082',
            strokeWidth: 1,
            numPoints: 8,
            irregularity: 0.2
        };
    }
    
    static get BIOLOGICAL() {
        return {
            type: 'biological',
            color: '#32CD32',
            strokeColor: '#228B22',
            strokeWidth: 1,
            numPoints: 5,
            irregularity: 0.4
        };
    }
    
    static get ENERGETIC() {
        return {
            type: 'energetic',
            color: '#FFD700',
            strokeColor: '#DAA520',
            strokeWidth: 1,
            numPoints: 7,
            irregularity: 0.25
        };
    }
}

// Export for use in other modules
window.FoodSpawner = FoodSpawner;
window.SpawnerTypes = SpawnerTypes;
