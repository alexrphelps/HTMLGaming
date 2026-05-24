window.CastlefallValley = window.CastlefallValley || {};

  const WORLD_W = 3400;

  const GRAVITY = 0.72;

  const TERRAIN_MAX_BASE_Y = 525;

  const TERRAIN_VISIBLE_FLOOR = 455;

  const UNIT_ORDER = ["sword", "shield", "archer", "knight", "priest"];

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

window.CastlefallValley.config = {
  WORLD_W,
  GRAVITY,
  TERRAIN_MAX_BASE_Y,
  TERRAIN_VISIBLE_FLOOR,
  UNIT_ORDER,
  unitDefs,
  TERRAIN_POINTS
};
