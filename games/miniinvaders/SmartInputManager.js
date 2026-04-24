/**
 * Smart Input Manager for MiniInvaders Game
 * Intelligent stuck key detection that won't interfere with intentional key holding
 */

class SmartInputManager {
    constructor() {
        // Individual key tracking with proper metadata
        this.keyStates = new Map();
        
        // Configuration for different key types
        this.keyConfig = {
            // Movement keys can be held longer
            movement: {
                keys: ['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'],
                stuckTimeout: 5000,  // 5 seconds - reasonable for intentional holding
                checkInterval: 1000  // Check every second
            },
            // Action keys have shorter timeout
            action: {
                keys: [' ', 'ArrowUp', 'w', 'W'],
                stuckTimeout: 3000,  // 3 seconds - shorter for action keys
                checkInterval: 1000
            },
            // Special keys (pause, nuke) - very short timeout
            special: {
                keys: ['p', 'P', 'Shift'],
                stuckTimeout: 2000,  // 2 seconds - very short for special actions
                checkInterval: 500
            }
        };
        
        // Bound event handlers for proper cleanup
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundBlur = this.handleBlur.bind(this);
        this.boundFocus = this.handleFocus.bind(this);
        
        // Stuck key detection intervals
        this.detectionIntervals = new Map();
        
        // Game state reference
        this.gameState = null;
        
        // Statistics for debugging
        this.stats = {
            totalKeyPresses: 0,
            stuckKeysDetected: 0,
            falsePositives: 0
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the smart input manager
     */
    initialize() {
        console.log('🎮 SmartInputManager: Initializing intelligent input system');
        
        // Add event listeners
        document.addEventListener('keydown', this.boundKeyDown, { passive: false });
        document.addEventListener('keyup', this.boundKeyUp, { passive: false });
        window.addEventListener('blur', this.boundBlur);
        window.addEventListener('focus', this.handleFocus);
        
        // Start intelligent stuck key detection
        this.startSmartDetection();
        
        console.log('🎮 SmartInputManager: Initialized successfully');
    }
    
    /**
     * Set game state reference
     */
    setGameState(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Handle keydown events with intelligent tracking
     */
    handleKeyDown(event) {
        const key = event.key;
        const currentTime = Date.now();
        
        // Prevent default for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
        
        // Get key type and configuration
        const keyType = this.getKeyType(key);
        const config = this.keyConfig[keyType];
        
        // Initialize or update key state
        this.keyStates.set(key, {
            isPressed: true,
            lastKeyDownTime: currentTime,
            lastKeyUpTime: 0,
            pressCount: (this.keyStates.get(key)?.pressCount || 0) + 1,
            keyType: keyType,
            config: config,
            isStuck: false,
            lastActivityTime: currentTime
        });
        
        this.stats.totalKeyPresses++;
        
        console.log(`🎮 SmartInputManager: Key ${key} pressed (${keyType} key)`);
        
        // Handle special keys immediately
        this.handleSpecialKeys(key);
        
        // Update game state keys object for compatibility
        if (this.gameState && this.gameState.keys) {
            this.gameState.keys[key] = true;
        }
    }
    
    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        const key = event.key;
        const currentTime = Date.now();
        
        if (this.keyStates.has(key)) {
            const keyState = this.keyStates.get(key);
            keyState.isPressed = false;
            keyState.lastKeyUpTime = currentTime;
            keyState.isStuck = false;
            
            console.log(`🎮 SmartInputManager: Key ${key} released`);
            
            // Update game state keys object for compatibility
            if (this.gameState && this.gameState.keys) {
                this.gameState.keys[key] = false;
            }
        }
    }
    
    /**
     * Handle window blur (lose focus)
     */
    handleBlur() {
        console.log('🎮 SmartInputManager: Window lost focus - resetting all keys');
        this.resetAllKeys();
    }
    
    /**
     * Handle window focus
     */
    handleFocus() {
        console.log('🎮 SmartInputManager: Window gained focus');
        // Reset keys on focus to prevent stuck states
        this.resetAllKeys();
    }
    
    /**
     * Handle special keys that need immediate processing
     */
    handleSpecialKeys(key) {
        if (!this.gameState) return;
        
        // Game over restart
        if (this.gameState.gameOver && key === ' ') {
            if (typeof restartGame === 'function') {
                restartGame();
            }
            return;
        }
        
        // Pause toggle
        if ((key === 'p' || key === 'P') && !this.gameState.gameOver) {
            if (this.gameState.paused) {
                if (this.gameState.pauseStartTime > 0) {
                    this.gameState.totalPausedTime += Date.now() - this.gameState.pauseStartTime;
                    this.gameState.pauseStartTime = 0;
                }
                this.gameState.paused = false;
                console.log('🎮 Game unpaused');
            } else {
                this.gameState.pauseStartTime = Date.now();
                this.gameState.paused = true;
                console.log('🎮 Game paused');
            }
            return;
        }
        
        // Tactical Nuke activation
        if (key === 'Shift' && this.gameState.nukeCount > 0 && !this.gameState.gameOver && !this.gameState.paused) {
            this.activateTacticalNuke();
        }
    }
    
    /**
     * Activate tactical nuke and reset movement keys
     */
    activateTacticalNuke() {
        // Reset all movement keys to prevent stuck actions when nuking
        const movementKeys = ['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', ' ', 'ArrowUp', 'w', 'W'];
        movementKeys.forEach(key => {
            if (this.keyStates.has(key)) {
                this.keyStates.get(key).isPressed = false;
            }
            if (this.gameState && this.gameState.keys) {
                this.gameState.keys[key] = false;
            }
        });
        
        console.log('🎮 Tactical nuke activated - movement keys reset');
        
        // Execute nuke logic (existing game logic)
        if (this.gameState.player) {
            const playerX = this.gameState.player.x + this.gameState.player.width / 2;
            const playerY = this.gameState.player.y + this.gameState.player.height / 2;
            
            this.gameState.explosions.push({
                x: playerX,
                y: playerY,
                radius: 0,
                maxRadius: 200,
                duration: 1000,
                startTime: Date.now(),
                color: '#ff4444'
            });
            
            this.gameState.aliens = [];
            this.gameState.nukeCount--;
            this.gameState.lastNukeTime = Date.now();
        }
    }
    
    /**
     * Start intelligent stuck key detection
     */
    startSmartDetection() {
        // Start detection for each key type
        Object.keys(this.keyConfig).forEach(keyType => {
            const config = this.keyConfig[keyType];
            
            const intervalId = setInterval(() => {
                this.detectStuckKeysForType(keyType);
            }, config.checkInterval);
            
            this.detectionIntervals.set(keyType, intervalId);
        });
    }
    
    /**
     * Stop stuck key detection
     */
    stopSmartDetection() {
        for (const [keyType, intervalId] of this.detectionIntervals) {
            clearInterval(intervalId);
        }
        this.detectionIntervals.clear();
    }
    
    /**
     * Detect stuck keys for a specific key type
     */
    detectStuckKeysForType(keyType) {
        const config = this.keyConfig[keyType];
        const currentTime = Date.now();
        
        for (const key of config.keys) {
            const keyState = this.keyStates.get(key);
            
            if (keyState && keyState.isPressed) {
                const timeSinceLastKeyDown = currentTime - keyState.lastKeyDownTime;
                const timeSinceLastActivity = currentTime - keyState.lastActivityTime;
                
                // More intelligent stuck key detection
                const isStuck = this.isKeyActuallyStuck(keyState, currentTime);
                
                if (isStuck && !keyState.isStuck) {
                    console.log(`🎮 SmartInputManager: Releasing stuck ${keyType} key ${key} (held for ${timeSinceLastKeyDown}ms)`);
                    
                    keyState.isPressed = false;
                    keyState.isStuck = true;
                    this.stats.stuckKeysDetected++;
                    
                    // Update game state
                    if (this.gameState && this.gameState.keys) {
                        this.gameState.keys[key] = false;
                    }
                } else if (timeSinceLastKeyDown > config.stuckTimeout / 2) {
                    // Update activity time for keys that are held intentionally
                    keyState.lastActivityTime = currentTime;
                }
            }
        }
    }
    
    /**
     * Intelligent stuck key detection logic
     */
    isKeyActuallyStuck(keyState, currentTime) {
        const timeSinceLastKeyDown = currentTime - keyState.lastKeyDownTime;
        const timeSinceLastActivity = currentTime - keyState.lastActivityTime;
        const config = keyState.config;
        
        // Basic timeout check
        if (timeSinceLastKeyDown < config.stuckTimeout) {
            return false;
        }
        
        // Additional checks for different key types
        switch (keyState.keyType) {
            case 'movement':
                // Movement keys: check if there's been any activity recently
                // If the key has been held for a very long time without any activity, it's likely stuck
                return timeSinceLastActivity > config.stuckTimeout * 0.8;
                
            case 'action':
                // Action keys: more aggressive detection since they shouldn't be held as long
                return timeSinceLastKeyDown > config.stuckTimeout;
                
            case 'special':
                // Special keys: very aggressive detection
                return timeSinceLastKeyDown > config.stuckTimeout;
                
            default:
                return timeSinceLastKeyDown > config.stuckTimeout;
        }
    }
    
    /**
     * Get the type of a key
     */
    getKeyType(key) {
        for (const [type, config] of Object.entries(this.keyConfig)) {
            if (config.keys.includes(key)) {
                return type;
            }
        }
        return 'action'; // Default type
    }
    
    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(key) {
        const keyState = this.keyStates.get(key);
        return keyState ? keyState.isPressed && !keyState.isStuck : false;
    }
    
    /**
     * Check if any of the specified keys are pressed
     */
    isAnyKeyPressed(keys) {
        return keys.some(key => this.isKeyPressed(key));
    }
    
    /**
     * Check if all of the specified keys are pressed
     */
    areAllKeysPressed(keys) {
        return keys.every(key => this.isKeyPressed(key));
    }
    
    /**
     * Reset all keys to unpressed state
     */
    resetAllKeys() {
        for (const [key, keyState] of this.keyStates) {
            keyState.isPressed = false;
            keyState.isStuck = false;
        }
        
        // Update game state
        if (this.gameState && this.gameState.keys) {
            Object.keys(this.gameState.keys).forEach(key => {
                this.gameState.keys[key] = false;
            });
        }
        
        console.log('🎮 SmartInputManager: All keys reset');
    }
    
    /**
     * Reset specific keys
     */
    resetKeys(keys) {
        keys.forEach(key => {
            const keyState = this.keyStates.get(key);
            if (keyState) {
                keyState.isPressed = false;
                keyState.isStuck = false;
            }
            
            if (this.gameState && this.gameState.keys) {
                this.gameState.keys[key] = false;
            }
        });
    }
    
    /**
     * Check if a key is a game-related key
     */
    isGameKey(key) {
        const allGameKeys = [
            ...this.keyConfig.movement.keys,
            ...this.keyConfig.action.keys,
            ...this.keyConfig.special.keys
        ];
        return allGameKeys.includes(key);
    }
    
    /**
     * Get key statistics for debugging
     */
    getKeyStats() {
        const stats = {};
        for (const [key, keyState] of this.keyStates) {
            if (keyState.isPressed) {
                stats[key] = {
                    pressed: keyState.isPressed,
                    duration: Date.now() - keyState.lastKeyDownTime,
                    keyType: keyState.keyType,
                    pressCount: keyState.pressCount,
                    isStuck: keyState.isStuck
                };
            }
        }
        return stats;
    }
    
    /**
     * Get system statistics
     */
    getSystemStats() {
        return {
            ...this.stats,
            activeKeys: Array.from(this.keyStates.keys()).filter(key => this.keyStates.get(key).isPressed).length,
            totalTrackedKeys: this.keyStates.size
        };
    }
    
    /**
     * Update configuration for a key type
     */
    updateKeyTypeConfig(keyType, newConfig) {
        if (this.keyConfig[keyType]) {
            this.keyConfig[keyType] = { ...this.keyConfig[keyType], ...newConfig };
            console.log(`🎮 SmartInputManager: Updated config for ${keyType} keys`, this.keyConfig[keyType]);
        }
    }
    
    /**
     * Cleanup and destroy the input manager
     */
    destroy() {
        console.log('🎮 SmartInputManager: Cleaning up intelligent input system');
        
        // Remove event listeners
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('blur', this.boundBlur);
        window.removeEventListener('focus', this.boundFocus);
        
        // Stop detection
        this.stopSmartDetection();
        
        // Clear all data structures
        this.keyStates.clear();
        this.detectionIntervals.clear();
        
        // Clear references
        this.gameState = null;
        
        console.log('🎮 SmartInputManager: Cleanup complete');
    }
}

// Export for use in the game
if (typeof window !== 'undefined') {
    window.SmartInputManager = SmartInputManager;
}
