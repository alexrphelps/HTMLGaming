class EncounterService {
    getVisibleBossEncounters(engine) {
        return (engine.enemies || [])
            .filter(enemy => enemy && (enemy.isBossTier || enemy.isBoss) && enemy.hp > 0 && (enemy.hasTakenPlayerDamage || enemy.isAggroed));
    }

    createBossEnemy(engine, x, y, encounterProfile, hpMult, dmgMult, extraOptions = {}) {
        const enemy = new Enemy(x, y, encounterProfile.baseType || 'boss', hpMult, dmgMult, {
            ...extraOptions,
            bossProfile: encounterProfile,
            aiProfile: encounterProfile.aiProfile || encounterProfile.baseType || 'boss'
        });
        if (enemy.triggerBossHooks) {
            enemy.triggerBossHooks('onSpawn', engine, {});
        }
        return enemy;
    }

    spawnBossRoomEntities(engine, effectiveFloorLevel) {
        const bossRoom = engine.mapGen.bossRoom;
        if (!bossRoom) return null;

        const hpScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2;
        const dmgScale = typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2;
        let hpMult = 1 + (effectiveFloorLevel * hpScale);
        let dmgMult = 1 + (effectiveFloorLevel * dmgScale);

        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            hpMult *= DevConfig.enemyHpMultiplier;
            dmgMult *= DevConfig.enemyDmgMultiplier;
        }

        const encounterProfile = typeof BossConfig !== 'undefined' && BossConfig.pickMainBoss
            ? BossConfig.pickMainBoss()
            : null;
        const boss = encounterProfile
            ? this.createBossEnemy(engine, bossRoom.bossSpawn.x, bossRoom.bossSpawn.y, encounterProfile, hpMult, dmgMult)
            : new Enemy(bossRoom.bossSpawn.x, bossRoom.bossSpawn.y, 'boss', hpMult, dmgMult);
        engine.enemies.push(boss);

        const chestCount = Math.floor(Math.random() * 2) + 2;
        const chestSpawns = bossRoom.chestSpawns || [bossRoom.chestSpawn];
        for (let i = 0; i < chestCount; i++) {
            const spawn = chestSpawns[i % chestSpawns.length];
            engine.lootChests.push(new LootChest(spawn.x, spawn.y, true));
        }
        engine.bossRoomButtons = bossRoom.buttonPositions.map((pos, index) => new BossRoomButton(pos.x, pos.y, index));
        return boss;
    }

    spawnFloorGuardian(engine, startPos, effectiveFloorLevel) {
        if (typeof BossConfig === 'undefined' || !BossConfig.pickFloorGuardian) return null;
        if (Math.random() >= 0.08) return null;

        const validTiles = engine.spawnManager && engine.spawnManager.collectValidSpawnTiles
            ? engine.spawnManager.collectValidSpawnTiles(engine.mapGen, startPos)
            : [];
        if (!validTiles || validTiles.length === 0) return null;

        const spawnPoint = validTiles[Math.floor(Math.random() * validTiles.length)];
        if (!spawnPoint) return null;

        let hpMult = 1 + (effectiveFloorLevel * ((typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyHpScale : 0.2) + 0.12));
        let dmgMult = 1 + (effectiveFloorLevel * ((typeof DifficultyConfig !== 'undefined' ? DifficultyConfig.enemyDamageScale : 0.2) + 0.08));
        if (typeof DevConfig !== 'undefined' && DevConfig.DEV_MODE_ENABLED) {
            hpMult *= DevConfig.enemyHpMultiplier;
            dmgMult *= DevConfig.enemyDmgMultiplier;
        }

        const guardianProfile = BossConfig.pickFloorGuardian();
        const guardian = this.createBossEnemy(engine, spawnPoint.x, spawnPoint.y, guardianProfile, hpMult, dmgMult);
        engine.enemies.push(guardian);
        return guardian;
    }

    dropBossEncounterLoot(engine, enemy) {
        if (!enemy) return null;
        if (!enemy.bossTier || enemy.bossTier === 'mainBoss') {
            LootChest.dropChestLoot(enemy.x, enemy.y, engine, 'Boss Defeated!');
            engine.unlockBossRoomChests();
            engine.camera.shake(12, 0.35);
            if (enemy.triggerBossHooks) {
                enemy.triggerBossHooks('onDeath', engine, {});
            }
            return true;
        }

        const lootProfile = enemy.bossProfile && enemy.bossProfile.lootProfile ? enemy.bossProfile.lootProfile : {};
        const minRarity = lootProfile.guaranteedMinRarity || 'Uncommon';
        const guaranteedDrops = Math.max(1, lootProfile.guaranteedDrops || 1);
        const effectiveFloorLevel = engine.getEffectiveFloorLevel();

        for (let i = 0; i < guaranteedDrops; i++) {
            const itemData = engine.lootGen.generateGuaranteedRarityItem(effectiveFloorLevel, minRarity);
            engine.droppedItems.push(new DroppedItem(enemy.x, enemy.y, itemData));
        }

        if (Math.random() < (lootProfile.extraDropChance || 0)) {
            engine.droppedItems.push(new DroppedItem(enemy.x, enemy.y, engine.lootGen.generateItem(effectiveFloorLevel)));
        }

        engine.showBossCombatText(enemy, 'Guardian Defeated', '#ffd166');
        engine.emitBossPulse(enemy, '#ffd166', 30);
        engine.camera.shake(9, 0.22);
        if (enemy.triggerBossHooks) {
            enemy.triggerBossHooks('onDeath', engine, {});
        }
        return true;
    }
}

if (typeof window !== 'undefined') {
    window.EncounterService = EncounterService;
}
