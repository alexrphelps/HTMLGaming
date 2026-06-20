(function (ns) {
  'use strict';

  function boot() {
    try {
      const game = new ns.LumenkinGame(document);
      window.lumenkinGame = game;
      game.init().catch(error => {
        console.error('❌ Lumenkin initialization failed:', error);
        const hint = document.getElementById('canvasHint');
        if (hint) hint.textContent = `Initialization failed: ${error.message}`;
      });
    } catch (error) {
      console.error('❌ Lumenkin boot failed:', error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window.Lumenkin = window.Lumenkin || {});
