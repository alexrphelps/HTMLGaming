/**
 * Testing Manager - Handles testing/debug panel functionality
 * Provides easy access to testing features for development
 */
class TestingManager {
    constructor(game) {
        this.game = game;
        this.panel = null;
        this.isVisible = false;
        
        // Testing state
        this.testingState = {
            godmode: false,
            noTutorial: false,
            fastGrowth: false,
            debugLogging: false,
            spawnMoreCells: false,
            spawnMoreEnemies: false
        };
        
        this.init();
    }
    
    /**
     * Initialize the testing manager
     */
    init() {
        // Only show testing panel if enabled in constants
        if (!CELLVIVE_CONSTANTS.TESTING.ENABLED) {
            return;
        }
        
        this.panel = document.getElementById('testing-panel');
        if (!this.panel) {
            console.warn('Testing panel not found in HTML');
            return;
        }
        
        this.setupEventListeners();
        this.loadInitialState();
        this.showPanel();
    }
    
    /**
     * Setup event listeners for testing controls
     */
    setupEventListeners() {
        // God mode toggle
        const godmodeToggle = document.getElementById('godmode-toggle');
        if (godmodeToggle) {
            godmodeToggle.addEventListener('change', (e) => {
                this.testingState.godmode = e.target.checked;
                this.onGodModeToggle(e.target.checked);
            });
        }
        
        // No tutorial toggle
        const noTutorialToggle = document.getElementById('no-tutorial-toggle');
        if (noTutorialToggle) {
            noTutorialToggle.addEventListener('change', (e) => {
                this.testingState.noTutorial = e.target.checked;
                this.onNoTutorialToggle(e.target.checked);
            });
        }
        
        // Fast growth toggle
        const fastGrowthToggle = document.getElementById('fast-growth-toggle');
        if (fastGrowthToggle) {
            fastGrowthToggle.addEventListener('change', (e) => {
                this.testingState.fastGrowth = e.target.checked;
                this.onFastGrowthToggle(e.target.checked);
            });
        }
        
        // Debug logging toggle
        const debugLoggingToggle = document.getElementById('debug-logging-toggle');
        if (debugLoggingToggle) {
            debugLoggingToggle.addEventListener('change', (e) => {
                this.testingState.debugLogging = e.target.checked;
                this.onDebugLoggingToggle(e.target.checked);
            });
        }
        
        // Spawn more cells toggle
        const spawnCellsToggle = document.getElementById('spawn-cells-toggle');
        if (spawnCellsToggle) {
            spawnCellsToggle.addEventListener('change', (e) => {
                this.testingState.spawnMoreCells = e.target.checked;
                this.onSpawnCellsToggle(e.target.checked);
            });
        }
        
        // Spawn more enemies toggle
        const spawnEnemiesToggle = document.getElementById('spawn-enemies-toggle');
        if (spawnEnemiesToggle) {
            spawnEnemiesToggle.addEventListener('change', (e) => {
                this.testingState.spawnMoreEnemies = e.target.checked;
                this.onSpawnEnemiesToggle(e.target.checked);
            });
        }
        
        // Reset all button
        const resetButton = document.getElementById('reset-testing');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetAll();
            });
        }
        
        // Toggle panel button
        const toggleButton = document.getElementById('toggle-panel');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                this.togglePanel();
            });
        }
        
        // Object Spawner Event Listeners
        this.setupSpawnEventListeners();
        
        // Biome Spawner Event Listener
        this.setupBiomeSpawner();
    }
    
    /**
     * Setup biome spawner dropdown and button
     */
    setupBiomeSpawner() {
        const biomeSelect = document.getElementById('biome-type-select');
        const spawnBiomeBtn = document.getElementById('spawn-biome-btn');
        
        if (spawnBiomeBtn && biomeSelect) {
            spawnBiomeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const biomeType = biomeSelect.value;
                try {
                    this.game.spawnBiome(biomeType);
                    console.log(`🌍 Spawned ${biomeType} biome near player`);
                } catch (error) {
                    console.error(`Error spawning ${biomeType} biome:`, error);
                }
            });
        } else {
            console.warn('Biome spawner controls not found in HTML');
        }
    }
    
    /**
     * Setup event listeners for object spawner buttons
     */
    setupSpawnEventListeners() {
        // Quick Spawn - Basic Objects
        this.addSpawnListener('spawn-food-cell', () => this.game.spawnFoodCell());
        this.addSpawnListener('spawn-powerup', () => this.game.spawnPowerUp());
        this.addSpawnListener('spawn-amoeba', () => this.game.spawnAmoeba());
        this.addSpawnListener('spawn-virus', () => this.game.spawnVirus());
        
        // Advanced Testing
        this.addSpawnListener('spawn-giant-cell', () => this.game.spawnGiantCell());
        this.addSpawnListener('spawn-enemy-swarm', () => this.game.spawnEnemySwarm());
        this.addSpawnListener('spawn-random-spore', () => this.game.spawnRandomSpore());
        this.addSpawnListener('test-talent-popup', () => this.game.testTalentPopup());
        
        // Clear Methods
        this.addSpawnListener('clear-all-cells', () => this.game.clearAllCells());
        this.addSpawnListener('clear-all-enemies', () => this.game.clearAllEnemies());
    }
    
    /**
     * Helper method to add spawn event listeners
     */
    addSpawnListener(buttonId, spawnFunction) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                try {
                    spawnFunction();
                } catch (error) {
                    console.error(`Error spawning ${buttonId}:`, error);
                }
            });
        } else {
            console.warn(`Spawn button not found: ${buttonId}`);
        }
    }
    
    /**
     * Load initial state from constants
     */
    loadInitialState() {
        const testing = CELLVIVE_CONSTANTS.TESTING;
        
        this.setToggleState('godmode-toggle', testing.GODMODE);
        this.setToggleState('no-tutorial-toggle', testing.NO_TUTORIAL);
        this.setToggleState('fast-growth-toggle', testing.FAST_GROWTH);
        this.setToggleState('debug-logging-toggle', testing.ENABLED);
        this.setToggleState('spawn-cells-toggle', testing.SPAWN_MORE_CELLS);
        this.setToggleState('spawn-enemies-toggle', testing.SPAWN_MORE_ENEMIES);
        
        // Update internal state
        this.testingState.godmode = testing.GODMODE;
        this.testingState.noTutorial = testing.NO_TUTORIAL;
        this.testingState.fastGrowth = testing.FAST_GROWTH;
        this.testingState.debugLogging = testing.ENABLED;
        this.testingState.spawnMoreCells = testing.SPAWN_MORE_CELLS;
        this.testingState.spawnMoreEnemies = testing.SPAWN_MORE_ENEMIES;
    }
    
    /**
     * Set toggle state
     */
    setToggleState(id, checked) {
        const element = document.getElementById(id);
        if (element) {
            element.checked = checked;
        }
    }
    
    /**
     * Show the testing panel
     */
    showPanel() {
        if (this.panel) {
            this.panel.classList.remove('hidden');
            this.isVisible = true;
        }
    }
    
    /**
     * Hide the testing panel
     */
    hidePanel() {
        if (this.panel) {
            this.panel.classList.add('hidden');
            this.isVisible = false;
        }
    }
    
    /**
     * Toggle panel visibility
     */
    togglePanel() {
        if (this.isVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }
    
    /**
     * Reset all testing options
     */
    resetAll() {
        // Reset all toggles to false
        Object.keys(this.testingState).forEach(key => {
            this.testingState[key] = false;
        });
        
        // Update UI checkboxes to unchecked
        this.setToggleState('godmode-toggle', false);
        this.setToggleState('no-tutorial-toggle', false);
        this.setToggleState('fast-growth-toggle', false);
        this.setToggleState('debug-logging-toggle', false);
        this.setToggleState('spawn-cells-toggle', false);
        this.setToggleState('spawn-enemies-toggle', false);
        
        // Apply changes
        this.onGodModeToggle(false);
        this.onNoTutorialToggle(false);
        this.onFastGrowthToggle(false);
        this.onDebugLoggingToggle(false);
        this.onSpawnCellsToggle(false);
        this.onSpawnEnemiesToggle(false);
        
        console.log('🔄 All debug settings reset');
    }
    
    // ========================================
    // Testing Feature Handlers
    // ========================================
    
    /**
     * Handle god mode toggle
     */
    onGodModeToggle(enabled) {
        if (this.game.player) {
            if (enabled) {
                this.game.player.originalMaxHealth = this.game.player.maxHealth;
                this.game.player.maxHealth = Infinity;
                this.game.player.health = Infinity;
                console.log('🛡️ God mode enabled - player cannot die');
            } else {
                this.game.player.maxHealth = this.game.player.originalMaxHealth || 100;
                this.game.player.health = Math.min(this.game.player.health, this.game.player.maxHealth);
                console.log('🛡️ God mode disabled');
            }
        }
    }
    
    /**
     * Handle no tutorial toggle
     */
    onNoTutorialToggle(enabled) {
        if (this.game.tutorialManager) {
            this.game.tutorialManager.enabled = !enabled;
            if (enabled) {
                this.game.tutorialManager.hideAllMessages();
                console.log('📚 Tutorial disabled');
            } else {
                console.log('📚 Tutorial enabled');
            }
        }
    }
    
    /**
     * Handle fast growth toggle
     */
    onFastGrowthToggle(enabled) {
        if (this.game.player) {
            if (enabled) {
                this.game.player.originalGrowthMultiplier = this.game.player.growthMultiplier || 1;
                this.game.player.growthMultiplier = 5; // 5x faster growth
                console.log('⚡ Fast growth enabled');
            } else {
                this.game.player.growthMultiplier = this.game.player.originalGrowthMultiplier || 1;
                console.log('⚡ Fast growth disabled');
            }
        }
    }
    
    /**
     * Handle debug logging toggle
     */
    onDebugLoggingToggle(enabled) {
        if (window.DebugLogger) {
            if (enabled) {
                CELLVIVE_CONSTANTS.TESTING.ENABLED = true;
                console.log('🐛 Debug logging enabled - check console for game events');
            } else {
                CELLVIVE_CONSTANTS.TESTING.ENABLED = false;
                console.log('🐛 Debug logging disabled');
            }
        } else {
            console.error('❌ DebugLogger not available');
        }
    }
    
    /**
     * Handle spawn more cells toggle
     */
    onSpawnCellsToggle(enabled) {
        if (enabled) {
            this.game.config.cellSpawnRate *= 3; // 3x more cells
            this.game.config.maxCells *= 2; // 2x max cells
            console.log('🔬 Spawning more cells');
        } else {
            this.game.config.cellSpawnRate = CELLVIVE_CONSTANTS.CELLS.SPAWN_RATE;
            this.game.config.maxCells = CELLVIVE_CONSTANTS.CELLS.MAX_COUNT;
            console.log('🔬 Normal cell spawning');
        }
    }
    
    /**
     * Handle spawn more enemies toggle
     */
    onSpawnEnemiesToggle(enabled) {
        if (enabled) {
            this.game.config.enemySpawnRate *= 2; // 2x more enemies
            this.game.config.maxEnemies *= 2; // 2x max enemies
            console.log('👾 Spawning more enemies');
        } else {
            this.game.config.enemySpawnRate = CELLVIVE_CONSTANTS.ENEMIES.SPAWN_RATE;
            this.game.config.maxEnemies = CELLVIVE_CONSTANTS.ENEMIES.MAX_COUNT;
            console.log('👾 Normal enemy spawning');
        }
    }
    
    // ========================================
    // Public API
    // ========================================
    
    /**
     * Check if a testing feature is enabled
     */
    isEnabled(feature) {
        return this.testingState[feature] || false;
    }
    
    /**
     * Get current testing state
     */
    getState() {
        return { ...this.testingState };
    }
    
    /**
     * Update testing state
     */
    updateState(newState) {
        Object.assign(this.testingState, newState);
    }
}

// Export for use in other modules
window.TestingManager = TestingManager;
