/**
 * Environment Manager - Coordinates all environmental systems
 * Manages biomes and food spawners
 */
class EnvironmentManager {
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Game reference for spawners
        this.game = null;
        
        // Environmental systems
        this.biomes = [];
        this.foodSpawners = [];
        
        // Configuration
        this.config = {
            maxBiomes: 15,
            maxFoodSpawners: 40,
            biomeSpawnRate: 0.001,
            spawnerSpawnRate: 0.003,
            spawnerDensity: 0.2
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
            const spawner = this.createRandomFoodSpawner();
            if (spawner && this.isValidFoodSpawnerPosition(spawner)) {
                this.foodSpawners.push(spawner);
            }
        }
        
        console.log('🌍 Initial environmental elements spawned');
    }
    
    /**
     * Update all environmental systems
     */
    update() {
        this.updateBiomes();
        this.updateFoodSpawners();
        
        this.spawnBiomes();
        this.spawnFoodSpawners();
        
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
        this.foodSpawners.forEach(spawner => {
            if (spawner.update && this.game) {
                spawner.update(16, this.game); // Assume 60fps = 16ms deltaTime
            }
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
        if (this.foodSpawners.length >= 8) return;
        
        if (Math.random() < 0.0005) { // Very low spawn rate
            const spawner = this.createRandomFoodSpawner();
            if (spawner && this.isValidFoodSpawnerPosition(spawner)) {
                this.foodSpawners.push(spawner);
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
     * Create a random food spawner
     */
    createRandomFoodSpawner() {
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
        
        // Random size - smaller than old foodSpawners
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
     * Check if a food spawner position is valid
     */
    isValidFoodSpawnerPosition(newFoodSpawner) {
        const minDistance = 80; // Minimum distance between foodSpawners
        
        for (const obstacle of this.foodSpawners) {
            const distance = Math.hypot(
                newFoodSpawner.x - obstacle.x,
                newFoodSpawner.y - obstacle.y
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
        this.biomes.forEach(biome => {
            biome.applyEffects(cell);
        });
    }
    
    /**
     * Check and handle food spawner collisions with a cell
     */
    handleFoodSpawnerCollisions(cell) {
        this.foodSpawners.forEach(obstacle => {
            if (obstacle.checkCollision(cell)) {
                obstacle.pushCellAway(cell);
            }
        });
    }
    
    /**
     * Clean up expired environmental elements
     */
    cleanupExpiredElements() {
    }
    
    /**
     * Get all environmental elements for rendering
     */
    getRenderElements() {
        return {
            biomes: this.biomes.map(biome => biome.getRenderProps()),
            foodSpawners: this.foodSpawners.map(obstacle => obstacle.getRenderProps()),
            hazards: [],
            currents: []
        };
    }
    
    /**
     * Get statistics about the environment
     */
    getStats() {
        return {
            biomes: this.biomes.length,
            foodSpawners: this.foodSpawners.length
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
        this.foodSpawners = [];
        console.log('🌍 Environment cleared');
    }
}

// Export for use in other modules
window.EnvironmentManager = EnvironmentManager;
