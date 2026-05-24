class SpawnManager {
    constructor() {
        this.nextSquadId = 1;
    }

    getAIConfig() {
        if (typeof EnemyAIConfig !== 'undefined') return EnemyAIConfig;
        return {
            squads: {
                chance: 0.34,
                minSize: 2,
                maxSize: 4,
                formationSpacing: 44,
                patrolRouteLength: 3,
                roomPatrolChance: 0.7
            },
            dodge: {
                rangedChance: 0.65,
                gruntChance: 0.18,
                fastEliteChance: 1.0
            }
        };
    }

    populateMap(mapGen, enemiesArray, startPos, floorLevel, playerGearScore) {
        if (!mapGen) return;

        let baseCount = Math.floor((mapGen.cols * mapGen.rows) / 150);
        let enemyCountScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyCountScale : 0.05;
        let countMultiplier = Math.min(2.0, 1 + (floorLevel * enemyCountScale));
        let totalEnemies = Math.floor(baseCount * countMultiplier);

        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            totalEnemies = Math.floor(totalEnemies * DevConfig.enemyCountMultiplier);
        }

        const validTiles = this.collectValidSpawnTiles(mapGen, startPos);
        if (validTiles.length === 0) return;

        const scale = this.getDifficultyScales(floorLevel);
        while (enemiesArray.length < totalEnemies && validTiles.length > 0) {
            const remaining = totalEnemies - enemiesArray.length;
            const shouldSpawnSquad = remaining >= 2 && Math.random() < this.getAIConfig().squads.chance;

            if (shouldSpawnSquad) {
                this.spawnSquad(mapGen, enemiesArray, validTiles, remaining, scale);
            } else {
                const spawnPoint = this.takeRandomTile(validTiles);
                if (!spawnPoint) break;
                enemiesArray.push(this.createEnemy(spawnPoint.x, spawnPoint.y, this.rollEnemyType(), scale));
            }
        }

        console.log(`🗺️ Map populated with ${enemiesArray.length} enemies for Floor ${floorLevel}`);
    }

    collectValidSpawnTiles(mapGen, startPos) {
        const validTiles = [];
        const safeZoneRadius = 800;

        for (let y = 0; y < mapGen.rows; y++) {
            for (let x = 0; x < mapGen.cols; x++) {
                if (mapGen.getTile(x, y) !== 1) continue;
                if (mapGen.bossRoom && mapGen.isTileInsideRoom && mapGen.isTileInsideRoom(x, y, mapGen.bossRoom.room)) {
                    continue;
                }

                const world = this.tileToWorld(mapGen, x, y);
                const distToPlayer = Math.hypot(world.x - startPos.x, world.y - startPos.y);
                if (distToPlayer <= safeZoneRadius) continue;

                validTiles.push({ x: world.x, y: world.y, tileX: x, tileY: y, roomIndex: this.getRoomIndexForTile(mapGen, x, y) });
            }
        }

        return validTiles;
    }

    getDifficultyScales(floorLevel) {
        let hpScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2;
        let dmgScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2;
        const hpMultiplier = 1 + (floorLevel * hpScale);
        const dmgMultiplier = 1 + (floorLevel * dmgScale);
        let finalHpMult = hpMultiplier;
        let finalDmgMult = dmgMultiplier;

        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            finalHpMult *= DevConfig.enemyHpMultiplier;
            finalDmgMult *= DevConfig.enemyDmgMultiplier;
        }

        return { hp: finalHpMult, damage: finalDmgMult };
    }

    spawnSquad(mapGen, enemiesArray, validTiles, remaining, scale) {
        const config = this.getAIConfig().squads;
        const size = Math.min(remaining, config.minSize + Math.floor(Math.random() * (config.maxSize - config.minSize + 1)));
        const anchor = this.takeRandomTile(validTiles);
        if (!anchor) return;

        const squadId = `squad-${this.nextSquadId++}`;
        const route = this.buildPatrolRoute(mapGen, anchor);
        const formation = this.getFormationOffsets(size, config.formationSpacing);

        for (let i = 0; i < size; i++) {
            const offset = formation[i] || { x: 0, y: 0 };
            const spawn = this.findSpawnNear(validTiles, anchor.x + offset.x, anchor.y + offset.y) || (i === 0 ? anchor : this.takeRandomTile(validTiles));
            if (!spawn) break;

            const type = i === 0 ? this.rollSquadLeaderType() : this.rollEnemyType();
            enemiesArray.push(this.createEnemy(spawn.x, spawn.y, type, scale, {
                squadId,
                formationOffset: offset,
                patrolRoute: route,
                patrolIndex: i % Math.max(1, route.length)
            }));
        }
    }

    createEnemy(x, y, type, scale, options = {}) {
        const enemyOptions = { ...options };
        if (type === 'ranged' && !enemyOptions.spriteVariant) {
            enemyOptions.spriteVariant = this.rollRangedVariant();
        }
        if (type === 'brute' && !enemyOptions.spriteVariant) {
            enemyOptions.spriteVariant = this.rollBruteVariant();
        }

        return new Enemy(x, y, type, scale.hp, scale.damage, {
            ...enemyOptions,
            dodgeProfile: this.rollDodgeProfileForType(type)
        });
    }

    rollEnemyType() {
        const roll = Math.random();
        if (roll > 0.9) return 'brute';
        if (roll > 0.7) return 'ranged';
        return this.rollGruntVariant();
    }

    rollSquadLeaderType() {
        const roll = Math.random();
        if (roll > 0.82) return 'brute';
        if (roll > 0.48) return 'ranged';
        return this.rollGruntVariant();
    }

    rollGruntVariant() {
        return Math.random() < 0.25 ? 'brown_grunt' : 'grunt';
    }

    rollRangedVariant() {
        return Math.random() < 0.5 ? 'mage' : 'crossbow';
    }

    rollBruteVariant() {
        const roll = Math.random();
        if (roll < 1 / 3) return 'blue';
        if (roll < 2 / 3) return 'purple';
        return 'red';
    }

    rollDodgeProfileForType(type) {
        const dodge = this.getAIConfig().dodge;
        if (type === 'brute' || type === 'boss') return null;
        if (type === 'ranged' && Math.random() < dodge.rangedChance) {
            return { cooldown: 3.8, duration: 0.22, speed: 285 };
        }
        if ((type === 'grunt' || type === 'brown_grunt') && Math.random() < dodge.gruntChance) {
            return { cooldown: 4.7, duration: 0.2, speed: 260 };
        }
        return null;
    }

    buildPatrolRoute(mapGen, anchor) {
        const config = this.getAIConfig().squads;
        const route = [{ x: anchor.x, y: anchor.y }];
        const roomRoute = Math.random() < config.roomPatrolChance ? this.buildRoomPatrolRoute(mapGen, anchor, config.patrolRouteLength) : [];

        for (const point of roomRoute) {
            if (route.length >= config.patrolRouteLength) break;
            route.push(point);
        }

        while (route.length < config.patrolRouteLength) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 140 + Math.random() * 220;
            const x = anchor.x + Math.cos(angle) * dist;
            const y = anchor.y + Math.sin(angle) * dist;
            if (this.isWorldFloor(mapGen, x, y)) {
                route.push({ x, y });
            } else {
                break;
            }
        }

        return route;
    }

    buildRoomPatrolRoute(mapGen, anchor, maxPoints) {
        if (!mapGen || !mapGen.rooms || !mapGen.rooms.length) return [];
        const candidates = mapGen.rooms
            .filter(room => !room.isBossRoom && room.center)
            .map(room => {
                const world = this.tileToWorld(mapGen, room.center.x, room.center.y);
                return { x: world.x, y: world.y, dist: Math.hypot(world.x - anchor.x, world.y - anchor.y) };
            })
            .filter(point => point.dist > 30)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, Math.max(1, maxPoints + 2));

        const route = [];
        while (route.length < maxPoints - 1 && candidates.length > 0) {
            const index = Math.floor(Math.random() * candidates.length);
            const point = candidates.splice(index, 1)[0];
            if (this.isWorldFloor(mapGen, point.x, point.y)) {
                route.push({ x: point.x, y: point.y });
            }
        }
        return route;
    }

    getFormationOffsets(size, spacing) {
        const patterns = [
            { x: 0, y: 0 },
            { x: -spacing, y: spacing * 0.55 },
            { x: spacing, y: spacing * 0.55 },
            { x: 0, y: spacing * 1.25 }
        ];
        return patterns.slice(0, size);
    }

    findSpawnNear(validTiles, x, y) {
        if (validTiles.length === 0) return null;
        let bestIndex = -1;
        let bestDist = Infinity;
        for (let i = 0; i < validTiles.length; i++) {
            const tile = validTiles[i];
            const dist = Math.hypot(tile.x - x, tile.y - y);
            if (dist < bestDist && dist <= 120) {
                bestDist = dist;
                bestIndex = i;
            }
        }
        if (bestIndex < 0) return null;
        return validTiles.splice(bestIndex, 1)[0];
    }

    takeRandomTile(validTiles) {
        if (validTiles.length === 0) return null;
        const randIndex = Math.floor(Math.random() * validTiles.length);
        return validTiles.splice(randIndex, 1)[0];
    }

    getRoomIndexForTile(mapGen, x, y) {
        if (!mapGen || !mapGen.rooms || !mapGen.isTileInsideRoom) return -1;
        for (let i = 0; i < mapGen.rooms.length; i++) {
            if (mapGen.isTileInsideRoom(x, y, mapGen.rooms[i])) return i;
        }
        return -1;
    }

    tileToWorld(mapGen, x, y) {
        if (mapGen && mapGen.tileToWorld) return mapGen.tileToWorld(x, y);
        return {
            x: x * mapGen.tileSize + mapGen.tileSize / 2,
            y: y * mapGen.tileSize + mapGen.tileSize / 2
        };
    }

    isWorldFloor(mapGen, x, y) {
        if (!mapGen) return false;
        const tileX = Math.floor(x / mapGen.tileSize);
        const tileY = Math.floor(y / mapGen.tileSize);
        return mapGen.getTile(tileX, tileY) === 1;
    }
}
