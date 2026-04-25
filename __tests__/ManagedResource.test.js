const ManagedResource = require('../utils/ManagedResource');

describe('ManagedResource', () => {
    let mr;
    beforeEach(() => {
        mr = new ManagedResource();
        jest.useFakeTimers();
        global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
        global.cancelAnimationFrame = (id) => clearTimeout(id);
    });

    afterEach(() => {
        jest.useRealTimers();
        try { delete global.requestAnimationFrame; delete global.cancelAnimationFrame; } catch (e) {}
    });

    test('adds and removes DOM listener', () => {
        const el = { addEventListener: jest.fn(), removeEventListener: jest.fn() };
        const fn = () => {};
        const unregister = mr.addListener(el, 'click', fn);
        expect(el.addEventListener).toHaveBeenCalledWith('click', fn, undefined);
        unregister();
        // After unregister, removeEventListener should be called
        expect(el.removeEventListener).toHaveBeenCalledWith('click', fn, undefined);
    });

    test('tracks intervals and clears on cleanup', () => {
        const id = mr.setInterval(() => {}, 1000);
        expect(mr._intervals.has(id)).toBe(true);
        mr.cleanup();
        expect(mr._intervals.size).toBe(0);
    });

    test('tracks timeouts and clears on cleanup', () => {
        const id = mr.setTimeout(() => {}, 1000);
        expect(mr._timeouts.has(id)).toBe(true);
        mr.cleanup();
        expect(mr._timeouts.size).toBe(0);
    });

    test('tracks rAF and cancels on cleanup', () => {
        const id = mr.requestAnimationFrame(() => {});
        expect(mr._rafs.has(id)).toBe(true);
        mr.cleanup();
        expect(mr._rafs.size).toBe(0);
    });
});
