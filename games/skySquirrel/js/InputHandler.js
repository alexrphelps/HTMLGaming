/**
 * InputHandler.js - Keyboard and mouse input handling
 * Captures user input and converts it to game actions
 */

class SkySquirrelInputHandler {
    constructor() {
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            isLocked: false
        };
        
        this.onInput = null; // Callback function for input events
        this.onMouseMoveCallback = null; // Callback function for mouse movement
        this.onScrollCallback = null; // Callback function for scroll events
        
        // Bind methods to preserve context
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
        this.onMouseUp = this.onMouseUp.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);
    }

    init() {
        // Keyboard event listeners
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        
        // Mouse event listeners
        document.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);
        document.addEventListener('mouseup', this.onMouseUp);
        document.addEventListener('wheel', this.onWheel);
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', this.onPointerLockChange);
        document.addEventListener('pointerlockerror', () => {
            console.warn('Pointer lock failed');
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => e.preventDefault());
        
        console.log('Input handler initialized');
    }

    onKeyDown(event) {
        this.keys[event.code] = true;
        this.processInput();
        
        // Handle special keys
        switch (event.code) {
            case 'Escape':
                this.exitPointerLock();
                break;
        }
    }

    onKeyUp(event) {
        this.keys[event.code] = false;
        this.processInput();
    }

    onMouseMove(event) {
        if (this.mouse.isLocked) {
            this.mouse.deltaX = event.movementX || 0;
            this.mouse.deltaY = event.movementY || 0;
            this.mouse.x += this.mouse.deltaX;
            this.mouse.y += this.mouse.deltaY;
            
            // Clamp mouse Y to prevent over-rotation
            this.mouse.y = Math.max(-90, Math.min(90, this.mouse.y));
            
            // Call mouse move callback for camera control
            if (this.onMouseMoveCallback) {
                this.onMouseMoveCallback(this.mouse.deltaX, this.mouse.deltaY);
            }
        }
        
        this.processInput();
    }

    onMouseDown(event) {
        if (event.button === 0) { // Left click
            this.requestPointerLock();
        }
    }

    onMouseUp(event) {
        // Handle mouse up events if needed
    }

    onWheel(event) {
        event.preventDefault();
        
        // Call scroll callback for camera zoom
        if (this.onScrollCallback) {
            this.onScrollCallback(event.deltaY);
        }
    }

    onPointerLockChange() {
        this.mouse.isLocked = document.pointerLockElement === document.body;
    }

    requestPointerLock() {
        if (!this.mouse.isLocked) {
            document.body.requestPointerLock();
        }
    }

    exitPointerLock() {
        if (this.mouse.isLocked) {
            document.exitPointerLock();
        }
    }

    processInput() {
        if (!this.onInput) return;

        // Process keyboard input
        const input = {
            forward: this.keys['KeyW'] || false,
            backward: this.keys['KeyS'] || false,
            left: this.keys['KeyA'] || false,
            right: this.keys['KeyD'] || false,
            jump: this.keys['Space'] || false,
            rollLeft: this.keys['KeyQ'] || false,  // Q key for roll left
            rollRight: this.keys['KeyE'] || false  // E key for roll right
        };

        // Send input to callback
        this.onInput(input);
    }

    isKeyPressed(keyCode) {
        return this.keys[keyCode] || false;
    }

    getMousePosition() {
        return {
            x: this.mouse.x,
            y: this.mouse.y
        };
    }

    isPointerLocked() {
        return this.mouse.isLocked;
    }

    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        document.removeEventListener('mouseup', this.onMouseUp);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        
        // Exit pointer lock if active
        this.exitPointerLock();
        
        console.log('Input handler destroyed');
    }
}
