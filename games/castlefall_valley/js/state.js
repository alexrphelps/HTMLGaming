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
    gold: INITIAL_RESOURCES.gold,
    income: INITIAL_RESOURCES.income,
    morale: INITIAL_RESOURCES.morale,
    wave: INITIAL_RESOURCES.wave,
    command: INITIAL_RESOURCES.command,
    messageTimer: 0,
    messageText: "",
    shake: 0,
    playerCastle: createCastleState("player"),
    enemyCastle: createCastleState("enemy"),
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
