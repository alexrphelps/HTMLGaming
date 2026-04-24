/**
 * Environment Manager - Coordinates all environmental systems
 * Manages biomes, obstacles, hazards, and currents
 */
class EnvironmentManager {
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Game reference for spawners
        this.game = null;
        
        // Environmental systems
        this.biomes = [];
        this.obstacles = []; // Disabled for now
        this.hazards = [];
        this.currents = [];
        
        // Configuration - Increased rates for living world feel
        this.config = {
            maxBiomes: 15, // Increased for more variety
            maxObstacles: 40, // More obstacles for navigation challenges
            maxHazards: 12, // More hazards for danger
            maxCurrents: 8, // More currents for dynamic movement
            
            biomeSpawnRate: 0.001, // Much more frequent
            obstacleSpawnRate: 0.003, // More obstacles spawning
            hazardSpawnRate: 0.002, // More hazards for danger
            currentSpawnRate: 0.0015, // More currents for movement
            
            obstacleDensity: 0.2, // Slightly less dense to allow movement
            hazardDensity: 0.15, // Balanced hazard placement
            currentDensity: 0.1 // Currents can overlap
        };
        
        // Performance optimization
        this.spatialGrid = new Map(); // For efficient spatial queries
        this.gridSize = 200; // Size of each grid cell
        
        // Spawn initial environmental elements for immediate visual impact
        this.spawnInitialElements();
        
        console.log('🌍 Environment Manager initialized');
    }
    
    /**
     * Spawn initial environmental elements when game starts
     */
    spawnInitialElements() {
        // Spawn some initial biomes
        for (let i = 0; i < 3; i++) {
            const biome = this.createRandomBiome();
            if (biome) {
                this.biomes.push(biome);
            }
        }
        
        // Spawn some initial food spawners
        for (let i = 0; i < 3; i++) {
            const spawner = this.createRandomObstacle();
            if (spawner && this.isValidObstaclePosition(spawner)) {
                this.obstacles.push(spawner);
            }
        }
        
        // Spawn some initial hazards (only if enabled)
        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
            for (let i = 0; i < 3; i++) {
                const hazard = this.createRandomHazard();
                if (hazard) {
                    this.hazards.push(hazard);
                }
            }
        }
        
        // Spawn some initial currents - DISABLED
        // for (let i = 0; i < 2; i++) {
        //     const current = this.createRandomCurrent();
        //     if (current) {
        //         this.currents.push(current);
        //     }
        // }
        
        console.log('🌍 Initial environmental elements spawned');
    }
    
    /**
     * Update all environmental systems
     */
    update() {
        // Update existing environmental elements
        this.updateBiomes();
        this.updateFoodSpawners();
        // Update hazards (only if enabled)
        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
            this.updateHazards();
        }
        // this.updateCurrents(); // DISABLED
        
        // Spawn new elements
        this.spawnBiomes();
        this.spawnFoodSpawners();
        // Spawn hazards (only if enabled)
        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
            this.spawnHazards();
        }
        // this.spawnCurrents(); // DISABLED
        
        // Clean up expired elements
        this.cleanupExpiredElements();
    }
    
    /**
     * Update biomes
     */
    updateBiomes() {
        this.biomes.forEach(biome => {
            biome.update();
        });
    }
    
    /**
     * Update food spawners
     */
    updateFoodSpawners() {
        // Update each spawner to potentially spawn spores
        this.obstacles.forEach(spawner => {
            if (spawner.update && this.game) {
                spawner.update(16, this.game); // Assume 60fps = 16ms deltaTime
            }
        });
    }
    
    /**
     * Update hazards
     */
    updateHazards() {
        this.hazards.forEach(hazard => {
            hazard.update();
        });
    }
    
    /**
     * Update currents
     */
    updateCurrents() {
        this.currents.forEach(current => {
            current.update(this.worldWidth, this.worldHeight);
        });
    }
    
    /**
     * Spawn new biomes
     */
    spawnBiomes() {
        if (this.biomes.length >= this.config.maxBiomes) return;
        
        if (Math.random() < this.config.biomeSpawnRate) {
            const biome = this.createRandomBiome();
            if (biome) {
                this.biomes.push(biome);
            }
        }
    }
    
    /**
     * Spawn new food spawners
     */
    spawnFoodSpawners() {
        // Limit number of spawners to prevent overcrowding
        if (this.obstacles.length >= 8) return;
        
        if (Math.random() < 0.0005) { // Very low spawn rate
            const spawner = this.createRandomObstacle();
            if (spawner && this.isValidObstaclePosition(spawner)) {
                this.obstacles.push(spawner);
            }
        }
    }
    
    /**
     * Spawn new hazards
     */
    spawnHazards() {
        if (this.hazards.length >= this.config.maxHazards) return;
        
        if (Math.random() < this.config.hazardSpawnRate) {
            const hazard = this.createRandomHazard();
            if (hazard) {
                this.hazards.push(hazard);
            }
        }
    }
    
    /**
     * Spawn new currents
     */
    spawnCurrents() {
        if (this.currents.length >= this.config.maxCurrents) return;
        
        if (Math.random() < this.config.currentSpawnRate) {
            const current = this.createRandomCurrent();
            if (current) {
                this.currents.push(current);
            }
        }
    }
    
    /**
     * Create a random biome
     */
    createRandomBiome() {
        const biomeTypes = [
            BiomeTypes.NUTRIENT_RICH,
            BiomeTypes.TOXIC,
            BiomeTypes.SLOW_ZONE,
            BiomeTypes.AGGRESSIVE,
            BiomeTypes.NEUTRAL
        ];
        
        const biomeType = biomeTypes[Math.floor(Math.random() * biomeTypes.length)];
        
        // Random position
        const x = Math.random() * this.worldWidth;
        const y = Math.random() * this.worldHeight;
        
        // All biomes are now large and consistent in size
        const size = 1500 + Math.random() * 2000; // 1500-3500 size range for all biomes
        const width = size;
        const height = size;
        
        const options = {
            ...biomeType,
            x: x,
            y: y,
            width: width,
            height: height
        };
        
        return new Biome(options);
    }
    
    /**
     * Create a random obstacle
     */
    createRandomObstacle() {
        const spawnerTypes = [
            SpawnerTypes.ORGANIC,
            SpawnerTypes.CRYSTALLINE,
            SpawnerTypes.BIOLOGICAL,
            SpawnerTypes.ENERGETIC
        ];
        
        const spawnerType = spawnerTypes[Math.floor(Math.random() * spawnerTypes.length)];
        
        // Random position
        const x = Math.random() * this.worldWidth;
        const y = Math.random() * this.worldHeight;
        
        // Random size - smaller than old obstacles
        const radius = 15 + Math.random() * 20; // 15-35 radius
        
        const options = {
            ...spawnerType,
            x: x,
            y: y,
            radius: radius
        };
        
        return new FoodSpawner(options);
    }
    
    /**
     * Create a random hazard
     */
    createRandomHazard() {
        const hazardTypes = [
            HazardTypes.TOXIN_POOL,
            HazardTypes.ACID_LAKE,
            HazardTypes.RADIATION_ZONE,
            HazardTypes.VIRUS_SPAWN
        ];
        
        const hazardType = hazardTypes[Math.floor(Math.random() * hazardTypes.length)];
        
        // Random position
        const x = Math.random() * this.worldWidth;
        const y = Math.random() * this.worldHeight;
        
        // Random size
        const size = 100 + Math.random() * 150;
        const width = size;
        const height = size;
        
        const options = {
            ...hazardType,
            x: x,
            y: y,
            width: width,
            height: height
        };
        
        return new Hazard(options);
    }
    
    /**
     * Create a random current
     */
    createRandomCurrent() {
        const currentTypes = [
            CurrentTypes.OCEAN_CURRENT,
            CurrentTypes.WHIRLPOOL,
            CurrentTypes.WIND_TUNNEL,
            CurrentTypes.MURKY_WATER
        ];
        
        const currentType = currentTypes[Math.floor(Math.random() * currentTypes.length)];
        
        // Create a wave stream with start and end points
        const startX = Math.random() * this.worldWidth;
        const startY = Math.random() * this.worldHeight;
        
        // Calculate end point based on stream length and direction
        const streamLength = 150 + Math.random() * 250; // 150-400 units long
        const direction = Math.random() * Math.PI * 2;
        const endX = startX + Math.cos(direction) * streamLength;
        const endY = startY + Math.sin(direction) * streamLength;
        
        // Ensure end point is within world bounds
        const boundedEndX = Math.max(0, Math.min(this.worldWidth, endX));
        const boundedEndY = Math.max(0, Math.min(this.worldHeight, endY));
        
        // Random size for bounding box (used for culling)
        const width = Math.abs(boundedEndX - startX) + 100;
        const height = Math.abs(boundedEndY - startY) + 100;
        
        const options = {
            ...currentType,
            startX: startX,
            startY: startY,
            endX: boundedEndX,
            endY: boundedEndY,
            width: width,
            height: height
        };
        
        return new Current(options);
    }
    
    /**
     * Check if an obstacle position is valid (not overlapping with others)
     */
    isValidObstaclePosition(newObstacle) {
        const minDistance = 80; // Minimum distance between obstacles
        
        for (const obstacle of this.obstacles) {
            const distance = Math.hypot(
                newObstacle.x - obstacle.x,
                newObstacle.y - obstacle.y
            );
            
            if (distance < minDistance) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Apply environmental effects to a cell
     */
    applyEffectsToCell(cell) {
        // Apply biome effects
        this.biomes.forEach(biome => {
            biome.applyEffects(cell);
        });
        
        // Apply hazard effects (only if enabled)
        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
            this.hazards.forEach(hazard => {
                hazard.applyEffects(cell);
            });
        }
        
        // Apply current effects - DISABLED
        // this.currents.forEach(current => {
        //     current.applyEffects(cell);
        // });
    }
    
    /**
     * Check and handle obstacle collisions with a cell
     */
    handleObstacleCollisions(cell) {
        this.obstacles.forEach(obstacle => {
            if (obstacle.checkCollision(cell)) {
                obstacle.pushCellAway(cell);
            }
        });
    }
    
    /**
     * Clean up expired environmental elements
     */
    cleanupExpiredElements() {
        // Remove expired hazards (only if enabled)
        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
            this.hazards = this.hazards.filter(hazard => !hazard.shouldRemove());
        } else {
            // Clear all hazards if disabled
            this.hazards = [];
        }
        
        // Remove expired currents - DISABLED
        // this.currents = this.currents.filter(current => !current.shouldRemove());
        
        // Remove biomes that are too far from any activity (performance optimization)
        // This would require knowing player position, so we'll keep it simple for now
    }
    
    /**
     * Get all environmental elements for rendering
     */
    getRenderElements() {
        return {
            biomes: this.biomes.map(biome => biome.getRenderProps()),
            obstacles: this.obstacles.map(obstacle => obstacle.getRenderProps()),
            hazards: this.hazards.map(hazard => hazard.getRenderProps()),
            currents: [] // DISABLED - no currents to render
        };
    }
    
    /**
     * Get statistics about the environment
     */
    getStats() {
        return {
            biomes: this.biomes.length,
            obstacles: this.obstacles.length,
            hazards: this.hazards.length,
            currents: this.currents.length
        };
    }
    
    /**
     * Set game reference for spawners
     * Should be called after creating EnvironmentManager
     */
    setGame(game) {
        this.game = game;
    }
    
    /**
     * Clear all environmental elements (for reset/cleanup)
     */
    clear() {
        this.biomes = [];
        this.obstacles = [];
        this.hazards = [];
        this.currents = [];
        console.log('🌍 Environment cleared');
    }
}

// Export for use in other modules
window.EnvironmentManager = EnvironmentManager;
