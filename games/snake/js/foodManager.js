/**
 * FoodManager - Manages food items in the game
 *
 * Now supports per-level food type selection and effect overrides via LevelManager config.
 */
const FoodManager = {
  /**
   * Initialize food items
   */
  init() {
    this.initFoods();
  },
  
  /**
   * Create initial food items
   * Only spawns food types defined in CURRENT_LEVEL_CONFIG.settings.foodTypes (if present),
   * otherwise falls back to all types in FOOD_TYPES except 'remains'.
   */
  initFoods() {
    foods = [];
    let allowedTypes = null;
    if (window.CURRENT_LEVEL_CONFIG && window.CURRENT_LEVEL_CONFIG.settings && window.CURRENT_LEVEL_CONFIG.settings.foodTypes) {
      allowedTypes = Object.keys(window.CURRENT_LEVEL_CONFIG.settings.foodTypes);
    }
    for (const [type, props] of Object.entries(FOOD_TYPES)) {
      // Skip the "remains" type for initial spawning
      if (type === 'remains') continue;
      if (allowedTypes && !allowedTypes.includes(type)) continue;
      
      let pos;
      do {
        pos = SnakeUtils.randomPosition();
      } while (occupiesPosition(pos.x, pos.y));
      
      foods.push({
        x: pos.x,
        y: pos.y,
        type,
        grow: props.grow,
        speedInc: props.speedInc,
        tempSpeedInc: props.tempSpeedInc,
        noRespawn: props.noRespawn || false
      });
    }
  },
  
  /**
   * Place a new food at a random position
   * Only spawns food types allowed by the current level config.
   * @param {Object} oldFood - Food item to replace
   */
  placeNewFood(oldFood) {
    // If this is a special "remains" food that should not respawn, skip
    if (oldFood.noRespawn) return;
    let allowedTypes = null;
    if (window.CURRENT_LEVEL_CONFIG && window.CURRENT_LEVEL_CONFIG.settings && window.CURRENT_LEVEL_CONFIG.settings.foodTypes) {
      allowedTypes = Object.keys(window.CURRENT_LEVEL_CONFIG.settings.foodTypes);
    }
    // Only respawn allowed food types
    if (allowedTypes && !allowedTypes.includes(oldFood.type)) return;
    
    let pos;
    do {
      pos = SnakeUtils.randomPosition();
    } while (occupiesPosition(pos.x, pos.y));
    
    foods.push({
      x: pos.x,
      y: pos.y,
      type: oldFood.type,
      grow: oldFood.grow,
      speedInc: oldFood.speedInc,
      tempSpeedInc: oldFood.tempSpeedInc,
      noRespawn: oldFood.noRespawn
    });
  },
  
  /**
   * Create food remains from a dead snake
   * @param {Array} snake - Snake body segments
   * @param {Object} color - Color information for the snake
   */
  createRemainsFoodFromSnake(snake, color) {
    if (snake.length < 3) return; // Need at least 3 segments
    
    // Get head, middle and tail positions
    const head = snake[0];
    const middle = snake[Math.floor(snake.length / 2)];
    const tail = snake[snake.length - 1];
    
    const remainsColor = color.body || 'gray';
    const remainsType = FOOD_TYPES.remains;
    
    // Create food at these positions if they're available
    [head, middle, tail].forEach(pos => {
      if (!occupiesPosition(pos.x, pos.y)) {
        foods.push({
          x: pos.x,
          y: pos.y,
          type: 'remains',
          grow: remainsType.grow,
          speedInc: remainsType.speedInc,
          tempSpeedInc: remainsType.tempSpeedInc,
          noRespawn: true,
          color: remainsColor
        });
      }
    });
  },
  
  /**
   * Process player eating food
   * @returns {boolean} True if food was eaten
   */
  processPlayerEatsFood() {
    for (let i = foods.length - 1; i >= 0; i--) {
      if (!playerAlive) break;
      
      if (playerSnake[0].x === foods[i].x && playerSnake[0].y === foods[i].y) {
        const food = foods[i];
        score++;
        playerGrow += food.grow;

        if (food.speedInc) {
          // Apply permanent extra moves per tick to the player, but cap base (without temp boost) to MAX_MOVES_PER_SECOND
          const ticksPerSecond = 1000 / baseInterval;
          const maxRatePerTick = MAX_MOVES_PER_SECOND / ticksPerSecond;
          const baseOnly = 1 + playerPermanentMoveRate; // no temp
          if (baseOnly < maxRatePerTick) {
            const perTickInc = food.speedInc / ticksPerSecond; // convert moves/sec to moves/tick
            playerPermanentMoveRate = Math.min(
              playerPermanentMoveRate + perTickInc,
              maxRatePerTick - 1
            );
          }
          console.log(`Player base move rate now: ${(1 + playerPermanentMoveRate).toFixed(2)} moves/tick (cap ${maxRatePerTick.toFixed(2)})`);
        }
        if (food.tempSpeedInc) {
          // Apply temporary extra moves per tick to the player
          playerTempMoveRate = food.tempSpeedInc;
          playerSpeedBoostEnd = Date.now() + RUNTIME_TEMP_SPEED_BOOST_DURATION;
          console.log(`Player temporary move rate active: +${food.tempSpeedInc} moves/tick until ${new Date(playerSpeedBoostEnd).toLocaleTimeString()}`);
        }

        foods.splice(i, 1);
        
        // Only respawn regular food types
        if (!food.noRespawn) {
          this.placeNewFood(food);
        }
        
        // Emit food eaten event
        EventSystem.emit('playerAteFood', { 
          type: food.type, 
          grow: food.grow,
          speedInc: food.speedInc,
          tempSpeedInc: food.tempSpeedInc
        });
        
        return true;
      }
    }
    
    return false;
  },
  
  /**
   * Process AI snake eating food
   * @param {number} snakeIndex - Index of AI snake
   * @returns {boolean} True if food was eaten
   */
  processAiEatsFood(snakeIndex) {
    const snake = aiSnakes[snakeIndex];
    if (!snake || !snake.alive) return false;
    
    for (let j = foods.length - 1; j >= 0; j--) {
      if (snake.body[0].x === foods[j].x && snake.body[0].y === foods[j].y) {
        const food = foods[j];
        snake.score += food.points || 1;
        snake.grow += food.grow;
        
        // Apply speed boosts to AI
        if (food.speedInc) {
          const ticksPerSecond = 1000 / baseInterval;
          const maxRatePerTick = MAX_MOVES_PER_SECOND / ticksPerSecond;
          const baseOnly = 1 + snake.permanentMoveRate;
          if (baseOnly < maxRatePerTick) {
            const perTickInc = food.speedInc / ticksPerSecond;
            snake.permanentMoveRate = Math.min(
              snake.permanentMoveRate + perTickInc,
              maxRatePerTick - 1
            );
          }
        }
        if (food.tempSpeedInc) {
          snake.tempMoveRate = food.tempSpeedInc;
          snake.speedBoostEnd = Date.now() + RUNTIME_TEMP_SPEED_BOOST_DURATION;
        }
        
        foods.splice(j, 1);
        if (!food.noRespawn) {
          this.placeNewFood(food);
        }
        
        // Emit AI food eaten event
        EventSystem.emit('aiAteFood', { 
          snakeIndex,
          type: food.type, 
          grow: food.grow,
          speedInc: food.speedInc,
          tempSpeedInc: food.tempSpeedInc
        });
        
        return true;
      }
    }
    
    return false;
  }
};