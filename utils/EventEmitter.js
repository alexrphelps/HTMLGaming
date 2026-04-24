/**
 * GameHub Event Emitter - Simple event system for decoupled communication
 * Allows objects to subscribe to and emit events without tight coupling
 */
class EventEmitter {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.maxListeners = 50; // Prevent memory leaks
    }
    
    // Add event listener
    on(event, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        
        const listeners = this.events.get(event);
        
        // Check max listeners limit
        if (listeners.length >= this.maxListeners) {
            console.warn(`Maximum listeners (${this.maxListeners}) exceeded for event: ${event}`);
        }
        
        listeners.push({ callback, context });
        return this;
    }
    
    // Add one-time event listener
    once(event, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.onceEvents.has(event)) {
            this.onceEvents.set(event, []);
        }
        
        const listeners = this.onceEvents.get(event);
        listeners.push({ callback, context });
        return this;
    }
    
    // Remove event listener
    off(event, callback = null, context = null) {
        if (!callback) {
            // Remove all listeners for this event
            this.events.delete(event);
            this.onceEvents.delete(event);
            return this;
        }
        
        // Remove specific listener
        const removeFromArray = (listeners) => {
            for (let i = listeners.length - 1; i >= 0; i--) {
                const listener = listeners[i];
                if (listener.callback === callback && 
                    (context === null || listener.context === context)) {
                    listeners.splice(i, 1);
                }
            }
        };
        
        if (this.events.has(event)) {
            removeFromArray(this.events.get(event));
            if (this.events.get(event).length === 0) {
                this.events.delete(event);
            }
        }
        
        if (this.onceEvents.has(event)) {
            removeFromArray(this.onceEvents.get(event));
            if (this.onceEvents.get(event).length === 0) {
                this.onceEvents.delete(event);
            }
        }
        
        return this;
    }
    
    // Emit event to all listeners
    emit(event, ...args) {
        let listenerCount = 0;
        
        // Call regular listeners
        if (this.events.has(event)) {
            const listeners = this.events.get(event).slice(); // Copy array to avoid modification issues
            
            for (const listener of listeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, ...args);
                    } else {
                        listener.callback(...args);
                    }
                    listenerCount++;
                } catch (error) {
                    console.error(`Error in event listener for '${event}':`, error);
                }
            }
        }
        
        // Call one-time listeners
        if (this.onceEvents.has(event)) {
            const listeners = this.onceEvents.get(event).slice();
            this.onceEvents.delete(event); // Remove all once listeners after calling
            
            for (const listener of listeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, ...args);
                    } else {
                        listener.callback(...args);
                    }
                    listenerCount++;
                } catch (error) {
                    console.error(`Error in one-time event listener for '${event}':`, error);
                }
            }
        }
        
        return listenerCount > 0;
    }
    
    // Check if event has listeners
    hasListeners(event) {
        return (this.events.has(event) && this.events.get(event).length > 0) ||
               (this.onceEvents.has(event) && this.onceEvents.get(event).length > 0);
    }
    
    // Get listener count for an event
    listenerCount(event) {
        let count = 0;
        
        if (this.events.has(event)) {
            count += this.events.get(event).length;
        }
        
        if (this.onceEvents.has(event)) {
            count += this.onceEvents.get(event).length;
        }
        
        return count;
    }
    
    // Get all event names that have listeners
    eventNames() {
        const names = new Set();
        
        this.events.forEach((_, event) => names.add(event));
        this.onceEvents.forEach((_, event) => names.add(event));
        
        return Array.from(names);
    }
    
    // Remove all listeners
    removeAllListeners(event = null) {
        if (event) {
            this.events.delete(event);
            this.onceEvents.delete(event);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
        return this;
    }
    
    // Set maximum listeners limit
    setMaxListeners(max) {
        if (typeof max !== 'number' || max < 0) {
            throw new Error('Max listeners must be a non-negative number');
        }
        this.maxListeners = max;
        return this;
    }
    
    // Get maximum listeners limit
    getMaxListeners() {
        return this.maxListeners;
    }
    
    // Pipe events from another emitter
    pipe(sourceEmitter, eventMap = null) {
        if (!(sourceEmitter instanceof EventEmitter)) {
            throw new Error('Source must be an EventEmitter instance');
        }
        
        if (eventMap) {
            // Map specific events
            Object.entries(eventMap).forEach(([sourceEvent, targetEvent]) => {
                sourceEmitter.on(sourceEvent, (...args) => {
                    this.emit(targetEvent, ...args);
                });
            });
        } else {
            // Pipe all events
            const originalEmit = sourceEmitter.emit.bind(sourceEmitter);
            sourceEmitter.emit = (event, ...args) => {
                const result = originalEmit(event, ...args);
                this.emit(event, ...args);
                return result;
            };
        }
        
        return this;
    }
    
    // Create a namespaced emitter
    namespace(prefix) {
        const namespacedEmitter = {
            on: (event, callback, context) => 
                this.on(`${prefix}:${event}`, callback, context),
            once: (event, callback, context) => 
                this.once(`${prefix}:${event}`, callback, context),
            off: (event, callback, context) => 
                this.off(`${prefix}:${event}`, callback, context),
            emit: (event, ...args) => 
                this.emit(`${prefix}:${event}`, ...args),
            hasListeners: (event) => 
                this.hasListeners(`${prefix}:${event}`),
            listenerCount: (event) => 
                this.listenerCount(`${prefix}:${event}`)
        };
        
        return namespacedEmitter;
    }
    
    // Async event emission with Promise support
    async emitAsync(event, ...args) {
        const promises = [];
        
        // Collect all listeners
        const allListeners = [];
        
        if (this.events.has(event)) {
            allListeners.push(...this.events.get(event));
        }
        
        if (this.onceEvents.has(event)) {
            allListeners.push(...this.onceEvents.get(event));
            this.onceEvents.delete(event);
        }
        
        // Call listeners and collect promises
        for (const listener of allListeners) {
            try {
                const result = listener.context 
                    ? listener.callback.call(listener.context, ...args)
                    : listener.callback(...args);
                
                if (result && typeof result.then === 'function') {
                    promises.push(result);
                }
            } catch (error) {
                console.error(`Error in async event listener for '${event}':`, error);
                promises.push(Promise.reject(error));
            }
        }
        
        // Wait for all promises to resolve
        if (promises.length > 0) {
            return Promise.allSettled(promises);
        }
        
        return [];
    }
    
    // Middleware support for event processing
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware must be a function');
        }
        
        const originalEmit = this.emit.bind(this);
        
        this.emit = (event, ...args) => {
            // Call middleware
            const result = middleware(event, args, () => {
                return originalEmit(event, ...args);
            });
            
            return result;
        };
        
        return this;
    }
    
    // Debug information
    debug() {
        const info = {
            totalEvents: this.events.size + this.onceEvents.size,
            regularEvents: {},
            onceEvents: {},
            totalListeners: 0
        };
        
        this.events.forEach((listeners, event) => {
            info.regularEvents[event] = listeners.length;
            info.totalListeners += listeners.length;
        });
        
        this.onceEvents.forEach((listeners, event) => {
            info.onceEvents[event] = listeners.length;
            info.totalListeners += listeners.length;
        });
        
        return info;
    }
    
    // Cleanup
    destroy() {
        this.removeAllListeners();
    }
}

// Make EventEmitter available globally
window.EventEmitter = EventEmitter;