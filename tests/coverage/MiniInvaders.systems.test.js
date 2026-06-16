const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

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
    loop.setAdaptivePerformance(false);
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

  test('game loop uses fixed target tick and schedules the next frame', () => {
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

    expect(loop.deltaTime).toBeCloseTo(1000 / 60, 2);
    expect(update.mock.calls[0][0]).toBeCloseTo(1000 / 60, 2);
    expect([loop.performanceStats.frameTime, render.mock.calls.length]).toEqual([50, 1]);
  });

  test('game loop skips high-refresh frames until the target tick elapses', () => {
    const update = jest.fn();
    const render = jest.fn();
    loop.setUpdateCallback(update);
    loop.setRenderCallback(render);
    loop.start();
    update.mockClear();
    render.mockClear();
    global.requestAnimationFrame.mockClear();
    now = 8;

    rafCallback();

    expect([update.mock.calls.length, render.mock.calls.length, global.requestAnimationFrame.mock.calls.length]).toEqual([0, 0, 1]);
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

  test('stopping during update prevents render and next frame scheduling', () => {
    const render = jest.fn();
    loop.frameSkipThreshold = 100;
    loop.setUpdateCallback(jest.fn());
    loop.setRenderCallback(render);
    loop.start();
    global.requestAnimationFrame.mockClear();
    render.mockClear();
    loop.setUpdateCallback(() => loop.stop());
    now = 1000;

    rafCallback();

    expect([render.mock.calls.length, global.requestAnimationFrame.mock.calls.length, loop.isRunning]).toEqual([0, 0, false]);
  });
});

// Behaviour under test: SmartInputManager handles special-key branches beyond the existing lifecycle tests.
describe('MiniInvaders SmartInputManager additional branches', () => {
  let SmartInputManager;
  let manager;
  let gameState;
  let actions;

  beforeEach(() => {
    jest.useFakeTimers();
    const smartContext = createBrowserContext({
      document,
      addEventListener: window.addEventListener.bind(window),
      removeEventListener: window.removeEventListener.bind(window),
      setInterval,
      clearInterval
    });
    SmartInputManager = loadBrowserScript(smartContext, 'games/miniinvaders/SmartInputManager.js', ['SmartInputManager']).SmartInputManager;
    actions = {
      restart: jest.fn(),
      togglePause: jest.fn(),
      activateNuke: jest.fn()
    };
    gameState = {
      keys: {},
      gameOver: false,
      paused: false,
      pauseStartTime: 0,
      totalPausedTime: 0,
      nukeCount: 1,
      player: { x: 10, y: 20, width: 10, height: 10 }
    };
    manager = new SmartInputManager();
    manager.setGameState(gameState);
    manager.setActions(actions);
    manager.stopSmartDetection();
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('space restarts when game is over', () => {
    gameState.gameOver = true;
    manager.handleSpecialKeys(' ');
    expect(actions.restart).toHaveBeenCalledTimes(1);
  });

  test('pause key emits pause intent', () => {
    manager.handleSpecialKeys('p');
    manager.handleSpecialKeys('P');
    expect([actions.togglePause.mock.calls.length, gameState.paused, gameState.totalPausedTime]).toEqual([2, false, 0]);
  });

  test('shift emits nuke intent and resets movement keys only', () => {
    manager.keyStates.set('ArrowLeft', { isPressed: true });
    gameState.keys.ArrowLeft = true;
    manager.handleSpecialKeys('Shift');
    expect([actions.activateNuke.mock.calls.length, gameState.nukeCount, gameState.keys.ArrowLeft]).toEqual([1, 1, false]);
  });

  test('query helpers report pressed key combinations and stats', () => {
    manager.keyStates.set('a', { isPressed: true, isStuck: false, lastKeyDownTime: Date.now(), keyType: 'movement', pressCount: 1 });
    manager.keyStates.set('d', { isPressed: false, isStuck: false, lastKeyDownTime: Date.now(), keyType: 'movement', pressCount: 1 });
    expect([manager.isAnyKeyPressed(['a', 'd']), manager.areAllKeysPressed(['a', 'd']), manager.getSystemStats().activeKeys]).toEqual([true, false, 1]);
  });
});

describe('MiniInvaders extracted pure modules', () => {
  let context;

  beforeEach(() => {
    context = createBrowserContext({ document });
    loadBrowserScript(context, 'games/miniinvaders/MiniInvadersConfig.js', []);
    loadBrowserScript(context, 'games/miniinvaders/MiniInvadersState.js', ['createMiniInvadersState', 'createMiniInvadersTalents']);
    loadBrowserScript(context, 'games/miniinvaders/MiniInvadersCombat.js', []);
    loadBrowserScript(context, 'games/miniinvaders/MiniInvadersFormations.js', []);
    loadBrowserScript(context, 'games/miniinvaders/MiniInvadersTalents.js', []);
  });

  test('state factory creates independent default state', () => {
    const first = context.createMiniInvadersState(context.MiniInvadersConfig);
    const second = context.createMiniInvadersState(context.MiniInvadersConfig);
    first.talents.rapidFire = 2;
    expect([second.talents.rapidFire, first.descentSpeed]).toEqual([0, context.MiniInvadersConfig.alien.baseDescentSpeed]);
  });

  test('combat collision helper handles overlap and separation', () => {
    const a = { left: 0, right: 10, top: 0, bottom: 10 };
    const b = { left: 5, right: 15, top: 5, bottom: 15 };
    const c = { left: 11, right: 20, top: 11, bottom: 20 };
    expect([context.MiniInvadersCombat.checkCollision(a, b), context.MiniInvadersCombat.checkCollision(a, c)]).toEqual([true, false]);
  });

  test('formation generator clamps positions into safe play area', () => {
    const positions = context.MiniInvadersFormations.generateFormation('spiral', 20, context.MiniInvadersConfig);
    const maxX = context.MiniInvadersConfig.canvas.width - 50 - context.MiniInvadersConfig.alien.width;
    const maxY = context.MiniInvadersConfig.canvas.height * 0.4;
    expect(positions.every(pos => pos.x >= 50 && pos.x <= maxX && pos.y >= 60 && pos.y <= maxY)).toBe(true);
  });

  test('talent rules apply purchases and reset derived state consistently', () => {
    const state = context.createMiniInvadersState(context.MiniInvadersConfig);
    state.talentPoints = 3;
    const rapid = context.MiniInvadersTalents.applyTalentPurchase(state, 'rapidFire', 1);
    const spread = context.MiniInvadersTalents.applyTalentPurchase(state, 'spreadShot', 2);
    expect([rapid.purchased, spread.purchased, state.fireRateLevel, state.spreadShotCount, state.tier3Unlocked]).toEqual([true, true, 1, 2, true]);

    const returned = context.MiniInvadersTalents.resetTalentLoadout(state);
    expect([returned, state.talentPoints, state.fireRateLevel, state.spreadShotCount, state.tier2Unlocked]).toEqual([3, 3, 0, 1, false]);
  });
});

describe('MiniInvaders browser-script integration', () => {
  test('index loads the live modules and excludes the legacy input manager', () => {
    const html = fs.readFileSync(path.join(repoRoot, 'games/miniinvaders/index.html'), 'utf8');
    [
      'MiniInvadersConfig.js',
      'MiniInvadersState.js',
      'MiniInvadersCombat.js',
      'MiniInvadersFormations.js',
      'MiniInvadersTalents.js',
      'GameLoop.js',
      'MemoryManager.js',
      'SmartInputManager.js'
    ].forEach(script => {
      expect(html).toContain(`<script src="${script}"></script>`);
    });
    expect(html).not.toContain('<script src="InputManager.js"></script>');
    expect(html).not.toContain('requestAnimationFrame(gameLoop)');
  });
});
