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
        const random = Math.random();
        let targetZone;
        if (random < zoneWeights.SAFE_ZONE) {
            targetZone = 'SAFE_ZONE';
        } else if (random < zoneWeights.SAFE_ZONE + zoneWeights.NORMAL_ZONE) {
            targetZone = 'NORMAL_ZONE';
        } else if (random < zoneWeights.SAFE_ZONE + zoneWeights.NORMAL_ZONE + zoneWeights.DANGER_ZONE) {
            targetZone = 'DANGER_ZONE';
        } else {
            return null;
        }
        const worldCenterX = this.config.worldWidth / 2;
        const worldCenterY = this.config.worldHeight / 2;
        const zones = CELLVIVE_CONSTANTS.WORLD.ZONES;
        let x, y;
        if (targetZone === 'SAFE_ZONE') {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * zones.SAFE_ZONE.RADIUS;
            x = worldCenterX + Math.cos(angle) * distance;
            y = worldCenterY + Math.sin(angle) * distance;
        } else if (targetZone === 'NORMAL_ZONE') {
            const minRadius = zones.SAFE_ZONE.RADIUS + 50;
            const maxRadius = zones.NORMAL_ZONE.RADIUS;
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (maxRadius - minRadius);
            x = worldCenterX + Math.cos(angle) * distance;
            y = worldCenterY + Math.sin(angle) * distance;
        } else if (targetZone === 'DANGER_ZONE') {
            const minRadius = zones.NORMAL_ZONE.RADIUS + 50;
            const maxRadius = zones.DANGER_ZONE.RADIUS;
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (maxRadius - minRadius);
            x = worldCenterX + Math.cos(angle) * distance;
            y = worldCenterY + Math.sin(angle) * distance;
        }
        x = Math.max(50, Math.min(this.config.worldWidth - 50, x));
        y = Math.max(50, Math.min(this.config.worldHeight - 50, y));
        let radius, speed;
        switch (targetZone) {
            case 'SAFE_ZONE':
                radius = 5 + Math.random() * 10;
                speed = 0.3 + Math.random() * 0.7;
                break;
            case 'NORMAL_ZONE':
                radius = 8 + Math.random() * 12;
                speed = 0.5 + Math.random() * 1.0;
                break;
            case 'DANGER_ZONE':
                radius = 12 + Math.random() * 18;
                speed = 0.8 + Math.random() * 1.2;
                break;
            default:
                radius = 5 + Math.random() * 15;
                speed = 0.5 + Math.random() * 1.5;
        }
        const colors = ['#90EE90', '#32CD32', '#00FF7F', '#7CFC00', '#ADFF2F', '#9ACD32'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        return new Cell({
            x, y, radius, color, speed,
            isSpore: true,
            sporeType: 'growth_hormone',
            sporeData: {
                radius,
                growth: Math.ceil(radius / 5),
                size: Math.ceil(radius / 5),
                type: 'growth_hormone'
            }
        });
    }

    createRandomEnemy() {
        const enemyTypes = ['amoeba', 'virus'];
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        let x, y, targetZone;
        const zoneWeights = {
            SAFE_ZONE: 0.0,
            NORMAL_ZONE: 0.2,
            DANGER_ZONE: 0.5,
            DEATH_ZONE: 0.3
        };
        const random = Math.random();
        if (random < zoneWeights.NORMAL_ZONE) {
            targetZone = 'NORMAL_ZONE';
        } else if (random < zoneWeights.NORMAL_ZONE + zoneWeights.DANGER_ZONE) {
            targetZone = 'DANGER_ZONE';
        } else {
            targetZone = 'DEATH_ZONE';
        }
        const worldCenterX = this.config.worldWidth / 2;
        const worldCenterY = this.config.worldHeight / 2;
        const zones = CELLVIVE_CONSTANTS.WORLD.ZONES;
        if (targetZone === 'NORMAL_ZONE') {
            const minRadius = zones.SAFE_ZONE.RADIUS + 50;
            const maxRadius = zones.NORMAL_ZONE.RADIUS;
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (maxRadius - minRadius);
            x = worldCenterX + Math.cos(angle) * distance;
            y = worldCenterY + Math.sin(angle) * distance;
        } else if (targetZone === 'DANGER_ZONE') {
            const minRadius = zones.NORMAL_ZONE.RADIUS + 50;
            const maxRadius = zones.DANGER_ZONE.RADIUS;
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (maxRadius - minRadius);
            x = worldCenterX + Math.cos(angle) * distance;
            y = worldCenterY + Math.sin(angle) * distance;
        } else if (targetZone === 'DEATH_ZONE') {
            const minRadius = zones.DANGER_ZONE.RADIUS + 100;
            const maxRadius = Math.min(this.config.worldWidth, this.config.worldHeight) / 2 - 100;
            const angle = Math.random() * Math.PI * 2;
            const distance = minRadius + Math.random() * (maxRadius - minRadius);
            x = worldCenterX + Math.cos(angle) * distance;
            y = worldCenterY + Math.sin(angle) * distance;
        }
        x = Math.max(50, Math.min(this.config.worldWidth - 50, x));
        y = Math.max(50, Math.min(this.config.worldHeight - 50, y));
        const zoneParams = this.getZoneBasedEnemyParams(targetZone);
        if (!zoneParams) return null;
        const enemyOptions = { x, y, radius: zoneParams.radius, speed: zoneParams.speed };
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
            case 'DEATH_ZONE': return { ...baseParams, radius: Math.max(30, this.player.radius * (0.8 + Math.random() * 0.6)), speed: 0.6 + Math.random() * 0.6 };
            default: return baseParams;
        }
    }

    spawnFoodCell() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 200;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const colors = ['#90EE90', '#32CD32', '#00FF7F', '#7CFC00', '#ADFF2F', '#9ACD32'];
        const radius = 8 + Math.random() * 12;
        const cell = new Cell({
            x, y, radius, color: colors[Math.floor(Math.random() * colors.length)],
            speed: 0.5 + Math.random() * 1.0,
            isSpore: true,
            sporeType: 'growth_hormone',
            sporeData: { radius, growth: Math.ceil(radius / 5), size: Math.ceil(radius / 5), type: 'growth_hormone' }
        });
        this.cells.push(cell);
        console.log('Spawned edible food cell at:', x, y, 'isSpore:', cell.isSpore);
    }

    spawnPowerUp() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 250;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        if (this.powerUpManager) {
            this.powerUpManager.spawnPowerUp(x, y);
            console.log('Spawned power-up at:', x, y);
        }
    }

    spawnAmoeba() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const amoeba = new AmoebaEnemy({ x, y, radius: 20 + Math.random() * 15, speed: 0.4 + Math.random() * 0.3 });
        this.enemies.push(amoeba);
        console.log('Spawned amoeba at:', x, y);
    }

    spawnVirus() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const virus = new VirusEnemy({ x, y, radius: 18 + Math.random() * 12, speed: 0.5 + Math.random() * 0.4 });
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
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 400;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
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
        const canvasSize = Math.max(this.canvas.width, this.canvas.height);
        const baseSize = canvasSize * 0.6;
        const sizeVariation = canvasSize * 0.3;
        const biome = new Biome({
            x, y, width: baseSize + Math.random() * sizeVariation,
            height: baseSize + Math.random() * sizeVariation, ...biomeConfig
        });
        this.environmentManager.biomes.push(biome);
        console.log(`Spawned ${displayName} at:`, x, y, 'with config:', biomeConfig);
    }

    spawnFoodSpawner() {
        if (!this.player || !this.environmentManager) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 250 + Math.random() * 350;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const spawner = this.environmentManager.createRandomFoodSpawner();
        spawner.x = x;
        spawner.y = y;
        this.environmentManager.foodSpawners.push(spawner);
        GameLogger.debug(`Spawned FoodSpawner at: ${x.toFixed(0)}, ${y.toFixed(0)}`);
    }

    spawnGiantCell() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const giantCell = new Cell({
            x, y, radius: 80 + Math.random() * 40, color: '#FF6347',
            speed: 0.2 + Math.random() * 0.3, isSpore: true, sporeType: 'growth_hormone',
            sporeData: { radius: 80, growth: 20, size: 5, type: 'growth_hormone' }
        });
        this.cells.push(giantCell);
        console.log('Spawned giant cell at:', x, y);
    }

    spawnEnemySwarm() {
        if (!this.player) return;
        const swarmSize = 5 + Math.floor(Math.random() * 6);
        const swarmAngle = Math.random() * Math.PI * 2;
        const swarmDistance = 300 + Math.random() * 400;
        const swarmX = this.player.x + Math.cos(swarmAngle) * swarmDistance;
        const swarmY = this.player.y + Math.sin(swarmAngle) * swarmDistance;
        const enemyType = Math.random() < 0.5 ? 'amoeba' : 'virus';
        for (let i = 0; i < swarmSize; i++) {
            const offsetAngle = (i / swarmSize) * Math.PI * 2;
            const offsetDistance = 20 + Math.random() * 80;
            const ex = swarmX + Math.cos(offsetAngle) * offsetDistance;
            const ey = swarmY + Math.sin(offsetAngle) * offsetDistance;
            let enemy;
            if (enemyType === 'amoeba') {
                enemy = new AmoebaEnemy({ x: ex, y: ey, radius: 10 + Math.random() * 10, speed: 0.3 + Math.random() * 0.4 });
            } else {
                enemy = new VirusEnemy({ x: ex, y: ey, radius: 8 + Math.random() * 8, speed: 0.4 + Math.random() * 0.4 });
                if (this.virusGroupManager) this.virusGroupManager.registerVirus(enemy);
            }
            this.enemies.push(enemy);
        }
        console.log(`Spawned enemy swarm of ${swarmSize} enemies at:`, swarmX, swarmY);
    }

    spawnPowerUpStorm() {
        if (!this.player) return;
        const stormSize = 3 + Math.floor(Math.random() * 5);
        const stormAngle = Math.random() * Math.PI * 2;
        const stormDistance = 200 + Math.random() * 300;
        const stormX = this.player.x + Math.cos(stormAngle) * stormDistance;
        const stormY = this.player.y + Math.sin(stormAngle) * stormDistance;
        for (let i = 0; i < stormSize; i++) {
            const offsetAngle = (i / stormSize) * Math.PI * 2;
            const offsetDistance = 20 + Math.random() * 60;
            const px = stormX + Math.cos(offsetAngle) * offsetDistance;
            const py = stormY + Math.sin(offsetAngle) * offsetDistance;
            if (this.powerUpManager) this.powerUpManager.spawnPowerUp(px, py);
        }
        console.log(`Spawned power-up storm of ${stormSize} power-ups at:`, stormX, stormY);
    }

    spawnGreenSpore() { this.spawnRandomGreenSpore(); }

    spawnYellowSpore() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const spore = new Cell({
            x, y,
            radius: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW.RADIUS,
            color: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW.COLOR,
            isSpore: true, sporeType: 'speed_boost',
            sporeData: {
                radius: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW.RADIUS,
                growth: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW.GROWTH,
                type: 'speed_boost',
                speedBoost: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.YELLOW.SPEED_BOOST
            }
        });
        this.cells.push(spore);
        GameLogger.debug('Spawned Yellow Speed Spore');
    }

    spawnOrangeSpore() {
        if (!this.player) return;
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const spore = new Cell({
            x, y,
            radius: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.ORANGE.RADIUS,
            color: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.ORANGE.COLOR,
            isSpore: true, sporeType: 'talent_upgrade',
            sporeData: {
                radius: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.ORANGE.RADIUS,
                growth: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.ORANGE.GROWTH,
                type: 'talent_upgrade'
            }
        });
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
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 300;
        const x = this.player.x + Math.cos(angle) * distance;
        const y = this.player.y + Math.sin(angle) * distance;
        const growthValue = CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.GROWTH_VALUES[variant];
        const sizeMap = { SMALL: 1, MEDIUM: 2, LARGE: 3, XLARGE: 4, XXLARGE: 5 };
        const spore = new Cell({
            x, y, radius: growthValue.radius,
            color: CELLVIVE_CONSTANTS.ENVIRONMENT.SPORE_TYPES.GREEN.COLOR,
            isSpore: true, sporeType: 'growth_hormone',
            sporeData: { radius: growthValue.radius, growth: growthValue.growth, size: sizeMap[variant] || 1, type: 'growth_hormone' }
        });
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
        const sporeTypes = ['green', 'yellow', 'orange'];
        const randomType = sporeTypes[Math.floor(Math.random() * sporeTypes.length)];
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
