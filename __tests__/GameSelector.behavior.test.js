describe('GameSelector behavior', () => {
    const setupDom = () => {
        document.body.innerHTML = `
            <input id="games-search">
            <select id="games-filter"></select>
            <select id="games-sort">
                <option value="original">Custom order</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="difficulty">Difficulty</option>
                <option value="playtime">Play time</option>
                <option value="rating">Rating</option>
                <option value="recent">Recently played</option>
            </select>
            <button id="games-reorder-toggle"></button>
            <button id="games-reset-order"></button>
            <div id="games-grid"></div>
            <div id="toast-container"></div>
        `;
    };

    const loadSelector = () => {
        jest.resetModules();
        require('../utils/EventEmitter');
        require('../ui/GameSelector');
        return window.GameSelector;
    };

    beforeEach(() => {
        setupDom();
        localStorage.clear();
        delete window.GAMEHUB_GAMES;
        delete window.GameSelector;
        delete window.GameHubIframeGame;
        delete window.EventEmitter;
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('uses fallback config when GAMEHUB_GAMES is missing', async () => {
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();

        expect(selector.getAllGames().map(game => game.folder)).toEqual([
            'snake',
            'miniinvaders',
            'Cellvive',
            'cosmicdrifter',
            'stickperson',
            'blockdodge',
            'gloomvault-extraction'
        ]);
    });

    test('fills metadata defaults for minimal config entries', async () => {
        window.GAMEHUB_GAMES = [{ folder: 'tiny-test' }];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();
        const game = selector.getGame('tiny-test');

        expect(game.metadata).toMatchObject({
            name: 'Tiny Test',
            description: 'A GameHub game.',
            category: 'Other',
            difficulty: 'Medium',
            icon: 'TT',
            tags: [],
            version: '1.0.0',
            author: 'Unknown',
            estimatedPlayTime: 10,
            aiEffortRating: 3,
            defaultRating: 3
        });
    });

    test('clamps invalid config ratings to the neutral default', async () => {
        window.GAMEHUB_GAMES = [{
            folder: 'bad-ratings',
            aiEffortRating: 9,
            defaultRating: 0
        }];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();
        const game = selector.getGame('bad-ratings');

        expect(game.metadata.aiEffortRating).toBe(3);
        expect(game.metadata.defaultRating).toBe(3);
    });

    test('search, category filter, and sort produce stable visible games', async () => {
        window.GAMEHUB_GAMES = [
            { folder: 'zeta', name: 'Zeta Run', category: 'Arcade', difficulty: 'Hard', estimatedPlayTime: 30, tags: ['speed'] },
            { folder: 'alpha', name: 'Alpha Puzzle', category: 'Puzzle', difficulty: 'Easy', estimatedPlayTime: 5, tags: ['logic'] },
            { folder: 'beta', name: 'Beta Blocks', category: 'Arcade', difficulty: 'Medium', estimatedPlayTime: 10, tags: ['blocks'] }
        ];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();
        selector.setFilter('Arcade');
        selector.setSort('name');

        expect(selector.filteredGames.map(game => game.metadata.name)).toEqual(['Beta Blocks', 'Zeta Run']);

        const searchResult = selector.searchGames('speed');
        expect(searchResult.map(game => game.metadata.name)).toEqual(['Zeta Run']);
    });

    test('applies saved order and ignores stale ids', async () => {
        localStorage.setItem('gamehub-game-order', JSON.stringify(['stale-id', 'beta', 'alpha']));
        window.GAMEHUB_GAMES = [
            { folder: 'alpha', name: 'Alpha' },
            { folder: 'beta', name: 'Beta' },
            { folder: 'gamma', name: 'Gamma' }
        ];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();

        expect(selector.getAllGames().sort((a, b) => a.order - b.order).map(game => game.id)).toEqual([
            'beta',
            'alpha',
            'gamma'
        ]);
        expect(JSON.parse(localStorage.getItem('gamehub-game-order'))).toEqual(['beta', 'alpha', 'gamma']);
    });

    test('clicking a game rating saves locally, updates the card, and does not select the game', async () => {
        window.GAMEHUB_GAMES = [{ folder: 'rated', name: 'Rated Game', defaultRating: 2, aiEffortRating: 4 }];
        const GameSelector = loadSelector();
        const selector = new GameSelector();
        const selectedSpy = jest.fn();

        selector.on('game:selected', selectedSpy);
        await selector.init();

        const ratingButton = document.querySelector('[data-game-id="rated"] .game-card-rating-btn[data-rating-value="5"]');
        ratingButton.click();

        expect(JSON.parse(localStorage.getItem('gamehub-game-ratings'))).toEqual({ rated: 5 });
        expect(document.querySelector('[data-game-id="rated"] .user-rating .game-card-rating-label').textContent).toBe('Rating 5/5');
        expect(selectedSpy).not.toHaveBeenCalled();
    });

    test('rating sort uses saved user ratings ahead of defaults', async () => {
        localStorage.setItem('gamehub-game-ratings', JSON.stringify({ beta: 5 }));
        window.GAMEHUB_GAMES = [
            { folder: 'alpha', name: 'Alpha', defaultRating: 4 },
            { folder: 'beta', name: 'Beta', defaultRating: 2 },
            { folder: 'gamma', name: 'Gamma', defaultRating: 4 }
        ];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();
        selector.setSort('rating');

        expect(selector.filteredGames.map(game => game.metadata.name)).toEqual(['Beta', 'Alpha', 'Gamma']);
    });

    test('creates dynamic iframe classes for registered games', async () => {
        window.GAMEHUB_GAMES = [{ folder: 'void_signal', name: 'Void Signal' }];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();
        const game = selector.getGame('void-signal');
        const instance = new game.gameClass();

        expect(instance).toBeInstanceOf(window.GameHubIframeGame);
        expect(instance.folder).toBe('void_signal');
    });

    test('favorites and recently played state persist and affect filtering and sorting', async () => {
        window.GAMEHUB_GAMES = [
            { folder: 'alpha', name: 'Alpha' },
            { folder: 'beta', name: 'Beta' },
            { folder: 'gamma', name: 'Gamma' }
        ];
        const GameSelector = loadSelector();
        const selector = new GameSelector();
        const favoritesSpy = jest.fn();
        const recentSpy = jest.fn();

        selector.on('library:favorites-changed', favoritesSpy);
        selector.on('library:recently-played-changed', recentSpy);
        await selector.init();

        document.querySelector('[data-game-id="beta"] .game-card-favorite').click();
        expect(JSON.parse(localStorage.getItem('gamehub-game-favorites'))).toEqual({ beta: true });
        expect(favoritesSpy).toHaveBeenCalledWith({ favorites: { beta: true } });

        selector.setFilter('__favorites');
        expect(selector.filteredGames.map(game => game.id)).toEqual(['beta']);

        selector.setFilter('all');
        selector.recordRecentlyPlayed('alpha', 100);
        selector.recordRecentlyPlayed('gamma', 200);
        selector.setSort('recent');

        expect(selector.filteredGames.map(game => game.id)).toEqual(['beta', 'gamma', 'alpha']);
        expect(recentSpy).toHaveBeenLastCalledWith({ recentlyPlayed: { alpha: 100, gamma: 200 } });
    });

    test('game card badges hide technical defaults', async () => {
        window.GAMEHUB_GAMES = [{ folder: 'minimal-card', name: 'Minimal Card' }];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();

        const badgeText = Array.from(document.querySelectorAll('[data-game-id="minimal-card"] .game-card-badge'))
            .map(badge => badge.textContent);

        expect(badgeText).not.toContain('Iframe');
        expect(badgeText).not.toContain('Canvas');
        expect(badgeText).not.toContain('Unknown');
    });

    test('rejects invalid registrations without changing registry size', async () => {
        window.GAMEHUB_GAMES = [{ folder: 'valid', name: 'Valid' }];
        const GameSelector = loadSelector();
        const selector = new GameSelector();

        await selector.init();
        const sizeBefore = selector.getAllGames().length;

        expect(selector.registerGame(null)).toBe(false);
        expect(selector.registerGame({ name: '', gameClass: function Empty() {} })).toBe(false);
        expect(selector.registerGame({ name: 'No Class', gameClass: null })).toBe(false);
        expect(selector.getAllGames()).toHaveLength(sizeBefore);
    });
});
