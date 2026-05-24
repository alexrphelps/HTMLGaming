const GameLoop = require('../utils/GameLoop');

describe('GameLoop', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // simple raf shim
        global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
        global.cancelAnimationFrame = (id) => clearTimeout(id);
    });

    afterEach(() => {
        jest.useRealTimers();
        try { delete global.requestAnimationFrame; delete global.cancelAnimationFrame; } catch (e) {}
    });

    test('tick is called after start', () => {
        const spy = jest.fn();
        const loop = new GameLoop({ tick: (dt) => spy(dt) });
        loop.start();
        // advance timers to let RAF fire
        jest.advanceTimersByTime(20);
        expect(spy).toHaveBeenCalled();
        loop.stop();
    });

    test('managed timeouts cleared on stop', () => {
        const loop = new GameLoop({ tick: () => {} });
        loop.start();
        const id = loop.setTimeout(() => {}, 1000);
        expect(loop._timeouts.has(id)).toBe(true);
        loop.stop();
        expect(loop._timeouts.size).toBe(0);
    });

    test('managed intervals cleared on stop', () => {
        const loop = new GameLoop({ tick: () => {} });
        loop.start();
        const id = loop.setInterval(() => {}, 1000);
        expect(loop._intervals.has(id)).toBe(true);
        loop.stop();
        expect(loop._intervals.size).toBe(0);
    });

    test('start is idempotent and isRunning tracks state', () => {
        const loop = new GameLoop({ tick: () => {} });
        loop.start();
        const firstRaf = loop._rafId;
        loop.start();

        expect(loop._rafId).toBe(firstRaf);
        expect(loop.isRunning()).toBe(true);

        loop.stop();
        expect(loop.isRunning()).toBe(false);
    });

    test('stop before start is safe', () => {
        const loop = new GameLoop({ tick: () => {} });

        expect(() => loop.stop()).not.toThrow();
        expect(loop.isRunning()).toBe(false);
    });

    test('delta is clamped and tick errors are isolated', () => {
        let rafCallback;
        global.requestAnimationFrame = (cb) => {
            rafCallback = cb;
            return 1;
        };
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const tick = jest.fn(() => { throw new Error('tick failed'); });
        const loop = new GameLoop({ tick, maxDelta: 50 });

        loop.start();
        rafCallback(0);
        rafCallback(1000);

        expect(tick).toHaveBeenLastCalledWith(50, 1000);
        expect(errorSpy).toHaveBeenCalledWith('GameLoop tick error', expect.any(Error));
    });

    test('explicit clear helpers untrack timers', () => {
        const loop = new GameLoop({ tick: () => {} });
        const timeoutId = loop.setTimeout(() => {}, 1000);
        const intervalId = loop.setInterval(() => {}, 1000);

        loop.clearTimeout(timeoutId);
        loop.clearInterval(intervalId);

        expect(loop._timeouts.has(timeoutId)).toBe(false);
        expect(loop._intervals.has(intervalId)).toBe(false);
    });
});
