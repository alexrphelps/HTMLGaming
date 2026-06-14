(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function createInput() {
    return { keys: new Set() };
  }

  function readInput(state, input) {
    let ix = 0;
    let iy = 0;

    if (input.keys.has('w') || input.keys.has('arrowup')) iy -= 1;
    if (input.keys.has('s') || input.keys.has('arrowdown')) iy += 1;
    if (input.keys.has('a') || input.keys.has('arrowleft')) ix -= 1;
    if (input.keys.has('d') || input.keys.has('arrowright')) ix += 1;

    if (ix !== 0 || iy !== 0) {
      const len = Math.hypot(ix, iy);
      ix /= len;
      iy /= len;
      state.player.angle = Math.atan2(iy, ix);
    }

    return { x: ix, y: iy };
  }

  function bindInput(app) {
    const addListener = app.addListener ? app.addListener.bind(app) : (target, type, handler) => target.addEventListener(type, handler);

    addListener(app.window, 'keydown', (e) => {
      const k = e.key.toLowerCase();

      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape'].includes(k)) {
        e.preventDefault();
      }

      const handled = em.handleKeyboardAction(app, k);
      if (handled || app.state.mode === 'tutorialInfo' || (k === 'escape' && app.state.mode === 'mainMenu')) return;

      app.input.keys.add(k);
    });

    addListener(app.window, 'keyup', (e) => {
      app.input.keys.delete(e.key.toLowerCase());
    });
  }

  Object.assign(em, { createInput, readInput, bindInput });
  window.EchoMaze = em;
})();
