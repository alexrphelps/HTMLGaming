/**
 * Cellvive Game Main Entry Point
 * Initializes and starts the game
 */

// Game instance
let game = null;

/**
 * Initialize the game when the page loads
 */
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create game instance
        game = new CellviveGame();
        
        // Initialize the game
        await game.init();
        
        // Start the game
        game.start();
        
        // Expose game instance globally for talent system access
        window.game = game;
        
    } catch (error) {
        console.error('Failed to start Cellvive game:', error);
        showErrorMessage('Failed to start the game. Please refresh the page and try again.');
    }
});

/**
 * Show error message to user
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        font-size: 16px;
        z-index: 1000;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

/**
 * Handle page unload (cleanup)
 */
window.addEventListener('beforeunload', () => {
    if (game) {
        game.cleanup();
    }
});

/**
 * Debug functions for development
 */
window.debugGame = {
    /**
     * Get game instance
     */
    getGame: () => game,
    
    /**
     * Toggle debug mode
     */
    toggleDebug: () => {
        if (game && game.renderer) {
            const currentSettings = game.renderer.getSettings();
            game.renderer.updateSettings({
                showDebugInfo: !currentSettings.showDebugInfo,
                showGrid: !currentSettings.showGrid
            });
            console.log('🔬 Debug mode toggled');
        }
    },
    
    /**
     * Spawn a test cell
     */
    spawnTestCell: () => {
        if (game && game.player && game.spawnManager) {
            const testCell = game.spawnManager.createRandomCell();
            game.cells.push(testCell);
            console.log('🔬 Test cell spawned');
        }
    },
    
    /**
     * Get game stats
     */
    getStats: () => {
        if (game) {
            return {
                score: game.score,
                gameTime: game.gameTime,
                cellCount: game.cells.length,
                playerRadius: game.player ? game.player.radius : 0,
                playerHealth: game.player ? game.player.health : 0,
                camera: game.camera
            };
        }
        return null;
    },
    
    /**
     * Set player size
     */
    setPlayerSize: (radius) => {
        if (game && game.player) {
            game.player.baseRadius = Math.max(10, Math.min(100, radius));
            console.log(`🔬 Player size set to ${radius}`);
        }
    },
    
    /**
     * Add score
     */
    addScore: (amount) => {
        if (game) {
            game.score += amount;
            console.log(`🔬 Added ${amount} score`);
        }
    },
    
    /**
     * Set world size multiplier
     */
    setWorldSize: (multiplier) => {
        if (game) {
            game.setWorldSizeMultiplier(multiplier);
            console.log(`🔬 World size set to ${multiplier}x`);
        }
    },
    
    /**
     * Get world size info
     */
    getWorldSize: () => {
        if (game) {
            return game.getWorldSizeInfo();
        }
        return null;
    },
    
};

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🎮 Cellvive Debug Functions:');
    console.log('  - debugGame.toggleDebug() - Toggle debug visualization');
    console.log('  - debugGame.spawnTestCell() - Spawn a test cell');
    console.log('  - debugGame.getStats() - Get game statistics');
}
