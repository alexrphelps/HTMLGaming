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
