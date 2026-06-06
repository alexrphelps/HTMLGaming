class SpawnManager {
    constructor(game) {
        this.game = game;
    }

    get config() { return this.game.config; }
    get player() { return this.game.player; }
    get cells() { return this.game.cells; }
    get enemies() { return this.game.enemies; }
    get powerUpManager() { return this.game.powerUpManager; }
    get virusGroupManager() { return this.game.virusGroupManager; }
    get environmentManager() { return this.game.environmentManager; }
    get canvas() { return this.game.canvas; }

    spawnInitialCells(count = CELLVIVE_CONSTANTS.CELLS.INITIAL_COUNT || 0) {
        for (let i = 0; i < count && this.cells.length < this.config.maxCells; i++) {
            const cell = this.createRandomCell();
            if (cell) this.cells.push(cell);
        }
    }

    spawnInitialEnemies(count = CELLVIVE_CONSTANTS.ENEMIES.INITIAL_COUNT || 0) {
        for (let i = 0; i < count && this.enemies.length < this.config.maxEnemies; i++) {
            const enemy = this.createRandomEnemy();
            if (enemy) this.enemies.push(enemy);
        }
    }

    clampPosition(x, y, radius = 0) {
        const margin = Math.max(50, radius);
        return {
            x: Math.max(margin, Math.min(this.config.worldWidth - margin, x)),
            y: Math.max(margin, Math.min(this.config.worldHeight - margin, y))
        };
    }

    createNearbyPosition(minDistance, maxDistance, radius = 0) {
        if (!this.player) return this.clampPosition(this.config.worldWidth / 2, this.config.worldHeight / 2, radius);
        const angle = Math.random() * Math.PI * 2;
        const distance = minDistance + Math.random() * Math.max(0, maxDistance - minDistance);
        return this.clampPosition(
            this.player.x + Math.cos(angle) * distance,
            this.player.y + Math.sin(angle) * distance,
            radius
        );
    }

    createPositionInZone(targetZone, radius = 0) {
        const worldCenterX = this.config.worldWidth / 2;
        const worldCenterY = this.config.worldHeight / 2;
        const zones = CELLVIVE_CONSTANTS.WORLD.ZONES;
        const zoneRanges = {
            SAFE_ZONE: [0, zones.SAFE_ZONE.RADIUS],
            NORMAL_ZONE: [zones.SAFE_ZONE.RADIUS + 50, zones.NORMAL_ZONE.RADIUS],
            DANGER_ZONE: [zones.NORMAL_ZONE.RADIUS + 50, zones.DANGER_ZONE.RADIUS],
            DEATH_ZONE: [zones.DANGER_ZONE.RADIUS + 100, Math.min(this.config.worldWidth, this.config.worldHeight) / 2 - 100]
        };
        const [minRadius, maxRadius] = zoneRanges[targetZone] || zoneRanges.SAFE_ZONE;
        const angle = Math.random() * Math.PI * 2;
        const distance = minRadius + Math.random() * Math.max(0, maxRadius - minRadius);

        return this.clampPosition(
            worldCenterX + Math.cos(angle) * distance,
            worldCenterY + Math.sin(angle) * distance,
            radius
        );
    }

    pickWeightedZone(weights) {
        const entries = Object.entries(weights).filter(([, weight]) => weight > 0);
        const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let roll = Math.random() * totalWeight;

        for (const [zone, weight] of entries) {
            roll -= weight;
            if (roll <= 0) return zone;
        }

        return entries[entries.length - 1]?.[0] || 'SAFE_ZONE';
    }

    pickWeightedSporeType() {
        const sporeTypes = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES;
        const weights = {
            green: sporeTypes.GREEN.SPAWN_WEIGHT,
            yellow: sporeTypes.YELLOW.SPAWN_WEIGHT,
            orange: sporeTypes.ORANGE.SPAWN_WEIGHT
        };
        const entries = Object.entries(weights);
        const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let roll = Math.random() * totalWeight;

        for (const [type, weight] of entries) {
            roll -= weight;
            if (roll <= 0) return type;
        }

        return 'green';
    }

    pickGreenVariant() {
        const variants = Object.keys(CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.GROWTH_VALUES);
        return variants[Math.floor(Math.random() * variants.length)];
    }

    createSporeAt(x, y, type = 'green', options = {}) {
        if (type === 'yellow') {
            const config = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW;
            const position = this.clampPosition(x, y, config.RADIUS);
            return new Cell({
                ...position,
                radius: config.RADIUS,
                color: config.COLOR,
                speed: options.speed || CELLVIVE_CONSTANTS.CELLS.SPEED,
                isSpore: true,
                sporeType: config.TYPE,
                sporeData: { radius: config.RADIUS, growth: config.GROWTH, type: config.TYPE, speedBoost: config.SPEED_BOOST }
            });
        }

        if (type === 'orange') {
            const config = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.ORANGE;
            const position = this.clampPosition(x, y, config.RADIUS);
            return new Cell({
                ...position,
                radius: config.RADIUS,
                color: config.COLOR,
                speed: options.speed || CELLVIVE_CONSTANTS.CELLS.SPEED,
                isSpore: true,
                sporeType: config.TYPE,
                sporeData: { radius: config.RADIUS, growth: config.GROWTH, type: config.TYPE }
            });
        }

        const variant = options.variant || this.pickGreenVariant();
        const growthValue = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.GROWTH_VALUES[variant];
        const sizeMap = { SMALL: 1, MEDIUM: 2, LARGE: 3, XLARGE: 4, XXLARGE: 5 };
        const position = this.clampPosition(x, y, growthValue.radius);
        return new Cell({
            ...position,
            radius: growthValue.radius,
            color: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.COLOR,
            speed: options.speed || CELLVIVE_CONSTANTS.CELLS.SPEED,
            isSpore: true,
            sporeType: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.TYPE,
            sporeData: {
                radius: growthValue.radius,
                growth: growthValue.growth,
                size: sizeMap[variant] || 1,
                type: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.TYPE
            }
        });
    }

    spawnCells() {
        if (this.cells.length >= this.config.maxCells) return;
        if (Math.random() < this.config.cellSpawnRate) {
            const cell = this.createRandomCell();
            if (cell) {
                this.cells.push(cell);
                if (this.cells.length <= 5) {
                    GameLogger.debug(`Food cell #${this.cells.length}: radius ${cell.radius.toFixed(1)} at (${cell.x.toFixed(0)}, ${cell.y.toFixed(0)})`);
                }
            }
        }
    }

    spawnEnemies() {
        if (this.enemies.length >= this.config.maxEnemies) return;
        if (Math.random() < this.config.enemySpawnRate) {
            const enemy = this.createRandomEnemy();
            if (enemy) {
                this.enemies.push(enemy);
            }
        }
    }

    createRandomCell() {
        const zoneWeights = {
            SAFE_ZONE: 0.6,
            NORMAL_ZONE: 0.3,
            DANGER_ZONE: 0.1,
            DEATH_ZONE: 0.0
        };
        const targetZone = this.pickWeightedZone(zoneWeights);
        const position = this.createPositionInZone(targetZone);
        let speed;
        switch (targetZone) {
            case 'SAFE_ZONE':
                speed = 0.3 + Math.random() * 0.7;
                break;
            case 'NORMAL_ZONE':
                speed = 0.5 + Math.random() * 1.0;
                break;
            case 'DANGER_ZONE':
                speed = 0.8 + Math.random() * 1.2;
                break;
            default:
                speed = 0.5 + Math.random() * 1.5;
        }

        return this.createSporeAt(position.x, position.y, this.pickWeightedSporeType(), { speed });
    }

    createRandomEnemy() {
        const enemyTypes = ['amoeba', 'virus'];
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const zoneWeights = {
            SAFE_ZONE: 0.0,
            NORMAL_ZONE: 0.2,
            DANGER_ZONE: 0.5,
            DEATH_ZONE: 0.3
        };
        const targetZone = this.pickWeightedZone(zoneWeights);
        const zoneParams = this.getZoneBasedEnemyParams(targetZone);
        if (!zoneParams) return null;
        const position = this.createPositionInZone(targetZone, zoneParams.radius);
        const enemyOptions = { x: position.x, y: position.y, radius: zoneParams.radius, speed: zoneParams.speed };
        try {
            if (enemyType === 'amoeba') return new AmoebaEnemy(enemyOptions);
            if (enemyType === 'virus') return new VirusEnemy(enemyOptions);
        } catch (error) {
            console.warn('Failed to create enemy:', error);
            return null;
        }
        return null;
    }

    getZoneBasedEnemyParams(zone) {
        const baseParams = { radius: 15 + Math.random() * 10, speed: 0.4 + Math.random() * 0.3 };
        switch (zone) {
            case 'SAFE_ZONE': return null;
            case 'NORMAL_ZONE': return { ...baseParams, radius: 10 + Math.random() * 15, speed: 0.3 + Math.random() * 0.4 };
            case 'DANGER_ZONE': return { ...baseParams, radius: 20 + Math.random() * 25, speed: 0.5 + Math.random() * 0.5 };
            case 'DEATH_ZONE': return { ...baseParams, radius: Math.max(30, (this.player?.radius || 20) * (0.8 + Math.random() * 0.6)), speed: 0.6 + Math.random() * 0.6 };
            default: return baseParams;
        }
    }

    spawnFoodCell() {
        if (!this.player) return;
        const position = this.createNearbyPosition(100, 300);
        const cell = this.createSporeAt(position.x, position.y, 'green', { speed: 0.5 + Math.random() * 1.0 });
        this.cells.push(cell);
        console.log('Spawned edible food cell at:', cell.x, cell.y, 'isSpore:', cell.isSpore);
    }

    spawnPowerUp() {
        if (!this.player) return;
        const { x, y } = this.createNearbyPosition(150, 400);
        if (this.powerUpManager) {
            this.powerUpManager.spawnPowerUp(x, y);
            console.log('Spawned power-up at:', x, y);
        }
    }

    spawnAmoeba() {
        if (!this.player) return;
        const radius = 20 + Math.random() * 15;
        const { x, y } = this.createNearbyPosition(200, 500, radius);
        const amoeba = new AmoebaEnemy({ x, y, radius, speed: 0.4 + Math.random() * 0.3 });
        this.enemies.push(amoeba);
        console.log('Spawned amoeba at:', x, y);
    }

    spawnVirus() {
        if (!this.player) return;
        const radius = 18 + Math.random() * 12;
        const { x, y } = this.createNearbyPosition(200, 500, radius);
        const virus = new VirusEnemy({ x, y, radius, speed: 0.5 + Math.random() * 0.4 });
        this.enemies.push(virus);
        if (this.virusGroupManager) {
            this.virusGroupManager.registerVirus(virus);
        }
        console.log('Spawned virus at:', x, y);
    }

    spawnBiome(biomeType) {
        const displayNames = {
            'toxic': 'Toxic Zone', 'aggressive': 'Aggressive Zone', 'nutrient': 'Nutrient Rich Zone',
            'slow': 'Slow Zone', 'energy': 'Energy Zone', 'neutral': 'Neutral Zone'
        };
        this.spawnSpecificBiome(biomeType, displayNames[biomeType] || 'Unknown Biome');
    }

    spawnBiomeNutrient() { this.spawnSpecificBiome('nutrient', 'Nutrient Rich Biome'); }
    spawnBiomeToxic() { this.spawnSpecificBiome('toxic', 'Toxic Biome'); }
    spawnBiomeSlow() { this.spawnSpecificBiome('slow', 'Slow Zone'); }
    spawnBiomeAggressive() { this.spawnSpecificBiome('aggressive', 'Aggressive Zone'); }
    spawnBiomeNeutral() { this.spawnSpecificBiome('neutral', 'Neutral Zone'); }

    spawnSpecificBiome(biomeType, displayName) {
        if (!this.player || !this.environmentManager) return;
        let biomeConfig = {};
        switch (biomeType) {
            case 'nutrient': biomeConfig = BiomeTypes.NUTRIENT_RICH; break;
            case 'toxic': biomeConfig = BiomeTypes.TOXIC; break;
            case 'slow': biomeConfig = BiomeTypes.SLOW_ZONE; break;
            case 'energy': biomeConfig = BiomeTypes.ENERGY_ZONE; break;
            case 'aggressive': biomeConfig = BiomeTypes.AGGRESSIVE; break;
            case 'neutral': biomeConfig = BiomeTypes.NEUTRAL; break;
            default: biomeConfig = BiomeTypes.NEUTRAL;
        }
        const canvasSize = Math.max(this.canvas?.width || this.config.canvasWidth || 800, this.canvas?.height || this.config.canvasHeight || 600);
        const baseSize = canvasSize * 0.6;
        const sizeVariation = canvasSize * 0.3;
        const width = baseSize + Math.random() * sizeVariation;
        const height = baseSize + Math.random() * sizeVariation;
        const { x, y } = this.createNearbyPosition(300, 700, Math.max(width, height) / 2);
        const biome = new Biome({
            x, y, width, height, ...biomeConfig
        });
        this.environmentManager.biomes.push(biome);
        console.log(`Spawned ${displayName} at:`, x, y, 'with config:', biomeConfig);
    }

    spawnFoodSpawner() {
        if (!this.player || !this.environmentManager) return;
        const spawner = this.environmentManager.createRandomFoodSpawner();
        const { x, y } = this.createNearbyPosition(250, 600, spawner.radius || 15);
        spawner.x = x;
        spawner.y = y;
        this.environmentManager.foodSpawners.push(spawner);
        GameLogger.debug(`Spawned FoodSpawner at: ${x.toFixed(0)}, ${y.toFixed(0)}`);
    }

    spawnGiantCell() {
        if (!this.player) return;
        const radius = 80 + Math.random() * 40;
        const { x, y } = this.createNearbyPosition(200, 500, radius);
        const giantCell = new Cell({
            x, y, radius, color: '#FF6347',
            speed: 0.2 + Math.random() * 0.3, isSpore: true, sporeType: 'growth_hormone',
            sporeData: { radius: 80, growth: 20, size: 5, type: 'growth_hormone' }
        });
        this.cells.push(giantCell);
        console.log('Spawned giant cell at:', x, y);
    }

    spawnEnemySwarm() {
        if (!this.player) return;
        const swarmSize = 5 + Math.floor(Math.random() * 6);
        const swarmCenter = this.createNearbyPosition(300, 700);
        const enemyType = Math.random() < 0.5 ? 'amoeba' : 'virus';
        for (let i = 0; i < swarmSize; i++) {
            const offsetAngle = (i / swarmSize) * Math.PI * 2;
            const offsetDistance = 20 + Math.random() * 80;
            let enemy;
            if (enemyType === 'amoeba') {
                const radius = 10 + Math.random() * 10;
                const { x, y } = this.clampPosition(swarmCenter.x + Math.cos(offsetAngle) * offsetDistance, swarmCenter.y + Math.sin(offsetAngle) * offsetDistance, radius);
                enemy = new AmoebaEnemy({ x, y, radius, speed: 0.3 + Math.random() * 0.4 });
            } else {
                const radius = 8 + Math.random() * 8;
                const { x, y } = this.clampPosition(swarmCenter.x + Math.cos(offsetAngle) * offsetDistance, swarmCenter.y + Math.sin(offsetAngle) * offsetDistance, radius);
                enemy = new VirusEnemy({ x, y, radius, speed: 0.4 + Math.random() * 0.4 });
                if (this.virusGroupManager) this.virusGroupManager.registerVirus(enemy);
            }
            this.enemies.push(enemy);
        }
        console.log(`Spawned enemy swarm of ${swarmSize} enemies at:`, swarmCenter.x, swarmCenter.y);
    }

    spawnPowerUpStorm() {
        if (!this.player) return;
        const stormSize = 3 + Math.floor(Math.random() * 5);
        const stormCenter = this.createNearbyPosition(200, 500);
        for (let i = 0; i < stormSize; i++) {
            const offsetAngle = (i / stormSize) * Math.PI * 2;
            const offsetDistance = 20 + Math.random() * 60;
            const { x, y } = this.clampPosition(stormCenter.x + Math.cos(offsetAngle) * offsetDistance, stormCenter.y + Math.sin(offsetAngle) * offsetDistance);
            if (this.powerUpManager) this.powerUpManager.spawnPowerUp(x, y);
        }
        console.log(`Spawned power-up storm of ${stormSize} power-ups at:`, stormCenter.x, stormCenter.y);
    }

    spawnGreenSpore() { this.spawnRandomGreenSpore(); }

    spawnYellowSpore() {
        if (!this.player) return;
        const { x, y } = this.createNearbyPosition(200, 500, CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW.RADIUS);
        const spore = this.createSporeAt(x, y, 'yellow');
        this.cells.push(spore);
        GameLogger.debug('Spawned Yellow Speed Spore');
    }

    spawnOrangeSpore() {
        if (!this.player) return;
        const { x, y } = this.createNearbyPosition(200, 500, CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.ORANGE.RADIUS);
        const spore = this.createSporeAt(x, y, 'orange');
        this.cells.push(spore);
        GameLogger.debug('Spawned Orange Talent Spore');
    }

    spawnGreenSmall() { this.spawnSpecificGreenSpore('SMALL', '+1 size'); }
    spawnGreenMedium() { this.spawnSpecificGreenSpore('MEDIUM', '+2 size'); }
    spawnGreenLarge() { this.spawnSpecificGreenSpore('LARGE', '+3 size'); }
    spawnGreenXLarge() { this.spawnSpecificGreenSpore('XLARGE', '+4 size'); }
    spawnGreenXXLarge() { this.spawnSpecificGreenSpore('XXLARGE', '+5 size'); }

    spawnSpecificGreenSpore(variant, description) {
        if (!this.player) return;
        const growthValue = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.GROWTH_VALUES[variant];
        const { x, y } = this.createNearbyPosition(200, 500, growthValue.radius);
        const spore = this.createSporeAt(x, y, 'green', { variant });
        this.cells.push(spore);
        GameLogger.debug(`Spawned Green ${variant} Spore: ${description}`);
    }

    spawnRandomGreenSpore() {
        if (!this.player) return;
        const variants = Object.keys(CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.GROWTH_VALUES);
        const randomVariant = variants[Math.floor(Math.random() * variants.length)];
        const description = `+${CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.GROWTH_VALUES[randomVariant].growth} size`;
        this.spawnSpecificGreenSpore(randomVariant, description);
    }

    spawnRandomSpore() {
        if (!this.player) return;
        const randomType = this.pickWeightedSporeType();
        switch (randomType) {
            case 'green': this.spawnRandomGreenSpore(); break;
            case 'yellow': this.spawnYellowSpore(); break;
            case 'orange': this.spawnOrangeSpore(); break;
        }
    }

    testSpawnerFunctionality() {
        if (!this.environmentManager) return;
        let totalSpawners = 0;
        let totalSporesSpawned = 0;
        this.environmentManager.foodSpawners.forEach(spawner => {
            if (spawner.spawnSpore) {
                totalSpawners++;
                const initialSporeCount = this.cells.length;
                spawner.spawnSpore(this.game);
                totalSporesSpawned += (this.cells.length - initialSporeCount);
            }
        });
        GameLogger.debug(`Spawner Test: ${totalSpawners} spawners tested, ${totalSporesSpawned} spores spawned`);
    }

    testTalentSystem() {
        if (!this.player) return;
        for (let i = 0; i < 3; i++) {
            this.spawnOrangeSpore();
        }
        GameLogger.debug('Talent Test: Spawned 3 orange spores for testing');
    }

    testSpeedBoosts() {
        if (!this.player) return;
        for (let i = 0; i < 5; i++) {
            this.spawnYellowSpore();
        }
        GameLogger.debug('Speed Test: Spawned 5 yellow spores for testing');
    }
}

window.SpawnManager = SpawnManager;
