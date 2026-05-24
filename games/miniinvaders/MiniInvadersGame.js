/**
 * Mini Invaders Game Integration for GameHub
 * Uses iframe-based approach for complete isolation and easy integration
 */

class MiniInvadersGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        // Game metadata for GameHub
        this.metadata = {
            name: 'Mini Invaders',
            description: 'Classic Space Invaders! Shoot descending aliens before they reach the bottom. Move with arrow keys, shoot with spacebar!',
            category: 'Arcade',
            difficulty: 'Medium',
            icon: '👾',
            tags: ['2d', 'arcade', 'shooter', 'retro', 'classic'],
            version: '1.0.0',
            author: 'GameHub Team',
            estimatedPlayTime: 10
        };
        
        console.log('👾 Mini Invaders wrapper created (iframe approach)');
    }
    
    /**
     * Initialize the Mini Invaders game within GameHub
     */
    async init() {
        try {
            console.log('👾 Initializing Mini Invaders game with iframe approach...');
            
            // Reset initialization state
            this.isInitialized = false;
            
            // Get the GameHub game container
            this.gameContainer = document.getElementById('game-screen');
            if (!this.gameContainer) {
                console.error('👾 GameHub game screen not found');
                throw new Error('GameHub game screen not found');
            }
            
            // Clear any existing content in the game container
            this.gameContainer.innerHTML = '';
            
            // Create iframe to load the Mini Invaders game
            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/miniinvaders/index.html';
            this.iframe.style.width = '100%';
            this.iframe.style.height = '100%';
            this.iframe.style.border = 'none';
            this.iframe.style.backgroundColor = 'transparent';
            this.iframe.setAttribute('allowfullscreen', 'true');
            this.iframe.setAttribute('webkitallowfullscreen', 'true');
            this.iframe.setAttribute('mozallowfullscreen', 'true');
            this.iframe.setAttribute('tabindex', '0'); // Make iframe focusable
            this.iframe.title = 'Mini Invaders Game';
            
            // Add iframe to container
            this.gameContainer.appendChild(this.iframe);
            
            // Wait for iframe to load
            await new Promise((resolve, reject) => {
                this.iframe.onload = () => {
                    console.log('👾 Mini Invaders iframe loaded successfully');
                    this.isInitialized = true;
                    this.isRunning = true;
                    resolve();
                };
                
                this.iframe.onerror = (error) => {
                    console.error('👾 Error loading Mini Invaders iframe:', error);
                    reject(error);
                };
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!this.isInitialized) {
                        reject(new Error('Mini Invaders iframe load timeout'));
                    }
                }, 10000);
            });
            
            console.log('👾 Mini Invaders initialized successfully (iframe)');
            
        } catch (error) {
            console.error('👾 Error initializing Mini Invaders:', error);
            throw error;
        }
    }
    
    /**
     * Start the Mini Invaders game
     */
    start() {
        if (!this.isInitialized) {
            console.error('👾 Mini Invaders not initialized');
            return;
        }
        
        console.log('👾 Starting Mini Invaders game...');
        
        // Focus the iframe to ensure keyboard input works
        if (this.iframe) {
            this.iframe.focus();
        }
        
        this.isRunning = true;
        console.log('👾 Mini Invaders started');
    }
    
    /**
     * Stop the Mini Invaders game
     */
    stop() {
        console.log('👾 Stopping Mini Invaders game...');
        this.isRunning = false;
        console.log('👾 Mini Invaders stopped');
    }
    
    /**
     * Cleanup method for GameHub integration
     * Called when exiting the game or switching to another game
     */
    cleanup() {
        console.log('👾 Cleaning up Mini Invaders game...');
        
        this.stop();
        
        // Remove iframe from DOM
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        
        // Clear container reference
        this.gameContainer = null;
        this.isInitialized = false;
        
        console.log('👾 Mini Invaders cleanup complete');
    }
    
    /**
     * Optional: Send message to game iframe if needed for future features
     */
    sendMessageToGame(message) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(message, '*');
        }
    }
    
    /**
     * Check if game is currently running
     */
    get isGameRunning() {
        return this.isRunning;
    }
}

// Export for GameHub
if (typeof window !== 'undefined') {
    window.MiniInvadersGame = MiniInvadersGame;
}

