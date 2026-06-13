(function () {
  'use strict';

  const em = window.EchoMaze || {};

  function renderMessages(app) {
    app.dom.messageLog.innerHTML = '';

    for (const msg of app.state.messages) {
      const div = app.document.createElement('div');
      div.className = 'msg';
      div.textContent = msg.text;
      div.style.opacity = String(Math.max(0.14, Math.min(1, msg.ttl / 1.2)));
      app.dom.messageLog.appendChild(div);
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
      app.dom.goalText.innerHTML = '<strong>Run lost:</strong> Start a new seed or retry this one.';
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

  function upgradeSummary(state) {
    if (!state.upgrades) return 'No upgrades';
    const active = Object.keys(state.upgrades)
      .filter(id => state.upgrades[id] > 0)
      .map(id => em.UPGRADE_DATA[id].label + ' ' + state.upgrades[id]);
    return active.length ? active.slice(0, 3).join(' | ') : 'No upgrades';
  }

  Object.assign(em, { renderMessages, meter, pips, updateHud, upgradeSummary });
  window.EchoMaze = em;
})();
