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
});
