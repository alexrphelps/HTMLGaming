(function(D) {
  with (D) {
  function spawnEnemyPack(room, rng, mult = 1) {
    const p = game.player;
    const depth = Math.abs(room.x) + Math.abs(room.y) + p.bossesKilled * 4 + p.roomClears * 0.18;
    const base = 3 + Math.floor(depth * 0.28) + Math.floor(rng() * 3);
    const count = Math.ceil(base * mult * game.personality.enemyMult);
    const types = ["ratling", "archer", "slime", "bomber"];
    if (depth > 3) types.push("guard", "pod");
    if (depth > 6 || game.personality.id === "mirror") types.push("wraith");
    if (depth > 8 || game.personality.id === "clockwork") types.push("turretSkull");
    if (depth > 10) types.push("cultist");
    const spawns = room.spawnPoints && room.spawnPoints.length ? room.spawnPoints : buildRoomSpawnPoints(room);
    for (let i = 0; i < count; i++) {
      let point = null, tries = 0;
      do {
        point = pick(rng, spawns);
        tries++;
      } while (point && game.enemies.some(e => dist(e.x, e.y, point.x, point.y) < e.r + 34) && tries < 60);
      if (!point) {
        point = findNearestReachablePoint(room, randRange(rng, 120, ROOM_W - 120), randRange(rng, 110, ROOM_H - 110));
      }
      const t = pick(rng, types);
      spawnEnemy(t, point.x, point.y, depth, room.type === "elite" || (room.type === "cursed" && chance(rng, .25)), rng);
    }
  }

  function enemyRoleFor(type, base) {
    if (base.turret) return "turret";
    if (base.pod) return "zone";
    if (base.shoot || base.buff) return "ranged";
    if (base.explode) return "bomber";
    if (base.shield) return "guard";
    if (base.phase) return "phase";
    if (type === "boss") return "boss";
    return "melee";
  }

  function enemyDesiredRange(role) {
    return { ranged: 310, zone: 360, turret: 480, guard: 120, bomber: 52, phase: 76, boss: 180 }[role] || 42;
  }

  function spawnEnemy(type, x, y, depth = 1, elite = false, rng = game.rng) {
    const scale = 1 + depth * 0.055 + (elite ? 0.65 : 0);
    const base = {
      ratling: { hp: 3.2, r: 13, speed: 95, damage: 1, color: "#ff7a8a", xp: 3, coin: .42 },
      archer: { hp: 3.8, r: 14, speed: 62, damage: 1, color: "#ffc857", xp: 4, coin: .48, shoot: 1.5 },
      slime: { hp: 4.6, r: 16, speed: 50, damage: 1, color: "#63ff9d", xp: 4, coin: .40, split: true },
      bomber: { hp: 2.8, r: 12, speed: 115, damage: 2, color: "#ff9f1c", xp: 4, coin: .5, explode: true },
      guard: { hp: 7.5, r: 17, speed: 48, damage: 1, color: "#b5c7ff", xp: 6, coin: .55, shield: true },
      wraith: { hp: 4.4, r: 15, speed: 84, damage: 1, color: "#c084fc", xp: 6, coin: .52, phase: true },
      pod: { hp: 6.3, r: 18, speed: 18, damage: 1, color: "#70e000", xp: 6, coin: .48, pod: true },
      turretSkull: { hp: 6.8, r: 16, speed: 0, damage: 1, color: "#7df9ff", xp: 7, coin: .58, shoot: 1.0, turret: true },
      cultist: { hp: 5.2, r: 15, speed: 54, damage: 1, color: "#ff4dbe", xp: 8, coin: .62, buff: true, shoot: 1.8 },
      boss: { hp: 70, r: 34, speed: 58, damage: 1, color: "#ff5577", xp: 40, coin: 8, shoot: 1.2 },
    }[type];
    const role = enemyRoleFor(type, base);
    const e = {
      type, x, y, vx: 0, vy: 0,
      hp: base.hp * scale,
      maxHp: base.hp * scale,
      r: base.r * (elite ? 1.18 : 1),
      speed: base.speed * (elite ? 1.12 : 1) * (1 + depth * 0.01),
      damage: base.damage,
      color: elite ? "#ffffff" : base.color,
      baseColor: base.color,
      elite,
      xp: base.xp * (elite ? 2 : 1),
      coin: base.coin * (elite ? 2.2 : 1),
      shootCd: base.shoot ? rng() * base.shoot : 999,
      shootEvery: base.shoot || 999,
      status: { burn: 0, poison: 0, freeze: 0, stun: 0 },
      flags: base,
      aiTime: rng() * 10,
      role,
      path: [],
      pathTarget: null,
      pathTimer: rng() * 0.18,
      waypointIndex: 0,
      desiredRange: enemyDesiredRange(role),
      lastSeenPlayer: { x: x, y: y, time: 0 },
      stuckTimer: 0,
      lastX: x,
      lastY: y,
      boss: false,
    };
    game.enemies.push(e);
    return e;
  }

  function createBoss(room, rng) {
    const index = game.player.bossesKilled;
    const list = ["Bone Warden", "Eye of the Maze", "Furnace Saint", "Tax Collector", "Infinite Hand"];
    const name = list[index % list.length];
    const depth = Math.max(8, game.depth + index * 5);
    const b = spawnEnemy("boss", ROOM_W / 2, ROOM_H / 2 - 80, depth, true);
    b.boss = true;
    b.bossName = name;
    b.phase = 0;
    b.pattern = 0;
    b.aiTime = 0;
    b.shootCd = 1.2;
    b.summonCd = 3.0;
    b.r = name === "Infinite Hand" ? 42 : 34;
    b.hp = b.maxHp = (70 + index * 42 + game.depth * 8) * (game.personality.id === "royal" ? 1.22 : 1);
    b.speed = name === "Furnace Saint" ? 48 : 62;
    b.color = {
      "Bone Warden": "#e7eefc",
      "Eye of the Maze": "#c084fc",
      "Furnace Saint": "#ff5d22",
      "Tax Collector": "#ffd166",
      "Infinite Hand": "#9a7bff",
    }[name];
    b.xp = 40 + index * 15;
    b.coin = 8 + index * 3;
    notify(`Boss Gate: ${name}`, "#ff5577", 3.4);
    if (typeof tone === "function") tone(70, .24, "sawtooth", .05);
  }

  function deployRoomTech() {
    rebuildDrones();
    game.turrets.length = 0;
    const room = currentRoom();
    if (!room || room.cleared || !["combat", "elite", "cursed", "boss"].includes(room.type)) return;
    const n = game.player.stats.turrets;
    for (let i = 0; i < n; i++) {
      const ang = (i / Math.max(1, n)) * TAU;
      game.turrets.push({ x: ROOM_W / 2 + Math.cos(ang) * 90, y: ROOM_H / 2 + Math.sin(ang) * 70, r: 15, cd: .4 + i * .16, hp: 999 });
    }
  }

  function rebuildDrones() {
    const need = game.player.stats.drones;
    while (game.drones.length < need) game.drones.push({ angle: game.drones.length * 2.1, cd: .35, r: 10 });
    while (game.drones.length > need) game.drones.pop();
  }

  function spawnPickupBurst(x, y, n, type = "coin") {
    for (let i = 0; i < n; i++) {
      const a = game.rng() * TAU, sp = randRange(game.rng, 55, 170);
      game.pickups.push({ type, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: type === "xp" ? 5 : 6, value: 1, life: 999 });
    }
    if (typeof trimVolatileArray === "function" && typeof VOLATILE_LIMITS === "object") trimVolatileArray(game.pickups, VOLATILE_LIMITS.pickups);
  }

  function particle(x, y, color, speed = 100, life = .35, size = 3) {
    const a = Math.random() * TAU;
    const sp = Math.random() * speed;
    game.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, color, life, maxLife: life, size });
    if (typeof trimVolatileArray === "function" && typeof VOLATILE_LIMITS === "object") trimVolatileArray(game.particles, VOLATILE_LIMITS.particles);
  }
  function burst(x, y, n, color, speed = 160) {
    for (let i=0;i<n;i++) particle(x, y, color, speed, randRange(game.rng, .25, .7), randRange(game.rng, 2, 5));
  }
  function lightningLine(x1, y1, x2, y2) {
    game.particles.push({ x: x1, y: y1, x2, y2, vx: 0, vy: 0, color: "#7df9ff", life: .12, maxLife: .12, size: 2, line: true });
    if (typeof trimVolatileArray === "function" && typeof VOLATILE_LIMITS === "object") trimVolatileArray(game.particles, VOLATILE_LIMITS.particles);
  }
  function addDamageText(x, y, text, color) {
    game.damageTexts.push({ x, y, text, color, life: .55, maxLife: .55 });
    if (typeof trimVolatileArray === "function" && typeof VOLATILE_LIMITS === "object") trimVolatileArray(game.damageTexts, VOLATILE_LIMITS.damageTexts);
  }

    Object.assign(D, {
      spawnEnemyPack,
      enemyRoleFor,
      enemyDesiredRange,
      spawnEnemy,
      createBoss,
      deployRoomTech,
      rebuildDrones,
      spawnPickupBurst,
      particle,
      burst,
      lightningLine,
      addDamageText
    });
  }
})(window.Depthbound = window.Depthbound || {});
