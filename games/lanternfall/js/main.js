(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};

  const app = new Lanternfall.LanternfallGame();
  app.init();
  Lanternfall.app = app;
})();
