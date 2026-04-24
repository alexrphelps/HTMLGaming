/**
 * Level Manager - Manages game levels, progression, and level-specific configurations
 */
const LevelManager = {
  // Development testing flag - set to true to unlock all levels during development
  TESTING_MODE: false,  
  // Current level being played
  currentLevel: null,  
  // Level progression data (stored in localStorage)
  progression: {
    unlockedLevels: [1], // Level 1 is always unlocked
    completedLevels: [],
    levelScores: {}
  },
  
  /**
   * Initialize the level manager
   */
  init() {
    console.log("LevelManager initialization started");
    this.loadProgression();    
    // In testing mode, unlock all levels
    if (this.TESTING_MODE) {
      this.unlockAllLevelsForTesting();
    }    
    console.log("LevelManager initialized - Current progression:", this.progression);
  },
  
  /**
   * Load progression data from localStorage
   */
  loadProgression() {
    try {
      const saved = localStorage.getItem('snakeGameProgression');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.progression = {
          unlockedLevels: parsed.unlockedLevels || [1],
          completedLevels: parsed.completedLevels || [],
          levelScores: parsed.levelScores || {}
        };
      }
    } catch (error) {
      console.warn("Could not load progression data:", error);
      // Keep default progression
    }
  },
  
  /**
   * Save progression data to localStorage
   */
  saveProgression() {
    try {
      localStorage.setItem('snakeGameProgression', JSON.stringify(this.progression));
      console.log("Progression saved");
    } catch (error) {
      console.warn("Could not save progression data:", error);
    }
  },
  
  /**
   * Unlock all levels for testing purposes
   */
  unlockAllLevelsForTesting() {
    console.log("Testing mode enabled - unlocking all levels");
    if (!window.LEVEL_CONFIGS) {
      console.error("LEVEL_CONFIGS is not defined. Check script loading order.");
      return;
    }
    this.progression.unlockedLevels = Object.keys(window.LEVEL_CONFIGS).map(id => parseInt(id));
  },
  
  /**
   * Check if a level is unlocked
   */
  isLevelUnlocked(levelId) {
    return this.progression.unlockedLevels.includes(levelId);
  },
  
  /**
   * Check if a level is completed
   */
  isLevelCompleted(levelId) {
    return this.progression.completedLevels.includes(levelId);
  },
  
  /**
   * Unlock the next level
   */
  unlockNextLevel(currentLevelId) {
    const nextLevelId = currentLevelId + 1;
    if (window.LEVEL_CONFIGS[nextLevelId] && !this.isLevelUnlocked(nextLevelId)) {
      this.progression.unlockedLevels.push(nextLevelId);
      this.saveProgression();
      console.log(`Level ${nextLevelId} unlocked!`);
      return true;
    }
    return false;
  },
  
  /**
   * Mark a level as completed
   */
  completeLevel(levelId, score = 0) {
    if (!this.isLevelCompleted(levelId)) {
      this.progression.completedLevels.push(levelId);
    }
    
    // Update best score
    if (!this.progression.levelScores[levelId] || score > this.progression.levelScores[levelId]) {
      this.progression.levelScores[levelId] = score;
    }
    
    // Unlock next level
    const unlockedNext = this.unlockNextLevel(levelId);
    
    this.saveProgression();
    
    return {
      newBestScore: !this.progression.levelScores[levelId] || score > this.progression.levelScores[levelId],
      unlockedNextLevel: unlockedNext
    };
  },
  
  /**
   * Start a specific level
   */
  startLevel(levelId) {
    const config = window.LEVEL_CONFIGS[levelId];
    if (!config) {
      console.error(`Level ${levelId} not found`);
      return false;
    }
    
    if (!this.isLevelUnlocked(levelId)) {
      console.error(`Level ${levelId} is locked`);
      return false;
    }
    
    console.log(`Starting level ${levelId}: ${config.name}`);
    
    this.currentLevel = levelId;
    
    // Apply level-specific configuration
    this.applyLevelConfig(config);
    
    // Emit event for other systems to respond
    if (typeof EventSystem !== 'undefined') {
      EventSystem.emit('levelStarted', { levelId, config });
    }
    
    return true;
  },
  
  /**
   * Apply level-specific configuration to the game
   *
   * Ensures all settings, including wrapEnabled, are set globally and consistently.
   */
  applyLevelConfig(config) {
    console.log("Applying level configuration:", config);
    // Apply basic settings
    if (config.settings) {
      // Snake settings
      //if (config.settings.initialSnakeLength !== undefined) {
        INITIAL_SNAKE_LENGTH = config.settings.initialSnakeLength;
      //}
      // Obstacle settings
      //if (config.settings.numObstacles !== undefined) {
        NUM_OBSTACLES = config.settings.numObstacles;
      //}
      // AI settings
      //if (config.settings.numAISnakes !== undefined) {
        // This will need to be handled in game initialization
        window.LEVEL_NUM_AI_SNAKES = config.settings.numAISnakes;
      //}
      // Always set a default AI difficulty if not provided
      if (config.settings.aiDifficulty !== undefined && config.settings.aiDifficulty !== null) {
        AI_DIFFICULTY = config.settings.aiDifficulty;
      } else if (config.settings.numAISnakes && config.settings.numAISnakes > 0) {
        AI_DIFFICULTY = 'medium'; // Default fallback
      }
      // Wrapping settings
      if (config.settings.wrapEnabled !== undefined) {
        window.wrapEnabled = config.settings.wrapEnabled;
        console.log('wrapEnabled set to', window.wrapEnabled);
      }
      // Food settings
      if (config.settings.foodTypes) {
        // Apply food type modifications
        Object.keys(config.settings.foodTypes).forEach(foodType => {
          if (FOOD_TYPES[foodType]) {
            Object.assign(FOOD_TYPES[foodType], config.settings.foodTypes[foodType]);
          }
        });
      }
      // Speed settings
      if (config.settings.baseInterval !== undefined) {
        window.LEVEL_BASE_INTERVAL = config.settings.baseInterval;
      }
      // Grid/canvas settings
      if (config.settings.GRID_SIZE !== undefined) {
        window.GRID_SIZE = config.settings.GRID_SIZE;
      }
      if (config.settings.CANVAS_SIZE !== undefined) {
        window.CANVAS_SIZE = config.settings.CANVAS_SIZE;
      }
      // Always recalculate TILE_COUNT and SEGMENT_SIZE if either is set
      if (window.GRID_SIZE && window.CANVAS_SIZE) {
        window.TILE_COUNT = window.CANVAS_SIZE / window.GRID_SIZE;
        if (typeof SEGMENT_SIZE !== 'undefined') {
          SEGMENT_SIZE = window.GRID_SIZE - 1;
        } else {
          window.SEGMENT_SIZE = window.GRID_SIZE - 1;
        }
      }
    }
    // Store level-specific data for game logic
    window.CURRENT_LEVEL_CONFIG = config;
  },
  
  /**
   * Get current objective progress for UI display
   */
  getObjectiveProgress() {
    if (!this.currentLevel || !window.CURRENT_LEVEL_CONFIG) {
      return null;
    }
    
    const config = window.CURRENT_LEVEL_CONFIG;
    const objective = config.objective;
    
    switch (objective.type) {
      case 'score':
        return {
          type: 'score',
          current: typeof score !== 'undefined' ? score : 0,
          target: objective.target,
          progress: typeof score !== 'undefined' ? Math.min(score / objective.target, 1) : 0
        };
        
      case 'eat_food':
        return {
          type: 'eat_food',
          current: typeof window.levelFoodCount !== 'undefined' ? window.levelFoodCount : 0,
          target: objective.target,
          progress: typeof window.levelFoodCount !== 'undefined' ? Math.min(window.levelFoodCount / objective.target, 1) : 0
        };
        
      case 'time_survive':
        const currentTime = typeof window.levelSurvivalTime !== 'undefined' ? window.levelSurvivalTime : 0;
        return {
          type: 'time_survive',
          current: Math.floor(currentTime / 1000),
          target: Math.floor(objective.target / 1000),
          progress: Math.min(currentTime / objective.target, 1)
        };
        
      case 'survive':
        return {
          type: 'survive',
          current: 0,
          target: 0,
          progress: 0,
          description: 'Be the last snake standing'
        };
        
      default:
        return null;
    }
  },

  /**
   * Check if current level objective is completed
   */
  checkLevelObjective() {
    if (!this.currentLevel || !window.CURRENT_LEVEL_CONFIG) {
      console.log('DEBUG: No current level or config');
      return false;
    }
    
    const config = window.CURRENT_LEVEL_CONFIG;
    const objective = config.objective;
    
    // Debug logging for objective checking
    console.log('DEBUG: Checking objective:', objective);
    console.log('DEBUG: Current score:', score);
    
    switch (objective.type) {
      case 'survive':
        // Win condition is handled by game over logic
        console.log('DEBUG: Survive objective - handled by game over logic');
        return false;
        
      case 'score':
        const scoreMet = typeof score !== 'undefined' && score >= objective.target;
        console.log('DEBUG: Score objective check:', score, '>=', objective.target, '=', scoreMet);
        return scoreMet;
        
      case 'eat_food':
        const foodMet = typeof window.levelFoodCount !== 'undefined' && window.levelFoodCount >= objective.target;
        console.log('DEBUG: Food objective check:', window.levelFoodCount, '>=', objective.target, '=', foodMet);
        return foodMet;
        
      case 'time_survive':
        const timeMet = typeof window.levelSurvivalTime !== 'undefined' && window.levelSurvivalTime >= objective.target;
        console.log('DEBUG: Time objective check:', window.levelSurvivalTime, '>=', objective.target, '=', timeMet);
        return timeMet;
        
      default:
        console.warn("Unknown objective type:", objective.type);
        return false;
    }
  },
  
  /**
   * Handle level completion
   */
  onLevelComplete(gameResult) {
    if (!this.currentLevel) return;
    
    const config = window.CURRENT_LEVEL_CONFIG;
    const objective = config.objective;
    
    // Create appropriate completion message based on objective type
    let completionMessage = '';
    switch (objective.type) {
      case 'score':
        completionMessage = `🎉 Level Complete! 🎉\n\nYou reached the target score of ${objective.target}!\n\nScore: ${score}`;
        break;
      case 'eat_food':
        completionMessage = `🍎 Level Complete! 🍎\n\nYou ate ${objective.target} food items!\n\nFood eaten: ${window.levelFoodCount}`;
        break;
      case 'time_survive':
        const timeSeconds = Math.floor(window.levelSurvivalTime / 1000);
        completionMessage = `⏰ Level Complete! ⏰\n\nYou survived for ${timeSeconds} seconds!\n\nTarget: ${Math.floor(objective.target / 1000)} seconds`;
        break;
      default:
        completionMessage = `🎉 Level Complete! 🎉\n\nCongratulations on completing this level!`;
    }
    
    // Show level completion UI with Next Level and Continue buttons
    this.showLevelCompletionUI(completionMessage, config);
  },
  
  /**
   * Show level completion UI with Next Level and Continue buttons
   */
  showLevelCompletionUI(message, config) {
    // Create or get the completion overlay
    let completionOverlay = document.getElementById('levelCompletionOverlay');
    if (!completionOverlay) {
      completionOverlay = document.createElement('div');
      completionOverlay.id = 'levelCompletionOverlay';
      completionOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      document.body.appendChild(completionOverlay);
    }
    
    // Create the completion dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      text-align: center;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    // Add the message
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      font-size: 18px;
      margin-bottom: 30px;
      white-space: pre-line;
      line-height: 1.5;
    `;
    messageDiv.textContent = message;
    dialog.appendChild(messageDiv);
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 15px;
      justify-content: center;
    `;
    
    // Next Level button
    const nextLevelBtn = document.createElement('button');
    nextLevelBtn.textContent = 'Next Level';
    nextLevelBtn.style.cssText = `
      padding: 12px 24px;
      font-size: 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    nextLevelBtn.onmouseover = () => nextLevelBtn.style.background = '#45a049';
    nextLevelBtn.onmouseout = () => nextLevelBtn.style.background = '#4CAF50';
    nextLevelBtn.onclick = () => this.handleNextLevel();
    
    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.textContent = 'Continue';
    continueBtn.style.cssText = `
      padding: 12px 24px;
      font-size: 16px;
      background: #2196F3;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    `;
    continueBtn.onmouseover = () => continueBtn.style.background = '#1976D2';
    continueBtn.onmouseout = () => continueBtn.style.background = '#2196F3';
    continueBtn.onclick = () => this.handleContinueLevel();
    
    // Add buttons to container
    buttonContainer.appendChild(nextLevelBtn);
    buttonContainer.appendChild(continueBtn);
    dialog.appendChild(buttonContainer);
    
    // Add dialog to overlay
    completionOverlay.innerHTML = '';
    completionOverlay.appendChild(dialog);
    completionOverlay.style.display = 'flex';
    
    // Pause the game
    if (typeof gameInterval !== 'undefined' && gameInterval) {
      clearInterval(gameInterval);
    }
    if (typeof animationInterval !== 'undefined' && animationInterval) {
      clearInterval(animationInterval);
    }
  },
  
  /**
   * Handle Next Level button click
   */
  handleNextLevel() {
    // Hide completion overlay
    const overlay = document.getElementById('levelCompletionOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Complete current level and start next level
    const currentLevelId = this.currentLevel;
    const nextLevelId = currentLevelId + 1;
    
    // Check if next level exists
    if (window.LEVEL_CONFIGS && window.LEVEL_CONFIGS[nextLevelId]) {
      // Complete current level
      this.completeLevel(currentLevelId, score);
      
      // Start next level
      this.startLevel(nextLevelId);
    } else {
      // No more levels, show completion message
      alert('Congratulations! You have completed all levels!');
      this.returnToLevelSelection();
    }
  },
  
  /**
   * Handle Continue button click
   */
  handleContinueLevel() {
    // Hide completion overlay
    const overlay = document.getElementById('levelCompletionOverlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Resume the game
    if (typeof GameManager !== 'undefined' && GameManager.resumeGame) {
      GameManager.resumeGame();
    } else {
      // Fallback: restart the game loop
      if (typeof baseInterval !== 'undefined') {
        gameInterval = setInterval(gameLoop, baseInterval);
        animationInterval = requestAnimationFrame(animationLoop);
      }
    }
  },
  
  /**
   * Show level completion message
   */
  showLevelCompleteMessage(config, score, result) {
    let message = `?? Level Complete! ??\n\n`;
    message += `${config.name}\n`;
    message += `Objective: ${config.objective.description}\n\n`;
    message += `Score: ${score}\n`;
    
    if (result.newBestScore) {
      message += `?? New Best Score!\n`;
    }
    
    if (result.unlockedNextLevel) {
      message += `?? Next level unlocked!\n`;
    }
    
    this.showMessage(message, true);
  },
  
  /**
   * Show level failed message
   */
  showLevelFailedMessage(config) {
    let message = `?? Level Failed ??\n\n`;
    message += `${config.name}\n`;
    message += `Objective: ${config.objective.description}\n\n`;
    message += `Try again to complete the objective!`;
    
    this.showMessage(message, false);
  },
  
  /**
   * Show message to player
   */
  showMessage(message, isSuccess) {
    if (typeof statusMessageElement !== 'undefined' && statusMessageElement) {
      statusMessageElement.textContent = message;
      statusMessageElement.style.display = 'block';
      statusMessageElement.style.borderColor = isSuccess ? 'lime' : 'red';
      statusMessageElement.style.color = isSuccess ? 'lime' : '#ff6666';
    }
  },
  
  /**
   * Reset level-specific settings to defaults
   */
  resetToDefaults() {
    // Restore default settings
    INITIAL_SNAKE_LENGTH = DEFAULTS.INITIAL_SNAKE_LENGTH;
    AI_DIFFICULTY = DEFAULTS.AI_DIFFICULTY;
    // Restore grid/canvas defaults
    window.GRID_SIZE = 25;
    window.CANVAS_SIZE = 1000;
    window.TILE_COUNT = window.CANVAS_SIZE / window.GRID_SIZE;
    if (typeof SEGMENT_SIZE !== 'undefined') {
      SEGMENT_SIZE = window.GRID_SIZE - 1;
    } else {
      window.SEGMENT_SIZE = window.GRID_SIZE - 1;
    }
    
    // Reset food types to defaults
    FOOD_TYPES.red = { color: 'red', grow: 2, speedInc: 0, tempSpeedInc: 0 };
    FOOD_TYPES.orange = { color: 'orange', grow: 1, speedInc: 0.25, tempSpeedInc: 0 };
    FOOD_TYPES.yellow = { color: 'yellow', grow: 1, speedInc: 0, tempSpeedInc: 0.75 };
    
    // Clear level-specific globals
    delete window.LEVEL_NUM_AI_SNAKES;
    delete window.LEVEL_BASE_INTERVAL;
    delete window.CURRENT_LEVEL_CONFIG;
    delete window.levelFoodCount;
    delete window.levelSurvivalTime;
    
    this.currentLevel = null;
  },

  // Import level configs from separate file
  // eslint-disable-next-line no-undef
  LEVEL_CONFIGS: window.LEVEL_CONFIGS,
  // Import LevelManager utilities
  // eslint-disable-next-line no-undef
  Util: window.LevelManagerUtil
};