  const inputCleanups = [];
  const inputTimers = [];

  function addInputListener(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    inputCleanups.push(() => target.removeEventListener(type, handler, options));
  }

  function bindButton(id, fn) {
    const el = document.getElementById(id);
    addInputListener(el, "click", fn);
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
    addInputListener(el, "pointerdown", press);
    addInputListener(el, "pointerup", release);
    addInputListener(el, "pointercancel", release);
    addInputListener(el, "pointerleave", release);
  }

  function pulseKey(key) {
    state.keys[key] = true;
    const timer = setTimeout(() => {
      state.keys[key] = false;
    }, 80);
    inputTimers.push(timer);
  }

  function setupInput() {
    cleanupInput();

    for (const type of UNIT_ORDER) {
      bindButton("spawn_" + type, () => window.CastlefallValley.spawnUnit(type, 1, true));
    }

    for (const type of COMMAND_ORDER) {
      const def = commandDefs[type];
      bindButton(def.id, () => window.CastlefallValley.setCommand(type));
    }

    for (const type of BUILD_ORDER) {
      const def = buildDefs[type];
      bindButton(def.id, () => window.CastlefallValley.build(type));
    }

    bindButton("restartButton", window.CastlefallValley.reset);

    bindHoldButton("touch_left", "a");
    bindHoldButton("touch_jump", "w");
    bindHoldButton("touch_right", "d");
    bindHoldButton("touch_attack", "j");

    addInputListener(window, "keydown", e => {
      const key = e.key.toLowerCase();
      state.keys[key] = true;

      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
      }

      if (!e.repeat) {
        const unitType = UNIT_ORDER.find(type => unitDefs[type].hotkey === key);
        if (unitType) window.CastlefallValley.spawnUnit(unitType, 1, true);
      }

      const commandType = COMMAND_ORDER.find(type => commandDefs[type].hotkey === key);
      if (commandType) window.CastlefallValley.setCommand(commandType);

      if (key === "p") state.paused = !state.paused;
      if (key === "r") window.CastlefallValley.reset();
    });

    addInputListener(window, "keyup", e => {
      state.keys[e.key.toLowerCase()] = false;
    });

    const gameCanvas = document.getElementById("game");

    addInputListener(gameCanvas, "mousedown", () => {
      pulseKey("j");
    });

    addInputListener(gameCanvas, "touchstart", e => {
      e.preventDefault();
      pulseKey("j");
    }, { passive: false });
  }

  function cleanupInput() {
    while (inputCleanups.length) {
      inputCleanups.pop()();
    }

    while (inputTimers.length) {
      clearTimeout(inputTimers.pop());
    }
  }

Object.assign(window.CastlefallValley, { bindButton, bindHoldButton, setupInput, cleanupInput });
