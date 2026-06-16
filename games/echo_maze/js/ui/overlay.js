(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function renderOverlay(app) {
    const state = app.state;
    const dom = app.dom;
    const model = em.overlayModelForState(state);

    if (!model.visible) {
      dom.overlay.classList.remove('visible');
      return;
    }

    dom.overlay.classList.add('visible');
    dom.overlayStats.innerHTML = '';
    dom.overlayStats.className = model.statsClass;
    dom.overlayTitle.textContent = model.title;
    dom.overlayText.textContent = model.text;
    applyButtonModel(dom.primaryBtn, model.buttons.primary);
    applyButtonModel(dom.secondaryBtn, model.buttons.secondary);
    applyButtonModel(dom.tertiaryBtn, model.buttons.tertiary);

    if (model.statsKind === 'menu') {
      dom.overlayStats.innerHTML = menuMarkup();
    } else if (model.statsKind === 'upgrade') {
      dom.overlayStats.innerHTML = upgradeMarkup(state, state.pendingUpgrades || []);
    } else if (model.statsKind === 'tutorial') {
      dom.overlayStats.innerHTML = tutorialInfoMarkup(state.tutorialInfo);
    } else if (model.statsKind === 'result') {
      dom.overlayStats.innerHTML = resultStatsMarkup(state.finalStats);
    }
  }

  function applyButtonModel(button, model) {
    button.textContent = model.label || '';
    button.style.display = model.visible ? '' : 'none';
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
      <button class="menu-choice active" data-menu-mode="noExit" type="button">
        <strong>No Exit</strong>
        <span>Survive an endless Anchor chain as the void expands from the start.</span>
      </button>
    `;
  }

  function tutorialInfoMarkup(info) {
    if (!info) return '';
    return `
      <div class="tutorial-card" style="--tutorial-color: ${em.safeColor(info.color)}">
        <strong>${em.escapeHtml(info.title)}</strong>
        <span>${em.escapeHtml(info.stat)}</span>
      </div>
    `;
  }

  function upgradeMarkup(state, choices) {
    return choices.map((id, index) => {
      const data = em.UPGRADE_DATA[id];
      const level = (state.upgrades[id] || 0) + 1;
      return `
        <button class="upgrade-choice" data-upgrade-id="${em.escapeHtml(id)}" type="button" style="--upgrade-color: ${em.safeColor(data.color)}">
          <span>${index + 1}</span>
          <strong>${em.escapeHtml(data.label)} ${level}</strong>
          <em>${em.escapeHtml(data.text)}</em>
        </button>
      `;
    }).join('');
  }

  function resultStatsMarkup(finalStats) {
    return `
      <div>Score<strong>${em.escapeHtml(finalStats.score)}</strong></div>
      <div>Anchors<strong>${em.escapeHtml(finalStats.gameMode === 'noExit' ? finalStats.anchors : finalStats.anchors + '/' + em.CONFIG.runAnchors)}</strong></div>
      <div>Items<strong>${em.escapeHtml(finalStats.items)}</strong></div>
      <div>Revealed<strong>${em.escapeHtml(finalStats.revealed)}</strong></div>
      <div>Time<strong>${em.escapeHtml(em.formatTime(finalStats.time))}</strong></div>
    `;
  }

  Object.assign(em, { renderOverlay, applyButtonModel, menuMarkup, tutorialInfoMarkup, upgradeMarkup, resultStatsMarkup });
  window.EchoMaze = em;
})();
