const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadMiniInvadersClass(fileName, className, overrides = {}) {
  const context = createBrowserContext({
    document,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: global.requestAnimationFrame,
    cancelAnimationFrame: global.cancelAnimationFrame,
    ...overrides
  });
  return loadBrowserScript(context, `games/miniinvaders/${fileName}`, [className])[className];
}

// Behaviour under test: MemoryManager registers, reports, and cleans up owned resources deterministically.
describe('MiniInvaders MemoryManager', () => {
  let MemoryManager;
  let manager;

  beforeEach(() => {
    jest.useFakeTimers();
    MemoryManager = loadMiniInvadersClass('MemoryManager.js', 'MemoryManager');
    manager = new MemoryManager();
  });

  afterEach(() => {
    manager.cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('event listener wrappers register and unregister DOM handlers', () => {
    const button = document.createElement('button');
    const handler = jest.fn();
    const managed = manager.createManagedEventListener(button, 'click', handler);

    button.click();
    managed.remove();
    button.click();

    expect([handler.mock.calls.length, manager.getMemoryStats().eventListeners]).toEqual([1, 0]);
  });

  test('managed timers can be cancelled through wrappers', () => {
    const interval = manager.createManagedInterval(jest.fn(), 100);
    const timeout = manager.createManagedTimeout(jest.fn(), 100);

    interval.cancel();
    timeout.cancel();

    expect([manager.getMemoryStats().intervals, manager.getMemoryStats().timeouts]).toEqual([0, 0]);
  });

  test('cleanup disconnects observers, destroys objects, clears audio, and clears canvas', () => {
    const observer = { disconnect: jest.fn() };
    const gameObject = { destroy: jest.fn() };
    const cleanupObject = { cleanup: jest.fn() };
    const audio = { pause: jest.fn(), load: jest.fn(), src: 'sound.mp3' };
    const canvas = document.createElement('canvas');
    const clearRect = jest.fn();
    jest.spyOn(canvas, 'getContext').mockReturnValue({ clearRect });

    manager.registerObserver(observer);
    manager.registerGameObject(gameObject);
    manager.registerGameObject(cleanupObject);
    manager.registerAudioElement(audio);
    manager.registerCanvasElement(canvas);
    manager.addCleanupCallback(jest.fn());
    manager.cleanup();

    expect([observer.disconnect, gameObject.destroy, cleanupObject.cleanup, audio.pause, audio.load, clearRect].every(fn => fn.mock.calls.length === 1)).toBe(true);
  });

  test('cleanup continues when callbacks and resources throw', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    manager.addCleanupCallback(() => { throw new Error('callback'); });
    manager.registerObserver({ disconnect: () => { throw new Error('observer'); } });
    manager.registerGameObject({ destroy: () => { throw new Error('object'); } });
    manager.registerAudioElement({ pause: () => { throw new Error('audio'); }, load: jest.fn() });
    manager.registerCanvasElement({ getContext: () => { throw new Error('canvas'); } });

    manager.cleanup();

    expect(manager.getMemoryStats()).toMatchObject({ eventListeners: 0, intervals: 0, timeouts: 0, observers: 0, gameObjects: 0 });
  });

  test('monitoring warns only for high estimated usage', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    let now = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => ++now);
    for (let i = 0; i < 51; i++) manager.registerEventListener(document.createElement('button'), 'click', jest.fn());
    for (let i = 0; i < 40; i++) manager.registerGameObject({});

    manager.monitorMemory();

    expect([warn.mock.calls.length, log.mock.calls.some(call => String(call[0]).includes('Memory stats'))]).toEqual([1, true]);
  });
});

// Behaviour under test: MiniInvaders GameLoop controls callbacks, frame skipping, and adaptive performance branches.
describe('MiniInvaders GameLoop', () => {
  let GameLoop;
  let loop;
  let now;
  let rafCallback;

  beforeEach(() => {
    now = 0;
    global.requestAnimationFrame = jest.fn(callback => {
      rafCallback = callback;
      return 17;
    });
    global.cancelAnimationFrame = jest.fn();
    GameLoop = loadMiniInvadersClass('GameLoop.js', 'GameLoop', {
      performance: { now: () => now },
      requestAnimationFrame: global.requestAnimationFrame,
      cancelAnimationFrame: global.cancelAnimationFrame
    });
    loop = new GameLoop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.requestAnimationFrame;
    delete global.cancelAnimationFrame;
  });

  test('start ignores duplicate starts and stop ignores duplicate stops', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    loop.start();
    loop.start();
    loop.stop();
    loop.stop();
    expect([warn.mock.calls.length, global.cancelAnimationFrame]).toEqual([2, expect.any(Function)]);
  });

  test('game loop caps delta time and schedules the next frame', () => {
    const update = jest.fn();
    const render = jest.fn();
    loop.setUpdateCallback(update);
    loop.setRenderCallback(render);
    loop.frameSkipThreshold = 100;
    loop.start();
    update.mockClear();
    render.mockClear();
    now = 1000;

    rafCallback();

    expect([loop.deltaTime, update.mock.calls[0][0], render.mock.calls.length]).toEqual([50, 50, 1]);
  });

  test('slow frames are skipped until the threshold is reached', () => {
    loop.deltaTime = 20;
    loop.consecutiveSlowFrames = 3;
    const first = loop.shouldSkipFrame();
    const second = loop.shouldSkipFrame();
    expect([first, second, loop.consecutiveSlowFrames]).toEqual([true, false, 5]);
  });

  test('adaptive performance maps fps to low medium and high', () => {
    loop.fps = 20;
    loop.manageAdaptivePerformance();
    loop.fps = 40;
    loop.manageAdaptivePerformance();
    const medium = loop.performanceLevel;
    loop.fps = 60;
    loop.manageAdaptivePerformance();
    expect([medium, loop.performanceLevel]).toEqual(['medium', 'high']);
  });

  test('reset clears counters and forceFrame invokes callbacks once', () => {
    const update = jest.fn();
    const render = jest.fn();
    loop.setUpdateCallback(update);
    loop.setRenderCallback(render);
    loop.frameCount = 9;
    loop.performanceLevel = 'low';

    loop.forceFrame();
    loop.reset();

    expect([update.mock.calls.length, render.mock.calls.length, loop.frameCount, loop.performanceLevel]).toEqual([1, 1, 0, 'high']);
  });
});

// Behaviour under test: SmartInputManager handles special-key branches beyond the existing lifecycle tests.
describe('MiniInvaders SmartInputManager additional branches', () => {
  let SmartInputManager;
  let manager;
  let gameState;

  beforeEach(() => {
    jest.useFakeTimers();
    const smartContext = createBrowserContext({
      document,
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window),
      setInterval,
      clearInterval,
      restartGame: jest.fn()
    });
    SmartInputManager = loadBrowserScript(smartContext, 'games/miniinvaders/SmartInputManager.js', ['SmartInputManager']).SmartInputManager;
    global.restartGame = smartContext.restartGame;
    gameState = {
      keys: {},
      gameOver: false,
      paused: false,
      pauseStartTime: 0,
      totalPausedTime: 0,
      nukeCount: 1,
      explosions: [],
      aliens: [{ id: 1 }],
      player: { x: 10, y: 20, width: 10, height: 10 }
    };
    manager = new SmartInputManager();
    manager.setGameState(gameState);
    manager.stopSmartDetection();
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
    delete global.restartGame;
  });

  test('space restarts when game is over', () => {
    gameState.gameOver = true;
    manager.handleSpecialKeys(' ');
    expect(global.restartGame).toHaveBeenCalledTimes(1);
  });

  test('pause key toggles pause accounting', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(250);
    manager.handleSpecialKeys('p');
    manager.handleSpecialKeys('P');
    expect([gameState.paused, gameState.pauseStartTime, gameState.totalPausedTime]).toEqual([false, 0, 150]);
  });

  test('shift activates tactical nuke and resets movement keys', () => {
    manager.keyStates.set('ArrowLeft', { isPressed: true });
    gameState.keys.ArrowLeft = true;
    manager.handleSpecialKeys('Shift');
    expect([gameState.nukeCount, gameState.aliens.length, gameState.explosions.length, gameState.keys.ArrowLeft]).toEqual([0, 0, 1, false]);
  });

  test('query helpers report pressed key combinations and stats', () => {
    manager.keyStates.set('a', { isPressed: true, isStuck: false, lastKeyDownTime: Date.now(), keyType: 'movement', pressCount: 1 });
    manager.keyStates.set('d', { isPressed: false, isStuck: false, lastKeyDownTime: Date.now(), keyType: 'movement', pressCount: 1 });
    expect([manager.isAnyKeyPressed(['a', 'd']), manager.areAllKeysPressed(['a', 'd']), manager.getSystemStats().activeKeys]).toEqual([true, false, 1]);
  });
});
