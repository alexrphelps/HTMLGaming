(function() {
  "use strict";

  const ns = window.GravityLocksmith;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const hud = {
    root: document.getElementById("game-hud"),
    roomTitle: document.getElementById("hud-room-title"),
    roomStats: document.getElementById("hud-room-stats"),
    roomTip: document.getElementById("hud-room-tip"),
    roomJumps: document.getElementById("hud-room-jumps"),
    chargeFill: document.getElementById("hud-charge-fill"),
    chargeCount: document.getElementById("hud-charge-count"),
    jumpFill: document.getElementById("hud-jump-fill"),
    jumpCount: document.getElementById("hud-jump-count"),
    runes: document.getElementById("hud-runes"),
    gravity: document.getElementById("hud-gravity")
  };
  const input = ns.createInputController(window);
  const runtime = ns.createGameRuntime(ns.ROOM_DEFINITIONS);
  const renderer = ns.createRenderer(canvas, ctx);

  window.gravityLocksmithRuntime = runtime;

  let lastFrame = performance.now();

  function getChargeText(current, maximum, cost) {
    const available = Math.floor(current / cost);
    const total = Math.floor(maximum / cost);
    return available + "/" + total;
  }

  function getChargeWidth(current, maximum) {
    return Math.min(100, 100 * current / maximum) + "%";
  }

  function syncHud(state) {
    const showHud = state.session.screen === ns.SCREEN.PLAY || state.session.screen === ns.SCREEN.RESPAWN;
    document.body.classList.toggle("hud-visible", showHud);
    if (!showHud) return;

    const collected = state.roomState.shards.filter(function(shard) {
      return shard.got;
    }).length;
    hud.roomTitle.textContent = (state.session.roomIndex + 1) + ". " + state.room.name;
    hud.roomStats.textContent = "Time " + ns.fmtTime(state.session.roomTime) + "   Deaths " + state.session.roomDeaths + "   Flips " + state.session.roomFlips + (state.room.chase ? "   RED LINE" : "");
    hud.roomTip.textContent = state.room.tip;
    hud.roomJumps.textContent = "Double jump " + (state.player.doubleJumpEnergy >= state.config.player.doubleJumpEnergyCost ? "ready" : "empty");
    hud.chargeFill.style.width = getChargeWidth(state.player.energy, state.config.player.maxEnergy);
    hud.chargeFill.style.background = state.player.energy >= state.config.player.energyPerFlip ? "#55f7ff" : "#ff4d6d";
    hud.chargeFill.style.boxShadow = state.player.energy >= state.config.player.energyPerFlip
      ? "0 0 16px rgba(85, 247, 255, 0.55)"
      : "0 0 16px rgba(255, 77, 109, 0.45)";
    hud.chargeFill.classList.toggle("is-overcharged", state.player.energy > state.config.player.maxEnergy);
    hud.chargeCount.textContent = getChargeText(state.player.energy, state.config.player.maxEnergy, state.config.player.energyPerFlip);
    hud.jumpFill.style.width = getChargeWidth(state.player.doubleJumpEnergy, state.config.player.maxDoubleJumpEnergy);
    hud.jumpFill.style.background = state.player.doubleJumpEnergy >= state.config.player.doubleJumpEnergyCost ? "#ffd96a" : "#ff4d6d";
    hud.jumpFill.style.boxShadow = state.player.doubleJumpEnergy >= state.config.player.doubleJumpEnergyCost
      ? "0 0 16px rgba(255, 217, 106, 0.55)"
      : "0 0 16px rgba(255, 77, 109, 0.45)";
    hud.jumpFill.classList.toggle("is-overcharged", state.player.doubleJumpEnergy > state.config.player.maxDoubleJumpEnergy);
    hud.jumpCount.textContent = getChargeText(state.player.doubleJumpEnergy, state.config.player.maxDoubleJumpEnergy, state.config.player.doubleJumpEnergyCost);
    hud.runes.textContent = collected + "/" + state.roomState.shards.length + " Runes";
    hud.gravity.textContent = state.roomState.gravity === 1 ? "v" : "^";
    hud.gravity.style.color = state.roomState.gravity === 1 ? "#edf7ff" : "#55f7ff";
  }

  function loop(now) {
    const dt = Math.min(ns.CONFIG.timing.frameClamp, (now - lastFrame) / 1000);
    lastFrame = now;

    runtime.update(dt, input.getActions());
    const state = runtime.getRenderState();
    syncHud(state);
    renderer.render(state);
    input.endFrame();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
