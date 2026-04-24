/**
 * DebugLogger - Centralized debug logging system
 * Respects CELLVIVE_CONSTANTS.TESTING.ENABLED and provides categorized logging
 */
class DebugLogger {
    constructor() {
        this.categories = {
            COLLISION: true,   // Collision detection logs
            SPAWN: true,       // Entity spawning logs
            POWERUP: true,     // Power-up collection logs
            GROWTH: true,      // Player growth logs
            MOVEMENT: false,   // Movement logs (verbose)
            RENDER: false      // Rendering logs (very verbose)
        };
    }
    
    /**
     * Check if debug logging is enabled
     */
    isEnabled() {
        // Safe check - return false if CELLVIVE_CONSTANTS not yet loaded
        if (typeof CELLVIVE_CONSTANTS === 'undefined') return false;
        if (!CELLVIVE_CONSTANTS.TESTING) return false;
        return CELLVIVE_CONSTANTS.TESTING.ENABLED || false;
    }
    
    /**
     * Check if a specific category is enabled
     */
    isCategoryEnabled(category) {
        if (!this.isEnabled()) return false;
        return this.categories[category] !== false;
    }
    
    /**
     * Log collision events
     */
    collision(message, ...args) {
        if (this.isCategoryEnabled('COLLISION')) {
            console.log(`🔵 [COLLISION] ${message}`, ...args);
        }
    }
    
    /**
     * Log spawn events
     */
    spawn(message, ...args) {
        if (this.isCategoryEnabled('SPAWN')) {
            console.log(`🌟 [SPAWN] ${message}`, ...args);
        }
    }
    
    /**
     * Log power-up events
     */
    powerup(message, ...args) {
        if (this.isCategoryEnabled('POWERUP')) {
            console.log(`💎 [POWERUP] ${message}`, ...args);
        }
    }
    
    /**
     * Log growth events
     */
    growth(message, ...args) {
        if (this.isCategoryEnabled('GROWTH')) {
            console.log(`🌱 [GROWTH] ${message}`, ...args);
        }
    }
    
    /**
     * Log movement events
     */
    movement(message, ...args) {
        if (this.isCategoryEnabled('MOVEMENT')) {
            console.log(`🏃 [MOVEMENT] ${message}`, ...args);
        }
    }
    
    /**
     * Log render events
     */
    render(message, ...args) {
        if (this.isCategoryEnabled('RENDER')) {
            console.log(`🎨 [RENDER] ${message}`, ...args);
        }
    }
    
    /**
     * Always log errors (regardless of debug mode)
     */
    error(message, ...args) {
        console.error(`❌ [ERROR] ${message}`, ...args);
    }
    
    /**
     * Always log warnings (regardless of debug mode)
     */
    warn(message, ...args) {
        console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
    
    /**
     * Toggle debug mode on/off
     */
    toggle() {
        const newState = !this.isEnabled();
        if (CELLVIVE_CONSTANTS && CELLVIVE_CONSTANTS.TESTING) {
            CELLVIVE_CONSTANTS.TESTING.ENABLED = newState;
        }
        console.log(`🔧 Debug mode ${newState ? 'ENABLED' : 'DISABLED'}`);
        return newState;
    }
    
    /**
     * Toggle a specific category
     */
    toggleCategory(category) {
        if (this.categories.hasOwnProperty(category)) {
            this.categories[category] = !this.categories[category];
            console.log(`🔧 Debug category ${category}: ${this.categories[category] ? 'ON' : 'OFF'}`);
        } else {
            console.error(`❌ Unknown debug category: ${category}`);
        }
    }
    
    /**
     * Show current debug status
     */
    status() {
        console.log('🔧 Debug Status:');
        console.log('  Enabled:', this.isEnabled());
        console.log('  Categories:');
        Object.entries(this.categories).forEach(([key, value]) => {
            console.log(`    ${key}: ${value ? '✅' : '❌'}`);
        });
    }
}

// Create global instance
window.DebugLogger = new DebugLogger();

// Export for use in other modules
window.DebugLogger = window.DebugLogger;

