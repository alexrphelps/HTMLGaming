(function () {
  'use strict';

  const em = window.EchoMaze || {};

  const OVERLAY_MODES = ['mainMenu', 'start', 'paused', 'upgrade', 'tutorialInfo', 'victory', 'gameover'];
  const ACTION_SLOTS = ['primary', 'secondary', 'tertiary'];

  function isOverlayMode(mode) {
    return OVERLAY_MODES.includes(mode);
  }

  function runModeAction(app, slot) {
    const state = app && app.state;
    if (!state || !ACTION_SLOTS.includes(slot)) return false;

    const index = ACTION_SLOTS.indexOf(slot);
    if (state.mode === 'upgrade') {
      return Boolean(em.chooseUpgrade(state, state.pendingUpgrades[index]));
    }
    if (state.mode === 'tutorialInfo' && slot === 'primary') return Boolean(em.continueTutorial(state));
    if (state.mode === 'mainMenu' && slot === 'primary') return Boolean(em.startMode && em.startMode(app, 'classic'));
    if (state.mode === 'start' && slot === 'primary') {
      startRun(state);
      return true;
    }
    if (state.mode === 'paused' && slot === 'primary') {
      pauseRun(state);
      return true;
    }
    if (state.mode === 'paused' && slot === 'secondary') return Boolean(em.openMainMenu && em.openMainMenu(app));
    if ((state.mode === 'victory' || state.mode === 'gameover') && slot === 'primary') return Boolean(em.openMainMenu && em.openMainMenu(app));
    return false;
  }

  function runOverlayChoice(app, kind, id) {
    if (!app || !app.state) return false;
    if (kind === 'upgrade' && app.state.mode === 'upgrade') return Boolean(em.chooseUpgrade(app.state, id));
    if (kind === 'menu' && app.state.mode === 'mainMenu') return Boolean(em.startMode && em.startMode(app, id));
    return false;
  }

  function handleKeyboardAction(app, key) {
    const state = app && app.state;
    if (!state) return false;

    if (key === 'enter') return runModeAction(app, 'primary');
    if (state.mode === 'tutorialInfo') return false;
    if (key === 'escape' && state.mode === 'mainMenu') return false;
    if (key === 'escape') {
      pauseRun(state);
      return true;
    }
    if (state.mode === 'upgrade' && ['1', '2', '3'].includes(key)) {
      return Boolean(em.chooseUpgrade(state, state.pendingUpgrades[Number(key) - 1]));
    }
    if (key === 'm') {
      state.showMini = !state.showMini;
      return true;
    }
    if (key === ' ') {
      em.usePhase(state);
      return true;
    }
    return false;
  }

  function overlayModelForState(state) {
    const model = {
      visible: isOverlayMode(state.mode),
      title: '',
      text: '',
      statsKind: null,
      statsClass: 'result',
      buttons: {
        primary: { label: '', visible: true },
        secondary: { label: '', visible: true },
        tertiary: { label: '', visible: false }
      }
    };

    if (!model.visible) return model;

    if (state.mode === 'mainMenu') {
      model.title = 'Echo Maze';
      model.text = 'Choose a mode to enter the maze.';
      model.statsKind = 'menu';
      model.statsClass = 'result menu-grid';
      model.buttons.primary = { label: 'Classic Run', visible: false };
      model.buttons.secondary.visible = false;
    } else if (state.mode === 'start') {
      model.title = 'Echo Maze';
      model.text = 'Stabilize five Echo Anchors before the maze fully wakes, then escape through the Exit Portal. Explore, upgrade, and keep ahead of the Warden.';
      model.buttons.primary.label = 'Begin Run';
      model.buttons.secondary.visible = false;
    } else if (state.mode === 'paused') {
      model.title = 'Menu';
      model.text = 'Take a breath, then resume or return to the main menu.';
      model.buttons.primary.label = 'Resume';
      model.buttons.secondary.label = 'Main Menu';
    } else if (state.mode === 'upgrade') {
      model.title = 'Anchor Stabilized';
      model.text = 'Choose one upgrade. The maze shifts after your selection.';
      model.statsKind = 'upgrade';
      model.statsClass = 'result upgrade-grid';
      model.buttons.primary.visible = false;
      model.buttons.secondary.visible = false;
    } else if (state.mode === 'tutorialInfo') {
      model.title = state.tutorialInfo ? state.tutorialInfo.title : 'Lesson';
      model.text = state.tutorialInfo ? state.tutorialInfo.text : '';
      model.statsKind = 'tutorial';
      model.statsClass = 'result tutorial-info';
      model.buttons.primary.label = 'Continue';
      model.buttons.secondary.visible = false;
    } else {
      const won = state.mode === 'victory';
      model.title = won ? 'Victory' : 'Game Over';
      model.text = state.finalStats ? state.finalStats.reason : '';
      model.statsKind = 'result';
      model.buttons.primary.label = 'Main Menu';
      model.buttons.secondary.visible = false;
    }

    return model;
  }

  function goalHtmlForState(state) {
    const p = state.player;
    const obj = state.objective || state.exitPortal;
    const objWorldX = obj ? obj.x * em.CONFIG.cell + em.CONFIG.cell / 2 : p.x;
    const objWorldY = obj ? obj.y * em.CONFIG.cell + em.CONFIG.cell / 2 : p.y;
    const objDist = obj ? Math.round(Math.hypot(objWorldX - p.x, objWorldY - p.y) / em.CONFIG.cell) : 0;

    if (state.mode === 'victory') return '<strong>Victory:</strong> The Anchor chain is stable.';
    if (state.mode === 'gameover') return '<strong>Run lost:</strong> Return to the main menu when you are ready.';
    if (state.mode === 'mainMenu') return '<strong>Mode:</strong> Choose Beginner or Classic.';
    if (state.mode === 'tutorialInfo') return '<strong>Lesson:</strong> Read the note, then continue.';
    if (state.gameMode === 'beginner' && state.tutorialTarget) return em.beginnerGoalText(state);
    if (state.mode === 'upgrade') return '<strong>Upgrade:</strong> Choose one Echo upgrade before the maze shifts.';
    if (state.exitPortal) return '<strong>Goal:</strong> Reach the Exit Portal | ' + objDist + ' cells away.';
    if (obj) {
      return '<strong>Goal:</strong> Stabilize ' +
        em.escapeHtml(obj.name) +
        ' | ' +
        objDist +
        ' cells away. Anchor ' +
        (state.anchors + 1) +
        '/' +
        em.CONFIG.runAnchors +
        '.';
    }
    return '<strong>Goal:</strong> Signal stabilizing...';
  }

  function startRun(state) {
    if (state.mode === 'mainMenu' || state.mode === 'start') {
      state.mode = 'playing';
      em.addMessage(state, 'The maze wakes slowly. Find the first Anchor.');
    }
  }

  function pauseRun(state) {
    if (state.mode === 'playing') {
      state.previousMode = 'playing';
      state.mode = 'paused';
    } else if (state.mode === 'upgrade') {
      state.previousMode = 'upgrade';
      state.mode = 'paused';
    } else if (state.mode === 'paused') {
      state.mode = state.previousMode || 'playing';
    }
  }

  function returnToMainMenu(state) {
    if (!state) return;
    state.mode = 'mainMenu';
    state.previousMode = 'playing';
  }

  function endRun(state, mode, reason) {
    state.mode = mode;
    state.finalStats = em.buildFinalStats(state, reason);
    state.screenPulse = 1;
  }

  function checkObjective(state, pc) {
    const obj = state.objective;

    if (obj && pc.x === obj.x && pc.y === obj.y) {
      if (state.gameMode === 'beginner' && obj.tutorialFinal && em.completeBeginnerAnchor) {
        em.completeBeginnerAnchor(state, obj);
        return;
      }

      stabilizeAnchor(state, obj);
      return;
    }

    if (state.exitPortal && pc.x === state.exitPortal.x && pc.y === state.exitPortal.y) {
      state.score += em.CONFIG.anchorRewards.victoryScore + state.player.health * em.CONFIG.anchorRewards.victoryHealthBonus + state.player.shields * em.CONFIG.anchorRewards.victoryShieldBonus;
      endRun(state, 'victory', 'You stabilized the chain and escaped through the Exit Portal.');
    }
  }

  function stabilizeAnchor(state, obj) {
    const elapsed = Math.max(1, state.time - obj.createdAt);
    const parTime = Math.max(em.CONFIG.anchorRewards.parTimeBase, obj.pathLength * em.CONFIG.anchorRewards.parTimePathScale);
    const speedBonus = Math.max(0, Math.round((parTime - elapsed) * (em.CONFIG.anchorRewards.speedBonusBase + obj.tier)));
    const phasePenalty = state.phaseUsesSinceAnchor * em.CONFIG.anchorRewards.phasePenalty;
    const bonus = Math.max(0, speedBonus - phasePenalty);
    const reward = obj.baseReward + bonus;

    state.score += reward;
    state.bestAnchorBonus = Math.max(state.bestAnchorBonus, bonus);
    state.anchors++;
    state.tier = state.anchors + 1;
    state.phaseUsesSinceAnchor = 0;
    state.anchorClock = 0;
    state.player.visionBonus = Math.min(em.CONFIG.playerCaps.maxVisionBonus, state.player.visionBonus + em.CONFIG.anchorRewards.visionBonus);
    state.player.phaseCharges = Math.min(em.CONFIG.playerCaps.maxPhaseCharges, state.player.phaseCharges + em.CONFIG.anchorRewards.phaseReward);
    state.player.health = Math.min(em.CONFIG.playerCaps.maxHealth, state.player.health + (state.anchors % 2 === 0 ? 1 : 0));
    em.restoreFuel(state, em.CONFIG.anchorRewards.fuelBase + state.anchors * em.CONFIG.anchorRewards.fuelPerAnchor);
    em.revealAround(state, obj.x, obj.y, em.CONFIG.anchorRewards.revealBase + Math.min(em.CONFIG.anchorRewards.revealAnchorCap, state.anchors) + state.player.minimapBonus);

    const wx = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    const wy = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    em.addPulse(state, wx, wy, em.CONFIG.cell * (10 + state.anchors), 1.25, '#ffe27a');
    em.addParticles(state, wx, wy, '#ffe27a', 34);
    em.addPulse(state, wx, wy, em.CONFIG.cell * (5 + state.anchors * 1.5), 0.75, em.biomeAccentForWorld ? em.biomeAccentForWorld(state, wx, wy) : '#7df9ff');
    em.addFloatingText(state, 'Anchor Stabilized', wx, wy - 28, '#ffe27a');
    em.addFloatingText(state, '+' + reward, wx, wy - 8, '#ffe27a');
    state.screenPulse = 0.7;
    state.screenShake = Math.max(state.screenShake, 5);
    state.danger = Math.max(0, state.danger - em.CONFIG.danger.anchorReduction);

    if (state.anchors === 1) em.spawnWarden(state);
    if (em.spawnAmbientEnemies) em.spawnAmbientEnemies(state);

    state.pendingAnchorAdvance = {
      complete: state.anchors >= em.CONFIG.runAnchors,
      objName: obj.name,
      reward
    };
    state.objective = null;

    if (em.beginUpgradeSelection && em.availableUpgradeIds(state).length > 0) {
      em.beginUpgradeSelection(state);
    } else {
      completeAnchorAdvance(state);
    }
  }

  function completeAnchorAdvance(state) {
    const pending = state.pendingAnchorAdvance;
    if (!pending) return;

    if (pending.complete) {
      state.exitPortal = em.makeExitPortal(state);
      em.revealAround(state, state.exitPortal.x, state.exitPortal.y, 4.5 + state.player.compass);
      em.addMessage(state, 'Anchor chain stabilized. The Exit Portal has opened.');
    } else {
      state.objective = em.makeObjective(state, state.tier);
      em.addMessage(state, pending.objName + ' stabilized. +' + pending.reward + '. Next signal is farther out.');
    }

    state.pendingAnchorAdvance = null;
  }

  Object.assign(em, {
    OVERLAY_MODES,
    ACTION_SLOTS,
    isOverlayMode,
    runModeAction,
    runOverlayChoice,
    handleKeyboardAction,
    overlayModelForState,
    goalHtmlForState,
    startRun,
    pauseRun,
    returnToMainMenu,
    endRun,
    checkObjective,
    stabilizeAnchor,
    completeAnchorAdvance
  });
  window.EchoMaze = em;
})();
