(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.UPGRADE_DATA = {
    compassObjective: {
      label: 'Compass Clarity',
      color: '#7df9ff',
      max: 3,
      text: 'Detected Anchor arrows glow steadier, without increasing scan range.'
    },
    compassItems: {
      label: 'Compass Items',
      color: '#8ab8ff',
      max: 3,
      text: 'Item pings appear farther on the minimap.'
    },
    compassDanger: {
      label: 'Compass Danger',
      color: '#ff4e38',
      max: 3,
      text: 'Earlier danger warnings and enemy pings.'
    },
    compassRange: {
      label: 'Compass Range',
      color: '#ffffff',
      max: 3,
      text: 'The minimap reaches deeper into known maze.'
    },
    lanternReservoir: {
      label: 'Lantern Glass',
      color: '#ffe27a',
      max: 3,
      text: 'Raises your minimum Vision so the maze can never dim quite as far.'
    },
    lanternFocus: {
      label: 'Lantern Wick',
      color: '#8ef7a2',
      max: 3,
      text: 'Raises your minimum Vision with a steadier, greener flame.'
    },
    phaseDuration: {
      label: 'Phase Duration',
      color: '#bd8cff',
      max: 3,
      text: 'Phase lasts longer and leaves a stronger trail.'
    },
    phaseCooldown: {
      label: 'Phase Cooldown',
      color: '#9ad4ff',
      max: 3,
      text: 'Phase recovers faster between activations.'
    }
  };

  const UPGRADE_IDS = Object.keys(em.UPGRADE_DATA);

  function createUpgradeState() {
    const upgrades = {};
    for (const id of UPGRADE_IDS) upgrades[id] = 0;
    return upgrades;
  }

  function availableUpgradeIds(state) {
    return UPGRADE_IDS.filter(id => (state.upgrades[id] || 0) < em.UPGRADE_DATA[id].max);
  }

  function generateUpgradeChoices(state) {
    const ids = availableUpgradeIds(state);
    const scored = ids.map(id => ({
      id,
      score: em.hash32(state, state.anchors, state.tier, 15000 + UPGRADE_IDS.indexOf(id) * 97)
    }));

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, em.CONFIG.upgrades.choices).map(entry => entry.id);
  }

  function beginUpgradeSelection(state) {
    state.pendingUpgrades = generateUpgradeChoices(state);
    state.previousMode = 'playing';
    state.mode = 'upgrade';
    em.addMessage(state, 'Choose an upgrade before the maze shifts.');
  }

  function chooseUpgrade(state, id) {
    if (!state || state.mode !== 'upgrade') return false;
    if (!state.pendingUpgrades || !state.pendingUpgrades.includes(id)) return false;

    applyUpgrade(state, id);
    state.pendingUpgrades = [];
    state.mode = 'playing';

    if (typeof em.completeAnchorAdvance === 'function') em.completeAnchorAdvance(state);
    return true;
  }

  function applyUpgrade(state, id) {
    const data = em.UPGRADE_DATA[id];
    if (!data) return;

    state.upgrades[id] = Math.min(data.max, (state.upgrades[id] || 0) + 1);
    const level = state.upgrades[id];
    const p = state.player;

    if (id === 'compassObjective') p.compassObjective = level;
    else if (id === 'compassItems') p.compassItems = level;
    else if (id === 'compassDanger') p.compassDanger = level;
    else if (id === 'compassRange') p.minimapBonus = level;
    else if (id === 'lanternReservoir') {
      p.minVision = Math.min(em.CONFIG.maxVision, p.minVision + em.CONFIG.upgrades.lanternReservoirMinVision);
    } else if (id === 'lanternFocus') {
      p.minVision = Math.min(em.CONFIG.maxVision, p.minVision + em.CONFIG.upgrades.lanternFocusMinVision);
    } else if (id === 'phaseDuration') {
      p.phaseDuration = em.CONFIG.phaseDuration + level * em.CONFIG.upgrades.phaseDurationPerLevel;
    } else if (id === 'phaseCooldown') {
      p.phaseCooldown = Math.max(em.CONFIG.upgrades.phaseCooldownFloor, em.CONFIG.phaseCooldown - level * em.CONFIG.upgrades.phaseCooldownPerLevel);
    }

    updateLanternVision(state, 0);
    em.addFloatingText(state, data.label, p.x, p.y - 26, data.color);
    em.addParticles(state, p.x, p.y, data.color, 22);
    em.addMessage(state, data.label + ' upgraded to level ' + level + '.');
  }

  function updateVisionAndDanger(state, dt) {
    const p = state.player;
    p.phaseCooldownTimer = Math.max(0, p.phaseCooldownTimer - dt);

    if (state.gameMode === 'beginner' && (!em.hasDiscoveredTutorial || !em.hasDiscoveredTutorial(state, 'lantern'))) {
      state.danger = 0;
      updateLanternVision(state, 0);
      return;
    }

    updateLanternVision(state, dt);

    if (state.gameMode === 'beginner') {
      state.danger = 0;
      return;
    }

    updateDistanceDanger(state, dt);
  }

  function updateLanternVision(state, dt = 0) {
    const p = state.player;
    p.minVision = Math.max(em.CONFIG.baseVision, Math.min(em.CONFIG.maxVision, p.minVision || em.CONFIG.baseVision));
    p.visionBonus = Math.max(0, p.visionBonus || 0);

    if (dt > 0) {
      p.visionBonus = Math.max(0, p.visionBonus - em.CONFIG.visionDecayPerSecond * dt);
    }

    const maxBonus = Math.max(0, Math.min(em.CONFIG.playerCaps.maxVisionBonus, em.CONFIG.maxVision - p.minVision));
    p.visionBonus = Math.min(maxBonus, p.visionBonus);

    if (state.gameMode === 'beginner' && (!em.hasDiscoveredTutorial || !em.hasDiscoveredTutorial(state, 'lantern'))) {
      p.vision = p.minVision;
      return;
    }

    p.vision = Math.max(p.minVision, Math.min(em.CONFIG.maxVision, p.minVision + p.visionBonus));
  }

  function updateDistanceDanger(state, dt) {
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const distanceTarget = em.dangerForCell ? em.dangerForCell(pc.x, pc.y) : 0;
    const target = state.gameMode === 'noExit' ? noExitDangerTarget(state, distanceTarget) : distanceTarget;

    if (state.danger < target) {
      state.danger = Math.min(target, state.danger + em.CONFIG.danger.depthRiseRate * dt);
    } else if (state.gameMode === 'noExit') {
      state.danger = Math.max(state.danger, target);
    } else {
      state.danger = Math.max(target, state.danger - em.CONFIG.danger.recoveryRate * dt);
    }
  }

  function noExitDangerTarget(state, distanceTarget) {
    const timePressure = Math.max(0, state.time - em.CONFIG.noExit.voidDelay) * em.CONFIG.noExit.dangerRisePerSecond;
    return Math.min(1, Math.max(distanceTarget, timePressure));
  }

  function raiseDanger(state, amount) {
    const beforeBucket = Math.floor(state.danger * em.CONFIG.danger.warningBuckets);
    state.danger = Math.min(1, state.danger + amount);
    const afterBucket = Math.floor(state.danger * em.CONFIG.danger.warningBuckets);

    if (afterBucket > beforeBucket || (state.danger > em.CONFIG.danger.warningThreshold && state.dangerPulse <= 0)) {
      state.dangerPulse = em.CONFIG.danger.warningPulse;
      em.addFloatingText(state, 'Danger Rising', state.player.x, state.player.y - 34, '#ff4e38');
      em.addMessage(state, 'Danger rising. The outer maze is waking.');
      if (typeof em.addDangerSmoke === 'function') em.addDangerSmoke(state, state.player.x, state.player.y, 10);
    }
  }

  function tickDangerWarning(state, dt) {
    state.dangerPulse = Math.max(0, state.dangerPulse - dt);
  }

  Object.assign(em, {
    createUpgradeState,
    availableUpgradeIds,
    generateUpgradeChoices,
    beginUpgradeSelection,
    chooseUpgrade,
    applyUpgrade,
    updateVisionAndDanger,
    updateLanternVision,
    updateDistanceDanger,
    noExitDangerTarget,
    raiseDanger,
    tickDangerWarning
  });
  window.EchoMaze = em;
})();
