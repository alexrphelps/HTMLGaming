(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function renderOverlay(app) {
    const state = app.state;
    const dom = app.dom;

    if (!['start', 'paused', 'upgrade', 'victory', 'gameover'].includes(state.mode)) {
      dom.overlay.classList.remove('visible');
      return;
    }

    dom.overlay.classList.add('visible');
    dom.overlayStats.innerHTML = '';
    dom.overlayStats.className = 'result';
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
    } else if (state.mode === 'upgrade') {
      const choices = state.pendingUpgrades || [];
      dom.overlayTitle.textContent = 'Anchor Stabilized';
      dom.overlayText.textContent = 'Choose one upgrade. The maze shifts after your selection.';
      dom.overlayStats.className = 'result upgrade-grid';
      dom.overlayStats.innerHTML = upgradeMarkup(state, choices);
      dom.primaryBtn.textContent = buttonLabel(choices[0], 'Choice 1');
      dom.secondaryBtn.textContent = buttonLabel(choices[1], 'Choice 2');
      dom.tertiaryBtn.textContent = buttonLabel(choices[2], 'Choice 3');
      dom.tertiaryBtn.style.display = '';
    } else {
      const won = state.mode === 'victory';
      dom.overlayStats.className = 'result';
      dom.overlayTitle.textContent = won ? 'Victory' : 'Game Over';
      dom.overlayText.textContent = state.finalStats.reason;
      dom.overlayStats.innerHTML = resultStatsMarkup(state.finalStats);
      dom.primaryBtn.textContent = 'Retry Seed';
      dom.secondaryBtn.textContent = 'New Seed';
    }
  }

  function upgradeMarkup(state, choices) {
    return choices.map((id, index) => {
      const data = em.UPGRADE_DATA[id];
      const level = (state.upgrades[id] || 0) + 1;
      return `
        <button class="upgrade-choice" data-upgrade-id="${id}" type="button" style="--upgrade-color: ${data.color}">
          <span>${index + 1}</span>
          <strong>${data.label} ${level}</strong>
          <em>${data.text}</em>
        </button>
      `;
    }).join('');
  }

  function buttonLabel(id, fallback) {
    if (!id || !em.UPGRADE_DATA[id]) return fallback;
    return em.UPGRADE_DATA[id].label;
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

  Object.assign(em, { renderOverlay, upgradeMarkup, buttonLabel, resultStatsMarkup });
  window.EchoMaze = em;
})();
