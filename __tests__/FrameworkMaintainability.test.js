describe('framework maintainability fixes', () => {
    beforeEach(() => {
        jest.resetModules();
        document.body.innerHTML = '';
        delete window.Logger;
        delete window.ManagedResource;
        delete window.SafeStorage;
        delete window.GameLoop;
        delete window.GameHubApp;
        delete window.GameSelector;
        delete window.GameHubIframeGame;
        delete window.EventEmitter;
        delete window.GAMEHUB_GAMES;
    });

    test('CommonJS utilities also attach browser globals', () => {
        const Logger = require('../utils/Logger');
        const ManagedResource = require('../utils/ManagedResource');
        const SafeStorage = require('../utils/SafeStorage');
        const GameLoop = require('../utils/GameLoop');

        expect(Logger).toBe(window.Logger);
        expect(ManagedResource).toBe(window.ManagedResource);
        expect(SafeStorage).toBe(window.SafeStorage);
        expect(GameLoop).toBe(window.GameLoop);
    });

    test('GameHubApp initializes browser globals without require exceptions', () => {
        const logger = {
            initFromEnvironment: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn()
        };
        class TestManagedResource {
            addListener() {
                return jest.fn();
            }
            cleanup() {}
        }

        window.Logger = logger;
        window.ManagedResource = TestManagedResource;

        const GameHubApp = require('../app');
        const app = new GameHubApp();

        expect(app.Logger).toBe(logger);
        expect(logger.initFromEnvironment).toHaveBeenCalled();
        expect(app._resources).toBeInstanceOf(TestManagedResource);
    });

    test('fallback listener cleanup removes app listeners', () => {
        const GameHubApp = require('../app');
        const app = new GameHubApp();
        app._resources = null;

        const button = document.createElement('button');
        const handler = jest.fn();
        app.addManagedListener(button, 'click', handler);

        button.click();
        app.cleanup();
        button.click();

        expect(handler).toHaveBeenCalledTimes(1);
    });

    test('GameSelector cleanup removes persistent toolbar listeners', async () => {
        require('../utils/EventEmitter');
        require('../ui/GameSelector');

        document.body.innerHTML = `
            <input id="games-search">
            <select id="games-filter"></select>
            <select id="games-sort"><option value="original">Custom order</option></select>
            <button id="games-reorder-toggle"></button>
            <button id="games-reset-order"></button>
            <div id="games-grid"></div>
            <div id="toast-container"></div>
        `;
        window.GAMEHUB_GAMES = [{ folder: 'void_signal', name: 'Void Signal' }];

        const selector = new window.GameSelector();
        await selector.init();
        selector.updateGamesList = jest.fn();

        document.getElementById('games-search').value = 'void';
        document.getElementById('games-search').dispatchEvent(new Event('input'));
        selector.cleanup();
        document.getElementById('games-search').value = 'again';
        document.getElementById('games-search').dispatchEvent(new Event('input'));

        expect(selector.updateGamesList).toHaveBeenCalledTimes(1);
    });

    test('clearGameScreen rebuilds required framework nodes', () => {
        const GameHubApp = require('../app');
        const app = new GameHubApp();
        document.body.innerHTML = '<div id="game-screen"></div>';

        app.clearGameScreen();

        [
            'back-to-menu',
            'current-game-title'
        ].forEach(id => {
            expect(document.getElementById(id)).not.toBeNull();
        });
        expect(document.querySelector('#game-screen .game-container')).not.toBeNull();
    });
});
