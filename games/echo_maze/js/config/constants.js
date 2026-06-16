(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.CONFIG = {
    cell: 63,
    chunk: 12,
    runAnchors: 5,
    baseItemRate: 0.032,
    maxDpr: 2,
    baseVision: 2,
    baseSpeed: 150,
    playerRadius: 9,
    phaseDuration: 2.8,
    phaseCooldown: 3.8,
    maxVision: 11.75,
    visionDecayPerSecond: 0.055,
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
      maxVisionBonus: 9.75,
      maxSpeed: 255,
      maxBoostedSpeed: 345,
      maxPhaseCharges: 9,
      maxCompass: 8,
      maxShields: 5,
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
      startSafeRadius: 10,
      fullDepthRadius: 135,
      depthRiseRate: 0.22,
      recoveryRate: 0.055,
      batteryReduction: 0.08,
      anchorReduction: 0.28,
      warningBuckets: 4,
      warningPulse: 4.5,
      warningThreshold: 0.72
    },
    enemies: {
      ambientBaseCount: 2,
      ambientAnchorDivisor: 2,
      ambientMaxCount: 5,
      criticalBonusCount: 3,
      criticalThreshold: 0.82,
      criticalMinNearby: 6,
      nearbyRadius: 36,
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
      maxPerAnchor: 2,
      criticalMaxBonus: 8
    },
    anchors: {
      firstRadius: 26,
      radiusStep: 19,
      minOutwardStep: 11,
      candidateCount: 112,
      searchRings: 5,
      radiusJitter: 8,
      activeCountMin: 2,
      activeCountMax: 5,
      activeCountTierStep: 2,
      spread: 10
    },
    anchorRewards: {
      parTimeBase: 35,
      parTimePathScale: 0.78,
      speedBonusBase: 6,
      phasePenalty: 35,
      phaseReward: 1,
      revealBase: 9,
      revealAnchorCap: 7,
      victoryScore: 1200,
      victoryHealthBonus: 250,
      victoryShieldBonus: 150
    },
    upgrades: {
      choices: 3,
      lanternReservoirMinVision: 0.72,
      lanternFocusMinVision: 0.48,
      quickstepOverflowDuration: 3,
      quickstepOverflowMultiplier: 1.35,
      phaseDurationPerLevel: 0.55,
      phaseCooldownPerLevel: 0.7,
      phaseCooldownFloor: 1.6
    },
    noExit: {
      voidDelay: 5,
      voidStartRadiusCells: 0,
      voidBaseGrowthCellsPerSecond: 0.28,
      voidGrowthPerMinute: 0.10,
      dangerRisePerSecond: 0.012,
      enemyPressureBonus: 0.25,
      enemyCapBonus: 10
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
