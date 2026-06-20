(function(D) {
  if (!Object.prototype.hasOwnProperty.call(D, "game")) D.game = null;
  with (D) {
  function defaultPlayer() {
    return {
      x: ROOM_W / 2,
      y: ROOM_H / 2,
      vx: 0,
      vy: 0,
      r: PLAYER_R,
      hp: 6,
      maxHp: 6,
      level: 1,
      xp: 0,
      xpNext: 22,
      coins: 0,
      keys: 1,
      score: 0,
      roomClears: 0,
      bossesKilled: 0,
      invuln: 0,
      dashTime: 0,
      dashCd: 0,
      dashCharges: 1,
      dashChargeTimer: 0,
      shootTimer: 0,
      interactCd: 0,
      qCd: 0,
      eCd: 0,
      branch: { Gunner: 0, Phantom: 0, Occult: 0, Engineer: 0, Alchemist: 0 },
      stats: {
        damage: 1,
        fireRate: 1,
        bulletSpeed: 1,
        bulletSize: 1,
        moveSpeed: 1,
        crit: 0.05,
        critDamage: 2,
        pierce: 0,
        ricochet: 0,
        spread: 0,
        projectiles: 1,
        backShot: false,
        split: false,
        wallSplit: false,
        homing: 0,
        explosive: 0,
        burn: 0,
        poison: 0,
        lightning: 0,
        freeze: 0,
        elementalReaction: false,
        dashDamage: 0,
        dashReload: false,
        dashIFrames: 0,
        nearMissSlow: false,
        magnet: 0,
        xpGain: 1,
        coinGain: 1,
        shopDiscount: 0,
        cursePower: 0,
        bossRelicBonus: 0,
        drones: 0,
        turrets: 0,
        mines: false,
        orbitals: 0,
        thorns: 0,
        healingOnClear: 0,
        glass: false,
        vampire: 0,
        chestLuck: 0,
        keyLuck: 0,
        restBoost: 0,
      },
      abilities: {
        q: null,
        e: null,
      },
      talents: [],
      relics: [],
      curses: [],
    };
  }

  function createRunState(baseSeed = Date.now() >>> 0, storage = localStorage) {
    const rng = mulberry32(baseSeed);
    const run = {
      seed: baseSeed,
      rng,
      started: true,
      paused: false,
      over: false,
      time: 0,
      roomX: 0,
      roomY: 0,
      rooms: new Map(),
      roomStack: [],
      roomTypePreview: new Map(),
      bullets: [],
      enemyBullets: [],
      enemies: [],
      pickups: [],
      particles: [],
      damageTexts: [],
      hazards: [],
      drones: [],
      turrets: [],
      mines: [],
      notifications: [],
      bossMeter: 0,
      bossMeterMax: 7,
      depth: 0,
      cameraShake: 0,
      flash: 0,
      offsetX: 0,
      offsetY: 0,
      mouseLocalX: ROOM_W / 2,
      mouseLocalY: ROOM_H / 2,
      transitionGrace: 0,
      personality: pick(rng, PERSONALITIES),
      player: defaultPlayer(),
      highScore: Number((storage && storage.getItem ? storage.getItem("depthboundHighScore") : 0) || 0),
      statistics: { roomsVisited: 0, elites: 0, secrets: 0, relics: 0, talents: 0 },
    };
    run.player.abilities.q = "Grenade";
    return run;
  }

  function setGame(nextGame) {
    game = nextGame;
    return game;
  }

  function getGame() {
    return game;
  }

function resetGame() {
    const baseSeed = Date.now() >>> 0;
    const rng = mulberry32(baseSeed);
    game = {
      seed: baseSeed,
      rng,
      started: true,
      paused: false,
      over: false,
      time: 0,
      roomX: 0,
      roomY: 0,
      rooms: new Map(),
      roomStack: [],
      roomTypePreview: new Map(),
      bullets: [],
      enemyBullets: [],
      enemies: [],
      pickups: [],
      particles: [],
      damageTexts: [],
      hazards: [],
      drones: [],
      turrets: [],
      mines: [],
      notifications: [],
      bossMeter: 0,
      bossMeterMax: 7,
      depth: 0,
      cameraShake: 0,
      flash: 0,
      offsetX: 0,
      offsetY: 0,
      mouseLocalX: ROOM_W / 2,
      mouseLocalY: ROOM_H / 2,
      transitionGrace: 0,
      personality: pick(rng, PERSONALITIES),
      player: defaultPlayer(),
      highScore: Number(localStorage.getItem("depthboundHighScore") || 0),
      statistics: { roomsVisited: 0, elites: 0, secrets: 0, relics: 0, talents: 0 },
    };
    game.player.abilities.q = "Grenade";
    makeRoom(0, 0, "start");
    enterRoom(0, 0, "start");
    startPanel.style.display = "none";
    gameOverPanel.style.display = "none";
    choicePanel.style.display = "none";
    codexPanel.style.display = "none";
    notify(`${game.personality.name}: ${game.personality.desc}`, game.personality.color, 5);
    notify("Press F on the green gate to start fighting, or walk through a door.", "#63ff9d", 4);
    tone(180, .09, "sawtooth", .035);
    tone(330, .11, "triangle", .025);
  }

  function saveHighScore() {
    if (game.player.score > game.highScore) {
      localStorage.setItem("depthboundHighScore", String(Math.floor(game.player.score)));
      game.highScore = Math.floor(game.player.score);
    }
  }

    Object.assign(D, {
      defaultPlayer,
      createRunState,
      setGame,
      getGame,
      resetGame,
      saveHighScore
    });
  }
})(window.Depthbound = window.Depthbound || {});
