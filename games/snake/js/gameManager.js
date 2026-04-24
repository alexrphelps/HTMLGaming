/**
 * Game Manager - Coordinates high-level game operations and subsystems
 */
const GameManager = {
  /**
   * Initialize the game
   */
  init() {
    console.log("GameManager init started");

    try {
      // Initialize level system first
      LevelManager.init();
      // Initialize level UI
      LevelUI.init();
      // Initialize configuration
      ConfigManager.init();
      // Set initial colors based on checkbox state
      updateColorSettings();
      // Initialize wrap checkbox visual state
        if (disableWrapCheckbox && disableWrapCheckbox.checked) {
        wrapEnabled = false;
        canvas.classList.add('no-wrap');
      } else {
        wrapEnabled = true;
        canvas.classList.remove('no-wrap');
      }
      // Preselect lime color and set initial player color
      const limeButton = colorOptions.querySelector('button[data-color="lime"]');
      if (limeButton) {
        limeButton.classList.add('selected');
        playerColor = 'lime';
        if (PLAYER_COLORS.lime) {
          playerHeadColor = PLAYER_COLORS.lime.head;
          playerBodyColor = PLAYER_COLORS.lime.body;
        } else {
          playerHeadColor = 'lime';
          playerBodyColor = 'lime';
        }
        if (startGameBtn) {
          startGameBtn.disabled = false;
        }
      }
      // Draw default preview with placeholder colors AFTER setting colors
      drawSnakePreview();
      // Start the animation loop
      requestAnimationFrame(this.animationLoop);
      console.log("Snake Battle Royale initialized - Ready to play!");
    } catch (error) {
      console.error("Error during GameManager initialization:", error);
    }
  },

  /**
   * Start a new game with selected player color (classic mode)
   */
  startGame() {
    console.log('GameManager.startGame() called');
    console.log('playerColor in startGame:', playerColor);
    if (playerColor) {
      console.log('About to call this.initGame()');
      try {
        this.initGame();
        console.log('this.initGame() completed successfully');
      } catch (error) {
        console.error('Error in initGame:', error);
      }
    } else {
      console.warn('No player color selected, not starting game');
    }
  },

  /**
   * Initialize a level-based game
   */
  initLevel(levelConfig) {
    console.log('GameManager.initLevel() called');
    LevelManager.resetToDefaults();
    if (levelConfig) {
      console.log('Initializing level with config:', levelConfig);
      // Apply the level config so all settings are set up correctly
      LevelManager.applyLevelConfig(levelConfig);
      window.CURRENT_LEVEL_CONFIG = levelConfig;
      this.initGame();
    } else {
      console.error('No level configuration found');
    }
  },

  /**
   * Initialize a new game
   */
  initGame() {
    console.log('GameManager.initGame() called');
    try {
      // Clear any existing intervals
      if (gameInterval) clearInterval(gameInterval);
      if (animationInterval) clearInterval(animationInterval);
      console.log("Initializing game with player color:", playerColor);
      // Reset game state variables
      score = 0;
      // Use level-specific base interval if available
      if (window.LEVEL_BASE_INTERVAL !== undefined) {
        baseInterval = window.LEVEL_BASE_INTERVAL;
      } else {
        baseInterval = BASE_GAME_INTERVAL;
      }
      // Reset level-specific counters
      window.levelFoodCount = 0;
      window.levelSurvivalTime = 0;
      window.levelStartTime = Date.now();
      // Reset win condition flag for new level
      if (typeof winConditionMetThisRound !== 'undefined') {
        winConditionMetThisRound = false;
      }
      // Reset player's speed model
      playerPermanentMoveRate = 0;
      playerTempMoveRate = 0;
      playerMoveAccumulator = 0;
      gameOver = false;
      gameWinner = null;
      playerAlive = true;
      playerSpeedBoostEnd = 0;
      directionQueue = [];
      // Clear removed tails from previous games
      removedTails = [];
      console.log("Game state variables reset");
      // Update UI elements if they exist - handle level-specific AI count
      const aiCount = typeof window.LEVEL_NUM_AI_SNAKES === 'number' ? window.LEVEL_NUM_AI_SNAKES : (typeof NUM_AI_SNAKES === 'number' ? NUM_AI_SNAKES : 4);
      enemiesLeftElem.textContent = aiCount;
      playerStatusElem.textContent = "Alive";
      playerStatusElem.style.color = "lime";
      // Reset animation state
      animationProgress = 1;
      lastGameUpdateTime = 0;
      // Hide status message and game controls
      statusMessageElement.style.display = "none";
      gameControlsElement.style.display = "none";
      // Wait for the functions to be defined before calling them
      console.log("About to initialize snakes");
      initSnakes(playerColor);
      console.log("Snakes initialized");
      console.log("About to initialize foods");
      initFoods();
      console.log("Food initialized");
      console.log("About to generate obstacles");
      generateObstacles();
      console.log("Obstacles generated");
      // Show game canvas and scoreboard, hide menus
      scoreboard.style.display = 'flex';
      startMenu.style.display = 'none';
      const levelMenu = document.getElementById('levelMenu');
      if (levelMenu) levelMenu.style.display = 'none';
      // Set canvas and container size for this level
      if (typeof setCanvasAndContainerSize === 'function') setCanvasAndContainerSize();
      // Show game container
      gameContainer.style.display = 'block';
      // Start animation loop for rendering
      if (animationInterval) clearInterval(animationInterval);
      function animationFrameLoop() {
        drawGameState();
        // Always continue animation, even after gameOver
        window.requestAnimationFrame(animationFrameLoop);
      }
      window.requestAnimationFrame(animationFrameLoop);
      // Show/hide Return to Levels button based on whether we're in a level
      const returnToLevelsBtn = document.getElementById('returnToLevelsBtn');
      if (returnToLevelsBtn) {
        const isInLevel = LevelManager.currentLevel;
        returnToLevelsBtn.style.display = isInLevel ? 'block' : 'none';
      }
      // Initialize AI scores display
      console.log("About to update AI scores");
      updateAiScores();
      // Start countdown before beginning the game
      console.log("Starting countdown");
      startCountdown();
    } catch (error) {
      console.error("Error in initGame:", error.message, error.stack);
    }
  },


  /**
   * Handle returning to the main menu
   */
  returnToMainMenu() {
    console.log("GameManager: Returning to main menu and resetting state...");
    
    // Clear intervals
    if (gameInterval) clearInterval(gameInterval);
    if (animationInterval) clearInterval(animationInterval);
    
    // Reset core game state
    gameOver = false;
    gameWinner = null;
    playerAlive = true;
    score = 0;
    
    // Reset player state
    if (typeof playerSnake !== 'undefined') playerSnake = [];
    if (typeof playerDir !== 'undefined') playerDir = { x: 0, y: 1 };
    if (typeof playerGrow !== 'undefined') playerGrow = 0;
    if (typeof playerSpeedBoostEnd !== 'undefined') playerSpeedBoostEnd = 0;
    if (typeof playerPermanentMoveRate !== 'undefined') playerPermanentMoveRate = 0;
    if (typeof playerTempMoveRate !== 'undefined') playerTempMoveRate = 0;
    if (typeof playerMoveAccumulator !== 'undefined') playerMoveAccumulator = 0;
    
    // Reset AI state
    if (typeof aiSnakes !== 'undefined') aiSnakes = [];
    if (typeof aiPositionHistories !== 'undefined') aiPositionHistories = [];
    if (typeof aiLastDecisionTime !== 'undefined') aiLastDecisionTime = [];
    if (typeof aiAggressionCooldown !== 'undefined') aiAggressionCooldown = [];
    if (typeof aiTrapHistory !== 'undefined') aiTrapHistory = [];
    
    // Reset game objects
    if (typeof foods !== 'undefined') foods = [];
    if (typeof removedTails !== 'undefined') removedTails = [];
    
    // Reset timing
    if (typeof baseInterval !== 'undefined') baseInterval = 200;
    if (typeof lastGameUpdateTime !== 'undefined') lastGameUpdateTime = 0;
    if (typeof animationProgress !== 'undefined') animationProgress = 1;
    if (typeof countdownActive !== 'undefined') countdownActive = false;
    if (typeof countdownTime !== 'undefined') countdownTime = 0;
    
    // Reset direction queue
    if (typeof directionQueue !== 'undefined') directionQueue = [];
    if (typeof pending180Turn !== 'undefined') pending180Turn = null;
    
    // Reset level-specific variables
    if (typeof window.LEVEL_BASE_INTERVAL !== 'undefined') window.LEVEL_BASE_INTERVAL = undefined;
    if (typeof window.LEVEL_NUM_AI_SNAKES !== 'undefined') window.LEVEL_NUM_AI_SNAKES = undefined;
    if (typeof window.levelFoodCount !== 'undefined') window.levelFoodCount = 0;
    if (typeof window.levelSurvivalTime !== 'undefined') window.levelSurvivalTime = 0;
    
    // Reset level manager
    if (typeof LevelManager !== 'undefined' && LevelManager.resetToDefaults) {
      LevelManager.resetToDefaults();
    }
    
    // Reset UI display
    if (typeof gameContainer !== 'undefined' && gameContainer) {
      gameContainer.style.display = 'none';
    }
    if (typeof startMenu !== 'undefined' && startMenu) {
      startMenu.style.display = 'block';
    }
    const levelMenu = document.getElementById('levelMenu');
    if (levelMenu) {
      levelMenu.style.display = 'none';
    }
    if (typeof statusMessageElement !== 'undefined' && statusMessageElement) {
      statusMessageElement.style.display = "none";
      statusMessageElement.textContent = '';
    }
    if (typeof gameControlsElement !== 'undefined' && gameControlsElement) {
      gameControlsElement.style.display = "none";
    }
    
    // Reset UI elements
    if (typeof playerStatusElem !== 'undefined' && playerStatusElem) {
      playerStatusElem.textContent = 'Alive';
      playerStatusElem.style.color = 'lime';
    }
    if (typeof scoreElem !== 'undefined' && scoreElem) {
      scoreElem.textContent = '0';
    }
    if (typeof speedElem !== 'undefined' && speedElem) {
      speedElem.textContent = '0.0';
    }
    if (typeof enemiesLeftElem !== 'undefined' && enemiesLeftElem) {
      enemiesLeftElem.textContent = '4';
    }
    
    // Reset start button state
    if (typeof startGameBtn !== 'undefined' && startGameBtn) {
      if (playerColor) {
        startGameBtn.disabled = false;
      } else {
        startGameBtn.disabled = true;
      }
    }
    
    console.log("GameManager: Returned to main menu with full state reset");
  },

  /**
   * Resume the game after level completion
   */
  resumeGame() {
    console.log('Resuming game after level completion');
    
    // Restart the game loop
    if (typeof baseInterval !== 'undefined') {
      gameInterval = setInterval(gameLoop, baseInterval);
      animationInterval = requestAnimationFrame(animationLoop);
    }
    
    // Clear the game winner so the game can continue
    gameWinner = null;
  },

  /**
   * Return to level selection
   */
  returnToLevelSelection() {
    if (gameInterval) clearInterval(gameInterval);
    if (animationInterval) clearInterval(animationInterval);
    gameOver = false;
    gameWinner = null;
    playerAlive = true;
    score = 0;
    LevelManager.resetToDefaults();
    gameContainer.style.display = 'none';
    LevelUI.showLevelMenu();
    statusMessageElement.style.display = "none";
    gameControlsElement.style.display = "none";
    console.log("Returned to level selection");
  },

  /**
   * Enhanced animation loop using requestAnimationFrame with improved timing
   */
  animationLoop() {
    drawGameState();
    requestAnimationFrame(GameManager.animationLoop);
  }
};