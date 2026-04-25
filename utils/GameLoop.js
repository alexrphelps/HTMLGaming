// Simple GameLoop utility using requestAnimationFrame with managed timers
class GameLoop {
    constructor({ tick, maxDelta = 200, enabled = true } = {}) {
        this.tick = tick || function() {};
        this.maxDelta = maxDelta; // ms
        this._running = false;
        this._last = null;
        this._rafId = null;

        // tracked timers
        this._intervals = new Set();
        this._timeouts = new Set();
    }

    _frame = (ts) => {
        if (!this._running) return;
        if (this._last === null) this._last = ts;
        let dt = ts - this._last;
        if (dt > this.maxDelta) dt = this.maxDelta;
        try { this.tick(dt, ts); } catch (e) { console.error('GameLoop tick error', e); }
        this._last = ts;
        this._rafId = requestAnimationFrame(this._frame);
    }

    start() {
        if (this._running) return;
        this._running = true;
        this._last = null;
        this._rafId = requestAnimationFrame(this._frame);
    }

    stop() {
        this._running = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = null;
        this._last = null;
        // clear managed timers
        for (const id of Array.from(this._intervals)) clearInterval(id);
        this._intervals.clear();
        for (const id of Array.from(this._timeouts)) clearTimeout(id);
        this._timeouts.clear();
    }

    isRunning() { return this._running; }

    // Managed interval/timeout helpers that are tracked and cleared on stop
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
}

module.exports = GameLoop;
