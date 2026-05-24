class ColorStreamReactorGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.metadata = {
            name: 'Color Stream Reactor',
            description: 'Match neon energy colors before the falling stream overloads the reactor.',
            category: 'Arcade',
            difficulty: 'Medium',
            icon: 'CSR',
            tags: ['arcade', 'reflex', 'color-match', 'neon'],
            version: '1.0.0',
            author: 'GameHub',
            estimatedPlayTime: 5
        };
    }

    async init() {
        try {
            this.gameContainer = document.getElementById('game-screen');
            if (!this.gameContainer) {
                throw new Error('GameHub game screen not found');
            }

            this.gameContainer.innerHTML = '';

            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/color_stream_reactor/index.html';
            this.iframe.style.width = '100%';
            this.iframe.style.height = '100%';
            this.iframe.style.border = 'none';
            this.iframe.style.backgroundColor = '#050816';
            this.iframe.setAttribute('allowfullscreen', 'true');
            this.iframe.setAttribute('tabindex', '0');

            this.gameContainer.appendChild(this.iframe);

            await new Promise(resolve => {
                this.iframe.onload = () => resolve();
            });

        } catch (error) {
            console.error('ColorStreamReactor init failed:', error);
            throw error;
        }
    }

    start() {
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    stop() {
    }

    cleanup() {
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        this.gameContainer = null;
    }
}
