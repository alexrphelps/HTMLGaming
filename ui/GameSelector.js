/**
 * GameHub Game Selector - Manages configured games, ordering, and loading.
 */
const GameHubGameMetadata = (typeof window !== 'undefined' && window.GameMetadata)
    ? window.GameMetadata
    : (typeof require === 'function' ? require('../utils/GameMetadata') : null);

const GameHubSafeStorage = (typeof window !== 'undefined' && window.SafeStorage)
    ? window.SafeStorage
    : (typeof require === 'function' ? require('../utils/SafeStorage') : null);

const GAMEHUB_DEFAULT_LIBRARY_SECTIONS = [
    { id: 'polished', label: 'Polished' },
    { id: 'ai-slope', label: 'AI Slope' }
];

class GameHubIframeGame {
    constructor(folder, metadata = {}) {
        this.folder = folder;
        this.metadata = metadata;
        this.gameContainer = null;
        this.iframe = null;
        this.isInitialized = false;
        this.isRunning = false;
    }

    async init() {
        this.gameContainer = document.querySelector('#game-screen .game-container') || document.getElementById('game-screen');
        if (!this.gameContainer) {
            throw new Error('GameHub game screen not found');
        }

        while (this.gameContainer.firstChild) {
            this.gameContainer.removeChild(this.gameContainer.firstChild);
        }

        this.iframe = document.createElement('iframe');
        this.iframe.src = `games/${encodeURIComponent(this.folder)}/index.html`;
        this.iframe.title = `${this.metadata.name || this.folder} Game`;
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.background = 'var(--background-primary)';
        this.iframe.setAttribute('allowfullscreen', 'true');
        this.iframe.setAttribute('webkitallowfullscreen', 'true');
        this.iframe.setAttribute('mozallowfullscreen', 'true');
        this.iframe.setAttribute('tabindex', '0');

        this.gameContainer.appendChild(this.iframe);

        await new Promise((resolve, reject) => {
            const gamePath = `games/${this.folder}/index.html`;
            const timeout = setTimeout(() => reject(new Error(`Game iframe load timeout for ${gamePath}`)), 10000);
            this.iframe.onload = () => {
                clearTimeout(timeout);
                this.isInitialized = true;
                this.isRunning = true;
                resolve();
            };
            this.iframe.onerror = () => {
                clearTimeout(timeout);
                reject(new Error(`Failed to load games/${this.folder}/index.html`));
            };
        });
    }

    start() {
        this.isRunning = true;
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    stop() {
        this.isRunning = false;
    }

    cleanup() {
        this.stop();
        if (this.iframe) {
            this.iframe.remove();
            this.iframe = null;
        }
        this.gameContainer = null;
        this.isInitialized = false;
    }
}

class GameSelector {
    constructor() {
        this.games = new Map();
        this.filteredGames = [];
        this.filteredGamesBySection = [];
        this.currentFilter = 'all';
        this.currentSort = 'original';
        this.searchTerm = '';
        this.isReorderMode = false;
        this.orderStorageKey = 'gamehub-game-order';
        this.ratingStorageKey = 'gamehub-game-ratings';
        this.favoriteStorageKey = 'gamehub-game-favorites';
        this.recentStorageKey = 'gamehub-game-recent';
        this.storage = GameHubSafeStorage ? new GameHubSafeStorage('gamehub') : null;
        this.userRatings = {};
        this.favoriteGames = {};
        this.recentlyPlayed = {};
        this.librarySections = [];
        this.librarySectionLookup = new Map();
        this.defaultLibrarySectionId = GAMEHUB_DEFAULT_LIBRARY_SECTIONS[0].id;

        this.gamesGrid = null;
        this.searchInput = null;
        this.filterSelect = null;
        this.sortSelect = null;
        this.reorderToggle = null;
        this.resetOrderButton = null;
        this.listenerCleanups = new Set();

        this.eventEmitter = new EventEmitter();

        console.log('GameSelector initialized');
    }

    async init() {
        this.gamesGrid = document.getElementById('games-grid');
        this.searchInput = document.getElementById('games-search');
        this.filterSelect = document.getElementById('games-filter');
        this.sortSelect = document.getElementById('games-sort');
        this.reorderToggle = document.getElementById('games-reorder-toggle');
        this.resetOrderButton = document.getElementById('games-reset-order');

        this.setupEventListeners();
        this.loadLibrarySections();
        this.loadGames();
        this.updateGamesList();

        console.log('GameSelector ready');
    }

    setupEventListeners() {
        if (this.searchInput) {
            this.addManagedListener(this.searchInput, 'input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateGamesList();
            });
        }

        if (this.filterSelect) {
            this.addManagedListener(this.filterSelect, 'change', (e) => {
                this.currentFilter = e.target.value;
                this.updateGamesList();
            });
        }

        if (this.sortSelect) {
            this.addManagedListener(this.sortSelect, 'change', (e) => {
                this.currentSort = e.target.value;
                this.updateReorderControls();
                this.updateGamesList();
            });
        }

        if (this.reorderToggle) {
            this.addManagedListener(this.reorderToggle, 'click', () => {
                this.isReorderMode = !this.isReorderMode;
                this.currentSort = 'original';
                if (this.sortSelect) this.sortSelect.value = 'original';
                this.updateReorderControls();
                this.updateGamesList();
            });
        }

        if (this.resetOrderButton) {
            this.addManagedListener(this.resetOrderButton, 'click', () => this.resetGameOrder());
        }
    }

    addManagedListener(target, event, handler, options) {
        if (!target || !target.addEventListener) return () => {};

        target.addEventListener(event, handler, options);
        const cleanup = () => {
            try {
                target.removeEventListener(event, handler, options);
            } catch (error) {
                // Ignore cleanup errors for detached DOM nodes.
            }
            this.listenerCleanups.delete(cleanup);
        };
        this.listenerCleanups.add(cleanup);
        return cleanup;
    }

    cleanupEventListeners() {
        for (const cleanup of Array.from(this.listenerCleanups)) {
            try {
                cleanup();
            } catch (error) {
                // Continue cleaning up remaining listeners.
            }
        }
        this.listenerCleanups.clear();
    }

    loadLibrarySections() {
        this.librarySections = this.getConfiguredLibrarySections();
        this.librarySectionLookup = new Map(this.librarySections.map(section => [section.id, section]));
        this.defaultLibrarySectionId = this.librarySections[0]?.id || GAMEHUB_DEFAULT_LIBRARY_SECTIONS[0].id;
    }

    getConfiguredLibrarySections() {
        const rawSections = Array.isArray(window.GAMEHUB_LIBRARY_SECTIONS)
            ? window.GAMEHUB_LIBRARY_SECTIONS
            : [];
        if (rawSections.length === 0) {
            return GAMEHUB_DEFAULT_LIBRARY_SECTIONS.map(section => ({ ...section, description: '' }));
        }

        const sections = [];
        const seenIds = new Set();

        rawSections.forEach((section, index) => {
            if (!section || typeof section !== 'object') {
                console.warn('Game library section config must be an object', section);
                return;
            }

            const idSource = section.id || section.label || section.name || GAMEHUB_DEFAULT_LIBRARY_SECTIONS[index]?.id;
            const id = this.normalizeLibrarySectionId(idSource);
            const label = GameHubGameMetadata.normalizeText(
                section.label || section.name,
                GAMEHUB_DEFAULT_LIBRARY_SECTIONS[index]?.label || id
            );

            if (seenIds.has(id)) {
                console.warn(`Duplicate game library section id "${id}" in GAMEHUB_LIBRARY_SECTIONS`, section);
                return;
            }

            seenIds.add(id);
            sections.push({
                id,
                label,
                description: GameHubGameMetadata.normalizeText(section.description, '')
            });
        });

        GAMEHUB_DEFAULT_LIBRARY_SECTIONS.forEach(section => {
            if (!sections.some(entry => entry.id === section.id)) {
                console.warn(`Missing required game library section "${section.label}" in GAMEHUB_LIBRARY_SECTIONS; using default.`);
                sections.push({ ...section, description: '' });
            }
        });

        return sections.slice(0, 2);
    }

    normalizeLibrarySectionId(value) {
        return GameHubGameMetadata.generateGameId(value || '');
    }

    resolveLibrarySectionId(value) {
        const rawValue = typeof value === 'string' ? value.trim() : '';
        if (!rawValue) {
            return this.defaultLibrarySectionId;
        }

        const normalized = this.normalizeLibrarySectionId(rawValue);
        if (this.librarySectionLookup.has(normalized)) {
            return normalized;
        }

        const byLabel = this.librarySections.find(section =>
            String(section.label).trim().toLowerCase() === rawValue.toLowerCase()
        );

        return byLabel ? byLabel.id : this.defaultLibrarySectionId;
    }

    getLibrarySectionLabel(sectionId) {
        return this.librarySectionLookup.get(sectionId)?.label || sectionId;
    }

    getGameLibrarySectionId(game) {
        return this.librarySectionLookup.has(game.libraryList) ? game.libraryList : this.defaultLibrarySectionId;
    }

    getGamesByLibrarySection() {
        const grouped = new Map(this.librarySections.map(section => [section.id, []]));

        Array.from(this.games.values())
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .forEach(game => {
                const sectionId = this.getGameLibrarySectionId(game);
                if (!grouped.has(sectionId)) {
                    grouped.set(sectionId, []);
                }
                grouped.get(sectionId).push(game);
            });

        return grouped;
    }

    getSearchableText(game) {
        return [
            game.metadata.name,
            game.metadata.description,
            game.metadata.tags.join(' '),
            game.metadata.author
        ].join(' ').toLowerCase();
    }

    compareGames(a, b) {
        const favoriteDiff = Number(this.isFavorite(b.id)) - Number(this.isFavorite(a.id));
        if (favoriteDiff !== 0) return favoriteDiff;

        switch (this.currentSort) {
            case 'name':
                return a.metadata.name.localeCompare(b.metadata.name);
            case 'category':
                return a.metadata.category.localeCompare(b.metadata.category);
            case 'difficulty': {
                const difficultyOrder = { Easy: 1, Medium: 2, Hard: 3 };
                return (difficultyOrder[a.metadata.difficulty] || 99) - (difficultyOrder[b.metadata.difficulty] || 99);
            }
            case 'playtime':
                return (a.metadata.estimatedPlayTime || 0) - (b.metadata.estimatedPlayTime || 0);
            case 'rating': {
                const ratingDiff = this.getEffectiveRating(b) - this.getEffectiveRating(a);
                return ratingDiff || a.metadata.name.localeCompare(b.metadata.name);
            }
            case 'recent': {
                const recentDiff = this.getRecentTimestamp(b.id) - this.getRecentTimestamp(a.id);
                return recentDiff || a.metadata.name.localeCompare(b.metadata.name);
            }
            case 'original':
            default:
                return (a.order || 0) - (b.order || 0);
        }
    }

    filterSectionGames(games) {
        let filtered = Array.from(games);

        if (this.currentFilter === '__favorites') {
            filtered = filtered.filter(game => this.isFavorite(game.id));
        } else if (this.currentFilter !== 'all') {
            filtered = filtered.filter(game =>
                game.metadata.category.toLowerCase() === this.currentFilter.toLowerCase()
            );
        }

        if (this.searchTerm) {
            filtered = filtered.filter(game => this.getSearchableText(game).includes(this.searchTerm));
        }

        filtered.sort((a, b) => this.compareGames(a, b));
        return filtered;
    }

    loadGames() {
        const configs = this.getConfiguredGames();
        const seenIds = new Set();
        let registeredCount = 0;

        configs.forEach((config, index) => {
            const warnings = GameHubGameMetadata.validateConfig(config, seenIds);
            if (warnings.length > 0) {
                console.warn(`Game config warning: ${warnings.join('; ')}`, config);
            }

            if (!config || !config.folder) {
                return;
            }

            try {
                const gameConfig = this.createGameConfig(config, index);
                if (this.registerGame(gameConfig)) {
                    registeredCount++;
                }
            } catch (error) {
                console.error(`Failed to register game "${config.name || config.folder}":`, error);
            }
        });

        this.applySavedOrder();
        console.log(`Game registration complete: ${registeredCount} configured games`);
    }

    getConfiguredGames() {
        if (Array.isArray(window.GAMEHUB_GAMES)) {
            return window.GAMEHUB_GAMES;
        }

        console.warn('GAMEHUB_GAMES config not found. Loading built-in fallback games.');
        return this.getFallbackGameConfigs();
    }

    getFallbackGameConfigs() {
        return [
            { folder: 'snake', name: 'Snake!', category: 'Arcade', difficulty: 'Easy', icon: 'S', libraryList: 'ai-slope' },
            { folder: 'miniinvaders', name: 'Mini Invaders', category: 'Arcade', difficulty: 'Medium', icon: 'MI', libraryList: 'ai-slope' },
            { folder: 'Cellvive', name: 'Cellvive', category: 'Action', difficulty: 'Easy', icon: 'CV', libraryList: 'polished' },
            { folder: 'cosmicdrifter', name: 'Cosmic Drifter', category: 'Exploration', difficulty: 'Medium', icon: 'CD', libraryList: 'polished' },
            { folder: 'stickperson', name: 'Stickman Platformer', category: 'Platformer', difficulty: 'Easy', icon: 'SP', libraryList: 'ai-slope' },
            { folder: 'blockdodge', name: 'Block Dodge', category: 'Arcade', difficulty: 'Easy', icon: 'BD', libraryList: 'ai-slope' },
            { folder: 'gloomvault-extraction', name: 'Gloomvault Extraction', category: 'Action RPG', difficulty: 'Hard', icon: 'GE', libraryList: 'polished' }
        ];
    }

    createGameConfig(config, order) {
        const folder = String(config.folder);
        const metadata = GameHubGameMetadata.normalize(config);
        const gameClass = this.createIframeGameClass(folder, metadata);
        const rawLibraryList = typeof config.libraryList === 'string' ? config.libraryList.trim() : '';
        const libraryList = this.resolveLibrarySectionId(rawLibraryList);

        if (!rawLibraryList) {
            console.warn(`Game config "${folder}" is missing libraryList; defaulting to "${this.getLibrarySectionLabel(this.defaultLibrarySectionId)}".`);
        } else {
            const normalizedLibraryList = this.normalizeLibrarySectionId(rawLibraryList);
            const matchedById = this.librarySectionLookup.has(normalizedLibraryList);
            const matchedByLabel = this.librarySections.some(section =>
                String(section.label).trim().toLowerCase() === rawLibraryList.toLowerCase()
            );

            if (!matchedById && !matchedByLabel) {
                console.warn(`Game config "${folder}" has unknown libraryList "${rawLibraryList}"; defaulting to "${this.getLibrarySectionLabel(this.defaultLibrarySectionId)}".`);
            }
        }

        return {
            folder,
            name: metadata.name,
            gameClass,
            metadata,
            order,
            configOrder: order,
            libraryList
        };
    }

    createIframeGameClass(folder, metadata) {
        return class DynamicIframeGame extends GameHubIframeGame {
            constructor() {
                super(folder, metadata);
            }
        };
    }

    registerGame(gameModule) {
        if (!gameModule || typeof gameModule !== 'object') {
            console.error('Invalid game module: must be an object', gameModule);
            return false;
        }

        if (!gameModule.name || typeof gameModule.name !== 'string') {
            console.error('Invalid game module: name is required and must be a string', gameModule);
            return false;
        }

        if (typeof gameModule.gameClass !== 'function') {
            console.error(`Invalid game module: "${gameModule.name}" does not have a playable game class`, gameModule);
            return false;
        }

        const game = {
            ...gameModule,
            id: GameHubGameMetadata.generateGameId(gameModule.folder || gameModule.name),
            order: Number.isFinite(gameModule.order) ? gameModule.order : this.games.size,
            libraryList: this.resolveLibrarySectionId(gameModule.libraryList)
        };

        this.games.set(game.id, game);
        this.updateCategoryOptions();
        return true;
    }

    formatFolderName(folder) {
        return GameHubGameMetadata.formatFolderName(folder);
    }

    createInitials(name) {
        return GameHubGameMetadata.createInitials(name);
    }

    normalizeRating(value) {
        return GameHubGameMetadata.normalizeRating(value);
    }

    loadUserRatings() {
        const parsed = this.readStoredValue('game-ratings', this.ratingStorageKey, {});
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

        return Object.entries(parsed).reduce((acc, [gameId, rating]) => {
            const normalized = this.normalizeRating(rating);
            if (normalized === Number.parseInt(rating, 10)) {
                acc[gameId] = normalized;
            }
            return acc;
        }, {});
    }

    saveUserRatings() {
        this.writeStoredValue('game-ratings', this.ratingStorageKey, this.userRatings);
    }

    getEffectiveRating(game) {
        return this.userRatings[game.id] || game.metadata.defaultRating;
    }

    setUserRating(gameId, rating) {
        const normalized = this.normalizeRating(rating);
        this.userRatings[gameId] = normalized;
        this.saveUserRatings();
        this.updateGamesList();
    }

    loadFavorites() {
        const parsed = this.readStoredValue('game-favorites', this.favoriteStorageKey, {});
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }

    saveFavorites() {
        this.writeStoredValue('game-favorites', this.favoriteStorageKey, this.favoriteGames);
        this.eventEmitter.emit('library:favorites-changed', { favorites: { ...this.favoriteGames } });
    }

    isFavorite(gameId) {
        return Boolean(this.favoriteGames[gameId]);
    }

    toggleFavorite(gameId) {
        if (this.favoriteGames[gameId]) {
            delete this.favoriteGames[gameId];
        } else {
            this.favoriteGames[gameId] = true;
        }
        this.saveFavorites();
        this.updateGamesList();
    }

    loadRecentlyPlayed() {
        const parsed = this.readStoredValue('game-recent', this.recentStorageKey, {});
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    }

    saveRecentlyPlayed() {
        this.writeStoredValue('game-recent', this.recentStorageKey, this.recentlyPlayed);
        this.eventEmitter.emit('library:recently-played-changed', { recentlyPlayed: { ...this.recentlyPlayed } });
    }

    recordRecentlyPlayed(gameId, timestamp = Date.now()) {
        if (!gameId) return;
        this.recentlyPlayed[gameId] = timestamp;
        this.saveRecentlyPlayed();
        this.updateGamesList();
    }

    getRecentTimestamp(gameId) {
        return Number(this.recentlyPlayed[gameId]) || 0;
    }

    readStoredValue(storageKey, legacyKey, defaultValue) {
        try {
            const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(legacyKey) : null;
            if (saved !== null && saved !== undefined) {
                const parsed = JSON.parse(saved);
                if (this.storage) this.storage.set(storageKey, parsed);
                return parsed;
            }
        } catch (error) {
            console.warn(`Failed to load saved value for ${legacyKey}:`, error);
        }

        if (this.storage) {
            const missing = { missing: true };
            const stored = this.storage.get(storageKey, missing);
            if (stored !== missing) return stored;
        }

        return defaultValue;
    }

    writeStoredValue(storageKey, legacyKey, value) {
        if (this.storage) this.storage.set(storageKey, value);

        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(legacyKey, JSON.stringify(value));
            }
        } catch (error) {
            console.warn(`Failed to save value for ${legacyKey}:`, error);
        }
    }

    updateCategoryOptions() {
        if (!this.filterSelect) return;

        const currentValue = this.filterSelect.value || 'all';
        const categories = [...new Set(Array.from(this.games.values()).map(game => game.metadata.category))].sort();

        while (this.filterSelect.firstChild) this.filterSelect.removeChild(this.filterSelect.firstChild);

        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All categories';
        this.filterSelect.appendChild(allOption);

        const favoritesOption = document.createElement('option');
        favoritesOption.value = '__favorites';
        favoritesOption.textContent = 'Favorites';
        this.filterSelect.appendChild(favoritesOption);

        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            this.filterSelect.appendChild(option);
        });

        this.filterSelect.value = categories.includes(currentValue) || currentValue === '__favorites' ? currentValue : 'all';
        this.currentFilter = this.filterSelect.value;
    }

    applySavedOrder() {
        this.userRatings = this.loadUserRatings();
        this.favoriteGames = this.loadFavorites();
        this.recentlyPlayed = this.loadRecentlyPlayed();
        const savedOrder = this.getSavedOrder();
        const orderedIds = new Set(savedOrder);
        let nextOrder = 0;

        savedOrder.forEach(id => {
            const game = this.games.get(id);
            if (game) game.order = nextOrder++;
        });

        Array.from(this.games.values())
            .filter(game => !orderedIds.has(game.id))
            .sort((a, b) => a.order - b.order)
            .forEach(game => {
                game.order = nextOrder++;
            });

        this.saveGameOrder();
    }

    getSavedOrder() {
        const parsed = this.readStoredValue('game-order', this.orderStorageKey, []);
        return Array.isArray(parsed) ? parsed : [];
    }

    saveGameOrder() {
        const order = Array.from(this.games.values())
            .sort((a, b) => a.order - b.order)
            .map(game => game.id);
        this.writeStoredValue('game-order', this.orderStorageKey, order);
    }

    resetGameOrder() {
        let nextOrder = 0;

        this.librarySections.forEach(section => {
            const sectionGames = Array.from(this.games.values())
                .filter(game => this.getGameLibrarySectionId(game) === section.id)
                .sort((a, b) => (a.configOrder ?? a.order ?? 0) - (b.configOrder ?? b.order ?? 0));

            sectionGames.forEach(game => {
                game.order = nextOrder++;
            });
        });

        this.saveGameOrder();
        this.updateGamesList();
        this.showMessage('Game order reset', 'success');
    }

    filterGames() {
        const groupedGames = this.getGamesByLibrarySection();
        this.filteredGamesBySection = this.librarySections.map(section => {
            const games = groupedGames.get(section.id) || [];
            return {
                section,
                games: this.filterSectionGames(games)
            };
        });

        return this.filteredGamesBySection.flatMap(group => group.games);
    }

    updateGamesList() {
        this.filteredGames = this.filterGames();
        this.updateReorderControls();
        this.renderGames();
    }

    updateReorderControls() {
        const canReorder = this.currentSort === 'original';
        if (this.reorderToggle) {
            this.reorderToggle.disabled = !canReorder;
            this.reorderToggle.classList.toggle('active', this.isReorderMode);
            this.reorderToggle.textContent = this.isReorderMode ? 'Done' : 'Reorder';
        }
        if (!canReorder) {
            this.isReorderMode = false;
        }
    }

    renderGames() {
        if (!this.gamesGrid) return;

        while (this.gamesGrid.firstChild) this.gamesGrid.removeChild(this.gamesGrid.firstChild);

        const visibleSections = this.filteredGamesBySection.filter(group => group.games.length > 0);

        if (visibleSections.length === 0) {
            this.renderNoGamesMessage();
            return;
        }

        visibleSections.forEach(group => {
            const section = document.createElement('section');
            section.className = 'library-section';
            section.dataset.librarySection = group.section.id;

            const header = document.createElement('div');
            header.className = 'library-section-header';

            const title = document.createElement('h3');
            title.className = 'library-section-title';
            title.textContent = group.section.label;

            header.appendChild(title);

            if (group.section.description) {
                const description = document.createElement('p');
                description.className = 'library-section-description';
                description.textContent = group.section.description;
                header.appendChild(description);
            }

            const grid = document.createElement('div');
            grid.className = 'games-grid-section';

            group.games.forEach(game => {
                const gameCard = this.createGameCard(game);
                grid.appendChild(gameCard);
            });

            section.appendChild(header);
            section.appendChild(grid);
            this.gamesGrid.appendChild(section);
        });
    }

    createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.gameId = game.id;
        card.draggable = this.isReorderMode;

        if (this.isReorderMode) {
            card.classList.add('reorder-enabled');
            this.setupDragReorder(card, game);
        }

        const cardTop = document.createElement('div');
        cardTop.className = 'game-card-top';

        const topLeft = document.createElement('div');
        topLeft.className = 'game-card-top-left';

        const dragHandle = document.createElement('span');
        dragHandle.className = 'game-card-drag-handle';
        dragHandle.setAttribute('aria-hidden', 'true');
        dragHandle.textContent = '↕';

        const icon = document.createElement('div');
        icon.className = 'game-card-icon';
        icon.textContent = game.metadata.icon;

        if (this.isReorderMode) topLeft.appendChild(dragHandle);
        topLeft.appendChild(icon);

        const reorderActions = document.createElement('div');
        reorderActions.className = 'game-card-reorder-actions';

        const favoriteButton = this.createFavoriteButton(game);
        const upButton = this.createReorderButton('↑', `Move ${game.metadata.name} up`, () => this.moveGame(game.id, -1));
        const downButton = this.createReorderButton('↓', `Move ${game.metadata.name} down`, () => this.moveGame(game.id, 1));
        reorderActions.appendChild(upButton);
        reorderActions.appendChild(downButton);

        cardTop.appendChild(topLeft);
        cardTop.appendChild(this.isReorderMode ? reorderActions : favoriteButton);

        const title = document.createElement('h3');
        title.textContent = game.metadata.name;

        const desc = document.createElement('p');
        desc.textContent = game.metadata.description;

        const meta = document.createElement('div');
        meta.className = 'game-card-meta';

        const cat = document.createElement('span');
        cat.className = 'game-card-category';
        cat.textContent = game.metadata.category;

        const diff = document.createElement('span');
        diff.className = `game-card-difficulty difficulty-${String(game.metadata.difficulty).toLowerCase()}`;
        diff.textContent = game.metadata.difficulty;

        const playtime = document.createElement('span');
        playtime.className = 'game-card-playtime';
        playtime.textContent = `~${game.metadata.estimatedPlayTime || 10}min`;

        meta.appendChild(cat);
        meta.appendChild(diff);
        meta.appendChild(playtime);

        const badges = this.createCapabilityBadges(game);

        const ratingSection = document.createElement('div');
        ratingSection.className = 'game-card-ratings';

        ratingSection.appendChild(this.createStaticRatingRow(
            'AI effort',
            game.metadata.aiEffortRating,
            'ai-effort'
        ));
        ratingSection.appendChild(this.createInteractiveRatingRow(game));

        card.appendChild(cardTop);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(meta);
        card.appendChild(badges);
        card.appendChild(ratingSection);

        if (!this.isReorderMode) {
            card.addEventListener('click', () => this.selectGame(game));
            card.style.cursor = 'pointer';
        }

        return card;
    }

    createFavoriteButton(game) {
        const button = document.createElement('button');
        const favorite = this.isFavorite(game.id);
        button.type = 'button';
        button.className = `game-card-favorite ${favorite ? 'active' : ''}`.trim();
        button.textContent = favorite ? '★' : '☆';
        button.setAttribute('aria-label', `${favorite ? 'Remove' : 'Add'} ${game.metadata.name} ${favorite ? 'from' : 'to'} favorites`);
        button.setAttribute('aria-pressed', favorite ? 'true' : 'false');
        button.title = favorite ? 'Remove favorite' : 'Add favorite';
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            this.toggleFavorite(game.id);
        });
        return button;
    }

    createCapabilityBadges(game) {
        const badges = document.createElement('div');
        badges.className = 'game-card-badges';

        [
            this.normalizeBadgeLabel(game.metadata.input, 'Keyboard'),
            this.normalizeBadgeLabel(game.metadata.saveSupport, 'Unknown'),
            this.getRecentTimestamp(game.id) ? 'Recent' : null
        ].filter(Boolean).forEach(label => {
            const badge = document.createElement('span');
            badge.className = `game-card-badge badge-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            badge.textContent = label;
            badges.appendChild(badge);
        });

        return badges;
    }

    normalizeBadgeLabel(label, hiddenDefault) {
        const normalized = typeof label === 'string' ? label.trim() : '';
        if (!normalized || normalized.toLowerCase() === String(hiddenDefault).toLowerCase()) {
            return null;
        }
        return normalized;
    }

    createStaticRatingRow(label, rating, className) {
        const row = document.createElement('div');
        row.className = `game-card-rating-row ${className}`.trim();

        const rowLabel = document.createElement('span');
        rowLabel.className = 'game-card-rating-label';
        rowLabel.textContent = `${label} ${rating}/5`;

        const stars = document.createElement('span');
        stars.className = 'game-card-rating-stars';
        stars.setAttribute('aria-hidden', 'true');
        stars.textContent = this.renderStars(rating);

        row.appendChild(rowLabel);
        row.appendChild(stars);
        return row;
    }

    createInteractiveRatingRow(game) {
        const effectiveRating = this.getEffectiveRating(game);
        const row = document.createElement('div');
        row.className = 'game-card-rating-row user-rating';

        const rowLabel = document.createElement('span');
        rowLabel.className = 'game-card-rating-label';
        rowLabel.textContent = `Rating ${effectiveRating}/5`;

        const controls = document.createElement('div');
        controls.className = 'game-card-rating-controls';
        controls.setAttribute('role', 'group');
        controls.setAttribute('aria-label', `${game.metadata.name} rating`);

        for (let value = 1; value <= 5; value++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'game-card-rating-btn';
            button.dataset.ratingValue = String(value);
            button.setAttribute('aria-label', `Rate ${game.metadata.name} ${value} out of 5`);
            button.setAttribute('aria-pressed', value === effectiveRating ? 'true' : 'false');
            button.textContent = value <= effectiveRating ? '★' : '☆';
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.setUserRating(game.id, value);
            });
            controls.appendChild(button);
        }

        row.appendChild(rowLabel);
        row.appendChild(controls);
        return row;
    }

    renderStars(rating) {
        let output = '';
        for (let value = 1; value <= 5; value++) {
            output += value <= rating ? '★' : '☆';
        }
        return output;
    }

    createReorderButton(label, ariaLabel, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-card-reorder-btn';
        button.textContent = label;
        button.setAttribute('aria-label', ariaLabel);
        button.title = ariaLabel;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick();
        });
        return button;
    }

    setupDragReorder(card, game) {
        card.addEventListener('dragstart', (event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', game.id);
            card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
        });

        card.addEventListener('dragover', (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            card.classList.add('drag-over');
        });

        card.addEventListener('dragleave', () => {
            card.classList.remove('drag-over');
        });

        card.addEventListener('drop', (event) => {
            event.preventDefault();
            card.classList.remove('drag-over');
            const sourceId = event.dataTransfer.getData('text/plain');
            this.reorderVisibleGames(sourceId, game.id);
        });
    }

    moveGame(gameId, direction) {
        const game = this.games.get(gameId);
        if (!game) return;

        const sectionId = this.getGameLibrarySectionId(game);
        const orderedGames = Array.from(this.games.values())
            .filter(entry => this.getGameLibrarySectionId(entry) === sectionId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        const index = orderedGames.findIndex(entry => entry.id === gameId);
        const targetIndex = index + direction;

        if (index < 0 || targetIndex < 0 || targetIndex >= orderedGames.length) return;

        const [movedGame] = orderedGames.splice(index, 1);
        orderedGames.splice(targetIndex, 0, movedGame);
        this.persistNewOrder(sectionId, orderedGames);
    }

    reorderVisibleGames(sourceId, targetId) {
        if (!sourceId || sourceId === targetId) return;

        const sourceGame = this.games.get(sourceId);
        const targetGame = this.games.get(targetId);
        if (!sourceGame || !targetGame) return;

        const sourceSectionId = this.getGameLibrarySectionId(sourceGame);
        const targetSectionId = this.getGameLibrarySectionId(targetGame);
        if (sourceSectionId !== targetSectionId) return;

        const orderedGames = Array.from(this.games.values())
            .filter(game => this.getGameLibrarySectionId(game) === sourceSectionId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        const sourceIndex = orderedGames.findIndex(game => game.id === sourceId);
        const targetIndex = orderedGames.findIndex(game => game.id === targetId);

        if (sourceIndex < 0 || targetIndex < 0) return;

        const [movedGame] = orderedGames.splice(sourceIndex, 1);
        orderedGames.splice(targetIndex, 0, movedGame);
        this.persistNewOrder(sourceSectionId, orderedGames);
    }

    persistNewOrder(sectionId, orderedSectionGames) {
        const orderedBySection = new Map();

        this.librarySections.forEach(section => {
            if (section.id === sectionId) {
                orderedBySection.set(section.id, orderedSectionGames);
                return;
            }

            orderedBySection.set(section.id, Array.from(this.games.values())
                .filter(game => this.getGameLibrarySectionId(game) === section.id)
                .sort((a, b) => (a.order || 0) - (b.order || 0)));
        });

        let nextOrder = 0;
        this.librarySections.forEach(section => {
            const games = orderedBySection.get(section.id) || [];
            games.forEach(game => {
                game.order = nextOrder++;
            });
        });

        this.saveGameOrder();
        this.updateGamesList();
    }

    renderNoGamesMessage() {
        while (this.gamesGrid.firstChild) this.gamesGrid.removeChild(this.gamesGrid.firstChild);

        const container = document.createElement('div');
        container.className = 'no-games-message';

        const icon = document.createElement('div');
        icon.className = 'no-games-icon';
        icon.textContent = 'GH';

        const title = document.createElement('h3');
        title.textContent = 'No games found';

        const p = document.createElement('p');
        p.textContent = 'Try adding a game to games.config.js';

        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(p);

        this.gamesGrid.appendChild(container);
    }

    selectGame(game) {
        console.log(`Game selected: ${game.metadata.name}`);
        this.eventEmitter.emit('game:selected', game);
        this.showGameLoading(game);
    }

    showGameLoading(game) {
        console.log(`Loading game: ${game.metadata.name}`);
    }

    showMessage(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const msg = document.createElement('div');
        msg.className = 'toast-message';
        msg.textContent = message;

        const close = document.createElement('button');
        close.className = 'toast-close';
        close.textContent = 'x';
        close.addEventListener('click', () => toast.remove());

        toast.appendChild(msg);
        toast.appendChild(close);

        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 100);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    getGame(gameId) {
        return this.games.get(gameId);
    }

    updateGame(gameId, updates) {
        const game = this.games.get(gameId);
        if (game) {
            Object.assign(game, updates);
            this.updateGamesList();
        }
    }

    registerDynamicGame(gameModule) {
        try {
            const success = this.registerGame(gameModule);
            if (success) {
                this.applySavedOrder();
                this.updateGamesList();
            }
            return success;
        } catch (error) {
            console.error(`Error dynamically registering game "${gameModule.name}":`, error);
            return false;
        }
    }

    unregisterGame(gameId) {
        const game = this.games.get(gameId);
        if (game) {
            this.games.delete(gameId);
            this.applySavedOrder();
            this.updateGamesList();
            return true;
        }
        return false;
    }

    isGameClassAvailable(gameClass) {
        return gameClass !== null && gameClass !== undefined && typeof gameClass === 'function';
    }

    getAllGames() {
        return Array.from(this.games.values());
    }

    getGamesByCategory(category) {
        return this.getAllGames().filter(game =>
            game.metadata.category.toLowerCase() === category.toLowerCase()
        );
    }

    searchGames(query) {
        this.searchTerm = query.toLowerCase();
        this.updateGamesList();
        return this.filteredGames;
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.updateGamesList();
    }

    setSort(sort) {
        this.currentSort = sort;
        this.updateGamesList();
    }

    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }

    off(event, callback) {
        this.eventEmitter.off(event, callback);
    }

    cleanup() {
        this.cleanupEventListeners();
        this.games.clear();
        this.filteredGames = [];

        if (this.gamesGrid) {
            while (this.gamesGrid.firstChild) this.gamesGrid.removeChild(this.gamesGrid.firstChild);
        }

        this.eventEmitter.removeAllListeners();
        console.log('GameSelector cleaned up');
    }
}

window.GameHubIframeGame = GameHubIframeGame;
window.GameSelector = GameSelector;
