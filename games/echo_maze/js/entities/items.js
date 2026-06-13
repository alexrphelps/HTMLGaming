(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function itemForCell(state, x, y) {
    const k = em.keyOf(x, y);

    if (state.collected.has(k)) return null;
    if (Math.abs(x) + Math.abs(y) < 5) return null;
    if (state.objective && x === state.objective.x && y === state.objective.y) return null;
    if (state.exitPortal && x === state.exitPortal.x && y === state.exitPortal.y) return null;
    if (em.enemyAtCell && em.enemyAtCell(state, x, y, 'mimic')) return null;

    const rate = em.CONFIG.baseItemRate + Math.min(0.018, state.anchors * 0.002);
    if (em.rand01(state, x, y, 5050) > rate) return null;

    const roll = em.rand01(state, x, y, 6060);
    let type = 'lantern';

    if (roll < 0.15) type = 'lantern';
    else if (roll < 0.30) type = 'boots';
    else if (roll < 0.45) type = 'phase';
    else if (roll < 0.58) type = 'compass';
    else if (roll < 0.72) type = 'map';
    else if (roll < 0.84) type = 'shield';
    else if (roll < 0.95) type = 'battery';
    else type = 'relic';

    return { type, data: em.ITEM_DATA[type] };
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

        if (Math.hypot(cx - p.x, cy - p.y) <= radius + 8) {
          if (!canReachItemForPickup(state, pc, x, y)) continue;
          collectItem(state, x, y, item);
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
      const path = em.findPath(state, playerCell, { x: itemX, y: itemY }, 12);
      return Boolean(path && path.length <= 4);
    }

    return false;
  }

  function collectItem(state, x, y, item) {
    const p = state.player;
    const cx = x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const cy = y * em.CONFIG.cell + em.CONFIG.cell / 2;
    let revealRadius = 4.8;
    const score = item.data.score;

    state.collected.add(em.keyOf(x, y));
    state.items++;

    if (item.type === 'lantern') {
      p.visionBonus = Math.min(3.4, p.visionBonus + 0.62);
      em.restoreFuel(state, 36, false);
      revealRadius = p.vision + 1;
      em.addFloatingText(state, 'Vision Up', cx, cy - 28, item.data.color);
    } else if (item.type === 'boots') {
      p.speed = Math.min(255, p.speed + 10);
    } else if (item.type === 'phase') {
      p.phaseCharges = Math.min(9, p.phaseCharges + 1);
    } else if (item.type === 'compass') {
      p.compass = Math.min(5, p.compass + 1);
      revealRadius = 6 + p.compass;
    } else if (item.type === 'map') {
      revealRadius = 11;
      em.revealPathBurst(state, x, y, 8);
    } else if (item.type === 'shield') {
      p.shields = Math.min(4, p.shields + 1);
    } else if (item.type === 'battery') {
      p.battery = Math.min(5, p.battery + 1);
      em.restoreFuel(state, 22, false);
      state.danger = Math.max(0, state.danger - 0.08);
    } else if (item.type === 'relic') {
      p.phaseCharges = Math.min(9, p.phaseCharges + 1);
      revealRadius = 12;
    }

    state.score += score;
    state.screenPulse = Math.max(state.screenPulse, 0.28);
    em.revealAround(state, x, y, revealRadius);
    em.addPulse(state, cx, cy, em.CONFIG.cell * (3.2 + revealRadius * 0.5), 0.8, item.data.color);
    em.addParticles(state, cx, cy, item.data.color, 18);
    em.addFloatingText(state, '+' + score, cx, cy - 8, item.data.color);
    em.addMessage(state, item.data.label + ': ' + item.data.message + ' +' + score + '.');
  }

  Object.assign(em, { itemForCell, collectNearbyItems, canReachItemForPickup, collectItem });
  window.EchoMaze = em;
})();
