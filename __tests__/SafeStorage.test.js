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

    test('returns default value for missing keys', () => {
        const s = new SafeStorage('missing');

        expect(s.get('key', 'fallback')).toBe('fallback');
    });

    test('invalid JSON falls back to default value', () => {
        localStorage.setItem('bad:key', '{not json');
        const s = new SafeStorage('bad');

        expect(s.get('key', 123)).toBe(123);
    });

    test('remove deletes values from localStorage', () => {
        const s = new SafeStorage('remove');
        s.set('key', 'value');

        s.remove('key');

        expect(s.get('key', null)).toBe(null);
        expect(localStorage.getItem('remove:key')).toBeNull();
    });

    test('namespaced storage composes key prefixes', () => {
        const root = new SafeStorage('root');
        const child = root.namespaced('child');

        child.set('key', 99);

        expect(localStorage.getItem('root:child:key')).toBe('99');
        expect(child.get('key')).toBe(99);
    });
});
