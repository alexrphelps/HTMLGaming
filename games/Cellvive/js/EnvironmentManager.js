class Hazard {
    constructor(options = {}) {
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.type = options.type || 'toxic';
        this.name = options.name || 'Hazard';
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.radius = options.radius || 120;
        this.color = options.color || '#7CFC00';
        this.damage = options.damage || 1;
        this.damageInterval = options.damageInterval || 1200;
        this.slowMultiplier = options.slowMultiplier || 0.95;
        this.pulse = Math.random() * Math.PI * 2;
        this.lastDamageByTarget = new WeakMap();
    }

    update(deltaTime = 16) {
        this.pulse += deltaTime * 0.003;
        if (this.pulse > Math.PI * 2) this.pulse -= Math.PI * 2;
    }

    containsCell(cell) {
        if (!cell) return false;
        return Math.hypot(cell.x - this.x, cell.y - this.y) <= this.radius + (cell.radius || 0);
    }

    applyEffects(cell, now = Date.now()) {
        if (!this.containsCell(cell)) return false;

        if (typeof cell.velocityX === 'number') cell.velocityX *= this.slowMultiplier;
        if (typeof cell.velocityY === 'number') cell.velocityY *= this.slowMultiplier;

        const lastDamage = this.lastDamageByTarget.get(cell) || 0;
        if (now - lastDamage >= this.damageInterval) {
            const resistance = cell.toxicDamageReduction || cell.hazardDamageReduction || 0;
            const damage = this.damage * Math.max(0, 1 - resistance);
            if (typeof cell.takeDamage === 'function') {
                cell.takeDamage(damage);
            } else if (typeof cell.health === 'number') {
                cell.health = Math.max(0, cell.health - damage);
            }
            this.lastDamageByTarget.set(cell, now);
        }

        return true;
    }

    getRenderProps() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: this.color,
            pulse: this.pulse
        };
    }
}

class Current {
    constructor(options = {}) {
        this.id = options.id || Math.random().toString(36).substr(2, 9);
        this.x = options.x || 0;
        this.y = options.y || 0;
        this.length = options.length || 600;
        this.width = options.width || 140;
        this.angle = options.angle || 0;
        this.force = options.force || 0.018;
        this.color = options.color || '#00FFFF';
        this.phase = Math.random() * Math.PI * 2;
    }

    update(deltaTime = 16, eventMultiplier = 1) {
        this.phase += deltaTime * 0.004 * eventMultiplier;
        if (this.phase > Math.PI * 2) this.phase -= Math.PI * 2;
    }

    containsCell(cell) {
        if (!cell) return false;
        const dx = cell.x - this.x;
        const dy = cell.y - this.y;
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        return Math.abs(localX) <= this.length / 2 && Math.abs(localY) <= this.width / 2 + (cell.radius || 0);
    }

    applyEffects(cell, eventMultiplier = 1) {
        if (!this.containsCell(cell)) return false;
        const force = this.force * eventMultiplier;
        cell.velocityX = (cell.velocityX || 0) + Math.cos(this.angle) * force;
        cell.velocityY = (cell.velocityY || 0) + Math.sin(this.angle) * force;
        return true;
    }

    getRenderProps(eventMultiplier = 1) {
        return {
            id: this.id,
            type: 'current',
            x: this.x,
            y: this.y,
            length: this.length,
            width: this.width,
            angle: this.angle,
            force: this.force * eventMultiplier,
            color: this.color,
            phase: this.phase
        };
    }
}

class EnvironmentalEvent {
    constructor(options = {}) {
        this.type = options.type || 'nutrient_bloom';
        this.name = options.name || 'Environmental Event';
        this.color = options.color || '#FFD700';
        this.duration = options.duration || 18000;
        this.startedAt = options.startedAt || Date.now();
    }

    get remainingMs() {
        return Math.max(0, this.duration - (Date.now() - this.startedAt));
    }

    get isActive() {
        return this.remainingMs > 0;
    }

    getRenderProps() {
        return {
            type: this.type,
            name: this.name,
            color: this.color,
            remainingMs: this.remainingMs
        };
    }
}

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
        this.hazards = [];
        this.currents = [];
        this.activeEvent = null;
        this.eventHistory = [];
        this.nextEventAt = 0;
        
        // Configuration
        this.config = {
            maxBiomes: CELLVIVE_CONSTANTS.ENVIRONMENT.BIOMES.MAX_COUNT,
            maxFoodSpawners: CELLVIVE_CONSTANTS.ENVIRONMENT.FOOD_SPAWNERS.MAX_COUNT,
            biomeSpawnRate: CELLVIVE_CONSTANTS.ENVIRONMENT.BIOMES.SPAWN_RATE,
            spawnerSpawnRate: CELLVIVE_CONSTANTS.ENVIRONMENT.FOOD_SPAWNERS.SPAWN_RATE,
            spawnerDensity: 0.2,
            maxHazards: CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS?.MAX_COUNT || 0,
            hazardSpawnRate: CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS?.SPAWN_RATE || 0,
            maxCurrents: CELLVIVE_CONSTANTS.ENVIRONMENT.CURRENTS?.MAX_COUNT || 0,
            currentSpawnRate: CELLVIVE_CONSTANTS.ENVIRONMENT.CURRENTS?.SPAWN_RATE || 0
        };
        
        // Performance optimization
        this.spatialGrid = new Map(); // For efficient spatial queries
        this.gridSize = 200; // Size of each grid cell
        
        // Spawn initial environmental elements for immediate visual impact
        this.spawnInitialElements();
        this.scheduleNextEvent();
        
        console.log('🌍 Environment Manager initialized');
    }
    
    /**
     * Spawn initial environmental elements when game starts
     */
    spawnInitialElements() {
        // Spawn some initial biomes
        for (let i = 0; i < CELLVIVE_CONSTANTS.ENVIRONMENT.BIOMES.INITIAL_COUNT; i++) {
            const biome = this.createRandomBiome();
            if (biome) {
                this.biomes.push(biome);
            }
        }
        
        // Spawn some initial food spawners
        for (let i = 0; i < CELLVIVE_CONSTANTS.ENVIRONMENT.FOOD_SPAWNERS.INITIAL_COUNT; i++) {
            const spawner = this.createRandomFoodSpawner();
            if (spawner && this.isValidFoodSpawnerPosition(spawner)) {
                this.foodSpawners.push(spawner);
            }
        }

        if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS?.ENABLED) {
            for (let i = 0; i < (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.INITIAL_COUNT || 0); i++) {
                const hazard = this.createRandomHazard();
                if (hazard) this.hazards.push(hazard);
            }
        }

        if (CELLVIVE_CONSTANTS.ENVIRONMENT.CURRENTS?.ENABLED) {
            for (let i = 0; i < (CELLVIVE_CONSTANTS.ENVIRONMENT.CURRENTS.INITIAL_COUNT || 0); i++) {
                const current = this.createRandomCurrent();
                if (current) this.currents.push(current);
            }
        }
        
        console.log('🌍 Initial environmental elements spawned');
    }
    
    /**
     * Update all environmental systems
     */
    update(deltaTime = 16) {
        this.updateBiomes();
        this.updateFoodSpawners(deltaTime);
        this.updateHazards(deltaTime);
        this.updateCurrents(deltaTime);
        this.updateEnvironmentalEvent();
        
        this.spawnBiomes();
        this.spawnFoodSpawners();
        this.spawnHazards();
        this.spawnCurrents();
        
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
    updateFoodSpawners(deltaTime = 16) {
        // Update each spawner to potentially spawn spores
        this.foodSpawners.forEach(spawner => {
            if (spawner.update && this.game) {
                spawner.update(deltaTime, this.game);
            }
        });
    }

    updateHazards(deltaTime = 16) {
        this.hazards.forEach(hazard => hazard.update(deltaTime));
    }

    updateCurrents(deltaTime = 16) {
        const multiplier = this.getCurrentMultiplier();
        this.currents.forEach(current => current.update(deltaTime, multiplier));
    }

    updateEnvironmentalEvent() {
        if (this.activeEvent && !this.activeEvent.isActive) {
            this.eventHistory.unshift(this.activeEvent.getRenderProps());
            this.eventHistory = this.eventHistory.slice(0, 5);
            this.activeEvent = null;
            this.scheduleNextEvent();
        }

        const events = CELLVIVE_CONSTANTS.ENVIRONMENT.EVENTS;
        if (events?.ENABLED && !this.activeEvent && Date.now() >= this.nextEventAt) {
            this.triggerRandomEvent();
        }
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
        if (this.foodSpawners.length >= this.config.maxFoodSpawners) return;
        
        if (Math.random() < this.config.spawnerSpawnRate) {
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
        
        let fallbackOptions = null;
        for (let attempt = 0; attempt < 20; attempt++) {
            const size = this.createBiomeSize(biomeType);
            const width = size.width;
            const height = size.height;
            const position = this.createClampedPosition(Math.max(width, height) / 2);

            const biomeOptions = {
                ...biomeType,
                x: position.x,
                y: position.y,
                width: width,
                height: height
            };

            fallbackOptions = fallbackOptions || biomeOptions;
            if (this.isValidBiomePosition(biomeOptions)) {
                return new Biome(biomeOptions);
            }
        }

        return fallbackOptions ? new Biome(fallbackOptions) : null;
    }

    spawnHazards() {
        const settings = CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS;
        if (!settings) return;
        if (!settings.ENABLED || this.hazards.length >= this.config.maxHazards) return;

        const eventMultiplier = this.activeEvent?.type === 'toxic_bloom' ? 3 : 1;
        if (Math.random() < this.config.hazardSpawnRate * eventMultiplier) {
            const hazard = this.createRandomHazard();
            if (hazard) this.hazards.push(hazard);
        }
    }

    spawnCurrents() {
        const settings = CELLVIVE_CONSTANTS.ENVIRONMENT.CURRENTS;
        if (!settings) return;
        if (!settings.ENABLED || this.currents.length >= this.config.maxCurrents) return;

        const eventMultiplier = this.activeEvent?.type === 'current_surge' ? 3 : 1;
        if (Math.random() < this.config.currentSpawnRate * eventMultiplier) {
            const current = this.createRandomCurrent();
            if (current) this.currents.push(current);
        }
    }

    /**
     * Pick a type-aware biome size from the configured visible ranges.
     */
    createBiomeSize(biomeType) {
        const biomeConfig = CELLVIVE_CONSTANTS.ENVIRONMENT.BIOMES || {};
        const isNutrient = biomeType.type === 'nutrient';
        const minKey = isNutrient ? 'NUTRIENT_SIZE_MIN' : 'REGULAR_SIZE_MIN';
        const maxKey = isNutrient ? 'NUTRIENT_SIZE_MAX' : 'REGULAR_SIZE_MAX';
        const fallbackMin = isNutrient ? 1800 : 900;
        const fallbackMax = isNutrient ? 3200 : 1800;

        let minSize = biomeConfig[minKey] || fallbackMin;
        let maxSize = biomeConfig[maxKey] || fallbackMax;
        const worldLimit = Math.max(120, Math.min(this.worldWidth, this.worldHeight) - 80);

        minSize = Math.min(minSize, worldLimit);
        maxSize = Math.min(Math.max(maxSize, minSize), worldLimit);

        const width = minSize + Math.random() * (maxSize - minSize);
        const aspect = 0.85 + Math.random() * 0.3;
        const height = Math.max(minSize, Math.min(maxSize, width * aspect));

        return { width, height };
    }

    /**
     * Create a random position that keeps a circular footprint inside the world.
     */
    createClampedPosition(radiusLikeSize) {
        const radius = Math.max(0, radiusLikeSize || 0);
        const minX = radius;
        const minY = radius;
        const maxX = Math.max(minX, this.worldWidth - radius);
        const maxY = Math.max(minY, this.worldHeight - radius);
        
        return {
            x: minX + Math.random() * Math.max(0, maxX - minX),
            y: minY + Math.random() * Math.max(0, maxY - minY)
        };
    }

    /**
     * Keep major biome webs from stacking directly on top of one another.
     */
    isValidBiomePosition(newBiome) {
        const newRadius = Math.max(newBiome.width, newBiome.height) / 2;
        const gap = Math.min(260, Math.max(120, newRadius * 0.25));
        
        for (const biome of this.biomes) {
            const biomeRadius = Math.max(biome.width, biome.height) / 2;
            const distance = Math.hypot(newBiome.x - biome.x, newBiome.y - biome.y);
            if (distance < newRadius + biomeRadius + gap) {
                return false;
            }
        }

        return true;
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
        
        const spawnerConfig = CELLVIVE_CONSTANTS.ENVIRONMENT.FOOD_SPAWNERS || {};
        const minRadius = spawnerConfig.MIN_RADIUS || 15;
        const maxRadius = spawnerConfig.MAX_RADIUS || 35;
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const position = this.createClampedPosition(radius);
        
        const options = {
            ...spawnerType,
            x: position.x,
            y: position.y,
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

    createRandomHazard(typeKey = null) {
        const settings = CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS;
        if (!settings) return null;
        if (!settings.ENABLED) return null;

        const hazardTypes = settings.TYPES || {};
        const keys = Object.keys(hazardTypes);
        if (keys.length === 0) return null;

        const key = typeKey || keys[Math.floor(Math.random() * keys.length)];
        const config = hazardTypes[key] || hazardTypes.TOXIC || hazardTypes[keys[0]];
        const radius = settings.MIN_SIZE + Math.random() * Math.max(0, settings.MAX_SIZE - settings.MIN_SIZE);
        const position = this.createClampedPosition(radius);

        return new Hazard({
            type: config.TYPE || key.toLowerCase(),
            name: config.NAME || key,
            x: position.x,
            y: position.y,
            radius,
            color: config.COLOR,
            damage: config.DAMAGE,
            damageInterval: config.DAMAGE_INTERVAL,
            slowMultiplier: config.SLOW_MULTIPLIER
        });
    }

    createRandomCurrent() {
        const settings = CELLVIVE_CONSTANTS.ENVIRONMENT.CURRENTS;
        if (!settings) return null;
        if (!settings.ENABLED) return null;

        const length = settings.MIN_LENGTH + Math.random() * Math.max(0, settings.MAX_LENGTH - settings.MIN_LENGTH);
        const width = settings.MIN_WIDTH + Math.random() * Math.max(0, settings.MAX_WIDTH - settings.MIN_WIDTH);
        const position = this.createClampedPosition(Math.max(length, width) / 2);
        const force = settings.MIN_FORCE + Math.random() * Math.max(0, settings.MAX_FORCE - settings.MIN_FORCE);

        return new Current({
            x: position.x,
            y: position.y,
            length,
            width,
            force,
            angle: Math.random() * Math.PI * 2
        });
    }

    scheduleNextEvent() {
        const settings = CELLVIVE_CONSTANTS.ENVIRONMENT.EVENTS;
        if (!settings?.ENABLED) {
            this.nextEventAt = Infinity;
            return;
        }

        const min = settings.MIN_INTERVAL || 45000;
        const max = settings.MAX_INTERVAL || min;
        this.nextEventAt = Date.now() + min + Math.random() * Math.max(0, max - min);
    }

    triggerRandomEvent(type = null) {
        const settings = CELLVIVE_CONSTANTS.ENVIRONMENT.EVENTS;
        if (!settings?.ENABLED) return null;

        const types = Object.values(settings.TYPES || {});
        const config = type
            ? types.find(eventType => eventType.TYPE === type)
            : types[Math.floor(Math.random() * types.length)];
        if (!config) return null;

        this.activeEvent = new EnvironmentalEvent({
            type: config.TYPE,
            name: config.NAME,
            color: config.COLOR,
            duration: settings.DURATION
        });

        this.applyEventBurst(this.activeEvent.type);
        return this.activeEvent;
    }

    applyEventBurst(type) {
        if (!this.game) return;

        if (type === 'nutrient_bloom' || type === 'spore_storm') {
            const count = type === 'spore_storm' ? 18 : 10;
            for (let i = 0; i < count; i++) {
                this.game.spawnManager?.spawnRandomSpore();
            }
        }

        if (type === 'toxic_bloom') {
            for (let i = 0; i < 3 && this.hazards.length < this.config.maxHazards; i++) {
                const hazard = this.createRandomHazard('TOXIC');
                if (hazard) this.hazards.push(hazard);
            }
        }

        if (type === 'current_surge') {
            for (let i = 0; i < 2 && this.currents.length < this.config.maxCurrents; i++) {
                const current = this.createRandomCurrent();
                if (current) this.currents.push(current);
            }
        }

        if (type === 'predator_migration') {
            for (let i = 0; i < 5 && this.game.enemies.length < this.game.config.maxEnemies; i++) {
                const enemy = this.game.spawnManager?.createRandomEnemy({ forceDanger: true });
                if (enemy) this.game.enemies.push(enemy);
            }
        }
    }

    getCurrentMultiplier() {
        return this.activeEvent?.type === 'current_surge' ? 2.2 : 1;
    }

    getSpawnMultipliers() {
        const multipliers = { cells: 1, enemies: 1, hazards: 1, currents: 1 };
        if (!this.activeEvent) return multipliers;

        switch (this.activeEvent.type) {
            case 'nutrient_bloom':
            case 'spore_storm':
                multipliers.cells = 2.4;
                break;
            case 'predator_migration':
                multipliers.enemies = 2.5;
                break;
            case 'toxic_bloom':
                multipliers.hazards = 2.8;
                break;
            case 'current_surge':
                multipliers.currents = 2.5;
                break;
        }

        return multipliers;
    }
    
    /**
     * Apply environmental effects to a cell
     */
    applyEffectsToCell(cell) {
        if (!cell) return;
        const now = Date.now();
        const currentMultiplier = this.getCurrentMultiplier();

        this.biomes.forEach(biome => {
            biome.applyEffects(cell);
        });

        this.hazards.forEach(hazard => {
            hazard.applyEffects(cell, now);
        });

        this.currents.forEach(current => {
            current.applyEffects(cell, currentMultiplier);
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
        const biomes = Array.isArray(this.biomes) ? this.biomes : [];
        const foodSpawners = Array.isArray(this.foodSpawners) ? this.foodSpawners : [];
        const hazards = Array.isArray(this.hazards) ? this.hazards : [];
        const currents = Array.isArray(this.currents) ? this.currents : [];
        return {
            biomes: biomes.map(biome => biome.getRenderProps()),
            foodSpawners: foodSpawners.map(obstacle => obstacle.getRenderProps()),
            hazards: hazards.map(hazard => hazard.getRenderProps()),
            currents: currents.map(current => current.getRenderProps(this.getCurrentMultiplier())),
            activeEvent: this.activeEvent ? this.activeEvent.getRenderProps() : null
        };
    }

    getActiveEffectsForCell(cell) {
        const effects = [];
        if (!cell) return effects;

        this.biomes.forEach(biome => {
            if (biome.containsCell(cell)) effects.push(biome.name || biome.type);
        });
        this.hazards.forEach(hazard => {
            if (hazard.containsCell(cell)) effects.push(hazard.name || hazard.type);
        });
        this.currents.forEach(current => {
            if (current.containsCell(cell)) effects.push('Current');
        });

        return effects;
    }

    getNearestThreat(cell) {
        if (!cell) return null;
        let nearest = null;

        const consider = (entry, label, radius = 0) => {
            const distance = Math.max(0, Math.hypot(entry.x - cell.x, entry.y - cell.y) - radius - (cell.radius || 0));
            if (!nearest || distance < nearest.distance) {
                nearest = { label, distance, x: entry.x, y: entry.y };
            }
        };

        this.hazards.forEach(hazard => consider(hazard, hazard.name || 'Hazard', hazard.radius));
        if (this.game && Array.isArray(this.game.enemies)) {
            this.game.enemies.forEach(enemy => consider(enemy, enemy.enemyType || 'Enemy', enemy.radius || 0));
        }

        return nearest;
    }

    getEventStatus() {
        return this.activeEvent ? this.activeEvent.getRenderProps() : null;
    }
    
    /**
     * Get statistics about the environment
     */
    getStats() {
        return {
            biomes: this.biomes.length,
            foodSpawners: this.foodSpawners.length,
            hazards: this.hazards.length,
            currents: this.currents.length,
            activeEvent: this.activeEvent ? this.activeEvent.name : null
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
        this.hazards = [];
        this.currents = [];
        this.activeEvent = null;
        this.scheduleNextEvent();
        console.log('🌍 Environment cleared');
    }
}

// Export for use in other modules
window.Hazard = Hazard;
window.Current = Current;
window.EnvironmentalEvent = EnvironmentalEvent;
window.EnvironmentManager = EnvironmentManager;
