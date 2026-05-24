describe('GameHubApp lifecycle', () => {
    const setupDom = () => {
        document.body.innerHTML = `
            <div id="loading-screen"><div class="loading-content"></div></div>
            <div id="app"></div>
            <button id="home-btn"></button>
            <div id="game-selector" class="screen"></div>
            <div id="game-screen" class="screen"></div>
            <div id="toast-container"></div>
        `;
    };

    const loadApp = () => {
        jest.resetModules();
        return require('../app');
    };

    const createApp = () => {
        const GameHubApp = loadApp();
        const app = new GameHubApp();
        app.initializeDOM();
        app.initializeNavigationConfig();
        return app;
    };

    beforeEach(() => {
        setupDom();
        localStorage.clear();
        delete window.GameHubApp;
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'info').mockImplementation(() => {});
        jest.spyOn(console, 'debug').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test('navigateTo, navigateBack, and history limit are stable', () => {
        const app = createApp();

        expect(app.navigateTo('game-selector', false)).toBe(true);
        expect(app.navigateTo('game-screen')).toBe(true);
        expect(app.currentScreen).toBe('game-screen');
        expect(app.navigationHistory).toHaveLength(1);

        expect(app.navigateBack()).toBe(true);
        expect(app.currentScreen).toBe('game-selector');

        for (let i = 0; i < 12; i++) {
            app.navigateTo(i % 2 === 0 ? 'game-screen' : 'game-selector');
        }
        expect(app.navigationHistory.length).toBeLessThanOrEqual(10);
    });

    test('launchGame success cleans previous game, builds screen, starts game, and focuses iframe', async () => {
        const app = createApp();
        const previousCleanup = jest.fn();
        app.currentGame = { stop: jest.fn(), cleanup: previousCleanup };
        app.gameSelector = { recordRecentlyPlayed: jest.fn() };
        let lastInstance;
        const events = [];
        app.on('game:launch:start', payload => events.push(['start', payload.game.metadata.name]));
        app.on('game:launch:success', payload => events.push(['success', payload.game.metadata.name]));
        app.on('game:cleanup', () => events.push(['cleanup']));

        class TestGame {
            constructor() {
                lastInstance = this;
                this.iframe = document.createElement('iframe');
                jest.spyOn(this.iframe, 'focus').mockImplementation(() => {});
            }
            async init() {}
            start = jest.fn();
        }

        await app.launchGame({
            id: 'test-game',
            metadata: { name: 'Test Game' },
            gameClass: TestGame
        });

        expect(previousCleanup).toHaveBeenCalled();
        expect(app.gameSelector.recordRecentlyPlayed).toHaveBeenCalledWith('test-game');
        expect(document.getElementById('current-game-title').textContent).toBe('Test Game');
        expect(document.querySelector('#game-screen .game-container')).not.toBeNull();
        expect(lastInstance.start).toHaveBeenCalled();
        expect(lastInstance.iframe.focus).toHaveBeenCalled();
        expect(app.currentScreen).toBe('game-screen');
        expect(events).toEqual([
            ['start', 'Test Game'],
            ['cleanup'],
            ['success', 'Test Game']
        ]);
    });

    test('launchGame failure shows notification and returns to selector', async () => {
        const app = createApp();
        const notificationSpy = jest.spyOn(app, 'showNotification').mockImplementation(() => {});
        const navigateSpy = jest.spyOn(app, 'navigateTo');

        class BrokenGame {
            async init() {
                throw new Error('Nope');
            }
        }

        await app.launchGame({
            metadata: { name: 'Broken Game' },
            gameClass: BrokenGame
        });

        expect(notificationSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to launch Broken Game'), 'error');
        expect(navigateSpy).toHaveBeenLastCalledWith('game-selector');
    });

    test('cleanupCurrentGame follows the standard standalone iframe contract', async () => {
        const app = createApp();
        const stop = jest.fn();
        const cleanup = jest.fn();
        app.currentGame = { stop, cleanup };

        await app.cleanupCurrentGame();

        expect(stop).toHaveBeenCalled();
        expect(cleanup).toHaveBeenCalled();
        expect(app.currentGame).toBeNull();
    });
});
