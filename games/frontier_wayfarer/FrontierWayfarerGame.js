class FrontierWayfarerGame {
    constructor() {
        this.iframe = null;
        this.container = null;
        this.metadata = {
            name: 'Frontier Wayfarer',
            description: 'An open-universe starfighter career RPG.',
            category: 'Action RPG', difficulty: 'Medium', icon: 'M2', version: '2.0.0'
        };
    }
    async init() {
        try {
            this.container = document.getElementById('game-screen');
            if (!this.container) throw new Error('GameHub game screen not found');
            this.container.innerHTML = '';
            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/frontier_wayfarer/index.html';
            this.iframe.title = 'Frontier Wayfarer';
            this.iframe.style.cssText = 'width:100%;height:100%;border:0;background:#02070b';
            this.iframe.tabIndex = 0;
            this.container.appendChild(this.iframe);
            await new Promise((resolve, reject) => {
                this.iframe.onload = resolve;
                this.iframe.onerror = () => reject(new Error('Frontier Wayfarer failed to load'));
            });
        } catch (error) {
            console.error('Frontier Wayfarer init failed:', error);
            throw error;
        }
    }
    start() { this.iframe?.focus(); }
    stop() { this.iframe?.contentWindow?.postMessage({ type: 'mini-invaders-v2:pause' }, '*'); }
    cleanup() { this.iframe?.remove(); this.iframe = null; this.container = null; }
}
if (typeof window !== 'undefined') window.FrontierWayfarerGame = FrontierWayfarerGame;
