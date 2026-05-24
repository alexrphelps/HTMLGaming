class ScreenController {
    constructor(options = {}) {
        this.document = options.document || (typeof document !== 'undefined' ? document : null);
        this.engine = options.engine || null;
        this.mapConfigs = options.mapConfigs || (typeof MapConfigs !== 'undefined' ? MapConfigs : {});
        this.onShowStash = options.onShowStash || (() => {});
        this.onHideExpandedMinimap = options.onHideExpandedMinimap || (() => {});
        this.eventRegistry = options.eventRegistry || (typeof EventRegistry !== 'undefined' ? new EventRegistry() : null);
        this.screens = this.document ? this.document.querySelectorAll('.screen') : [];
        this.bindMenuEvents();
        this.renderMapSelectionUI();
    }

    showScreen(id) {
        if (!this.document) return;
        this.screens.forEach(screen => screen.classList.remove('active'));
        const nextScreen = this.document.getElementById(id);
        if (nextScreen) nextScreen.classList.add('active');
        this.onHideExpandedMinimap();

        if (id === 'play-screen' && this.engine) {
            this.engine.start();
        } else if (id === 'main-menu' && this.engine) {
            this.engine.stop();
        } else if (id === 'stash-screen') {
            this.onShowStash();
        }
    }

    bindClick(id, handler) {
        const element = this.document ? this.document.getElementById(id) : null;
        if (!element) return;
        if (this.eventRegistry) {
            this.eventRegistry.add(element, 'click', handler);
        } else {
            element.addEventListener('click', handler);
        }
    }

    bindMenuEvents() {
        this.bindClick('btn-start', () => this.showScreen('map-select-screen'));
        this.bindClick('btn-map-select-back', () => this.showScreen('main-menu'));
        this.bindClick('btn-map-random', () => {
            if (this.engine && this.engine.setRunMapSelection) {
                this.engine.setRunMapSelection('random');
            }
            this.showScreen('play-screen');
        });
        this.bindClick('btn-stash', () => this.showScreen('stash-screen'));
        this.bindClick('btn-stash-back', () => this.showScreen('main-menu'));
        this.bindClick('btn-game-over-menu', () => this.showScreen('main-menu'));
    }

    renderMapSelectionUI() {
        const grid = this.document ? this.document.getElementById('map-select-grid') : null;
        if (!grid || !this.mapConfigs) return;

        grid.innerHTML = '';
        Object.entries(this.mapConfigs).forEach(([key, config]) => {
            const button = this.document.createElement('button');
            button.className = 'menu-btn map-select-btn';
            button.dataset.mapKey = key;

            const title = this.document.createElement('span');
            title.className = 'map-option-title';
            title.textContent = config.displayName || key.replace(/_/g, ' ');

            const description = this.document.createElement('span');
            description.className = 'map-option-description';
            description.textContent = config.description || 'Procedural vault layout.';

            const meta = this.document.createElement('span');
            meta.className = 'map-option-meta';
            meta.textContent = `Tier ${config.progressionTier || 1} - ${config.layoutType || 'sequential'}`;

            button.appendChild(title);
            button.appendChild(description);
            button.appendChild(meta);
            const clickHandler = () => {
                if (this.engine && this.engine.setRunMapSelection) {
                    this.engine.setRunMapSelection(key);
                }
                this.showScreen('play-screen');
            };
            if (this.eventRegistry) {
                this.eventRegistry.add(button, 'click', clickHandler);
            } else {
                button.addEventListener('click', clickHandler);
            }

            grid.appendChild(button);
        });
    }

    destroy() {
        if (this.eventRegistry) this.eventRegistry.removeAll();
    }
}

if (typeof window !== 'undefined') {
    window.ScreenController = ScreenController;
}
