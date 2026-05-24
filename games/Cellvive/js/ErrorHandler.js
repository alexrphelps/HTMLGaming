/**
 * Centralized Error Handler for Cellvive Game
 * Provides consistent error handling and logging across the application
 */
class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.maxErrors = 100; // Prevent memory bloat
        this.errors = [];
        this.isProductionMode = CELLVIVE_CONSTANTS?.LOGGING?.PRODUCTION_MODE || false;
        
        this.setupGlobalErrorHandling();
    }
    
    /**
     * Setup global error handling
     */
    setupGlobalErrorHandling() {
        // Catch unhandled errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, 'Unhandled Error', {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });
        
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'Unhandled Promise Rejection');
        });
    }
    
    /**
     * Handle and log errors with context
     */
    handleError(error, context = 'Unknown', metadata = {}) {
        this.errorCount++;
        
        const errorInfo = {
            id: this.errorCount,
            timestamp: new Date().toISOString(),
            context,
            message: error?.message || String(error),
            stack: error?.stack,
            metadata,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Store error (with rotation to prevent memory bloat)
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }
        
        // Log to console (unless production mode)
        if (!this.isProductionMode) {
            console.error(`[${context}] ${errorInfo.message}`, errorInfo);
        }
        
        // Send to analytics/reporting service in production
        if (this.isProductionMode) {
            this.reportError(errorInfo);
        }
        
        return errorInfo;
    }
    
    /**
     * Safe function execution with error handling
     */
    safeExecute(fn, context = 'Function', fallback = null) {
        try {
            return fn();
        } catch (error) {
            this.handleError(error, context);
            return fallback;
        }
    }
    
    /**
     * Safe async function execution with error handling
     */
    async safeExecuteAsync(fn, context = 'Async Function', fallback = null) {
        try {
            return await fn();
        } catch (error) {
            this.handleError(error, context);
            return fallback;
        }
    }
    
    /**
     * Validate object properties safely
     */
    validateObject(obj, requiredProps = [], context = 'Object Validation') {
        if (!obj || typeof obj !== 'object') {
            this.handleError(new Error('Invalid object provided'), context);
            return false;
        }
        
        for (const prop of requiredProps) {
            if (!(prop in obj)) {
                this.handleError(new Error(`Missing required property: ${prop}`), context);
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Validate numeric values
     */
    validateNumber(value, min = -Infinity, max = Infinity, context = 'Number Validation') {
        if (typeof value !== 'number' || isNaN(value)) {
            this.handleError(new Error(`Invalid number: ${value}`), context);
            return false;
        }
        
        if (value < min || value > max) {
            this.handleError(new Error(`Number out of range: ${value} (${min}-${max})`), context);
            return false;
        }
        
        return true;
    }
    
    /**
     * Safe property access with fallback
     */
    safeGet(obj, path, fallback = undefined) {
        try {
            const keys = path.split('.');
            let current = obj;
            
            for (const key of keys) {
                if (current == null || typeof current !== 'object') {
                    return fallback;
                }
                current = current[key];
            }
            
            return current !== undefined ? current : fallback;
        } catch (error) {
            this.handleError(error, `Safe property access: ${path}`);
            return fallback;
        }
    }
    
    /**
     * Report error to external service (production mode)
     */
    reportError(errorInfo) {
        // In a real application, you would send this to your error tracking service
        // For now, we'll just store it locally
        try {
            const existingErrors = JSON.parse(localStorage.getItem('cellvive_errors') || '[]');
            existingErrors.push(errorInfo);
            
            // Keep only last 50 errors in localStorage
            if (existingErrors.length > 50) {
                existingErrors.splice(0, existingErrors.length - 50);
            }
            
            localStorage.setItem('cellvive_errors', JSON.stringify(existingErrors));
        } catch (storageError) {
            // If localStorage fails, there's not much we can do
            console.warn('Failed to store error in localStorage:', storageError);
        }
    }
    
    /**
     * Get error statistics
     */
    getErrorStats() {
        return {
            totalErrors: this.errorCount,
            recentErrors: this.errors.length,
            lastError: this.errors[this.errors.length - 1] || null
        };
    }
    
    /**
     * Clear error history
     */
    clearErrors() {
        this.errors = [];
        this.errorCount = 0;
    }
    
    /**
     * Create a safe wrapper for methods
     */
    createSafeMethod(instance, methodName, context) {
        const originalMethod = instance[methodName];
        if (typeof originalMethod !== 'function') {
            this.handleError(new Error(`Method ${methodName} is not a function`), context);
            return () => {};
        }
        
        return (...args) => {
            return this.safeExecute(
                () => originalMethod.apply(instance, args),
                `${context}.${methodName}`
            );
        };
    }
}

// Create global error handler instance
window.ErrorHandler = ErrorHandler;
window.gameErrorHandler = new ErrorHandler();

// Add convenience methods to window for easy access
window.safeExecute = (fn, context, fallback) => window.gameErrorHandler.safeExecute(fn, context, fallback);
window.validateObject = (obj, props, context) => window.gameErrorHandler.validateObject(obj, props, context);
window.validateNumber = (value, min, max, context) => window.gameErrorHandler.validateNumber(value, min, max, context);
window.safeGet = (obj, path, fallback) => window.gameErrorHandler.safeGet(obj, path, fallback);
