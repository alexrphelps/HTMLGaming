(function(D) {
  with (D) {
  function parentDirFor(x, y) {
    if (x === 0 && y === 0) return null;
    if (Math.abs(x) >= Math.abs(y) && x !== 0) return x > 0 ? "W" : "E";
    return y > 0 ? "N" : "S";
  }

  function isParentEdge(x, y, dir) {
    return parentDirFor(x, y) === dir;
  }

  function hasDoor(x, y, dirName) {
    if (x === 0 && y === 0) return true;
    const d = DIRS.find(v => v.name === dirName);
    const nx = x + d.dx, ny = y + d.dy;
    if (isParentEdge(x, y, dirName)) return true;
    if (isParentEdge(nx, ny, OPP[dirName])) return true;
    const ax = Math.min(x, nx), ay = Math.min(y, ny);
    const orient = dirName === "E" || dirName === "W" ? "V" : "H";
    const rng = seeded(game.seed, ax, ay, `edge:${orient}`);
    return rng() < 0.42;
  }

  function getExits(x, y) {
    return DIRS.filter(d => hasDoor(x, y, d.name)).map(d => d.name);
  }

  function peekRoomType(x, y) {
    const key = roomKey(x, y);
    if (game.rooms.has(key)) return game.rooms.get(key).type;
    if (game.roomTypePreview.has(key)) return game.roomTypePreview.get(key);
    const type = chooseRoomType(x, y, false);
    game.roomTypePreview.set(key, type);
    return type;
  }

  function chooseRoomType(x, y, entering = true) {
    if (x === 0 && y === 0) return "start";
    if (entering && game.bossMeter >= game.bossMeterMax) return "boss";
    const rng = seeded(game.seed, x, y, "type");
    const d = Math.abs(x) + Math.abs(y);
    let eliteBonus = game.personality.id === "royal" ? 0.06 : 0;
    let treasureBonus = game.personality.id === "royal" ? 0.04 : 0;
    let curseBonus = game.personality.id === "abyssal" ? 0.05 : 0;
    let r = rng();
    if (d < 2) return r < 0.70 ? "combat" : (r < 0.85 ? "treasure" : "shrine");
    if (r < 0.42) return "combat";
    if (r < 0.52 + eliteBonus) return "elite";
    if (r < 0.62 + treasureBonus) return "treasure";
    if (r < 0.72) return "shrine";
    if (r < 0.80) return "shop";
    if (r < 0.87 + curseBonus) return "cursed";
    if (r < 0.93) return "forge";
    if (r < 0.985) return "rest";
    return "secret";
  }

  function makeRoom(x, y, forcedType = null) {
    const key = roomKey(x, y);
    if (game.rooms.has(key)) return game.rooms.get(key);
    let type = forcedType || chooseRoomType(x, y, true);
    if (forcedType !== "start" && game.bossMeter >= game.bossMeterMax) type = "boss";
    game.roomTypePreview.delete(key);
    const rng = seeded(game.seed, x, y, `room:${type}`);
    const exits = getExits(x, y);
    const room = {
      x, y, key, type, exits,
      visited: false,
      discovered: false,
      cleared: type === "start" || type === "treasure" || type === "shop" || type === "shrine" || type === "forge" || type === "rest" || type === "secret",
      locked: false,
      opened: false,
      obstacles: generateObstacles(rng, type, exits),
      navGrid: null,
      doorZones: typeof buildRoomDoorZones === "function" ? buildRoomDoorZones(exits) : [],
      reservedLanes: typeof buildRoomReservedLanes === "function" ? buildRoomReservedLanes(exits) : [],
      spawnPoints: [],
      validated: false,
      interactables: [],
      flavor: "",
      color: roomColor(type),
      danger: 0,
    };
    if (typeof validateRoomNavigation === "function") validateRoomNavigation(room);
    addRoomInteractables(room, rng);
    game.rooms.set(key, room);
    return room;
  }

  function roomColor(type) {
    return {
      start: "#7df9ff", combat: "#d9e2ff", elite: "#ff5577", boss: "#ff2d55",
      treasure: "#ffd166", shrine: "#c084fc", shop: "#63ff9d", cursed: "#a855f7",
      forge: "#ff9f1c", rest: "#8bd3ff", secret: "#f2f7ff"
    }[type] || "#d9e2ff";
  }

  function generateObstacles(rng, type, exits) {
    const obs = [];
    const pattern = Math.floor(rng() * 9);
    const lanes = typeof buildRoomReservedLanes === "function" ? buildRoomReservedLanes(exits) : [];
    const pushRect = (gx, gy, gw, gh, kind = "wall") => {
      const x = gx * TILE, y = gy * TILE, w = gw * TILE, h = gh * TILE;
      if (x < 120 || y < 100 || x + w > ROOM_W - 120 || y + h > ROOM_H - 100) return;
      if (Math.abs((x + w / 2) - ROOM_W / 2) < 75 && Math.abs((y + h / 2) - ROOM_H / 2) < 75) return;
      if (typeof rectTouchesReserved === "function" && rectTouchesReserved({ x, y, w, h }, lanes, 8)) return;
      obs.push({ x, y, w, h, kind });
    };

    if (type === "boss") {
      pushRect(5, 4, 2, 2, "pillar");
      pushRect(19, 4, 2, 2, "pillar");
      pushRect(5, 11, 2, 2, "pillar");
      pushRect(19, 11, 2, 2, "pillar");
      return obs;
    }

    if (pattern === 0) { // pillars
      for (let gx of [6, 12, 18]) for (let gy of [5, 10]) pushRect(gx, gy, 1, 1, "pillar");
    } else if (pattern === 1) { // cross
      pushRect(11, 5, 4, 1); pushRect(11, 11, 4, 1); pushRect(8, 8, 2, 1); pushRect(17, 8, 2, 1);
    } else if (pattern === 2) { // barricades
      pushRect(5, 5, 5, 1); pushRect(16, 11, 5, 1); pushRect(12, 8, 2, 2);
    } else if (pattern === 3) { // maze ribs
      pushRect(5, 4, 1, 8); pushRect(10, 6, 1, 8); pushRect(15, 3, 1, 8); pushRect(20, 6, 1, 7);
    } else if (pattern === 4) { // island
      pushRect(10, 6, 6, 4, "altar");
    } else if (pattern === 5) { // split chamber
      pushRect(12, 3, 2, 5); pushRect(12, 11, 2, 4);
    } else if (pattern === 6) { // random blocks
      for (let i = 0; i < 8; i++) pushRect(3 + Math.floor(rng() * 20), 3 + Math.floor(rng() * 11), 1 + Math.floor(rng() * 2), 1);
    } else if (pattern === 7) { // trap lanes
      pushRect(6, 7, 4, 1, "lowwall"); pushRect(16, 9, 4, 1, "lowwall");
    } else { // spiral-ish
      pushRect(7, 4, 11, 1); pushRect(17, 5, 1, 6); pushRect(8, 11, 10, 1); pushRect(8, 7, 1, 4);
    }

    if (type === "shop" || type === "treasure" || type === "shrine" || type === "forge" || type === "rest") {
      return obs.filter(o => rng() < 0.35);
    }
    return obs;
  }

  function addRoomInteractables(room, rng) {
    const center = { x: ROOM_W / 2, y: ROOM_H / 2 };
    if (room.type === "start") {
      room.interactables.push({ type: "gate", x: center.x, y: center.y, r: 34, used: false, label: "Enter Dungeon" });
      room.interactables.push({ type: "lore", x: center.x, y: center.y - 92, r: 24, used: false, label: "Open Codex" });
      room.flavor = "Press F on the gate, or walk through a door, to begin the run.";
    } else if (room.type === "treasure") {
      room.interactables.push({ type: "chest", x: center.x, y: center.y, r: 26, used: false, locked: chance(rng, 0.45), rarity: chance(rng, .18) ? "rare" : "normal", label: "Chest" });
      room.flavor = "A prize hums beneath the dust.";
    } else if (room.type === "shrine") {
      room.interactables.push({ type: "shrine", x: center.x, y: center.y, r: 30, used: false, label: "Talent Shrine" });
      room.flavor = "A shrine offers a shape for your violence.";
    } else if (room.type === "shop") {
      room.interactables.push({ type: "shop", x: center.x, y: center.y, r: 34, used: false, label: "Shopkeeper" });
      room.flavor = "A merchant survives where maps fail.";
    } else if (room.type === "cursed") {
      room.interactables.push({ type: "curse", x: center.x, y: center.y, r: 30, used: false, label: "Cursed Bargain" });
      room.flavor = "The floor whispers in interest rates.";
    } else if (room.type === "forge") {
      room.interactables.push({ type: "forge", x: center.x, y: center.y, r: 32, used: false, label: "Forge" });
      room.flavor = "An anvil burns without fuel.";
    } else if (room.type === "rest") {
      room.interactables.push({ type: "rest", x: center.x, y: center.y, r: 32, used: false, label: "Rest Well" });
      room.flavor = "Still water in a moving dungeon.";
    } else if (room.type === "secret") {
      room.interactables.push({ type: "secret", x: center.x, y: center.y, r: 32, used: false, label: "Secret Vault" });
      room.flavor = "The dungeon forgot to hide this properly.";
    }
  }

  function currentRoom() { return game.rooms.get(roomKey(game.roomX, game.roomY)); }

  function enterRoom(x, y, fromDir) {
    const room = makeRoom(x, y);
    game.roomX = x;
    game.roomY = y;
    game.depth = Math.max(game.depth, Math.abs(x) + Math.abs(y) + game.player.bossesKilled * 5);
    game.roomStack.push(room.key);
    if (!room.visited) {
      game.statistics.roomsVisited++;
      room.visited = true;
      room.discovered = true;
      revealAdjacent(x, y);
      setupRoom(room);
      notify(`${titleCase(room.type)} Room`, room.color, 2.0);
    } else {
      setupVisitedRoom(room);
    }
    const spawn = typeof getDoorSpawnPoint === "function" ? getDoorSpawnPoint(fromDir) : { x: ROOM_W / 2, y: ROOM_H / 2 };
    game.player.x = spawn.x;
    game.player.y = spawn.y;
    game.bullets.length = 0;
    game.enemyBullets.length = 0;
    game.hazards.length = 0;
    game.mines.length = 0;
    game.transitionGrace = 0.22;
    deployRoomTech();
  }

  function revealAdjacent(x, y) {
    for (const d of DIRS) {
      if (hasDoor(x, y, d.name)) {
        const k = roomKey(x + d.dx, y + d.dy);
        const existing = game.rooms.get(k);
        if (existing) existing.discovered = true;
        else peekRoomType(x + d.dx, y + d.dy);
      }
    }
  }

  function setupVisitedRoom(room) {
    game.enemies.length = 0;
    game.pickups.length = 0;
    room.locked = false;
  }

  function setupRoom(room) {
    game.enemies.length = 0;
    game.pickups.length = 0;
    const rng = seeded(game.seed, room.x, room.y, `spawn:${room.type}`);
    if (["combat", "elite", "cursed"].includes(room.type)) {
      room.locked = true;
      spawnEnemyPack(room, rng, room.type === "elite" ? 1.65 : room.type === "cursed" ? 1.30 : 1.0);
      if (room.type === "elite") game.statistics.elites++;
      if (room.type === "cursed") room.interactables.unshift({ type: "curse", x: ROOM_W / 2, y: 90, r: 28, used: false, label: "Pre-fight Bargain" });
      addPersonalityHazards(room, rng);
    } else if (room.type === "boss") {
      room.locked = true;
      createBoss(room, rng);
      addPersonalityHazards(room, rng, true);
    } else {
      room.locked = false;
    }
  }

  function addPersonalityHazards(room, rng, boss = false) {
    const n = boss ? 6 : 2 + Math.floor(rng() * 4);
    if (game.personality.hazard === "spores") {
      for (let i = 0; i < n; i++) game.hazards.push({ type: "poison", x: randRange(rng, 140, ROOM_W - 140), y: randRange(rng, 120, ROOM_H - 120), r: 34, ttl: 999, pulse: rng() * TAU, dmg: 0.6 });
    } else if (game.personality.hazard === "gear") {
      for (let i = 0; i < n; i++) game.hazards.push({ type: "gear", x: randRange(rng, 150, ROOM_W - 150), y: randRange(rng, 120, ROOM_H - 120), r: 22, ttl: 999, pulse: rng() * TAU, dmg: 1.0 });
    } else if (game.personality.hazard === "mirror") {
      for (let i = 0; i < Math.ceil(n / 2); i++) game.hazards.push({ type: "mirror", x: randRange(rng, 150, ROOM_W - 150), y: randRange(rng, 120, ROOM_H - 120), r: 28, ttl: 999, pulse: rng() * TAU, dmg: 0 });
    } else if (game.personality.hazard === "void") {
      for (let i = 0; i < Math.ceil(n / 2); i++) game.hazards.push({ type: "void", x: randRange(rng, 160, ROOM_W - 160), y: randRange(rng, 130, ROOM_H - 130), r: 38, ttl: 999, pulse: rng() * TAU, dmg: 0.9 });
    }
  }

  function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    Object.assign(D, {
      parentDirFor,
      isParentEdge,
      hasDoor,
      getExits,
      peekRoomType,
      chooseRoomType,
      makeRoom,
      roomColor,
      generateObstacles,
      addRoomInteractables,
      currentRoom,
      enterRoom,
      revealAdjacent,
      setupVisitedRoom,
      setupRoom,
      addPersonalityHazards,
      titleCase
    });
  }
})(window.Depthbound = window.Depthbound || {});
