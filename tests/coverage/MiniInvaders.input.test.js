const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadInputManager(restartGame = jest.fn()) {
  const context = createBrowserContext({
    document,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    setInterval,
    clearInterval,
    restartGame
  });
  return {
    InputManager: loadBrowserScript(context, 'games/miniinvaders/InputManager.js', ['InputManager']).InputManager,
    restartGame
  };
}

// Behaviour under test: MiniInvaders input state tracks keyboard lifecycle, special keys, stuck-key release, and cleanup.
describe('MiniInvaders InputManager', () => {
  let InputManagerClass;
  let manager;
  let gameState;
  let restartGame;

  beforeEach(() => {
    jest.useFakeTimers();
    ({ InputManager: InputManagerClass, restartGame } = loadInputManager());
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
    manager = new InputManagerClass();
    manager.setGameState(gameState);
    manager.stopStuckKeyDetection();
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

  test('game over space calls restart function', () => {
    gameState.gameOver = true;
    manager.handleSpecialKeys(' ');
    expect(restartGame).toHaveBeenCalledTimes(1);
  });

  test('pause key toggles pause bookkeeping', () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(175);
    manager.handleSpecialKeys('p');
    manager.handleSpecialKeys('P');
    expect([gameState.paused, gameState.pauseStartTime, gameState.totalPausedTime]).toEqual([false, 0, 75]);
  });

  test('shift nuke clears movement and destroys aliens', () => {
    manager.keyStates.set('a', true);
    gameState.keys.a = true;
    manager.handleSpecialKeys('Shift');
    expect([gameState.nukeCount, gameState.aliens.length, gameState.explosions.length, manager.isKeyPressed('a')]).toEqual([0, 0, 1, false]);
  });

  test('stuck detection releases timed-out and over-repeated keys', () => {
    jest.spyOn(Date, 'now').mockReturnValue(2000);
    manager.updateConfig({ stuckKeyTimeout: 100, maxRepeatCount: 2, repeatDelay: 10 });
    manager.keyStates.set('ArrowRight', true);
    manager.keyTimestamps.set('ArrowRight', 0);
    manager.keyRepeatCounts.set('ArrowRight', 0);
    manager.keyStates.set('w', true);
    manager.keyTimestamps.set('w', 1990);
    manager.keyRepeatCounts.set('w', 3);
    gameState.keys.ArrowRight = true;
    gameState.keys.w = true;

    manager.detectStuckKeys();

    expect([manager.isKeyPressed('ArrowRight'), manager.isKeyPressed('w'), gameState.keys.ArrowRight, gameState.keys.w]).toEqual([false, false, false, false]);
  });

  test('query helpers reset and report key stats', () => {
    jest.spyOn(Date, 'now').mockReturnValue(100);
    manager.keyStates.set('a', true);
    manager.keyTimestamps.set('a', 40);
    manager.keyRepeatCounts.set('a', 2);
    expect([manager.isAnyKeyPressed(['a', 'd']), manager.areAllKeysPressed(['a', 'd']), manager.getKeyStats().a.duration]).toEqual([true, false, 60]);
    manager.resetKeys(['a']);
    expect(manager.isKeyPressed('a')).toBe(false);
  });
});
