(function () {
  'use strict';

  const em = window.EchoMaze || {};

  const BEGINNER_SEQUENCE = em.BEGINNER_SEQUENCE || ['lantern', 'boots', 'phase', 'compass', 'map', 'shield', 'battery', 'relic', 'anchor'];
  const TUTORIAL_INFO = em.TUTORIAL_INFO || {};

  function initBeginnerTutorial(state) {
    state.tutorialStep = 0;
    state.tutorialSequence = BEGINNER_SEQUENCE.slice();
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialInfo = null;
    state.tutorialCompleted = false;
    state.tutorialDiscovered = new Set();
    state.beginnerItemEpoch = 0;
    state.objective = null;
    state.exitPortal = null;
    spawnNextTutorialTarget(state);
    em.addMessage(state, 'Beginner Run: collect each signal to learn the maze.');
  }

  function spawnNextTutorialTarget(state) {
    if (!state || state.gameMode !== 'beginner') return null;

    const type = state.tutorialSequence[state.tutorialStep];
    if (!type) return null;

    if (type === 'anchor') {
      const cell = findTutorialCell(state, 6);
      const anchor = {
        type: 'anchor',
        x: cell.x,
        y: cell.y,
        tier: 1,
        pathLength: cell.distance || 6,
        name: 'Training Echo Anchor',
        baseReward: 475,
        createdAt: state.time,
        tutorialFinal: true
      };

      state.objective = anchor;
      state.objectives = [anchor];
      state.tutorialTarget = { kind: 'anchor', x: anchor.x, y: anchor.y };
      state.tutorialTargets = [state.tutorialTarget];
      em.revealAround(state, anchor.x, anchor.y, 3.5);
      em.addMessage(state, 'Final lesson: stabilize the training Anchor.');
      return state.tutorialTarget;
    }

    const cells = findTutorialCells(state, 4 + (state.tutorialStep % 3), em.CONFIG.tutorial.targetCount);
    state.objective = null;
    state.objectives = [];
    state.tutorialTargets = cells.map(cell => ({ kind: 'item', itemType: type, x: cell.x, y: cell.y }));
    state.tutorialTarget = state.tutorialTargets[0];
    for (const cell of cells) em.revealAround(state, cell.x, cell.y, 3);
    em.addMessage(state, 'Find the ' + em.ITEM_DATA[type].label + '.');
    return state.tutorialTarget;
  }

  function findTutorialCell(state, preferredDistance) {
    return findTutorialCells(state, preferredDistance, 1)[0];
  }

  function findTutorialCells(state, preferredDistance, count) {
    const start = em.cellOfWorld(state.player.x, state.player.y);
    const queue = [{ x: start.x, y: start.y, d: 0 }];
    const seen = new Set([em.keyOf(start.x, start.y)]);
    const candidates = [];

    while (queue.length && seen.size < em.CONFIG.tutorial.maxSearchCells) {
      const cur = queue.shift();
      const key = em.keyOf(cur.x, cur.y);

      if (cur.d >= em.CONFIG.tutorial.minTargetDistance && !state.collected.has(key) && !isReservedTutorialCell(state, cur.x, cur.y)) {
        const score = Math.abs(cur.d - preferredDistance) + em.rand01(state, cur.x, cur.y, em.CONFIG.tutorial.targetScoreSalt + state.tutorialStep) * 0.25;
        candidates.push({ x: cur.x, y: cur.y, distance: cur.d, score });
      }

      if (cur.d >= em.CONFIG.tutorial.maxTargetDistance) continue;

      for (const dir of em.DIRS) {
        const nx = cur.x + em.VEC[dir].x;
        const ny = cur.y + em.VEC[dir].y;
        const nextKey = em.keyOf(nx, ny);
        if (seen.has(nextKey) || em.isBlockedBetween(state, cur.x, cur.y, nx, ny)) continue;
        seen.add(nextKey);
        queue.push({ x: nx, y: ny, d: cur.d + 1 });
      }
    }

    candidates.sort((a, b) => a.score - b.score);
    const selected = [];
    const selectedKeys = new Set();

    for (const candidate of candidates) {
      if (selected.length >= count) break;
      const key = em.keyOf(candidate.x, candidate.y);
      if (selectedKeys.has(key)) continue;
      selectedKeys.add(key);
      selected.push(candidate);
    }

    return selected.length ? selected : [{ x: start.x + 1, y: start.y, distance: 1 }];
  }

  function isReservedTutorialCell(state, x, y) {
    const target = state.tutorialTarget;
    if (target && target.x === x && target.y === y) return true;
    if (state.tutorialTargets && state.tutorialTargets.some(entry => entry.x === x && entry.y === y)) return true;
    if (state.objective && state.objective.x === x && state.objective.y === y) return true;
    return Math.abs(x) + Math.abs(y) < 2;
  }

  function tutorialItemForCell(state, x, y) {
    const target = tutorialTargetAt(state, x, y);
    if (!target || target.kind !== 'item') return null;
    if (state.collected.has(em.keyOf(x, y))) return null;
    return { type: target.itemType, data: em.ITEM_DATA[target.itemType] };
  }

  function handleTutorialItemCollected(state, x, y, item) {
    const target = tutorialTargetAt(state, x, y);
    if (!target || target.kind !== 'item') return;

    state.tutorialInfo = tutorialInfoFor(item.type);
    rememberTutorialDiscovery(state, item.type);
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialStep++;
    state.previousMode = 'playing';
    state.mode = 'tutorialInfo';
    if (em.updateLanternVision) em.updateLanternVision(state, 0);
  }

  function completeBeginnerAnchor(state, obj) {
    state.score += obj.baseReward;
    state.anchors = 1;
    state.tier = 2;
    state.phaseUsesSinceAnchor = 0;
    state.anchorClock = 0;
    state.lastAnchorRadius = em.objectiveRadius ? em.objectiveRadius(obj.x, obj.y) : Math.hypot(obj.x, obj.y);
    state.anchorMinRadius = state.lastAnchorRadius;
    state.objective = null;
    state.objectives = [];
    state.pendingAnchorAdvance = {
      complete: false,
      objName: obj.name,
      reward: obj.baseReward
    };
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialStep++;
    state.tutorialInfo = tutorialInfoFor('anchor');
    rememberTutorialDiscovery(state, 'anchor');
    state.previousMode = 'playing';
    state.mode = 'tutorialInfo';
    state.screenPulse = 0.7;
    em.revealAround(state, obj.x, obj.y, 8);
    em.addMessage(state, 'Training Anchor stabilized. Classic mode begins after this lesson.');
  }

  function continueTutorial(state) {
    if (!state || state.mode !== 'tutorialInfo') return false;

    const infoType = state.tutorialInfo && state.tutorialInfo.type;
    state.tutorialInfo = null;

    if (infoType === 'anchor') {
      graduateBeginnerToClassic(state);
      return true;
    }

    state.mode = 'playing';
    spawnNextTutorialTarget(state);
    return true;
  }

  function graduateBeginnerToClassic(state) {
    state.gameMode = 'classic';
    state.tutorialCompleted = true;
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialSequence = [];
    state.mode = 'playing';
    if (em.spawnWarden && !state.warden) em.spawnWarden(state);
    if (em.beginUpgradeSelection && em.availableUpgradeIds(state).length > 0) {
      em.beginUpgradeSelection(state);
    } else if (typeof em.completeAnchorAdvance === 'function') {
      em.completeAnchorAdvance(state);
    }
    em.addMessage(state, 'Beginner lessons complete. The maze is now in Classic mode.');
  }

  function tutorialInfoFor(type) {
    const data = TUTORIAL_INFO[type];
    const item = em.ITEM_DATA[type];
    return {
      type,
      title: data.title,
      text: data.text,
      stat: data.stat,
      color: type === 'anchor' ? '#ffe27a' : item.color
    };
  }

  function tutorialTargetAt(state, x, y) {
    const targets = state.tutorialTargets && state.tutorialTargets.length ? state.tutorialTargets : state.tutorialTarget ? [state.tutorialTarget] : [];
    return targets.find(target => target.x === x && target.y === y) || null;
  }

  function hasDiscoveredTutorial(state, type) {
    if (!state) return false;
    if (state.tutorialDiscovered && state.tutorialDiscovered.has(type)) return true;
    if (!state.tutorialSequence) return false;
    const index = state.tutorialSequence.indexOf(type);
    return index >= 0 && state.tutorialStep > index;
  }

  function rememberTutorialDiscovery(state, type) {
    if (!state.tutorialDiscovered) state.tutorialDiscovered = new Set();
    state.tutorialDiscovered.add(type);
  }

  Object.assign(em, {
    BEGINNER_SEQUENCE,
    TUTORIAL_INFO,
    initBeginnerTutorial,
    spawnNextTutorialTarget,
    findTutorialCell,
    findTutorialCells,
    tutorialItemForCell,
    handleTutorialItemCollected,
    completeBeginnerAnchor,
    continueTutorial,
    graduateBeginnerToClassic,
    tutorialInfoFor,
    tutorialTargetAt,
    hasDiscoveredTutorial,
    rememberTutorialDiscovery
  });

  window.EchoMaze = em;
})();
