/**
 * Memory Management System for MiniInvaders Game
 * Handles cleanup, prevents memory leaks, and manages resource lifecycle
 */

class MemoryManager {
    constructor() {
        // Resource tracking
        this.eventListeners = new Map();
        this.intervals = new Set();
        this.timeouts = new Set();
        this.observers = new Set();
        
        // Object references for cleanup
        this.gameObjects = new Set();
        this.audioElements = new Set();
        this.canvasElements = new Set();
        
        // Memory monitoring
        this.memoryStats = {
            eventListeners: 0,
            intervals: 0,
            timeouts: 0,
            observers: 0,
            gameObjects: 0,
            totalMemory: 0
        };
        
        // Cleanup callbacks
        this.cleanupCallbacks = new Set();
        
        console.log('🧠 MemoryManager: Initializing memory management system');
    }
    
    /**
     * Register an event listener for automatic cleanup
     */
    registerEventListener(element, event, handler, options = {}) {
        const id = `${element.tagName || 'document'}_${event}_${Date.now()}`;
        
        element.addEventListener(event, handler, options);
        
        this.eventListeners.set(id, {
            element: element,
            event: event,
            handler: handler,
            options: options
        });
        
        this.updateMemoryStats();
        
        console.log(`🧠 MemoryManager: Registered event listener ${id}`);
        return id;
    }
    
    /**
     * Unregister a specific event listener
     */
    unregisterEventListener(id) {
        const listener = this.eventListeners.get(id);
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            this.eventListeners.delete(id);
            this.updateMemoryStats();
            console.log(`🧠 MemoryManager: Unregistered event listener ${id}`);
        }
    }
    
    /**
     * Register an interval for automatic cleanup
     */
    registerInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.intervals.add(intervalId);
        this.updateMemoryStats();
        
        console.log(`🧠 MemoryManager: Registered interval ${intervalId}`);
        return intervalId;
    }
    
    /**
     * Clear a specific interval
     */
    clearInterval(intervalId) {
        if (this.intervals.has(intervalId)) {
            clearInterval(intervalId);
            this.intervals.delete(intervalId);
            this.updateMemoryStats();
            console.log(`🧠 MemoryManager: Cleared interval ${intervalId}`);
        }
    }
    
    /**
     * Register a timeout for automatic cleanup
     */
    registerTimeout(callback, delay) {
        const timeoutId = setTimeout(callback, delay);
        this.timeouts.add(timeoutId);
        this.updateMemoryStats();
        
        console.log(`🧠 MemoryManager: Registered timeout ${timeoutId}`);
        return timeoutId;
    }
    
    /**
     * Clear a specific timeout
     */
    clearTimeout(timeoutId) {
        if (this.timeouts.has(timeoutId)) {
            clearTimeout(timeoutId);
            this.timeouts.delete(timeoutId);
            this.updateMemoryStats();
            console.log(`🧠 MemoryManager: Cleared timeout ${timeoutId}`);
        }
    }
    
    /**
     * Register a MutationObserver for automatic cleanup
     */
    registerObserver(observer) {
        this.observers.add(observer);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Registered observer');
        return observer;
    }
    
    /**
     * Disconnect a specific observer
     */
    disconnectObserver(observer) {
        if (this.observers.has(observer)) {
            observer.disconnect();
            this.observers.delete(observer);
            this.updateMemoryStats();
            console.log('🧠 MemoryManager: Disconnected observer');
        }
    }
    
    /**
     * Register a game object for cleanup tracking
     */
    registerGameObject(obj) {
        this.gameObjects.add(obj);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Registered game object');
    }
    
    /**
     * Unregister a game object
     */
    unregisterGameObject(obj) {
        this.gameObjects.delete(obj);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Unregistered game object');
    }
    
    /**
     * Register an audio element for cleanup
     */
    registerAudioElement(audio) {
        this.audioElements.add(audio);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Registered audio element');
    }
    
    /**
     * Unregister an audio element
     */
    unregisterAudioElement(audio) {
        this.audioElements.delete(audio);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Unregistered audio element');
    }
    
    /**
     * Register a canvas element for cleanup
     */
    registerCanvasElement(canvas) {
        this.canvasElements.add(canvas);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Registered canvas element');
    }
    
    /**
     * Unregister a canvas element
     */
    unregisterCanvasElement(canvas) {
        this.canvasElements.delete(canvas);
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Unregistered canvas element');
    }
    
    /**
     * Add a cleanup callback
     */
    addCleanupCallback(callback) {
        this.cleanupCallbacks.add(callback);
        console.log('🧠 MemoryManager: Added cleanup callback');
    }
    
    /**
     * Remove a cleanup callback
     */
    removeCleanupCallback(callback) {
        this.cleanupCallbacks.delete(callback);
        console.log('🧠 MemoryManager: Removed cleanup callback');
    }
    
    /**
     * Update memory statistics
     */
    updateMemoryStats() {
        this.memoryStats.eventListeners = this.eventListeners.size;
        this.memoryStats.intervals = this.intervals.size;
        this.memoryStats.timeouts = this.timeouts.size;
        this.memoryStats.observers = this.observers.size;
        this.memoryStats.gameObjects = this.gameObjects.size;
        
        // Calculate total memory usage estimate
        this.memoryStats.totalMemory = 
            this.memoryStats.eventListeners * 64 + // ~64 bytes per listener
            this.memoryStats.intervals * 32 +      // ~32 bytes per interval
            this.memoryStats.timeouts * 32 +       // ~32 bytes per timeout
            this.memoryStats.observers * 128 +     // ~128 bytes per observer
            this.memoryStats.gameObjects * 256;    // ~256 bytes per game object
    }
    
    /**
     * Get current memory statistics
     */
    getMemoryStats() {
        this.updateMemoryStats();
        return { ...this.memoryStats };
    }
    
    /**
     * Clean up all registered resources
     */
    cleanup() {
        console.log('🧠 MemoryManager: Starting comprehensive cleanup');
        
        // Execute cleanup callbacks first
        for (const callback of this.cleanupCallbacks) {
            try {
                callback();
            } catch (error) {
                console.error('🧠 MemoryManager: Error in cleanup callback:', error);
            }
        }
        
        // Remove all event listeners
        for (const [id, listener] of this.eventListeners) {
            try {
                listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            } catch (error) {
                console.error(`🧠 MemoryManager: Error removing event listener ${id}:`, error);
            }
        }
        this.eventListeners.clear();
        
        // Clear all intervals
        for (const intervalId of this.intervals) {
            try {
                clearInterval(intervalId);
            } catch (error) {
                console.error(`🧠 MemoryManager: Error clearing interval ${intervalId}:`, error);
            }
        }
        this.intervals.clear();
        
        // Clear all timeouts
        for (const timeoutId of this.timeouts) {
            try {
                clearTimeout(timeoutId);
            } catch (error) {
                console.error(`🧠 MemoryManager: Error clearing timeout ${timeoutId}:`, error);
            }
        }
        this.timeouts.clear();
        
        // Disconnect all observers
        for (const observer of this.observers) {
            try {
                observer.disconnect();
            } catch (error) {
                console.error('🧠 MemoryManager: Error disconnecting observer:', error);
            }
        }
        this.observers.clear();
        
        // Clean up game objects
        for (const obj of this.gameObjects) {
            try {
                if (obj && typeof obj.destroy === 'function') {
                    obj.destroy();
                } else if (obj && typeof obj.cleanup === 'function') {
                    obj.cleanup();
                }
            } catch (error) {
                console.error('🧠 MemoryManager: Error cleaning up game object:', error);
            }
        }
        this.gameObjects.clear();
        
        // Clean up audio elements
        for (const audio of this.audioElements) {
            try {
                audio.pause();
                audio.src = '';
                audio.load();
            } catch (error) {
                console.error('🧠 MemoryManager: Error cleaning up audio element:', error);
            }
        }
        this.audioElements.clear();
        
        // Clean up canvas elements
        for (const canvas of this.canvasElements) {
            try {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            } catch (error) {
                console.error('🧠 MemoryManager: Error cleaning up canvas element:', error);
            }
        }
        this.canvasElements.clear();
        
        // Clear cleanup callbacks
        this.cleanupCallbacks.clear();
        
        // Update stats
        this.updateMemoryStats();
        
        console.log('🧠 MemoryManager: Cleanup complete');
    }
    
    /**
     * Force garbage collection (if available)
     */
    forceGarbageCollection() {
        if (window.gc && typeof window.gc === 'function') {
            try {
                window.gc();
                console.log('🧠 MemoryManager: Forced garbage collection');
            } catch (error) {
                console.warn('🧠 MemoryManager: Garbage collection not available');
            }
        }
    }
    
    /**
     * Monitor memory usage and log warnings if high
     */
    monitorMemory() {
        const stats = this.getMemoryStats();
        
        if (stats.totalMemory > 10000) { // 10KB threshold
            console.warn('🧠 MemoryManager: High memory usage detected:', stats);
        }
        
        // Log memory stats periodically
        if (stats.eventListeners > 50 || stats.intervals > 10) {
            console.log('🧠 MemoryManager: Memory stats:', stats);
        }
    }
    
    /**
     * Create a managed wrapper for setInterval
     */
    createManagedInterval(callback, delay) {
        const intervalId = this.registerInterval(callback, delay);
        
        // Return a wrapper that can be cancelled
        return {
            id: intervalId,
            cancel: () => this.clearInterval(intervalId)
        };
    }
    
    /**
     * Create a managed wrapper for setTimeout
     */
    createManagedTimeout(callback, delay) {
        const timeoutId = this.registerTimeout(callback, delay);
        
        // Return a wrapper that can be cancelled
        return {
            id: timeoutId,
            cancel: () => this.clearTimeout(timeoutId)
        };
    }
    
    /**
     * Create a managed wrapper for addEventListener
     */
    createManagedEventListener(element, event, handler, options = {}) {
        const id = this.registerEventListener(element, event, handler, options);
        
        // Return a wrapper that can be removed
        return {
            id: id,
            remove: () => this.unregisterEventListener(id)
        };
    }
}

// Export for use in the game
if (typeof window !== 'undefined') {
    window.MemoryManager = MemoryManager;
}
