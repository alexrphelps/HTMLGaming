// ManagedResource: track event listeners, intervals, timeouts, rAFs and observers
class ManagedResource {
    constructor() {
        this._listeners = new Set();
        this._intervals = new Set();
        this._timeouts = new Set();
        this._rafs = new Set();
        this._observers = new Set();
    }

    // Register an event listener and return an unregister function
    addListener(target, event, handler, options) {
        if (!target || !target.addEventListener) return () => {};
        target.addEventListener(event, handler, options);
        const entry = { target, event, handler, options };
        this._listeners.add(entry);
        return () => this.removeListener(entry);
    }

    removeListener(entry) {
        if (!entry || !entry.target) return;
        try { entry.target.removeEventListener(entry.event, entry.handler, entry.options); } catch (e) {}
        this._listeners.delete(entry);
    }

    setInterval(fn, ms) {
        const id = setInterval(fn, ms);
        this._intervals.add(id);
        return id;
    }

    clearInterval(id) {
        clearInterval(id);
        this._intervals.delete(id);
    }

    setTimeout(fn, ms) {
        const id = setTimeout(fn, ms);
        this._timeouts.add(id);
        return id;
    }

    clearTimeout(id) {
        clearTimeout(id);
        this._timeouts.delete(id);
    }

    requestAnimationFrame(fn) {
        const id = requestAnimationFrame(fn);
        this._rafs.add(id);
        return id;
    }

    cancelAnimationFrame(id) {
        cancelAnimationFrame(id);
        this._rafs.delete(id);
    }

    observe(observer) {
        if (!observer || !observer.disconnect) return;
        this._observers.add(observer);
    }

    unobserve(observer) {
        if (!observer || !observer.disconnect) return;
        try { observer.disconnect(); } catch (e) {}
        this._observers.delete(observer);
    }

    cleanup() {
        // remove listeners
        for (const entry of Array.from(this._listeners)) {
            try { entry.target.removeEventListener(entry.event, entry.handler, entry.options); } catch (e) {}
        }
        this._listeners.clear();

        // clear intervals
        for (const id of Array.from(this._intervals)) clearInterval(id);
        this._intervals.clear();

        // clear timeouts
        for (const id of Array.from(this._timeouts)) clearTimeout(id);
        this._timeouts.clear();

        // cancel rAFs
        for (const id of Array.from(this._rafs)) cancelAnimationFrame(id);
        this._rafs.clear();

        // disconnect observers
        for (const obs of Array.from(this._observers)) {
            try { obs.disconnect(); } catch (e) {}
        }
        this._observers.clear();
    }
}

module.exports = ManagedResource;
