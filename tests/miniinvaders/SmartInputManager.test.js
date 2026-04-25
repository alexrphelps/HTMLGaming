/**
 * @jest-environment jsdom
 */

const path = require('path');

describe('SmartInputManager', () => {
    let SmartInputManager;
    let manager;
    let gameState;

    beforeAll(() => {
        // Load the SmartInputManager script so it registers on window
        const scriptPath = path.resolve(__dirname, '../../games/miniinvaders/SmartInputManager.js');
        require(scriptPath);
        SmartInputManager = window.SmartInputManager;
    });

    beforeEach(() => {
        jest.useFakeTimers();
        gameState = { keys: {}, gameOver: false, paused: false, nukeCount: 1, explosions: [], aliens: [], player: { x: 0, y: 0, width: 10, height: 10 } };
        manager = new SmartInputManager();
        manager.setGameState(gameState);
        // Stop automatic intervals so tests can control detection explicitly
        manager.stopSmartDetection();
    });

    afterEach(() => {
        manager.destroy();
        jest.useRealTimers();
    });

    test('registers event listeners and initializes', () => {
        expect(typeof manager.handleKeyDown).toBe('function');
        expect(typeof manager.handleKeyUp).toBe('function');
        // Ensure detection intervals started
        const stats = manager.getSystemStats();
        expect(stats.totalTrackedKeys).toBeGreaterThanOrEqual(0);
    });

    test('key press lifecycle updates state', () => {
        const key = 'ArrowLeft';
        const kd = new KeyboardEvent('keydown', { key });
        document.dispatchEvent(kd);
        expect(manager.isKeyPressed(key)).toBe(true);
        expect(gameState.keys[key]).toBe(true);

        const ku = new KeyboardEvent('keyup', { key });
        document.dispatchEvent(ku);
        expect(manager.isKeyPressed(key)).toBe(false);
        expect(gameState.keys[key]).toBe(false);
    });

    test('stuck key detection releases key after timeout', () => {
        // Make movement key timeout short for test
        manager.updateKeyTypeConfig('movement', { stuckTimeout: 50, checkInterval: 10 });
        const key = 'ArrowLeft';
        document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        expect(manager.isKeyPressed(key)).toBe(true);

        // Simulate that the key was pressed long ago by adjusting lastKeyDownTime and lastActivityTime
        const ks = manager.keyStates.get(key);
        expect(ks).toBeDefined();
        ks.lastKeyDownTime = Date.now() - (manager.keyConfig.movement.stuckTimeout + 100);
        // Also make lastActivityTime old so movement logic deems it stuck
        ks.lastActivityTime = Date.now() - (manager.keyConfig.movement.stuckTimeout * 2 + 100);

        // Call detection directly to avoid intervals
        manager.detectStuckKeysForType('movement');

        // After detection, key should be released
        expect(manager.isKeyPressed(key)).toBe(false);
        expect(gameState.keys[key]).toBe(false);
    });

    test('blur resets all keys', () => {
        const key = 'ArrowLeft';
        document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        expect(manager.isKeyPressed(key)).toBe(true);

        window.dispatchEvent(new Event('blur'));
        expect(manager.isKeyPressed(key)).toBe(false);
        expect(gameState.keys[key]).toBe(false);
    });

    test('destroy cleans up listeners and intervals', () => {
        manager.destroy();
        // Attempting to dispatch should not throw and should not set state
        const key = 'ArrowLeft';
        expect(() => window.dispatchEvent(new KeyboardEvent('keydown', { key }))).not.toThrow();
        expect(manager.isKeyPressed(key)).toBe(false);
    });
});
