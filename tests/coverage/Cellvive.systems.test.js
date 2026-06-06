const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadCellvive(relativePath, exportNames, overrides = {}) {
  const context = createBrowserContext({
    document,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    localStorage,
    CELLVIVE_CONSTANTS: {
      LOGGING: { PRODUCTION_MODE: false },
      TESTING: { ENABLED: false }
    },
    ...overrides
  });
  return {
    context,
    exports: loadBrowserScript(context, `games/Cellvive/js/${relativePath}`, exportNames)
  };
}

// Behaviour under test: CollisionDetector computes shape intersections, details, predictions, and debug data.
describe('Cellvive CollisionDetector', () => {
  let CollisionDetector;
  let detector;

  beforeEach(() => {
    CollisionDetector = loadCellvive('CollisionDetector.js', ['CollisionDetector']).exports.CollisionDetector;
    detector = new CollisionDetector();
  });

  test('circle, point, rectangle, and world-bound checks report hits and misses', () => {
    expect([
      detector.checkCollision({ x: 0, y: 0, radius: 5 }, { x: 8, y: 0, radius: 5 }),
      detector.checkPointCircleCollision(3, 4, { x: 0, y: 0, radius: 5 }),
      detector.checkCircleRectangleCollision({ x: 5, y: 5, radius: 3 }, { x: 8, y: 5, width: 4, height: 4 }),
      detector.checkWorldBounds({ x: 5, y: 5, radius: 5 }, 20, 20).inBounds,
      detector.checkWorldBounds({ x: 2, y: 5, radius: 5 }, 20, 20).inBounds
    ]).toEqual([true, false, false, true, false]);
  });

  test('collision details and resolution separate overlapping objects', () => {
    const a = { x: 0, y: 0, radius: 5 };
    const b = { x: 8, y: 0, radius: 5 };
    detector.resolveCollision(a, b);
    expect([detector.getCollisionDetails({ x: 0, y: 0, radius: 1 }, { x: 5, y: 0, radius: 1 }), a.x, b.x])
      .toEqual([null, -1, 9]);
  });

  test('multiple collisions and line collision handle point and segment branches', () => {
    const objects = [{ x: 0, y: 0, radius: 5 }, { x: 9, y: 0, radius: 5 }, { x: 30, y: 0, radius: 5 }];
    expect([
      detector.checkMultipleCollisions(objects).length,
      detector.checkLineCollision({ x: 0, y: 0, radius: 5 }, 0, 0, 0, 0),
      detector.checkLineCollision({ x: 5, y: 2, radius: 3 }, 0, 0, 10, 0)
    ]).toEqual([1, true, true]);
  });

  test('radius query, collision prediction, polygon test, and debug view cover remaining branches', () => {
    const movingA = { x: 0, y: 0, radius: 5, velocityX: 1, velocityY: 0 };
    const movingB = { x: 20, y: 0, radius: 5, velocityX: -1, velocityY: 0 };
    const polygon = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const debug = detector.getDebugVisualization([{ x: 1, y: 2, radius: 3, constructor: { name: 'Cell' } }]);

    expect([
      detector.getObjectsInRadius(0, 0, 10, [{ x: 5, y: 0, radius: 1 }, { x: 20, y: 0, radius: 1 }]).length,
      detector.predictCollision(movingA, movingB),
      detector.predictCollision({ ...movingA, velocityX: 0 }, { ...movingB, velocityX: 0 }),
      detector.checkPointInPolygon(5, 5, polygon),
      debug[0].type
    ]).toEqual([1, 5, null, true, 'Cell']);
  });
});

// Behaviour under test: ErrorHandler records, validates, wraps, rotates, and reports errors safely.
describe('Cellvive ErrorHandler', () => {
  let ErrorHandler;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    ErrorHandler = loadCellvive('ErrorHandler.js', ['ErrorHandler']).exports.ErrorHandler;
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('handleError stores metadata and rotates history', () => {
    const handler = new ErrorHandler();
    handler.maxErrors = 1;
    handler.handleError(new Error('first'), 'A');
    const info = handler.handleError('second', 'B', { id: 2 });
    expect([handler.errors.length, handler.errors[0].message, info.metadata]).toEqual([1, 'second', { id: 2 }]);
  });

  test('safe execution and validation return fallbacks on failures', async () => {
    const handler = new ErrorHandler();
    const asyncValue = await handler.safeExecuteAsync(async () => { throw new Error('async'); }, 'Async', 'fallback');
    expect([
      handler.safeExecute(() => 7),
      handler.safeExecute(() => { throw new Error('sync'); }, 'Sync', 9),
      asyncValue,
      handler.validateObject({ a: 1 }, ['a']),
      handler.validateObject(null, ['a']),
      handler.validateNumber(5, 1, 10),
      handler.validateNumber(20, 1, 10),
      handler.safeGet({ a: { b: 3 } }, 'a.b'),
      handler.safeGet({}, 'a.b', 'missing')
    ]).toEqual([7, 9, 'fallback', true, false, true, false, 3, 'missing']);
  });

  test('production reporting uses localStorage and safe method wraps methods', () => {
    const handler = new ErrorHandler();
    handler.isProductionMode = true;
    const wrapped = handler.createSafeMethod({ boom() { throw new Error('wrapped'); } }, 'boom', 'Thing');
    wrapped();
    handler.handleError(new Error('prod'), 'Prod');
    const stored = JSON.parse(localStorage.getItem('cellvive_errors'));
    handler.clearErrors();
    expect([stored.length, handler.getErrorStats().totalErrors]).toEqual([2, 0]);
  });

  test('missing method wrapper returns a no-op function', () => {
    const handler = new ErrorHandler();
    const noop = handler.createSafeMethod({}, 'missing', 'Thing');
    expect(noop()).toBeUndefined();
  });
});

// Behaviour under test: Logger follows configured levels, production mode, and rate-limited buffering.
describe('Cellvive Logger', () => {
  afterEach(() => jest.restoreAllMocks());

  function loggerContext(overrides = {}) {
    return createBrowserContext({
      CELLVIVE_CONSTANTS: {
        LOGGING: {
          ENABLED: true,
          PRODUCTION_MODE: false,
          LEVEL: 'debug',
          SHOW_EMOJIS: false,
          SHOW_TIMESTAMPS: false,
          ...overrides.LOGGING
        },
        PERFORMANCE: { MAX_CONSOLE_LOGS_PER_SECOND: 10 }
      },
      console,
      Date
    });
  }

  test('debug, info, warn, and error respect configured log level', () => {
    const context = loggerContext();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    loadBrowserScript(context, 'games/Cellvive/js/Logger.js', ['Logger']);
    const logger = new context.Logger();

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect([log.mock.calls.length, info.mock.calls.length, warn.mock.calls.length, error.mock.calls.length]).toEqual([1, 1, 1, 1]);
  });

  test('production mode suppresses console output and runtime level can be changed', () => {
    const context = createBrowserContext({
      CELLVIVE_CONSTANTS: {
        LOGGING: { ENABLED: true, PRODUCTION_MODE: true, LEVEL: 'debug', SHOW_EMOJIS: false, SHOW_TIMESTAMPS: false },
        PERFORMANCE: { MAX_CONSOLE_LOGS_PER_SECOND: 10 }
      },
      console
    });
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    loadBrowserScript(context, 'games/Cellvive/js/Logger.js', ['Logger']);
    const logger = new context.Logger();

    logger.debug('hidden');
    logger.warn('hidden');
    logger.setProductionMode(false);
    logger.setLevel('warn');
    logger.debug('still hidden');
    logger.warn('shown');

    expect([log.mock.calls.length, warn.mock.calls.length]).toEqual([0, 1]);
  });
});
