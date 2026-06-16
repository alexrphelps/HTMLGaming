/**
 * Shared Mini Invaders configuration.
 */
(function () {
    const MiniInvadersConfig = {
        canvas: {
            width: 800,
            height: 600
        },
        player: {
            width: 40,
            height: 30,
            speed: 4.5,
            color: '#00ff88'
        },
        bullet: {
            width: 4,
            height: 15,
            speed: 8,
            color: '#00ff88',
            baseFireRate: 150
        },
        overheat: {
            increasePerShot: 8,
            decreaseRate: 1.5,
            maxHeat: 100,
            cooldownTime: 2000,
            barWidth: 60,
            barHeight: 8
        },
        alien: {
            width: 32,
            height: 24,
            baseAlienCount: 30,
            alienIncreasePerWave: 3,
            maxAliens: 70,
            colors: ['#ff0080', '#ff00ff', '#8000ff', '#00ffff', '#ffff00'],
            basePointValue: 30,
            shieldedPointValue: 60,
            shuffleSpeed: 0.5,
            shuffleRange: 30,
            baseDescentSpeed: 0.12,
            descentSpeedIncrease: 0.03,
            shieldWaveStart: 5
        },
        boss: {
            baseWidth: 80,
            baseHeight: 60,
            sizeIncreasePerBoss: 20,
            maxSize: 180,
            baseHealth: 60,
            healthIncreasePerBoss: 30,
            baseShieldHealth: 15,
            shieldHealthIncreasePerBoss: 5,
            shieldBossStart: 3,
            shootInterval: 2000,
            bulletSpeed: 6,
            bulletWidth: 12,
            bulletHeight: 12,
            color: '#ff0000',
            pointValue: 500
        },
        powerup: {
            width: 30,
            height: 30,
            speed: 3,
            spawnInterval: 10000,
            types: {
                talentPoint: { icon: '⭐', color: '#ff00ff', name: 'TALENT +1' }
            }
        },
        formations: {
            patterns: ['circle', 'diamond', 'vShape', 'cross', 'spiral', 'heart', 'wings', 'hexagon']
        },
        fps: 60
    };

    if (typeof window !== 'undefined') {
        window.MiniInvadersConfig = MiniInvadersConfig;
    }
})();
