/**
 * InputHandler Class - Handles keyboard input for player movement
 */
class InputHandler {
    constructor() {
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false,
            shift: false
        };
        
        this.keyMappings = {
            // Arrow keys
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            
            // WASD keys
            'KeyA': 'left',
            'KeyD': 'right',
            'KeyW': 'up',
            'KeyS': 'down',
            
            // Additional keys
            'Space': 'space',
            'ShiftLeft': 'shift',
            'ShiftRight': 'shift'
        };
        
        this.eventListeners = [];
        
        console.log('🔬 InputHandler created');
    }
    
    /**
     * Initialize input handling
     */
    init() {
        this.setupEventListeners();
        console.log('🔬 InputHandler initialized');
    }
    
    /**
     * Setup keyboard event listeners
     */
    setupEventListeners() {
        // Keydown event
        const keydownHandler = (event) => {
            this.handleKeyDown(event);
        };
        
        // Keyup event
        const keyupHandler = (event) => {
            this.handleKeyUp(event);
        };
        
        // Prevent default for certain keys to avoid page scrolling
        const preventDefaultHandler = (event) => {
            if (this.shouldPreventDefault(event.code)) {
                event.preventDefault();
            }
        };
        
        // Add event listeners
        document.addEventListener('keydown', keydownHandler);
        document.addEventListener('keyup', keyupHandler);
        document.addEventListener('keydown', preventDefaultHandler);
        
        // Store references for cleanup
        this.eventListeners.push(
            { type: 'keydown', handler: keydownHandler },
            { type: 'keyup', handler: keyupHandler },
            { type: 'keydown', handler: preventDefaultHandler }
        );
        
        console.log('🔬 Input event listeners attached');
    }
    
    /**
     * Handle keydown events
     */
    handleKeyDown(event) {
        const key = this.keyMappings[event.code];
        if (key && this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
        }
    }
    
    /**
     * Handle keyup events
     */
    handleKeyUp(event) {
        const key = this.keyMappings[event.code];
        if (key && this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
    }
    
    /**
     * Check if we should prevent default behavior for a key
     */
    shouldPreventDefault(keyCode) {
        const preventKeys = [
            'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
            'Space'
        ];
        return preventKeys.includes(keyCode);
    }
    
    /**
     * Get current input state
     */
    getInput() {
        return {
            left: this.keys.left,
            right: this.keys.right,
            up: this.keys.up,
            down: this.keys.down,
            space: this.keys.space,
            shift: this.keys.shift
        };
    }
    
    /**
     * Check if any movement key is pressed
     */
    isMoving() {
        return this.keys.left || this.keys.right || this.keys.up || this.keys.down;
    }
    
    /**
     * Get movement direction as normalized vector
     */
    getMovementDirection() {
        let x = 0;
        let y = 0;
        
        if (this.keys.left) x -= 1;
        if (this.keys.right) x += 1;
        if (this.keys.up) y -= 1;
        if (this.keys.down) y += 1;
        
        // Normalize diagonal movement
        if (x !== 0 && y !== 0) {
            const length = Math.sqrt(x * x + y * y);
            x /= length;
            y /= length;
        }
        
        return { x, y };
    }
    
    /**
     * Check if a specific key is currently pressed
     */
    isKeyPressed(key) {
        return this.keys[key] || false;
    }
    
    /**
     * Get input debug info
     */
    getDebugInfo() {
        const pressedKeys = Object.entries(this.keys)
            .filter(([key, pressed]) => pressed)
            .map(([key]) => key);
        
        return {
            pressedKeys,
            movementDirection: this.getMovementDirection(),
            isMoving: this.isMoving()
        };
    }
    
    /**
     * Simulate key press (for testing or programmatic input)
     */
    simulateKeyPress(key, duration = 0) {
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
            
            if (duration > 0) {
                setTimeout(() => {
                    this.keys[key] = false;
                }, duration);
            }
        }
    }
    
    /**
     * Clear all input state
     */
    clearInput() {
        Object.keys(this.keys).forEach(key => {
            this.keys[key] = false;
        });
    }
    
    /**
     * Add custom key mapping
     */
    addKeyMapping(keyCode, action) {
        this.keyMappings[keyCode] = action;
        
        // Initialize the action if it doesn't exist
        if (!this.keys.hasOwnProperty(action)) {
            this.keys[action] = false;
        }
    }
    
    /**
     * Remove key mapping
     */
    removeKeyMapping(keyCode) {
        delete this.keyMappings[keyCode];
    }
    
    /**
     * Get all current key mappings
     */
    getKeyMappings() {
        return { ...this.keyMappings };
    }
    
    /**
     * Cleanup event listeners
     * FIXED: Enhanced cleanup with error handling
     */
    cleanup() {
        console.log('🔬 Cleaning up InputHandler...');
        
        // FIXED: Remove all event listeners with error handling
        this.eventListeners.forEach(({ type, handler }) => {
            try {
                document.removeEventListener(type, handler);
            } catch (error) {
                console.warn(`Failed to remove event listener ${type}:`, error);
            }
        });
        
        this.eventListeners = [];
        this.clearInput();
        
        // FIXED: Additional cleanup to prevent memory leaks
        this.keyMappings = {};
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false,
            space: false,
            shift: false
        };
        
        console.log('✅ InputHandler cleaned up');
    }
}

// Export for use in other modules
window.InputHandler = InputHandler;
