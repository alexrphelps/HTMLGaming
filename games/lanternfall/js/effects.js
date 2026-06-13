(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG } = Lanternfall;

  function isSpeedActive(state) {
    return state.speedRemaining > 0;
  }

  function moveDuration(state) {
    return isSpeedActive(state) ? CONFIG.movement.speedDuration : CONFIG.movement.normalDuration;
  }

  function updateTimedEffects(state, dt) {
    state.speedRemaining = Math.max(0, state.speedRemaining - dt);

    if (state.compassPing) {
      state.compassPing.remaining -= dt;
      if (state.compassPing.remaining <= 0) {
        state.compassPing = null;
      }
    }
  }

  function resolveArrival(state, world, x, y, services = {}) {
    const tile = world.getTile(x, y);
    if (!tile.item || tile.item.taken) {
      return null;
    }

    tile.item.taken = true;
    const result = applyItemEffect(state, world, tile.item.kind);
    const ui = services.ui || {};
    const audio = services.audio || {};

    if (ui.toast && result.message) ui.toast(result.message);
    if (audio.sfx) audio.sfx(tile.item.kind);

    return result;
  }

  function applyItemEffect(state, world, kind) {
    switch (kind) {
      case "gem":
        state.score += CONFIG.items.score;
        return { kind, message: CONFIG.ui.messages.gem };
      case "speed":
        state.speedRemaining = CONFIG.effects.speedDuration;
        return { kind, message: CONFIG.ui.messages.speed };
      case "lantern":
        state.visionRadius = Math.min(CONFIG.vision.max, state.visionRadius + CONFIG.vision.step);
        state.lanternLevel += 1;
        return { kind, message: CONFIG.ui.messages.lantern };
      case "compass": {
        const target = world.findNearestItem(state.player.gx, state.player.gy, CONFIG.effects.compassSearchRadius);
        if (target) {
          state.compassPing = {
            x: target.x,
            y: target.y,
            remaining: CONFIG.effects.compassDuration
          };
          return { kind, target, message: CONFIG.ui.messages.compassFound };
        }
        return { kind, target: null, message: CONFIG.ui.messages.compassLost };
      }
      default:
        return { kind, message: "" };
    }
  }

  Lanternfall.effects = {
    isSpeedActive,
    moveDuration,
    updateTimedEffects,
    resolveArrival,
    applyItemEffect
  };
})();
