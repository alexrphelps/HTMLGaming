// SafeStorage: lightweight wrapper around localStorage with in-memory fallback
class SafeStorage {
    constructor(namespace = '') {
        this._ns = namespace ? `${namespace}:` : '';
        this._fallback = new Map();
    }

    _key(key) { return `${this._ns}${key}`; }

    get(key, defaultValue = null) {
        const k = this._key(key);
        try {
            if (typeof localStorage === 'undefined') throw new Error('no localStorage');
            const raw = localStorage.getItem(k);
            if (raw === null || raw === undefined) return defaultValue;
            return JSON.parse(raw);
        } catch (e) {
            if (this._fallback.has(k)) return this._fallback.get(k);
            return defaultValue;
        }
    }

    set(key, value) {
        const k = this._key(key);
        try {
            if (typeof localStorage === 'undefined') throw new Error('no localStorage');
            localStorage.setItem(k, JSON.stringify(value));
        } catch (e) {
            this._fallback.set(k, value);
        }
    }

    remove(key) {
        const k = this._key(key);
        try {
            if (typeof localStorage === 'undefined') throw new Error('no localStorage');
            localStorage.removeItem(k);
        } catch (e) {
            this._fallback.delete(k);
        }
    }

    // Create a namespaced wrapper
    namespaced(ns) {
        return new SafeStorage(ns ? `${this._ns}${ns}` : this._ns);
    }
}

module.exports = SafeStorage;
