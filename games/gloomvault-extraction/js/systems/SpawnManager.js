class SpawnManager {
    constructor() {}

    populateMap(mapGen, enemiesArray, startPos, floorLevel, playerGearScore) {
        if (!mapGen) return;

        // Base calculation: e.g. 100x100 = 10000 / 150 = ~66 enemies base
        let baseCount = Math.floor((mapGen.cols * mapGen.rows) / 150);
        let enemyCountScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyCountScale : 0.1;
        let totalEnemies = Math.floor(baseCount * (1 + (floorLevel * enemyCountScale)));

        // Apply dev mode enemy count multiplier
        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            totalEnemies = Math.floor(totalEnemies * DevConfig.enemyCountMultiplier);
        }

        // Find valid spawn tiles
        const validTiles = [];
        const safeZoneRadius = 800;

        for (let y = 0; y < mapGen.rows; y++) {
            for (let x = 0; x < mapGen.cols; x++) {
                if (mapGen.getTile(x, y) === 1) { // Floor
                    const worldX = x * mapGen.tileSize + mapGen.tileSize / 2;
                    const worldY = y * mapGen.tileSize + mapGen.tileSize / 2;
                    
                    const distToPlayer = Math.hypot(worldX - startPos.x, worldY - startPos.y);
                    
                    if (distToPlayer > safeZoneRadius) {
                        validTiles.push({ x: worldX, y: worldY });
                    }
                }
            }
        }

        if (validTiles.length === 0) return; // Failsafe

        // Distribute enemies
        for (let i = 0; i < totalEnemies; i++) {
            if (validTiles.length === 0) break; // Out of valid spawn points

            // Pick a random tile and remove it from array so enemies don't stack exactly
            const randIndex = Math.floor(Math.random() * validTiles.length);
            const spawnPoint = validTiles.splice(randIndex, 1)[0];

            // Determine type by weights (70% grunt, 20% ranged, 10% brute)
            let type = 'grunt';
            const roll = Math.random();
            if (roll > 0.9) {
                type = 'brute';
            } else if (roll > 0.7) {
                type = 'ranged';
            }

            let hpScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2;
            let dmgScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2;
            const hpMultiplier = 1 + (floorLevel * hpScale);
            const dmgMultiplier = 1 + (floorLevel * dmgScale);

            // Apply dev mode multipliers
            let finalHpMult = hpMultiplier;
            let finalDmgMult = dmgMultiplier;
            if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
                finalHpMult *= DevConfig.enemyHpMultiplier;
                finalDmgMult *= DevConfig.enemyDmgMultiplier;
            }

            const enemy = new Enemy(spawnPoint.x, spawnPoint.y, type, finalHpMult, finalDmgMult);
            enemiesArray.push(enemy);
        }

        console.log(`🗺️ Map populated with ${enemiesArray.length} enemies for Floor ${floorLevel}`);
    }
}
