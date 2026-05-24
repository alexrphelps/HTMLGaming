/**
 * GameHub Main Application
 * Orchestrates the entire game platform
 */
const GameHubAppEventEmitter = (() => {
    if (typeof window !== 'undefined' && typeof window.EventEmitter === 'function') {
        return window.EventEmitter;
    }
    if (typeof require === 'function') {
        try {
            const required = require('./utils/EventEmitter');
            if (typeof required === 'function') return required;
            if (typeof window !== 'undefined' && typeof window.EventEmitter === 'function') return window.EventEmitter;
        } catch (error) {
            return null;
        }
    }
    return null;
})();

const GameHubAppScreen = (typeof window !== 'undefined' && window.GameScreen)
    ? window.GameScreen
    : (typeof require === 'function' ? require('./ui/GameScreen') : null);

class GameHubApp {
    constructor() {
        this._listenerCleanups = new Set();
        this.Logger = this.resolveLogger();
        this._resources = this.createManagedResource();
        this.eventEmitter = typeof GameHubAppEventEmitter === 'function' ? new GameHubAppEventEmitter() : null;
        this.gameScreenShell = null;

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
        
        // Loading system
        this.loadingTasks = new Map();
        this.loadingStartTime = null;
        this.isLoading = false;
        
        try { this.Logger.info && this.Logger.info('🎮 GameHub App starting...'); } catch (e) { }
    }

    resolveLogger() {
        let logger = (typeof window !== 'undefined' && window.Logger) ? window.Logger : null;

        if (!logger && typeof require === 'function') {
            try {
                logger = require('./utils/Logger');
            } catch (error) {
                logger = null;
            }
        }

        logger = logger || console;

        try {
            logger.initFromEnvironment && logger.initFromEnvironment({
                storage: typeof localStorage !== 'undefined' ? localStorage : null,
                hostname: typeof location !== 'undefined' ? location.hostname : null
            });
        } catch (error) {
            // Logger setup should never block app startup.
        }

        return logger;
    }

    createManagedResource() {
        let ManagedResourceClass = (typeof window !== 'undefined' && window.ManagedResource) ? window.ManagedResource : null;

        if (!ManagedResourceClass && typeof require === 'function') {
            try {
                ManagedResourceClass = require('./utils/ManagedResource');
            } catch (error) {
                ManagedResourceClass = null;
            }
        }

        return ManagedResourceClass ? new ManagedResourceClass() : null;
    }

    emitPlatformEvent(event, payload = {}) {
        if (this.eventEmitter) {
            this.eventEmitter.emit(event, payload);
        }
    }

    on(event, callback) {
        if (this.eventEmitter) {
            this.eventEmitter.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.eventEmitter) {
            this.eventEmitter.off(event, callback);
        }
    }

    addManagedListener(target, event, handler, options) {
        if (!target || !target.addEventListener) return () => {};

        if (this._resources) {
            return this._resources.addListener(target, event, handler, options);
        }

        target.addEventListener(event, handler, options);
        const cleanup = () => {
            try {
                target.removeEventListener(event, handler, options);
            } catch (error) {
                // Ignore cleanup errors for detached DOM nodes.
            }
            this._listenerCleanups.delete(cleanup);
        };
        this._listenerCleanups.add(cleanup);
        return cleanup;
    }

    cleanupFallbackListeners() {
        for (const cleanup of Array.from(this._listenerCleanups)) {
            try {
                cleanup();
            } catch (error) {
                // Continue cleaning up remaining listeners.
            }
        }
        this._listenerCleanups.clear();
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
        this.gameScreenShell = GameHubAppScreen ? new GameHubAppScreen({
            document,
            addListener: (target, event, handler, options) => this.addManagedListener(target, event, handler, options),
            handlers: {
                back: () => this.exitCurrentGame()
            }
        }) : null;
        
        // Store screen elements
        this.screens.set('game-selector', document.getElementById('game-selector'));
        this.screens.set('game-screen', document.getElementById('game-screen'));
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
        try { this.Logger.debug && this.Logger.debug(`📊 Loading: ${this.loadingProgress}% - ${message}`); } catch (e) {}
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
        const totalTasks = 2;
        
        try {
            // Task 1: Initialize game selector
            this.registerLoadingTask('gameSelector', 800);
            this.updateLoadingProgress(10, 'Setting up game selection...');
            
            this.gameSelector = new GameSelector();
            await this.gameSelector.init();
            this.completeLoadingTask('gameSelector', totalTasks);
            
            // Task 2: Setup game selection events
            this.registerLoadingTask('gameEvents', 200);
            this.updateLoadingProgress(30, 'Configuring game events...');
            
            this.gameSelector.on('game:selected', (game) => {
                this.launchGame(game);
            });
            this.completeLoadingTask('gameEvents', totalTasks);
            
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
        this.addManagedListener(retry, 'click', () => location.reload());

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
            backBtn: document.getElementById('back-btn')
        };
        
        // Setup navigation button event listeners
        if (navElements.homeBtn) {
            this.addManagedListener(navElements.homeBtn, 'click', () => {
                this.navigateTo('game-selector');
            });
        }
        
        // Setup back button if it exists
        if (navElements.backBtn) {
            this.addManagedListener(navElements.backBtn, 'click', () => {
                this.navigateBack();
            });
        }
        
        // Enhanced global key bindings with navigation shortcuts
        this.addManagedListener(document, 'keydown', (e) => this.handleGlobalKeydown(e));
        
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
        
        if (e.code === 'Escape' && this.navigationState.current === 'game-screen') {
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
            this.emitPlatformEvent('game:launch:start', { game: gameModule });
            
            // Validate game module
            if (!gameModule || !gameModule.metadata) {
                throw new Error('Invalid game module');
            }
            
            // First, properly clean up any existing game
            await this.cleanupCurrentGame();
            
            // Clear the game screen container
            this.clearGameScreen();
            
            // Show game screen
            this.navigateTo('game-screen');
            
            // Update game title
            if (this.gameScreenShell) {
                this.gameScreenShell.setTitle(gameModule.metadata.name);
            } else {
                const gameTitle = document.getElementById('current-game-title');
                if (gameTitle) {
                    gameTitle.textContent = gameModule.metadata.name;
                }
            }
            
            // Load and start the iframe adapter
            try {
                this.currentGame = new gameModule.gameClass();
                await this.currentGame.init();
                this.currentGame.start();
                this.gameManager.focusGame(this.currentGame);

                if (this.gameSelector && gameModule.id) {
                    this.gameSelector.recordRecentlyPlayed(gameModule.id);
                }

                this.emitPlatformEvent('game:launch:success', { game: gameModule, instance: this.currentGame });
                
                console.log('✅ Game launched successfully');
                
            } catch (gameError) {
                console.error('Game initialization failed:', gameError);
                throw new Error(`Game failed to initialize: ${gameError.message}`);
            }
            
        } catch (error) {
            console.error('Failed to launch game:', error);
            this.emitPlatformEvent('game:launch:error', { game: gameModule || null, error });
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
            const cleanedGame = this.currentGame;
            
            try {
                if (this.currentGame.stop) {
                    this.currentGame.stop();
                }

                if (this.currentGame.cleanup) {
                    await this.currentGame.cleanup();
                }
            } catch (error) {
                console.warn('Error during game cleanup:', error);
            }
            
            this.currentGame = null;
            this.emitPlatformEvent('game:cleanup', { instance: cleanedGame });
        }
        
    }
    
    buildGameScreenContent() {
        if (this.gameScreenShell) {
            return this.gameScreenShell.createContent();
        }

        const fragment = document.createDocumentFragment();
        const header = document.createElement('div');
        header.className = 'game-header';

        const backBtn = document.createElement('button');
        backBtn.id = 'back-to-menu';
        backBtn.className = 'back-btn';
        backBtn.textContent = '< Back to Menu';

        const titleSpan = document.createElement('span');
        titleSpan.id = 'current-game-title';
        titleSpan.className = 'game-title';

        header.appendChild(backBtn);
        header.appendChild(titleSpan);

        const container = document.createElement('div');
        container.className = 'game-container';
        fragment.appendChild(header);
        fragment.appendChild(container);

        return fragment;
    }

    clearGameScreen() {
        const gameScreen = document.getElementById('game-screen');
        if (gameScreen) {
            if (this.gameScreenShell) {
                this.gameScreenShell.render(gameScreen);
                return;
            }

            while (gameScreen.firstChild) gameScreen.removeChild(gameScreen.firstChild);
            gameScreen.appendChild(this.buildGameScreenContent());
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
        const addBtnListener = (id, evt, handler) => {
            const el = document.getElementById(id);
            if (!el) return;
            this.addManagedListener(el, evt, handler);
        };

        addBtnListener('back-to-menu', 'click', () => this.exitCurrentGame());
    }
    
    async exitCurrentGame() {
        await this.cleanupCurrentGame();
        
        // Clear game title
        if (this.gameScreenShell) {
            this.gameScreenShell.setTitle('');
        } else {
            const gameTitle = document.getElementById('current-game-title');
            if (gameTitle) {
                gameTitle.textContent = '';
            }
        }
        
        this.navigateTo('game-selector');
    }
    
    setupErrorHandling() {
        // Global error handler
        this.addManagedListener(window, 'error', (event) => {
            try { this.Logger.error && this.Logger.error('Global error:', event.error); } catch (e) { console.error('Global error:', event.error); }
            this.showNotification('An unexpected error occurred', 'error');
        });

        // Unhandled promise rejection handler
        this.addManagedListener(window, 'unhandledrejection', (event) => {
            try { this.Logger.error && this.Logger.error('Unhandled promise rejection:', event.reason); } catch (e) { console.error('Unhandled promise rejection:', event.reason); }
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
        this.addManagedListener(close, 'click', () => toast.remove());

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

        if (this._resources) {
            try { this._resources.cleanup(); } catch (e) {}
        }
        if (this.gameScreenShell) {
            this.gameScreenShell.cleanup();
        }
        this.cleanupFallbackListeners();
        if (this.eventEmitter) {
            this.eventEmitter.removeAllListeners();
        }
        
        try { this.Logger.info && this.Logger.info('🎮 GameHub App cleaned up'); } catch (e) {}
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameHubApp;
}
