  function updateUI() {
    const p = state.playerCastle;
    const e = state.enemyCastle;

    document.getElementById("playerHpBar").style.width = clamp(p.hp / p.maxHp, 0, 1) * 100 + "%";
    document.getElementById("enemyHpBar").style.width = clamp(e.hp / e.maxHp, 0, 1) * 100 + "%";
    document.getElementById("moraleBar").style.width = clamp(state.morale / 100, 0, 1) * 100 + "%";

    const frontPct = clamp(frontlineX() / WORLD_W, 0, 1);
    document.getElementById("frontlineBar").style.width = frontPct * 100 + "%";

    document.getElementById("goldText").textContent = Math.floor(state.gold);
    document.getElementById("incomeText").textContent = state.income;
    document.getElementById("waveText").textContent = state.wave;

    document.getElementById("commandText").textContent = commandDefs[state.command].label;

    for (const type of COMMAND_ORDER) {
      document.getElementById(commandDefs[type].id).classList.remove("active");
    }
    document.getElementById(commandDefs[state.command].id).classList.add("active");

    for (const type of UNIT_ORDER) {
      const def = unitDefs[type];
      const button = document.getElementById("spawn_" + type);
      const cooldown = state.spawnCooldowns[type] || 0;
      const cooldownPct = clamp(cooldown / def.spawnCd, 0, 1);
      const blocked = state.gold < def.cost || cooldown > 0;
      button.disabled = blocked;
      button.classList.toggle("disabled", blocked);
      button.classList.toggle("cooling", cooldown > 0);
      const fill = button.querySelector(".cooldown-fill");
      if (fill) fill.style.width = cooldownPct * 100 + "%";
    }

    for (const type of BUILD_ORDER) {
      const def = buildDefs[type];
      const button = document.getElementById(def.id);
      const blocked = state.gold < def.cost;
      button.disabled = blocked;
      button.classList.toggle("disabled", blocked);
    }

    updateArmyStrip();
  }

  function setupControlLabels() {
    setupUnitCards();
    setupCommandButtons();
    setupBuildButtons();
  }

  function setupUnitCards() {
    for (const type of UNIT_ORDER) {
      const def = unitDefs[type];
      const button = document.getElementById("spawn_" + type);
      button.innerHTML = `
        <span class="unit-top">
          <span class="hotkey">${def.hotkey}</span>
          <span class="unit-icon">${def.icon}</span>
          <span class="unit-name">${def.label}</span>
          <span class="unit-cost">${def.cost}g</span>
        </span>
        <span class="unit-role">${def.role}</span>
        <span class="unit-stats">
          <span>HP <b>${def.hp}</b></span>
          <span>DMG <b>${def.dmg}</b></span>
          <span>RNG <b>${def.range}</b></span>
        </span>
        <span class="cooldown-fill"></span>
      `;
      button.setAttribute("aria-label", `Spawn ${def.label}, ${def.cost} gold`);
    }
  }

  function setupCommandButtons() {
    for (const type of COMMAND_ORDER) {
      const def = commandDefs[type];
      const button = document.getElementById(def.id);
      button.innerHTML = `${def.hotkey.toUpperCase()} ${def.label}<br><span>${def.description}</span>`;
      button.setAttribute("aria-label", `Set command stance to ${def.label}`);
    }
  }

  function setupBuildButtons() {
    for (const type of BUILD_ORDER) {
      const def = buildDefs[type];
      const button = document.getElementById(def.id);
      button.innerHTML = `${def.label}<br><span>${def.cost}g ${def.summary}</span>`;
      button.setAttribute("aria-label", `${def.label}, ${def.cost} gold`);
    }
  }

  function unitCounts(side) {
    const counts = {};
    for (const type of UNIT_ORDER) counts[type] = 0;
    for (const u of state.units) {
      if (u.side === side && counts[u.type] !== undefined) counts[u.type]++;
    }
    return counts;
  }

  function updateArmyStrip() {
    const el = document.getElementById("armyStrip");
    if (!el) return;

    const player = unitCounts(1);
    const enemy = unitCounts(-1);
    const playerTotal = Object.values(player).reduce((a, b) => a + b, 0);
    const enemyTotal = Object.values(enemy).reduce((a, b) => a + b, 0);
    const compactCounts = counts => UNIT_ORDER
      .filter(type => counts[type] > 0)
      .map(type => `${unitDefs[type].icon} ${counts[type]}`)
      .join(" ");

    el.innerHTML = `
      <span class="army-pill player">Your field: ${playerTotal || 0}</span>
      <span class="army-pill player">${compactCounts(player) || "No troops"}</span>
      <span class="army-pill enemy">Enemy pressure: ${enemyTotal || 0}</span>
      <span class="army-pill enemy">${compactCounts(enemy) || "No troops"}</span>
    `;
  }

Object.assign(window.CastlefallValley, { updateUI, setupControlLabels, setupUnitCards, setupCommandButtons, setupBuildButtons, unitCounts, updateArmyStrip });
