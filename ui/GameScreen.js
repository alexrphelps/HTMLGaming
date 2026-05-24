/**
 * Owns the reusable game screen frame.
 */
class GameScreen {
    constructor(options = {}) {
        this.document = options.document || (typeof document !== 'undefined' ? document : null);
        this.addListener = options.addListener || (() => {});
        this.handlers = options.handlers || {};
        this.cleanupListeners = new Set();
    }

    createContent() {
        const fragment = this.document.createDocumentFragment();
        const header = this.document.createElement('div');
        header.className = 'game-header';

        const backBtn = this.document.createElement('button');
        backBtn.id = 'back-to-menu';
        backBtn.className = 'back-btn';
        backBtn.textContent = '< Back to Menu';

        const titleSpan = this.document.createElement('span');
        titleSpan.id = 'current-game-title';
        titleSpan.className = 'game-title';

        header.appendChild(backBtn);
        header.appendChild(titleSpan);

        const container = this.document.createElement('div');
        container.className = 'game-container';

        fragment.appendChild(header);
        fragment.appendChild(container);

        return fragment;
    }

    render(container) {
        if (!container) return;
        this.cleanup();
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(this.createContent());
        this.bindControls();
    }

    bindControls() {
        this.bind('back-to-menu', 'click', this.handlers.back);
    }

    bind(id, event, handler) {
        const el = this.document.getElementById(id);
        if (!el || typeof handler !== 'function') return;
        const cleanup = this.addListener(el, event, handler);
        this.cleanupListeners.add(cleanup);
    }

    setTitle(title) {
        const el = this.document.getElementById('current-game-title');
        if (el) el.textContent = title || '';
    }

    cleanup() {
        for (const cleanup of Array.from(this.cleanupListeners)) {
            try {
                cleanup();
            } catch (error) {
                // Continue cleaning up remaining controls.
            }
        }
        this.cleanupListeners.clear();
    }
}

if (typeof window !== 'undefined') {
    window.GameScreen = GameScreen;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameScreen;
}
