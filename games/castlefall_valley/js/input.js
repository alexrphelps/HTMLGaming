  function bindButton(id, fn) {
    document.getElementById(id).addEventListener("click", fn);
  }

  function bindHoldButton(id, key) {
    const el = document.getElementById(id);
    const press = e => {
      e.preventDefault();
      state.keys[key] = true;
    };
    const release = e => {
      e.preventDefault();
      state.keys[key] = false;
    };
    el.addEventListener("pointerdown", press);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("pointerleave", release);
  }

  bindButton("spawn_sword", () => window.CastlefallValley.spawnUnit("sword", 1, true));
  bindButton("spawn_shield", () => window.CastlefallValley.spawnUnit("shield", 1, true));
  bindButton("spawn_archer", () => window.CastlefallValley.spawnUnit("archer", 1, true));
  bindButton("spawn_knight", () => window.CastlefallValley.spawnUnit("knight", 1, true));
  bindButton("spawn_priest", () => window.CastlefallValley.spawnUnit("priest", 1, true));

  bindButton("cmd_rush", () => window.CastlefallValley.setCommand("rush"));
  bindButton("cmd_formation", () => window.CastlefallValley.setCommand("formation"));
  bindButton("cmd_retreat", () => window.CastlefallValley.setCommand("retreat"));

  bindButton("build_wall", () => window.CastlefallValley.build("wall"));
  bindButton("build_barracks", () => window.CastlefallValley.build("barracks"));
  bindButton("build_tower", () => window.CastlefallValley.build("tower"));
  bindButton("build_forge", () => window.CastlefallValley.build("forge"));
  bindButton("build_chapel", () => window.CastlefallValley.build("chapel"));
  bindButton("build_repair", () => window.CastlefallValley.build("repair"));
  bindButton("restartButton", window.CastlefallValley.reset);

  bindHoldButton("touch_left", "a");
  bindHoldButton("touch_jump", "w");
  bindHoldButton("touch_right", "d");
  bindHoldButton("touch_attack", "j");

  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();
    window.CastlefallValley.state.keys[key] = true;

    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      e.preventDefault();
    }

    if (!e.repeat) {
      if (key === "1") window.CastlefallValley.spawnUnit("sword", 1, true);
      if (key === "2") window.CastlefallValley.spawnUnit("shield", 1, true);
      if (key === "3") window.CastlefallValley.spawnUnit("archer", 1, true);
      if (key === "4") window.CastlefallValley.spawnUnit("knight", 1, true);
      if (key === "5") window.CastlefallValley.spawnUnit("priest", 1, true);
    }

    if (key === "z") window.CastlefallValley.setCommand("rush");
    if (key === "x") window.CastlefallValley.setCommand("formation");
    if (key === "c") window.CastlefallValley.setCommand("retreat");

    if (key === "p") window.CastlefallValley.state.paused = !window.CastlefallValley.state.paused;
    if (key === "r") window.CastlefallValley.reset();
  });

  window.addEventListener("keyup", e => {
    window.CastlefallValley.state.keys[e.key.toLowerCase()] = false;
  });

  const gameCanvas = document.getElementById("game");

  gameCanvas.addEventListener("mousedown", () => {
    window.CastlefallValley.state.keys["j"] = true;
    setTimeout(() => window.CastlefallValley.state.keys["j"] = false, 80);
  });

  gameCanvas.addEventListener("touchstart", e => {
    e.preventDefault();
    window.CastlefallValley.state.keys["j"] = true;
    setTimeout(() => window.CastlefallValley.state.keys["j"] = false, 80);
  }, { passive: false });

Object.assign(window.CastlefallValley, { bindButton, bindHoldButton });
