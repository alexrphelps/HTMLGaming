(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.CONFIG = {
    cell: 63,
    chunk: 12,
    runAnchors: 5,
    baseItemRate: 0.032,
    maxDpr: 2,
    baseVision: 3,
    baseSpeed: 150,
    playerRadius: 9,
    phaseDuration: 2.8,
    phaseCooldown: 3.8,
    fuelDrainPerSecond: 1.35,
    fuelVisionBonus: 5.2,
    maxVision: 11.75,
    memoryTrailTtl: 22,
    minimapBase: 368,
    minimapRange: 38,
    pathLimit: 6200,
    wardenStartDelay: 6,
    wardenDamageCooldown: 1.4
  };

  Object.assign(em.CONFIG, {
    frame: {
      maxDt: 0.05
    },
    messages: {
      ttl: 5.7,
      maxVisible: 5
    },
    playerCaps: {
      maxVisionBonus: 3.4,
      maxSpeed: 255,
      maxPhaseCharges: 9,
      maxCompass: 5,
      maxShields: 4,
      maxBattery: 5,
      maxHealth: 3
    },
    items: {
      baseSpawnRate: 0.032,
      anchorSpawnBonus: 0.002,
      maxAnchorSpawnBonus: 0.018,
      classicSpawnSalt: 5050,
      classicTypeSalt: 6060,
      beginnerEpochSalt: 9973,
      spawnExclusionDistance: 5,
      pickupReachPathLimit: 12,
      pickupReachMaxPathLength: 4,
      pickupPadding: 8
    },
    tutorial: {
      targetCount: 5,
      maxSearchCells: 240,
      maxTargetDistance: 9,
      minTargetDistance: 3,
      targetScoreSalt: 18000
    },
    danger: {
      lowFuelRatio: 0.24,
      lowFuelBaseRise: 0.035,
      lowFuelAnchorRise: 0.008,
      recoveryRate: 0.012,
      batteryReduction: 0.08,
      anchorReduction: 0.28,
      warningBuckets: 4,
      warningPulse: 4.5,
      warningThreshold: 0.72
    },
    enemies: {
      ambientBaseCount: 2,
      ambientAnchorDivisor: 2,
      ambientMaxCount: 4,
      ambientBaseDistance: 14,
      ambientAnchorDistance: 4,
      ambientIndexDistance: 3,
      dangerSpawnThreshold: 0.42,
      dangerSpawnMinDelay: 4,
      dangerSpawnBaseDelay: 10,
      dangerSpawnDelayScale: 5,
      dangerSpawnBaseDistance: 18,
      dangerSpawnAnchorDistance: 5,
      spawnAttempts: 28,
      spawnDistanceJitter: 10,
      minSpawnPathLength: 8,
      mobilePathLimit: 900,
      damageCooldown: 1.2,
      alertDuration: 1.8,
      mimicWakeCells: 2.4,
      sentryBaseRange: 9,
      sentryCompassRange: 2,
      maxBaseCount: 10,
      maxPerAnchor: 2
    },
    anchorRewards: {
      parTimeBase: 35,
      parTimePathScale: 0.78,
      speedBonusBase: 6,
      phasePenalty: 35,
      visionBonus: 0.22,
      phaseReward: 1,
      fuelBase: 34,
      fuelPerAnchor: 4,
      revealBase: 9,
      revealAnchorCap: 7,
      victoryScore: 1200,
      victoryHealthBonus: 250,
      victoryShieldBonus: 150
    },
    upgrades: {
      choices: 3,
      lanternReservoirFuelMax: 18,
      lanternReservoirRestore: 55,
      lanternFocusRestore: 24,
      lanternFocusDrainReduction: 0.15,
      lanternFocusMinVision: 0.22,
      phaseDurationPerLevel: 0.55,
      phaseCooldownPerLevel: 0.7,
      phaseCooldownFloor: 1.6
    }
  });

  em.DIRS = ['N', 'E', 'S', 'W'];
  em.OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };
  em.VEC = {
    N: { x: 0, y: -1 },
    S: { x: 0, y: 1 },
    E: { x: 1, y: 0 },
    W: { x: -1, y: 0 }
  };

  window.EchoMaze = em;
})();
