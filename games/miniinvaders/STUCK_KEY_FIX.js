/**
 * STUCK KEY DETECTION FIX
 * 
 * This is a drop-in replacement for the problematic stuck key detection system.
 * Replace the existing stuck key detection code (lines 3459-3474) with this.
 */

// Replace the existing setInterval with this improved version
const smartStuckKeyDetection = () => {
    const allKeys = ['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', ' ', 'ArrowUp', 'w', 'W'];
    const currentTime = Date.now();
    
    allKeys.forEach(key => {
        if (gameState.keys[key]) {
            // Get individual key timestamp (create if doesn't exist)
            if (!gameState.keyTimestamps) {
                gameState.keyTimestamps = {};
            }
            if (!gameState.keyTimestamps[key]) {
                gameState.keyTimestamps[key] = currentTime;
            }
            
            // Different timeouts for different key types
            let timeout = 5000; // Default 5 seconds
            
            // Movement keys can be held longer
            if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(key)) {
                timeout = 8000; // 8 seconds for movement keys
            }
            // Action keys have shorter timeout
            else if ([' ', 'ArrowUp', 'w', 'W'].includes(key)) {
                timeout = 4000; // 4 seconds for action keys
            }
            
            // Check if key is actually stuck
            const timeHeld = currentTime - gameState.keyTimestamps[key];
            
            // Only release if held for too long AND no recent activity
            if (timeHeld > timeout) {
                // Additional check: has the key been held without any new keydown events?
                const timeSinceLastActivity = currentTime - (gameState.lastKeyActivity || currentTime);
                
                if (timeSinceLastActivity > timeout * 0.7) { // 70% of timeout
                    gameState.keys[key] = false;
                    delete gameState.keyTimestamps[key];
                    console.log(`🔧 Stuck key ${key} automatically released (held for ${timeHeld}ms)`);
                }
            }
        }
    });
};

// Start the improved detection
const stuckKeyInterval = setInterval(smartStuckKeyDetection, 1000); // Check every second

// Also update the keydown event to track individual key timestamps
const originalKeyDownHandler = document.addEventListener;
document.addEventListener('keydown', (e) => {
    // Existing keydown logic...
    gameState.keys[e.key] = true;
    
    // Update individual key timestamps
    if (!gameState.keyTimestamps) {
        gameState.keyTimestamps = {};
    }
    gameState.keyTimestamps[e.key] = Date.now();
    gameState.lastKeyActivity = Date.now();
    
    // Rest of your existing keydown logic...
});

// Update keyup to clear individual timestamps
document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
    
    // Clear individual key timestamp
    if (gameState.keyTimestamps) {
        delete gameState.keyTimestamps[e.key];
    }
    
    // Rest of your existing keyup logic...
});
