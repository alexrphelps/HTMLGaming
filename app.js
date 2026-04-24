/**
 * GameHub Main Application
 * Orchestrates the entire game platform
 */
class GameHubApp {
    constructor() {
        // Suppress console.log by default to reduce noisy output in non-dev environments.
        // Enable verbose logs by setting localStorage.GH_DEBUG = 'true' or running on localhost.
        (function() {
            try {
                const dev = (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) || (typeof localStorage !== 'undefined' && localStorage.getItem('GH_DEBUG') === 'true');
                if (!dev && typeof console !== 'undefined') {
                    // Keep console.warn/error intact; only mute console.log
                    console.log = function() {};
                }
            } catch (e) {
                // Ignore — keep logging if anything goes wrong
            }
        })();

        this.gameSelector = null;
        this.currentScreen = 'loading';
        this.loadingProgress = 0;
        this.currentGame = null;
        
        // DOM elements
        this.loadingScreen = null;
        this.appContainer = null;
        this.gameScreen = null;
        
        // Navigation
        this.screens = new Map();
        this.navigationHistory = [];
        this.navigationState = {
            current: 'loading',
            previous: null,
            canGoBack: false
        };
        this.navigationConfig = new Map();
        
        // Settings with defaults and validation
        this.settings = this.loadSettings();
        
        // Loading system
        this.loadingTasks = new Map();
        this.loadingStartTime = null;
        this.isLoading = false;
        
        console.log('🎮 GameHub App starting...');
    }
    
    async init() {
        try {
            this.isLoading = true;
            this.loadingStartTime = Date.now();
            
            // Initialize DOM references
            this.initializeDOM();
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize systems with progress tracking
            await this.initializeSystemsWithProgress();
            
            // Setup navigation
            await this.setupNavigationWithProgress();
            
            // Load initial content
            await this.loadInitialContentWithProgress();
            
            // Hide loading screen and show app
            await this.showAppWithTransition();
            
            this.isLoading = false;
            const analytics = this.getLoadingAnalytics();
            console.log(`✅ GameHub App initialized successfully in ${analytics.totalTime}ms`);
            console.log(`📊 Loading Analytics:`, analytics);
            
        } catch (error) {
            this.isLoading = false;
            console.error('❌ Failed to initialize GameHub App:', error);
            this.showErrorScreen(error);
        }
    }
    
    initializeDOM() {
        this.loadingScreen = document.getElementById('loading-screen');
        this.appContainer = document.getElementById('app');
        this.gameScreen = document.getElementById('game-screen');
        
        // Store screen elements
        this.screens.set('game-selector', document.getElementById('game-selector'));
        this.screens.set('game-screen', document.getElementById('game-screen'));
        this.screens.set('settings-screen', document.getElementById('settings-screen'));
    }
    
    showLoadingScreen() {
        this.updateLoadingProgress(0, 'Initializing GameHub...');
    }
    
    /**
     * Enhanced loading progress system with task tracking
     */
    updateLoadingProgress(progress, message) {
        this.loadingProgress = Math.max(0, Math.min(100, progress));
        
        const progressBar = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');
        
        if (progressBar) {
            progressBar.style.width = `${this.loadingProgress}%`;
        }
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        // Log progress for debugging
        console.log(`📊 Loading: ${this.loadingProgress}% - ${message}`);
    }
    
    /**
     * Register a loading task with estimated duration
     */
    registerLoadingTask(taskId, estimatedDuration = 1000) {
        this.loadingTasks.set(taskId, {
            startTime: Date.now(),
            estimatedDuration,
            completed: false
        });
    }
    
    /**
     * Complete a loading task and update progress
     */
    completeLoadingTask(taskId, totalTasks) {
        const task = this.loadingTasks.get(taskId);
        if (task) {
            task.completed = true;
            task.actualDuration = Date.now() - task.startTime;
            
            // Calculate progress based on completed tasks
            const completedTasks = Array.from(this.loadingTasks.values()).filter(t => t.completed).length;
            const progress = Math.round((completedTasks / totalTasks) * 100);
            
            this.updateLoadingProgress(progress, `Completed ${completedTasks}/${totalTasks} tasks`);
        }
    }
    
    /**
     * Wait for a minimum loading time to ensure smooth UX
     */
    async ensureMinimumLoadingTime(minimumTime = 1500) {
        if (this.loadingStartTime) {
            const elapsed = Date.now() - this.loadingStartTime;
            const remaining = Math.max(0, minimumTime - elapsed);
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }
        }
    }
    
    /**
     * Get loading performance analytics
     */
    getLoadingAnalytics() {
        const totalTime = Date.now() - this.loadingStartTime;
        const tasks = Array.from(this.loadingTasks.values());
        
        return {
            totalTime,
            tasksCompleted: tasks.filter(t => t.completed).length,
            totalTasks: tasks.length,
            averageTaskTime: tasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0) / tasks.length,
            slowestTask: tasks.reduce((slowest, t) => 
                (t.actualDuration || 0) > (slowest.actualDuration || 0) ? t : slowest, 
                { actualDuration: 0 }
            )
        };
    }
    
    async initializeSystemsWithProgress() {
        const totalTasks = 3;
        
        try {
            // Task 1: Initialize game selector
            this.registerLoadingTask('gameSelector', 800);
            this.updateLoadingProgress(10, 'Setting up game selection...');
            
            this.gameSelector = new GameSelector();
            this.gameSelector.init();
            this.completeLoadingTask('gameSelector', totalTasks);
            
            // Task 2: Setup game selection events
            this.registerLoadingTask('gameEvents', 200);
            this.updateLoadingProgress(30, 'Configuring game events...');
            
            this.gameSelector.on('game:selected', (game) => {
                this.launchGame(game);
            });
            this.completeLoadingTask('gameEvents', totalTasks);
            
            // Task 3: Initialize settings
            this.registerLoadingTask('settings', 500);
            this.updateLoadingProgress(50, 'Loading settings...');
            
            this.initializeSettings();
            this.completeLoadingTask('settings', totalTasks);
            
        } catch (error) {
            console.error('❌ Failed to initialize systems:', error);
            throw new Error(`System initialization failed: ${error.message}`);
        }
    }
    
    async setupNavigationWithProgress() {
        this.registerLoadingTask('navigation', 300);
        this.updateLoadingProgress(60, 'Setting up navigation...');
        
        this.setupNavigation();
        this.completeLoadingTask('navigation', 1);
    }
    
    async loadInitialContentWithProgress() {
        const totalTasks = 2;
        
        // Task 1: Setup error handling
        this.registerLoadingTask('errorHandling', 200);
        this.updateLoadingProgress(70, 'Setting up error handling...');
        
        this.setupErrorHandling();
        this.completeLoadingTask('errorHandling', totalTasks);
        
        // Task 2: Finalize setup
        this.registerLoadingTask('finalize', 300);
        this.updateLoadingProgress(85, 'Finalizing setup...');
        
        // Ensure minimum loading time for smooth UX
        await this.ensureMinimumLoadingTime();
        this.completeLoadingTask('finalize', totalTasks);
        
        this.updateLoadingProgress(100, 'Ready to play!');
    }
    
    async showAppWithTransition() {
        return new Promise((resolve) => {
            // Smooth fade out transition
            this.loadingScreen.style.transition = 'opacity 0.5s ease-out';
            this.loadingScreen.style.opacity = '0';
            
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
                this.appContainer.classList.remove('hidden');
                this.navigateTo('game-selector', false); // Don't add to history on initial load
                
                // Add a subtle fade-in for the main app
                this.appContainer.style.opacity = '0';
                this.appContainer.style.transition = 'opacity 0.3s ease-in';
                
                setTimeout(() => {
                    this.appContainer.style.opacity = '1';
                    resolve();
                }, 50);
            }, 500);
        });
    }
    
    showErrorScreen(error) {
        const loadingContent = this.loadingScreen.querySelector('.loading-content');
        if (!loadingContent) return;

        // Build error content using DOM methods (avoid innerHTML)
        loadingContent.textContent = '';

        const container = document.createElement('div');
        container.className = 'error-content';

        const icon = document.createElement('div');
        icon.className = 'error-icon';
        icon.textContent = '❌';

        const title = document.createElement('h2');
        title.textContent = 'Oops! Something went wrong';

        const msg = document.createElement('p');
        msg.textContent = 'Failed to initialize GameHub';

        const details = document.createElement('div');
        details.className = 'error-details';
        details.textContent = error?.message || 'Unknown error';

        const retry = document.createElement('button');
        retry.className = 'retry-btn';
        retry.textContent = 'Try Again';
        retry.addEventListener('click', () => location.reload());

        container.appendChild(icon);
        container.appendChild(title);
        container.appendChild(msg);
        container.appendChild(details);
        container.appendChild(retry);

        loadingContent.appendChild(container);
    }
    
    /**
     * Initialize navigation configuration
     */
    initializeNavigationConfig() {
        this.navigationConfig.set('game-selector', {
            id: 'game-selector',
            navButtonId: 'home-btn',
            title: 'Game Library',
            canGoBack: false,
            keyboardShortcut: '1'
        });
        
        this.navigationConfig.set('settings-screen', {
            id: 'settings-screen',
            navButtonId: 'settings-btn',
            title: 'Settings',
            canGoBack: true,
            keyboardShortcut: '2'
        });
        
        this.navigationConfig.set('game-screen', {
            id: 'game-screen',
            navButtonId: null,
            title: 'Game',
            canGoBack: true,
            keyboardShortcut: 'Escape'
        });
    }

    setupNavigation() {
        // Initialize navigation configuration
        this.initializeNavigationConfig();
        
        // Cache navigation elements for better performance
        const navElements = {
            homeBtn: document.getElementById('home-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            backBtn: document.getElementById('back-btn')
        };
        
        // Setup navigation button event listeners
        if (navElements.homeBtn) {
            navElements.homeBtn.addEventListener('click', () => {
                this.navigateTo('game-selector');
            });
        }
        
        if (navElements.settingsBtn) {
            navElements.settingsBtn.addEventListener('click', () => {
                this.navigateTo('settings-screen');
            });
        }
        
        // Setup back button if it exists
        if (navElements.backBtn) {
            navElements.backBtn.addEventListener('click', () => {
                this.navigateBack();
            });
        }
        
        // Enhanced global key bindings with navigation shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleGlobalKeydown(e);
        });
        
        // Update navigation state
        this.updateNavigationState();
    }
    
    /**
     * Handle global keyboard shortcuts
     */
    handleGlobalKeydown(e) {
        // Check for navigation shortcuts
        const config = this.navigationConfig.get(this.navigationState.current);
        if (config && config.keyboardShortcut === e.key) {
            e.preventDefault();
            if (e.key === 'Escape') {
                this.navigateBack();
            } else {
                this.navigateTo(config.id);
            }
            return;
        }
        
        // Global shortcuts
        if (e.code === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        } else if (e.code === 'Escape' && this.navigationState.current === 'game-screen') {
            this.exitCurrentGame();
        } else if (e.altKey && e.key === 'ArrowLeft' && this.navigationState.canGoBack) {
            e.preventDefault();
            this.navigateBack();
        }
    }
    
    /**
     * Navigate to a specific screen with history tracking
     */
    navigateTo(screenName, addToHistory = true) {
        const config = this.navigationConfig.get(screenName);
        if (!config) {
            console.warn(`Navigation: Unknown screen "${screenName}"`);
            return false;
        }
        
        // Add to history if requested and not already current
        if (addToHistory && this.navigationState.current !== screenName) {
            this.navigationHistory.push({
                screen: this.navigationState.current,
                timestamp: Date.now(),
                data: this.getCurrentScreenData()
            });
            
            // Limit history size to prevent memory issues
            if (this.navigationHistory.length > 10) {
                this.navigationHistory.shift();
            }
        }
        
        // Update navigation state
        this.navigationState.previous = this.navigationState.current;
        this.navigationState.current = screenName;
        this.navigationState.canGoBack = this.navigationHistory.length > 0;
        
        // Show the screen
        this.showScreen(screenName);
        
        // Update navigation UI
        this.updateNavigationUI();
        
        console.log(`🧭 Navigated to: ${config.title} (${screenName})`);
        return true;
    }
    
    /**
     * Navigate back to the previous screen
     */
    navigateBack() {
        if (!this.navigationState.canGoBack || this.navigationHistory.length === 0) {
            console.log('🧭 No previous screen to navigate back to');
            return false;
        }
        
        const previousEntry = this.navigationHistory.pop();
        const previousScreen = previousEntry.screen;
        
        // Update navigation state
        this.navigationState.previous = this.navigationState.current;
        this.navigationState.current = previousScreen;
        this.navigationState.canGoBack = this.navigationHistory.length > 0;
        
        // Show the previous screen
        this.showScreen(previousScreen);
        
        // Update navigation UI
        this.updateNavigationUI();
        
        console.log(`🧭 Navigated back to: ${previousScreen}`);
        return true;
    }
    
    /**
     * Show a screen (internal method)
     */
    showScreen(screenName) {
        // Hide all screens
        this.screens.forEach((screen, name) => {
            if (screen) {
                screen.classList.remove('active');
            }
        });
        
        // Show selected screen
        const targetScreen = this.screens.get(screenName);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }
    
    /**
     * Update navigation UI elements
     */
    updateNavigationUI() {
        // Update navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Update active navigation button
        const config = this.navigationConfig.get(this.navigationState.current);
        if (config && config.navButtonId) {
            const activeNavBtn = document.getElementById(config.navButtonId);
            if (activeNavBtn) {
                activeNavBtn.classList.add('active');
            }
        }
        
        // Update back button visibility
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.style.display = this.navigationState.canGoBack ? 'block' : 'none';
        }
        
        // Update page title
        if (config) {
            document.title = `GameHub - ${config.title}`;
        }
    }
    
    /**
     * Update navigation state
     */
    updateNavigationState() {
        this.navigationState.canGoBack = this.navigationHistory.length > 0;
    }
    
    /**
     * Get current screen data for history
     */
    getCurrentScreenData() {
        const data = {
            timestamp: Date.now()
        };
        
        // Add screen-specific data
        switch (this.navigationState.current) {
            case 'game-screen':
                data.gameName = this.currentGame?.metadata?.name || 'Unknown';
                break;
            case 'settings-screen':
                data.settings = { ...this.settings };
                break;
        }
        
        return data;
    }
    
    /**
     * Get navigation analytics
     */
    getNavigationAnalytics() {
        return {
            currentScreen: this.navigationState.current,
            previousScreen: this.navigationState.previous,
            canGoBack: this.navigationState.canGoBack,
            historyLength: this.navigationHistory.length,
            history: this.navigationHistory.map(entry => ({
                screen: entry.screen,
                timestamp: entry.timestamp,
                timeAgo: Date.now() - entry.timestamp
            }))
        };
    }
    
    /**
     * Clear navigation history
     */
    clearNavigationHistory() {
        this.navigationHistory = [];
        this.navigationState.canGoBack = false;
        this.updateNavigationUI();
        console.log('🧭 Navigation history cleared');
    }
    
    /**
     * Add a new screen to navigation configuration
     */
    addNavigationScreen(config) {
        this.navigationConfig.set(config.id, {
            id: config.id,
            navButtonId: config.navButtonId || null,
            title: config.title || config.id,
            canGoBack: config.canGoBack !== false,
            keyboardShortcut: config.keyboardShortcut || null
        });
        console.log(`🧭 Added navigation screen: ${config.title}`);
    }
    
    async launchGame(gameModule) {
        try {
            console.log(`🎮 Launching game: ${gameModule.metadata.name}`);
            
            // Validate game module
            if (!gameModule || !gameModule.metadata) {
                throw new Error('Invalid game module');
            }
            
            // Check if game class is available
            if (!gameModule.gameClass) {
                throw new Error('Game is not available yet. Coming soon!');
            }
            
            // First, properly clean up any existing game
            await this.cleanupCurrentGame();
            
            // Clear the game screen container
            this.clearGameScreen();
            
            // Show game screen
            this.navigateTo('game-screen');
            
            // Update game title
            const gameTitle = document.getElementById('current-game-title');
            if (gameTitle) {
                gameTitle.textContent = gameModule.metadata.name;
            }
            
            // Load and start the game
            try {
                // Create new game instance
                this.currentGame = new gameModule.gameClass();
                
                // Initialize the game (each game will have its own engine)
                if (this.currentGame.init) {
                    await this.currentGame.init();
                }
                
                // Start the game
                if (this.currentGame.start) {
                    this.currentGame.start();
                }
                
                // Focus the game for input (especially important for iframe games)
                this.gameManager.focusGame(this.currentGame);
                
                console.log('✅ Game launched successfully');
                
            } catch (gameError) {
                console.error('Game initialization failed:', gameError);
                throw new Error(`Game failed to initialize: ${gameError.message}`);
            }
            
        } catch (error) {
            console.error('Failed to launch game:', error);
            this.showNotification(`Failed to launch ${gameModule?.metadata?.name || 'Unknown Game'}: ${error.message}`, 'error');
            this.navigateTo('game-selector');
        }
    }
    
    /**
     * Clean up the current game instance
     */
    async cleanupCurrentGame() {
        if (this.currentGame) {
            console.log('🎮 Cleaning up current game');
            
            try {
                // Handle game-specific cleanup if available
                if (this.currentGame.handleGameHubBack) {
                    this.currentGame.handleGameHubBack();
                } else {
                    // Stop the game
                    if (this.currentGame.stop) {
                        this.currentGame.stop();
                    }
                    
                    // Cleanup game resources
                    if (this.currentGame.cleanup) {
                        await this.currentGame.cleanup();
                    }
                }
            } catch (error) {
                console.warn('Error during game cleanup:', error);
            }
            
            this.currentGame = null;
        }
        
        // Focus the game if it's iframe-based
        this.gameManager.focusGame(this.currentGame);
    }
    
    /**
     * Clear the game screen container
     */
    clearGameScreen() {
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            // Build game screen DOM (avoid innerHTML to reduce XSS risk)
            while (gameScreen.firstChild) gameScreen.removeChild(gameScreen.firstChild);

            const header = document.createElement('div');
            header.className = 'game-header';

            const backBtn = document.createElement('button');
            backBtn.id = 'back-to-menu';
            backBtn.className = 'back-btn';
            backBtn.textContent = '← Back to Menu';

            const titleSpan = document.createElement('span');
            titleSpan.id = 'current-game-title';
            titleSpan.className = 'game-title';

            const controls = document.createElement('div');
            controls.className = 'game-controls';

            const pauseBtn = document.createElement('button');
            pauseBtn.id = 'pause-btn';
            pauseBtn.className = 'control-btn';
            pauseBtn.textContent = '⏸️';

            const restartBtn = document.createElement('button');
            restartBtn.id = 'restart-btn';
            restartBtn.className = 'control-btn';
            restartBtn.textContent = '🔄';

            const fsBtn = document.createElement('button');
            fsBtn.id = 'fullscreen-btn';
            fsBtn.className = 'control-btn';
            fsBtn.textContent = '⛶';

            controls.appendChild(pauseBtn);
            controls.appendChild(restartBtn);
            controls.appendChild(fsBtn);

            header.appendChild(backBtn);
            header.appendChild(titleSpan);
            header.appendChild(controls);

            const container = document.createElement('div');
            container.className = 'game-container';

            const canvas = document.createElement('canvas');
            canvas.id = 'game-canvas';
            canvas.className = 'game-canvas';
            canvas.setAttribute('tabindex', '0');

            const hud = document.createElement('div');
            hud.id = 'game-hud';
            hud.className = 'game-hud';

            container.appendChild(canvas);
            container.appendChild(hud);

            gameScreen.appendChild(header);
            gameScreen.appendChild(container);

            // Re-setup navigation event listeners
            this.setupGameScreenNavigation();
        }
    }
    
    /**
     * Simple Game Manager - handles basic game lifecycle
     */
    gameManager = {
        /**
         * Check if a game is iframe-based
         */
        isIframeGame(gameInstance) {
            return gameInstance && gameInstance.iframe;
        },
        
        /**
         * Focus game for input (for iframe games)
         */
        focusGame(gameInstance) {
            if (this.isIframeGame(gameInstance) && gameInstance.iframe) {
                gameInstance.iframe.focus();
            }
        }
    };
    
    /**
     * Setup navigation for the game screen
     */
    setupGameScreenNavigation() {
        // Game screen controls
        document.getElementById('back-to-menu')?.addEventListener('click', () => {
            this.exitCurrentGame();
        });
        
        document.getElementById('pause-btn')?.addEventListener('click', () => {
            this.toggleGamePause();
        });
        
        document.getElementById('restart-btn')?.addEventListener('click', () => {
            this.restartCurrentGame();
        });
        
        document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }
    
    async exitCurrentGame() {
        await this.cleanupCurrentGame();
        
        // Clear game title
        const gameTitle = document.getElementById('current-game-title');
        if (gameTitle) {
            gameTitle.textContent = '';
        }
        
        this.navigateTo('game-selector');
    }
    
    toggleGamePause() {
        if (this.currentGame) {
            if (this.currentGame.isPaused) {
                if (this.currentGame.resume) {
                    this.currentGame.resume();
                }
            } else {
                if (this.currentGame.pause) {
                    this.currentGame.pause();
                }
            }
            
            // Update pause button
            const pauseBtn = document.getElementById('pause-btn');
            if (pauseBtn) {
                pauseBtn.textContent = this.currentGame.isPaused ? '▶️' : '⏸️';
            }
        }
    }
    
    restartCurrentGame() {
        if (this.currentGame) {
            console.log('🎮 Restarting current game');
            if (this.currentGame.reset) {
                this.currentGame.reset();
            }
            if (this.currentGame.start) {
                this.currentGame.start();
            }
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Failed to enter fullscreen:', err);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.warn('Failed to exit fullscreen:', err);
            });
        }
    }
    
    /**
     * Load settings from localStorage with validation and defaults
     */
    loadSettings() {
        const defaultSettings = {
            masterVolume: 0.8,
            graphicsQuality: 'medium',
            enableSound: true,
            showFPS: true
        };
        
        try {
            const savedSettings = localStorage.getItem('gamehub-settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                // Validate and merge with defaults
                return {
                    ...defaultSettings,
                    ...parsed,
                    // Ensure volume is within valid range
                    masterVolume: Math.max(0, Math.min(1, parsed.masterVolume || defaultSettings.masterVolume)),
                    // Validate graphics quality
                    graphicsQuality: ['low', 'medium', 'high'].includes(parsed.graphicsQuality) 
                        ? parsed.graphicsQuality 
                        : defaultSettings.graphicsQuality
                };
            }
        } catch (error) {
            console.warn('Failed to load settings from localStorage:', error);
        }
        
        return defaultSettings;
    }
    
    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('gamehub-settings', JSON.stringify(this.settings));
            console.log('✅ Settings saved successfully');
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }
    
    /**
     * Update a setting and save it
     */
    updateSetting(key, value) {
        if (this.settings.hasOwnProperty(key)) {
            this.settings[key] = value;
            this.saveSettings();
            
            // Emit setting change event for other components
            this.onSettingChanged(key, value);
            
            console.log(`🔧 Setting updated: ${key} = ${value}`);
        }
    }
    
    /**
     * Handle setting changes (can be overridden by subclasses)
     */
    onSettingChanged(key, value) {
        // Apply setting changes immediately
        switch (key) {
            case 'showFPS':
                const fpsElement = document.getElementById('fps-counter');
                if (fpsElement) {
                    fpsElement.style.display = value ? 'block' : 'none';
                }
                break;
            case 'masterVolume':
                // Apply volume to any active audio contexts
                this.applyMasterVolume(value);
                break;
        }
    }
    
    /**
     * Apply master volume to audio contexts
     */
    applyMasterVolume(volume) {
        // This can be extended to control game audio
        if (this.currentGame && this.currentGame.setMasterVolume) {
            this.currentGame.setMasterVolume(volume);
        }
    }

    initializeSettings() {
        // Cache DOM elements for better performance
        const settingsElements = {
            masterVolumeSlider: document.getElementById('master-volume'),
            volumeDisplay: document.getElementById('volume-display'),
            graphicsSelect: document.getElementById('graphics-quality'),
            enableSoundCheckbox: document.getElementById('enable-sound'),
            showFpsCheckbox: document.getElementById('show-fps')
        };
        
        // Load current settings into UI
        this.loadSettingsIntoUI(settingsElements);
        
        // Volume control with debounced saving
        if (settingsElements.masterVolumeSlider) {
            let volumeTimeout;
            settingsElements.masterVolumeSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value) / 100;
                
                // Update display immediately
                if (settingsElements.volumeDisplay) {
                    settingsElements.volumeDisplay.textContent = `${e.target.value}%`;
                }
                
                // Debounce setting save to avoid excessive localStorage writes
                clearTimeout(volumeTimeout);
                volumeTimeout = setTimeout(() => {
                    this.updateSetting('masterVolume', volume);
                }, 100);
            });
        }
        
        // Graphics quality
        if (settingsElements.graphicsSelect) {
            settingsElements.graphicsSelect.addEventListener('change', (e) => {
                this.updateSetting('graphicsQuality', e.target.value);
            });
        }
        
        // Sound toggle
        if (settingsElements.enableSoundCheckbox) {
            settingsElements.enableSoundCheckbox.addEventListener('change', (e) => {
                this.updateSetting('enableSound', e.target.checked);
            });
        }
        
        // FPS counter toggle
        if (settingsElements.showFpsCheckbox) {
            settingsElements.showFpsCheckbox.addEventListener('change', (e) => {
                this.updateSetting('showFPS', e.target.checked);
            });
        }
    }
    
    /**
     * Load current settings into UI elements
     */
    loadSettingsIntoUI(elements) {
        // Volume
        if (elements.masterVolumeSlider) {
            elements.masterVolumeSlider.value = Math.round(this.settings.masterVolume * 100);
        }
        if (elements.volumeDisplay) {
            elements.volumeDisplay.textContent = `${Math.round(this.settings.masterVolume * 100)}%`;
        }
        
        // Graphics quality
        if (elements.graphicsSelect) {
            elements.graphicsSelect.value = this.settings.graphicsQuality;
        }
        
        // Sound toggle
        if (elements.enableSoundCheckbox) {
            elements.enableSoundCheckbox.checked = this.settings.enableSound;
        }
        
        // FPS counter
        if (elements.showFpsCheckbox) {
            elements.showFpsCheckbox.checked = this.settings.showFPS;
        }
        
        // Apply initial setting states
        this.onSettingChanged('showFPS', this.settings.showFPS);
    }
    
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showNotification('An unexpected error occurred', 'error');
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showNotification('An unexpected error occurred', 'error');
        });
    }
    
    showNotification(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        icon.textContent = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';

        const msg = document.createElement('div');
        msg.className = 'toast-message';
        msg.textContent = message;

        const close = document.createElement('button');
        close.className = 'toast-close';
        close.textContent = '×';
        close.addEventListener('click', () => toast.remove());

        toast.appendChild(icon);
        toast.appendChild(msg);
        toast.appendChild(close);

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }
    
    cleanup() {
        if (this.currentGame) {
            this.currentGame.cleanup();
        }
        
        if (this.gameSelector) {
            this.gameSelector.cleanup();
        }
        
        console.log('🎮 GameHub App cleaned up');
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    window.gameHubApp = new GameHubApp();
    await window.gameHubApp.init();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.gameHubApp) {
        window.gameHubApp.cleanup();
    }
});

// Make app available globally
window.GameHubApp = GameHubApp;
