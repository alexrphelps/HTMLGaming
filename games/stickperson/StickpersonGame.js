/**
 * Stickperson Game Integration for GameHub
 * Simple iframe-based approach to avoid complex DOM manipulation issues
 */

class StickpersonGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        console.log('🦯 Stickperson Game wrapper created (iframe approach)');
    }
    
    /**
     * Initialize the Stickperson game within GameHub
     */
    async init() {
        try {
            console.log('🦯 Initializing Stickperson game with iframe approach...');
            
            // Reset initialization state
            this.isInitialized = false;
            
            // Create game container
            this.createGameContainer();
            
            // Create iframe for the Stickperson game
            this.createStickpersonIframe();
            
            this.isInitialized = true;
            console.log('🦯 Stickperson game initialized successfully');
            
        } catch (error) {
            console.error('🦯 Error initializing Stickperson game:', error);
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
            console.error('🦯 GameHub game screen not found');
            throw new Error('GameHub game screen not found');
        }
        
        // Clear any existing content
        this.gameContainer.innerHTML = '';
        
        console.log('🦯 Game container created');
    }
    
    /**
     * Create iframe for the Stickperson game
     */
    createStickpersonIframe() {
        // Create iframe element
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'games/stickperson/index.html';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.background = '#000';
        this.iframe.title = 'Stickperson Game';
        
        // Add iframe to container
        this.gameContainer.appendChild(this.iframe);
        
        // Wait for iframe to load
        this.iframe.onload = () => {
            console.log('🦯 Stickperson game iframe loaded successfully');
            this.isRunning = true;
        };
        
        this.iframe.onerror = (error) => {
            console.error('🦯 Error loading Stickperson game iframe:', error);
        };
        
        console.log('🦯 Stickperson game iframe created');
    }
    
    /**
     * Start the Stickperson game
     */
    start() {
        if (!this.isInitialized) {
            console.error('🦯 Stickperson game not initialized');
            return;
        }
        
        console.log('🦯 Starting Stickperson game...');
        
        // Focus the iframe to ensure keyboard input works
        if (this.iframe) {
            this.iframe.focus();
        }
        
        console.log('🦯 Stickperson game started');
    }
    
    /**
     * Stop the Stickperson game
     */
    stop() {
        console.log('🦯 Stopping Stickperson game...');
        this.isRunning = false;
        console.log('🦯 Stickperson game stopped');
    }
    
    /**
     * Handle GameHub back button
     */
    handleGameHubBack() {
        console.log('🦯 Handling GameHub back button...');
        this.stop();
        
        // Clean up iframe
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        
        console.log('🦯 Stickperson game cleaned up');
    }
    
    /**
     * Cleanup method for GameHub integration
     */
    async cleanup() {
        console.log('🦯 Cleaning up Stickperson game...');
        this.handleGameHubBack();
        this.isInitialized = false;
        console.log('🦯 Stickperson game cleanup complete');
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
}

// Export for GameHub
window.StickpersonGame = StickpersonGame;


