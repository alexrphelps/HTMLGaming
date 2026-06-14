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

  function resetRun(app, seed, options) {
    app.state = em.createRun(seed, options);
    app.input.keys.clear();
    em.renderOverlay(app);
    em.updateHud(app);
    return app.state;
  }

  function openMainMenu(app) {
    resetRun(app);
    em.returnToMainMenu(app.state);
    return app.state;
  }

  function startMode(app, gameMode) {
    return resetRun(app, undefined, { gameMode, mode: 'playing' });
  }

  function handlePrimaryAction(app) {
    return em.runModeAction(app, 'primary');
  }

  function handleSecondaryAction(app) {
    return em.runModeAction(app, 'secondary');
  }

  function handleTertiaryAction(app) {
    return em.runModeAction(app, 'tertiary');
  }

  function handleOverlayStatsAction(app, event) {
    const target = event.target && event.target.closest ? event.target : null;
    if (!target) return;

    const btn = target.closest('[data-upgrade-id]');
    if (btn) {
      event.preventDefault();
      em.runOverlayChoice(app, 'upgrade', btn.getAttribute('data-upgrade-id'));
      return;
    }

    const modeBtn = target.closest('[data-menu-mode]');
    if (modeBtn) {
      event.preventDefault();
      em.runOverlayChoice(app, 'menu', modeBtn.getAttribute('data-menu-mode'));
    }
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

      if (win.EchoMazeApp === this) {
        win.EchoMazeApp = null;
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
    app.addListener(app.dom.overlayStats, 'pointerdown', (event) => em.handleOverlayStatsAction(app, event));
    app.addListener(app.dom.overlayStats, 'click', (event) => em.handleOverlayStatsAction(app, event));

    function gameLoop(now) {
      if (app.isDestroyed) {
        return;
      }

      const dt = Math.min(em.CONFIG.frame.maxDt, (now - app.lastTime) / 1000);
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
    openMainMenu,
    startMode,
    handlePrimaryAction,
    handleSecondaryAction,
    handleTertiaryAction,
    handleOverlayStatsAction,
    bootstrap
  });

  window.EchoMaze = em;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrap(document, window));
  } else {
    bootstrap(document, window);
  }
})();
