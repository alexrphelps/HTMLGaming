const BossConfig = (() => {
    const rarityOrder = ['Common', 'Uncommon', 'Epic', 'Legendary'];

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function chooseRandom(list) {
        if (!Array.isArray(list) || list.length === 0) return null;
        return list[Math.floor(Math.random() * list.length)];
    }

    function rollChance(chance = 0) {
        return Math.random() < chance;
    }

    function createThreshold(id, threshold, handler) {
        return { id, threshold, handler };
    }

    function createBossHooks(overrides = {}) {
        return {
            onSpawn: overrides.onSpawn || null,
            onUpdate: overrides.onUpdate || null,
            onDamaged: overrides.onDamaged || null,
            onHealthThreshold: overrides.onHealthThreshold || null,
            onDeath: overrides.onDeath || null
        };
    }

    function resetBossTimer(enemy, key, min = 8, max = 12) {
        if (!enemy.bossRuntime) return 0;
        if (!enemy.bossRuntime.specialTimers) enemy.bossRuntime.specialTimers = {};
        enemy.bossRuntime.specialTimers[key] = min + Math.random() * (max - min);
        return enemy.bossRuntime.specialTimers[key];
    }

    function tickBossTimer(enemy, key, dt, min = 8, max = 12) {
        if (!enemy.bossRuntime) return Infinity;
        if (!enemy.bossRuntime.specialTimers) enemy.bossRuntime.specialTimers = {};
        if (enemy.bossRuntime.specialTimers[key] === undefined) {
            return resetBossTimer(enemy, key, min, max);
        }
        enemy.bossRuntime.specialTimers[key] -= dt;
        return enemy.bossRuntime.specialTimers[key];
    }

    const bossModifiers = {
        vampiric: {
            id: 'vampiric',
            label: 'Vampiric',
            chance: 0.25,
            description: '25% chance to heal on hit.',
            apply(enemy) {
                enemy.bossRuntime.healOnHitChance = 0.25;
                enemy.bossRuntime.healOnHitMultiplier = enemy.bossTier === 'mainBoss' ? 0.22 : 0.16;
            }
        },
        frenzied: {
            id: 'frenzied',
            label: 'Frenzied',
            chance: 0.25,
            description: 'Accelerates while bloodied.',
            apply(enemy) {
                enemy.bossRuntime.bloodiedSpeedMultiplier = enemy.bossTier === 'mainBoss' ? 1.38 : 1.22;
                enemy.bossRuntime.bloodiedCooldownMultiplier = 0.75;
            }
        }
    };

    const borrowedPowers = {
        lightning_strike: {
            id: 'lightning_strike',
            label: 'Stormbound',
            description: 'Calls a lightning strike near the player.',
            cooldown: 5.8,
            apply(enemy) {
                enemy.bossRuntime.borrowedPowerCooldown = 5.8;
            }
        },
        phase_tether: {
            id: 'phase_tether',
            label: 'Phase-Touched',
            description: 'Short blink toward the player.',
            cooldown: 6.2,
            apply(enemy) {
                enemy.bossRuntime.borrowedPowerCooldown = 6.2;
            }
        },
        element_bomb_fire: {
            id: 'element_bomb_fire',
            label: 'Bombardier',
            description: 'Drops a burning cloud on the arena.',
            cooldown: 6.8,
            apply(enemy) {
                enemy.bossRuntime.borrowedPowerCooldown = 6.8;
            }
        }
    };

    const mainBosses = [
        {
            id: 'vault_warden',
            displayName: 'Vault Warden',
            tier: 'mainBoss',
            baseType: 'boss',
            aiProfile: 'brute',
            spriteKey: 'sprites.enemy.boss.vaultWarden',
            spriteRenderScale: 1.05,
            hudColor: '#c0392b',
            baseStats: {
                hp: 500,
                speed: 55,
                width: 72,
                height: 72,
                color: '#4b0f0f',
                weaponType: 'melee_cleave',
                weaponCooldown: 1.6,
                weaponDamage: 55,
                dashSpeed: 260
            },
            aiOverrides: {
                boss: { aggroRange: 540, attackRange: 120, pathRefresh: 0.3 },
                brute: { meleeRange: 112, meleeCommitRange: 150, orbitRange: 130, orbitMinRange: 86, orbitSpeedMultiplier: 0.34, orbitLock: 0.65, chargeMinRange: 145, telegraphRange: 210, chaseRange: 680, windup: 0.92, dashTime: 0.42, recovery: 0.55, attackCooldown: 2.0, meleeCooldown: 1.35 }
            },
            allowedModifiers: ['vampiric', 'frenzied'],
            allowedBorrowedEffects: ['phase_tether', 'element_bomb_fire'],
            thresholds: [
                createThreshold('shielded_adds', 0.5, (enemy, engine) => {
                    enemy.grantShield(Math.ceil(enemy.maxHp * 0.2));
                    engine.spawnBossAdds(enemy, {
                        count: 2,
                        enemyTypes: ['grunt', 'brown_grunt'],
                        hpMultiplier: 0.82,
                        damageMultiplier: 0.9
                    });
                    engine.showBossCombatText(enemy, 'Warden Reinforced', '#66d9ff');
                })
            ],
            hooks: createBossHooks()
        },
        {
            id: 'storm_seer',
            displayName: 'Storm Seer',
            tier: 'mainBoss',
            baseType: 'ranged',
            aiProfile: 'ranged',
            spriteKey: 'sprites.enemy.boss.stormSeer',
            spriteRenderScale: 1.15,
            hudColor: '#6dc5ff',
            baseStats: {
                hp: 410,
                speed: 92,
                width: 64,
                height: 64,
                color: '#255c88',
                weaponType: 'assault_rifle',
                weaponCooldown: 0.44,
                weaponDamage: 22,
                projectileSpeed: 880
            },
            aiOverrides: {
                boss: { aggroRange: 560, attackRange: 220, pathRefresh: 0.28 },
                ranged: { minRange: 170, preferredMin: 220, preferredMax: 360, maxRange: 520, shootRange: 500, repositionLock: 0.6, strafeSpeedMultiplier: 0.76, retreatSpeedMultiplier: 0.84 }
            },
            allowedModifiers: ['vampiric', 'frenzied'],
            allowedBorrowedEffects: ['lightning_strike', 'phase_tether'],
            thresholds: [],
            hooks: createBossHooks({
                onUpdate(enemy, engine, dt, payload = {}) {
                    if (!enemy.isAggroed || !engine) return;
                    const player = payload.player || (engine && engine.player);
                    if (player && tickBossTimer(enemy, 'stormCone', dt) <= 0) {
                        if (engine.fireBossCone) {
                            engine.fireBossCone(enemy, player, { projectiles: 7, spread: 0.72, speed: 560, damage: 16, lifetime: 1.25, element: 'lightning', color: '#6dc5ff', attackName: 'Storm Fan' });
                            engine.showBossCombatText(enemy, 'Storm Fan', '#6dc5ff');
                        }
                        resetBossTimer(enemy, 'stormCone');
                    }
                    if (tickBossTimer(enemy, 'stormNova', dt) <= 0) {
                        if (engine.fireBossNova) {
                            engine.fireBossNova(enemy, { projectiles: 10, speed: 380, damage: 18, lifetime: 1.45, element: 'lightning', color: '#f5e66b', attackName: 'Storm Nova' });
                            engine.showBossCombatText(enemy, 'Storm Nova', '#f5e66b');
                        }
                        resetBossTimer(enemy, 'stormNova');
                    }
                }
            })
        },
        {
            id: 'iron_maw',
            displayName: 'Iron Maw',
            tier: 'mainBoss',
            baseType: 'brute',
            aiProfile: 'brute',
            spriteKey: 'sprites.enemy.boss.ironMaw',
            spriteRenderScale: 1.05,
            hudColor: '#cc7a29',
            baseStats: {
                hp: 620,
                speed: 68,
                width: 78,
                height: 78,
                color: '#7a3a12',
                weaponType: 'melee_cleave',
                weaponCooldown: 1.4,
                weaponDamage: 64,
                dashSpeed: 330
            },
            aiOverrides: {
                boss: { aggroRange: 500, attackRange: 110, pathRefresh: 0.3 },
                brute: { meleeRange: 118, meleeCommitRange: 158, orbitRange: 136, orbitMinRange: 88, orbitSpeedMultiplier: 0.32, orbitLock: 0.7, chargeMinRange: 150, telegraphRange: 220, chaseRange: 720, windup: 0.8, dashTime: 0.62, recovery: 0.5, attackCooldown: 1.8, meleeCooldown: 1.25 }
            },
            allowedModifiers: ['vampiric', 'frenzied'],
            allowedBorrowedEffects: ['element_bomb_fire'],
            thresholds: [],
            hooks: createBossHooks({
                onUpdate(enemy, engine, dt) {
                    enemy.bossRuntime.specialTimer = (enemy.bossRuntime.specialTimer || 0) - dt;
                    if (enemy.isAggroed && enemy.bossRuntime.specialTimer <= 0) {
                        enemy.bossRuntime.specialTimer = 5.4;
                        engine.spawnBossAdds(enemy, {
                            count: 1,
                            enemyTypes: ['brute'],
                            hpMultiplier: 0.58,
                            damageMultiplier: 0.72
                        });
                        engine.showBossCombatText(enemy, 'Iron Call', '#cc7a29');
                    }
                }
            })
        },
        {
            id: 'blight_priest',
            displayName: 'Blight Priest',
            tier: 'mainBoss',
            baseType: 'ranged',
            aiProfile: 'ranged',
            spriteKey: 'sprites.enemy.boss.blightPriest',
            spriteRenderScale: 1.08,
            hudColor: '#5cbf5c',
            baseStats: {
                hp: 455,
                speed: 62,
                width: 70,
                height: 70,
                color: '#1d5a2f',
                weaponType: 'sniper',
                weaponCooldown: 1.1,
                weaponDamage: 38,
                projectileSpeed: 720
            },
            aiOverrides: {
                boss: { aggroRange: 600, attackRange: 470, pathRefresh: 0.27 },
                ranged: { minRange: 260, preferredMin: 310, preferredMax: 470, maxRange: 620, shootRange: 590, repositionLock: 0.7, strafeSpeedMultiplier: 0.58, retreatSpeedMultiplier: 0.72 }
            },
            allowedModifiers: ['vampiric', 'frenzied'],
            allowedBorrowedEffects: ['element_bomb_fire', 'lightning_strike'],
            thresholds: [],
            hooks: createBossHooks({
                onUpdate(enemy, engine, dt, payload = {}) {
                    if (payload.player) {
                        enemy.angle = Math.atan2(payload.player.y - enemy.y, payload.player.x - enemy.x);
                    }
                    if (!enemy.isAggroed || !engine) return;
                    const player = payload.player || engine.player;
                    if (tickBossTimer(enemy, 'blightSelfPool', dt, 8, 12) <= 0) {
                        engine.createBossHazardCloud(enemy, {
                            element: 'poison',
                            radius: 118,
                            duration: 3.2
                        });
                        engine.showBossCombatText(enemy, 'Blight Bloom', '#5cbf5c');
                        resetBossTimer(enemy, 'blightSelfPool', 8, 12);
                    }
                    if (player && tickBossTimer(enemy, 'blightThrownPool', dt, 8, 12) <= 0) {
                        if (engine.throwBossElementBomb) {
                            engine.throwBossElementBomb(enemy, player, { element: 'poison', damage: 18, range: 620, speed: 320, radius: 128, cloudDuration: 3.4, color: '#1f8f38', attackName: 'Blight Bomb' });
                            engine.showBossCombatText(enemy, 'Blight Bomb', '#5cbf5c');
                        }
                        resetBossTimer(enemy, 'blightThrownPool', 8, 12);
                    }
                }
            })
        }
    ];

    const floorGuardians = [
        {
            id: 'crypt_sentinel',
            displayName: 'Floor Guardian',
            tier: 'floorGuardian',
            baseType: 'brute',
            aiProfile: 'brute',
            spriteKey: 'sprites.enemy.guardian.cryptSentinel',
            spriteRenderScale: 1.12,
            hudColor: '#d0b15c',
            baseStats: {
                hp: 300,
                speed: 74,
                width: 58,
                height: 58,
                color: '#7f6a22',
                weaponType: 'melee_cleave',
                weaponCooldown: 1.45,
                weaponDamage: 34,
                dashSpeed: 305
            },
            aiOverrides: {
                boss: { aggroRange: 480, attackRange: 95, pathRefresh: 0.32 },
                brute: { meleeRange: 90, meleeCommitRange: 120, orbitRange: 104, orbitMinRange: 68, orbitSpeedMultiplier: 0.4, orbitLock: 0.5, chargeMinRange: 105, telegraphRange: 145, chaseRange: 610, windup: 0.82, dashTime: 0.46, recovery: 0.52, attackCooldown: 1.9, meleeCooldown: 0.95 }
            },
            allowedModifiers: ['vampiric', 'frenzied'],
            allowedBorrowedEffects: ['phase_tether'],
            lootProfile: {
                guaranteedMinRarity: 'Uncommon',
                guaranteedDrops: 1,
                extraDropChance: 0.35
            },
            thresholds: [],
            hooks: createBossHooks()
        }
    ];

    function cloneEncounterDefinition(definition) {
        return {
            ...definition,
            baseStats: { ...(definition.baseStats || {}) },
            aiOverrides: definition.aiOverrides ? JSON.parse(JSON.stringify(definition.aiOverrides)) : null,
            allowedModifiers: [...(definition.allowedModifiers || [])],
            allowedBorrowedEffects: [...(definition.allowedBorrowedEffects || [])],
            thresholds: [...(definition.thresholds || [])],
            lootProfile: definition.lootProfile ? { ...definition.lootProfile } : null,
            hooks: definition.hooks || createBossHooks()
        };
    }

    function getBossModifier(id) {
        return bossModifiers[id] || null;
    }

    function getBorrowedPower(id) {
        return borrowedPowers[id] || null;
    }

    function rollBossModifier(definition) {
        const modifierIds = definition && Array.isArray(definition.allowedModifiers)
            ? definition.allowedModifiers
            : [];
        const candidates = modifierIds
            .map(getBossModifier)
            .filter(modifier => modifier && rollChance(modifier.chance));
        return chooseRandom(candidates);
    }

    function rollBorrowedPower(definition, chance = 0.45) {
        const effectIds = definition && Array.isArray(definition.allowedBorrowedEffects)
            ? definition.allowedBorrowedEffects
            : [];
        if (!rollChance(chance)) return null;
        return chooseRandom(effectIds.map(getBorrowedPower).filter(Boolean));
    }

    function createEncounterProfile(definition, options = {}) {
        if (!definition) return null;
        const profile = cloneEncounterDefinition(definition);
        const modifier = options.modifier === undefined ? rollBossModifier(profile) : options.modifier;
        const borrowedPower = options.borrowedPower === undefined ? rollBorrowedPower(profile) : options.borrowedPower;
        const tags = [];

        if (modifier) tags.push(modifier.label);
        if (borrowedPower) tags.push(borrowedPower.label);

        return {
            ...profile,
            modifier,
            borrowedPower,
            encounterTags: tags,
            rarityOrder
        };
    }

    function pickMainBoss() {
        return createEncounterProfile(chooseRandom(mainBosses));
    }

    function pickFloorGuardian() {
        return createEncounterProfile(chooseRandom(floorGuardians), { borrowedPower: null });
    }

    function getRarityFloor(minimumRarity) {
        const index = rarityOrder.indexOf(minimumRarity);
        return index >= 0 ? rarityOrder[index] : 'Uncommon';
    }

    function isBloodied(enemy) {
        return Boolean(enemy && enemy.maxHp > 0 && (enemy.hp / enemy.maxHp) <= 0.5);
    }

    return {
        rarityOrder,
        mainBosses,
        floorGuardians,
        clamp,
        getBossModifier,
        getBorrowedPower,
        createEncounterProfile,
        pickMainBoss,
        pickFloorGuardian,
        getRarityFloor,
        isBloodied
    };
})();
