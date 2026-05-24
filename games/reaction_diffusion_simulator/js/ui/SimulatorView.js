(function(ns) {
  class SimulatorView {
    constructor(documentRef) {
      this.document = documentRef;
      this.controls = {};
      ns.CONTROL_IDS.forEach(id => {
        this.controls[id] = this.document.getElementById(id);
      });

      this.stats = {
        steps: this.document.getElementById('stepsStat'),
        fps: this.document.getElementById('fpsStat'),
        coverage: this.document.getElementById('coverageStat'),
        reaction: this.document.getElementById('reactionStat'),
        contrast: this.document.getElementById('contrastStat'),
        drift: this.document.getElementById('driftStat')
      };

      this.meters = {
        uFill: this.getAll('uFill'),
        vFill: this.getAll('vFill'),
        rFill: this.getAll('rFill'),
        cFill: this.getAll('cFill'),
        uAvg: this.getAll('uAvg'),
        vAvg: this.getAll('vAvg'),
        rAvg: this.getAll('rAvg'),
        cAvg: this.getAll('cAvg')
      };

      this.formulaBoxes = this.getAll('formulaBox');
      this.insightBoxes = this.getAll('insightBox');
      this.presetBadge = this.document.getElementById('presetBadge');
      this.missionBadge = this.document.getElementById('missionBadge');
      this.phaseBadge = this.document.getElementById('phaseBadge');
      this.stabilityBadge = this.document.getElementById('stabilityBadge');
      this.viewBadge = this.document.getElementById('viewBadge');
      this.mainSub = this.document.getElementById('mainSub');
      this.pauseBtn = this.document.getElementById('pauseBtn');
      this.wrapToggle = this.document.getElementById('wrapToggle');
      this.canvas = this.document.getElementById('canvas');
      this.mission = {
        count: this.document.getElementById('missionCount'),
        title: this.document.getElementById('missionTitle'),
        description: this.document.getElementById('missionDescription'),
        requirements: this.document.getElementById('missionRequirements'),
        holdFill: this.document.getElementById('missionHoldFill'),
        holdText: this.document.getElementById('missionHoldText'),
        reward: this.document.getElementById('missionReward'),
        startBtn: this.document.getElementById('missionStartBtn'),
        nextBtn: this.document.getElementById('missionNextBtn'),
        resetBtn: this.document.getElementById('missionResetBtn'),
        focusBtn: this.document.getElementById('missionFocusBtn'),
        revealBtn: this.document.getElementById('learningRevealBtn')
      };
    }

    getAll(...ids) {
      return ids.map(id => this.document.getElementById(id)).filter(Boolean);
    }

    setValues() {
      Object.entries(ns.VALUE_TARGETS).forEach(([key, targetId]) => {
        const out = this.document.getElementById(targetId);
        const control = this.controls[key];
        if (!out || !control) return;
        out.textContent = ns.formatControlValue(key, control.value);
      });
    }

    updateFormula() {
      const model = this.controls.model.value;
      const n = Number(this.controls.exp.value).toFixed(2);
      const S = Number(this.controls.sat.value).toFixed(2);
      let text = '';

      if (model === 'classic') {
        text =
`Classic Gray–Scott

R = G · u · v²

u' = u + dt · (Du∇²u - R + F(1-u) + noise)
v' = v + dt · (Dv∇²v + R - (F+K)v + drift)`;
      } else if (model === 'cubic') {
        text =
`Cubic Reactor

R = G · u · v^n    where n = ${n}

u' = u + dt · (Du∇²u - R + F(1-u) + noise)
v' = v + dt · (Dv∇²v + R - (F+K)v + drift)`;
      } else {
        text =
`Saturating Reactor

R = G · u · v² / (1 + S·v²)    where S = ${S}

u' = u + dt · (Du∇²u - R + F(1-u) + noise)
v' = v + dt · (Dv∇²v + R - (F+K)v + drift)`;
      }

      this.formulaBoxes.forEach(box => {
        box.textContent = text;
      });
    }

    updateInsight(stats) {
      const controls = this.controls;
      const F = Number(controls.feed.value);
      const K = Number(controls.kill.value);
      const Du = Number(controls.diffU.value);
      const Dv = Number(controls.diffV.value);
      const G = Number(controls.gain.value);
      const n = Number(controls.exp.value);
      const sat = Number(controls.sat.value);
      const drift = Math.hypot(Number(controls.flowX.value), Number(controls.flowY.value));
      const parts = [];

      if (K < 0.054) parts.push('Low kill tends to keep structures alive longer, often stretching them into stripes or mazes.');
      else if (K > 0.066) parts.push('Higher kill chops the pattern down faster, so islands become smaller or may fragment.');
      else parts.push('Kill is in a stable middle region, good for clean organic spots and islands.');

      if (F > 0.052) parts.push('High feed energizes the field and often creates denser, more active growth.');
      else if (F < 0.024) parts.push('Lower feed slows development and can produce delicate or sparse structures.');

      if (Du / Math.max(0.001, Dv) > 2.1) parts.push('A strong Du:Dv ratio helps the inhibitor/background spread faster than the pigment field.');
      if (drift > 0.08) parts.push('Directional drift is large enough to visibly bend or sweep the pattern.');
      if (G > 1.3) parts.push('Extra reaction gain amplifies local competition and can sharpen boundaries.');
      if (n > 2.5) parts.push('A higher reaction exponent makes growth more threshold-like, which can create harder, vein-like structures.');
      if (sat > 0.5) parts.push('Saturation tempers runaway growth and is useful for rounded bubble-like chambers.');

      if (stats.coverage < 0.04) parts.push('Very low coverage: try adding a center burst or increasing seed density.');
      else if (stats.avgReaction < 0.0015 && stats.steps > 200) parts.push('The field is chemically calm. Lower kill or increase feed/gain to wake it up.');
      else if (stats.avgChange < 0.0006 && stats.steps > 800) parts.push('The pattern is settling into a stable attractor.');

      this.insightBoxes.forEach(box => {
        box.textContent = parts.join(' ');
      });
      this.mainSub.textContent = `Model: ${controls.model.options[controls.model.selectedIndex].text} · Palette: ${controls.palette.options[controls.palette.selectedIndex].text} · Drift: ${drift.toFixed(2)}`;
    }

    updateStats(stats) {
      this.stats.steps.textContent = stats.steps.toLocaleString();
      this.stats.fps.textContent = stats.fps.toString();
      this.stats.coverage.textContent = Math.round(stats.coverage * 100) + '%';
      this.stats.reaction.textContent = stats.avgReaction.toFixed(3);
      this.stats.contrast.textContent = stats.contrast.toFixed(3);
      this.stats.drift.textContent = stats.drift.toFixed(2);

      this.meters.uFill.forEach(node => node.style.width = Math.round(stats.avgU * 100) + '%');
      this.meters.vFill.forEach(node => node.style.width = Math.round(Math.min(1, stats.avgV * 4) * 100) + '%');
      this.meters.rFill.forEach(node => node.style.width = Math.round(Math.min(1, stats.avgReaction * 45) * 100) + '%');
      this.meters.cFill.forEach(node => node.style.width = Math.round(Math.min(1, stats.avgChange * 1300) * 100) + '%');

      this.meters.uAvg.forEach(node => node.textContent = stats.avgU.toFixed(2));
      this.meters.vAvg.forEach(node => node.textContent = stats.avgV.toFixed(2));
      this.meters.rAvg.forEach(node => node.textContent = stats.avgReaction.toFixed(3));
      this.meters.cAvg.forEach(node => node.textContent = stats.avgChange.toFixed(3));

      this.phaseBadge.textContent = stats.steps < 180 ? 'Phase: Seeding' : stats.steps < 900 ? 'Phase: Growing' : 'Phase: Settling';
      this.stabilityBadge.textContent = stats.avgChange > 0.003 ? 'Stability: Active' : stats.avgChange > 0.0008 ? 'Stability: Evolving' : 'Stability: Calm';
      this.viewBadge.textContent = this.controls.viewMode.options[this.controls.viewMode.selectedIndex].text;
      this.updateInsight(stats);
    }

    setPresetName(name) {
      this.presetBadge.textContent = `Preset: ${name}`;
    }

    setPaused(paused) {
      this.pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    }

    updateMission(status, totalMissions) {
      if (!status || !status.mission || !this.mission.title) return;

      const mission = status.mission;
      this.mission.count.textContent = `${status.activeIndex + 1} / ${totalMissions}`;
      this.mission.title.textContent = mission.title;
      this.mission.description.textContent = mission.description;
      this.mission.reward.textContent = status.completed
        ? `Complete: ${status.rewardText}`
        : `Reward: ${status.rewardText}`;
      this.mission.holdFill.style.width = `${Math.round(status.holdProgress * 100)}%`;
      this.mission.holdText.textContent = status.completed
        ? 'Mission complete'
        : `Hold progress ${Math.round(status.holdProgress * 100)}%`;
      this.mission.nextBtn.disabled = status.activeIndex >= status.unlockedIndex;
      this.mission.startBtn.textContent = status.completed ? 'Replay mission' : 'Start mission';
      this.missionBadge.textContent = status.completed
        ? `Mission complete: ${mission.title}`
        : `Mission: ${mission.title}`;

      this.mission.requirements.innerHTML = '';
      status.requirements.forEach(requirement => {
        const row = this.document.createElement('div');
        row.className = `mission-row ${requirement.met ? 'met' : ''}`;

        const mark = this.document.createElement('span');
        mark.className = 'mission-mark';
        mark.textContent = requirement.met ? 'OK' : '--';

        const label = this.document.createElement('span');
        label.textContent = requirement.label || requirement.metric;

        const value = this.document.createElement('span');
        value.className = 'mission-value';
        value.textContent = requirement.targetText
          ? `${requirement.actualText} / ${requirement.targetText}`
          : requirement.actualText;

        row.append(mark, label, value);
        this.mission.requirements.appendChild(row);
      });
    }

    setWrapState(enabled) {
      this.wrapToggle.classList.toggle('on', enabled);
      this.wrapToggle.setAttribute('aria-pressed', String(enabled));
    }

    setActiveTab(tabName) {
      this.document.querySelectorAll('.tab').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabName);
      });
      this.document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
      });
    }
  }

  ns.SimulatorView = SimulatorView;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
