(function () {
  'use strict';

  const em = window.EchoMaze || {};

  em.UPGRADE_DATA = {
    compassObjective: {
      label: 'Compass Objective',
      color: '#7df9ff',
      max: 3,
      text: 'Sharper Anchor tracking and objective range.'
    },
    compassItems: {
      label: 'Compass Items',
      color: '#8ab8ff',
      max: 3,
      text: 'Item pings appear farther on the minimap.'
    },
    compassDanger: {
      label: 'Compass Danger',
      color: '#ff6f9d',
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
      label: 'Lantern Reservoir',
      color: '#ffe27a',
      max: 3,
      text: 'More maximum fuel and an immediate refill.'
    },
    lanternFocus: {
      label: 'Lantern Focus',
      color: '#8ef7a2',
      max: 3,
      text: 'Fuel drains slower and low-fuel sight stays safer.'
    },
    phaseDuration: {
      label: 'Phase Duration',
      color: '#bd8cff',
      max: 3,
      text: 'Phase lasts longer and leaves a stronger trail.'
    },
    phaseCooldown: {
      label: 'Phase Cooldown',
      color: '#ff88c8',
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
    return scored.slice(0, 3).map(entry => entry.id);
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
      p.maxFuel += 18;
      restoreFuel(state, 55, false);
    } else if (id === 'lanternFocus') {
      restoreFuel(state, 24, false);
    } else if (id === 'phaseDuration') {
      p.phaseDuration = em.CONFIG.phaseDuration + level * 0.55;
    } else if (id === 'phaseCooldown') {
      p.phaseCooldown = Math.max(1.6, em.CONFIG.phaseCooldown - level * 0.7);
    }

    updateLanternVision(state);
    em.addFloatingText(state, data.label, p.x, p.y - 26, data.color);
    em.addParticles(state, p.x, p.y, data.color, 22);
    em.addMessage(state, data.label + ' upgraded to level ' + level + '.');
  }

  function restoreFuel(state, amount, showText = true) {
    const p = state.player;
    const before = p.fuel;
    p.fuel = Math.min(p.maxFuel, p.fuel + amount);
    updateLanternVision(state);

    if (showText && p.fuel > before) {
      em.addFloatingText(state, 'Fuel +' + Math.round(p.fuel - before), p.x, p.y - 20, '#ffe27a');
    }
  }

  function updateLanternFuel(state, dt) {
    const p = state.player;
    p.phaseCooldownTimer = Math.max(0, p.phaseCooldownTimer - dt);

    const focus = state.upgrades.lanternFocus || 0;
    const drain = em.CONFIG.fuelDrainPerSecond * (1 - focus * 0.15);
    p.fuel = Math.max(0, p.fuel - drain * dt);

    if (state.gameMode === 'beginner') {
      state.danger = 0;
      updateLanternVision(state);
      return;
    }

    if (p.fuel <= p.maxFuel * 0.24) {
      raiseDanger(state, dt * (0.035 + state.anchors * 0.008));
    } else {
      state.danger = Math.max(0, state.danger - dt * 0.012);
    }

    updateLanternVision(state);
  }

  function updateLanternVision(state) {
    const p = state.player;
    const focus = state.upgrades?.lanternFocus || 0;
    const minVision = em.CONFIG.baseVision + focus * 0.22;
    const fuelRatio = p.maxFuel > 0 ? p.fuel / p.maxFuel : 0;
    const fuelBonus = em.CONFIG.fuelVisionBonus * Math.sqrt(Math.max(0, fuelRatio));
    p.vision = Math.min(em.CONFIG.maxVision, minVision + p.visionBonus + fuelBonus);
  }

  function raiseDanger(state, amount) {
    const beforeBucket = Math.floor(state.danger * 4);
    state.danger = Math.min(1, state.danger + amount);
    const afterBucket = Math.floor(state.danger * 4);

    if (afterBucket > beforeBucket || (state.danger > 0.72 && state.dangerPulse <= 0)) {
      state.dangerPulse = 4.5;
      em.addFloatingText(state, 'Danger Rising', state.player.x, state.player.y - 34, '#ff6f9d');
      em.addMessage(state, 'Danger rising. Find fuel or stabilize an Anchor.');
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
    restoreFuel,
    updateLanternFuel,
    updateLanternVision,
    raiseDanger,
    tickDangerWarning
  });
  window.EchoMaze = em;
})();
