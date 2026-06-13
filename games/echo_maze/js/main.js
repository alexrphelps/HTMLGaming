(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function collectDom(doc) {
    return {
      runStats: doc.getElementById('runStats'),
      itemMeters: doc.getElementById('itemMeters'),
      secondaryStats: doc.getElementById('secondaryStats'),
      goalText: doc.getElementById('goalText'),
      messageLog: doc.getElementById('messageLog'),
      overlay: doc.getElementById('overlay'),
      overlayTitle: doc.getElementById('overlayTitle'),
      overlayText: doc.getElementById('overlayText'),
      overlayStats: doc.getElementById('overlayStats'),
      primaryBtn: doc.getElementById('primaryBtn'),
      secondaryBtn: doc.getElementById('secondaryBtn'),
      tertiaryBtn: doc.getElementById('tertiaryBtn')
    };
  }

  function resetRun(app, seed) {
    app.state = em.createRun(seed);
    app.input.keys.clear();
    em.renderOverlay(app);
    em.updateHud(app);
    return app.state;
  }

  function handlePrimaryAction(app) {
    if (app.state.mode === 'upgrade') em.chooseUpgrade(app.state, app.state.pendingUpgrades[0]);
    else if (app.state.mode === 'start') em.startRun(app.state);
    else if (app.state.mode === 'paused') em.pauseRun(app.state);
    else if (app.state.mode === 'victory' || app.state.mode === 'gameover') resetRun(app, app.state.seed);
  }

  function handleSecondaryAction(app) {
    if (app.state.mode === 'upgrade') em.chooseUpgrade(app.state, app.state.pendingUpgrades[1]);
    else if (app.state.mode === 'paused') resetRun(app, app.state.seed);
    else resetRun(app);
  }

  function handleTertiaryAction(app) {
    if (app.state.mode === 'upgrade') em.chooseUpgrade(app.state, app.state.pendingUpgrades[2]);
    else if (app.state.mode === 'paused') resetRun(app);
  }

  function bootstrap(doc = document, win = window) {
    const app = em.createCanvasApp(doc, win);
    app.document = doc;
    app.window = win;
    app.dom = collectDom(doc);
    app.input = em.createInput();
    app.state = em.createRun();
    app.lastTime = win.performance ? win.performance.now() : 0;

    em.resizeCanvas(app);
    win.addEventListener('resize', () => em.resizeCanvas(app));
    em.bindInput(app);
    app.dom.primaryBtn.addEventListener('click', () => em.handlePrimaryAction(app));
    app.dom.secondaryBtn.addEventListener('click', () => em.handleSecondaryAction(app));
    app.dom.tertiaryBtn.addEventListener('click', () => em.handleTertiaryAction(app));
    app.dom.overlayStats.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-upgrade-id]');
      if (btn) em.chooseUpgrade(app.state, btn.getAttribute('data-upgrade-id'));
    });

    function gameLoop(now) {
      const dt = Math.min(0.05, (now - app.lastTime) / 1000);
      app.lastTime = now;
      em.update(app.state, dt, em.readInput(app.state, app.input));
      em.draw(app);
      win.requestAnimationFrame(gameLoop);
    }

    win.requestAnimationFrame(gameLoop);
    win.EchoMazeApp = app;
    return app;
  }

  Object.assign(em, {
    collectDom,
    resetRun,
    handlePrimaryAction,
    handleSecondaryAction,
    handleTertiaryAction,
    bootstrap
  });

  window.EchoMaze = em;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrap(document, window));
  } else {
    bootstrap(document, window);
  }
})();
