describe('GameHubIframeGame', () => {
    const loadIframeGame = () => {
        jest.resetModules();
        require('../utils/EventEmitter');
        require('../ui/GameSelector');
        return window.GameHubIframeGame;
    };

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="game-screen">
                <div class="game-header"><button id="back-to-menu"></button><span id="current-game-title"></span></div>
                <div class="game-container"><span>old</span></div>
            </div>
        `;
        delete window.EventEmitter;
        delete window.GameSelector;
        delete window.GameHubIframeGame;
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('creates iframe with encoded src, title, fullscreen attributes, and focus behavior', async () => {
        const GameHubIframeGame = loadIframeGame();
        const game = new GameHubIframeGame('space game', { name: 'Space Game' });
        const initPromise = game.init();
        const iframe = document.querySelector('iframe');
        jest.spyOn(iframe, 'focus').mockImplementation(() => {});

        iframe.onload();
        await initPromise;
        game.start();

        expect(document.getElementById('game-screen').children).toHaveLength(2);
        expect(document.querySelector('#game-screen .game-header')).not.toBeNull();
        expect(document.querySelector('#game-screen .game-container').children).toHaveLength(1);
        expect(iframe.getAttribute('src')).toBe('games/space%20game/index.html');
        expect(iframe.title).toBe('Space Game Game');
        expect(iframe.getAttribute('allowfullscreen')).toBe('true');
        expect(iframe.getAttribute('tabindex')).toBe('0');
        expect(iframe.focus).toHaveBeenCalled();
        expect(game.isInitialized).toBe(true);
        expect(game.isRunning).toBe(true);
    });

    test('rejects when iframe load times out', async () => {
        jest.useFakeTimers();
        const GameHubIframeGame = loadIframeGame();
        const game = new GameHubIframeGame('slow-game', { name: 'Slow Game' });

        const initPromise = game.init();
        jest.advanceTimersByTime(10000);

        await expect(initPromise).rejects.toThrow('Game iframe load timeout');
    });

    test('cleanup removes iframe and resets state', async () => {
        const GameHubIframeGame = loadIframeGame();
        const game = new GameHubIframeGame('cleanup-game', { name: 'Cleanup Game' });
        const initPromise = game.init();
        document.querySelector('iframe').onload();
        await initPromise;

        game.cleanup();

        expect(document.querySelector('iframe')).toBeNull();
        expect(game.iframe).toBeNull();
        expect(game.gameContainer).toBeNull();
        expect(game.isInitialized).toBe(false);
        expect(game.isRunning).toBe(false);
    });
});
