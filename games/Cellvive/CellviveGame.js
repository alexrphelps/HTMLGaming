/**
 * Cellvive Game Integration for GameHub
 * Wrapper class that integrates the Cellvive game with the GameHub platform
 */

class CellviveGameWrapper {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.isInitialized = false;
        this.isRunning = false;
        this.isLoading = false;
    }
    
    /**
     * Initialize the Cellvive game within GameHub
     */
    async init() {
        try {
            // Reset initialization state
            this.isInitialized = false;
            this.isLoading = true;
            
            // Create game container
            this.createGameContainer();
            
            // Create iframe for the Cellvive game
            await this.createCellviveIframe();
            
            this.isInitialized = true;
            this.isLoading = false;
            
        } catch (error) {
            console.error('Error initializing Cellvive game:', error);
            this.isLoading = false;
            throw error;
        }
    }
    
    /**
     * Create the game container within GameHub
     */
    createGameContainer() {
        // Use the GameHub's game container
        this.gameContainer = document.getElementById('game-screen');
        if (!this.gameContainer) {
            throw new Error('GameHub game screen not found');
        }
        
        // Clear any existing content
        this.gameContainer.innerHTML = '';
    }
    
    /**
     * Create iframe for the Cellvive game
     */
    createCellviveIframe() {
        return new Promise((resolve, reject) => {
            try {
                // Create iframe element
                this.iframe = document.createElement('iframe');
                this.iframe.src = 'games/Cellvive/index.html';
                this.iframe.style.width = '100%';
                this.iframe.style.height = '100%';
                this.iframe.style.border = 'none';
                this.iframe.style.background = '#000';
                this.iframe.title = 'Cellvive - Cell Survival Game';
                
                // Add iframe to container
                this.gameContainer.appendChild(this.iframe);
                
                // Wait for iframe to load
                this.iframe.onload = () => {
                    this.isRunning = true;
                    resolve();
                };
                
                this.iframe.onerror = (error) => {
                    console.error('Error loading Cellvive game iframe:', error);
                    reject(error);
                };
                
                // Timeout fallback
                setTimeout(() => {
                    if (!this.isRunning) {
                        reject(new Error('Iframe loading timeout'));
                    }
                }, 10000);
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Start the Cellvive game
     */
    start() {
        if (!this.isInitialized) {
            console.error('Cellvive game not initialized');
            return;
        }
        
        // Focus the iframe to ensure keyboard input works
        if (this.iframe) {
            this.iframe.focus();
        }
    }
    
    /**
     * Stop the Cellvive game
     */
    stop() {
        this.isRunning = false;
    }
    
    /**
     * Handle GameHub back button
     */
    handleGameHubBack() {
        this.stop();
        this.cleanupIframe();
    }
    
    /**
     * Clean up iframe resources
     */
    cleanupIframe() {
        if (this.iframe) {
            try {
                if (this.iframe.parentNode) {
                    this.iframe.parentNode.removeChild(this.iframe);
                }
            } catch (error) {
                console.warn('Error removing iframe:', error);
            }
            this.iframe = null;
        }
    }
    
    /**
     * Cleanup method for GameHub integration
     */
    async cleanup() {
        this.cleanupIframe();
        this.isInitialized = false;
        this.isLoading = false;
    }
    
    /**
     * Check if game is running
     */
    get isGameRunning() {
        return this.isRunning;
    }
    
    /**
     * Check if game is paused (not applicable for iframe approach)
     */
    get isPaused() {
        return false;
    }
    
    /**
     * Resume game (not applicable for iframe approach)
     */
    resume() {
        // Not applicable for iframe approach
    }
    
    /**
     * Pause game (not applicable for iframe approach)
     */
    pause() {
        // Not applicable for iframe approach
    }
    
    /**
     * Reset the game (restart)
     */
    reset() {
        console.log('🔬 Resetting Cellvive game...');
        
        // Reload the iframe to reset the game
        if (this.iframe) {
            this.iframe.src = this.iframe.src;
        }
        
        console.log('🔬 Cellvive game reset');
    }
}

// Export for GameHub
window.CellviveGame = CellviveGameWrapper;
