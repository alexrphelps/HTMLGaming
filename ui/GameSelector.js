/**
 * GameHub Game Selector - Manages game selection and loading
 * Handles the game grid, filtering, and launching games
 */
class GameSelector {
    constructor() {
        this.games = new Map();
        this.filteredGames = [];
        this.currentFilter = 'all';
        this.currentSort = 'original';
        this.searchTerm = '';
        
        // DOM elements
        this.gamesGrid = null;
        this.searchInput = null;
        this.filterSelect = null;
        this.sortSelect = null;
        
        // Events
        this.eventEmitter = new EventEmitter();
        
        console.log('🎯 GameSelector initialized');
    }
    
    init() {
        this.gamesGrid = document.getElementById('games-grid');
        this.setupEventListeners();
        
        // Register default games
        this.registerDefaultGames();
        
        // Initial render
        this.updateGamesList();
        
        console.log('✅ GameSelector ready');
    }
    
    setupEventListeners() {
        // Search functionality (if search input exists)
        const searchInput = document.getElementById('games-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateGamesList();
            });
        }
        
        // Filter functionality (if filter exists)
        const filterSelect = document.getElementById('games-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.updateGamesList();
            });
        }
        
        // Sort functionality (if sort exists)
        const sortSelect = document.getElementById('games-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.updateGamesList();
            });
        }
    }
    
    registerGame(gameModule) {
        // Validate game module
        if (!gameModule || typeof gameModule !== 'object') {
            console.error('Invalid game module: must be an object', gameModule);
            return false;
        }
        
        if (!gameModule.name || typeof gameModule.name !== 'string') {
            console.error('Invalid game module: name is required and must be a string', gameModule);
            return false;
        }
        
        // Check if gameClass exists and is valid
        let gameClass = gameModule.gameClass;
        if (gameClass !== null && gameClass !== undefined) {
            if (typeof gameClass !== 'function') {
                console.warn(`Game class for "${gameModule.name}" is not a valid constructor function. Setting to null.`);
                gameClass = null;
            } else {
                // Test if the class can be instantiated (basic check)
                try {
                    // Just check if it's callable, don't actually instantiate
                    if (typeof gameClass !== 'function') {
                        throw new Error('Not a function');
                    }
                } catch (error) {
                    console.warn(`Game class for "${gameModule.name}" failed validation: ${error.message}. Setting to null.`);
                    gameClass = null;
                }
            }
        }
        
        // Create game metadata with defaults
        const metadata = {
            name: 'Untitled Game',
            description: 'A GameHub game',
            category: 'Other',
            difficulty: 'Medium',
            icon: '🎮',
            tags: [],
            version: '1.0.0',
            author: 'Unknown',
            ...gameModule.metadata
        };
        
        const game = {
            ...gameModule,
            gameClass, // Use the validated gameClass
            metadata,
            id: this.generateGameId(gameModule.name),
            order: this.games.size // Preserve registration order
        };
        
        this.games.set(game.id, game);
        
        const status = gameClass ? 'available' : 'placeholder';
        console.log(`🎯 Game registered: ${game.metadata.name} (${status})`);
        
        this.updateGamesList();
        return true;
    }
    
    generateGameId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
    
    registerDefaultGames() {
        console.log('🎯 Registering default games...');
        
        // Define games in the requested order: Snake, Mini Invaders, Cellvive, Cosmic Drifter, Stickman platformer, Block Dodge
        // Note: Removed "Coming Soon" games and hidden "Sky Squirrel" as requested
        const gameConfigs = [
            {
                name: 'Snake!',
                gameClass: typeof SnakeGame !== 'undefined' ? SnakeGame : null,
                metadata: {
                    name: 'Snake!',
                    description: 'Classic Snake game with AI opponents and multiple food types',
                    category: 'Arcade',
                    difficulty: 'Easy',
                    icon: '🐍',
                    tags: ['2d', 'classic', 'arcade', 'ai'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 5
                }
            },
            {
                name: 'Mini Invaders',
                gameClass: typeof MiniInvadersGame !== 'undefined' ? MiniInvadersGame : null,
                metadata: {
                    name: 'Mini Invaders',
                    description: 'Classic Space Invaders! Shoot descending aliens before they reach the bottom. Move with arrow keys, shoot with spacebar!',
                    category: 'Arcade',
                    difficulty: 'Medium',
                    icon: '👾',
                    tags: ['2d', 'arcade', 'shooter', 'retro', 'classic'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 10
                }
            },
            {
                name: 'Cellvive',
                gameClass: typeof CellviveGame !== 'undefined' ? CellviveGame : null,
                metadata: {
                    name: 'Cellvive',
                    description: 'Survive as a blob-like cell! Eat smaller cells to grow larger while avoiding bigger ones. Use WASD or arrow keys to move.',
                    category: 'Action',
                    difficulty: 'Easy',
                    icon: '🔬',
                    tags: ['2d', 'survival', 'action', 'arcade', 'cells'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 10
                }
            },
            {
                name: 'Cosmic Drifter',
                gameClass: typeof CosmicDrifterGame !== 'undefined' ? CosmicDrifterGame : null,
                metadata: {
                    name: 'Cosmic Drifter',
                    description: 'Explore the cosmos in your hover-craft! Drift through shattered worlds, collect resources, avoid hazards, and upgrade your ship to survive deeper into the unknown.',
                    category: 'Exploration',
                    difficulty: 'Medium',
                    icon: '🚀',
                    tags: ['2d', 'exploration', 'survival', 'space', 'open-world', 'upgrades'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 20
                }
            },
            {
                name: 'Stickman Platformer',
                gameClass: typeof StickpersonGame !== 'undefined' ? StickpersonGame : null,
                metadata: {
                    name: 'Stickman Platformer',
                    description: 'A simple 2D platformer with a stickman character',
                    category: 'Platformer',
                    difficulty: 'Easy',
                    icon: '🦯',
                    tags: ['2d', 'platformer', 'action'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 10
                }
            },
            {
                name: 'Block Dodge',
                gameClass: typeof BlockDodgeGame !== 'undefined' ? BlockDodgeGame : null,
                metadata: {
                    name: 'Block Dodge',
                    description: 'Test your reflexes! Control a square and dodge falling blocks as the difficulty increases. How long can you survive?',
                    category: 'Arcade',
                    difficulty: 'Easy',
                    icon: '⬛',
                    tags: ['2d', 'arcade', 'reflex', 'survival'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 5
                }
            },
            {
                name: 'Colony Breach',
                gameClass: typeof ColonyBreachGame !== 'undefined' ? ColonyBreachGame : null,
                metadata: {
                    name: 'Colony Breach',
                    description: 'Reverse Tower Defense! Manage an alien invasion force and breach the enemy core before the AI builds its defenses.',
                    category: 'Strategy',
                    difficulty: 'Medium',
                    icon: '👾',
                    tags: ['2d', 'strategy', 'tower-defense', 'reverse-td', 'invasion'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 15
                }
            },
            {
                name: 'Nebula Runner',
                gameClass: typeof NebulaRunnerGame !== 'undefined' ? NebulaRunnerGame : null,
                metadata: {
                    name: 'Nebula Runner',
                    description: 'Navigate the cosmic void in this space-themed endless runner! Collect energy crystals, avoid asteroids and alien ships, and upgrade your vessel with talent points earned through gameplay.',
                    category: 'Action',
                    difficulty: 'Medium',
                    icon: '🚀',
                    tags: ['2d', 'action', 'endless-runner', 'space', 'upgrades', 'talent-system'],
                    version: '1.0.0',
                    author: 'GameHub Team',
                    estimatedPlayTime: 15
                }
            }
        ];
        
        // Register each game with error handling
        let registeredCount = 0;
        let failedCount = 0;
        
        gameConfigs.forEach(config => {
            try {
                const success = this.registerGame(config);
                if (success) {
                    registeredCount++;
                } else {
                    failedCount++;
                }
            } catch (error) {
                console.error(`Failed to register game "${config.name}":`, error);
                failedCount++;
            }
        });
        
        console.log(`🎯 Game registration complete: ${registeredCount} registered, ${failedCount} failed`);
    }
    
    filterGames() {
        let filtered = Array.from(this.games.values());
        
        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(game => 
                game.metadata.category.toLowerCase() === this.currentFilter.toLowerCase()
            );
        }
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(game => {
                const searchableText = `
                    ${game.metadata.name} 
                    ${game.metadata.description} 
                    ${game.metadata.tags.join(' ')} 
                    ${game.metadata.author}
                `.toLowerCase();
                
                return searchableText.includes(this.searchTerm);
            });
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.metadata.name.localeCompare(b.metadata.name);
                case 'category':
                    return a.metadata.category.localeCompare(b.metadata.category);
                case 'difficulty':
                    const difficultyOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                    return difficultyOrder[a.metadata.difficulty] - difficultyOrder[b.metadata.difficulty];
                case 'playtime':
                    return a.metadata.estimatedPlayTime - b.metadata.estimatedPlayTime;
                case 'original':
                default:
                    // Preserve the original order from gameConfigs
                    return (a.order || 0) - (b.order || 0);
            }
        });
        
        return filtered;
    }
    
    updateGamesList() {
        this.filteredGames = this.filterGames();
        this.renderGames();
    }
    
    renderGames() {
        if (!this.gamesGrid) return;
        // Clear existing games without using innerHTML
        while (this.gamesGrid.firstChild) this.gamesGrid.removeChild(this.gamesGrid.firstChild);
        
        if (this.filteredGames.length === 0) {
            this.renderNoGamesMessage();
            return;
        }
        
        // Render each game
        this.filteredGames.forEach(game => {
            const gameCard = this.createGameCard(game);
            this.gamesGrid.appendChild(gameCard);
        });
    }
    
    createGameCard(game) {
        const card = document.createElement('div');
        card.className = 'game-card';
        card.dataset.gameId = game.id;
        
        const isAvailable = game.gameClass !== null;
        
        // Build card DOM explicitly (avoid innerHTML)
        const icon = document.createElement('div');
        icon.className = 'game-card-icon';
        icon.textContent = game.metadata.icon;

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
        diff.className = `game-card-difficulty difficulty-${game.metadata.difficulty.toLowerCase()}`;
        diff.textContent = game.metadata.difficulty;

        const playtime = document.createElement('span');
        playtime.className = 'game-card-playtime';
        playtime.textContent = `~${game.metadata.estimatedPlayTime}min`;

        meta.appendChild(cat);
        meta.appendChild(diff);
        meta.appendChild(playtime);

        card.appendChild(icon);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(meta);

        if (!isAvailable) {
            const overlay = document.createElement('div');
            overlay.className = 'game-card-overlay';
            overlay.textContent = 'Coming Soon';
            card.appendChild(overlay);
        }
        
        // Add click handler
        if (isAvailable) {
            card.addEventListener('click', () => this.selectGame(game));
            card.style.cursor = 'pointer';
        } else {
            card.classList.add('game-unavailable');
            card.style.opacity = '0.6';
            card.style.cursor = 'not-allowed';
        }
        
        return card;
    }
    
    renderNoGamesMessage() {
        while (this.gamesGrid.firstChild) this.gamesGrid.removeChild(this.gamesGrid.firstChild);

        const container = document.createElement('div');
        container.className = 'no-games-message';

        const icon = document.createElement('div');
        icon.className = 'no-games-icon';
        icon.textContent = '🎮';

        const title = document.createElement('h3');
        title.textContent = 'No games found';

        const p = document.createElement('p');
        p.textContent = 'Try adjusting your search or filter criteria';

        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(p);

        this.gamesGrid.appendChild(container);
    }
    
    selectGame(game) {
        console.log(`🎯 Game selected: ${game.metadata.name}`);
        
        if (!game.gameClass) {
            this.showMessage('This game is not available yet. Coming soon!', 'warning');
            return;
        }
        
        // Emit game selection event
        this.eventEmitter.emit('game:selected', game);
        
        // Show loading state
        this.showGameLoading(game);
    }
    
    showGameLoading(game) {
        // You could show a loading overlay here
        console.log(`⏳ Loading game: ${game.metadata.name}`);
    }
    
    showMessage(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        const container = document.getElementById('toast-container');
        if (container) {
            container.appendChild(toast);
            
            // Animate in
            setTimeout(() => toast.classList.add('show'), 100);
            
            // Auto remove after 3 seconds
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
    
    // API methods
    getGame(gameId) {
        return this.games.get(gameId);
    }
    
    updateGame(gameId, updates) {
        const game = this.games.get(gameId);
        if (game) {
            Object.assign(game, updates);
            this.updateGamesList();
            console.log(`🔄 Game updated: ${game.metadata.name}`);
        }
    }
    
    /**
     * Dynamically register a game at runtime
     * Useful for adding games without restarting the platform
     */
    registerDynamicGame(gameModule) {
        try {
            const success = this.registerGame(gameModule);
            if (success) {
                console.log(`✅ Dynamically registered game: ${gameModule.name}`);
                return true;
            } else {
                console.error(`❌ Failed to dynamically register game: ${gameModule.name}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error dynamically registering game "${gameModule.name}":`, error);
            return false;
        }
    }
    
    /**
     * Remove a game from the registry
     */
    unregisterGame(gameId) {
        const game = this.games.get(gameId);
        if (game) {
            this.games.delete(gameId);
            this.updateGamesList();
            console.log(`🗑️ Game unregistered: ${game.metadata.name}`);
            return true;
        }
        return false;
    }
    
    /**
     * Check if a game class is available
     */
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
    
    // Event methods
    on(event, callback) {
        this.eventEmitter.on(event, callback);
    }
    
    off(event, callback) {
        this.eventEmitter.off(event, callback);
    }
    
    cleanup() {
        this.games.clear();
        this.filteredGames = [];
        
        if (this.gamesGrid) {
            this.gamesGrid.innerHTML = '';
        }
        
        this.eventEmitter.removeAllListeners();
        
        console.log('🧹 GameSelector cleaned up');
    }
}

// Make GameSelector available globally
window.GameSelector = GameSelector;
