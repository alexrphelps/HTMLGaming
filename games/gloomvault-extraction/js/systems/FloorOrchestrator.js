class FloorOrchestrator {
    generateFloor(engine, isNextFloor) {
        const selectedMap = engine.selectMapConfig();
        engine.currentMapKey = selectedMap.key;
        engine.currentMapConfig = selectedMap.config;
        engine.mapCols = engine.currentMapConfig.cols;
        engine.mapRows = engine.currentMapConfig.rows;
        if (engine.runState && engine.runState.applyMapSelection) {
            engine.runState.applyMapSelection(selectedMap).syncFromEngine(engine);
        }
        console.log(`Generating map style: ${engine.currentMapKey}`);

        engine.mapGen = new MapGen(engine.currentMapConfig, engine.tileSize);
        engine.mapGen.mapKey = engine.currentMapKey;
        engine.mapGen.generate();
        engine.camera.setBounds(engine.mapCols * engine.tileSize, engine.mapRows * engine.tileSize);

        const startPos = engine.mapGen.getStartPos();
        if (!isNextFloor || !engine.player) {
            engine.player = new Player(startPos.x, startPos.y);
            try {
                const loadout = engine.loadoutService
                    ? engine.loadoutService.preparePlayerForRun(engine.player)
                    : null;
                if (loadout) {
                    engine.playerGearScore = loadout.gearScore;
                    if (!isNextFloor) {
                        engine.gearDifficultyFloor = loadout.gearDifficultyFloor;
                        engine.currentFloor = 1;
                    }
                }
            } catch (e) {
                console.error('Failed to load equipment', e);
            }
        } else {
            engine.player.x = startPos.x;
            engine.player.y = startPos.y;
            engine.player.projectiles = [];
        }

        const effectiveFloorLevel = engine.getEffectiveFloorLevel();
        this.resetFloorEntities(engine);

        engine.spawnManager.populateMap(
            engine.mapGen,
            engine.enemies,
            startPos,
            effectiveFloorLevel,
            engine.playerGearScore
        );

        if (engine.mapGen.bossRoom) {
            engine.spawnBossRoomEntities(effectiveFloorLevel);
        }
        engine.spawnFloorGuardian(startPos, effectiveFloorLevel);
        this.spawnPortal(engine);
        this.spawnLootChest(engine);
        this.spawnTransitions(engine);
        engine.spawnDungeonServices(startPos);
        engine.ensureDungeonExit(startPos);

        return this.captureFloorState(engine);
    }

    resetFloorEntities(engine) {
        engine.projectiles = [];
        engine.enemies = [];
        engine.droppedItems = [];
        engine.lootChests = [];
        engine.bossRoomButtons = [];
        engine.dungeonServices = [];
        engine.trinketEffects = [];
        engine.decoys = [];
        engine.floorTransitions = [];
        engine.combatFeedback = new CombatFeedback();
        engine.particleSystem = new ParticleSystem();
    }

    spawnPortal(engine) {
        const rooms = engine.mapGen.rooms;
        const lastRoom = rooms[rooms.length - 1];
        if (lastRoom && engine.currentFloor % 2 === 0) {
            const validPortalPos = engine.mapGen.getValidFloorPosNear(lastRoom.center.x, lastRoom.center.y);
            engine.portal = new ExtractionPortal(validPortalPos.x, validPortalPos.y);
        } else {
            engine.portal = null;
        }
    }

    spawnLootChest(engine) {
        if (Math.random() >= 0.05) return;
        const validRooms = engine.mapGen.rooms.slice(1);
        if (validRooms.length === 0) return;
        const targetRoom = validRooms[Math.floor(Math.random() * validRooms.length)];
        const chestPos = engine.mapGen.getValidFloorPosNear(targetRoom.center.x, targetRoom.center.y);
        if (chestPos) {
            engine.lootChests.push(new LootChest(chestPos.x, chestPos.y));
        }
    }

    spawnTransitions(engine) {
        const minTransDist = typeof DifficultyConfig !== 'undefined' ? (DifficultyConfig.minTransitionDistance || 300) : 300;
        const numDoors = Math.floor(Math.random() * 3) + 1;
        const doorPositions = engine.mapGen.getDoorPositions(numDoors, [], minTransDist);
        for (const p of doorPositions) {
            engine.tryAddFloorTransition(p.x, p.y, 'door');
        }

        const numHoles = Math.floor(Math.random() * 3) + 1;
        const holePositions = engine.mapGen.getHolePositions(numHoles, doorPositions, minTransDist);
        for (const p of holePositions) {
            engine.tryAddFloorTransition(p.x, p.y, 'hole');
        }
    }

    captureFloorState(engine) {
        return {
            mapGen: engine.mapGen,
            player: engine.player,
            enemies: engine.enemies,
            projectiles: engine.projectiles,
            lootChests: engine.lootChests,
            floorTransitions: engine.floorTransitions,
            portal: engine.portal,
            dungeonServices: engine.dungeonServices,
            bossRoomButtons: engine.bossRoomButtons,
            droppedItems: engine.droppedItems,
            trinketEffects: engine.trinketEffects,
            decoys: engine.decoys,
            combatFeedback: engine.combatFeedback,
            particleSystem: engine.particleSystem
        };
    }
}

if (typeof window !== 'undefined') {
    window.FloorOrchestrator = FloorOrchestrator;
}
