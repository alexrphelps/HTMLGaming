// Simple Logger with levels and optional debug mode
// Levels: silent(0), error(1), warn(2), info(3), debug(4)
const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

class Logger {
    constructor() {
        this._level = LEVELS.info;
        this._console = console;
    }

    setLevel(level) {
        if (typeof level === 'string' && typeof LEVELS[level] !== 'undefined') {
            this._level = LEVELS[level];
        }
    }

    getLevel() { return this._level; }

    _shouldLog(level) {
        return LEVELS[level] <= this._level;
    }

    _format(prefix, args) {
        try {
            const time = new Date().toISOString();
            return [`${time} ${prefix}`, ...args];
        } catch (e) {
            return args;
        }
    }

    debug(...args) {
        if (this._shouldLog('debug')) {
            this._console.debug(...this._format('🐛 DEBUG', args));
        }
    }

    info(...args) {
        if (this._shouldLog('info')) {
            this._console.info(...this._format('ℹ️ INFO', args));
        }
    }

    warn(...args) {
        if (this._shouldLog('warn')) {
            this._console.warn(...this._format('⚠️ WARN', args));
        }
    }

    error(...args) {
        if (this._shouldLog('error')) {
            this._console.error(...this._format('❌ ERROR', args));
        }
    }

    // Convenience: initialize level from environment (localStorage or hostname)
    initFromEnvironment({storage, hostname} = {}) {
        try {
            const dev = (hostname && (hostname === 'localhost' || hostname === '127.0.0.1')) ||
                (storage && storage.getItem && storage.getItem('GH_DEBUG') === 'true');
            if (dev) this.setLevel('debug');
        } catch (e) {
            // ignore
        }
    }
}

module.exports = new Logger();
