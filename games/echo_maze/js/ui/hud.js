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
      render: () => []
    },
    {
      unlock: 'anchor',
      render(state) {
        return [
          statMarkup('Anchors', anchorStatText(state)),
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
          meter('Vision', p.vision - p.minVision, em.CONFIG.maxVision - p.minVision, em.ITEM_DATA.lantern.color, p.vision.toFixed(1))
        ];
      }
    },
    {
      unlock: 'compass',
      render(state) {
        const p = state.player;
        return [pips('Compass', p.compass, em.CONFIG.playerCaps.maxCompass, em.ITEM_DATA.compass.color, p.compass + '/' + em.CONFIG.playerCaps.maxCompass)];
      }
    },
    {
      unlock: 'boots',
      render(state) {
        const p = state.player;
        const speed = em.effectivePlayerSpeed ? em.effectivePlayerSpeed(state) : p.speed;
        const detail = p.speedBoostTimer > 0 ? Math.round(speed) + ' boost' : Math.round(speed);
        return [meter('Speed', speed - em.CONFIG.baseSpeed, em.CONFIG.playerCaps.maxBoostedSpeed - em.CONFIG.baseSpeed, em.ITEM_DATA.boots.color, detail)];
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

  function anchorStatText(state) {
    return em.anchorProgressText ? em.anchorProgressText(state) : state.anchors + '/' + em.CONFIG.runAnchors;
  }

  function itemTotalMarkup(label, value, color) {
    return `<div class="item-total" style="--meter-color: ${em.safeColor(color)}"><span>${em.escapeHtml(label)}</span><strong>${em.escapeHtml(value)}</strong></div>`;
  }

  function vitalIcons(kind, count, max) {
    let icons = '';

    for (let i = 0; i < max; i++) {
      const stateClass = i < count ? ' filled' : '';
      const label = kind === 'health' ? 'Health' : 'Shield';
      icons += `<span class="vital-icon ${kind}${stateClass}" aria-label="${label} point ${i + 1} of ${max}"></span>`;
    }

    return icons;
  }

  function vitalsMarkup(state) {
    const p = state.player;
    const health = Math.max(0, Math.min(em.CONFIG.playerCaps.maxHealth, p.health));
    const shields = Math.max(0, Math.min(em.CONFIG.playerCaps.maxShields, p.shields));
    const showHealth = shouldShowHealthVitals(state);

    return `
      ${shouldShowPhaseVitals(state) ? phaseVitalsMarkup(state) : ''}
      ${showHealth ? `
      <div class="vital-row health-row" aria-label="Health">
        <span>Health</span>
        <div class="vital-icons">${vitalIcons('health', health, em.CONFIG.playerCaps.maxHealth)}</div>
      </div>
      <div class="vital-row shield-row" aria-label="Shields">
        <span>Shields</span>
        <div class="vital-icons">${vitalIcons('shield', shields, em.CONFIG.playerCaps.maxShields)}</div>
      </div>
      ` : ''}
    `;
  }

  function phaseVitalsMarkup(state) {
    const p = state.player;
    const active = p.phaseTimer > 0 ? p.phaseTimer.toFixed(1) + 's' : 'Ready';
    const cooldown = p.phaseCooldownTimer > 0 ? p.phaseCooldownTimer.toFixed(1) + 's' : 'Ready';

    return `
      <div class="phase-vitals" aria-label="Phase">
        <div class="phase-vitals-head">
          <span>Phase</span>
          <strong>${em.escapeHtml(p.phaseCharges + '/' + em.CONFIG.playerCaps.maxPhaseCharges)}</strong>
        </div>
        <div class="pip-row phase-charge-row">${phaseChargeDots(p.phaseCharges, em.CONFIG.playerCaps.maxPhaseCharges)}</div>
        <div class="phase-timers">
          <span>Active <strong>${em.escapeHtml(active)}</strong></span>
          <span>Cooldown <strong>${em.escapeHtml(cooldown)}</strong></span>
        </div>
      </div>
    `;
  }

  function phaseChargeDots(count, max) {
    let dots = '';
    for (let i = 0; i < max; i++) dots += `<span class="${i < count ? 'filled' : ''}"></span>`;
    return dots;
  }

  function shouldShowPhaseVitals(state) {
    return state.gameMode !== 'beginner' || (em.hasDiscoveredTutorial && em.hasDiscoveredTutorial(state, 'phase'));
  }

  function shouldShowHealthVitals(state) {
    return state.gameMode !== 'beginner' || (em.hasDiscoveredTutorial && em.hasDiscoveredTutorial(state, 'shield'));
  }

  function shouldShowVitals(state) {
    return shouldShowPhaseVitals(state) || shouldShowHealthVitals(state);
  }

  function updateVitals(app) {
    if (!app.dom.vitalsDock) return;

    if (!shouldShowVitals(app.state)) {
      app.dom.vitalsDock.innerHTML = '';
      app.dom.vitalsDock.classList.add('hidden');
      return;
    }

    app.dom.vitalsDock.innerHTML = vitalsMarkup(app.state);
    app.dom.vitalsDock.classList.remove('hidden');
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
    const wardenText = !state.warden ? 'Dormant' : state.warden.wake > 0 ? 'Waking' : 'Hunting';
    const dangerText = state.danger < 0.25 ? 'Calm' : state.danger < 0.55 ? 'Rising' : state.danger < 0.82 ? 'High' : 'Critical';

    app.dom.goalText.innerHTML = em.goalHtmlForState(state);
    updateVitals(app);

    if (state.gameMode === 'beginner') {
      updateBeginnerHud(app, pc);
      renderMessages(app);
      return;
    }

    app.dom.runStats.innerHTML = `
      ${statMarkup('Score', state.score)}
      ${statMarkup('Anchors', anchorStatText(state))}
      ${statMarkup('Tier', state.tier)}
      ${statMarkup('Warden', wardenText, 'warden ' + wardenText.toLowerCase())}
    `;

    app.dom.itemMeters.innerHTML = `
      ${meter('Vision', p.vision - p.minVision, em.CONFIG.maxVision - p.minVision, em.ITEM_DATA.lantern.color, p.vision.toFixed(1))}
      ${meter('Danger', state.danger, 1, '#ff4e38', dangerText)}
      ${pips('Compass', p.compass, em.CONFIG.playerCaps.maxCompass, em.ITEM_DATA.compass.color, p.compass + '/' + em.CONFIG.playerCaps.maxCompass)}
      ${speedMeterMarkup(state)}
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

  function updateBeginnerHud(app, pc) {
    const state = app.state;
    const context = { pc };
    const runStats = renderBeginnerGroups(BEGINNER_RUN_STAT_GROUPS, state, context);
    app.dom.runStats.innerHTML = runStats.join('');

    const meters = renderBeginnerGroups(BEGINNER_METER_GROUPS, state, context);
    app.dom.itemMeters.innerHTML = meters.length ? meters.join('') : '';

    const secondary = renderBeginnerGroups(BEGINNER_SECONDARY_GROUPS, state, context);
    app.dom.secondaryStats.innerHTML = secondary.join('');
  }

  function speedMeterMarkup(state) {
    const p = state.player;
    const speed = em.effectivePlayerSpeed ? em.effectivePlayerSpeed(state) : p.speed;
    const detail = p.speedBoostTimer > 0 ? Math.round(speed) + ' boost' : Math.round(speed);
    return meter('Speed', speed - em.CONFIG.baseSpeed, em.CONFIG.playerCaps.maxBoostedSpeed - em.CONFIG.baseSpeed, em.ITEM_DATA.boots.color, detail);
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
    anchorStatText,
    itemTotalMarkup,
    vitalIcons,
    vitalsMarkup,
    phaseVitalsMarkup,
    phaseChargeDots,
    shouldShowPhaseVitals,
    shouldShowHealthVitals,
    shouldShowVitals,
    updateVitals,
    tutorialSequenceLength,
    renderBeginnerGroups,
    updateHud,
    updateBeginnerHud,
    speedMeterMarkup,
    upgradeSummary,
    beginnerGoalText
  });
  window.EchoMaze = em;
})();
