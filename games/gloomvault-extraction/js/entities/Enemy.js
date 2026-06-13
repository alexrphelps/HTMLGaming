class Enemy extends Entity {
    constructor(x, y, type, hpMultiplier = 1.0, damageMultiplier = null, options = {}) {
        const bossProfile = options.bossProfile || null;
        const baseType = bossProfile && bossProfile.baseType ? bossProfile.baseType : type;
        const bossStats = bossProfile && bossProfile.baseStats ? bossProfile.baseStats : null;
        const dmgMult = damageMultiplier !== null ? damageMultiplier : hpMultiplier;
        const enemyFactory = Enemy.getFactory();
        const enemyStats = enemyFactory
            ? enemyFactory.getStats(baseType, bossStats, hpMultiplier)
            : { width: 30, height: 30, hp: Math.floor(50 * hpMultiplier), speed: 100, color: '#ff0000' };
        super(x, y, enemyStats.width, enemyStats.height, enemyStats.hp);

        this.type = baseType;
        this.enemyId = options.enemyId || `enemy-${Math.floor(Math.random() * 1e9)}`;
        this.bossProfile = bossProfile;
        this.bossTier = bossProfile ? bossProfile.tier : null;
        this.isBossTier = Boolean(bossProfile);
        this.isBoss = this.isBossTier ? this.bossTier === 'mainBoss' : baseType === 'boss';
        this.hasTakenPlayerDamage = false;
        this.isAggroed = false;
        this.baseSpeed = enemyStats.speed;
        this.speed = enemyStats.speed;
        this.color = enemyStats.color;
        this.displayName = bossProfile && bossProfile.displayName ? bossProfile.displayName : (this.isBoss ? 'Vault Warden' : null);
        this.homeX = x;
        this.homeY = y;
        this.aiProfile = options.aiProfile || (bossProfile && bossProfile.aiProfile) || baseType;
        this.spriteVariant = options.spriteVariant || null;
        this.squadId = options.squadId || null;
        this.formationOffset = options.formationOffset || { x: 0, y: 0 };
        this.patrolRoute = Array.isArray(options.patrolRoute) ? options.patrolRoute.map(p => ({ x: p.x, y: p.y })) : [];
        this.patrolIndex = options.patrolIndex || 0;
        this.state = this.isBossTier ? 'idle' : (this.patrolRoute.length > 0 ? 'patrol' : 'wander');
        this.lastNonDodgeState = this.state;
        this.stateLockTimer = 0;
        this.path = [];
        this.pathTimer = 0;
        this.wanderTimer = this.randRange(0.2, 0.9);
        this.actionTimer = 0;
        this.attackTimer = 0;
        this.attackCooldownTimer = 0;
        this.attackAnimationTimer = 0;
        this.brutePhase = 'ready';
        this.bruteAttackMode = 'none';
        this.bruteMeleeCooldownTimer = 0;
        this.bruteOrbitLockTimer = 0;
        this.angle = 0;
        this.strafeDirection = Math.random() > 0.5 ? 1 : -1;

        this.weapon = enemyFactory
            ? enemyFactory.applyBossWeaponStats(enemyFactory.createWeapon(this.type, enemyStats, dmgMult), bossStats, dmgMult)
            : null;

        this.dashTarget = null;
        this.dashSpeed = bossStats && bossStats.dashSpeed !== undefined ? bossStats.dashSpeed : (this.isBossTier ? 260 : 400);
        this.knockbackVx = 0;
        this.knockbackVy = 0;
        this.staggerTimer = 0;
        this.hitFlashTimer = 0;
        this.statusEffects = [];
        this.statusSpeedMultiplier = 1;
        this.maxShield = 0;
        this.shield = 0;

        this.eliteModifier = 'none';
        const eliteRoll = Math.random();
        if (!this.isBoss && !this.isBossTier && eliteRoll > 0.8) {
            if (Math.random() > 0.5) {
                this.eliteModifier = 'fast';
                this.speed *= 1.5;
                this.baseSpeed *= 1.5;
                this.color = '#ffff00';
            } else {
                this.eliteModifier = 'vampiric';
                this.maxHp *= 1.2;
                this.hp = this.maxHp;
                this.color = '#ff00ff';
            }
        }

        this.dodgeProfile = options.dodgeProfile !== undefined ? options.dodgeProfile : this.rollDodgeProfile();
        this.dodgeCooldownTimer = this.randRange(0.4, 1.2);
        this.dodgeTimer = 0;
        this.dodgeAngle = 0;
        this.dodgeTextTimer = 0;

        if (this.weapon && this.weapon.setElement && typeof Weapon !== 'undefined' && Weapon.rollElementForType) {
            this.weapon.setElement(Weapon.rollElementForType(this.weapon.weaponType));
        }

        this.bossRuntime = this.isBossTier
            ? {
                thresholdsTriggered: {},
                modifierId: bossProfile && bossProfile.modifier ? bossProfile.modifier.id : null,
                modifierLabel: bossProfile && bossProfile.modifier ? bossProfile.modifier.label : null,
                borrowedPowerId: bossProfile && bossProfile.borrowedPower ? bossProfile.borrowedPower.id : null,
                borrowedPowerLabel: bossProfile && bossProfile.borrowedPower ? bossProfile.borrowedPower.label : null,
                encounterTags: bossProfile && bossProfile.encounterTags ? [...bossProfile.encounterTags] : [],
                specialTimer: 0,
                borrowedPowerTimer: bossProfile && bossProfile.borrowedPower && bossProfile.borrowedPower.cooldown
                    ? bossProfile.borrowedPower.cooldown
                    : 0,
                specialTimers: {},
                bloodiedSpeedMultiplier: 1,
                bloodiedCooldownMultiplier: 1,
                healOnHitChance: 0,
                healOnHitMultiplier: 0
            }
            : null;

        if (this.isBossTier) {
            this.initializeBossProfile();
        }
    }

    initializeBossProfile() {
        const service = Enemy.getBossBehaviorService();
        if (service && service.initialize) service.initialize(this);
    }

    getAIConfig() {
        if (typeof EnemyAIConfig !== 'undefined') return EnemyAIConfig;
        return {
            awareness: { aggroRange: 620, sharedAggroRange: 420, leashRange: 880, investigateTime: 1.4, pathRefresh: 0.42 },
            movement: { waypointReachRadius: 12, wanderMinDistance: 80, wanderMaxDistance: 210, wanderPauseMin: 0.45, wanderPauseMax: 1.3, patrolPauseMin: 0.25, patrolPauseMax: 0.9, patrolSpeedMultiplier: 0.55, wanderSpeedMultiplier: 0.48, formationSpeedMultiplier: 0.82, stuckRepathTime: 0.65 },
            roles: {
                grunt: { attackRange: 58, commitRange: 78, pressureRange: 560, fleeHealthPct: 0.18, strafeRange: 64, strafeSpeedMultiplier: 0.58, attackLock: 0.32 },
                ranged: { minRange: 210, preferredMin: 255, preferredMax: 370, maxRange: 470, shootRange: 430, repositionLock: 0.8, strafeSpeedMultiplier: 0.62, retreatSpeedMultiplier: 0.78 },
                brute: { meleeRange: 96, meleeCommitRange: 128, meleeWindup: 0.2, meleeRecovery: 0.34, meleeCooldown: 1.1, orbitRange: 112, orbitMinRange: 72, orbitSpeedMultiplier: 0.42, orbitLock: 0.55, chargeMinRange: 108, telegraphRange: 155, chaseRange: 620, windup: 0.95, dashTime: 0.48, recovery: 0.65, attackCooldown: 2.2 },
                boss: { aggroRange: 520, attackRange: 95, pathRefresh: 0.35 }
            },
            squads: { formationSpacing: 44 },
            dodge: { predictionTime: 0.42, triggerDistance: 42, duration: 0.22, speed: 285, cooldown: 3.8, rangedChance: 0.65, gruntChance: 0.18, fastEliteChance: 1.0, textCooldown: 0.9 }
        };
    }

    randRange(min, max) {
        return min + Math.random() * (max - min);
    }

    takeDamage(amount) {
        const incoming = Math.max(0, amount || 0);
        let damageToShield = 0;
        let damageToHp = incoming;
        if (this.shield > 0) {
            damageToShield = Math.min(this.shield, damageToHp);
            this.shield -= damageToShield;
            damageToHp -= damageToShield;
        }
        const hpInfo = super.takeDamage(damageToHp);
        return {
            shield: damageToShield,
            hp: hpInfo ? hpInfo.hp : damageToHp
        };
    }

    grantShield(amount) {
        const shieldAmount = Math.max(0, Math.floor(amount || 0));
        if (shieldAmount <= 0) return 0;
        this.maxShield = Math.max(this.maxShield || 0, shieldAmount);
        this.shield = Math.min(this.maxShield, (this.shield || 0) + shieldAmount);
        return shieldAmount;
    }

    getBossDisplayName() {
        return this.displayName || (this.isBoss ? 'Vault Warden' : 'Boss');
    }

    getBossEncounterTags() {
        return this.bossRuntime && Array.isArray(this.bossRuntime.encounterTags)
            ? this.bossRuntime.encounterTags
            : [];
    }

    getBossHudText() {
        const tags = this.getBossEncounterTags();
        const tagText = tags.length > 0 ? ` [${tags.join(' | ')}]` : '';
        return `${this.getBossDisplayName()}${tagText} ${Math.ceil(this.hp)} / ${Math.ceil(this.maxHp)}`;
    }

    isBloodied() {
        return this.maxHp > 0 && (this.hp / this.maxHp) <= 0.5;
    }

    getRoleConfig(roleKey) {
        const config = this.getAIConfig();
        const baseRole = config && config.roles ? (config.roles[roleKey] || {}) : {};
        const overrides = this.bossProfile && this.bossProfile.aiOverrides && this.bossProfile.aiOverrides[roleKey]
            ? this.bossProfile.aiOverrides[roleKey]
            : null;
        return overrides ? { ...baseRole, ...overrides } : baseRole;
    }

    getBossAggroRange() {
        const role = this.getRoleConfig('boss');
        return role.aggroRange || this.getAIConfig().awareness.aggroRange;
    }

    handleDamagedByPlayer(engine, source, actualDamage) {
        this.hasTakenPlayerDamage = true;
        this.isAggroed = true;
        this.triggerBossHooks('onDamaged', engine, { source, actualDamage });
        this.checkBossThresholds(engine);
    }

    handleHitPlayer(engine, damageInfo, projectile) {
        this.triggerBossHooks('onPlayerHit', engine, { damageInfo, projectile });
        if (this.bossRuntime && this.bossRuntime.healOnHitChance > 0 && Math.random() < this.bossRuntime.healOnHitChance) {
            const totalDamage = Math.max(0, (damageInfo && damageInfo.hp ? damageInfo.hp : 0) + (damageInfo && damageInfo.shield ? damageInfo.shield : 0));
            const healAmount = Math.max(1, Math.round(totalDamage * this.bossRuntime.healOnHitMultiplier));
            this.hp = Math.min(this.maxHp, this.hp + healAmount);
            if (engine && engine.showBossCombatText) {
                engine.showBossCombatText(this, `+${healAmount}`, '#44ff88');
            }
        }
    }

    triggerBossHooks(hookName, engine, payload = {}) {
        const service = Enemy.getBossBehaviorService();
        if (service && service.triggerHook) service.triggerHook(this, hookName, engine, payload);
    }

    checkBossThresholds(engine) {
        const service = Enemy.getBossBehaviorService();
        if (service && service.checkThresholds) service.checkThresholds(this, engine);
    }

    updateBossRuntime(dt, player, mapGen, pathfinder, context) {
        const service = Enemy.getBossBehaviorService();
        return service && service.updateRuntime ? service.updateRuntime(this, dt, player, mapGen, pathfinder, context) : [];
    }

    tryUseBorrowedPower(player, context) {
        const service = Enemy.getBossBehaviorService();
        return service && service.tryUseBorrowedPower ? service.tryUseBorrowedPower(this, player, context) : false;
    }

    rollDodgeProfile() {
        if (this.isBossTier || this.type === 'brute') return null;
        const config = this.getAIConfig().dodge;
        if (this.eliteModifier === 'fast' && Math.random() < config.fastEliteChance) {
            return { cooldown: config.cooldown * 0.8, duration: config.duration, speed: config.speed * 1.12 };
        }
        if (this.type === 'ranged' && Math.random() < config.rangedChance) {
            return { cooldown: config.cooldown, duration: config.duration, speed: config.speed };
        }
        if (this.isGruntLike() && Math.random() < config.gruntChance) {
            return { cooldown: config.cooldown * 1.25, duration: config.duration * 0.9, speed: config.speed * 0.92 };
        }
        return null;
    }

    isGruntLike() {
        return this.type === 'grunt' || this.type === 'brown_grunt';
    }

    setState(nextState, lockTime = 0, force = false) {
        if (!force && this.stateLockTimer > 0 && this.state !== nextState) return false;
        if (this.state !== nextState) {
            if (this.state !== 'dodge' && this.state !== 'stagger') {
                this.lastNonDodgeState = this.state;
            }
            this.state = nextState;
            this.path = nextState === 'chase' || nextState === 'patrol' || nextState === 'wander' || nextState === 'reposition' ? this.path : [];
        }
        this.stateLockTimer = Math.max(this.stateLockTimer, lockTime);
        return true;
    }

    hasLineOfSight(player, mapGen) {
        if (!mapGen || !player) return false;

        const dx = Math.abs(player.x - this.x);
        const dy = Math.abs(player.y - this.y);
        const steps = Math.max(1, Math.ceil(Math.max(dx, dy) / Math.max(6, mapGen.tileSize * 0.35)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = this.x + (player.x - this.x) * t;
            const y = this.y + (player.y - this.y) * t;
            const tileX = Math.floor(x / mapGen.tileSize);
            const tileY = Math.floor(y / mapGen.tileSize);
            if (mapGen.getTile(tileX, tileY) === 0) return false;
        }
        return true;
    }

    shouldCheckLineOfSight(distToPlayer) {
        const config = this.getAIConfig();
        if (this.isAggroed || this.hasTakenPlayerDamage) return true;

        const aggroRange = this.isBossTier
            ? this.getBossAggroRange()
            : config.awareness.aggroRange;
        return distToPlayer <= aggroRange;
    }

    update(dt, player, mapGen, pathfinder, context = {}) {
        if (this.hp <= 0 || !player) return [];

        this.tickTimers(dt);
        this.applyKnockbackMotion(dt, mapGen);

        if (this.staggerTimer > 0) {
            this.state = 'stagger';
            this.animationState = 'idle';
            this.updateAnimation(dt);
            return [];
        } else if (this.state === 'stagger') {
            this.state = this.lastNonDodgeState || (this.patrolRoute.length ? 'patrol' : 'wander');
        }

        if (this.weapon) this.weapon.update(dt);
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        const canSeePlayer = this.shouldCheckLineOfSight(distToPlayer) ? this.hasLineOfSight(player, mapGen) : false;

        if (this.isBossTier) {
            this.updateBossRuntime(dt, player, mapGen, pathfinder, context);
            return this.updateBossTier(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer, context);
        }

        const dodgeProjectile = this.findDodgeProjectile(context.playerProjectiles || context.projectiles || [], mapGen);
        if (dodgeProjectile && this.beginDodge(dodgeProjectile, mapGen, context)) {
            this.updateDodge(dt, mapGen, context);
            this.updateAnimationState();
            this.updateAnimation(dt);
            return [];
        }

        if (this.state === 'dodge') {
            this.updateDodge(dt, mapGen, context);
            this.updateAnimationState();
            this.updateAnimation(dt);
            return [];
        }

        this.updateAggro(distToPlayer, canSeePlayer, context);

        let newProjectiles = [];
        if (!this.isAggroed) {
            this.updateIdleMovement(dt, mapGen, pathfinder);
        } else if (this.isGruntLike()) {
            newProjectiles = this.updateGrunt(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
        } else if (this.type === 'ranged') {
            newProjectiles = this.updateRanged(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
        } else if (this.type === 'brute') {
            newProjectiles = this.updateBrute(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
        } else if (this.type === 'boss') {
            newProjectiles = this.updateBoss(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
        }

        this.updateAnimationState();
        this.updateAnimation(dt);
        return newProjectiles;
    }

    tickTimers(dt) {
        this.pathTimer -= dt;
        this.wanderTimer -= dt;
        this.actionTimer -= dt;
        this.stateLockTimer -= dt;
        this.attackTimer -= dt;
        this.attackCooldownTimer -= dt;
        this.attackAnimationTimer -= dt;
        this.bruteMeleeCooldownTimer -= dt;
        this.bruteOrbitLockTimer -= dt;
        this.dodgeCooldownTimer -= dt;
        this.dodgeTimer -= dt;
        this.dodgeTextTimer -= dt;
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.staggerTimer > 0) this.staggerTimer -= dt;
    }

    applyKnockbackMotion(dt, mapGen) {
        if (Math.abs(this.knockbackVx) <= 1 && Math.abs(this.knockbackVy) <= 1) return;

        const oldX = this.x;
        this.x += this.knockbackVx * dt;
        if (this.checkCollision(mapGen)) {
            this.x = oldX;
            this.takeDamage(15);
            this.knockbackVx = 0;
        }

        const oldY = this.y;
        this.y += this.knockbackVy * dt;
        if (this.checkCollision(mapGen)) {
            this.y = oldY;
            this.takeDamage(15);
            this.knockbackVy = 0;
        }

        this.knockbackVx *= Math.max(0, 1 - 8 * dt);
        this.knockbackVy *= Math.max(0, 1 - 8 * dt);
    }

    updateAggro(distToPlayer, canSeePlayer, context) {
        const config = this.getAIConfig().awareness;
        const squadMateAggroed = this.squadId && context.enemies && context.enemies.some(enemy =>
            enemy !== this &&
            enemy.squadId === this.squadId &&
            enemy.isAggroed &&
            Math.hypot(enemy.x - this.x, enemy.y - this.y) <= config.sharedAggroRange
        );

        if ((canSeePlayer && distToPlayer <= config.aggroRange) || this.hasTakenPlayerDamage || squadMateAggroed) {
            this.isAggroed = true;
            if (this.state === 'patrol' || this.state === 'wander' || this.state === 'investigate' || this.state === 'idle') {
                this.setState(this.type === 'ranged' ? 'reposition' : 'chase', 0.25, true);
                this.pathTimer = 0;
            }
            return;
        }

        if (this.isAggroed && distToPlayer > config.leashRange && !canSeePlayer) {
            this.isAggroed = false;
            this.hasTakenPlayerDamage = false;
            this.setState(this.patrolRoute.length > 0 ? 'patrol' : 'investigate', config.investigateTime, true);
            this.path = [];
            this.wanderTimer = 0;
        }
    }

    updateIdleMovement(dt, mapGen, pathfinder) {
        if (this.state === 'investigate' && this.stateLockTimer <= 0) {
            this.setState(this.patrolRoute.length > 0 ? 'patrol' : 'wander', 0, true);
        }

        if (this.state === 'patrol') {
            this.followPatrol(dt, mapGen, pathfinder);
        } else {
            this.followWander(dt, mapGen, pathfinder);
        }
    }

    followPatrol(dt, mapGen, pathfinder) {
        const movement = this.getAIConfig().movement;
        if (!this.patrolRoute.length) {
            this.setState('wander', 0, true);
            return;
        }

        if (this.wanderTimer > 0 && this.path.length === 0) return;
        const target = this.patrolRoute[this.patrolIndex % this.patrolRoute.length];
        if (!target) return;

        if (this.path.length === 0 || this.pathTimer <= 0) {
            this.pathTimer = movement.stuckRepathTime;
            this.path = this.buildPath(pathfinder, mapGen, target.x, target.y);
        }

        if (this.path.length > 0) {
            this.followPath(dt, mapGen, this.baseSpeed * movement.patrolSpeedMultiplier);
        }

        if (Math.hypot(target.x - this.x, target.y - this.y) <= movement.waypointReachRadius + 8) {
            this.patrolIndex = (this.patrolIndex + 1) % this.patrolRoute.length;
            this.path = [];
            this.wanderTimer = this.randRange(movement.patrolPauseMin, movement.patrolPauseMax);
        }
    }

    followWander(dt, mapGen, pathfinder) {
        const movement = this.getAIConfig().movement;
        if (this.path.length === 0) {
            if (this.wanderTimer > 0) return;
            const target = this.pickWanderTarget(mapGen);
            if (target) {
                this.path = this.buildPath(pathfinder, mapGen, target.x, target.y);
            }
            this.wanderTimer = this.randRange(movement.wanderPauseMin, movement.wanderPauseMax);
        } else {
            this.followPath(dt, mapGen, this.baseSpeed * movement.wanderSpeedMultiplier);
        }
    }

    pickWanderTarget(mapGen) {
        if (!mapGen) return null;
        const movement = this.getAIConfig().movement;
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = this.randRange(movement.wanderMinDistance, movement.wanderMaxDistance);
            const targetX = this.homeX + Math.cos(angle) * dist;
            const targetY = this.homeY + Math.sin(angle) * dist;
            if (this.isWorldFloor(targetX, targetY, mapGen)) {
                return { x: targetX, y: targetY };
            }
        }
        return this.isWorldFloor(this.homeX, this.homeY, mapGen) ? { x: this.homeX, y: this.homeY } : null;
    }

    updateGrunt(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer) {
        const role = this.getRoleConfig('grunt');
        const newProjectiles = [];
        const weaponReady = !this.weapon || this.weapon.cooldownTimer <= 0;
        const shouldCommitMelee = canSeePlayer && weaponReady && distToPlayer <= role.commitRange;

        if (this.hp < this.maxHp * role.fleeHealthPct && distToPlayer < role.pressureRange) {
            this.setState('flee', 0.45);
        } else if (distToPlayer <= role.attackRange && canSeePlayer && weaponReady) {
            this.setState('attack', role.attackLock);
        } else if (shouldCommitMelee) {
            this.setState('chase');
        } else if (distToPlayer <= role.strafeRange && canSeePlayer && !weaponReady) {
            this.setState('reposition', 0.35);
        } else {
            this.setState('chase');
        }

        if (this.state === 'flee') {
            this.angle = Math.atan2(this.y - player.y, this.x - player.x);
            this.moveInDirection(this.angle, dt, mapGen, this.baseSpeed * 0.85);
        } else if (this.state === 'attack') {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            if (distToPlayer > Math.max(0, role.attackRange - 10)) {
                this.moveInDirection(this.angle, dt, mapGen, this.baseSpeed * 0.35);
            }
            const projs = this.weapon && canSeePlayer ? this.weapon.attack(this.x, this.y, this.angle) : null;
            if (projs && projs.length > 0) newProjectiles.push(...projs);
        } else if (this.state === 'reposition') {
            const orbit = Math.atan2(player.y - this.y, player.x - this.x) + this.strafeDirection * Math.PI / 2;
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.moveInDirection(orbit, dt, mapGen, this.baseSpeed * role.strafeSpeedMultiplier);
        } else {
            this.pathToPlayer(dt, player, mapGen, pathfinder, { ignoreFormation: shouldCommitMelee });
            if (this.path.length > 0) {
                this.followPath(dt, mapGen, this.speed);
            } else {
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.moveInDirection(this.angle, dt, mapGen, this.baseSpeed * 0.72);
            }
        }

        return newProjectiles;
    }

    updateRanged(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer) {
        const role = this.getRoleConfig('ranged');
        const newProjectiles = [];

        if (this.stateLockTimer <= 0) {
            if (distToPlayer < role.minRange) {
                this.setState('flee', role.repositionLock, true);
                this.strafeDirection *= -1;
            } else if (distToPlayer > role.preferredMax && distToPlayer < role.maxRange) {
                this.setState('chase', role.repositionLock, true);
            } else if (distToPlayer >= role.preferredMin && distToPlayer <= role.preferredMax) {
                this.setState('reposition', role.repositionLock, true);
            } else {
                this.setState('investigate', 0.35, true);
            }
        }

        if (this.state === 'flee') {
            this.angle = Math.atan2(this.y - player.y, this.x - player.x);
            this.moveInDirection(this.angle, dt, mapGen, this.baseSpeed * role.retreatSpeedMultiplier);
        } else if (this.state === 'chase') {
            this.pathToPlayer(dt, player, mapGen, pathfinder);
            if (this.path.length > 0) this.followPath(dt, mapGen, this.speed);
        } else if (this.state === 'reposition' || this.state === 'investigate') {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            const strafeAngle = this.angle + this.strafeDirection * Math.PI / 2;
            this.moveInDirection(strafeAngle, dt, mapGen, this.baseSpeed * role.strafeSpeedMultiplier);
        }

        if (distToPlayer <= role.shootRange && canSeePlayer && this.weapon) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            const projs = this.weapon.attack(this.x, this.y, this.angle);
            if (projs && projs.length > 0) {
                newProjectiles.push(...projs);
                if (this.bossProfile && this.bossProfile.id === 'storm_seer') {
                    this.attackAnimationTimer = 0.22;
                }
            }
        }

        return newProjectiles;
    }

    updateBrute(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer) {
        const role = this.getRoleConfig('brute');
        const newProjectiles = [];
        const isChargeDash = this.bruteAttackMode === 'charge' && this.brutePhase === 'dash';

        if (isChargeDash) {
            this.moveInDirection(this.angle, dt, mapGen, this.dashSpeed);
            if (this.weapon && this.weapon.cooldownTimer <= 0) {
                const projs = this.performBruteAttack(role, 'charge');
                if (projs && projs.length > 0) newProjectiles.push(...projs);
            }
        } else {
            this.setState('chase', 0, true);
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            const shouldOrbit = canSeePlayer && (
                (distToPlayer <= role.orbitRange && distToPlayer >= role.orbitMinRange) ||
                (this.bruteOrbitLockTimer > 0 && distToPlayer <= role.meleeCommitRange && distToPlayer >= role.orbitMinRange)
            );
            const shouldPressForward = canSeePlayer && distToPlayer <= role.meleeCommitRange && distToPlayer > role.orbitRange;

            if (shouldOrbit) {
                this.bruteOrbitLockTimer = Math.max(this.bruteOrbitLockTimer, role.orbitLock);
                const orbitAngle = this.angle + this.strafeDirection * Math.PI / 2;
                this.moveInDirection(orbitAngle, dt, mapGen, this.baseSpeed * role.orbitSpeedMultiplier);
            } else if (shouldPressForward) {
                this.path = [];
                this.moveInDirection(this.angle, dt, mapGen, this.speed * 0.62);
            } else if (distToPlayer < role.chaseRange) {
                this.pathToPlayer(dt, player, mapGen, pathfinder);
                if (this.path.length > 0) {
                    this.followPath(dt, mapGen, this.speed);
                } else {
                    this.moveInDirection(this.angle, dt, mapGen, this.speed * 0.7);
                }
            }
        }

        if (this.bruteAttackMode === 'charge') {
            if (this.brutePhase === 'windup') {
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.attackAnimationTimer = Math.max(this.attackAnimationTimer, 0.1);
                if (this.attackTimer <= 0) {
                    this.brutePhase = 'dash';
                    this.attackTimer = role.dashTime;
                    this.path = [];
                }
            } else if (this.brutePhase === 'dash') {
                this.attackAnimationTimer = Math.max(this.attackAnimationTimer, 0.1);
                if (this.attackTimer <= 0) {
                    this.brutePhase = 'recovery';
                    this.attackTimer = role.recovery;
                    this.attackCooldownTimer = role.attackCooldown;
                    this.pathTimer = 0;
                }
            } else if (this.brutePhase === 'recovery' && this.attackTimer <= 0) {
                this.brutePhase = 'ready';
                this.bruteAttackMode = 'none';
            }
        } else if (distToPlayer >= role.chargeMinRange && distToPlayer <= role.telegraphRange && canSeePlayer && this.attackCooldownTimer <= 0) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.bruteAttackMode = 'charge';
            this.brutePhase = 'windup';
            this.attackTimer = role.windup;
            this.attackAnimationTimer = Math.max(this.attackAnimationTimer, 0.18);
        }

        if (!isChargeDash && distToPlayer <= role.meleeRange && canSeePlayer && this.bruteMeleeCooldownTimer <= 0) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            const projs = this.performBruteAttack(role, 'melee');
            if (projs && projs.length > 0) newProjectiles.push(...projs);
            this.bruteMeleeCooldownTimer = role.meleeCooldown;
            this.attackAnimationTimer = Math.max(this.attackAnimationTimer, role.meleeWindup + role.meleeRecovery);
        }

        return newProjectiles;
    }

    performBruteAttack(role, mode) {
        if (!this.weapon || !this.weapon.attack) return [];

        const originalCooldown = this.weapon.cooldown;
        const modeCooldown = mode === 'melee'
            ? role.meleeCooldown
            : Math.min(originalCooldown || role.dashTime || 0.1, role.dashTime || 0.1);
        this.weapon.cooldown = modeCooldown;
        this.weapon.cooldownTimer = 0;
        const projs = this.weapon.attack(this.x, this.y, this.angle) || [];
        this.weapon.cooldown = originalCooldown;
        return projs;
    }

    updateBoss(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer) {
        const newProjectiles = [];
        const role = this.getRoleConfig('boss');

        if ((canSeePlayer && distToPlayer < role.aggroRange) || this.hasTakenPlayerDamage) {
            this.isAggroed = true;
        }

        if (!this.isAggroed) {
            this.state = 'idle';
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.animationState = 'idle';
            this.updateAnimation(dt);
            return newProjectiles;
        }

        this.angle = Math.atan2(player.y - this.y, player.x - this.x);
        if (distToPlayer <= role.attackRange && canSeePlayer) {
            this.state = 'attack';
            const projs = this.weapon ? this.weapon.attack(this.x, this.y, this.angle) : null;
            if (projs && projs.length > 0) newProjectiles.push(...projs);
        } else {
            this.state = 'chase';
            if (this.pathTimer <= 0 || this.path.length === 0) {
                this.pathTimer = role.pathRefresh;
                this.path = this.buildPath(pathfinder, mapGen, player.x, player.y);
            }

            if (this.path.length > 0) {
                this.followPath(dt, mapGen, this.speed);
            } else if (distToPlayer < role.aggroRange) {
                this.moveInDirection(this.angle, dt, mapGen, this.speed * 0.75);
            }
        }

        this.animationState = this.state === 'attack' ? 'attack' : 'run';
        this.updateAnimation(dt);
        return newProjectiles;
    }

    updateBossTier(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer, context) {
        const bossRole = this.getRoleConfig('boss');
        if ((canSeePlayer && distToPlayer < (bossRole.aggroRange || 520)) || this.hasTakenPlayerDamage) {
            this.isAggroed = true;
        }

        if (!this.isAggroed) {
            this.angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.updateIdleMovement(dt, mapGen, pathfinder);
            this.updateAnimationState();
            this.updateAnimation(dt);
            return [];
        }

        this.tryUseBorrowedPower(player, context);

        const aiRole = this.aiProfile || this.type || 'boss';
        if (aiRole === 'ranged') {
            return this.updateRanged(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
        }
        if (aiRole === 'brute') {
            return this.updateBrute(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
        }
        return this.updateBoss(dt, player, mapGen, pathfinder, distToPlayer, canSeePlayer);
    }

    pathToPlayer(dt, player, mapGen, pathfinder, options = {}) {
        const config = this.getAIConfig();
        if (this.pathTimer > 0 && this.path.length > 0) return;
        this.pathTimer = config.awareness.pathRefresh;

        let targetX = player.x;
        let targetY = player.y;
        if (!options.ignoreFormation && this.squadId && (this.state === 'chase' || this.state === 'reposition')) {
            targetX += this.formationOffset.x || 0;
            targetY += this.formationOffset.y || 0;
        }

        this.path = this.buildPath(pathfinder, mapGen, targetX, targetY);
    }

    buildPath(pathfinder, mapGen, targetX, targetY) {
        if (!pathfinder || !pathfinder.findPath || !mapGen || !this.isWorldFloor(targetX, targetY, mapGen)) return [];
        return pathfinder.findPath(this.x, this.y, targetX, targetY, mapGen) || [];
    }

    followPath(dt, mapGen, overrideSpeed = null) {
        if (!this.path || this.path.length === 0) return;
        const movement = this.getAIConfig().movement;
        let target = this.path[0];
        let dist = Math.hypot(target.x - this.x, target.y - this.y);

        while (dist < movement.waypointReachRadius && this.path.length > 0) {
            this.path.shift();
            target = this.path[0];
            if (!target) return;
            dist = Math.hypot(target.x - this.x, target.y - this.y);
        }

        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        this.moveInDirection(this.angle, dt, mapGen, overrideSpeed);
    }

    findDodgeProjectile(projectiles, mapGen) {
        if (!this.dodgeProfile || this.dodgeCooldownTimer > 0 || this.state === 'attack' || this.state === 'stagger') return null;
        const dodge = this.getAIConfig().dodge;

        for (const projectile of projectiles) {
            if (!projectile || !projectile.isPlayerOwned || projectile.isMelee || projectile.markedForDeletion) continue;
            const speed = projectile.speed || 0;
            if (speed <= 0) continue;

            const vx = Math.cos(projectile.angle) * speed;
            const vy = Math.sin(projectile.angle) * speed;
            const relX = this.x - projectile.x;
            const relY = this.y - projectile.y;
            const closing = relX * vx + relY * vy;
            if (closing <= 0) continue;

            const speedSq = vx * vx + vy * vy;
            const t = Math.max(0, Math.min(dodge.predictionTime, closing / speedSq));
            const closestX = projectile.x + vx * t;
            const closestY = projectile.y + vy * t;
            const radius = (this.width / 2) + (projectile.width || 10) / 2 + dodge.triggerDistance;
            if (Math.hypot(this.x - closestX, this.y - closestY) <= radius && this.hasDodgeSpace(projectile, mapGen)) {
                return projectile;
            }
        }
        return null;
    }

    hasDodgeSpace(projectile, mapGen) {
        const angles = this.getDodgeAngles(projectile);
        const distance = (this.dodgeProfile && this.dodgeProfile.speed ? this.dodgeProfile.speed : this.getAIConfig().dodge.speed) * this.getAIConfig().dodge.duration;
        return angles.some(angle => this.canMoveInDirection(angle, distance, mapGen));
    }

    beginDodge(projectile, mapGen, context) {
        const angles = this.getDodgeAngles(projectile);
        const distance = (this.dodgeProfile.speed || this.getAIConfig().dodge.speed) * (this.dodgeProfile.duration || this.getAIConfig().dodge.duration);
        const angle = angles.find(candidate => this.canMoveInDirection(candidate, distance, mapGen));
        if (angle === undefined) return false;

        this.lastNonDodgeState = this.state === 'dodge' ? this.lastNonDodgeState : this.state;
        this.dodgeAngle = angle;
        this.dodgeTimer = this.dodgeProfile.duration || this.getAIConfig().dodge.duration;
        this.dodgeCooldownTimer = this.dodgeProfile.cooldown || this.getAIConfig().dodge.cooldown;
        this.setState('dodge', this.dodgeTimer, true);

        if (context.combatFeedback && this.dodgeTextTimer <= 0) {
            context.combatFeedback.addText('Dodge', this.x, this.y - 18, '#66d9ff', 12, 0.55);
            this.dodgeTextTimer = this.getAIConfig().dodge.textCooldown;
        }
        return true;
    }

    updateDodge(dt, mapGen, context) {
        const speed = this.dodgeProfile && this.dodgeProfile.speed ? this.dodgeProfile.speed : this.getAIConfig().dodge.speed;
        this.moveInDirection(this.dodgeAngle, dt, mapGen, speed);
        if (context.particleSystem && context.particleSystem.emitDashTrail) {
            context.particleSystem.emitDashTrail(this.x, this.y, '#66d9ff');
        }
        if (this.dodgeTimer <= 0) {
            this.setState(this.lastNonDodgeState || (this.patrolRoute.length > 0 ? 'patrol' : 'wander'), 0, true);
        }
    }

    getDodgeAngles(projectile) {
        const perpendicular = projectile.angle + Math.PI / 2;
        const opposite = projectile.angle - Math.PI / 2;
        const away = Math.atan2(this.y - projectile.y, this.x - projectile.x);
        return Math.random() > 0.5
            ? [perpendicular, opposite, away]
            : [opposite, perpendicular, away];
    }

    canMoveInDirection(angle, distance, mapGen) {
        const oldX = this.x;
        const oldY = this.y;
        this.x += Math.cos(angle) * distance;
        this.y += Math.sin(angle) * distance;
        const blocked = this.checkCollision(mapGen);
        this.x = oldX;
        this.y = oldY;
        return !blocked;
    }

    isWorldFloor(x, y, mapGen) {
        if (!mapGen) return false;
        const tileX = Math.floor(x / mapGen.tileSize);
        const tileY = Math.floor(y / mapGen.tileSize);
        return mapGen.getTile(tileX, tileY) === 1;
    }

    moveInDirection(angle, dt, mapGen, overrideSpeed = null) {
        const currentSpeed = (overrideSpeed || this.speed) * (this.statusSpeedMultiplier || 1);
        const vx = Math.cos(angle) * currentSpeed;
        const vy = Math.sin(angle) * currentSpeed;

        const oldX = this.x;
        this.x += vx * dt;
        if (this.checkCollision(mapGen)) {
            this.x = oldX;
            this.strafeDirection *= -1;
        }

        const oldY = this.y;
        this.y += vy * dt;
        if (this.checkCollision(mapGen)) {
            this.y = oldY;
            this.strafeDirection *= -1;
        }
    }

    checkCollision(mapGen) {
        if (!mapGen) return false;

        const checkRadius = this.width / 2;
        const leftTile = Math.floor((this.x - checkRadius) / mapGen.tileSize);
        const rightTile = Math.floor((this.x + checkRadius) / mapGen.tileSize);
        const topTile = Math.floor((this.y - checkRadius) / mapGen.tileSize);
        const bottomTile = Math.floor((this.y + checkRadius) / mapGen.tileSize);

        if (this.x - checkRadius < 0 || this.x + checkRadius > mapGen.cols * mapGen.tileSize ||
            this.y - checkRadius < 0 || this.y + checkRadius > mapGen.rows * mapGen.tileSize) {
            return true;
        }

        for (let y = topTile; y <= bottomTile; y++) {
            for (let x = leftTile; x <= rightTile; x++) {
                if (mapGen.getTile(x, y) === 0) {
                    return true;
                }
            }
        }
        return false;
    }

    applyKnockback(angle, force) {
        this.knockbackVx = Math.cos(angle) * force;
        this.knockbackVy = Math.sin(angle) * force;
    }

    updateAnimationState() {
        if (this.attackAnimationTimer > 0) {
            this.animationState = 'attack';
        } else if (this.state === 'attack') {
            this.animationState = 'attack';
        } else if (this.state === 'idle' || this.state === 'investigate' || this.state === 'stagger') {
            this.animationState = 'idle';
        } else {
            this.animationState = 'run';
        }
    }

    getBaseSpriteKey() {
        const service = Enemy.getRenderService();
        return service ? service.getBaseSpriteKey(this) : `sprites.enemy.${this.type || 'grunt'}`;
    }

    getSpriteKey() {
        const service = Enemy.getRenderService();
        return service ? service.getSpriteKey(this) : ((this.bossProfile && this.bossProfile.spriteKey) || this.getBaseSpriteKey());
    }

    getSpriteFallbackKey() {
        const service = Enemy.getRenderService();
        return service ? service.getSpriteFallbackKey(this) : 'sprites.enemy';
    }

    getAnimationFrameCount() {
        const service = Enemy.getRenderService();
        return service ? service.getAnimationFrameCount(this) : this.frameCount;
    }

    getAnimationFrameDuration() {
        const service = Enemy.getRenderService();
        return service ? service.getAnimationFrameDuration(this) : this.frameDuration;
    }

    getSpriteRenderSize() {
        const service = Enemy.getRenderService();
        return service ? service.getSpriteRenderSize(this) : Math.max(this.width, this.height) * 2;
    }

    render(ctx, renderer) {
        const service = Enemy.getRenderService();
        if (service) return service.render(this, ctx, renderer);
    }
}

Enemy.getFactory = function() {
    return typeof EnemyFactory !== 'undefined' ? EnemyFactory : null;
};

Enemy.getRenderService = function() {
    if (!Enemy.renderService && typeof EnemyRenderService !== 'undefined') {
        Enemy.renderService = new EnemyRenderService();
    }
    return Enemy.renderService;
};

Enemy.getBossBehaviorService = function() {
    if (!Enemy.bossBehaviorService && typeof BossBehaviorService !== 'undefined') {
        Enemy.bossBehaviorService = new BossBehaviorService();
    }
    return Enemy.bossBehaviorService;
};
