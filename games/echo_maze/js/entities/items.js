(function () {
  'use strict';

  const em = window.EchoMaze || {};

  const ITEM_ORDER = em.ITEM_ORDER || ['lantern', 'boots', 'phase', 'compass', 'map', 'shield', 'battery', 'relic'];
  const ITEM_EFFECTS = {
    lantern(state, effect, context) {
      const p = state.player;
      p.visionBonus = Math.min(em.CONFIG.playerCaps.maxVisionBonus, p.visionBonus + effect.visionBonus);
      em.restoreFuel(state, effect.restoreFuel, false);
      context.revealRadius = p.vision + 1;
      em.addFloatingText(state, effect.floatingText, context.cx, context.cy - 28, context.color);
    },
    boots(state, effect) {
      state.player.speed = Math.min(em.CONFIG.playerCaps.maxSpeed, state.player.speed + effect.speed);
    },
    phase(state, effect) {
      state.player.phaseCharges = Math.min(em.CONFIG.playerCaps.maxPhaseCharges, state.player.phaseCharges + effect.charges);
    },
    compass(state, effect, context) {
      state.player.compass = Math.min(em.CONFIG.playerCaps.maxCompass, state.player.compass + effect.compass);
      context.revealRadius = effect.revealRadius + state.player.compass;
    },
    map(state, effect, context) {
      context.revealRadius = effect.revealRadius;
      em.revealPathBurst(state, context.x, context.y, effect.pathBurstRadius);
    },
    shield(state, effect) {
      state.player.shields = Math.min(em.CONFIG.playerCaps.maxShields, state.player.shields + effect.shields);
    },
    battery(state, effect) {
      state.player.battery = Math.min(em.CONFIG.playerCaps.maxBattery, state.player.battery + effect.battery);
      em.restoreFuel(state, effect.restoreFuel, false);
      state.danger = Math.max(0, state.danger - em.CONFIG.danger.batteryReduction);
    },
    relic(state, effect, context) {
      state.player.phaseCharges = Math.min(em.CONFIG.playerCaps.maxPhaseCharges, state.player.phaseCharges + effect.charges);
      context.revealRadius = effect.revealRadius;
    }
  };

  function itemForCell(state, x, y) {
    if (state.gameMode === 'beginner') {
      const tutorialItem = em.tutorialItemForCell ? em.tutorialItemForCell(state, x, y) : null;
      return tutorialItem || beginnerItemForCell(state, x, y);
    }

    if (!canSpawnItemAt(state, x, y)) return null;

    const rate = itemSpawnRate(state);
    if (em.rand01(state, x, y, em.CONFIG.items.classicSpawnSalt) > rate) return null;

    const type = classicItemTypeForCell(state, x, y);

    return { type, data: em.ITEM_DATA[type] };
  }

  function canSpawnItemAt(state, x, y) {
    const k = em.keyOf(x, y);
    if (state.collected.has(k)) return false;
    if (Math.abs(x) + Math.abs(y) < em.CONFIG.items.spawnExclusionDistance) return false;
    if (state.objective && x === state.objective.x && y === state.objective.y) return false;
    if (state.exitPortal && x === state.exitPortal.x && y === state.exitPortal.y) return false;
    if (em.enemyAtCell && em.enemyAtCell(state, x, y, 'mimic')) return false;
    return true;
  }

  function classicItemTypeForCell(state, x, y) {
    const roll = em.rand01(state, x, y, em.CONFIG.items.classicTypeSalt);
    const entry = (em.CLASSIC_ITEM_ROLLS || []).find(item => roll < item.max);
    return entry ? entry.type : 'relic';
  }

  function beginnerItemForCell(state, x, y) {
    if (!canSpawnItemAt(state, x, y)) return null;
    if (em.tutorialTargetAt && em.tutorialTargetAt(state, x, y)) return null;

    const unlocked = unlockedBeginnerItemTypes(state);
    if (!unlocked.length) return null;
    if (em.rand01(state, x, y, beginnerItemSalt(state, em.CONFIG.items.classicSpawnSalt)) > itemSpawnRate(state)) return null;

    const type = beginnerItemTypeForCell(state, x, y, unlocked);
    return { type, data: em.ITEM_DATA[type] };
  }

  function unlockedBeginnerItemTypes(state) {
    return ITEM_ORDER.filter(type => em.hasDiscoveredTutorial && em.hasDiscoveredTutorial(state, type));
  }

  function itemSpawnRate(state) {
    return em.CONFIG.items.baseSpawnRate + Math.min(em.CONFIG.items.maxAnchorSpawnBonus, state.anchors * em.CONFIG.items.anchorSpawnBonus);
  }

  function beginnerItemSalt(state, baseSalt) {
    return baseSalt + (state.beginnerItemEpoch || 0) * em.CONFIG.items.beginnerEpochSalt;
  }

  function beginnerItemTypeForCell(state, x, y, unlocked = unlockedBeginnerItemTypes(state)) {
    const roll = em.rand01(state, x, y, beginnerItemSalt(state, em.CONFIG.items.classicTypeSalt));
    const index = Math.min(unlocked.length - 1, Math.floor(roll * unlocked.length));
    return unlocked[index];
  }

  function collectNearbyItems(state) {
    const p = state.player;
    const radius = p.r + p.pickupRadius;
    const pc = em.cellOfWorld(p.x, p.y);
    const minX = Math.floor((p.x - radius) / em.CONFIG.cell);
    const maxX = Math.floor((p.x + radius) / em.CONFIG.cell);
    const minY = Math.floor((p.y - radius) / em.CONFIG.cell);
    const maxY = Math.floor((p.y + radius) / em.CONFIG.cell);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const item = itemForCell(state, x, y);
        if (!item) continue;

        const cx = x * em.CONFIG.cell + em.CONFIG.cell / 2;
        const cy = y * em.CONFIG.cell + em.CONFIG.cell / 2;

        if (Math.hypot(cx - p.x, cy - p.y) <= radius + em.CONFIG.items.pickupPadding) {
          if (!canReachItemForPickup(state, pc, x, y)) continue;
          collectItem(state, x, y, item);
          if (state.mode !== 'playing') return;
        }
      }
    }
  }

  function canReachItemForPickup(state, playerCell, itemX, itemY) {
    const dx = Math.abs(itemX - playerCell.x);
    const dy = Math.abs(itemY - playerCell.y);

    if (dx === 0 && dy === 0) return true;

    if (dx + dy === 1) {
      return !em.isBlockedBetween(state, playerCell.x, playerCell.y, itemX, itemY);
    }

    if (dx <= 2 && dy <= 2 && typeof em.findPath === 'function') {
      const path = em.findPath(state, playerCell, { x: itemX, y: itemY }, em.CONFIG.items.pickupReachPathLimit);
      return Boolean(path && path.length <= em.CONFIG.items.pickupReachMaxPathLength);
    }

    return false;
  }

  function collectItem(state, x, y, item) {
    const cx = x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const cy = y * em.CONFIG.cell + em.CONFIG.cell / 2;
    let revealRadius = 4.8;
    const score = item.data.score;

    state.collected.add(em.keyOf(x, y));
    state.items++;

    const context = { x, y, cx, cy, color: item.data.color, revealRadius };
    const effect = item.data.effect || {};
    const applyEffect = ITEM_EFFECTS[effect.type || item.type];
    if (applyEffect) applyEffect(state, effect, context);
    revealRadius = context.revealRadius;

    state.score += score;
    state.screenPulse = Math.max(state.screenPulse, 0.28);
    em.revealAround(state, x, y, revealRadius);
    em.addPulse(state, cx, cy, em.CONFIG.cell * (3.2 + revealRadius * 0.5), 0.8, item.data.color);
    em.addParticles(state, cx, cy, item.data.color, 18);
    em.addFloatingText(state, '+' + score, cx, cy - 8, item.data.color);
    em.addMessage(state, item.data.label + ': ' + item.data.message + ' +' + score + '.');

    const wasBeginnerTutorialItem = state.gameMode === 'beginner' && em.tutorialTargetAt && em.tutorialTargetAt(state, x, y);

    if (state.gameMode === 'beginner' && wasBeginnerTutorialItem && em.handleTutorialItemCollected) {
      em.handleTutorialItemCollected(state, x, y, item);
    } else if (state.gameMode === 'beginner') {
      state.beginnerItemEpoch = (state.beginnerItemEpoch || 0) + 1;
    }
  }

  Object.assign(em, {
    itemForCell,
    canSpawnItemAt,
    classicItemTypeForCell,
    beginnerItemForCell,
    unlockedBeginnerItemTypes,
    itemSpawnRate,
    beginnerItemSalt,
    beginnerItemTypeForCell,
    ITEM_EFFECTS,
    collectNearbyItems,
    canReachItemForPickup,
    collectItem
  });
  window.EchoMaze = em;
})();
