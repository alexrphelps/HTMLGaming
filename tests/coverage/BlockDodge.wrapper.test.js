const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadBlockDodge() {
  const context = createBrowserContext({ document, setTimeout, clearTimeout });
  return loadBrowserScript(context, 'games/blockdodge/BlockDodgeGame.js', ['BlockDodgeGame']).BlockDodgeGame;
}

// Behaviour under test: Block Dodge iframe wrapper exposes metadata and manages iframe lifecycle.
describe('BlockDodge wrapper', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  test('constructor exposes GameHub metadata and initial state', () => {
    const BlockDodgeGame = loadBlockDodge();
    const game = new BlockDodgeGame();
    expect([game.metadata.name, game.metadata.category, game.isGameRunning]).toEqual(['Block Dodge', 'Arcade', false]);
  });

  test('init rejects when game screen is missing', async () => {
    const BlockDodgeGame = loadBlockDodge();
    await expect(new BlockDodgeGame().init()).rejects.toThrow('GameHub game screen not found');
  });

  test('init creates a focusable iframe and cleanup removes it', async () => {
    jest.useFakeTimers();
    const BlockDodgeGame = loadBlockDodge();
    const container = document.createElement('div');
    container.id = 'game-screen';
    document.body.appendChild(container);
    const game = new BlockDodgeGame();
    const initPromise = game.init();
    const iframe = container.querySelector('iframe');
    iframe.onload();
    await initPromise;

    const focus = jest.spyOn(iframe, 'focus').mockImplementation(() => {});
    game.start();
    game.cleanup();
    jest.useRealTimers();

    expect([iframe.src.includes('games/blockdodge/index.html'), focus.mock.calls.length, container.children.length, game.isGameRunning]).toEqual([true, 1, 0, false]);
  });

  test('sendMessageToGame forwards messages when contentWindow exists', () => {
    const BlockDodgeGame = loadBlockDodge();
    const game = new BlockDodgeGame();
    const postMessage = jest.fn();
    game.iframe = { contentWindow: { postMessage } };
    game.sendMessageToGame({ type: 'pause' });
    expect(postMessage).toHaveBeenCalledWith({ type: 'pause' }, '*');
  });
});
