/**
 * Cellvive - Main Game Class
 * 2D cell survival game where player controls a blob-like cell
 */
class CellviveGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.gameState = 'menu'; // 'menu', 'playing', 'gameOver'
        this.isPaused = false;
        
        // Game settings - using constants
        this.config = {
            canvasWidth: CELLVIVE_CONSTANTS.WORLD.CANVAS_WIDTH,
            canvasHeight: CELLVIVE_CONSTANTS.WORLD.CANVAS_HEIGHT,
            worldSizeMultiplier: CELLVIVE_CONSTANTS.WORLD.SIZE_MULTIPLIER,
            baseWorldWidth: CELLVIVE_CONSTANTS.WORLD.BASE_WIDTH,
            baseWorldHeight: CELLVIVE_CONSTANTS.WORLD.BASE_HEIGHT,
            targetFPS: CELLVIVE_CONSTANTS.PERFORMANCE.TARGET_FPS,
            cellSpawnRate: CELLVIVE_CONSTANTS.CELLS.SPAWN_RATE,
            maxCells: CELLVIVE_CONSTANTS.CELLS.MAX_COUNT,
            enemySpawnRate: CELLVIVE_CONSTANTS.ENEMIES.SPAWN_RATE,
            maxEnemies: CELLVIVE_CONSTANTS.ENEMIES.MAX_COUNT,
            powerUpSpawnRate: CELLVIVE_CONSTANTS.POWERUPS.SPAWN_RATE,
            maxPowerUps: CELLVIVE_CONSTANTS.POWERUPS.MAX_COUNT
        };
        
        // Calculate actual world dimensions
        this.config.worldWidth = this.config.baseWorldWidth * this.config.worldSizeMultiplier;
        this.config.worldHeight = this.config.baseWorldHeight * this.config.worldSizeMultiplier;
        
        // Game objects
        this.player = null;
        this.cells = [];
        this.enemies = []; // New: separate array for enemy cells
        this.camera = { x: 0, y: 0, zoom: 1.0 };
        
        // Performance and memory management
        this.frameCount = 0;
        this.lastCleanupFrame = 0;
        this.cleanupInterval = 300; // Cleanup every 5 seconds at 60fps
        this.maxCells = this.config.maxCells;
        this.maxEnemies = this.config.maxEnemies;
        this.gameLoopId = null;
        this.cleanupTimeoutId = null;
        this.eventListeners = [];
        this.pauseReasons = new Set();
        
        // Virus group management
        this.virusGroupManager = null;
        
        // Audio
        this.audioManager = null;
        
        // Environment systems
        this.environmentManager = null;
        
        // Enhanced systems
        this.particleSystem = null;
        this.powerUpManager = null;
        this.enhancedUI = null;
        this.tutorialManager = null;
        this.testingManager = null;
        
        // Input handling
        this.inputHandler = null;
        
        // Rendering
        this.renderer = null;
        
        // Collision detection
        this.collisionDetector = null;
        
        // Game stats
        this.score = 0;
        this.gameTime = 0;
        this.lastTime = 0;
        this.stats = {
            cellsEaten: 0,
            enemiesEaten: 0,
            totalDistanceTraveled: 0,
            maxSize: 0,
            maxSpeedReached: 0,
            talentsUnlocked: 0,
            sporesCollected: 0
        };

        const phases = this.getProgressionPhases();
        this.progression = {
            phase: phases[0],
            lastPhaseId: phases[0].ID
        };
        this.persistence = this.loadPersistence();
        this.activeMutations = [];
        this.mutationPopup = null;
        this.mutationChoiceGrid = null;
        this.mutationSkipBtn = null;
        this.services = this.createRuntimeServices();
        
        GameLogger.gameInit('Cellvive Game initialized');
    }
    
    /**
     * Initialize the game
     */
    async init() {
        try {
            GameLogger.gameInit('Initializing Cellvive game...');
            
            // Get canvas element
            this.canvas = document.getElementById('game-canvas');
            if (!this.canvas) {
                throw new Error('Game canvas not found');
            }
            
            // Set canvas size
            this.canvas.width = this.config.canvasWidth;
            this.canvas.height = this.config.canvasHeight;
            
            // Get 2D context
            this.ctx = this.canvas.getContext('2d');
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
        // Initialize game systems
        this.initPlayer();
        this.initVirusGroupManager();
        this.initInputHandler();
        this.initRenderer();
        this.initCollisionDetector();
        this.initEnhancedSystems();
        this.configureRuntimeServices();
        this.initCells();
        this.initEnemies();
        this.initTutorialManager();
        this.initTestingManager();
        this.initTalentSystem();
        this.initEventListeners();
            
            // Set initial game state
            this.gameState = 'playing';
            
            GameLogger.gameInit('Cellvive game initialized successfully');
            
        } catch (error) {
            GameLogger.error(`Failed to initialize Cellvive game: ${error.message}`);
            throw error;
        }
    }

    createRuntimeServices() {
        return {
            getCells: () => this.cells,
            playDamage: () => this.audioManager?.playDamage(),
            createPowerUpParticles: (x, y, type) => this.particleSystem?.createPowerUpParticles(x, y, type),
            onTalentSporeCollected: () => this.handleTalentSporeCollected()
        };
    }

    configureRuntimeServices() {
        this.services = this.createRuntimeServices();
        if (this.player) {
            this.player.services = this.services;
        }
    }

    handleTalentSporeCollected() {
        if (this.talentSystem) {
            this.talentSystem.addTalentPoints(CELLVIVE_CONSTANTS.TALENTS?.POINTS_PER_ORANGE_SPORE || 1);
        }
        this.showMutationChoices();
        this.recordDiscovery('orange_spore');
    }

    loadPersistence() {
        const fallback = {
            bestScore: 0,
            bestSurvivalTime: 0,
            bestSize: 0,
            discoveries: []
        };

        try {
            const saved = JSON.parse(localStorage.getItem(this.getPersistenceKey()) || 'null');
            return saved && typeof saved === 'object' ? { ...fallback, ...saved } : fallback;
        } catch (error) {
            console.warn('Cellvive persistence unavailable:', error);
            return fallback;
        }
    }

    getPersistenceKey() {
        return CELLVIVE_CONSTANTS.PERSISTENCE?.STORAGE_KEY || 'cellvive_progress_v2';
    }

    getProgressionPhases() {
        return CELLVIVE_CONSTANTS.PROGRESSION?.PHASES || [
            { ID: 'seedling', NAME: 'Seedling', MIN_SIZE: 0, DESCRIPTION: 'Survive and grow.' }
        ];
    }

    getMutationOptions() {
        return CELLVIVE_CONSTANTS.MUTATIONS?.OPTIONS || [];
    }

    savePersistence() {
        try {
            localStorage.setItem(this.getPersistenceKey(), JSON.stringify(this.persistence));
        } catch (error) {
            console.warn('Cellvive persistence save failed:', error);
        }
    }

    recordDiscovery(id) {
        if (!id || !this.persistence) return;
        if (!Array.isArray(this.persistence.discoveries)) {
            this.persistence.discoveries = [];
        }
        if (!this.persistence.discoveries.includes(id)) {
            this.persistence.discoveries.unshift(id);
            this.persistence.discoveries = this.persistence.discoveries.slice(0, CELLVIVE_CONSTANTS.PERSISTENCE?.DISCOVERY_LIMIT || 40);
            this.savePersistence();
        }
    }

    updateBestRunStats(score = this.score, finalSize = this.player?.radius || 0, survivalTime = Math.floor(this.gameTime / 1000)) {
        this.persistence.bestScore = Math.max(this.persistence.bestScore || 0, score || 0);
        this.persistence.bestSize = Math.max(this.persistence.bestSize || 0, Math.floor(finalSize || 0));
        this.persistence.bestSurvivalTime = Math.max(this.persistence.bestSurvivalTime || 0, survivalTime || 0);
        this.savePersistence();
    }

    /**
     * Initialize starting food spores from configured spawn counts
     */
    initCells() {
        if (!this.spawnManager) return;
        const initialCount = CELLVIVE_CONSTANTS.CELLS.INITIAL_COUNT || 0;
        this.spawnManager.spawnInitialCells(initialCount);
        console.log(`Initial cells spawned: ${this.cells.length}`);
    }
    
    /**
     * Initialize the player cell
     */
    initPlayer() {
        // NEW APPROACH: Player always starts at world center, camera follows
        const playerX = this.config.worldWidth / 2;
        const playerY = this.config.worldHeight / 2;
        
        this.player = new Player({
            x: playerX,
            y: playerY,
            radius: 20,
            color: '#4a90e2',
            maxSpeed: 3
        });
        this.player.services = this.services;
        
        // Initialize camera to follow player (will be updated in updateCamera)
        this.camera.x = playerX;
        this.camera.y = playerY;
        
        console.log('Player initialized at world center:', playerX, playerY);
        console.log('Camera initialized to follow player:', this.camera.x, this.camera.y);
    }
    
    /**
     * Initialize initial enemies
     */
    initEnemies() {
        if (!this.spawnManager) return;
        const initialCount = CELLVIVE_CONSTANTS.ENEMIES.INITIAL_COUNT || 0;
        this.spawnManager.spawnInitialEnemies(initialCount);
        console.log(`Initial enemies spawned: ${this.enemies.length}`);
    }
    
    /**
     * Initialize virus group manager
     */
    initVirusGroupManager() {
        this.virusGroupManager = new VirusGroupManager();
        console.log('🦠 Virus group manager initialized');
    }
    
    /**
     * Handle player death
     */
    handlePlayerDeath(cause) {
        console.log(`🔬 Player died: ${cause}`);
        
        // Play death sound
        if (this.audioManager) this.audioManager.playDeath();
        
        // Set game state to game over
        this.gameState = 'gameOver';
        
        // Calculate final stats
        const score = Math.floor(this.player.radius * 10);
        const finalSize = Math.floor(this.player.radius);
        const survivalTime = Math.floor(this.gameTime / 1000); // Convert to seconds
        this.updateBestRunStats(score, finalSize, survivalTime);
        
        // Update game over screen with stats
        this.updateGameOverStats(score, finalSize, survivalTime, cause);
        
        // Show game over screen
        this.showGameOverScreen();
        
        // Stop the game loop
        this.stop();
    }
    
    /**
     * Show game over screen
     */
    showGameOverScreen() {
        const gameOverElement = document.getElementById('game-over');
        if (gameOverElement) {
            gameOverElement.classList.remove('hidden');
        }
    }
    
    /**
     * Hide game over screen
     */
    hideGameOverScreen() {
        const gameOverElement = document.getElementById('game-over');
        if (gameOverElement) {
            gameOverElement.classList.add('hidden');
        }
    }
    
    /**
     * Update game over screen with all stats
     */
    updateGameOverStats(score, finalSize, survivalTime, cause) {
        // Update final score
        const finalScoreElement = document.getElementById('final-score');
        if (finalScoreElement) {
            finalScoreElement.textContent = score;
        }
        
        // Update final size
        const finalSizeElement = document.getElementById('final-size');
        if (finalSizeElement) {
            finalSizeElement.textContent = finalSize;
        }
        
        // Update survival time
        const survivalTimeElement = document.getElementById('survival-time');
        if (survivalTimeElement) {
            survivalTimeElement.textContent = survivalTime;
        }
        
        // Update additional stats
        const cellsEatenEl = document.getElementById('cells-eaten');
        if (cellsEatenEl) cellsEatenEl.textContent = this.stats.cellsEaten;
        
        const enemiesEatenEl = document.getElementById('enemies-eaten');
        if (enemiesEatenEl) enemiesEatenEl.textContent = this.stats.enemiesEaten;
        
        const sporesCollectedEl = document.getElementById('spores-collected');
        if (sporesCollectedEl) sporesCollectedEl.textContent = this.stats.sporesCollected;
        
        const distanceTraveledEl = document.getElementById('distance-traveled');
        if (distanceTraveledEl) distanceTraveledEl.textContent = Math.floor(this.stats.totalDistanceTraveled);
        
        const talentsUnlockedEl = document.getElementById('talents-unlocked');
        const talentCount = this.player ? Object.keys(this.player.talentLevels).length : 0;
        if (talentsUnlockedEl) talentsUnlockedEl.textContent = talentCount;
        
        // Update death cause
        const deathCauseElement = document.getElementById('death-cause');
        if (deathCauseElement) {
            let causeText = 'You died!';
            switch (cause) {
                case 'killed by enemy':
                    causeText = 'You were eaten by an enemy!';
                    break;
                case 'starved to death':
                    causeText = 'You starved to death!';
                    break;
                default:
                    causeText = `You died: ${cause}`;
            }
            deathCauseElement.textContent = causeText;
        }
    }
    
    /**
     * Initialize input handler
     */
    initInputHandler() {
        this.inputHandler = new InputHandler();
        this.inputHandler.init();
        
        console.log('🔬 Input handler initialized');
    }
    
    /**
     * Initialize renderer
     */
    initRenderer() {
        this.renderer = new Renderer(this.ctx, this.canvas);
        
        console.log('🔬 Renderer initialized');
    }
    
    /**
     * Initialize collision detector
     */
    initCollisionDetector() {
        this.collisionDetector = new CollisionDetector();
        
        // Initialize environment manager
        this.environmentManager = new EnvironmentManager(
            this.config.worldWidth,
            this.config.worldHeight
        );
        
        // Set game reference for environment manager (needed for food spawners)
        this.environmentManager.setGame(this);
        
        console.log('🔬 Collision detector initialized');
    }
    
    /**
     * Initialize enhanced systems (particles, power-ups, UI)
     */
    initEnhancedSystems() {
        // Initialize particle system
        this.particleSystem = new ParticleSystem();
        
        // Initialize power-up manager
        this.powerUpManager = new PowerUpManager(this);

        // Initialize spawn manager
        this.spawnManager = new SpawnManager(this);

        // Initialize enhanced UI
        this.enhancedUI = new EnhancedUI(this);
        
        // Initialize audio manager
        this.audioManager = new AudioManager();
        this.audioManager.init();
        
        // Set game start time for survival tracking
        this.gameStartTime = Date.now();
        
        console.log('✨ Enhanced systems initialized');
    }
    
    /**
     * Initialize tutorial manager
     */
    initTutorialManager() {
        this.tutorialManager = new TutorialManager(this);
        console.log('📚 Tutorial manager initialized');
    }
    
    /**
     * Initialize testing manager
     */
    initTestingManager() {
        this.testingManager = new TestingManager(this);
        console.log('🧪 Testing manager initialized');
    }
    
    /**
     * Initialize talent system
     */
    initTalentSystem() {
        try {
            this.talentSystem = new TalentSystem(this);
            console.log('🧬 Talent system initialized successfully');
        } catch (error) {
            console.error('🧬 Failed to initialize talent system:', error);
            this.talentSystem = null;
        }
    }
    
    /**
     * Initialize event listeners
     */
    initEventListeners() {
        // Restart button
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            this.addManagedEventListener(restartBtn, 'click', () => this.restart());
        }
        
        // Talent tree button
        const talentTreeBtn = document.getElementById('talent-tree-btn');
        if (talentTreeBtn) {
            this.addManagedEventListener(talentTreeBtn, 'click', () => {
                console.log('🌳 Talent tree button clicked');
                this.openTalentSystem();
            });
            console.log('🌳 Talent tree button listener added');
        } else {
            console.warn('🌳 Talent tree button not found in DOM');
        }

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            this.addManagedEventListener(pauseBtn, 'click', () => this.toggleManualPause());
        }

        this.addManagedEventListener(document, 'keydown', (e) => {
            if ((e.key === 'p' || e.key === 'P') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                this.toggleManualPause();
            }
        });

        this.addManagedEventListener(document, 'visibilitychange', () => {
            if (document.hidden) {
                this.pause('visibility');
            } else {
                this.resume('visibility');
            }
            this.updatePauseButton();
        });

        this.mutationPopup = document.getElementById('mutation-popup');
        this.mutationChoiceGrid = document.getElementById('mutation-choice-grid');
        this.mutationSkipBtn = document.getElementById('mutation-skip-btn');
        if (this.mutationSkipBtn) {
            this.addManagedEventListener(this.mutationSkipBtn, 'click', () => this.hideMutationChoices());
        }
        
        // Window resize
        this.addManagedEventListener(window, 'resize', () => this.handleResize());
        
        console.log('🔬 Event listeners initialized');
    }

    addManagedEventListener(target, type, handler, options) {
        if (!target || !target.addEventListener) return;
        target.addEventListener(type, handler, options);
        this.eventListeners.push({ target, type, handler, options });
    }

    cleanupEventListeners() {
        this.eventListeners.forEach(({ target, type, handler, options }) => {
            try {
                target.removeEventListener(type, handler, options);
            } catch (error) {
                console.warn(`Error removing ${type} listener:`, error);
            }
        });
        this.eventListeners = [];
    }
    
    /**
     * Start the game loop
     */
    start() {
        if (this.isRunning) {
            console.warn('🔬 Game is already running');
            return;
        }
        
        console.log('🔬 Starting Cellvive game...');
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        GameLogger.gameInit('Cellvive game started successfully');
    }
    
    /**
     * Clean up resources and stop the game
     */
    cleanup() {
        console.log('🔬 Starting game cleanup...');
        
        // Stop the game loop first
        this.stop();
        
        // Cancel animation frame - FIXED: Ensure proper cleanup
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Additional safety: clear any remaining timeouts/intervals
        if (this.cleanupTimeoutId) {
            clearTimeout(this.cleanupTimeoutId);
            this.cleanupTimeoutId = null;
        }

        this.cleanupEventListeners();
        
        // Clean up input handler
        if (this.inputHandler && typeof this.inputHandler.cleanup === 'function') {
            this.inputHandler.cleanup();
        }
        
        // Clean up managers with proper error handling
        const managers = [
            'environmentManager',
            'particleSystem', 
            'talentSystem',
            'audioManager',
            'powerUpManager',
            'spawnManager',
            'enhancedUI',
            'tutorialManager',
            'testingManager',
            'virusGroupManager'
        ];
        
        managers.forEach(managerName => {
            const manager = this[managerName];
            if (manager && typeof manager.cleanup === 'function') {
                try {
                    manager.cleanup();
                } catch (error) {
                    console.warn(`Error cleaning up ${managerName}:`, error);
                }
            }
            this[managerName] = null;
        });
        
        // Clear arrays to prevent memory leaks
        this.cells = [];
        this.enemies = [];
        this.pauseReasons.clear();
        this.isPaused = false;
        
        // Clear references
        this.player = null;
        this.inputHandler = null;
        this.renderer = null;
        this.collisionDetector = null;
        this.camera = null;
        
        // Clear any remaining timers
        this.gameTime = 0;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        GameLogger.gameEnd('Game cleanup completed successfully');
    }
    
    /**
     * Main game loop
     */
    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = Math.min(currentTime - this.lastTime, CELLVIVE_CONSTANTS.PERFORMANCE.MAX_DELTA_TIME || 50);
        this.lastTime = currentTime;
        
        // Only update game logic if not paused
        if (!this.isPaused) {
            this.update(deltaTime);
        }
        
        // Always render (to show pause state)
        this.render();
        
        // Store deltaTime for UI
        this.deltaTime = deltaTime;
        
        // Continue loop - STORE THE ID FOR PROPER CLEANUP
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
    
    /**
     * Update game logic with performance optimizations
     */
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.frameCount++;
        
        // Periodic cleanup to prevent memory leaks
        if (this.frameCount - this.lastCleanupFrame >= this.cleanupInterval) {
            this.performCleanup();
            this.lastCleanupFrame = this.frameCount;
        }
        
        // Update game time
        this.gameTime += deltaTime;
        
        // Update player
        this.updatePlayer(deltaTime);
        
        // Check if player died (unless god mode is enabled)
        if (this.player.health <= 0 && !this.isGodModeEnabled()) {
            this.handlePlayerDeath('starved to death');
            return;
        }
        
        // Update AI cells
        this.updateCells();
        
        // Update enemies
        this.updateEnemies();
        
        // Handle collisions
        this.handleCollisions();
        
        // Spawn new cells
        if (this.spawnManager) this.spawnManager.spawnCells();

        // Spawn new enemies
        if (this.spawnManager) this.spawnManager.spawnEnemies();
        
        // Update environment systems
        this.updateEnvironment(deltaTime);
        
        // Update enhanced systems
        this.updateEnhancedSystems();

        this.updateProgression();
        this.updateActiveMutations();
        
        // Check for tutorial discoveries
        if (this.tutorialManager) {
            this.tutorialManager.checkDiscoveries();
        }
        
        // Update renderer animations
        if (this.renderer) {
            this.renderer.update(deltaTime);
        }
        
        // Update camera to follow player
        this.updateCamera();
        
        // Update UI
        this.updateUI();
    }
    
    /**
     * Update player logic
     */
    updatePlayer(deltaTime) {
        if (!this.player) return;
        
        // Handle input
        const input = this.inputHandler.getInput();
        
        const prevX = this.player.x;
        const prevY = this.player.y;
        
        // Update player movement with zoom adjustment
        this.player.update(input, this.camera.zoom);
        this.player.updateTalentEffects(deltaTime, this);
        
        // Track distance traveled
        const dx = this.player.x - prevX;
        const dy = this.player.y - prevY;
        this.stats.totalDistanceTraveled += Math.sqrt(dx * dx + dy * dy);
        
        // Track max size
        if (this.player.radius > this.stats.maxSize) {
            this.stats.maxSize = this.player.radius;
        }
        
        // Track max speed
        const currentSpeed = this.player.getSpeed();
        if (currentSpeed > this.stats.maxSpeedReached) {
            this.stats.maxSpeedReached = currentSpeed;
        }
        
        // Keep player within world bounds
        this.constrainToWorld(this.player);
    }
    
    /**
     * Update AI cells - Highly optimized version with spatial partitioning
     */
    updateCells() {
        const cellsToRemove = [];
        const maxNearbyCells = CELLVIVE_CONSTANTS.PERFORMANCE.MAX_NEARBY_CELLS || 20;
        const nearbyRange = CELLVIVE_CONSTANTS.PERFORMANCE.NEARBY_CELL_RANGE || 300;
        const simulationDistance = CELLVIVE_CONSTANTS.PERFORMANCE.SIMULATION_DISTANCE || 1500;
        
        // Pre-calculate player position and validate
        if (!this.player || typeof this.player.x !== 'number' || typeof this.player.y !== 'number') {
            console.warn('Invalid player state in updateCells, skipping update');
            return;
        }
        
        const playerX = this.player.x;
        const playerY = this.player.y;
        
        // FIXED: Create spatial grid for O(n) collision detection with performance optimization
        const gridSize = nearbyRange;
        const spatialGrid = new Map();
        
        // FIXED: Pre-allocate grid cells to reduce Map operations
        const gridBounds = {
            minX: Math.floor((playerX - simulationDistance) / gridSize),
            maxX: Math.floor((playerX + simulationDistance) / gridSize),
            minY: Math.floor((playerY - simulationDistance) / gridSize),
            maxY: Math.floor((playerY + simulationDistance) / gridSize)
        };
        
        // Populate spatial grid
        this.cells.forEach((cell, index) => {
            if (cell && typeof cell.x === 'number' && typeof cell.y === 'number') {
                const gridX = Math.floor(cell.x / gridSize);
                const gridY = Math.floor(cell.y / gridSize);
                const gridKey = `${gridX},${gridY}`;
                
                if (!spatialGrid.has(gridKey)) {
                    spatialGrid.set(gridKey, []);
                }
                spatialGrid.get(gridKey).push({ cell, index });
            }
        });
        
        // Update each cell with optimized nearby cell detection
        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            
            // Validate cell
            if (!cell || typeof cell.x !== 'number' || typeof cell.y !== 'number') {
                cellsToRemove.push(i);
                continue;
            }
            
            // Early culling: remove cells that are too far from player or invalid
            const dx = cell.x - playerX;
            const dy = cell.y - playerY;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            if (distanceToPlayer >= simulationDistance || 
                (cell.health !== undefined && cell.health <= 0) || 
                cell.radius <= 3) {
                cellsToRemove.push(i);
                continue;
            }
            
            // Use spatial grid for nearby cell detection
            const nearbyCells = [];
            const gridX = Math.floor(cell.x / gridSize);
            const gridY = Math.floor(cell.y / gridSize);
            
            // Check surrounding grid cells (3x3 area)
            for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
                for (let gy = gridY - 1; gy <= gridY + 1; gy++) {
                    const gridKey = `${gx},${gy}`;
                    const gridCells = spatialGrid.get(gridKey);
                    
                    if (gridCells) {
                        for (const { cell: other, index: otherIndex } of gridCells) {
                            if (otherIndex === i || nearbyCells.length >= maxNearbyCells) continue;
                            
                            const otherDx = other.x - cell.x;
                            const otherDy = other.y - cell.y;
                            const distance = Math.sqrt(otherDx * otherDx + otherDy * otherDy);
                            
                            if (distance < nearbyRange) {
                                nearbyCells.push(other);
                            }
                        }
                    }
                }
            }
            
            // Add player if close enough
            if (nearbyCells.length < maxNearbyCells && Math.abs(dx) <= nearbyRange && Math.abs(dy) <= nearbyRange) {
                const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
                if (distanceToPlayer < nearbyRange) {
                    nearbyCells.push(this.player);
                }
            }
            
            // Update cell with nearby cell information and deltaTime
            try {
                cell.update(this.deltaTime || 16, nearbyCells);
                this.constrainToWorld(cell);
            } catch (error) {
                console.warn(`Error updating cell ${i}:`, error);
                cellsToRemove.push(i);
            }
        }
        
        // Remove marked cells in reverse order to maintain indices
        for (let i = cellsToRemove.length - 1; i >= 0; i--) {
            this.cells.splice(cellsToRemove[i], 1);
        }
    }
    
    /**
     * Update enemy cells with enhanced AI and virus group management
     */
    updateEnemies() {
        // Register all viruses with the group manager
        this.enemies.forEach(enemy => {
            if (enemy instanceof VirusEnemy) {
                this.virusGroupManager.registerVirus(enemy);
            }
        });
        
        // Check for virus connections
        const viruses = this.enemies.filter(enemy => enemy instanceof VirusEnemy);
        this.virusGroupManager.checkForConnections(viruses);
        
        // Update each enemy with awareness of all nearby entities
        this.enemies.forEach((enemy, index) => {
            // Get nearby cells and enemies for AI decision making
            const nearbyCells = this.cells.filter(other => enemy.distanceTo(other) < 300);
            const nearbyEnemies = this.enemies.filter((other, otherIndex) => 
                otherIndex !== index && enemy.distanceTo(other) < 300
            );
            const nearbyPlayer = enemy.distanceTo(this.player) < 300 ? [this.player] : [];
            
            // Combine all nearby entities
            const allNearby = [...nearbyCells, ...nearbyEnemies, ...nearbyPlayer];
            
            // Update enemy with nearby entity information and deltaTime
            // Pass all viruses for connection system
            if (enemy instanceof VirusEnemy) {
                enemy.update(this.deltaTime || 16, allNearby, this.enemies);
            } else {
                enemy.update(this.deltaTime || 16, allNearby);
            }
            this.constrainToWorld(enemy);
        });
        
        // Update virus group behavior
        this.virusGroupManager.updateGroupBehavior(viruses);
        
        // Handle collective food consumption for virus groups
        this.virusGroupManager.handleCollectiveFoodConsumption(viruses, this.cells);
        
        // FIXED: Remove enemies that are too far from player or have died (optimized filter approach)
        const playerX = this.player.x;
        const playerY = this.player.y;
        const simulationDistance = CELLVIVE_CONSTANTS.PERFORMANCE.SIMULATION_DISTANCE;
        
        // FIXED: Use filter for more efficient array operations
        const previousEnemyCount = this.enemies.length;
        this.enemies = this.enemies.filter(enemy => {
            const distance = Math.hypot(enemy.x - playerX, enemy.y - playerY);
            
            if (distance >= simulationDistance || enemy.health <= 0 || enemy.radius <= 3) {
                // Unregister from virus group manager if it's a virus
                if (enemy instanceof VirusEnemy && this.virusGroupManager) {
                    try {
                        this.virusGroupManager.unregisterVirus(enemy);
                    } catch (error) {
                        console.warn('Error unregistering virus:', error);
                    }
                }
                return false; // Remove this enemy
            }
            return true; // Keep this enemy
        });
        
        // FIXED: Optional performance logging
        const removedCount = previousEnemyCount - this.enemies.length;
        if (removedCount > 0 && CELLVIVE_CONSTANTS.PERFORMANCE?.DEBUG_LOGGING) {
            console.log(`Removed ${removedCount} enemies (${this.enemies.length} remaining)`);
        }
    }
    
    /**
     * Handle collisions between objects - Optimized version
     */
    handleCollisions() {
        if (!this.player) {
            console.warn('⚠️ handleCollisions called but player is null');
            return;
        }
        
        // Safety check: Ensure collision detector exists
        if (!this.collisionDetector) {
            console.error('❌ CollisionDetector is not initialized!');
            return;
        }
        
        // Safety check: Ensure constants are loaded
        if (!CELLVIVE_CONSTANTS || !CELLVIVE_CONSTANTS.PERFORMANCE) {
            console.error('❌ CELLVIVE_CONSTANTS not loaded properly!');
            return;
        }
        
        // Debug: Log collision check periodically
        if (CELLVIVE_CONSTANTS.DEBUGGING.ENABLE_COLLISION_LOGS &&
            (!this._lastCollisionDebug || Date.now() - this._lastCollisionDebug > CELLVIVE_CONSTANTS.DEBUGGING.STATUS_LOG_INTERVAL_MS)) {
            console.log(`🔍 Collision check: ${this.cells.length} cells, player at (${this.player.x.toFixed(0)}, ${this.player.y.toFixed(0)}) radius ${this.player.radius.toFixed(1)}`);
            this._lastCollisionDebug = Date.now();
        }
        
        // Pre-calculate player bounds for early culling
        const playerBounds = {
            left: this.player.x - this.player.radius,
            right: this.player.x + this.player.radius,
            top: this.player.y - this.player.radius,
            bottom: this.player.y + this.player.radius
        };
        
        // Check player collisions with cells - optimized with early culling
        for (let i = this.cells.length - 1; i >= 0; i--) {
            const cell = this.cells[i];
            
            // Safety check: Ensure cell is valid
            if (!cell || typeof cell.x === 'undefined' || typeof cell.radius === 'undefined') {
                console.warn('⚠️ Invalid cell detected at index', i);
                continue;
            }
            
            // Early culling: skip if cell is too far away
            if (cell.x + cell.radius < playerBounds.left || 
                cell.x - cell.radius > playerBounds.right ||
                cell.y + cell.radius < playerBounds.top || 
                cell.y - cell.radius > playerBounds.bottom) {
                continue;
            }
            
            // Check collision
            let hasCollision = false;
            try {
                hasCollision = this.collisionDetector.checkCollision(this.player, cell);
            } catch (error) {
                console.error('❌ Error in collision detection:', error);
                continue;
            }
            
            if (hasCollision) {
                // IMPORTANT: Food spores (isSpore = true) should ALWAYS be edible
                // Only check size requirements for AI cells that can fight back
                const isSpore = cell.isSpore === true;
                const requiredSize = cell.radius * CELLVIVE_CONSTANTS.EATING.AI_CELL_SIZE_MULTIPLIER;
                
                // Debug: Show what we're colliding with (limit spam)
                if (CELLVIVE_CONSTANTS.DEBUGGING.ENABLE_COLLISION_LOGS && 
                    this.cells.length <= CELLVIVE_CONSTANTS.DEBUGGING.MAX_COLLISION_LOGS) {
                    GameLogger.debug(`🔍 Collision detected - isSpore: ${isSpore}, cell.radius: ${cell.radius.toFixed(1)}, player.radius: ${this.player.radius.toFixed(1)}, requiredSize: ${requiredSize.toFixed(1)}`);
                }
                
                // Determine if player can eat this cell
                const canEatSpore = isSpore && CELLVIVE_CONSTANTS.EATING.SPORES_ALWAYS_EDIBLE;
                const canEatCell = typeof this.player.canEatCell === 'function'
                    ? this.player.canEatCell(cell)
                    : (CELLVIVE_CONSTANTS.EATING.USE_STRICT_SIZE_CHECK ? this.player.radius > requiredSize : this.player.radius >= requiredSize);
                
                if (canEatSpore || canEatCell) {
                    // Player eats the cell (spores are always edible!)
                    if (this.particleSystem) {
                        this.particleSystem.createCellConsumptionAnimation(
                            this.player.x, this.player.y, this.player.radius,
                            cell.x, cell.y, cell.radius, cell.color
                        );
                    }
                    
                    // Collision detected - player eats cell
                    GameLogger.debug(`🔵 Player eating ${isSpore ? 'spore' : 'cell'}: size ${cell.radius.toFixed(1)}, player ${this.player.radius.toFixed(1)}`);
                    
                    this.player.eat(cell);
                    this.score += Math.round(cell.radius * 10);
                    this.cells.splice(i, 1);
                    
                    if (isSpore) {
                        this.stats.sporesCollected++;
                        if (this.audioManager) this.audioManager.playSporeCollect();
                    } else {
                        this.stats.cellsEaten++;
                        if (this.audioManager) this.audioManager.playEat();
                    }
                    
                    if (CELLVIVE_CONSTANTS.DEBUGGING.ENABLE_GROWTH_LOGS) {
                        GameLogger.debug(`🌱 After eating - radius: ${this.player.radius.toFixed(1)}, baseRadius: ${this.player.baseRadius.toFixed(1)}`);
                    }
                    
                    // Score increase notification removed - too distracting
                } else if (cell.radius > this.player.radius * CELLVIVE_CONSTANTS.EATING.AI_CELL_SIZE_MULTIPLIER && !this.isGodModeEnabled()) {
                    // Cell eats the player - game over (unless god mode is enabled)
                    this.gameOver();
                    return;
                } else {
                    // Collision but size difference too small
                    if (CELLVIVE_CONSTANTS.DEBUGGING.ENABLE_COLLISION_LOGS) {
                        GameLogger.debug(`⚠️ Cannot eat AI cell - player ${this.player.radius.toFixed(1)} vs cell ${cell.radius.toFixed(1)} (need ${requiredSize.toFixed(1)}+)`);
                    }
                }
            }
        }
        
        // OPTIMIZED: Check AI cell collisions with other AI cells using spatial partitioning
        // Build spatial grid for efficient collision detection
        const cellGridSize = 150; // Grid cell size for collision detection
        const cellSpatialGrid = new Map();
        
        // Populate spatial grid with cells
        this.cells.forEach((cell, index) => {
            if (cell && typeof cell.x === 'number' && typeof cell.y === 'number') {
                const gridX = Math.floor(cell.x / cellGridSize);
                const gridY = Math.floor(cell.y / cellGridSize);
                const gridKey = `${gridX},${gridY}`;
                
                if (!cellSpatialGrid.has(gridKey)) {
                    cellSpatialGrid.set(gridKey, []);
                }
                cellSpatialGrid.get(gridKey).push({ cell, index });
            }
        });
        
        // Track cells to remove (in reverse order for safe removal)
        const cellsToRemove = new Set();
        
        // Check collisions only between cells in adjacent grid cells
        for (let i = this.cells.length - 1; i >= 0; i--) {
            if (cellsToRemove.has(i)) continue; // Skip already marked for removal
            
            const cell1 = this.cells[i];
            if (!cell1 || typeof cell1.x !== 'number' || typeof cell1.y !== 'number') {
                cellsToRemove.add(i);
                continue;
            }
            
            const gridX = Math.floor(cell1.x / cellGridSize);
            const gridY = Math.floor(cell1.y / cellGridSize);
            
            // Check 3x3 grid area around this cell
            for (let gx = gridX - 1; gx <= gridX + 1; gx++) {
                for (let gy = gridY - 1; gy <= gridY + 1; gy++) {
                    const gridKey = `${gx},${gy}`;
                    const gridCells = cellSpatialGrid.get(gridKey);
                    
                    if (gridCells) {
                        for (const { cell: cell2, index: j } of gridCells) {
                            if (i <= j || cellsToRemove.has(j)) continue; // Only check each pair once
                            
                            if (this.collisionDetector.checkCollision(cell1, cell2)) {
                                if (cell1.radius > cell2.radius * CELLVIVE_CONSTANTS.PERFORMANCE.EAT_SIZE_MULTIPLIER) {
                                    // cell1 eats cell2
                                    cell1.eat(cell2);
                                    cellsToRemove.add(j);
                                } else if (cell2.radius > cell1.radius * CELLVIVE_CONSTANTS.PERFORMANCE.EAT_SIZE_MULTIPLIER) {
                                    // cell2 eats cell1
                                    cell2.eat(cell1);
                                    cellsToRemove.add(i);
                                    break; // Exit inner loop since cell1 was eaten
                                }
                            }
                        }
                    }
                    if (cellsToRemove.has(i)) break; // Exit if cell1 was eaten
                }
                if (cellsToRemove.has(i)) break; // Exit if cell1 was eaten
            }
        }
        
        // Remove marked cells in reverse order to maintain indices
        const sortedIndices = Array.from(cellsToRemove).sort((a, b) => b - a);
        sortedIndices.forEach(index => {
            this.cells.splice(index, 1);
        });
        
        // Handle collisions between enemies and cells - OPTIMIZED
        // Use reverse iteration to safely remove elements during iteration
        for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
            const enemy = this.enemies[enemyIndex];
            if (!enemy) continue; // Safety check
            
            // Enemy vs regular cells - collect cells to remove first
            const cellsToRemove = [];
            for (let cellIndex = this.cells.length - 1; cellIndex >= 0; cellIndex--) {
                const cell = this.cells[cellIndex];
                if (!cell) continue; // Safety check
                
                if (this.collisionDetector.checkCollision(enemy, cell)) {
                    if (enemy.canEat && enemy.canEat(cell)) {
                        enemy.eat(cell);
                        cellsToRemove.push(cellIndex);
                    } else if (cell.radius > enemy.radius * CELLVIVE_CONSTANTS.PERFORMANCE.EAT_SIZE_MULTIPLIER_ENEMY) {
                        // Large cell can eat small enemy
                        if (cell.eat) cell.eat(enemy);
                        this.enemies.splice(enemyIndex, 1);
                        break; // Exit cell loop since enemy was removed
                    }
                }
            }
            
            // Remove cells in reverse order to maintain indices
            cellsToRemove.sort((a, b) => b - a).forEach(index => {
                this.cells.splice(index, 1);
            });
            
            // Enemy vs player - only check if enemy still exists
            if (enemy && this.enemies.includes(enemy) && this.collisionDetector.checkCollision(enemy, this.player)) {
                if (enemy.canEat && enemy.canEat(this.player)) {
                    // Enemy kills player
                    this.handlePlayerDeath('killed by enemy');
                    return; // Exit early to prevent further processing
                } else if (this.player.radius > enemy.radius * CELLVIVE_CONSTANTS.PERFORMANCE.EAT_SIZE_MULTIPLIER_ENEMY) {
                    // Player can eat enemy
                    this.player.eat(enemy);
                    this.enemies.splice(enemyIndex, 1);
                    this.stats.enemiesEaten++;
                    if (this.audioManager) this.audioManager.playEnemyEaten();
                }
            }
        }
        
        // Handle collisions between enemies
        for (let i = 0; i < this.enemies.length; i++) {
            for (let j = i + 1; j < this.enemies.length; j++) {
                const enemy1 = this.enemies[i];
                const enemy2 = this.enemies[j];
                
                if (this.collisionDetector.checkCollision(enemy1, enemy2)) {
                    // Special handling for virus-virus collisions
                    if (enemy1 instanceof VirusEnemy && enemy2 instanceof VirusEnemy) {
                        // Viruses stick together instead of eating each other
                        // Connection is handled by the VirusGroupManager
                        this.handleVirusConnection(enemy1, enemy2);
                    } else {
                        // Normal enemy collision behavior for other enemy types
                        if (enemy1.canEat(enemy2)) {
                            enemy1.eat(enemy2);
                            this.enemies.splice(j, 1);
                            j--;
                        } else if (enemy2.canEat(enemy1)) {
                            enemy2.eat(enemy1);
                            this.enemies.splice(i, 1);
                            i--;
                            break;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Handle virus-virus connections when they collide
     * Edge-to-edge connection handling - the VirusGroupManager handles the complex logic
     */
    handleVirusConnection(virus1, virus2) {
        // The VirusGroupManager handles all connection logic
        // This method is kept for compatibility but the real work is done in VirusGroupManager
        // The connection physics are handled by the maintainEdgeToEdgeFormation method
    }
    
    /**
     * Handle collective growth sharing when viruses connect
     * REMOVED: Viruses no longer grow when they connect
     */
    
    spawnCells() {
        if (this.spawnManager) this.spawnManager.spawnCells();
    }
    
    spawnEnemies() {
        if (this.spawnManager) this.spawnManager.spawnEnemies();
    }
    
    createRandomEnemy() {
        return this.spawnManager ? this.spawnManager.createRandomEnemy() : null;
    }
    
    /**
     * Update environment systems
     */
    updateEnvironment(deltaTime = 16) {
        if (!this.environmentManager) return;
        
        // Update environment manager
        this.environmentManager.update(deltaTime);
        
        // Apply environmental effects to all entities
        this.applyEnvironmentalEffects();
        
        // Handle food spawner collisions (DISABLED)
        // this.handleFoodSpawnerCollisions();
    }
    
    /**
     * Apply environmental effects to all cells and enemies
     */
    applyEnvironmentalEffects() {
        // Apply effects to player
        this.environmentManager.applyEffectsToCell(this.player);
        this.environmentManager.getActiveEffectsForCell(this.player).forEach(effect => {
            this.recordDiscovery(`environment_${String(effect).toLowerCase().replace(/\s+/g, '_')}`);
        });
        
        // Apply effects to AI cells
        this.cells.forEach(cell => {
            this.environmentManager.applyEffectsToCell(cell);
        });
        
        // Apply effects to enemies
        this.enemies.forEach(enemy => {
            this.environmentManager.applyEffectsToCell(enemy);
        });
    }
    
    /**
     * Handle food spawner collisions for all moving entities (DISABLED)
     */
    handleFoodSpawnerCollisions() {
        // FoodSpawners are disabled for now
        return;
        
        // Handle player food spawner collisions
        // this.environmentManager.handleFoodSpawnerCollisions(this.player);
        
        // Handle AI cell food spawner collisions
        // this.cells.forEach(cell => {
        //     this.environmentManager.handleFoodSpawnerCollisions(cell);
        // });
        
        // Handle enemy food spawner collisions
        // this.enemies.forEach(enemy => {
        //     this.environmentManager.handleFoodSpawnerCollisions(enemy);
        // });
    }
    
    /**
     * Create a random AI cell
     */
    createRandomCell() {
        return this.spawnManager ? this.spawnManager.createRandomCell() : null;
    }
    
    /**
     * Update enhanced systems
     */
    updateEnhancedSystems() {
        // Update particle system
        if (this.particleSystem) {
            this.particleSystem.update();
        }
        
        // Update power-up manager
        if (this.powerUpManager) {
            this.powerUpManager.update();
        }
        
        // Update enhanced UI
        if (this.enhancedUI) {
            this.enhancedUI.update();
        }
        
        // Update player power-up effects
        this.updatePlayerPowerUps();
    }
    
    /**
     * Update player power-up effects - simplified for permanent effects
     */
    updatePlayerPowerUps() {
        // No temporary power-ups to track anymore - all effects are permanent
        // This method is kept for compatibility but does nothing
    }

    updateProgression() {
        if (!this.player) return;
        const phases = this.getProgressionPhases();
        const nextPhase = phases
            .slice()
            .reverse()
            .find(phase => this.player.radius >= phase.MIN_SIZE) || phases[0];

        if (nextPhase.ID !== this.progression.lastPhaseId) {
            this.progression.phase = nextPhase;
            this.progression.lastPhaseId = nextPhase.ID;
            this.enhancedUI?.addNotification(`Phase: ${nextPhase.NAME}`, '#ffd166');
            this.recordDiscovery(`phase_${nextPhase.ID}`);
        } else {
            this.progression.phase = nextPhase;
        }
    }

    updateActiveMutations() {
        const now = Date.now();
        this.activeMutations = this.activeMutations.filter(mutation => mutation.endsAt > now);
        if (this.player) {
            this.player.mutationSpeedMultiplier = this.getActiveMutationValue('temporary_speed');
            this.player.hazardDamageReduction = Math.max(
                this.getActiveMutationValue('temporary_resistance'),
                this.player.toxicDamageReduction || 0
            );
            this.player.predatorSenseBonus = this.getActiveMutationValue('predator_sense');
            if (typeof this.player.updateMaxSpeed === 'function') {
                this.player.updateMaxSpeed();
            }
        }
    }

    getActiveMutationValue(type) {
        return this.activeMutations
            .filter(mutation => mutation.type === type)
            .reduce((total, mutation) => total + (mutation.value || 0), 0);
    }

    showMutationChoices() {
        if (!this.mutationPopup || !this.mutationChoiceGrid || !this.player) return false;
        const options = this.pickMutationChoices();
        if (options.length === 0) return false;
        this.mutationChoiceGrid.innerHTML = '';

        options.forEach(option => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'mutation-choice-btn';
            button.innerHTML = `
                <span class="mutation-choice-name">${option.NAME}</span>
                <span class="mutation-choice-desc">${option.DESCRIPTION}</span>
            `;
            button.addEventListener('click', () => this.applyMutationChoice(option));
            this.mutationChoiceGrid.appendChild(button);
        });

        this.pauseGame('mutation');
        this.mutationPopup.classList.remove('hidden');
        return true;
    }

    pickMutationChoices() {
        const options = this.getMutationOptions().slice();
        const count = Math.min(CELLVIVE_CONSTANTS.MUTATIONS?.CHOICES_PER_ORANGE_SPORE || 3, options.length);
        const choices = [];

        while (choices.length < count && options.length > 0) {
            const index = Math.floor(Math.random() * options.length);
            choices.push(options.splice(index, 1)[0]);
        }

        return choices;
    }

    applyMutationChoice(option) {
        if (!option || !this.player) return false;

        switch (option.TYPE) {
            case 'temporary_speed':
                this.addTimedMutation(option.TYPE, option.VALUE, option.DURATION);
                break;
            case 'temporary_resistance':
                this.addTimedMutation(option.TYPE, option.VALUE, option.DURATION);
                break;
            case 'predator_sense':
                this.addTimedMutation(option.TYPE, option.VALUE, option.DURATION);
                break;
            case 'health_patch':
                this.player.maxHealth += option.MAX_HEALTH || 0;
                this.player.health = Math.min(this.player.maxHealth, this.player.health + (option.HEALTH || 0));
                break;
            case 'spore_lure':
                for (let i = 0; i < (option.COUNT || 4); i++) {
                    this.spawnManager?.spawnRandomGreenSpore();
                }
                break;
        }

        this.enhancedUI?.addNotification(option.NAME, '#ffd166');
        this.recordDiscovery(`mutation_${option.ID}`);
        this.hideMutationChoices();
        return true;
    }

    addTimedMutation(type, value, duration) {
        this.activeMutations.push({
            type,
            value,
            endsAt: Date.now() + (duration || 20000)
        });
    }

    hideMutationChoices() {
        if (this.mutationPopup) {
            this.mutationPopup.classList.add('hidden');
        }
        if (this.mutationChoiceGrid) {
            this.mutationChoiceGrid.innerHTML = '';
        }
        this.resumeGame('mutation');
    }
    
    /**
     * Check if god mode is enabled
     */
    isGodModeEnabled() {
        return this.testingManager && this.testingManager.isEnabled('godmode');
    }

    toggleManualPause() {
        if (this.isPaused && this.pauseReasons.has('manual')) {
            this.resumeGame('manual');
        } else {
            this.pauseGame('manual');
        }
        this.updatePauseButton();
    }

    updatePauseButton() {
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.classList.toggle('paused', this.isPaused);
        }
    }

    /**
     * Pause the game
     * Stops all game logic updates but continues rendering
     */
    pause(reason = 'manual') {
        const wasPaused = this.isPaused;
        this.pauseReasons.add(reason);
        this.isPaused = this.pauseReasons.size > 0;
        if (!wasPaused && this.isPaused) {
            console.log('Game paused');
        }
        this.updatePauseButton();
        return true;
    }

    /**
     * Resume the game
     * Resumes game logic updates
     */
    resume(reason = 'manual') {
        if (!this.pauseReasons.has(reason)) {
            return false;
        }

        this.pauseReasons.delete(reason);
        this.isPaused = this.pauseReasons.size > 0;

        if (!this.isPaused) {
            this.lastTime = performance.now();
            console.log('Game resumed');
        }

        this.updatePauseButton();
        return !this.isPaused;
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.canvas && this.renderer) {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this.renderer.width = this.canvas.width;
            this.renderer.height = this.canvas.height;
        }
    }

    /**
     * Perform periodic cleanup to prevent memory leaks
     */
    performCleanup() {
        // Clean up dead cells
        this.cells = this.cells.filter(cell => cell && cell.health > 0);
        
        // Clean up dead enemies
        this.enemies = this.enemies.filter(enemy => enemy && enemy.health > 0);
        
        // Limit array sizes to prevent memory bloat
        if (this.cells.length > this.maxCells) {
            this.cells = this.cells.slice(-this.maxCells);
        }
        
        if (this.enemies.length > this.maxEnemies) {
            this.enemies = this.enemies.slice(-this.maxEnemies);
        }
        
        // Clear renderer caches if they get too large
        if (this.renderer && this.renderer.transformCache) {
            if (this.renderer.cacheSize > this.renderer.maxCacheSize * 0.8) {
                this.renderer.transformCache.clear();
                this.renderer.cacheSize = 0;
            }
        }
    }
    
    /**
     * Update camera to follow player with dynamic zoom based on size
     * Enhanced with null safety, error handling, and performance optimizations
     */
    updateCamera() {
        // Comprehensive null checks with early return
        if (!this.player || !this.camera || !this.config) {
            if (!this.camera) {
                this.camera = { x: 0, y: 0, zoom: 1.0 };
            }
            return;
        }
        
        // Fast validation using bitwise operations for performance
        const radius = this.player.radius;
        const x = this.player.x;
        const y = this.player.y;
        
        // Check for invalid values using fast operations
        if (!(radius > 0 && isFinite(radius) && isFinite(x) && isFinite(y))) {
            return;
        }
        
        try {
            // Calculate dynamic zoom based on player size
            // Every 100+ size increases zoom out by 0.1 (10% zoom out)
            const playerSize = Math.max(1, this.player.radius); // Ensure minimum size
            const zoomOutFactor = Math.floor(playerSize / 100) * 0.1;
            const targetZoom = Math.max(0.3, Math.min(2.0, 1.0 - zoomOutFactor)); // Clamp zoom range
            
            // Smooth zoom transition with safety bounds
            const currentZoom = this.camera.zoom || 1.0;
            const newZoom = currentZoom + (targetZoom - currentZoom) * 0.05;
            this.camera.zoom = Math.max(0.1, Math.min(5.0, newZoom)); // Clamp final zoom
            
            // Calculate effective viewport size with safety checks
            const rendererWidth = this.renderer ? this.renderer.width : this.config.canvasWidth || 800;
            const rendererHeight = this.renderer ? this.renderer.height : this.config.canvasHeight || 600;
            const worldWidth = this.config.worldWidth || 3000;
            const worldHeight = this.config.worldHeight || 3000;
            
            const effectiveViewportWidth = Math.max(100, rendererWidth / this.camera.zoom);
            const effectiveViewportHeight = Math.max(100, rendererHeight / this.camera.zoom);
            
            // Center camera on player with bounds checking
            const playerX = Math.max(0, Math.min(worldWidth, this.player.x));
            const playerY = Math.max(0, Math.min(worldHeight, this.player.y));
            
            // Use renderer dimensions for proper centering
            const targetX = playerX - rendererWidth / 2 / this.camera.zoom;
            const targetY = playerY - rendererHeight / 2 / this.camera.zoom;
            
            // Smooth camera following
            const currentX = this.camera.x || 0;
            const currentY = this.camera.y || 0;
            
            this.camera.x = currentX + (targetX - currentX) * 0.1;
            this.camera.y = currentY + (targetY - currentY) * 0.1;
            
            // Constrain camera to world bounds (adjusted for zoom)
            this.camera.x = Math.max(0, Math.min(this.camera.x, worldWidth - effectiveViewportWidth));
            this.camera.y = Math.max(0, Math.min(this.camera.y, worldHeight - effectiveViewportHeight));
            
            // Store viewport info for rendering
            this.camera.viewportWidth = effectiveViewportWidth;
            this.camera.viewportHeight = effectiveViewportHeight;
            
        } catch (error) {
            GameLogger.error(`Camera update error: ${error.message}`);
            // Fallback to safe defaults
            this.camera.zoom = 1.0;
            this.camera.x = this.player.x || 0;
            this.camera.y = this.player.y || 0;
        }
    }
    
    /**
     * Keep objects within world bounds
     */
    constrainToWorld(obj) {
        if (!obj || typeof obj.x !== 'number' || typeof obj.y !== 'number') {
            return; // Safety check for invalid objects
        }
        
        const radius = obj.radius || 0;
        const worldWidth = this.config?.worldWidth || 3000;
        const worldHeight = this.config?.worldHeight || 3000;
        
        obj.x = Math.max(radius, Math.min(obj.x, worldWidth - radius));
        obj.y = Math.max(radius, Math.min(obj.y, worldHeight - radius));
    }
    
    /**
     * Calculate distance between two objects safely
     */
    calculateDistance(obj1, obj2) {
        if (!obj1 || !obj2 || 
            typeof obj1.x !== 'number' || typeof obj1.y !== 'number' ||
            typeof obj2.x !== 'number' || typeof obj2.y !== 'number') {
            return Infinity; // Return large distance for invalid objects
        }
        
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check if object is within culling distance of player
     */
    isWithinCullingDistance(obj, simulationDistance = CELLVIVE_CONSTANTS.PERFORMANCE.SIMULATION_DISTANCE) {
        if (!this.player || !obj) return false;
        return this.calculateDistance(obj, this.player) < simulationDistance;
    }
    
    /**
     * Determine which zone a position is in based on distance from world center
     */
    getZoneAtPosition(x, y) {
        const worldCenterX = this.config.worldWidth / 2;
        const worldCenterY = this.config.worldHeight / 2;
        const distanceFromCenter = Math.hypot(x - worldCenterX, y - worldCenterY);
        
        const zones = CELLVIVE_CONSTANTS.WORLD.ZONES;
        
        if (distanceFromCenter <= zones.SAFE_ZONE.RADIUS) {
            return 'SAFE_ZONE';
        } else if (distanceFromCenter <= zones.NORMAL_ZONE.RADIUS) {
            return 'NORMAL_ZONE';
        } else if (distanceFromCenter <= zones.DANGER_ZONE.RADIUS) {
            return 'DANGER_ZONE';
        } else {
            return 'DEATH_ZONE';
        }
    }
    
    /**
     * Get zone-based spawn parameters for enemies
     */
    getZoneBasedEnemyParams(zone) {
        return this.spawnManager ? this.spawnManager.getZoneBasedEnemyParams(zone) : null;
    }
    
    spawnFoodCell() { this.spawnManager?.spawnFoodCell(); }
    spawnPowerUp() { this.spawnManager?.spawnPowerUp(); }
    spawnAmoeba() { this.spawnManager?.spawnAmoeba(); }
    spawnVirus() { this.spawnManager?.spawnVirus(); }
    spawnBiome(biomeType) { this.spawnManager?.spawnBiome(biomeType); }
    spawnBiomeNutrient() { this.spawnManager?.spawnBiomeNutrient(); }
    spawnBiomeToxic() { this.spawnManager?.spawnBiomeToxic(); }
    spawnBiomeSlow() { this.spawnManager?.spawnBiomeSlow(); }
    spawnBiomeAggressive() { this.spawnManager?.spawnBiomeAggressive(); }
    spawnBiomeNeutral() { this.spawnManager?.spawnBiomeNeutral(); }
    spawnSpecificBiome(biomeType, displayName) { this.spawnManager?.spawnSpecificBiome(biomeType, displayName); }
    spawnFoodSpawner() { this.spawnManager?.spawnFoodSpawner(); }
    spawnGiantCell() { this.spawnManager?.spawnGiantCell(); }
    spawnEnemySwarm() { this.spawnManager?.spawnEnemySwarm(); }
    spawnPowerUpStorm() { this.spawnManager?.spawnPowerUpStorm(); }
    
    // Clear Methods
    clearAllCells() {
        const count = this.cells.length;
        this.cells = [];
        console.log(`Cleared ${count} cells`);
    }
    
    clearAllEnemies() {
        const count = this.enemies.length;
        // Unregister all viruses from group manager
        this.enemies.forEach(enemy => {
            if (enemy instanceof VirusEnemy && this.virusGroupManager) {
                this.virusGroupManager.unregisterVirus(enemy);
            }
        });
        this.enemies = [];
        console.log(`Cleared ${count} enemies`);
    }
    
    clearEnvironment() {
        if (!this.environmentManager) return;
        const biomeCount = this.environmentManager.biomes.length;
        const spawnerCount = this.environmentManager.foodSpawners.length;
        this.environmentManager.clear();
        console.log(`Cleared environment: ${biomeCount} biomes, ${spawnerCount} foodSpawners`);
    }
    
    /**
     * Open talent system popup
     */
    /**
     * Opens the talent system UI with validation
     * @returns {boolean} Success status
     */
    openTalentSystem() {
        console.log('🎯 openTalentSystem called');
        
        // Validation checks
        if (!this.talentSystem) {
            console.error('[Game] Cannot open talent system - not initialized');
            return false;
        }
        
        if (this.gameState !== 'playing') {
            console.warn('[Game] Cannot open talent system - game not in playing state (current:', this.gameState + ')');
            return false;
        }
        
        if (!this.player || this.player.health <= 0) {
            console.warn('[Game] Cannot open talent system - player is dead or null');
            return false;
        }
        
        console.log('✅ Validation passed - opening talent system');
        
        try {
            this.pauseGame('talent');
            this.talentSystem.showPopup();
            console.log('🌳 Talent system opened successfully');
            return true;
        } catch (error) {
            console.error('[Game] Error opening talent system:', error);
            this.resumeGame('talent'); // Restore game state if opening failed
            return false;
        }
    }
    
    /**
     * Legacy method for backward compatibility - attempts reinitialization
     * @deprecated Use openTalentSystem() instead
     * @private
     */
    _legacyOpenTalentSystem() {
        if (this.talentSystem) {
            return this.openTalentSystem();
        } else {
            console.error('Talent system not initialized! Attempting to reinitialize...');
            try {
                this.initTalentSystem();
                if (this.talentSystem) {
                    this.pauseGame('talent');
                    this.talentSystem.showPopup();
                } else {
                    console.error('Failed to reinitialize talent system');
                }
            } catch (error) {
                console.error('Error reinitializing talent system:', error);
            }
        }
    }
    
    /**
     * Pause the game
     * @returns {boolean} Success status
     */
    pauseGame(reason = 'manual') {
        if (!this.isRunning) {
            console.warn('[Game] Cannot pause - game not running');
            return false;
        }
        
        return this.pause(reason);
    }
    
    /**
     * Resume the game
     * @returns {boolean} Success status
     */
    resumeGame(reason = 'manual') {
        if (!this.isPaused && !this.pauseReasons.has(reason)) {
            console.warn('[Game] Game not paused');
            return false;
        }

        return this.resume(reason);
    }
    
    spawnGreenSpore() { this.spawnManager?.spawnGreenSpore(); }
    spawnYellowSpore() { this.spawnManager?.spawnYellowSpore(); }
    spawnOrangeSpore() { this.spawnManager?.spawnOrangeSpore(); }
    spawnGreenSmall() { this.spawnManager?.spawnGreenSmall(); }
    spawnGreenMedium() { this.spawnManager?.spawnGreenMedium(); }
    spawnGreenLarge() { this.spawnManager?.spawnGreenLarge(); }
    spawnGreenXLarge() { this.spawnManager?.spawnGreenXLarge(); }
    spawnGreenXXLarge() { this.spawnManager?.spawnGreenXXLarge(); }
    spawnSpecificGreenSpore(variant, description) { this.spawnManager?.spawnSpecificGreenSpore(variant, description); }
    spawnRandomGreenSpore() { this.spawnManager?.spawnRandomGreenSpore(); }
    spawnRandomSpore() { this.spawnManager?.spawnRandomSpore(); }
    testSpawnerFunctionality() { this.spawnManager?.testSpawnerFunctionality(); }
    testTalentSystem() { this.spawnManager?.testTalentSystem(); }
    testSpeedBoosts() { this.spawnManager?.testSpeedBoosts(); }

    testTalentPopup() {
        console.log('🧪 Testing talent popup directly...');
        this.openTalentSystem();
    }
    
    testTalentSystemEndToEnd() {
        console.log('🧪 Testing talent system end-to-end...');
        if (!this.talentSystem) {
            console.error('🧪 Talent system not initialized');
            return false;
        }
        const popup = document.getElementById('talent-popup');
        const grid = document.getElementById('talent-grid');
        if (!popup || !grid) {
            console.error('🧪 Required HTML elements missing');
            return false;
        }
        try {
            this.openTalentSystem();
            console.log('🧪 Talent popup opened successfully');
            setTimeout(() => {
                if (this.talentSystem) {
                    this.talentSystem.hidePopup();
                    console.log('🧪 Talent popup closed successfully');
                }
            }, 1000);
            return true;
        } catch (error) {
            console.error('🧪 Error testing talent system:', error);
            return false;
        }
    }
    
    /**
     * Force camera to be properly centered on player
     */
    forceCenterCameraOnPlayer() {
        if (!this.player || !this.camera) return;
        
        const rendererWidth = this.renderer ? this.renderer.width : this.config.canvasWidth || 800;
        const rendererHeight = this.renderer ? this.renderer.height : this.config.canvasHeight || 600;
        
        // Force camera to be exactly centered on player
        this.camera.x = this.player.x - rendererWidth / 2 / this.camera.zoom;
        this.camera.y = this.player.y - rendererHeight / 2 / this.camera.zoom;
        
        console.log('🧪 Forced camera to center on player:', {
            playerPos: { x: this.player.x, y: this.player.y },
            cameraPos: { x: this.camera.x, y: this.camera.y },
            zoom: this.camera.zoom
        });
    }
    
    /**
     * Test collision detection and player interactions
     */
    testCollisionDetection() {
        if (!this.player) return;
        
        console.log('🧪 Testing collision detection...');
        
        // Force camera to be centered on player first
        this.forceCenterCameraOnPlayer();
        
        // Log current player position
        console.log('Player position:', { x: this.player.x, y: this.player.y });
        console.log('Camera position:', { x: this.camera.x, y: this.camera.y, zoom: this.camera.zoom });
        
        // Calculate where the player should appear on screen
        const rendererWidth = this.renderer ? this.renderer.width : this.config.canvasWidth || 800;
        const rendererHeight = this.renderer ? this.renderer.height : this.config.canvasHeight || 600;
        const expectedScreenX = (this.player.x - this.camera.x) * this.camera.zoom + rendererWidth / 2;
        const expectedScreenY = (this.player.y - this.camera.y) * this.camera.zoom + rendererHeight / 2;
        
        console.log('Expected player screen position:', { x: expectedScreenX, y: expectedScreenY });
        console.log('Canvas center:', { x: rendererWidth / 2, y: rendererHeight / 2 });
        console.log('Position difference:', { 
            x: expectedScreenX - rendererWidth / 2, 
            y: expectedScreenY - rendererHeight / 2 
        });
        
        // Spawn a test cell very close to the player
        const testRadius = 10;
        
        // ✅ FIXED: Mark as spore so it's edible (test collision cell)
        const testCell = new Cell({
            x: this.player.x + 30, // Very close to player
            y: this.player.y + 30,
            radius: testRadius,
            color: '#FF0000', // Red for visibility
            speed: 0,
            isSpore: true, // CRITICAL: Test cells must be marked as spores
            sporeType: 'growth_hormone',
            sporeData: {
                radius: testRadius,
                growth: Math.ceil(testRadius / 5),
                size: Math.ceil(testRadius / 5),
                type: 'growth_hormone'
            }
        });
        
        this.cells.push(testCell);
        console.log('🧪 Spawned edible test cell at:', { x: testCell.x, y: testCell.y, isSpore: testCell.isSpore });
        
        // Check if collision detection would work
        const distance = Math.sqrt(
            Math.pow(this.player.x - testCell.x, 2) + 
            Math.pow(this.player.y - testCell.y, 2)
        );
        const collisionDistance = this.player.radius + testCell.radius;
        
        console.log('Distance between player and test cell:', distance);
        console.log('Collision distance threshold:', collisionDistance);
        console.log('Should collide:', distance < collisionDistance);
        
        // Remove the test cell after 3 seconds
        setTimeout(() => {
            const index = this.cells.indexOf(testCell);
            if (index > -1) {
                this.cells.splice(index, 1);
                console.log('🧪 Test cell removed');
            }
        }, 3000);
    }

    /**
     * Update UI elements
     */
    updateUI() {
        // Update score
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.score;
        }
        
        // Update player size
        const sizeElement = document.getElementById('size');
        if (sizeElement && this.player) {
            sizeElement.textContent = Math.round(this.player.radius);
        }
        
        // Update cell count
        const cellCountElement = document.getElementById('cell-count');
        if (cellCountElement) {
            cellCountElement.textContent = this.cells.length;
        }

        const healthElement = document.getElementById('health');
        if (healthElement && this.player) {
            healthElement.textContent = `${Math.round(this.player.health)}/${Math.round(this.player.maxHealth)}`;
        }

        const talentPoints = this.player && typeof this.player.talentPoints === 'number'
            ? this.player.talentPoints
            : 0;
        const talentPointsElement = document.getElementById('talent-points');
        if (talentPointsElement) {
            talentPointsElement.textContent = talentPoints;
        }
        const bottomTalentPointsElement = document.getElementById('talent-points-bottom');
        if (bottomTalentPointsElement) {
            bottomTalentPointsElement.textContent = talentPoints;
        }

        const phaseElement = document.getElementById('phase');
        if (phaseElement) {
            phaseElement.textContent = this.progression.phase.NAME;
        }

        const eventElement = document.getElementById('active-event');
        if (eventElement) {
            const event = this.environmentManager?.getEventStatus();
            eventElement.textContent = event ? `${event.name} (${Math.ceil(event.remainingMs / 1000)}s)` : 'Calm';
            eventElement.style.color = event?.color || '#d9e8ff';
        }

        const dangerElement = document.getElementById('nearest-danger');
        if (dangerElement) {
            const threat = this.environmentManager?.getNearestThreat(this.player);
            dangerElement.textContent = threat ? `${threat.label} ${Math.round(threat.distance)}px` : 'Clear';
        }

        const bestRunElement = document.getElementById('best-run');
        if (bestRunElement) {
            bestRunElement.textContent = `${this.persistence.bestSurvivalTime || 0}s / size ${this.persistence.bestSize || 0}`;
        }

        const codexCountElement = document.getElementById('codex-count');
        if (codexCountElement) {
            codexCountElement.textContent = Array.isArray(this.persistence.discoveries) ? this.persistence.discoveries.length : 0;
        }
        
        // Update zone information
        if (this.player) {
            const currentZone = this.getZoneAtPosition(this.player.x, this.player.y);
            const zoneElement = document.getElementById('zone');
            if (zoneElement) {
                const zoneNames = {
                    'SAFE_ZONE': '🟢 Safe Zone',
                    'NORMAL_ZONE': '🟡 Normal Zone', 
                    'DANGER_ZONE': '🟠 Danger Zone',
                    'DEATH_ZONE': '🔴 Death Zone'
                };
                zoneElement.textContent = zoneNames[currentZone] || 'Unknown Zone';
                zoneElement.style.color = currentZone === 'SAFE_ZONE' ? '#90EE90' : 
                                         currentZone === 'NORMAL_ZONE' ? '#FFD700' :
                                         currentZone === 'DANGER_ZONE' ? '#FF8C00' : '#FF0000';
            }
        }
    }
    
    /**
     * Render the game
     * FIXED: Added canvas state safety measures
     */
    render() {
        if (!this.renderer) return;
        
        // FIXED: Ensure clean canvas state at start of each frame
        this.ctx.save();
        
        this.renderer.clear();
        
        // Render background
        this.renderer.renderBackground(this.camera, this.config.worldWidth, this.config.worldHeight);
        
        // Render environment elements
        if (this.environmentManager) {
            const environmentElements = this.environmentManager.getRenderElements();
            this.renderer.renderEnvironment(environmentElements, this.camera);
        }
        
        // Render all cells
        this.cells.forEach(cell => {
            this.renderer.renderCell(cell, this.camera);
        });
        
        // Render enemies
        this.enemies.forEach(enemy => {
            this.renderer.renderCell(enemy, this.camera);
        });
        
        // Render virus connections
        const viruses = this.enemies.filter(enemy => enemy instanceof VirusEnemy);
        if (viruses.length > 0) {
            this.renderer.renderVirusConnections(viruses, this.camera);
        }
        
        // Render power-ups
        if (this.powerUpManager) {
            const powerUps = this.powerUpManager.getRenderPowerUps();
            powerUps.forEach(powerUp => {
                this.renderer.renderPowerUp(powerUp, this.camera);
            });
        }
        
        // Render particles
        if (this.particleSystem) {
            this.particleSystem.render(this.ctx, this.camera);
        }
        
        // Render player
        if (this.player) {
            this.renderer.renderPlayer(this.player, this.camera);
        }
        
        // Render world edge warnings
        if (this.player) {
            this.renderer.renderWorldEdgeWarnings(
                this.player,
                this.camera,
                this.config.worldWidth,
                this.config.worldHeight
            );
        }
        
        // Render enhanced UI
        if (this.enhancedUI) {
            this.enhancedUI.render();
        }
        
        // Render UI overlay (legacy)
        this.renderer.renderUI();
        
        // Render minimap
        this.renderer.renderMinimap(
            this.player, 
            this.camera, 
            this.config.worldWidth, 
            this.config.worldHeight
        );
        
        // FIXED: Restore canvas state at end of each frame to prevent state leakage
        this.ctx.restore();
    }
    
    /**
     * Handle game over
     */
    gameOver() {
        console.log('🔬 Game Over!');
        this.gameState = 'gameOver';
        this.updateBestRunStats(this.score, this.player?.radius || 0, Math.floor(this.gameTime / 1000));
        
        // Show game over screen
        const gameOverElement = document.getElementById('game-over');
        const finalScoreElement = document.getElementById('final-score');
        
        if (gameOverElement && finalScoreElement) {
            finalScoreElement.textContent = this.score;
            gameOverElement.classList.remove('hidden');
        }
    }
    
    /**
     * Restart the game
     */
    restart() {
        console.log('🔬 Restarting game...');
        
        // Reset game state
        this.gameState = 'playing';
        this.pauseReasons.clear();
        this.isPaused = false;
        this.score = 0;
        this.gameTime = 0;
        this.cells = [];
        this.enemies = []; // Reset enemies too
        this.camera = { x: 0, y: 0, zoom: 1.0 };
        this.activeMutations = [];
        const phases = this.getProgressionPhases();
        this.progression = {
            phase: phases[0],
            lastPhaseId: phases[0].ID
        };
        
        // Reset environment
        if (this.environmentManager) {
            this.environmentManager.clear();
            this.environmentManager.spawnInitialElements();
        }
        
        // Reset enhanced systems
        if (this.particleSystem) {
            this.particleSystem.clear();
        }
        if (this.powerUpManager) {
            this.powerUpManager.clear();
        }
        if (this.tutorialManager) {
            // Don't reset tutorial discoveries - preserve player's learning progress
            this.tutorialManager.clearCurrentTutorial();
        }
        
        // Reset player
        this.initPlayer();
        this.configureRuntimeServices();
        this.initCells();
        
        // Reset enemies
        this.initEnemies();
        
        // Reset game start time
        this.gameStartTime = Date.now();
        
        // Hide game over screen
        this.hideGameOverScreen();
        
        // Start the game loop
        this.start();
        
        console.log('✅ Game restarted');
    }
    
    /**
     * Update world size (for easy future adjustments)
     */
    setWorldSizeMultiplier(multiplier) {
        this.config.worldSizeMultiplier = multiplier;
        this.config.worldWidth = this.config.baseWorldWidth * this.config.worldSizeMultiplier;
        this.config.worldHeight = this.config.baseWorldHeight * this.config.worldSizeMultiplier;
        
        console.log(`🔬 World size updated: ${this.config.worldWidth}x${this.config.worldHeight} (${multiplier}x multiplier)`);
    }
    
    /**
     * Get current world size info
     */
    getWorldSizeInfo() {
        return {
            multiplier: this.config.worldSizeMultiplier,
            width: this.config.worldWidth,
            height: this.config.worldHeight,
            baseWidth: this.config.baseWorldWidth,
            baseHeight: this.config.baseWorldHeight
        };
    }
    
    /**
     * Stop the game
     */
    stop() {
        console.log('🔬 Stopping Cellvive game...');
        this.isRunning = false;
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        console.log('✅ Cellvive game stopped');
    }
}

// Export for GameHub
window.CellviveGame = CellviveGame;
