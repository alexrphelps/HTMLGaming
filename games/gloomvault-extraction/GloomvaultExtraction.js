class GloomvaultExtraction {
    constructor() {
        this.metadata = {
            name: 'Gloomvault Extraction',
            description: 'Isometric roguelite dungeon crawler with extraction mechanics and loot progression.',
            category: 'Action RPG',
            difficulty: 'Hard',
            icon: '💎',
            tags: ['roguelite', 'action', 'loot', 'dungeon-crawler'],
            version: '0.1.0',
            author: 'GameHub',
            estimatedPlayTime: 15
        };
        this.gameContainer = null;
        this.iframe = null;
    }

    async init() {
        console.log('🎮 Initializing Gloomvault Extraction');
        this.gameContainer = document.getElementById('game-screen');
        
        if (!this.gameContainer) {
            console.error('❌ Failed to find game container');
            return;
        }

        // Create the iframe
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'games/gloomvault-extraction/index.html';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        
        this.gameContainer.appendChild(this.iframe);

        // Wait for the iframe to load
        await new Promise(resolve => {
            this.iframe.onload = resolve;
        });

        console.log('🎮 Gloomvault Extraction Loaded');
    }

    start() {
        console.log('▶️ Starting Gloomvault Extraction');
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    stop() {
        console.log('⏸️ Pausing Gloomvault Extraction');
        // Implement pause logic if necessary
    }

    cleanup() {
        console.log('🧹 Cleaning up Gloomvault Extraction');
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        this.gameContainer = null;
    }
}

// Export for module systems if needed, but GameHub relies on global scope availability
if (typeof window !== 'undefined') {
    window.GloomvaultExtraction = GloomvaultExtraction;
}