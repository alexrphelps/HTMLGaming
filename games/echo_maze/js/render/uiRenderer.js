(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function draw(app) {
    const state = app.state;
    const ctx = app.ctx;
    const w = app.width || app.canvas.logicalWidth || app.window.innerWidth;
    const h = app.height || app.canvas.logicalHeight || app.window.innerHeight;
    const shakeX = state.screenShake > 0 ? Math.sin(state.time * 51) * state.screenShake : 0;
    const shakeY = state.screenShake > 0 ? Math.cos(state.time * 47) * state.screenShake : 0;
    const camX = state.camera.x - w / 2 + shakeX;
    const camY = state.camera.y - h / 2 + shakeY;

    ctx.clearRect(0, 0, w, h);
    em.drawVoid(ctx, w, h);

    const minCellX = Math.floor(camX / em.CONFIG.cell) - 2;
    const maxCellX = Math.floor((camX + w) / em.CONFIG.cell) + 2;
    const minCellY = Math.floor(camY / em.CONFIG.cell) - 2;
    const maxCellY = Math.floor((camY + h) / em.CONFIG.cell) + 2;

    for (let y = minCellY; y <= maxCellY; y++) {
      for (let x = minCellX; x <= maxCellX; x++) {
        if (!state.revealed.has(em.keyOf(x, y))) continue;
        em.drawCellFloor(ctx, state, x, y, camX, camY);
      }
    }

    em.drawCrumbs(ctx, state, camX, camY);
    em.drawItems(ctx, state, minCellX, maxCellX, minCellY, maxCellY, camX, camY);
    em.drawObjective(ctx, state, camX, camY);
    em.drawExitPortal(ctx, state, camX, camY);

    for (let y = minCellY; y <= maxCellY; y++) {
      for (let x = minCellX; x <= maxCellX; x++) {
        if (!state.revealed.has(em.keyOf(x, y))) continue;
        em.drawCellWalls(ctx, state, x, y, camX, camY);
      }
    }

    em.drawPulses(ctx, state, camX, camY);
    em.drawParticles(ctx, state, camX, camY);
    em.drawWarden(ctx, state, camX, camY);
    em.drawEnemies(ctx, state, camX, camY);
    em.drawPlayer(ctx, state, state.player.x - camX, state.player.y - camY);
    em.drawFloatingText(ctx, state, camX, camY);
    em.drawFogVignette(ctx, w, h);
    em.drawScreenPulse(ctx, state, w, h);
    em.drawCompass(ctx, state, w, h);

    if (state.showMini) em.drawMinimap(ctx, state, w, h);

    em.updateHud(app);
    em.renderOverlay(app);
  }

  Object.assign(em, { draw });
  window.EchoMaze = em;
})();
