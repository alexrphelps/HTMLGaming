/**
 * Advanced Input Manager for MiniInvaders Game
 * Handles keyboard input with proper state management and stuck key prevention
 */

class InputManager {
    constructor() {
        // Key state tracking with timestamps and metadata
        this.keyStates = new Map();
        this.keyTimestamps = new Map();
        this.keyRepeatCounts = new Map();
        
        // Configuration
        this.config = {
            stuckKeyTimeout: 1000,        // 1 second timeout for stuck keys
            repeatDelay: 500,             // Initial delay before key repeat
            repeatInterval: 50,           // Interval between key repeats
            maxRepeatCount: 100,          // Maximum repeat count before auto-release
            checkInterval: 100            // How often to check for stuck keys (ms)
        };
        
        // Bound event handlers for proper cleanup
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.boundBlur = this.handleBlur.bind(this);
        this.boundFocus = this.handleFocus.bind(this);
        
        // Stuck key detection interval
        this.stuckKeyInterval = null;
        
        // Game state reference (will be set by game)
        this.gameState = null;
        
        // Event listeners
        this.eventListeners = [];
        
        this.initialize();
    }
    
    /**
     * Initialize the input manager
     */
    initialize() {
        console.log('🎮 InputManager: Initializing advanced input system');
        
        // Add event listeners
        document.addEventListener('keydown', this.boundKeyDown, { passive: false });
        document.addEventListener('keyup', this.boundKeyUp, { passive: false });
        window.addEventListener('blur', this.boundBlur);
        window.addEventListener('focus', this.boundFocus);
        
        // Start stuck key detection
        this.startStuckKeyDetection();
        
        console.log('🎮 InputManager: Initialized successfully');
    }
    
    /**
     * Set game state reference
     */
    setGameState(gameState) {
        this.gameState = gameState;
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        const key = event.key;
        const currentTime = Date.now();
        
        // Prevent default for game keys
        if (this.isGameKey(key)) {
            event.preventDefault();
        }
        
        // Initialize key state if not exists
        if (!this.keyStates.has(key)) {
            this.keyStates.set(key, false);
            this.keyTimestamps.set(key, 0);
            this.keyRepeatCounts.set(key, 0);
        }
        
        // Only process if key wasn't already pressed
        if (!this.keyStates.get(key)) {
            this.keyStates.set(key, true);
            this.keyTimestamps.set(key, currentTime);
            this.keyRepeatCounts.set(key, 0);
            
            console.log(`🎮 InputManager: Key ${key} pressed`);
            
            // Handle special keys immediately
            this.handleSpecialKeys(key);
        }
        
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
        
        if (this.keyStates.has(key)) {
            this.keyStates.set(key, false);
            this.keyTimestamps.set(key, 0);
            this.keyRepeatCounts.set(key, 0);
            
            console.log(`🎮 InputManager: Key ${key} released`);
            
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
        console.log('🎮 InputManager: Window lost focus - resetting all keys');
        this.resetAllKeys();
    }
    
    /**
     * Handle window focus
     */
    handleFocus() {
        console.log('🎮 InputManager: Window gained focus');
        // Optionally reset keys on focus to prevent stuck states
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
                // Unpausing - add pause time to total
                if (this.gameState.pauseStartTime > 0) {
                    this.gameState.totalPausedTime += Date.now() - this.gameState.pauseStartTime;
                    this.gameState.pauseStartTime = 0;
                }
                this.gameState.paused = false;
                console.log('🎮 Game unpaused');
            } else {
                // Pausing - record pause start time
                this.gameState.pauseStartTime = Date.now();
                this.gameState.paused = true;
                console.log('🎮 Game paused');
            }
            return;
        }
        
        // Tactical Nuke activation (Shift key)
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
            this.keyStates.set(key, false);
            this.keyTimestamps.set(key, 0);
            this.keyRepeatCounts.set(key, 0);
            if (this.gameState && this.gameState.keys) {
                this.gameState.keys[key] = false;
            }
        });
        
        console.log('🎮 Tactical nuke activated - movement keys reset');
        
        // Execute nuke logic (existing game logic)
        if (this.gameState.player) {
            const playerX = this.gameState.player.x + this.gameState.player.width / 2;
            const playerY = this.gameState.player.y + this.gameState.player.height / 2;
            
            // Create nuke explosion
            this.gameState.explosions.push({
                x: playerX,
                y: playerY,
                radius: 0,
                maxRadius: 200,
                duration: 1000,
                startTime: Date.now(),
                color: '#ff4444'
            });
            
            // Destroy all aliens
            this.gameState.aliens = [];
            this.gameState.nukeCount--;
            
            // Add visual feedback
            this.gameState.lastNukeTime = Date.now();
        }
    }
    
    /**
     * Start stuck key detection system
     */
    startStuckKeyDetection() {
        if (this.stuckKeyInterval) {
            clearInterval(this.stuckKeyInterval);
        }
        
        this.stuckKeyInterval = setInterval(() => {
            this.detectStuckKeys();
        }, this.config.checkInterval);
    }
    
    /**
     * Stop stuck key detection system
     */
    stopStuckKeyDetection() {
        if (this.stuckKeyInterval) {
            clearInterval(this.stuckKeyInterval);
            this.stuckKeyInterval = null;
        }
    }
    
    /**
     * Detect and release stuck keys
     */
    detectStuckKeys() {
        const currentTime = Date.now();
        
        for (const [key, isPressed] of this.keyStates) {
            if (isPressed) {
                const timestamp = this.keyTimestamps.get(key) || 0;
                const repeatCount = this.keyRepeatCounts.get(key) || 0;
                
                // Check for stuck key conditions
                const timeStuck = currentTime - timestamp;
                const isStuck = timeStuck > this.config.stuckKeyTimeout || 
                               repeatCount > this.config.maxRepeatCount;
                
                if (isStuck) {
                    console.log(`🎮 InputManager: Releasing stuck key ${key} (stuck for ${timeStuck}ms, repeats: ${repeatCount})`);
                    this.keyStates.set(key, false);
                    this.keyTimestamps.set(key, 0);
                    this.keyRepeatCounts.set(key, 0);
                    
                    // Update game state
                    if (this.gameState && this.gameState.keys) {
                        this.gameState.keys[key] = false;
                    }
                } else if (timeStuck > this.config.repeatDelay) {
                    // Increment repeat count for long-held keys
                    this.keyRepeatCounts.set(key, repeatCount + 1);
                }
            }
        }
    }
    
    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(key) {
        return this.keyStates.get(key) || false;
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
        for (const key of this.keyStates.keys()) {
            this.keyStates.set(key, false);
            this.keyTimestamps.set(key, 0);
            this.keyRepeatCounts.set(key, 0);
        }
        
        // Update game state
        if (this.gameState && this.gameState.keys) {
            Object.keys(this.gameState.keys).forEach(key => {
                this.gameState.keys[key] = false;
            });
        }
        
        console.log('🎮 InputManager: All keys reset');
    }
    
    /**
     * Reset specific keys
     */
    resetKeys(keys) {
        keys.forEach(key => {
            this.keyStates.set(key, false);
            this.keyTimestamps.set(key, 0);
            this.keyRepeatCounts.set(key, 0);
            
            if (this.gameState && this.gameState.keys) {
                this.gameState.keys[key] = false;
            }
        });
    }
    
    /**
     * Check if a key is a game-related key
     */
    isGameKey(key) {
        const gameKeys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 'w', 'W', 'Shift', 'p', 'P'];
        return gameKeys.includes(key);
    }
    
    /**
     * Get key statistics for debugging
     */
    getKeyStats() {
        const stats = {};
        for (const [key, isPressed] of this.keyStates) {
            if (isPressed) {
                const timestamp = this.keyTimestamps.get(key) || 0;
                const repeatCount = this.keyRepeatCounts.get(key) || 0;
                stats[key] = {
                    pressed: isPressed,
                    duration: Date.now() - timestamp,
                    repeatCount: repeatCount
                };
            }
        }
        return stats;
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🎮 InputManager: Configuration updated', this.config);
    }
    
    /**
     * Cleanup and destroy the input manager
     */
    destroy() {
        console.log('🎮 InputManager: Cleaning up input system');
        
        // Remove event listeners
        document.removeEventListener('keydown', this.boundKeyDown);
        document.removeEventListener('keyup', this.boundKeyUp);
        window.removeEventListener('blur', this.boundBlur);
        window.removeEventListener('focus', this.boundFocus);
        
        // Stop stuck key detection
        this.stopStuckKeyDetection();
        
        // Clear all data structures
        this.keyStates.clear();
        this.keyTimestamps.clear();
        this.keyRepeatCounts.clear();
        
        // Clear references
        this.gameState = null;
        
        console.log('🎮 InputManager: Cleanup complete');
    }
}

// Export for use in the game
if (typeof window !== 'undefined') {
    window.InputManager = InputManager;
}
