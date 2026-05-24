/**
 * Centralized Logging System
 * Provides controlled logging with different levels and production mode support
 */
class Logger {
    constructor() {
        this.config = CELLVIVE_CONSTANTS.LOGGING;
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3,
            none: 4
        };
        this.currentLevel = this.levels[this.config.LEVEL] || this.levels.warn;
        
        // Rate limiting for performance
        this.logCount = 0;
        this.lastLogTime = 0;
        this.logBuffer = [];
        this.maxLogsPerSecond = CELLVIVE_CONSTANTS?.PERFORMANCE?.MAX_CONSOLE_LOGS_PER_SECOND || 10;
    }
    
    /**
     * Format log message with timestamp and emoji if enabled
     */
    formatMessage(level, message, emoji = '') {
        let formattedMessage = message;
        
        if (this.config.SHOW_EMOJIS && emoji) {
            formattedMessage = `${emoji} ${message}`;
        }
        
        if (this.config.SHOW_TIMESTAMPS) {
            const timestamp = new Date().toISOString();
            formattedMessage = `[${timestamp}] ${formattedMessage}`;
        }
        
        return formattedMessage;
    }
    
    /**
     * Check if logging is enabled and level is appropriate
     */
    shouldLog(level) {
        return this.config.ENABLED && 
               !this.config.PRODUCTION_MODE && 
               this.levels[level] >= this.currentLevel;
    }
    
    /**
     * Rate-limited logging to prevent console spam
     */
    canLogNow() {
        const now = Date.now();
        
        // Reset counter every second
        if (now - this.lastLogTime > 1000) {
            this.logCount = 0;
            this.lastLogTime = now;
            
            // Flush buffered logs if we have space
            if (this.logBuffer.length > 0 && this.logCount < this.maxLogsPerSecond) {
                this.logBuffer.forEach(bufferedMessage => console.log(bufferedMessage));
                this.logBuffer = [];
            }
        }
        
        return this.logCount < this.maxLogsPerSecond;
    }
    
    /**
     * Add message to buffer if rate limited
     */
    bufferMessage(formattedMessage) {
        if (this.logBuffer.length < 50) { // Limit buffer size
            this.logBuffer.push(formattedMessage);
        }
    }
    
    /**
     * Debug logging - detailed information for debugging
     */
    debug(message, emoji = '🐛') {
        if (this.shouldLog('debug')) {
            const formattedMessage = this.formatMessage('debug', message, emoji);
            
            if (this.canLogNow()) {
                console.log(formattedMessage);
                this.logCount++;
            } else {
                this.bufferMessage(formattedMessage);
            }
        }
    }
    
    /**
     * Info logging - general information
     */
    info(message, emoji = 'ℹ️') {
        if (this.shouldLog('info')) {
            console.info(this.formatMessage('info', message, emoji));
        }
    }
    
    /**
     * Warning logging - potential issues
     */
    warn(message, emoji = '⚠️') {
        if (this.shouldLog('warn')) {
            console.warn(this.formatMessage('warn', message, emoji));
        }
    }
    
    /**
     * Error logging - errors and exceptions
     */
    error(message, emoji = '❌') {
        if (this.shouldLog('error')) {
            console.error(this.formatMessage('error', message, emoji));
        }
    }
    
    /**
     * Game-specific logging with consistent emojis
     */
    gameInit(message) {
        this.info(message, '🔬');
    }
    
    gameStart(message) {
        this.info(message, '🎮');
    }
    
    gameEnd(message) {
        this.info(message, '🏁');
    }
    
    performance(message) {
        this.debug(message, '⚡');
    }
    
    ui(message) {
        this.debug(message, '🎮');
    }
    
    enemy(message) {
        this.debug(message, '🦠');
    }
    
    player(message) {
        this.debug(message, '👤');
    }
    
    particle(message) {
        this.debug(message, '✨');
    }
    
    /**
     * Set logging level dynamically
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.currentLevel = this.levels[level];
            this.config.LEVEL = level;
        }
    }
    
    /**
     * Enable/disable logging
     */
    setEnabled(enabled) {
        this.config.ENABLED = enabled;
    }
    
    /**
     * Toggle production mode
     */
    setProductionMode(enabled) {
        this.config.PRODUCTION_MODE = enabled;
    }
}

// Create global logger instance
window.GameLogger = new Logger();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
