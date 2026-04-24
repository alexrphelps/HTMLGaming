/**
 * Advanced Game Loop Manager for MiniInvaders Game
 * Provides smooth, frame-rate independent game loop with performance optimization
 */

class GameLoop {
    constructor() {
        // Timing and performance tracking
        this.lastFrameTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        this.fpsCounter = 0;
        
        // Target frame rate and timing
        this.targetFPS = 60;
        this.targetFrameTime = 1000 / this.targetFPS;
        this.maxDeltaTime = 50; // Cap delta time to prevent large jumps
        
        // Loop state
        this.isRunning = false;
        this.animationFrameId = null;
        
        // Performance monitoring
        this.performanceStats = {
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            droppedFrames: 0,
            averageFPS: 0
        };
        
        // Callbacks
        this.updateCallback = null;
        this.renderCallback = null;
        
        // Frame skipping for performance
        this.frameSkipThreshold = 16.67; // ~60fps threshold
        this.consecutiveSlowFrames = 0;
        this.maxConsecutiveSlowFrames = 5;
        
        // Adaptive performance
        this.adaptivePerformance = true;
        this.performanceLevel = 'high'; // high, medium, low
        
        console.log('🎮 GameLoop: Initializing advanced game loop system');
    }
    
    /**
     * Set the update callback function
     */
    setUpdateCallback(callback) {
        this.updateCallback = callback;
    }
    
    /**
     * Set the render callback function
     */
    setRenderCallback(callback) {
        this.renderCallback = callback;
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('🎮 GameLoop: Already running');
            return;
        }
        
        this.isRunning = true;
        this.lastFrameTime = performance.now();
        this.fpsUpdateTime = this.lastFrameTime;
        
        console.log('🎮 GameLoop: Starting game loop');
        this.gameLoop();
    }
    
    /**
     * Stop the game loop
     */
    stop() {
        if (!this.isRunning) {
            console.warn('🎮 GameLoop: Not running');
            return;
        }
        
        this.isRunning = false;
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        console.log('🎮 GameLoop: Stopped');
    }
    
    /**
     * Main game loop function
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = currentTime - this.lastFrameTime;
        
        // Cap delta time to prevent large jumps (e.g., tab switching)
        if (this.deltaTime > this.maxDeltaTime) {
            this.deltaTime = this.maxDeltaTime;
        }
        
        // Update performance stats
        this.updatePerformanceStats(currentTime);
        
        // Adaptive performance management
        if (this.adaptivePerformance) {
            this.manageAdaptivePerformance();
        }
        
        // Skip frames if performance is poor
        if (this.shouldSkipFrame()) {
            this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
            return;
        }
        
        // Update game logic
        if (this.updateCallback && !this.shouldSkipUpdate()) {
            const updateStartTime = performance.now();
            this.updateCallback(this.deltaTime);
            this.performanceStats.updateTime = performance.now() - updateStartTime;
        }
        
        // Render frame
        if (this.renderCallback) {
            const renderStartTime = performance.now();
            this.renderCallback();
            this.performanceStats.renderTime = performance.now() - renderStartTime;
        }
        
        // Update frame tracking
        this.lastFrameTime = currentTime;
        this.frameCount++;
        this.consecutiveSlowFrames = 0;
        
        // Continue loop
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Update performance statistics
     */
    updatePerformanceStats(currentTime) {
        // Update FPS counter
        this.fpsCounter++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = this.fpsCounter;
            this.performanceStats.averageFPS = this.fps;
            this.fpsCounter = 0;
            this.fpsUpdateTime = currentTime;
        }
        
        // Track frame time
        this.performanceStats.frameTime = this.deltaTime;
        
        // Detect dropped frames
        if (this.deltaTime > this.targetFrameTime * 1.5) {
            this.performanceStats.droppedFrames++;
        }
    }
    
    /**
     * Determine if frame should be skipped for performance
     */
    shouldSkipFrame() {
        if (this.deltaTime > this.frameSkipThreshold) {
            this.consecutiveSlowFrames++;
            return this.consecutiveSlowFrames < this.maxConsecutiveSlowFrames;
        }
        return false;
    }
    
    /**
     * Determine if update should be skipped
     */
    shouldSkipUpdate() {
        // Skip update if performance is very poor
        return this.performanceLevel === 'low' && this.frameCount % 2 === 0;
    }
    
    /**
     * Manage adaptive performance based on frame rate
     */
    manageAdaptivePerformance() {
        const currentFPS = this.fps;
        
        if (currentFPS < 30) {
            this.performanceLevel = 'low';
        } else if (currentFPS < 45) {
            this.performanceLevel = 'medium';
        } else {
            this.performanceLevel = 'high';
        }
    }
    
    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            currentFPS: this.fps,
            performanceLevel: this.performanceLevel,
            frameCount: this.frameCount,
            isRunning: this.isRunning
        };
    }
    
    /**
     * Set target frame rate
     */
    setTargetFPS(fps) {
        this.targetFPS = fps;
        this.targetFrameTime = 1000 / fps;
        console.log(`🎮 GameLoop: Target FPS set to ${fps}`);
    }
    
    /**
     * Enable or disable adaptive performance
     */
    setAdaptivePerformance(enabled) {
        this.adaptivePerformance = enabled;
        console.log(`🎮 GameLoop: Adaptive performance ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Pause the game loop (but keep it running for resume)
     */
    pause() {
        // This would be handled by the game state, not the loop itself
        console.log('🎮 GameLoop: Game paused (handled by game state)');
    }
    
    /**
     * Resume the game loop
     */
    resume() {
        console.log('🎮 GameLoop: Game resumed');
        // Reset timing to prevent large delta time on resume
        this.lastFrameTime = performance.now();
    }
    
    /**
     * Reset the game loop state
     */
    reset() {
        this.stop();
        this.frameCount = 0;
        this.fps = 0;
        this.fpsCounter = 0;
        this.consecutiveSlowFrames = 0;
        this.performanceLevel = 'high';
        
        // Reset performance stats
        this.performanceStats = {
            frameTime: 0,
            updateTime: 0,
            renderTime: 0,
            droppedFrames: 0,
            averageFPS: 0
        };
        
        console.log('🎮 GameLoop: Reset complete');
    }
    
    /**
     * Get delta time in seconds (for physics calculations)
     */
    getDeltaTimeSeconds() {
        return this.deltaTime / 1000;
    }
    
    /**
     * Get delta time in milliseconds
     */
    getDeltaTimeMs() {
        return this.deltaTime;
    }
    
    /**
     * Check if the game loop is running
     */
    isActive() {
        return this.isRunning;
    }
    
    /**
     * Force a single frame update (for debugging)
     */
    forceFrame() {
        if (this.updateCallback) {
            this.updateCallback(this.deltaTime || 16.67);
        }
        if (this.renderCallback) {
            this.renderCallback();
        }
    }
    
    /**
     * Destroy the game loop and clean up resources
     */
    destroy() {
        console.log('🎮 GameLoop: Destroying game loop');
        this.stop();
        this.updateCallback = null;
        this.renderCallback = null;
    }
}

// Export for use in the game
if (typeof window !== 'undefined') {
    window.GameLoop = GameLoop;
}
