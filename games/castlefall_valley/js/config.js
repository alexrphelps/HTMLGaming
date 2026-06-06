window.CastlefallValley = window.CastlefallValley || {};

  const WORLD_W = 3400;

  const GRAVITY = 0.72;

  const TERRAIN_MAX_BASE_Y = 525;

  const TERRAIN_VISIBLE_FLOOR = 455;

  const UNIT_ORDER = ["sword", "shield", "archer", "knight", "priest"];

  const COMMAND_ORDER = ["rush", "formation", "retreat"];

  const BUILD_ORDER = ["wall", "barracks", "tower", "forge", "chapel", "repair"];

  const INITIAL_RESOURCES = {
    gold: 130,
    income: 8,
    morale: 55,
    wave: 1,
    command: "formation"
  };

  const CASTLE_DEFS = {
    player: {
      x: 130,
      hp: 900,
      maxHp: 900,
      wallLevel: 0,
      barracks: 0,
      tower: 0,
      forge: 0,
      chapel: 0,
      towerTimer: 0
    },
    enemy: {
      x: WORLD_W - 130,
      hp: 980,
      maxHp: 980,
      towerTimer: 0
    }
  };

  const HERO_DEF = {
    x: 260,
    vx: 0,
    vy: 0,
    w: 30,
    h: 46,
    hp: 220,
    maxHp: 220,
    facing: 1,
    onGround: false,
    attackTimer: 0,
    hurtTimer: 0
  };

  const unitDefs = {
    sword: {
      label: "Sword",
      hotkey: "1",
      icon: "SW",
      cost: 35,
      hp: 74,
      dmg: 13,
      speed: 35,
      range: 24,
      attackCd: 0.78,
      spawnCd: 0.45,
      color: "#ced8e6",
      role: "melee",
      size: 13
    },
    shield: {
      label: "Shield",
      hotkey: "2",
      icon: "SH",
      cost: 55,
      hp: 145,
      dmg: 8,
      speed: 25,
      range: 22,
      attackCd: 0.95,
      spawnCd: 0.7,
      color: "#8bb8ff",
      role: "defense",
      size: 15
    },
    archer: {
      label: "Archer",
      hotkey: "3",
      icon: "AR",
      cost: 65,
      hp: 48,
      dmg: 12,
      speed: 29,
      range: 245,
      attackCd: 1.55,
      spawnCd: 0.85,
      color: "#86d697",
      role: "ranged",
      size: 12
    },
    knight: {
      label: "Knight",
      hotkey: "4",
      icon: "KN",
      cost: 110,
      hp: 125,
      dmg: 24,
      speed: 54,
      range: 28,
      attackCd: 0.95,
      spawnCd: 1.15,
      color: "#f2c14e",
      role: "melee",
      size: 17,
      charge: true
    },
    priest: {
      label: "Priest",
      hotkey: "5",
      icon: "PR",
      cost: 95,
      hp: 55,
      dmg: 3,
      speed: 27,
      range: 160,
      attackCd: 1.6,
      spawnCd: 1.05,
      color: "#d6a6ff",
      role: "support",
      size: 12
    }
  };

  const commandDefs = {
    rush: {
      id: "cmd_rush",
      hotkey: "z",
      label: "Full Rush",
      description: "maximum speed"
    },
    formation: {
      id: "cmd_formation",
      hotkey: "x",
      label: "Formation",
      description: "smart stacking"
    },
    retreat: {
      id: "cmd_retreat",
      hotkey: "c",
      label: "Retreat",
      description: "fall back"
    }
  };

  const buildDefs = {
    wall: {
      id: "build_wall",
      label: "Stone Wall",
      cost: 160,
      summary: "+HP",
      message: "Stone wall raised. Castle HP increased.",
      apply(gameState) {
        const c = gameState.playerCastle;
        c.wallLevel++;
        c.maxHp += 180;
        c.hp += 180;
      }
    },
    barracks: {
      id: "build_barracks",
      label: "Barracks",
      cost: 190,
      summary: "+income",
      message: "Barracks expanded. Income increased.",
      apply(gameState) {
        gameState.playerCastle.barracks++;
        gameState.income += 3;
      }
    },
    tower: {
      id: "build_tower",
      label: "Arrow Tower",
      cost: 220,
      summary: "auto-fire",
      message: "Arrow tower built. Your castle now fires support volleys.",
      apply(gameState) {
        gameState.playerCastle.tower++;
      }
    },
    forge: {
      id: "build_forge",
      label: "Forge",
      cost: 240,
      summary: "+damage",
      message: "Forge upgraded. New troops hit harder.",
      apply(gameState) {
        gameState.playerCastle.forge++;
      }
    },
    chapel: {
      id: "build_chapel",
      label: "Chapel",
      cost: 210,
      summary: "morale",
      message: "Chapel sanctified. Morale and healing improved.",
      apply(gameState) {
        gameState.playerCastle.chapel++;
        gameState.morale = clamp(gameState.morale + 18, 0, 100);
      }
    },
    repair: {
      id: "build_repair",
      label: "Fortify",
      cost: 120,
      summary: "repair",
      message: "Castle fortified and repaired.",
      apply(gameState) {
        gameState.playerCastle.hp = clamp(gameState.playerCastle.hp + 150, 0, gameState.playerCastle.maxHp);
        gameState.morale = clamp(gameState.morale + 4, 0, 100);
      }
    }
  };

  const INITIAL_UNIT_LOADOUT = [
    ["sword", 1],
    ["shield", 1],
    ["archer", 1],
    ["sword", -1],
    ["shield", -1],
    ["archer", -1]
  ];

  const enemyWavePlan = {
    waveLength: 35,
    opening: {
      until: 20,
      name: "Opening Skirmish",
      weights: [
        ["sword", 0.65],
        ["archer", 1]
      ]
    },
    mid: {
      until: 55,
      name: "Shield Line",
      weights: [
        ["sword", 0.35],
        ["shield", 0.62],
        ["archer", 0.88],
        ["knight", 1]
      ]
    },
    late: {
      name: "Siege Pressure",
      weights: [
        ["sword", 0.25],
        ["shield", 0.45],
        ["archer", 0.67],
        ["knight", 0.88],
        ["priest", 1]
      ]
    },
    reinforcements: ["knight", "shield"]
  };

  const TERRAIN_POINTS = [
      [0, 310],
      [280, 310],
      [500, 380],
      [710, 380],
      [960, 455],
      [1190, 455],
      [1390, 525],
      [2010, 525],
      [2210, 455],
      [2440, 455],
      [2690, 380],
      [2900, 380],
      [3120, 310],
      [WORLD_W, 310]
  ];

  const TERRACE_SEGMENTS = [
    [280, 500],
    [710, 960],
    [1190, 1390],
    [2010, 2210],
    [2440, 2690],
    [2900, 3120]
  ];

  const TERRAIN_FLATS = [
    [0, 280],
    [500, 710],
    [960, 1190],
    [1390, 2010],
    [2210, 2440],
    [2690, 2900],
    [3120, WORLD_W]
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createCastleState(type) {
    return clone(CASTLE_DEFS[type]);
  }

  function createHeroState() {
    const hero = clone(HERO_DEF);
    hero.y = terrainY(hero.x) - hero.h;
    return hero;
  }

window.CastlefallValley.config = {
  WORLD_W,
  GRAVITY,
  TERRAIN_MAX_BASE_Y,
  TERRAIN_VISIBLE_FLOOR,
  UNIT_ORDER,
  COMMAND_ORDER,
  BUILD_ORDER,
  INITIAL_RESOURCES,
  CASTLE_DEFS,
  HERO_DEF,
  unitDefs,
  commandDefs,
  buildDefs,
  INITIAL_UNIT_LOADOUT,
  enemyWavePlan,
  TERRAIN_POINTS,
  TERRACE_SEGMENTS,
  TERRAIN_FLATS,
  createCastleState,
  createHeroState
};
