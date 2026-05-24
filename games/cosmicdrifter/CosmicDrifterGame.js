/**
 * Cosmic Drifter - GameHub Integration Wrapper
 * Integrates the Cosmic Drifter game with the GameHub platform using iframe approach
 */

class CosmicDrifterGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.metadata = {
            name: 'Cosmic Drifter',
            description: 'Explore the cosmos in your hover-craft! Drift through shattered worlds, collect resources, avoid hazards, and upgrade your ship to survive deeper into the unknown.',
            category: 'Exploration',
            difficulty: 'Medium',
            icon: '🚀',
            tags: ['2d', 'exploration', 'survival', 'space', 'open-world', 'upgrades'],
            version: '1.0.0',
            author: 'GameHub Team',
            estimatedPlayTime: 20
        };
        
        console.log('🚀 Cosmic Drifter wrapper created (iframe approach)');
    }
    
    async init() {
        try {
            console.log('🚀 Initializing Cosmic Drifter with iframe approach...');
            
            // Get the game container from GameHub
            this.gameContainer = document.getElementById('game-screen');
            if (!this.gameContainer) {
                console.error('🚀 GameHub game screen not found');
                throw new Error('GameHub game screen not found');
            }

            // Clear any existing content in the game container
            this.gameContainer.innerHTML = '';

            // Create an iframe to load the Cosmic Drifter game
            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/cosmicdrifter/index.html';
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
                    console.log('🚀 Cosmic Drifter iframe loaded.');
                    resolve();
                };
            });

            console.log('🚀 Cosmic Drifter initialized successfully (iframe)');
            
        } catch (error) {
            console.error('🚀 Error initializing Cosmic Drifter:', error);
            throw error;
        }
    }

    start() {
        console.log('🚀 Starting Cosmic Drifter (iframe)...');
        // Focus the iframe to ensure input works
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    stop() {
        console.log('🚀 Stopping Cosmic Drifter (iframe)...');
        // No specific stop logic needed for iframe, as it's removed on cleanup
    }

    cleanup() {
        console.log('🚀 Cleaning up Cosmic Drifter (iframe)...');
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        this.gameContainer = null;
        console.log('🚀 Cosmic Drifter cleaned up (iframe)');
    }

    // Optional: Methods to communicate with the iframe if needed
    sendMessageToGame(message) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(message, '*');
        }
    }
}
