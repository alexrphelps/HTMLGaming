const SafeStorage = require('../utils/SafeStorage');

describe('SafeStorage', () => {
    beforeEach(() => {
        // Ensure a clean fallback
        try { localStorage.clear(); } catch (e) {}
    });

    test('set/get roundtrip with localStorage', () => {
        const s = new SafeStorage('test');
        s.set('key', {a: 1});
        const v = s.get('key');
        expect(v).toEqual({a: 1});
    });

    test('fallback when localStorage throws', () => {
        // simulate localStorage throwing
        const real = global.localStorage;
        // create an object that throws
        global.localStorage = {
            getItem: () => { throw new Error('fail'); },
            setItem: () => { throw new Error('fail'); },
            removeItem: () => { throw new Error('fail'); }
        };

        const s = new SafeStorage('fb');
        s.set('k', 42);
        expect(s.get('k')).toBe(42);
        s.remove('k');
        expect(s.get('k', null)).toBe(null);

        global.localStorage = real;
    });
});
