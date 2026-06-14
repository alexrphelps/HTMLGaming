(function () {
  'use strict';

  const em = window.EchoMaze || {};

  const BEGINNER_RUN_STAT_GROUPS = [
    {
      render(state) {
        const sequenceLength = tutorialSequenceLength(state);
        const learned = Math.min(state.tutorialStep, sequenceLength);
        return [
          statMarkup('Mode', 'Beginner'),
          statMarkup('Lessons', learned + '/' + sequenceLength)
        ];
      }
    },
    {
      unlock: 'relic',
      render(state) {
        return [
          statMarkup('Score', state.score),
          statMarkup('Items', state.items)
        ];
      }
    },
    {
      unlock: 'shield',
      render(state) {
        return [statMarkup('Integrity', state.player.health + ' HP / ' + state.player.shields + ' SH')];
      }
    },
    {
      unlock: 'anchor',
      render(state) {
        return [
          statMarkup('Anchors', state.anchors + '/' + em.CONFIG.runAnchors),
          statMarkup('Tier', state.tier)
        ];
      }
    }
  ];

  const BEGINNER_METER_GROUPS = [
    {
      unlock: 'lantern',
      render(state) {
        const p = state.player;
        return [
          meter('Fuel', p.fuel, p.maxFuel, em.ITEM_DATA.lantern.color, Math.round(p.fuel) + '/' + Math.round(p.maxFuel)),
          meter('Vision', p.vision - em.CONFIG.baseVision, em.CONFIG.maxVision - em.CONFIG.baseVision, em.ITEM_DATA.lantern.color, p.vision.toFixed(1))
        ];
      }
    },
    {
      unlock: 'phase',
      render(state, context) {
        const p = state.player;
        return [pips('Phase', p.phaseTimer > 0 ? 1 : p.phaseCharges, em.CONFIG.playerCaps.maxPhaseCharges, em.ITEM_DATA.phase.color, context.phase)];
      }
    },
    {
      unlock: 'compass',
      render(state) {
        const p = state.player;
        return [pips('Compass', p.compass + p.compassObjective, 8, em.ITEM_DATA.compass.color, (p.compass + p.compassObjective) + '/8')];
      }
    },
    {
      unlock: 'boots',
      render(state) {
        const p = state.player;
        return [meter('Speed', p.speed - em.CONFIG.baseSpeed, em.CONFIG.playerCaps.maxSpeed - em.CONFIG.baseSpeed, em.ITEM_DATA.boots.color, Math.round(p.speed))];
      }
    },
    {
      unlock: 'battery',
      render(state) {
        return [pips('Battery', state.player.battery, em.CONFIG.playerCaps.maxBattery, em.ITEM_DATA.battery.color, state.player.battery + '/' + em.CONFIG.playerCaps.maxBattery)];
      }
    },
    {
      unlock: 'map',
      render(state) {
        return [itemTotalMarkup('Revealed', state.revealed.size, em.ITEM_DATA.map.color)];
      }
    }
  ];

  const BEGINNER_SECONDARY_GROUPS = [
    { unlock: 'map', render: state => '<span>Depth ' + em.escapeHtml(state.maxDepth) + '</span>' },
    { unlock: 'compass', render: (state, context) => '<span>' + em.escapeHtml(context.pc.x) + ', ' + em.escapeHtml(context.pc.y) + '</span>' }
  ];

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
      <div class="meter" style="--meter-color: ${em.safeColor(color)}; --meter-fill: ${fill}%">
        <div class="meter-head"><span>${em.escapeHtml(label)}</span><strong>${em.escapeHtml(detail)}</strong></div>
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
      <div class="pips" style="--meter-color: ${em.safeColor(color)}">
        <div class="meter-head"><span>${em.escapeHtml(label)}</span><strong>${em.escapeHtml(detail)}</strong></div>
        <div class="pip-row">${dots}</div>
      </div>
    `;
  }

  function statMarkup(label, value, className = '') {
    const extra = className ? ' ' + em.escapeHtml(className) : '';
    return `<div class="stat${extra}"><span>${em.escapeHtml(label)}</span><strong>${em.escapeHtml(value)}</strong></div>`;
  }

  function itemTotalMarkup(label, value, color) {
    return `<div class="item-total" style="--meter-color: ${em.safeColor(color)}"><span>${em.escapeHtml(label)}</span><strong>${em.escapeHtml(value)}</strong></div>`;
  }

  function tutorialSequenceLength(state) {
    return state.tutorialSequence && state.tutorialSequence.length ? state.tutorialSequence.length : em.BEGINNER_SEQUENCE.length;
  }

  function renderBeginnerGroups(groups, state, context) {
    return groups.flatMap(group => {
      if (group.unlock && !em.hasDiscoveredTutorial(state, group.unlock)) return [];
      return group.render(state, context);
    });
  }

  function updateHud(app) {
    const state = app.state;
    const p = state.player;
    const pc = em.cellOfWorld(p.x, p.y);
    const phase = p.phaseTimer > 0 ? p.phaseTimer.toFixed(1) + 's' : p.phaseCooldownTimer > 0 ? p.phaseCooldownTimer.toFixed(1) + 's CD' : p.phaseCharges + '/' + em.CONFIG.playerCaps.maxPhaseCharges;
    const wardenText = !state.warden ? 'Dormant' : state.warden.wake > 0 ? 'Waking' : 'Hunting';
    const dangerText = state.danger < 0.25 ? 'Calm' : state.danger < 0.55 ? 'Rising' : state.danger < 0.82 ? 'High' : 'Critical';

    app.dom.goalText.innerHTML = em.goalHtmlForState(state);

    if (state.gameMode === 'beginner') {
      updateBeginnerHud(app, phase, pc);
      renderMessages(app);
      return;
    }

    app.dom.runStats.innerHTML = `
      ${statMarkup('Score', state.score)}
      ${statMarkup('Anchors', state.anchors + '/' + em.CONFIG.runAnchors)}
      ${statMarkup('Tier', state.tier)}
      ${statMarkup('Integrity', p.health + ' HP / ' + p.shields + ' SH')}
      ${statMarkup('Warden', wardenText, 'warden ' + wardenText.toLowerCase())}
    `;

    app.dom.itemMeters.innerHTML = `
      ${meter('Fuel', p.fuel, p.maxFuel, em.ITEM_DATA.lantern.color, Math.round(p.fuel) + '/' + Math.round(p.maxFuel))}
      ${meter('Vision', p.vision - em.CONFIG.baseVision, em.CONFIG.maxVision - em.CONFIG.baseVision, em.ITEM_DATA.lantern.color, p.vision.toFixed(1))}
      ${pips('Phase', p.phaseTimer > 0 ? 1 : p.phaseCharges, em.CONFIG.playerCaps.maxPhaseCharges, em.ITEM_DATA.phase.color, phase)}
      ${meter('Danger', state.danger, 1, em.ITEM_DATA.battery.color, dangerText)}
      ${pips('Compass', p.compass + p.compassObjective, 8, em.ITEM_DATA.compass.color, (p.compass + p.compassObjective) + '/8')}
      ${meter('Speed', p.speed - em.CONFIG.baseSpeed, em.CONFIG.playerCaps.maxSpeed - em.CONFIG.baseSpeed, em.ITEM_DATA.boots.color, Math.round(p.speed))}
      ${pips('Battery', p.battery, em.CONFIG.playerCaps.maxBattery, em.ITEM_DATA.battery.color, p.battery + '/' + em.CONFIG.playerCaps.maxBattery)}
      ${itemTotalMarkup('Items', state.items, em.ITEM_DATA.relic.color)}
    `;

    app.dom.secondaryStats.innerHTML = `
      <span>Depth ${em.escapeHtml(state.maxDepth)}</span>
      <span>Revealed ${em.escapeHtml(state.revealed.size)}</span>
      <span>${em.escapeHtml(upgradeSummary(state))}</span>
      <span>${em.escapeHtml(pc.x)}, ${em.escapeHtml(pc.y)}</span>
    `;

    renderMessages(app);
  }

  function updateBeginnerHud(app, phase, pc) {
    const state = app.state;
    const context = { phase, pc };
    const runStats = renderBeginnerGroups(BEGINNER_RUN_STAT_GROUPS, state, context);
    app.dom.runStats.innerHTML = runStats.join('');

    const meters = renderBeginnerGroups(BEGINNER_METER_GROUPS, state, context);
    app.dom.itemMeters.innerHTML = meters.length ? meters.join('') : '';

    const secondary = renderBeginnerGroups(BEGINNER_SECONDARY_GROUPS, state, context);
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
    return '<strong>Beginner:</strong> Find ' + em.escapeHtml(label) + ' to learn the next HUD stat.';
  }

  Object.assign(em, {
    BEGINNER_RUN_STAT_GROUPS,
    BEGINNER_METER_GROUPS,
    BEGINNER_SECONDARY_GROUPS,
    renderMessages,
    meter,
    pips,
    statMarkup,
    itemTotalMarkup,
    tutorialSequenceLength,
    renderBeginnerGroups,
    updateHud,
    updateBeginnerHud,
    upgradeSummary,
    beginnerGoalText
  });
  window.EchoMaze = em;
})();
