/**
 * Block Dodge Game Integration for GameHub
 * Uses iframe-based approach for complete isolation and easy integration
 */

class BlockDodgeGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.isInitialized = false;
        this.isRunning = false;
        
        // Game metadata for GameHub
        this.metadata = {
            name: 'Block Dodge',
            description: 'Test your reflexes! Control a square and dodge falling blocks as the difficulty increases. How long can you survive?',
            category: 'Arcade',
            difficulty: 'Easy',
            icon: '⬛',
            tags: ['2d', 'arcade', 'reflex', 'survival'],
            version: '1.0.0',
            author: 'GameHub Team',
            estimatedPlayTime: 5
        };
        
        console.log('⬛ Block Dodge wrapper created (iframe approach)');
    }
    
    /**
     * Initialize the Block Dodge game within GameHub
     */
    async init() {
        try {
            console.log('⬛ Initializing Block Dodge game with iframe approach...');
            
            // Reset initialization state
            this.isInitialized = false;
            
            // Get the GameHub game container
            this.gameContainer = document.getElementById('game-screen');
            if (!this.gameContainer) {
                console.error('⬛ GameHub game screen not found');
                throw new Error('GameHub game screen not found');
            }
            
            // Clear any existing content in the game container
            this.gameContainer.innerHTML = '';
            
            // Create iframe to load the Block Dodge game
            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/blockdodge/index.html';
            this.iframe.style.width = '100%';
            this.iframe.style.height = '100%';
            this.iframe.style.border = 'none';
            this.iframe.style.backgroundColor = 'transparent';
            this.iframe.setAttribute('allowfullscreen', 'true');
            this.iframe.setAttribute('webkitallowfullscreen', 'true');
            this.iframe.setAttribute('mozallowfullscreen', 'true');
            this.iframe.setAttribute('tabindex', '0'); // Make iframe focusable
            this.iframe.title = 'Block Dodge Game';
            
            // Add iframe to container
            this.gameContainer.appendChild(this.iframe);
            
            // Wait for iframe to load
            await new Promise((resolve, reject) => {
                this.iframe.onload = () => {
                    console.log('⬛ Block Dodge iframe loaded successfully');
                    this.isInitialized = true;
                    this.isRunning = true;
                    resolve();
                };
                
                this.iframe.onerror = (error) => {
                    console.error('⬛ Error loading Block Dodge iframe:', error);
                    reject(error);
                };
                
                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!this.isInitialized) {
                        reject(new Error('Block Dodge iframe load timeout'));
                    }
                }, 10000);
            });
            
            console.log('⬛ Block Dodge initialized successfully (iframe)');
            
        } catch (error) {
            console.error('⬛ Error initializing Block Dodge:', error);
            throw error;
        }
    }
    
    /**
     * Start the Block Dodge game
     */
    start() {
        if (!this.isInitialized) {
            console.error('⬛ Block Dodge not initialized');
            return;
        }
        
        console.log('⬛ Starting Block Dodge game...');
        
        // Focus the iframe to ensure keyboard input works
        if (this.iframe) {
            this.iframe.focus();
        }
        
        this.isRunning = true;
        console.log('⬛ Block Dodge started');
    }
    
    /**
     * Stop the Block Dodge game
     */
    stop() {
        console.log('⬛ Stopping Block Dodge game...');
        this.isRunning = false;
        console.log('⬛ Block Dodge stopped');
    }
    
    /**
     * Cleanup method for GameHub integration
     * Called when exiting the game or switching to another game
     */
    cleanup() {
        console.log('⬛ Cleaning up Block Dodge game...');
        
        this.stop();
        
        // Remove iframe from DOM
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        
        // Clear container reference
        this.gameContainer = null;
        this.isInitialized = false;
        
        console.log('⬛ Block Dodge cleanup complete');
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
    window.BlockDodgeGame = BlockDodgeGame;
}

