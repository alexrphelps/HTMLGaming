function createInitialState() {
  return {
    w: 0,
    h: 0,
    scale: 1,
    cameraX: 0,
    time: 0,
    dt: 0,
    last: performance.now(),
    keys: {},
    paused: false,
    gameOver: false,
    gold: 130,
    income: 8,
    morale: 55,
    wave: 1,
    command: "formation",
    messageTimer: 0,
    messageText: "",
    shake: 0,
    playerCastle: {
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
    enemyCastle: {
      x: WORLD_W - 130,
      hp: 980,
      maxHp: 980,
      towerTimer: 0
    },
    hero: null,
    units: [],
    projectiles: [],
    particles: [],
    floatTexts: [],
    uiTimer: 0,
    spawnCooldowns: {},
    spawnTimers: {
      enemy: 0,
      income: 0,
      morale: 0
    }
  };
}

function resetState(target) {
  const fresh = createInitialState();
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, fresh);
  return target;
}

const state = createInitialState();

Object.assign(window.CastlefallValley, {
  state,
  createInitialState,
  resetState
});
