class EventRegistry {
    constructor() {
        this.listeners = [];
    }

    add(target, type, handler, options) {
        if (!target || !target.addEventListener || !handler) return handler;
        target.addEventListener(type, handler, options);
        this.listeners.push({ target, type, handler, options });
        return handler;
    }

    removeAll() {
        for (let i = this.listeners.length - 1; i >= 0; i--) {
            const listener = this.listeners[i];
            if (listener.target && listener.target.removeEventListener) {
                listener.target.removeEventListener(listener.type, listener.handler, listener.options);
            }
        }
        this.listeners = [];
    }
}

if (typeof window !== 'undefined') {
    window.EventRegistry = EventRegistry;
}
