const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadSnake(context, relativePath, exports) {
  return loadBrowserScript(context, `games/snake/js/${relativePath}`, exports);
}

// Behaviour under test: Snake small utility modules provide deterministic geometry, parsing, and event dispatch.
describe('Snake utility logic', () => {
  afterEach(() => jest.restoreAllMocks());

  test('SnakeUtils handles random positions, capitalization, point, and rectangle geometry', () => {
    const context = createBrowserContext({ TILE_COUNT: 10 });
    const { SnakeUtils } = loadSnake(context, 'utils.js', ['SnakeUtils']);
    jest.spyOn(Math, 'random').mockReturnValue(0.25);
    expect([
      SnakeUtils.randomPosition(),
      SnakeUtils.capitalizeFirstLetter('snake'),
      SnakeUtils.pointInRect({ x: 2, y: 2 }, { x: 1, y: 1, width: 4, height: 4 }),
      SnakeUtils.rectsOverlap({ x: 0, y: 0, width: 2, height: 2 }, { x: 3, y: 3, width: 1, height: 1 })
    ]).toEqual([{ x: 2, y: 2 }, 'Snake', true, false]);
  });

  test('LevelManagerUtil parses and clamps numeric values', () => {
    const context = createBrowserContext();
    const { parseIntSafe, clamp } = loadSnake(context, 'levelManagerUtil.js', ['parseIntSafe', 'clamp']);
    expect([parseIntSafe('7'), parseIntSafe('bad', 3), clamp(12, 0, 10), clamp(-1, 0, 10)]).toEqual([7, 3, 10, 0]);
  });

  test('ConfigManager applies obstacle settings with canonical and legacy keys', () => {
    const context = createBrowserContext({
      INITIAL_SNAKE_LENGTH: 3,
      NUM_OBSTACLES: 0,
      FOOD_TYPES: {
        red: { color: 'red', grow: 2, speedInc: 0, tempSpeedInc: 0 },
        orange: { color: 'orange', grow: 1, speedInc: 0.25, tempSpeedInc: 0 },
        yellow: { color: 'yellow', grow: 1, speedInc: 0, tempSpeedInc: 0.75 }
      },
      RUNTIME_TEMP_SPEED_BOOST_DURATION: 3000,
      AI_DIFFICULTY: 'medium',
      EventSystem: { emit: jest.fn() }
    });
    const { ConfigManager } = loadSnake(context, 'configManager.js', ['ConfigManager']);
    ConfigManager.applySettings({ initialLength: 4, numObstacles: 7 });
    const canonicalCount = context.NUM_OBSTACLES;
    ConfigManager.applySettings({ initialLength: 4, obstacles: 3 });
    expect([canonicalCount, context.NUM_OBSTACLES]).toEqual([7, 3]);
  });

  test('EventSystem subscribe emit and clear methods isolate event names', () => {
    const context = createBrowserContext();
    const { EventSystem } = loadSnake(context, 'eventSystem.js', ['EventSystem']);
    const listener = jest.fn();
    EventSystem.subscribe('score', listener);
    EventSystem.emit('score', { points: 5 });
    EventSystem.clearEvent('score');
    EventSystem.emit('score', { points: 10 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

// Behaviour under test: Snake collision helpers cover line paths, wrapping, and occupied/collision branches with mocked globals.
describe('Snake collision logic', () => {
  function collisionContext(overrides = {}) {
    const context = createBrowserContext({
      TILE_COUNT: 10,
      wrapEnabled: false,
      obstacles: [],
      playerAlive: true,
      playerSnake: [],
      aiSnakes: [],
      foods: [],
      killPlayerSnake: jest.fn(),
      killAiSnake: jest.fn(),
      EventSystem: { emit: jest.fn() },
      playerPermanentMoveRate: 0,
      playerTempMoveRate: 0,
      ...overrides
    });
    loadSnake(context, 'utils.js', ['SnakeUtils']);
    return { context, exports: loadSnake(context, 'collisions.js', [
      'getPointsOnLine',
      'getWrappedPoints',
      'occupiesPosition',
      'collidesWithObstacles',
      'collidesWithSnake',
      'collidesWithPlayer',
      'collidesWithAiSnakes',
      'checkPlayerCollisions',
      'checkAiCollisions',
      'snakeOverlapsObstacle'
    ]) };
  }

  test('line and wrapped path helpers return direct and split paths', () => {
    const { exports } = collisionContext({ wrapEnabled: true });
    expect([
      exports.getPointsOnLine(0, 0, 2, 0),
      exports.getWrappedPoints(9, 5, 0, 5).map(p => p.x)
    ]).toEqual([[{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }], [9]]);
  });

  test('occupied position checks obstacles player ai and foods', () => {
    const { exports } = collisionContext({
      obstacles: [{ x: 1, y: 1, width: 2, height: 2 }],
      playerSnake: [{ x: 5, y: 5 }],
      aiSnakes: [{ alive: true, body: [{ x: 6, y: 6 }] }],
      foods: [{ x: 7, y: 7 }]
    });
    expect([exports.occupiesPosition(1, 1), exports.occupiesPosition(5, 5), exports.occupiesPosition(6, 6), exports.occupiesPosition(7, 7), exports.occupiesPosition(9, 9)])
      .toEqual([true, true, true, true, false]);
  });

  test('specific collision helpers detect obstacles, self, player, and ai snakes', () => {
    const { exports } = collisionContext({
      obstacles: [{ x: 2, y: 2, width: 1, height: 1 }],
      playerSnake: [{ x: 4, y: 4 }],
      aiSnakes: [{ alive: true, body: [{ x: 5, y: 5 }] }]
    });
    expect([
      exports.collidesWithObstacles({ x: -1, y: 0 }),
      exports.collidesWithObstacles({ x: 2, y: 2 }),
      exports.collidesWithSnake({ x: 3, y: 3 }, [{ x: 0, y: 0 }, { x: 3, y: 3 }]),
      exports.collidesWithPlayer({ x: 4, y: 4 }),
      exports.collidesWithAiSnakes({ x: 5, y: 5 })
    ]).toEqual([true, true, true, true, true]);
  });
});

// Behaviour under test: Snake AI helpers choose safe moves and reject unsafe positions.
describe('Snake AI logic', () => {
  test('distance, safety, and pathing helpers work with a compact board', () => {
    const context = createBrowserContext({
      TILE_COUNT: 8,
      wrapEnabled: false,
      obstacles: [{ x: 2, y: 2, width: 1, height: 1 }],
      playerAlive: true,
      playerSnake: [{ x: 0, y: 0 }],
      aiSnakes: [{ alive: true, body: [{ x: 1, y: 1 }, { x: 1, y: 2 }], dir: { x: 1, y: 0 } }],
      foods: [{ x: 4, y: 1, type: 'red' }],
      AI_DIFFICULTY_CONFIG: { medium: { lookaheadDepth: 2, aggressionLevel: 0.5, riskTolerance: 0.5, pathfindingWeight: 1 } },
      AI_DIFFICULTY: 'medium',
      MAX_HISTORY: 20,
      aiPositionHistories: [[]],
      aiTrapHistory: [[]],
      aiLastDecisionTime: [0],
      aiAggressionCooldown: [0],
      EventSystem: { emit: jest.fn() }
    });
    loadSnake(context, 'utils.js', ['SnakeUtils']);
    loadSnake(context, 'collisions.js', ['occupiesPosition']);
    const ai = loadSnake(context, 'ai.js', ['calculateDistance', 'isPositionSafe', 'findPathToFood', 'aiChooseDir']);
    expect([
      ai.calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 }),
      ai.isPositionSafe({ x: 2, y: 2 }, 0),
      Array.isArray(ai.findPathToFood(0, context.foods[0])),
      ai.aiChooseDir(0)
    ]).toEqual([7, false, false, expect.any(Object)]);
  });
});

// Behaviour under test: Snake lifecycle ownership prevents stale countdown callbacks and routes food setup through FoodManager.
describe('Snake lifecycle and manager ownership', () => {
  function createElement(overrides = {}) {
    return {
      style: {},
      textContent: '',
      classList: { add: jest.fn(), remove: jest.fn() },
      getContext: jest.fn(() => ({})),
      focus: jest.fn(),
      querySelector: jest.fn(),
      ...overrides
    };
  }

  test('stopSnakeCountdown cancels pending countdown callbacks before they can start the loop', () => {
    const elements = {
      game: createElement({ width: 1000, height: 1000 }),
      gameContainer: createElement(),
      countdown: createElement(),
      previewCanvas: createElement(),
      colorPreview: createElement()
    };
    const callbacks = [];
    const setTimeoutMock = jest.fn((callback) => {
      const id = callbacks.length + 1;
      callbacks.push({ id, callback });
      return id;
    });
    const clearTimeoutMock = jest.fn();
    const startSnakeGameLoop = jest.fn();
    const context = createBrowserContext({
      ANIMATION_INTERVAL: 16,
      BASE_GAME_INTERVAL: 200,
      COUNTDOWN_SECONDS: 1,
      countdownActive: false,
      setTimeout: setTimeoutMock,
      clearTimeout: clearTimeoutMock,
      startSnakeGameLoop,
      drawGameState: jest.fn(),
      document: {
        getElementById: jest.fn(id => elements[id] || createElement()),
        createElement: jest.fn(() => createElement()),
        body: createElement()
      }
    });
    const { startCountdown, stopSnakeCountdown } = loadSnake(context, 'gameState.js', ['startCountdown', 'stopSnakeCountdown']);

    startCountdown();
    const scheduledCountdown = callbacks[0];
    stopSnakeCountdown();
    scheduledCountdown.callback();

    expect(clearTimeoutMock).toHaveBeenCalledWith(scheduledCountdown.id);
    expect(startSnakeGameLoop).not.toHaveBeenCalled();
    expect(elements.countdown.style.display).toBe('none');
  });

  test('GameManager initializes food through FoodManager instead of the legacy global helper', () => {
    const FoodManager = { init: jest.fn() };
    const context = createBrowserContext({
      playerColor: 'lime',
      BASE_GAME_INTERVAL: 200,
      baseInterval: 200,
      score: 0,
      playerPermanentMoveRate: 0,
      playerTempMoveRate: 0,
      playerMoveAccumulator: 0,
      gameOver: false,
      gameWinner: null,
      playerAlive: true,
      playerSpeedBoostEnd: 0,
      directionQueue: [],
      removedTails: [],
      animationProgress: 1,
      lastGameUpdateTime: 0,
      NUM_AI_SNAKES: 4,
      FoodManager,
      LevelManager: { currentLevel: 1 },
      gameInterval: null,
      stopSnakeCountdown: jest.fn(),
      stopSnakeGameLoop: jest.fn(),
      stopSnakeRenderLoop: jest.fn(),
      initSnakes: jest.fn(),
      initFoods: jest.fn(),
      generateObstacles: jest.fn(),
      setCanvasAndContainerSize: jest.fn(),
      startSnakeRenderLoop: jest.fn(),
      updateAiScores: jest.fn(),
      startCountdown: jest.fn(),
      enemiesLeftElem: createElement(),
      playerStatusElem: createElement(),
      statusMessageElement: createElement(),
      gameControlsElement: createElement(),
      scoreboard: createElement(),
      startMenu: createElement(),
      gameContainer: createElement(),
      document: { getElementById: jest.fn(() => null) }
    });
    const { GameManager } = loadSnake(context, 'gameManager.js', ['GameManager']);

    GameManager.initGame();

    expect(FoodManager.init).toHaveBeenCalledTimes(1);
    expect(context.initFoods).not.toHaveBeenCalled();
  });

  test('FoodManager preserves player food side effects when it owns eating', () => {
    const emit = jest.fn();
    const context = createBrowserContext({
      foods: [{ x: 2, y: 3, type: 'red', grow: 2, speedInc: 0, tempSpeedInc: 0, noRespawn: true }],
      playerAlive: true,
      playerSnake: [{ x: 2, y: 3 }],
      score: 0,
      playerGrow: 0,
      playerPermanentMoveRate: 0,
      playerTempMoveRate: 0,
      playerSpeedBoostEnd: 0,
      baseInterval: 200,
      MAX_MOVES_PER_SECOND: 10,
      RUNTIME_TEMP_SPEED_BOOST_DURATION: 3000,
      levelFoodCount: 0,
      EventSystem: { emit }
    });
    const { FoodManager } = loadSnake(context, 'foodManager.js', ['FoodManager']);

    expect(FoodManager.processPlayerEatsFood()).toBe(true);

    expect(context.score).toBe(1);
    expect(context.playerGrow).toBe(2);
    expect(context.levelFoodCount).toBe(1);
    expect(context.foods).toEqual([]);
    expect(emit).toHaveBeenCalledWith('playerAteFood', expect.objectContaining({
      score: 1,
      levelFoodCount: 1,
      type: 'red'
    }));
  });
});
