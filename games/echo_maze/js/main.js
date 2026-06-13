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
    if (win.EchoMazeApp) {
      return win.EchoMazeApp;
    }

    const app = em.createCanvasApp(doc, win);
    app.document = doc;
    app.window = win;
    app.dom = collectDom(doc);
    app.input = em.createInput();
    app.state = em.createRun();
    app.lastTime = win.performance ? win.performance.now() : 0;
    app.rafId = null;
    app.isDestroyed = false;
    app.listeners = [];

    app.addListener = function addListener(target, type, handler, options) {
      target.addEventListener(type, handler, options);
      this.listeners.push(() => target.removeEventListener(type, handler, options));
    };

    app.destroy = function destroy() {
      if (this.isDestroyed) {
        return;
      }

      this.isDestroyed = true;

      if (this.rafId !== null) {
        win.cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      while (this.listeners.length > 0) {
        const remove = this.listeners.pop();
        try {
          remove();
        } catch (error) {
          // Ignore listener cleanup failures during teardown.
        }
      }
    };

    em.resizeCanvas(app);
    app.addListener(win, 'resize', () => em.resizeCanvas(app));
    em.bindInput(app);
    app.addListener(app.dom.primaryBtn, 'click', () => em.handlePrimaryAction(app));
    app.addListener(app.dom.secondaryBtn, 'click', () => em.handleSecondaryAction(app));
    app.addListener(app.dom.tertiaryBtn, 'click', () => em.handleTertiaryAction(app));
    app.addListener(app.dom.overlayStats, 'click', (event) => {
      const btn = event.target.closest('[data-upgrade-id]');
      if (btn) em.chooseUpgrade(app.state, btn.getAttribute('data-upgrade-id'));
    });

    function gameLoop(now) {
      if (app.isDestroyed) {
        return;
      }

      const dt = Math.min(0.05, (now - app.lastTime) / 1000);
      app.lastTime = now;
      em.update(app.state, dt, em.readInput(app.state, app.input));
      em.draw(app);
      app.rafId = win.requestAnimationFrame(gameLoop);
    }

    app.rafId = win.requestAnimationFrame(gameLoop);
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
