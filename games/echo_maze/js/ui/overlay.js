(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function renderOverlay(app) {
    const state = app.state;
    const dom = app.dom;

    if (!['start', 'paused', 'victory', 'gameover'].includes(state.mode)) {
      dom.overlay.classList.remove('visible');
      return;
    }

    dom.overlay.classList.add('visible');
    dom.overlayStats.innerHTML = '';
    dom.primaryBtn.style.display = '';
    dom.secondaryBtn.style.display = '';
    dom.tertiaryBtn.style.display = 'none';

    if (state.mode === 'start') {
      dom.overlayTitle.textContent = 'Echo Maze';
      dom.overlayText.textContent = 'Stabilize five Echo Anchors before the maze fully wakes, then escape through the Exit Portal. Explore, upgrade, and keep ahead of the Warden.';
      dom.primaryBtn.textContent = 'Begin Run';
      dom.secondaryBtn.textContent = 'New Seed';
    } else if (state.mode === 'paused') {
      dom.overlayTitle.textContent = 'Menu';
      dom.overlayText.textContent = 'Take a breath, restart this seed, or open a fresh maze.';
      dom.primaryBtn.textContent = 'Resume';
      dom.secondaryBtn.textContent = 'Restart Seed';
      dom.tertiaryBtn.textContent = 'New Seed';
      dom.tertiaryBtn.style.display = '';
    } else {
      const won = state.mode === 'victory';
      dom.overlayTitle.textContent = won ? 'Victory' : 'Game Over';
      dom.overlayText.textContent = state.finalStats.reason;
      dom.overlayStats.innerHTML = resultStatsMarkup(state.finalStats);
      dom.primaryBtn.textContent = 'Retry Seed';
      dom.secondaryBtn.textContent = 'New Seed';
    }
  }

  function resultStatsMarkup(finalStats) {
    return `
      <div>Score<strong>${finalStats.score}</strong></div>
      <div>Anchors<strong>${finalStats.anchors}/${em.CONFIG.runAnchors}</strong></div>
      <div>Items<strong>${finalStats.items}</strong></div>
      <div>Revealed<strong>${finalStats.revealed}</strong></div>
      <div>Time<strong>${em.formatTime(finalStats.time)}</strong></div>
      <div>Seed<strong>${finalStats.seed}</strong></div>
    `;
  }

  Object.assign(em, { renderOverlay, resultStatsMarkup });
  window.EchoMaze = em;
})();
