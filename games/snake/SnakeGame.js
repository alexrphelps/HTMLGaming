/**
 * Snake Game Integration for GameHub
 * Simple iframe-based approach to avoid complex DOM manipulation issues
 */

class SnakeGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        console.log('🐍 Snake Game wrapper created (iframe approach)');
    }
    
    /**
     * Initialize the Snake game within GameHub
     */
    async init() {
        try {
            console.log('🐍 Initializing Snake game with iframe approach...');
            
            // Reset initialization state
            this.isInitialized = false;
            
            // Create game container
            this.createGameContainer();
            
            // Create iframe for the Snake game
            this.createSnakeIframe();
            
            this.isInitialized = true;
            console.log('🐍 Snake game initialized successfully');
            
        } catch (error) {
            console.error('🐍 Error initializing Snake game:', error);
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
            console.error('🐍 GameHub game screen not found');
            throw new Error('GameHub game screen not found');
        }
        
        // Clear any existing content
        this.gameContainer.innerHTML = '';
        
        console.log('🐍 Game container created');
    }
    
    /**
     * Create iframe for the Snake game
     */
    createSnakeIframe() {
        // Create iframe element
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'games/snake/index.html';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.background = '#000';
        this.iframe.title = 'Snake Game';
        
        // Add iframe to container
        this.gameContainer.appendChild(this.iframe);
        
        // Wait for iframe to load
        this.iframe.onload = () => {
            console.log('🐍 Snake game iframe loaded successfully');
            this.isRunning = true;
        };
        
        this.iframe.onerror = (error) => {
            console.error('🐍 Error loading Snake game iframe:', error);
        };
        
        console.log('🐍 Snake game iframe created');
    }
    
    /**
     * Start the Snake game
     */
    start() {
        if (!this.isInitialized) {
            console.error('🐍 Snake game not initialized');
            return;
        }
        
        console.log('🐍 Starting Snake game...');
        
        // Focus the iframe to ensure keyboard input works
        if (this.iframe) {
            this.iframe.focus();
        }
        
        console.log('🐍 Snake game started');
    }
    
    /**
     * Stop the Snake game
     */
    stop() {
        console.log('🐍 Stopping Snake game...');
        this.isRunning = false;
        console.log('🐍 Snake game stopped');
    }
    
    /**
     * Handle GameHub back button
     */
    handleGameHubBack() {
        console.log('🐍 Handling GameHub back button...');
        this.stop();
        
        // Clean up iframe
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        
        console.log('🐍 Snake game cleaned up');
    }
    
    /**
     * Cleanup method for GameHub integration
     */
    async cleanup() {
        console.log('🐍 Cleaning up Snake game...');
        this.handleGameHubBack();
        this.isInitialized = false;
        console.log('🐍 Snake game cleanup complete');
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
window.SnakeGame = SnakeGame;
