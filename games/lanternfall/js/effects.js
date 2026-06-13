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
    if (state.started && state.status === "active") {
      state.fuel = Math.max(0, state.fuel - CONFIG.fuel.idleCost * dt);
    }

    if (state.compassPing) {
      state.compassPing.remaining -= dt;
      if (state.compassPing.remaining <= 0) {
        state.compassPing = null;
      }
    }
  }

  function spendFuel(state, amount) {
    state.fuel = Math.max(0, state.fuel - amount);
    return state.fuel > 0;
  }

  function restoreFuel(state, amount) {
    state.fuel = Math.min(state.maxFuel, state.fuel + amount);
  }

  function resolveArrival(state, world, x, y, services = {}) {
    const tile = world.getTile(x, y);
    const ui = services.ui || {};
    const audio = services.audio || {};

    if (tile.type === Lanternfall.TILE_TYPES.RELIC && !state.hasEmber) {
      state.hasEmber = true;
      state.score += CONFIG.run.relicScore;
      state.compassPing = { x: 0, y: 0, remaining: CONFIG.effects.compassDuration };
      if (ui.toast) ui.toast(CONFIG.ui.messages.relic);
      if (audio.sfx) audio.sfx("relic");
      return { kind: "relic", message: CONFIG.ui.messages.relic };
    }

    if (tile.type === Lanternfall.TILE_TYPES.CAMP && state.hasEmber) {
      state.status = "won";
      state.paused = true;
      state.score += CONFIG.run.extractionScore;
      if (ui.toast) ui.toast(CONFIG.ui.messages.extracted);
      if (audio.sfx) audio.sfx("win");
      return { kind: "extracted", message: CONFIG.ui.messages.extracted };
    }

    if (!tile.item || tile.item.taken) {
      return null;
    }

    tile.item.taken = true;
    const result = applyItemEffect(state, world, tile.item.kind);

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
        restoreFuel(state, CONFIG.fuel.lanternRestore);
        return { kind, message: CONFIG.ui.messages.lantern };
      case "oil":
        restoreFuel(state, CONFIG.fuel.oilRestore);
        return { kind, message: CONFIG.ui.messages.oil };
      case "compass": {
        const target = state.hasEmber
          ? { x: 0, y: 0 }
          : world.findNearestItem(state.player.gx, state.player.gy, CONFIG.effects.compassSearchRadius);
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
    spendFuel,
    restoreFuel,
    resolveArrival,
    applyItemEffect
  };
})();
