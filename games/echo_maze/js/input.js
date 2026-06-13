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
    app.window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();

      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'escape'].includes(k)) {
        e.preventDefault();
      }

      if (k === 'enter') em.handlePrimaryAction(app);
      else if (k === 'escape') em.pauseRun(app.state);
      else if (app.state.mode === 'upgrade' && ['1', '2', '3'].includes(k)) em.chooseUpgrade(app.state, app.state.pendingUpgrades[Number(k) - 1]);
      else if (k === 'm') app.state.showMini = !app.state.showMini;
      else if (k === ' ') em.usePhase(app.state);

      app.input.keys.add(k);
    });

    app.window.addEventListener('keyup', (e) => {
      app.input.keys.delete(e.key.toLowerCase());
    });
  }

  Object.assign(em, { createInput, readInput, bindInput });
  window.EchoMaze = em;
})();
