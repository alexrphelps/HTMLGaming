(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function renderMessages(app) {
    const log = app.dom.messageLog;
    const messages = app.state.messages;

    while (log.children.length > messages.length) {
      log.removeChild(log.lastChild);
    }

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      let div = log.children[i];

      if (!div) {
        div = app.document.createElement('div');
        div.className = 'msg';
        log.appendChild(div);
      }

      if (div.textContent !== msg.text) {
        div.textContent = msg.text;
      }

      const opacity = String(Math.max(0.14, Math.min(1, msg.ttl / 1.2)));
      if (div.style.opacity !== opacity) {
        div.style.opacity = opacity;
      }
    }
  }

  function meter(label, value, max, color, detail) {
    const safeMax = Math.max(1, max);
    const fill = Math.max(0, Math.min(1, value / safeMax)) * 100;

    return `
      <div class="meter" style="--meter-color: ${color}; --meter-fill: ${fill}%">
        <div class="meter-head"><span>${label}</span><strong>${detail}</strong></div>
        <div class="meter-track"><span></span></div>
      </div>
    `;
  }

  function pips(label, count, max, color, detail) {
    let dots = '';

    for (let i = 0; i < max; i++) {
      dots += `<span class="${i < count ? 'filled' : ''}"></span>`;
    }

    return `
      <div class="pips" style="--meter-color: ${color}">
        <div class="meter-head"><span>${label}</span><strong>${detail}</strong></div>
        <div class="pip-row">${dots}</div>
      </div>
    `;
  }

  function updateHud(app) {
    const state = app.state;
    const p = state.player;
    const pc = em.cellOfWorld(p.x, p.y);
    const obj = state.objective || state.exitPortal;
    const objWorldX = obj ? obj.x * em.CONFIG.cell + em.CONFIG.cell / 2 : p.x;
    const objWorldY = obj ? obj.y * em.CONFIG.cell + em.CONFIG.cell / 2 : p.y;
    const objDist = obj ? Math.round(Math.hypot(objWorldX - p.x, objWorldY - p.y) / em.CONFIG.cell) : 0;
    const phase = p.phaseTimer > 0 ? p.phaseTimer.toFixed(1) + 's' : p.phaseCooldownTimer > 0 ? p.phaseCooldownTimer.toFixed(1) + 's CD' : p.phaseCharges + '/9';
    const wardenText = !state.warden ? 'Dormant' : state.warden.wake > 0 ? 'Waking' : 'Hunting';
    const dangerText = state.danger < 0.25 ? 'Calm' : state.danger < 0.55 ? 'Rising' : state.danger < 0.82 ? 'High' : 'Critical';

    if (state.mode === 'victory') {
      app.dom.goalText.innerHTML = '<strong>Victory:</strong> The Anchor chain is stable.';
    } else if (state.mode === 'gameover') {
      app.dom.goalText.innerHTML = '<strong>Run lost:</strong> Return to the main menu when you are ready.';
    } else if (state.mode === 'mainMenu') {
      app.dom.goalText.innerHTML = '<strong>Mode:</strong> Choose Beginner or Classic.';
    } else if (state.mode === 'tutorialInfo') {
      app.dom.goalText.innerHTML = '<strong>Lesson:</strong> Read the note, then continue.';
    } else if (state.gameMode === 'beginner' && state.tutorialTarget) {
      app.dom.goalText.innerHTML = beginnerGoalText(state);
    } else if (state.mode === 'upgrade') {
      app.dom.goalText.innerHTML = '<strong>Upgrade:</strong> Choose one Echo upgrade before the maze shifts.';
    } else if (state.exitPortal) {
      app.dom.goalText.innerHTML = '<strong>Goal:</strong> Reach the Exit Portal | ' + objDist + ' cells away.';
    } else if (obj) {
      app.dom.goalText.innerHTML =
        '<strong>Goal:</strong> Stabilize ' +
        obj.name +
        ' | ' +
        objDist +
        ' cells away. Anchor ' +
        (state.anchors + 1) +
        '/' +
        em.CONFIG.runAnchors +
        '.';
    } else {
      app.dom.goalText.innerHTML = '<strong>Goal:</strong> Signal stabilizing...';
    }

    if (state.gameMode === 'beginner') {
      updateBeginnerHud(app, phase, pc);
      renderMessages(app);
      return;
    }

    app.dom.runStats.innerHTML = `
      <div class="stat"><span>Score</span><strong>${state.score}</strong></div>
      <div class="stat"><span>Anchors</span><strong>${state.anchors}/${em.CONFIG.runAnchors}</strong></div>
      <div class="stat"><span>Tier</span><strong>${state.tier}</strong></div>
      <div class="stat"><span>Integrity</span><strong>${p.health} HP / ${p.shields} SH</strong></div>
      <div class="stat warden ${wardenText.toLowerCase()}"><span>Warden</span><strong>${wardenText}</strong></div>
    `;

    app.dom.itemMeters.innerHTML = `
      ${meter('Fuel', p.fuel, p.maxFuel, em.ITEM_DATA.lantern.color, Math.round(p.fuel) + '/' + Math.round(p.maxFuel))}
      ${meter('Vision', p.vision - em.CONFIG.baseVision, em.CONFIG.maxVision - em.CONFIG.baseVision, em.ITEM_DATA.lantern.color, p.vision.toFixed(1))}
      ${pips('Phase', p.phaseTimer > 0 ? 1 : p.phaseCharges, 9, em.ITEM_DATA.phase.color, phase)}
      ${meter('Danger', state.danger, 1, em.ITEM_DATA.battery.color, dangerText)}
      ${pips('Compass', p.compass + p.compassObjective, 8, em.ITEM_DATA.compass.color, (p.compass + p.compassObjective) + '/8')}
      ${meter('Speed', p.speed - em.CONFIG.baseSpeed, 255 - em.CONFIG.baseSpeed, em.ITEM_DATA.boots.color, Math.round(p.speed))}
      ${pips('Battery', p.battery, 5, em.ITEM_DATA.battery.color, p.battery + '/5')}
      <div class="item-total" style="--meter-color: ${em.ITEM_DATA.relic.color}"><span>Items</span><strong>${state.items}</strong></div>
    `;

    app.dom.secondaryStats.innerHTML = `
      <span>Depth ${state.maxDepth}</span>
      <span>Revealed ${state.revealed.size}</span>
      <span>${upgradeSummary(state)}</span>
      <span>${pc.x}, ${pc.y}</span>
    `;

    renderMessages(app);
  }

  function updateBeginnerHud(app, phase, pc) {
    const state = app.state;
    const p = state.player;
    const sequenceLength = state.tutorialSequence && state.tutorialSequence.length ? state.tutorialSequence.length : em.BEGINNER_SEQUENCE.length;
    const learned = Math.min(state.tutorialStep, sequenceLength);
    const runStats = [
      `<div class="stat"><span>Mode</span><strong>Beginner</strong></div>`,
      `<div class="stat"><span>Lessons</span><strong>${learned}/${sequenceLength}</strong></div>`
    ];

    if (em.hasDiscoveredTutorial(state, 'relic')) {
      runStats.push(`<div class="stat"><span>Score</span><strong>${state.score}</strong></div>`);
      runStats.push(`<div class="stat"><span>Items</span><strong>${state.items}</strong></div>`);
    }

    if (em.hasDiscoveredTutorial(state, 'shield')) {
      runStats.push(`<div class="stat"><span>Integrity</span><strong>${p.health} HP / ${p.shields} SH</strong></div>`);
    }

    if (em.hasDiscoveredTutorial(state, 'anchor')) {
      runStats.push(`<div class="stat"><span>Anchors</span><strong>${state.anchors}/${em.CONFIG.runAnchors}</strong></div>`);
      runStats.push(`<div class="stat"><span>Tier</span><strong>${state.tier}</strong></div>`);
    }

    app.dom.runStats.innerHTML = runStats.join('');

    const meters = [];
    if (em.hasDiscoveredTutorial(state, 'lantern')) {
      meters.push(meter('Fuel', p.fuel, p.maxFuel, em.ITEM_DATA.lantern.color, Math.round(p.fuel) + '/' + Math.round(p.maxFuel)));
      meters.push(meter('Vision', p.vision - em.CONFIG.baseVision, em.CONFIG.maxVision - em.CONFIG.baseVision, em.ITEM_DATA.lantern.color, p.vision.toFixed(1)));
    }
    if (em.hasDiscoveredTutorial(state, 'phase')) {
      meters.push(pips('Phase', p.phaseTimer > 0 ? 1 : p.phaseCharges, 9, em.ITEM_DATA.phase.color, phase));
    }
    if (em.hasDiscoveredTutorial(state, 'compass')) {
      meters.push(pips('Compass', p.compass + p.compassObjective, 8, em.ITEM_DATA.compass.color, (p.compass + p.compassObjective) + '/8'));
    }
    if (em.hasDiscoveredTutorial(state, 'boots')) {
      meters.push(meter('Speed', p.speed - em.CONFIG.baseSpeed, 255 - em.CONFIG.baseSpeed, em.ITEM_DATA.boots.color, Math.round(p.speed)));
    }
    if (em.hasDiscoveredTutorial(state, 'battery')) {
      meters.push(pips('Battery', p.battery, 5, em.ITEM_DATA.battery.color, p.battery + '/5'));
    }
    if (em.hasDiscoveredTutorial(state, 'map')) {
      meters.push(`<div class="item-total" style="--meter-color: ${em.ITEM_DATA.map.color}"><span>Revealed</span><strong>${state.revealed.size}</strong></div>`);
    }

    app.dom.itemMeters.innerHTML = meters.length ? meters.join('') : '';

    const secondary = [];
    if (em.hasDiscoveredTutorial(state, 'map')) secondary.push(`<span>Depth ${state.maxDepth}</span>`);
    if (em.hasDiscoveredTutorial(state, 'compass')) secondary.push(`<span>${pc.x}, ${pc.y}</span>`);
    app.dom.secondaryStats.innerHTML = secondary.join('');
  }

  function upgradeSummary(state) {
    if (!state.upgrades) return 'No upgrades';
    const active = Object.keys(state.upgrades)
      .filter(id => state.upgrades[id] > 0)
      .map(id => em.UPGRADE_DATA[id].label + ' ' + state.upgrades[id]);
    return active.length ? active.slice(0, 3).join(' | ') : 'No upgrades';
  }

  function beginnerGoalText(state) {
    const target = state.tutorialTarget;
    if (!target) return '<strong>Beginner:</strong> Follow the next training signal.';
    const label = target.kind === 'anchor' ? 'Training Echo Anchor' : em.ITEM_DATA[target.itemType].label;
    return '<strong>Beginner:</strong> Find ' + label + ' to learn the next HUD stat.';
  }

  Object.assign(em, { renderMessages, meter, pips, updateHud, updateBeginnerHud, upgradeSummary, beginnerGoalText });
  window.EchoMaze = em;
})();
