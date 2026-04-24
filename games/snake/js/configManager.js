/**
 * Configuration Manager - Centralizes game configuration and settings management
 */
const ConfigManager = {
  // Default settings
  defaults: {
    INITIAL_SNAKE_LENGTH: 3,
    NUM_OBSTACLES: 0,
    RED_GROW: 2,
    ORANGE_SPEED: 0.25,
    YELLOW_BOOST: 0.75,
    YELLOW_DURATION: 3000,
    AI_DIFFICULTY: 'medium'
  },
  
  /**
   * Initialize configuration from saved preferences or defaults
   */
  init() {
    console.log("ConfigManager initialized");
    this.applyDefaults();
  },
  
  /**
   * Apply default settings
   */
  applyDefaults() {
    INITIAL_SNAKE_LENGTH = this.defaults.INITIAL_SNAKE_LENGTH;
    NUM_OBSTACLES = this.defaults.NUM_OBSTACLES;
    
    // Update food types with default values
    FOOD_TYPES = {
      ...FOOD_TYPES,
      red: { ...FOOD_TYPES.red, grow: this.defaults.RED_GROW },
      orange: { ...FOOD_TYPES.orange, speedInc: this.defaults.ORANGE_SPEED },
      yellow: { ...FOOD_TYPES.yellow, tempSpeedInc: this.defaults.YELLOW_BOOST }
    };
    
    RUNTIME_TEMP_SPEED_BOOST_DURATION = this.defaults.YELLOW_DURATION;
    
    // Set AI difficulty
    if (typeof AI_DIFFICULTY !== 'undefined') {
      AI_DIFFICULTY = this.defaults.AI_DIFFICULTY;
    }

    // Emit event that settings have been reset
    if (typeof EventSystem !== 'undefined') {
      EventSystem.emit('settingsReset');
    }

    console.log("Settings reset to defaults");
  },
  
  /**
   * Apply settings from UI inputs
   * @param {Object} settings - Object containing updated settings
   */
  applySettings(settings) {
    INITIAL_SNAKE_LENGTH = this.validateInRange(settings.initialLength, 3, 6, this.defaults.INITIAL_SNAKE_LENGTH);
    NUM_OBSTACLES = this.validateInRange(settings.numObstacles, 0, 50, this.defaults.NUM_OBSTACLES);
    
    // Update food types
    FOOD_TYPES = {
      ...FOOD_TYPES,
      red: { ...FOOD_TYPES.red, grow: this.validateInRange(settings.redGrow, 0, 10, this.defaults.RED_GROW) },
      orange: { ...FOOD_TYPES.orange, speedInc: this.validateInRange(settings.orangeSpeed, 0, 3, this.defaults.ORANGE_SPEED) },
      yellow: { ...FOOD_TYPES.yellow, tempSpeedInc: this.validateInRange(settings.yellowBoost, 0, 3, this.defaults.YELLOW_BOOST) }
    };
    
    RUNTIME_TEMP_SPEED_BOOST_DURATION = this.validateInRange(
      settings.yellowDuration, 
      250, 
      10000, 
      this.defaults.YELLOW_DURATION
    );
    
    // Apply AI difficulty setting
    if (settings.aiDifficulty && typeof AI_DIFFICULTY !== 'undefined') {
      if (['easy', 'medium', 'hard'].includes(settings.aiDifficulty)) {
        AI_DIFFICULTY = settings.aiDifficulty;
        
        // Reset AI state for new difficulty
        if (typeof aiLastDecisionTime !== 'undefined') {
          aiLastDecisionTime = [];
        }
        if (typeof aiAggressionCooldown !== 'undefined') {
          aiAggressionCooldown = [];
        }
        if (typeof aiTrapHistory !== 'undefined') {
          aiTrapHistory = [];
        }
        
        console.log("AI Difficulty changed to:", AI_DIFFICULTY);
      }
    }

    // Emit event that settings have changed
    if (typeof EventSystem !== 'undefined') {
      EventSystem.emit('settingsChanged', settings);
    }

    console.log("Settings applied:", settings);
  },
  
  /**
   * Helper method to validate a value is within a range
   * @param {number} value - The value to check
   * @param {number} min - Minimum allowed value
   * @param {number} max - Maximum allowed value
   * @param {number} defaultValue - Default to use if value is invalid
   * @returns {number} The validated value
   */
  validateInRange(value, min, max, defaultValue) {
    const parsedValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(parsedValue) || parsedValue < min || parsedValue > max) {
      return defaultValue;
    }
    return parsedValue;
  },
  
  /**
   * Get current settings as an object
   * @returns {Object} Current game settings
   */
  getCurrentSettings() {
    return {
      initialLength: INITIAL_SNAKE_LENGTH,
      numObstacles: NUM_OBSTACLES,
      redGrow: FOOD_TYPES.red.grow,
      orangeSpeed: FOOD_TYPES.orange.speedInc,
      yellowBoost: FOOD_TYPES.yellow.tempSpeedInc,
      yellowDuration: RUNTIME_TEMP_SPEED_BOOST_DURATION,
      aiDifficulty: typeof AI_DIFFICULTY !== 'undefined' ? AI_DIFFICULTY : 'medium'
    };
  }
};