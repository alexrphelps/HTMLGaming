const EnemyAIConfig = {
    awareness: {
        aggroRange: 620,
        sharedAggroRange: 420,
        leashRange: 880,
        investigateTime: 1.4,
        pathRefresh: 0.42
    },

    movement: {
        waypointReachRadius: 12,
        wanderMinDistance: 80,
        wanderMaxDistance: 210,
        wanderPauseMin: 0.45,
        wanderPauseMax: 1.3,
        patrolPauseMin: 0.25,
        patrolPauseMax: 0.9,
        patrolSpeedMultiplier: 0.55,
        wanderSpeedMultiplier: 0.48,
        formationSpeedMultiplier: 0.82,
        stuckRepathTime: 0.65
    },

    roles: {
        grunt: {
            attackRange: 58,
            commitRange: 78,
            pressureRange: 560,
            fleeHealthPct: 0.18,
            strafeRange: 64,
            strafeSpeedMultiplier: 0.58,
            attackLock: 0.32
        },
        ranged: {
            minRange: 210,
            preferredMin: 255,
            preferredMax: 370,
            maxRange: 470,
            shootRange: 430,
            repositionLock: 0.8,
            strafeSpeedMultiplier: 0.62,
            retreatSpeedMultiplier: 0.78
        },
        brute: {
            meleeRange: 96,
            meleeCommitRange: 128,
            meleeWindup: 0.2,
            meleeRecovery: 0.34,
            meleeCooldown: 1.1,
            orbitRange: 112,
            orbitMinRange: 72,
            orbitSpeedMultiplier: 0.42,
            orbitLock: 0.55,
            chargeMinRange: 108,
            telegraphRange: 155,
            chaseRange: 620,
            windup: 0.95,
            dashTime: 0.48,
            recovery: 0.65,
            attackCooldown: 2.2
        },
        boss: {
            aggroRange: 520,
            attackRange: 95,
            pathRefresh: 0.35
        }
    },

    squads: {
        chance: 0.34,
        minSize: 2,
        maxSize: 4,
        formationSpacing: 44,
        patrolRouteLength: 3,
        roomPatrolChance: 0.7
    },

    dodge: {
        predictionTime: 0.42,
        triggerDistance: 42,
        duration: 0.22,
        speed: 285,
        cooldown: 3.8,
        rangedChance: 0.65,
        gruntChance: 0.18,
        fastEliteChance: 1.0,
        textCooldown: 0.9
    }
};
