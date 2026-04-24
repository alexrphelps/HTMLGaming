/**
 * Sky Squirrel - Wingsuit Game
 * Main entry point for the 3D wingsuit game
 */

class SkySquirrel {
    constructor() {
        this.game = null;
        this.container = document.getElementById('gameContainer');
        this.loadingElement = document.getElementById('loading');
        this.uiElement = document.getElementById('ui');
        this.controlsElement = document.getElementById('controls');
        
        this.init();
    }

    async init() {
        try {
            // Show loading
            this.loadingElement.textContent = 'Initializing game engine...';
            
            // Initialize the game
            this.game = new SkySquirrelGame(this.container);
            
            // Wait for game to be ready
            await this.game.init();
            
            // Hide loading and show UI
            this.loadingElement.style.display = 'none';
            this.uiElement.style.display = 'block';
            this.controlsElement.style.display = 'block';
            
            // Start the game loop
            this.game.start();
            
            console.log('Sky Squirrel initialized successfully!');
            
        } catch (error) {
            console.error('Failed to initialize Sky Squirrel:', error);
            this.loadingElement.textContent = 'Failed to load game. Check console for details.';
        }
    }

    // Handle window resize
    onWindowResize() {
        if (this.game) {
            this.game.onWindowResize();
        }
    }

    // Cleanup on page unload
    destroy() {
        if (this.game) {
            this.game.destroy();
        }
    }
}

// Initialize the game when the page loads
let skySquirrel;

window.addEventListener('DOMContentLoaded', () => {
    skySquirrel = new SkySquirrel();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (skySquirrel) {
        skySquirrel.onWindowResize();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (skySquirrel) {
        skySquirrel.destroy();
    }
});

// Make SkySquirrel available globally
window.SkySquirrel = SkySquirrel;
