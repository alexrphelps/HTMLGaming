window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  const WORLD_W = ns.W || 1920;
  const WORLD_H = ns.H || 1080;
  const MIN_SIZE = 8;
  const HANDLE_SIZE = 18;
  const POINT_SIZE = {
    spawn: { w: 38, h: 52 },
    shard: { w: 32, h: 32 },
    flipBattery: { w: 34, h: 34 },
    jumpBattery: { w: 34, h: 34 }
  };
  const COLLECTIONS = {
    platform: "platforms",
    shard: "shards",
    spike: "spikes",
    flipBattery: "flipBatteries",
    jumpBattery: "jumpBatteries",
    gate: "gates",
    patrolEnemy: "enemies",
    hunterEnemy: "enemies",
    mover: "movers",
    sentry: "hazards"
  };

  const ITEM_LABELS = {
    spawn: "Spawn",
    exit: "Exit",
    platform: "Platform",
    shard: "Shard",
    spike: "Spike",
    flipBattery: "Flip battery",
    jumpBattery: "Jump battery",
    gate: "Gate",
    patrolEnemy: "Patrol enemy",
    hunterEnemy: "Hunter enemy",
    mover: "Moving platform",
    sentry: "Sentry"
  };

  const REQUIRED_ARRAYS = [
    "platforms",
    "shards",
    "spikes",
    "enemies",
    "movers",
    "flipBatteries",
    "jumpBatteries",
    "locks",
    "gates",
    "hazards"
  ];

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slug(name) {
    return String(name || "room").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function snapValue(value, state) {
    if (!state.snap) return Math.round(value);
    return Math.round(value / state.grid) * state.grid;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeRoomForEditing(room, index) {
    const normalized = Object.assign({}, deepClone(room || {}));
    normalized.name = normalized.name || "New Vault " + (index + 1);
    normalized.id = normalized.id || (index + 1) + "-" + slug(normalized.name);
    normalized.tip = normalized.tip || "Route the shards, keep a flip ready, and leave clean.";
    normalized.parTime = Number.isFinite(Number(normalized.parTime)) ? Number(normalized.parTime) : 24;
    normalized.parFlips = Number.isFinite(Number(normalized.parFlips)) ? Number(normalized.parFlips) : 3;
    normalized.parDeaths = Number.isFinite(Number(normalized.parDeaths)) ? Number(normalized.parDeaths) : 0;
    normalized.spawn = normalized.spawn || { x: 104, y: 900 };
    normalized.exit = normalized.exit || { x: 1760, y: 824, w: 84, h: 140 };
    normalized.chase = normalized.chase || false;

    for (const key of REQUIRED_ARRAYS) {
      if (!Array.isArray(normalized[key])) normalized[key] = [];
    }

    return normalized;
  }

  function createDefaultRoom(index) {
    const roomNumber = index || 1;
    return normalizeRoomForEditing({
      id: roomNumber + "-new-vault",
      name: "New Vault " + roomNumber,
      parTime: 24,
      parFlips: 3,
      parDeaths: 0,
      spawn: { x: 104, y: 900 },
      exit: { x: 1760, y: 824, w: 84, h: 140 },
      chase: false,
      platforms: [
        { x: 0, y: 1008, w: WORLD_W, h: 72 },
        { x: 0, y: 0, w: WORLD_W, h: 36 },
        { x: 300, y: 780, w: 240, h: 28 },
        { x: 760, y: 600, w: 240, h: 28 },
        { x: 1220, y: 420, w: 240, h: 28 }
      ],
      shards: [{ x: 860, y: 552 }],
      spikes: [],
      enemies: [],
      movers: [],
      flipBatteries: [{ x: 620, y: 710, amount: 45 }],
      jumpBatteries: [],
      locks: [],
      gates: [],
      hazards: [],
      tip: "A fresh vault contract. Place the route, then validate before saving."
    }, roomNumber - 1);
  }

  function serializeRooms(rooms) {
    const prepared = rooms.map(function(room, index) {
      return normalizeRoomForEditing(room, index);
    });
    return [
      "window.GravityLocksmith = window.GravityLocksmith || {};",
      "",
      "(function(ns) {",
      "  \"use strict\";",
      "",
      "  ns.ROOM_DEFINITIONS = " + JSON.stringify(prepared, null, 2).replace(/\n/g, "\n  ") + ";",
      "})(window.GravityLocksmith);",
      ""
    ].join("\n");
  }

  function parseRoomsSource(source) {
    const sandboxWindow = { GravityLocksmith: {} };
    const fn = new Function("window", source + "\nreturn window.GravityLocksmith && window.GravityLocksmith.ROOM_DEFINITIONS;");
    const rooms = fn(sandboxWindow);
    if (!Array.isArray(rooms)) {
      throw new Error("ROOM_DEFINITIONS was not found in the selected file.");
    }
    return rooms.map(normalizeRoomForEditing);
  }

  function getPointRect(point, kind) {
    const size = POINT_SIZE[kind] || { w: 32, h: 32 };
    return { x: point.x, y: point.y, w: size.w, h: size.h };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function pointInRect(point, rect) {
    return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  }

  function getSentryBeamRect(hazard) {
    if (ns.getSentryBeamRect) return ns.getSentryBeamRect(hazard);
    if (hazard.axis === "x") {
      return {
        x: hazard.dir === 1 ? hazard.x + hazard.w : hazard.x - hazard.length,
        y: hazard.y + hazard.h / 2 - hazard.thickness / 2,
        w: hazard.length,
        h: hazard.thickness
      };
    }
    return {
      x: hazard.x + hazard.w / 2 - hazard.thickness / 2,
      y: hazard.dir === 1 ? hazard.y + hazard.h : hazard.y - hazard.length,
      w: hazard.thickness,
      h: hazard.length
    };
  }

  function createItem(kind, point, room, state) {
    const x = snapValue(point.x, state);
    const y = snapValue(point.y, state);
    const nextIndex = function(collection) {
      return room[collection].length + 1;
    };

    if (kind === "platform") return { x: x, y: y, w: 220, h: 28 };
    if (kind === "shard") return { x: x, y: y };
    if (kind === "spike") return { x: x, y: y, w: 180, h: 20, dir: y < WORLD_H / 2 ? 1 : -1 };
    if (kind === "flipBattery") return { x: x, y: y, amount: 45 };
    if (kind === "jumpBattery") return { x: x, y: y, amount: 100 };
    if (kind === "gate") return { id: "gate-" + nextIndex("gates"), x: x, y: 0, w: 46, h: 300, shards: 1, lockId: null };
    if (kind === "patrolEnemy") return { type: "patrol", x: x, y: y, w: 42, h: 42, vx: 86, vy: 0, axis: "x", speed: 86 };
    if (kind === "hunterEnemy") return { type: "hunter", axis: "x", x: x, y: y, w: 46, h: 46, speed: 88, vx: 0, vy: 0 };
    if (kind === "mover") return { x: x, y: y, w: 210, h: 28, axis: "x", range: 180, speed: 96 };
    if (kind === "sentry") {
      return { type: "sentry", x: x, y: y, w: 42, h: 42, axis: "x", length: 420, thickness: 18, period: 2.3, activeTime: 1.05, phase: 0, dir: 1 };
    }
    return null;
  }

  function getRoomItems(room) {
    const items = [
      { kind: "spawn", label: "Spawn", item: room.spawn, singleton: true, rect: getPointRect(room.spawn, "spawn") },
      { kind: "exit", label: "Exit", item: room.exit, singleton: true, rect: room.exit, resizable: true }
    ];

    function addCollection(collection, kind, getRect, resizable) {
      room[collection].forEach(function(item, index) {
        items.push({
          kind: kind,
          label: ITEM_LABELS[kind],
          collection: collection,
          index: index,
          item: item,
          rect: getRect(item),
          resizable: Boolean(resizable)
        });
      });
    }

    addCollection("platforms", "platform", function(item) { return item; }, true);
    addCollection("shards", "shard", function(item) { return getPointRect(item, "shard"); }, false);
    addCollection("spikes", "spike", function(item) { return item; }, true);
    addCollection("flipBatteries", "flipBattery", function(item) { return getPointRect(item, "flipBattery"); }, false);
    addCollection("jumpBatteries", "jumpBattery", function(item) { return getPointRect(item, "jumpBattery"); }, false);
    addCollection("gates", "gate", function(item) { return { x: item.x, y: 0, w: item.w, h: WORLD_H }; }, true);
    room.enemies.forEach(function(item, index) {
      items.push({
        kind: item.type === "hunter" ? "hunterEnemy" : "patrolEnemy",
        label: item.type === "hunter" ? "Hunter enemy" : "Patrol enemy",
        collection: "enemies",
        index: index,
        item: item,
        rect: item,
        resizable: true
      });
    });
    addCollection("movers", "mover", function(item) { return item; }, true);
    addCollection("hazards", "sentry", function(item) { return item; }, true);
    return items;
  }

  function sameSelection(a, b) {
    if (!a || !b) return false;
    if (a.singleton || b.singleton) return a.kind === b.kind && a.singleton && b.singleton;
    return a.collection === b.collection && a.index === b.index;
  }

  function getSelectionItem(state) {
    if (!state.selected) return null;
    const room = state.rooms[state.roomIndex];
    if (state.selected.singleton) {
      return getRoomItems(room).find(function(candidate) {
        return sameSelection(candidate, state.selected);
      }) || null;
    }
    const item = room[state.selected.collection] && room[state.selected.collection][state.selected.index];
    if (!item) return null;
    return getRoomItems(room).find(function(candidate) {
      return sameSelection(candidate, state.selected);
    }) || null;
  }

  function getCanvasPoint(canvas, event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) * WORLD_W / bounds.width, 0, WORLD_W),
      y: clamp((event.clientY - bounds.top) * WORLD_H / bounds.height, 0, WORLD_H)
    };
  }

  function getHitItem(room, point) {
    const items = getRoomItems(room);
    for (let index = items.length - 1; index >= 0; index--) {
      if (pointInRect(point, items[index].rect)) return items[index];
    }
    return null;
  }

  function getResizeHandleRect(item) {
    const rect = item.rect;
    if (item.kind === "gate") {
      return { x: rect.x + rect.w - HANDLE_SIZE / 2, y: WORLD_H / 2 - HANDLE_SIZE / 2, w: HANDLE_SIZE, h: HANDLE_SIZE };
    }
    return { x: rect.x + rect.w - HANDLE_SIZE / 2, y: rect.y + rect.h - HANDLE_SIZE / 2, w: HANDLE_SIZE, h: HANDLE_SIZE };
  }

  function moveSelected(item, point, dragOffset, state) {
    const nextX = snapValue(point.x - dragOffset.x, state);
    const nextY = snapValue(point.y - dragOffset.y, state);
    if (item.kind === "gate") {
      item.item.x = clamp(nextX, 0, WORLD_W - item.item.w);
      return;
    }
    item.item.x = clamp(nextX, 0, WORLD_W - (item.rect.w || 0));
    item.item.y = clamp(nextY, 0, WORLD_H - (item.rect.h || 0));
  }

  function resizeSelected(item, point, state) {
    const right = snapValue(point.x, state);
    const bottom = snapValue(point.y, state);
    if (item.kind === "gate") {
      item.item.w = clamp(right - item.item.x, MIN_SIZE, WORLD_W - item.item.x);
      return;
    }
    item.item.w = clamp(right - item.item.x, MIN_SIZE, WORLD_W - item.item.x);
    item.item.h = clamp(bottom - item.item.y, MIN_SIZE, WORLD_H - item.item.y);
  }

  function drawGrid(ctx, state) {
    ctx.strokeStyle = "rgba(137, 207, 190, 0.14)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= WORLD_W; x += state.grid) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_H; y += state.grid) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
      ctx.stroke();
    }
  }

  function drawLabel(ctx, text, x, y, color) {
    ctx.save();
    ctx.font = "700 18px Segoe UI, sans-serif";
    ctx.fillStyle = "rgba(4, 11, 13, 0.82)";
    ctx.fillRect(x - 4, y - 19, ctx.measureText(text).width + 8, 24);
    ctx.fillStyle = color || "#effaf4";
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawRect(ctx, rect, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  }

  function drawDiamond(ctx, rect, fill, stroke) {
    ctx.save();
    ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -rect.h / 2);
    ctx.lineTo(rect.w / 2, 0);
    ctx.lineTo(0, rect.h / 2);
    ctx.lineTo(-rect.w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawSpike(ctx, rect, dir) {
    const count = Math.max(1, Math.floor(rect.w / 28));
    ctx.fillStyle = "rgba(255, 77, 109, 0.82)";
    ctx.strokeStyle = "#ff4d6d";
    ctx.lineWidth = 2;
    for (let index = 0; index < count; index++) {
      const x = rect.x + index * (rect.w / count);
      const w = rect.w / count;
      ctx.beginPath();
      if (dir === -1) {
        ctx.moveTo(x, rect.y + rect.h);
        ctx.lineTo(x + w / 2, rect.y);
        ctx.lineTo(x + w, rect.y + rect.h);
      } else {
        ctx.moveTo(x, rect.y);
        ctx.lineTo(x + w / 2, rect.y + rect.h);
        ctx.lineTo(x + w, rect.y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function renderEditor(ctx, state) {
    const room = state.rooms[state.roomIndex];
    const selected = getSelectionItem(state);
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
    gradient.addColorStop(0, "#071116");
    gradient.addColorStop(1, "#10282a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    drawGrid(ctx, state);

    if (room.chase) {
      const chase = room.chase === true ? { startX: -180 } : room.chase;
      drawRect(ctx, { x: chase.startX || -180, y: 0, w: 20, h: WORLD_H }, "rgba(255,77,109,0.22)", "#ff4d6d");
      drawLabel(ctx, "CHASE", Math.max(8, (chase.startX || -180) + 28), 34, "#ff4d6d");
    }

    room.platforms.forEach(function(item) {
      drawRect(ctx, item, "rgba(85,247,255,0.16)", "rgba(85,247,255,0.74)");
    });
    room.movers.forEach(function(item) {
      drawRect(ctx, item, "rgba(255,217,106,0.22)", "#ffd96a");
      drawLabel(ctx, item.axis + " mover", item.x + 8, item.y - 8, "#ffd96a");
    });
    room.gates.forEach(function(item) {
      drawRect(ctx, { x: item.x, y: 0, w: item.w, h: WORLD_H }, "rgba(117,255,157,0.12)", "#75ff9d");
      drawLabel(ctx, item.id || "gate", item.x + item.w + 8, 48, "#75ff9d");
    });
    drawRect(ctx, room.exit, "rgba(117,255,157,0.2)", "#75ff9d");
    drawLabel(ctx, "EXIT", room.exit.x + 8, room.exit.y - 8, "#75ff9d");
    room.spikes.forEach(function(item) {
      drawSpike(ctx, item, item.dir);
    });
    room.shards.forEach(function(item) {
      drawDiamond(ctx, getPointRect(item, "shard"), "rgba(255,217,106,0.72)", "#ffd96a");
    });
    room.flipBatteries.forEach(function(item) {
      drawRect(ctx, getPointRect(item, "flipBattery"), "rgba(85,247,255,0.28)", "#55f7ff");
    });
    room.jumpBatteries.forEach(function(item) {
      const rect = getPointRect(item, "jumpBattery");
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,217,106,0.24)";
      ctx.strokeStyle = "#ffd96a";
      ctx.lineWidth = 3;
      ctx.arc(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    room.hazards.forEach(function(item) {
      const beam = getSentryBeamRect(item);
      drawRect(ctx, beam, "rgba(255,77,109,0.16)", "rgba(255,77,109,0.46)");
      drawRect(ctx, item, "rgba(255,77,109,0.68)", "#ff4d6d");
    });
    room.enemies.forEach(function(item) {
      drawRect(ctx, item, item.type === "hunter" ? "rgba(255,77,109,0.42)" : "rgba(156,107,255,0.42)", item.type === "hunter" ? "#ff4d6d" : "#9c6bff");
      drawLabel(ctx, item.type || "enemy", item.x + 6, item.y - 8, item.type === "hunter" ? "#ff4d6d" : "#c4a8ff");
    });
    drawRect(ctx, getPointRect(room.spawn, "spawn"), "rgba(85,247,255,0.72)", "#effaf4");
    drawLabel(ctx, "SPAWN", room.spawn.x + 8, room.spawn.y - 8, "#55f7ff");

    if (selected) {
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.setLineDash([14, 8]);
      ctx.strokeRect(selected.rect.x, selected.rect.y, selected.rect.w, selected.rect.h);
      ctx.setLineDash([]);
      if (selected.resizable) {
        const handle = getResizeHandleRect(selected);
        drawRect(ctx, handle, "#ffffff", "#041012");
      }
      ctx.restore();
    }
  }

  function createField(label, value, onInput, options) {
    const settings = options || {};
    const wrapper = document.createElement("label");
    wrapper.className = "field-label" + (settings.wide ? " wide-field" : "");
    wrapper.textContent = label;
    const input = document.createElement(settings.textarea ? "textarea" : "input");
    if (!settings.textarea) {
      input.type = settings.type || "number";
      if (settings.step != null) input.step = settings.step;
    }
    input.value = value == null ? "" : value;
    input.addEventListener("input", function() {
      onInput(settings.type === "text" || settings.textarea ? input.value : Number(input.value));
    });
    wrapper.appendChild(input);
    return wrapper;
  }

  function createSelectField(label, value, options, onInput) {
    const wrapper = document.createElement("label");
    wrapper.className = "field-label";
    wrapper.textContent = label;
    const select = document.createElement("select");
    options.forEach(function(option) {
      const element = document.createElement("option");
      element.value = option.value;
      element.textContent = option.label;
      select.appendChild(element);
    });
    select.value = value;
    select.addEventListener("change", function() {
      onInput(select.value);
    });
    wrapper.appendChild(select);
    return wrapper;
  }

  function refreshRoomSelect(state, dom) {
    dom.roomSelect.innerHTML = "";
    state.rooms.forEach(function(room, index) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = (index + 1) + ". " + room.name;
      dom.roomSelect.appendChild(option);
    });
    dom.roomSelect.value = String(state.roomIndex);
  }

  function renderRoomProperties(state, dom) {
    const room = state.rooms[state.roomIndex];
    dom.roomProperties.innerHTML = "<h2>Room</h2>";
    const grid = document.createElement("div");
    grid.className = "field-grid";
    grid.appendChild(createField("Name", room.name, function(value) {
      room.name = value;
      refreshRoomSelect(state, dom);
      draw(state, dom);
    }, { type: "text", wide: true }));
    grid.appendChild(createField("ID", room.id, function(value) {
      room.id = value;
    }, { type: "text", wide: true }));
    grid.appendChild(createField("Tip", room.tip, function(value) {
      room.tip = value;
    }, { textarea: true, wide: true }));
    grid.appendChild(createField("Par time", room.parTime, function(value) {
      room.parTime = value;
    }, { step: 1 }));
    grid.appendChild(createField("Par flips", room.parFlips, function(value) {
      room.parFlips = value;
    }, { step: 1 }));
    grid.appendChild(createField("Par deaths", room.parDeaths, function(value) {
      room.parDeaths = value;
    }, { step: 1 }));
    grid.appendChild(createSelectField("Chase", room.chase ? (room.chase === true ? "default" : "custom") : "none", [
      { value: "none", label: "None" },
      { value: "default", label: "Default" },
      { value: "custom", label: "Custom" }
    ], function(value) {
      if (value === "none") room.chase = false;
      else if (value === "default") room.chase = true;
      else room.chase = { startX: -180, baseSpeed: 92, rampPerSecond: 10, killOffset: 88 };
      renderRoomProperties(state, dom);
      draw(state, dom);
    }));

    if (room.chase && room.chase !== true) {
      ["startX", "baseSpeed", "rampPerSecond", "killOffset"].forEach(function(key) {
        grid.appendChild(createField("Chase " + key, room.chase[key], function(value) {
          room.chase[key] = value;
          draw(state, dom);
        }, { step: 1 }));
      });
    }

    grid.appendChild(createField("Locks JSON", JSON.stringify(room.locks, null, 2), function(value) {
      try {
        const locks = JSON.parse(value || "[]");
        if (Array.isArray(locks)) room.locks = locks;
        setStatus(dom, "Room locks updated.");
      } catch (error) {
        setStatus(dom, "Locks JSON is not valid yet.");
      }
    }, { textarea: true, wide: true }));
    dom.roomProperties.appendChild(grid);
  }

  function appendNumberField(grid, label, item, key, state, dom, step) {
    grid.appendChild(createField(label, item[key], function(value) {
      item[key] = value;
      draw(state, dom);
    }, { step: step || 1 }));
  }

  function appendTextField(grid, label, item, key) {
    grid.appendChild(createField(label, item[key], function(value) {
      item[key] = value || null;
    }, { type: "text" }));
  }

  function renderSelectionProperties(state, dom) {
    const selected = getSelectionItem(state);
    dom.selectionProperties.innerHTML = "<h2>Selection</h2>";
    if (!selected) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Select or place an item to edit its properties.";
      dom.selectionProperties.appendChild(empty);
      return;
    }

    const title = document.createElement("p");
    title.className = "empty-state";
    title.textContent = selected.label;
    dom.selectionProperties.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "field-grid";
    const item = selected.item;
    appendNumberField(grid, "X", item, "x", state, dom);
    if (selected.kind !== "gate") appendNumberField(grid, "Y", item, "y", state, dom);
    if (selected.resizable && selected.kind !== "gate") {
      appendNumberField(grid, "Width", item, "w", state, dom);
      appendNumberField(grid, "Height", item, "h", state, dom);
    }
    if (selected.kind === "gate") {
      appendNumberField(grid, "Width", item, "w", state, dom);
      appendTextField(grid, "ID", item, "id");
      appendNumberField(grid, "Shards", item, "shards", state, dom);
      appendTextField(grid, "Lock ID", item, "lockId");
    }
    if (selected.kind === "spike") {
      grid.appendChild(createSelectField("Direction", String(item.dir), [
        { value: "-1", label: "Floor" },
        { value: "1", label: "Ceiling" }
      ], function(value) {
        item.dir = Number(value);
        draw(state, dom);
      }));
    }
    if (selected.kind === "flipBattery" || selected.kind === "jumpBattery") {
      appendNumberField(grid, "Amount", item, "amount", state, dom);
    }
    if (selected.kind === "patrolEnemy" || selected.kind === "hunterEnemy") {
      appendNumberField(grid, "Speed", item, "speed", state, dom);
      appendNumberField(grid, "VX", item, "vx", state, dom);
      appendNumberField(grid, "VY", item, "vy", state, dom);
      grid.appendChild(createSelectField("Axis", item.axis || "x", [
        { value: "x", label: "X" },
        { value: "y", label: "Y" }
      ], function(value) {
        item.axis = value;
      }));
    }
    if (selected.kind === "mover") {
      grid.appendChild(createSelectField("Axis", item.axis || "x", [
        { value: "x", label: "X" },
        { value: "y", label: "Y" }
      ], function(value) {
        item.axis = value;
      }));
      appendNumberField(grid, "Range", item, "range", state, dom);
      appendNumberField(grid, "Speed", item, "speed", state, dom);
    }
    if (selected.kind === "sentry") {
      grid.appendChild(createSelectField("Axis", item.axis || "x", [
        { value: "x", label: "X" },
        { value: "y", label: "Y" }
      ], function(value) {
        item.axis = value;
        draw(state, dom);
      }));
      grid.appendChild(createSelectField("Direction", String(item.dir || 1), [
        { value: "1", label: "Positive" },
        { value: "-1", label: "Negative" }
      ], function(value) {
        item.dir = Number(value);
        draw(state, dom);
      }));
      ["length", "thickness", "period", "activeTime", "phase"].forEach(function(key) {
        appendNumberField(grid, key, item, key, state, dom, key === "period" || key === "activeTime" || key === "phase" ? 0.05 : 1);
      });
    }
    dom.selectionProperties.appendChild(grid);
  }

  function setStatus(dom, message) {
    dom.statusLine.textContent = message || "";
  }

  function hideErrors(dom) {
    dom.errorPanel.classList.add("is-hidden");
    dom.errorList.innerHTML = "";
  }

  function showErrors(dom, errors) {
    dom.errorList.innerHTML = "";
    errors.forEach(function(error) {
      const item = document.createElement("li");
      item.textContent = error;
      dom.errorList.appendChild(item);
    });
    dom.errorPanel.classList.remove("is-hidden");
  }

  function showExport(dom, message, source) {
    dom.exportMessage.textContent = message;
    dom.exportOutput.value = source;
    dom.exportPanel.classList.remove("is-hidden");
  }

  function validateRooms(state, dom) {
    try {
      ns.validateAndNormalizeRooms(state.rooms);
      hideErrors(dom);
      return true;
    } catch (error) {
      showErrors(dom, [error.message]);
      setStatus(dom, "Validation failed.");
      return false;
    }
  }

  function draw(state, dom) {
    renderEditor(dom.ctx, state);
  }

  async function openRoomsFile(state, dom) {
    if (!window.showOpenFilePicker) {
      showExport(dom, "Chrome file access is unavailable here. Use the exported text as a fallback.", serializeRooms(state.rooms));
      return;
    }
    try {
      const handles = await window.showOpenFilePicker({
        multiple: false,
        types: [{ description: "Gravity Locksmith rooms", accept: { "text/javascript": [".js"] } }]
      });
      const handle = handles[0];
      const file = await handle.getFile();
      const text = await file.text();
      const rooms = parseRoomsSource(text);
      ns.validateAndNormalizeRooms(rooms);
      state.fileHandle = handle;
      state.sourceRooms = deepClone(rooms);
      state.rooms = deepClone(rooms);
      state.roomIndex = 0;
      state.selected = null;
      refreshAll(state, dom);
      setStatus(dom, "Loaded " + file.name + ".");
    } catch (error) {
      showErrors(dom, [error.message]);
      showExport(dom, "Open failed. Current editor data is still available below.", serializeRooms(state.rooms));
    }
  }

  async function saveRoomsFile(state, dom) {
    const source = serializeRooms(state.rooms);
    if (!validateRooms(state, dom)) return;
    if (!window.showSaveFilePicker && !state.fileHandle) {
      showExport(dom, "Chrome file saving is unavailable here. Use this replacement text for js/rooms.js.", source);
      return;
    }
    try {
      let handle = state.fileHandle;
      if (!handle) {
        handle = await window.showSaveFilePicker({
          suggestedName: "rooms.js",
          types: [{ description: "JavaScript", accept: { "text/javascript": [".js"] } }]
        });
        state.fileHandle = handle;
      }
      const writable = await handle.createWritable();
      await writable.write(source);
      await writable.close();
      state.sourceRooms = deepClone(state.rooms);
      setStatus(dom, "Saved rooms.js.");
      hideErrors(dom);
    } catch (error) {
      showErrors(dom, [error.message]);
      showExport(dom, "Save failed. Use this replacement text for js/rooms.js.", source);
    }
  }

  function refreshAll(state, dom) {
    refreshRoomSelect(state, dom);
    renderRoomProperties(state, dom);
    renderSelectionProperties(state, dom);
    draw(state, dom);
  }

  function addItemAtPoint(state, dom, point) {
    const room = state.rooms[state.roomIndex];
    const kind = state.tool;
    if (kind === "spawn") {
      room.spawn = { x: snapValue(point.x, state), y: snapValue(point.y, state) };
      state.selected = { kind: "spawn", singleton: true };
    } else if (kind === "exit") {
      room.exit = { x: snapValue(point.x, state), y: snapValue(point.y, state), w: 84, h: 140 };
      state.selected = { kind: "exit", singleton: true };
    } else {
      const collection = COLLECTIONS[kind];
      const item = createItem(kind, point, room, state);
      room[collection].push(item);
      state.selected = { kind: kind, collection: collection, index: room[collection].length - 1 };
    }
    renderSelectionProperties(state, dom);
    draw(state, dom);
    setStatus(dom, ITEM_LABELS[kind] + " placed.");
  }

  function deleteItemAtPoint(state, dom, point) {
    const room = state.rooms[state.roomIndex];
    const hit = getHitItem(room, point);
    if (!hit) {
      setStatus(dom, "Nothing to delete.");
      return;
    }
    if (hit.singleton) {
      setStatus(dom, hit.label + " is required. Move it instead.");
      state.selected = { kind: hit.kind, singleton: true };
      renderSelectionProperties(state, dom);
      draw(state, dom);
      return;
    }
    room[hit.collection].splice(hit.index, 1);
    state.selected = null;
    renderSelectionProperties(state, dom);
    draw(state, dom);
    setStatus(dom, hit.label + " deleted.");
  }

  function bindEvents(state, dom) {
    dom.roomSelect.addEventListener("change", function() {
      state.roomIndex = Number(dom.roomSelect.value);
      state.selected = null;
      refreshAll(state, dom);
      setStatus(dom, "Room loaded.");
    });
    dom.itemSelect.addEventListener("change", function() {
      state.tool = dom.itemSelect.value;
      setStatus(dom, ITEM_LABELS[state.tool] + " tool selected.");
    });
    dom.snapToggle.addEventListener("change", function() {
      state.snap = dom.snapToggle.checked;
      setStatus(dom, state.snap ? "Snap enabled." : "Snap disabled.");
    });
    dom.gridSize.addEventListener("input", function() {
      state.grid = clamp(Number(dom.gridSize.value) || 24, 4, 128);
      draw(state, dom);
    });
    dom.newRoomBtn.addEventListener("click", function() {
      state.rooms.push(createDefaultRoom(state.rooms.length + 1));
      state.roomIndex = state.rooms.length - 1;
      state.selected = null;
      refreshAll(state, dom);
      setStatus(dom, "New level created.");
    });
    dom.resetRoomBtn.addEventListener("click", function() {
      state.rooms[state.roomIndex] = state.sourceRooms[state.roomIndex]
        ? deepClone(state.sourceRooms[state.roomIndex])
        : createDefaultRoom(state.roomIndex + 1);
      state.selected = null;
      refreshAll(state, dom);
      setStatus(dom, "Room reset from source.");
    });
    dom.openFileBtn.addEventListener("click", function() {
      openRoomsFile(state, dom);
    });
    dom.saveFileBtn.addEventListener("click", function() {
      saveRoomsFile(state, dom);
    });
    dom.exportBtn.addEventListener("click", function() {
      const source = serializeRooms(state.rooms);
      validateRooms(state, dom);
      showExport(dom, "Current editor data exported as a replacement rooms.js file.", source);
      setStatus(dom, "Export generated.");
    });

    dom.canvas.addEventListener("contextmenu", function(event) {
      event.preventDefault();
      deleteItemAtPoint(state, dom, getCanvasPoint(dom.canvas, event));
    });
    dom.canvas.addEventListener("pointerdown", function(event) {
      if (event.button !== 0) return;
      const point = getCanvasPoint(dom.canvas, event);
      const room = state.rooms[state.roomIndex];
      const selected = getSelectionItem(state);
      if (selected && selected.resizable && pointInRect(point, getResizeHandleRect(selected))) {
        state.drag = { mode: "resize" };
        dom.canvas.setPointerCapture(event.pointerId);
        return;
      }

      const hit = getHitItem(room, point);
      if (hit) {
        state.selected = hit.singleton
          ? { kind: hit.kind, singleton: true }
          : { kind: hit.kind, collection: hit.collection, index: hit.index };
        state.drag = { mode: "move", offset: { x: point.x - hit.rect.x, y: point.y - hit.rect.y } };
        renderSelectionProperties(state, dom);
        draw(state, dom);
        dom.canvas.setPointerCapture(event.pointerId);
        return;
      }

      addItemAtPoint(state, dom, point);
      const placed = getSelectionItem(state);
      if (placed) {
        state.drag = { mode: "move", offset: { x: placed.rect.w / 2, y: placed.rect.h / 2 } };
        dom.canvas.setPointerCapture(event.pointerId);
      }
    });
    dom.canvas.addEventListener("pointermove", function(event) {
      if (!state.drag) return;
      const selected = getSelectionItem(state);
      if (!selected) return;
      const point = getCanvasPoint(dom.canvas, event);
      if (state.drag.mode === "move") moveSelected(selected, point, state.drag.offset, state);
      if (state.drag.mode === "resize") resizeSelected(selected, point, state);
      renderSelectionProperties(state, dom);
      draw(state, dom);
    });
    dom.canvas.addEventListener("pointerup", function(event) {
      state.drag = null;
      if (dom.canvas.hasPointerCapture && dom.canvas.hasPointerCapture(event.pointerId)) {
        dom.canvas.releasePointerCapture(event.pointerId);
      }
    });
    window.addEventListener("resize", function() {
      draw(state, dom);
    });
  }

  function init() {
    const canvas = document.getElementById("editor-canvas");
    if (!canvas) return null;
    const rooms = (ns.ROOM_DEFINITIONS || []).map(normalizeRoomForEditing);
    const state = {
      sourceRooms: deepClone(rooms),
      rooms: deepClone(rooms),
      roomIndex: 0,
      selected: null,
      tool: "platform",
      snap: true,
      grid: 24,
      drag: null,
      fileHandle: null
    };
    const dom = {
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      roomSelect: document.getElementById("room-select"),
      itemSelect: document.getElementById("item-select"),
      newRoomBtn: document.getElementById("new-room-btn"),
      resetRoomBtn: document.getElementById("reset-room-btn"),
      openFileBtn: document.getElementById("open-file-btn"),
      saveFileBtn: document.getElementById("save-file-btn"),
      exportBtn: document.getElementById("export-btn"),
      snapToggle: document.getElementById("snap-toggle"),
      gridSize: document.getElementById("grid-size"),
      statusLine: document.getElementById("status-line"),
      roomProperties: document.getElementById("room-properties"),
      selectionProperties: document.getElementById("selection-properties"),
      exportPanel: document.getElementById("export-panel"),
      exportMessage: document.getElementById("export-message"),
      exportOutput: document.getElementById("export-output"),
      errorPanel: document.getElementById("error-panel"),
      errorList: document.getElementById("error-list")
    };

    bindEvents(state, dom);
    refreshAll(state, dom);
    setStatus(dom, "Ready.");
    window.gravityLocksmithLevelEditor = { state: state, dom: dom };
    return state;
  }

  ns.LevelEditor = {
    createDefaultRoom: createDefaultRoom,
    normalizeRoomForEditing: normalizeRoomForEditing,
    parseRoomsSource: parseRoomsSource,
    serializeRooms: serializeRooms,
    getRoomItems: getRoomItems,
    init: init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.GravityLocksmith);
