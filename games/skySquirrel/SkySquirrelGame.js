/**
 * SkySquirrelGame.js - GameHub integration wrapper for Sky Squirrel wingsuit game
 * Uses iframe integration pattern for complete game isolation
 */

class SkySquirrelGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.metadata = {
            name: 'Sky Squirrel',
            description: '3D wingsuit flying game - Jump off a mountain peak and soar through the sky',
            category: 'Action',
            difficulty: 'Medium',
            icon: '🪂',
            tags: ['3d', 'action', 'simulation', 'wingsuit', 'flying'],
            version: '1.0.0',
            author: 'GameHub Team',
            estimatedPlayTime: 15
        };
        
        console.log('🪂 Sky Squirrel wrapper created (iframe approach)');
    }
    
    async init() {
        try {
            console.log('🪂 Initializing Sky Squirrel with iframe approach...');
            
            // Get the game container from GameHub
            this.gameContainer = document.getElementById('game-screen');
            if (!this.gameContainer) {
                console.error('🪂 GameHub game screen not found');
                throw new Error('GameHub game screen not found');
            }

            // Clear any existing content in the game container
            this.gameContainer.innerHTML = '';

            // Create an iframe to load the Sky Squirrel game
            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/skySquirrel/index.html';
            this.iframe.style.width = '100%';
            this.iframe.style.height = '100%';
            this.iframe.style.border = 'none';
            this.iframe.style.backgroundColor = 'var(--background-primary)'; // Match GameHub background
            this.iframe.setAttribute('allowfullscreen', 'true');
            this.iframe.setAttribute('webkitallowfullscreen', 'true');
            this.iframe.setAttribute('mozallowfullscreen', 'true');
            this.iframe.setAttribute('tabindex', '0'); // Make iframe focusable

            this.gameContainer.appendChild(this.iframe);

            // Wait for the iframe to load
            await new Promise(resolve => {
                this.iframe.onload = () => {
                    console.log('🪂 Sky Squirrel iframe loaded.');
                    resolve();
                };
            });

            console.log('🪂 Sky Squirrel initialized successfully (iframe)');
            
        } catch (error) {
            console.error('🪂 Error initializing Sky Squirrel:', error);
            throw error;
        }
    }

    start() {
        console.log('🪂 Starting Sky Squirrel (iframe)...');
        // Focus the iframe to ensure input works
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    stop() {
        console.log('🪂 Stopping Sky Squirrel (iframe)...');
        // No specific stop logic needed for iframe, as it's removed on cleanup
    }

    cleanup() {
        console.log('🪂 Cleaning up Sky Squirrel (iframe)...');
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        this.gameContainer = null;
        console.log('🪂 Sky Squirrel cleaned up (iframe)');
    }

    // Optional: Methods to communicate with the iframe if needed
    sendMessageToGame(message) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(message, '*');
        }
    }

    // Handle GameHub back button
    handleGameHubBack() {
        console.log('🪂 Handling GameHub back button...');
        // Send message to game to handle back button
        this.sendMessageToGame({ type: 'gamehub:back' });
    }
}
