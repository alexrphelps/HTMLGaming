const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadSmartInputManager() {
  const context = createBrowserContext({
    document,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    setInterval,
    clearInterval
  });
  return loadBrowserScript(context, 'games/miniinvaders/SmartInputManager.js', ['SmartInputManager']).SmartInputManager;
}

// Behaviour under test: MiniInvaders uses SmartInputManager as the canonical input layer.
describe('MiniInvaders SmartInputManager canonical input', () => {
  let SmartInputManagerClass;
  let manager;
  let gameState;
  let actions;

  beforeEach(() => {
    jest.useFakeTimers();
    SmartInputManagerClass = loadSmartInputManager();
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
      nukeCount: 1
    };
    manager = new SmartInputManagerClass();
    manager.setGameState(gameState);
    manager.setActions(actions);
    manager.stopSmartDetection();
  });

  afterEach(() => {
    manager.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('keydown prevents default for game keys and keyup releases state', () => {
    const keydown = { key: 'ArrowLeft', preventDefault: jest.fn() };
    manager.handleKeyDown(keydown);
    manager.handleKeyUp({ key: 'ArrowLeft' });
    expect([keydown.preventDefault.mock.calls.length, manager.isKeyPressed('ArrowLeft'), gameState.keys.ArrowLeft]).toEqual([1, false, false]);
  });

  test('game over space emits restart intent without owning restart logic', () => {
    gameState.gameOver = true;
    manager.handleSpecialKeys(' ');
    expect(actions.restart).toHaveBeenCalledTimes(1);
  });

  test('pause key emits pause intent without mutating pause bookkeeping', () => {
    manager.handleSpecialKeys('p');
    expect([actions.togglePause.mock.calls.length, gameState.paused, gameState.totalPausedTime]).toEqual([1, false, 0]);
  });

  test('shift nuke clears movement and emits nuke intent without touching gameplay state', () => {
    manager.keyStates.set('a', { isPressed: true });
    gameState.keys.a = true;
    manager.handleSpecialKeys('Shift');
    expect([actions.activateNuke.mock.calls.length, gameState.nukeCount, manager.isKeyPressed('a'), gameState.keys.a]).toEqual([1, 1, false, false]);
  });

  test('stuck detection releases timed-out movement and action keys', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    manager.updateKeyTypeConfig('movement', { stuckTimeout: 100 });
    manager.updateKeyTypeConfig('action', { stuckTimeout: 100 });
    manager.keyStates.set('ArrowRight', {
      isPressed: true,
      lastKeyDownTime: 0,
      lastActivityTime: 0,
      pressCount: 1,
      keyType: 'movement',
      config: manager.keyConfig.movement,
      isStuck: false
    });
    manager.keyStates.set('w', {
      isPressed: true,
      lastKeyDownTime: 0,
      lastActivityTime: 0,
      pressCount: 1,
      keyType: 'action',
      config: manager.keyConfig.action,
      isStuck: false
    });
    gameState.keys.ArrowRight = true;
    gameState.keys.w = true;

    manager.detectStuckKeysForType('movement');
    manager.detectStuckKeysForType('action');

    expect([manager.isKeyPressed('ArrowRight'), manager.isKeyPressed('w'), gameState.keys.ArrowRight, gameState.keys.w]).toEqual([false, false, false, false]);
  });

  test('query helpers reset and report key stats', () => {
    jest.spyOn(Date, 'now').mockReturnValue(100);
    manager.keyStates.set('a', {
      isPressed: true,
      isStuck: false,
      lastKeyDownTime: 40,
      lastKeyUpTime: 0,
      keyType: 'movement',
      pressCount: 2
    });
    expect([manager.isAnyKeyPressed(['a', 'd']), manager.areAllKeysPressed(['a', 'd']), manager.getKeyStats().a.duration]).toEqual([true, false, 60]);
    manager.resetKeys(['a']);
    expect(manager.isKeyPressed('a')).toBe(false);
  });
});
