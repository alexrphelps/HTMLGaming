(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function renderOverlay(app) {
    const state = app.state;
    const dom = app.dom;

    if (!['mainMenu', 'start', 'paused', 'upgrade', 'tutorialInfo', 'victory', 'gameover'].includes(state.mode)) {
      dom.overlay.classList.remove('visible');
      return;
    }

    dom.overlay.classList.add('visible');
    dom.overlayStats.innerHTML = '';
    dom.overlayStats.className = 'result';
    dom.primaryBtn.style.display = '';
    dom.secondaryBtn.style.display = '';
    dom.tertiaryBtn.style.display = 'none';

    if (state.mode === 'mainMenu') {
      dom.overlayTitle.textContent = 'Echo Maze';
      dom.overlayText.textContent = 'Choose a mode to enter the maze.';
      dom.overlayStats.className = 'result menu-grid';
      dom.overlayStats.innerHTML = menuMarkup();
      dom.primaryBtn.textContent = 'Classic Run';
      dom.primaryBtn.style.display = 'none';
      dom.secondaryBtn.style.display = 'none';
    } else if (state.mode === 'start') {
      dom.overlayTitle.textContent = 'Echo Maze';
      dom.overlayText.textContent = 'Stabilize five Echo Anchors before the maze fully wakes, then escape through the Exit Portal. Explore, upgrade, and keep ahead of the Warden.';
      dom.primaryBtn.textContent = 'Begin Run';
      dom.secondaryBtn.style.display = 'none';
    } else if (state.mode === 'paused') {
      dom.overlayTitle.textContent = 'Menu';
      dom.overlayText.textContent = 'Take a breath, then resume or return to the main menu.';
      dom.primaryBtn.textContent = 'Resume';
      dom.secondaryBtn.textContent = 'Main Menu';
    } else if (state.mode === 'upgrade') {
      const choices = state.pendingUpgrades || [];
      dom.overlayTitle.textContent = 'Anchor Stabilized';
      dom.overlayText.textContent = 'Choose one upgrade. The maze shifts after your selection.';
      dom.overlayStats.className = 'result upgrade-grid';
      dom.overlayStats.innerHTML = upgradeMarkup(state, choices);
      dom.primaryBtn.style.display = 'none';
      dom.secondaryBtn.style.display = 'none';
    } else if (state.mode === 'tutorialInfo') {
      dom.overlayTitle.textContent = state.tutorialInfo.title;
      dom.overlayText.textContent = state.tutorialInfo.text;
      dom.overlayStats.className = 'result tutorial-info';
      dom.overlayStats.innerHTML = tutorialInfoMarkup(state.tutorialInfo);
      dom.primaryBtn.textContent = 'Continue';
      dom.secondaryBtn.style.display = 'none';
    } else {
      const won = state.mode === 'victory';
      dom.overlayStats.className = 'result';
      dom.overlayTitle.textContent = won ? 'Victory' : 'Game Over';
      dom.overlayText.textContent = state.finalStats.reason;
      dom.overlayStats.innerHTML = resultStatsMarkup(state.finalStats);
      dom.primaryBtn.textContent = 'Main Menu';
      dom.secondaryBtn.style.display = 'none';
    }
  }

  function menuMarkup() {
    return `
      <button class="menu-choice active" data-menu-mode="beginner" type="button">
        <strong>Beginner Run</strong>
        <span>Learn each item and HUD stat one at a time, then continue into Classic mode.</span>
      </button>
      <button class="menu-choice active" data-menu-mode="classic" type="button">
        <strong>Classic Run</strong>
        <span>Stabilize five Echo Anchors, escape through the Exit Portal, and keep ahead of the Warden.</span>
      </button>
    `;
  }

  function tutorialInfoMarkup(info) {
    if (!info) return '';
    return `
      <div class="tutorial-card" style="--tutorial-color: ${info.color}">
        <strong>${info.title}</strong>
        <span>${info.stat}</span>
      </div>
    `;
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

  function resultStatsMarkup(finalStats) {
    return `
      <div>Score<strong>${finalStats.score}</strong></div>
      <div>Anchors<strong>${finalStats.anchors}/${em.CONFIG.runAnchors}</strong></div>
      <div>Items<strong>${finalStats.items}</strong></div>
      <div>Revealed<strong>${finalStats.revealed}</strong></div>
      <div>Time<strong>${em.formatTime(finalStats.time)}</strong></div>
    `;
  }

  Object.assign(em, { renderOverlay, menuMarkup, tutorialInfoMarkup, upgradeMarkup, resultStatsMarkup });
  window.EchoMaze = em;
})();
