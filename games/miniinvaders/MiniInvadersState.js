/**
 * Mini Invaders state factory.
 */
(function () {
    function createMiniInvadersTalents() {
        return {
            rapidFire: 0,
            cooling: 0,
            spreadShot: 0,
            shipSpeed: 0,
            gunPower: 0,
            shield: 0,
            overheatReduction: false,
            duplicate: 0,
            tacticalNuke: 0
        };
    }

    function createMiniInvadersState(config) {
        return {
            player: null,
            duplicatePlayer: null,
            aliens: [],
            bullets: [],
            powerups: [],
            boss: null,
            bosses: [],
            bossBullets: [],
            nukes: [],
            score: 0,
            highScore: 0,
            wave: 1,
            gameOver: false,
            paused: false,
            gameMode: 'infinite',
            timeRemaining: 300,
            gameStartTime: 0,
            timeBonusTotal: 0,
            pauseStartTime: 0,
            totalPausedTime: 0,
            keys: {},
            keyPressTime: 0,
            overheat: 0,
            isOverheated: false,
            overheatCooldownTimer: 0,
            lastShotTime: 0,
            powerupSpawnTimer: 0,
            talentPoints: 0,
            totalTalentPoints: 0,
            spentTalentPoints: 0,
            showTalentMenu: false,
            talents: createMiniInvadersTalents(),
            playerShieldCount: 0,
            playerShieldActive: false,
            maxShieldCount: 0,
            duplicateCount: 0,
            maxDuplicateCount: 0,
            gunPowerLevel: 0,
            duplicateLastShotTime: 0,
            talentPointsCollectedThisWave: 0,
            maxTalentPointsPerWave: 3,
            nukeAnimation: null,
            duplicateNukeAnimation: null,
            nukeCount: 0,
            maxNukeCount: 0,
            tier2Unlocked: false,
            tier3Unlocked: false,
            fireRateLevel: 0,
            spreadShotCount: 1,
            cooldownLevel: 0,
            descentSpeed: config.alien.baseDescentSpeed,
            waveTransitioning: false,
            transitionAlpha: 0,
            isBossWave: false
        };
    }

    if (typeof window !== 'undefined') {
        window.createMiniInvadersTalents = createMiniInvadersTalents;
        window.createMiniInvadersState = createMiniInvadersState;
    }
})();
