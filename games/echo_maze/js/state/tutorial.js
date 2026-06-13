(function () {
  'use strict';

  const em = window.EchoMaze || {};

  const BEGINNER_SEQUENCE = ['lantern', 'boots', 'phase', 'compass', 'map', 'shield', 'battery', 'relic', 'anchor'];

  const TUTORIAL_INFO = {
    lantern: {
      title: 'Lantern Core',
      text: 'Lantern Cores restore fuel and push your light farther into the maze.',
      stat: 'Watch Fuel and Vision. Fuel drains over time, and more fuel means you can see farther.'
    },
    boots: {
      title: 'Quickstep Boots',
      text: 'Quickstep Boots permanently increase movement speed.',
      stat: 'Watch Speed. Higher speed helps you reach Anchors before danger catches up.'
    },
    phase: {
      title: 'Phase Crystal',
      text: 'Phase Crystals add a charge for briefly slipping through walls. Press Space to use Phase.',
      stat: 'Watch Phase. Charges are shown as pips, and the timer changes when Phase is active or cooling down.'
    },
    compass: {
      title: 'Compass Lens',
      text: 'Compass Lenses sharpen distant signals and make objectives easier to track.',
      stat: 'Watch Compass. More compass strength improves how confidently the HUD and minimap point you forward.'
    },
    map: {
      title: 'Map Fragment',
      text: 'Map Fragments reveal nearby maze structure in a burst.',
      stat: 'Watch Revealed and the minimap. More revealed cells give you safer routes back and forward.'
    },
    shield: {
      title: 'Ward Shield',
      text: 'Ward Shields add protection before your health is harmed.',
      stat: 'Watch Integrity. Shields absorb danger before health becomes the problem.'
    },
    battery: {
      title: 'Echo Battery',
      text: 'Echo Batteries stabilize your lantern and push back the maze danger.',
      stat: 'Watch Battery and Danger. Batteries help you recover while danger shows how close the maze is to overwhelming you.'
    },
    relic: {
      title: 'Lost Relic',
      text: 'Lost Relics are rare score treasures that also grant a Phase charge.',
      stat: 'Watch Score and Items. Items count your discoveries, while score rewards efficient exploration.'
    },
    anchor: {
      title: 'Echo Anchor',
      text: 'Echo Anchors are the main objectives. Stabilizing them advances the run.',
      stat: 'Watch Anchors and Tier. This tutorial Anchor counts as your first Classic Anchor; the next signal begins the full run.'
    }
  };

  function initBeginnerTutorial(state) {
    state.tutorialStep = 0;
    state.tutorialSequence = BEGINNER_SEQUENCE.slice();
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialInfo = null;
    state.tutorialCompleted = false;
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
      state.tutorialTarget = { kind: 'anchor', x: anchor.x, y: anchor.y };
      state.tutorialTargets = [state.tutorialTarget];
      em.revealAround(state, anchor.x, anchor.y, 3.5);
      em.addMessage(state, 'Final lesson: stabilize the training Anchor.');
      return state.tutorialTarget;
    }

    const cells = findTutorialCells(state, 4 + (state.tutorialStep % 3), 5);
    state.objective = null;
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

    while (queue.length && seen.size < 240) {
      const cur = queue.shift();
      const key = em.keyOf(cur.x, cur.y);

      if (cur.d >= 3 && !state.collected.has(key) && !isReservedTutorialCell(state, cur.x, cur.y)) {
        const score = Math.abs(cur.d - preferredDistance) + em.rand01(state, cur.x, cur.y, 18000 + state.tutorialStep) * 0.25;
        candidates.push({ x: cur.x, y: cur.y, distance: cur.d, score });
      }

      if (cur.d >= 9) continue;

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
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialStep++;
    state.previousMode = 'playing';
    state.mode = 'tutorialInfo';
  }

  function completeBeginnerAnchor(state, obj) {
    state.score += obj.baseReward;
    state.anchors = 1;
    state.tier = 2;
    state.objective = null;
    state.tutorialTarget = null;
    state.tutorialTargets = [];
    state.tutorialStep++;
    state.tutorialInfo = tutorialInfoFor('anchor');
    state.previousMode = 'playing';
    state.mode = 'tutorialInfo';
    state.screenPulse = 0.7;
    em.restoreFuel(state, 45);
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
    state.objective = em.makeObjective(state, state.tier);
    if (em.spawnWarden && !state.warden) em.spawnWarden(state);
    em.addMessage(state, 'Beginner lessons complete. The maze is now in Classic mode.');
  }

  function tutorialInfoFor(type) {
    const data = TUTORIAL_INFO[type];
    return {
      type,
      title: data.title,
      text: data.text,
      stat: data.stat,
      color: type === 'anchor' ? '#ffe27a' : em.ITEM_DATA[type].color
    };
  }

  function tutorialTargetAt(state, x, y) {
    const targets = state.tutorialTargets && state.tutorialTargets.length ? state.tutorialTargets : state.tutorialTarget ? [state.tutorialTarget] : [];
    return targets.find(target => target.x === x && target.y === y) || null;
  }

  function hasDiscoveredTutorial(state, type) {
    if (!state || !state.tutorialSequence) return false;
    const index = state.tutorialSequence.indexOf(type);
    return index >= 0 && state.tutorialStep > index;
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
    hasDiscoveredTutorial
  });

  window.EchoMaze = em;
})();
