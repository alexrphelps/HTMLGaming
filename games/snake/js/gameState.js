// Game state variables

// DOM elements
const canvas = document.getElementById('game');
const ctx = canvas && canvas.getContext('2d');
const gameContainer = document.getElementById('gameContainer');
const countdownElement = document.getElementById('countdown');
const statusMessageElement = document.getElementById('statusMessage');
const gameControlsElement = document.getElementById('gameControls');
const restartButtonElement = document.getElementById('restartButton');
const mainMenuButtonElement = document.getElementById('mainMenuButton');
const useSameColorCheckbox = document.getElementById('useSameColorCheckbox');
const startGameBtn = document.getElementById('startGameBtn');
const previewCanvas = document.getElementById('previewCanvas');
const previewCtx = previewCanvas && previewCanvas.getContext('2d');
const colorPreviewDiv = document.getElementById('colorPreview');
const disableWrapCheckbox = document.getElementById('disableWrapCheckbox');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsMenu = document.getElementById('settingsMenu');
const settingsSaveBtn = document.getElementById('settingsSaveBtn');
const settingsCancelBtn = document.getElementById('settingsCancelBtn');
const settingsDefaultsBtn = document.getElementById('settingsDefaultsBtn');
const initialLengthSelect = document.getElementById('initialLengthSelect');
const numObstaclesInput = document.getElementById('numObstaclesInput');
const redGrowInput = document.getElementById('redGrowInput');
const orangeSpeedInput = document.getElementById('orangeSpeedInput');
const yellowBoostInput = document.getElementById('yellowBoostInput');
const yellowDurationInput = document.getElementById('yellowDurationInput');

// Update CANVAS_SIZE based on actual canvas dimensions
const ACTUAL_CANVAS_SIZE = canvas.width; // Since width and height are equal

// Ensure CANVAS_SIZE is always available as a global (for renderer.js)
if (typeof window !== 'undefined') {
  if (typeof window.CANVAS_SIZE === 'undefined') {
    window.CANVAS_SIZE = canvas ? canvas.width : 1000;
  }
}

const scoreElem = document.getElementById('score');
const speedElem = document.getElementById('speed');
const startMenu = document.getElementById('startMenu');
const colorOptions = document.getElementById('colorOptions');
const scoreboard = document.getElementById('scoreboard');
const enemiesLeftElem = document.getElementById('enemiesLeft');
const playerStatusElem = document.getElementById('playerStatus');
const aiScoresElem = document.getElementById('aiScores');

// Update color settings based on checkbox
function updateColorSettings() {
  useSameColor = useSameColorCheckbox.checked;
  
  if (useSameColor) {
    // Make all heads and bodies the same color
    Object.keys(AI_SNAKE_COLORS).forEach(color => {
      const mainColor = ORIGINAL_AI_COLORS[color].head;
      AI_SNAKE_COLORS[color] = { head: mainColor, body: mainColor };
    });
    
    Object.keys(PLAYER_COLORS).forEach(color => {
      const mainColor = ORIGINAL_PLAYER_COLORS[color].head;
      PLAYER_COLORS[color] = { head: mainColor, body: mainColor };
    });
  } else {
    // Restore original colors with different head/body
    Object.keys(AI_SNAKE_COLORS).forEach(color => {
      AI_SNAKE_COLORS[color] = { ...ORIGINAL_AI_COLORS[color] };
    });
    
    Object.keys(PLAYER_COLORS).forEach(color => {
      PLAYER_COLORS[color] = { ...ORIGINAL_PLAYER_COLORS[color] };
    });
  }
  
  // If player has already chosen a color, update it
  if (playerColor) {
    const colorConfig = PLAYER_COLORS[playerColor] || { head: 'lime', body: 'lime' };
    playerHeadColor = colorConfig.head;
    playerBodyColor = colorConfig.body;
    
    // Update the preview if visible
    if (colorPreviewDiv.style.display !== 'none') {
      drawSnakePreview();
    }
  }
}

function prefillSettingsFromState() {
  initialLengthSelect.value = String(INITIAL_SNAKE_LENGTH);
  numObstaclesInput.value = String(NUM_OBSTACLES);
  redGrowInput.value = String(FOOD_TYPES.red.grow);
  orangeSpeedInput.value = String(FOOD_TYPES.orange.speedInc);
  yellowBoostInput.value = String(FOOD_TYPES.yellow.tempSpeedInc);
  yellowDurationInput.value = String(RUNTIME_TEMP_SPEED_BOOST_DURATION);
}

// Generate obstacles count from NUM_OBSTACLES constant
function generateObstacles() {
  obstacles = [];
  let tries = 0;
  
  // Define clear zone around player start position
  const centerX = Math.floor(TILE_COUNT / 2);
  const centerY = Math.floor(TILE_COUNT / 2);
  const safeRadius = 5; // Clear zone radius
  
  while (obstacles.length < NUM_OBSTACLES && tries < 500) {
    tries++;
    const size = 2 + Math.floor(Math.random() * 4); // 2..5
    const x = Math.floor(Math.random() * (TILE_COUNT - size));
    const y = Math.floor(Math.random() * (TILE_COUNT - size));
    
    // Keep obstacles away from center where player starts
    const distToCenter = Math.sqrt(Math.pow(x + size/2 - centerX, 2) + 
                                  Math.pow(y + size/2 - centerY, 2));
    if (distToCenter < safeRadius) continue;
    
    const newObs = { x, y, width: size, height: size };

    // Ensure obstacles don't overlap with existing ones
    // Use safe version of rectsOverlap
    const safeRectsOverlap = (r1, r2) => {
      if (typeof rectsOverlap === 'function') {
        return rectsOverlap(r1, r2);
      }
      // Simple fallback
      return !(r2.x >= r1.x + r1.width ||
              r2.x + r2.width <= r1.x ||
              r2.y >= r1.y + r1.height ||
              r2.y + r2.height <= r1.y);
    };
    
    if (obstacles.some(o => safeRectsOverlap(o, newObs))) continue;
    
    // Check if obstacle overlaps with any snake
    let overlapsSnake = false;
    
    if (snakeOverlapsObstacle(playerSnake, newObs)) {
      overlapsSnake = true;
    }
    
    for (const snake of aiSnakes) {
      if (snakeOverlapsObstacle(snake.body, newObs)) {
        overlapsSnake = true;
        break;
      }
    }
    
    if (overlapsSnake) continue;
    
    // Check if obstacle overlaps with food
    // Use safe version of pointInRect
    const safePointInRect = (point, rect) => {
      if (typeof pointInRect === 'function') {
        return pointInRect(point, rect);
      }
      return point.x >= rect.x && point.x < rect.x + rect.width &&
             point.y >= rect.y && point.y < rect.y + rect.height;
    };
    
    if (foods.some(f => safePointInRect(f, newObs))) continue;

    obstacles.push(newObs);
  }
}

function randomPosition() {
  return {
    x: Math.floor(Math.random() * TILE_COUNT),
    y: Math.floor(Math.random() * TILE_COUNT)
  };
}

// Get position away from center for obstacles
function getPositionAwayFromCenter(minDistance) {
  const centerX = Math.floor(TILE_COUNT / 2);
  const centerY = Math.floor(TILE_COUNT / 2);
  let pos;
  do {
    pos = randomPosition();
    const dx = Math.abs(pos.x - centerX);
    const dy = Math.abs(pos.y - centerY);
    if (Math.sqrt(dx*dx + dy*dy) < minDistance) continue;
    if (occupiesPosition(pos.x, pos.y)) continue;
    return pos;
  } while (true);
}

// Spawn new food of same type at new location
function placeNewFood(oldFood) {
  // If this is a special "remains" food that should not respawn, skip
  if (oldFood.noRespawn) return;
  
  let pos;
  do {
    pos = randomPosition();
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
}

// Initial foods spawn using FOOD_TYPES constant
// Only spawn food types defined in CURRENT_LEVEL_CONFIG.settings.foodTypes if present
function initFoods() {
  foods = [];
  let allowedTypes = null;
  if (window.CURRENT_LEVEL_CONFIG && window.CURRENT_LEVEL_CONFIG.settings && window.CURRENT_LEVEL_CONFIG.settings.foodTypes) {
    allowedTypes = Object.keys(window.CURRENT_LEVEL_CONFIG.settings.foodTypes);
  }
  for (const [type, props] of Object.entries(FOOD_TYPES)) {
    if (type === 'remains') continue;
    if (allowedTypes && !allowedTypes.includes(type)) continue;
    let pos;
    do {
      pos = randomPosition();
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
}

// Create remains food when a snake dies
function createRemainsFoodFromSnake(snake, color) {
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
}

// Position snakes in their starting positions
function initSnakes(playerColorChoice) {
  // Set player snake in center, facing down
  const centerX = Math.floor(TILE_COUNT / 2);
  const centerY = Math.floor(TILE_COUNT / 2);
  
  playerSnake = [];
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    playerSnake.push({ 
      x: centerX, 
      y: centerY - i,
      prevX: centerX, // Add previous position for animation
      prevY: centerY - i
    }); 
  }
  playerDir = { x: 0, y: 1 }; // Start moving down
  playerGrow = 0;
  playerSpeedBoostEnd = 0; // Add timestamp for when player speed boost ends
  
  // Set player color
  playerColor = playerColorChoice;
  const colorConfig = PLAYER_COLORS[playerColorChoice] || { head: 'lime', body: 'lime' };
  playerHeadColor = colorConfig.head;
  playerBodyColor = colorConfig.body;
  
  // Initialize AI snakes in corners
  aiSnakes = [];
  aiPositionHistories = [];
  
  // Get the number of AI snakes for this level (level-specific or default)
  const numAiSnakes = typeof window.LEVEL_NUM_AI_SNAKES === 'number' ? window.LEVEL_NUM_AI_SNAKES : (typeof NUM_AI_SNAKES === 'number' ? NUM_AI_SNAKES : 4);
  
  console.log(`Initializing ${numAiSnakes} AI snakes`);
  
  // Skip AI initialization if this is a single-player level
  if (numAiSnakes === 0) {
    console.log("Single-player mode - no AI snakes created");
    return;
  }
  
  // Get available AI colors (not chosen by player)
  const availableColors = Object.keys(AI_SNAKE_COLORS).filter(c => c !== playerColorChoice);
  
  // Always ensure red is one of the AI colors
  if (!availableColors.includes('red')) {
    availableColors.push('red');
  }
  
  // Use at most numAiSnakes colors
  const aiColors = availableColors.slice(0, numAiSnakes);
  
  // Define the four corners of the map
  const corners = [
    { x: 2, y: 2, dir: { x: 1, y: 0 } },                       // Top-left
    { x: TILE_COUNT - 3, y: 2, dir: { x: 0, y: 1 } },           // Top-right
    { x: 2, y: TILE_COUNT - 3, dir: { x: 0, y: -1 } },          // Bottom-left
    { x: TILE_COUNT - 3, y: TILE_COUNT - 3, dir: { x: -1, y: 0 } } // Bottom-right
  ];
  
  // Create AI snakes
  for (let i = 0; i < numAiSnakes && i < aiColors.length; i++) {
    const color = aiColors[i];
    const corner = corners[i];
    const colorConfig = AI_SNAKE_COLORS[color];
    
    // Create a snake body
    const body = [];
    for (let j = 0; j < INITIAL_SNAKE_LENGTH; j++) {
      body.push({ 
        x: corner.x - j * corner.dir.x, 
        y: corner.y - j * corner.dir.y,
        prevX: corner.x - j * corner.dir.x, // Add previous position for animation
        prevY: corner.y - j * corner.dir.y
      });
    }
    
    aiSnakes.push({
      body,
      dir: corner.dir,
      grow: 0,
      color,
      headColor: colorConfig.head,
      bodyColor: colorConfig.body,
      alive: true,
      speedBoostEnd: 0,
      tempMoveRate: 0,
      permanentMoveRate: 0,
      moveAccumulator: 0,
      score: 0
    });
    
    // Initialize position history for each AI snake
    aiPositionHistories.push([]);
  }
}

// Fix countdown functionality
function startCountdown() {
  console.log("Starting countdown with COUNTDOWN_SECONDS:", COUNTDOWN_SECONDS);
  countdownActive = true;
  gameContainer.style.display = 'block';
  countdownElement.style.display = 'block';
  
  // Draw the initial game state
  if (typeof drawGameState === 'function') {
    drawGameState();
    console.log("Game state drawn during countdown");
  } else {
    console.error("drawGameState function not defined");
  }
  
  let count = COUNTDOWN_SECONDS || 3; // Default to 3 if COUNTDOWN_SECONDS is undefined
  countdownElement.textContent = count;
  
  // Use setTimeout for countdown (requestAnimationFrame is not suitable for 1s intervals)
  const countDown = () => {
    count--;
    countdownElement.textContent = count;
    console.log("Countdown:", count);
    
    // Redraw game state each second of countdown
    if (typeof drawGameState === 'function') {
      drawGameState();
    }
    
    if (count > 0) {
      setTimeout(countDown, 1000); // 1 second interval
    } else {
      countdownElement.style.display = 'none';
      countdownActive = false;
      console.log("Countdown finished, starting game");
      // Focus the canvas to ensure keyboard controls work
      if (canvas && typeof canvas.focus === 'function') {
        canvas.focus();
        console.log('Canvas focused after countdown');
      } else if (window && typeof window.focus === 'function') {
        window.focus();
        console.log('Window focused after countdown');
      }
      // Initialize animation and game timing
      lastUpdateTime = Date.now();
      lastGameUpdateTime = Date.now();
      animationProgress = 0; // Start animation from beginning
      
      // Start the game loop - use safe reference
      if (typeof gameLoop === 'function') {
        gameInterval = setInterval(gameLoop, baseInterval);
      } else {
        console.error("gameLoop function not defined - waiting for gameState.js to load");
        // Retry after a short delay
        setTimeout(() => {
          if (typeof gameLoop === 'function') {
            gameInterval = setInterval(gameLoop, baseInterval);
          } else {
            console.error("gameLoop function still not available after delay");
          }
        }, 100);
      }
    }
  };
  setTimeout(countDown, 1000); // Start first countdown after 1 second
}

// Compatibility function that redirects to GameManager.initGame
function initGame() {
  GameManager.initGame();
}

// New function to apply temporary extra moves per tick to AI snake
function applyAiSpeedBoost(snakeIndex, amount) {
  const snake = aiSnakes[snakeIndex];
  if (!snake.alive) return;
  snake.tempMoveRate = amount;
  snake.speedBoostEnd = Date.now() + RUNTIME_TEMP_SPEED_BOOST_DURATION;
  console.log(`AI snake ${snakeIndex} (${snake.color}) speed boosted until ${new Date(snake.speedBoostEnd).toLocaleTimeString()}`);
}

// Maintain backward compatibility with existing moveSnake function
function moveSnake(snake, dir, grow) {
  return moveSnakeSmooth(snake, dir, grow);
}

function processPlayerEatsFood() {
  for (let i = foods.length - 1; i >= 0; i--) {
    if (!playerAlive) break;
    
    if (playerSnake[0].x === foods[i].x && playerSnake[0].y === foods[i].y) {
      const food = foods[i];
      score++;
      console.log('Player ate food! New score:', score);
      playerGrow += food.grow;
      
      // Track level-specific food count for objectives
      if (typeof window.levelFoodCount !== 'undefined') {
        window.levelFoodCount++;
        console.log(`Player ate food! Total food eaten: ${window.levelFoodCount}`);
      }

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
      
      // Emit event for level system
      if (typeof EventSystem !== 'undefined') {
        EventSystem.emit('playerAteFood', { food, score, levelFoodCount: window.levelFoodCount });
      }
      
      // OLD OBJECTIVE CHECKING REMOVED - Using new checkWinConditions() in gameLoop instead
      
      // Only respawn regular food types
      if (!food.noRespawn) {
        placeNewFood(food);
      }
      break;
    }
  }
}

function showStatusMessage(message) {
  // Check if this is a winner message (contains victory/defeat emojis or text)
  const isWinnerMessage = message.includes("\u{1F3C6}") || message.includes("\u{1F494}") || 
                         message.includes("YOU WON") || message.includes("defeated by");
  
  // If this is a winner message, always allow it to be shown
  if (isWinnerMessage) {
    console.log("Setting winner message:", message);
    statusMessageElement.textContent = message;
    statusMessageElement.style.display = "block";
    return;
  }
  
  // For non-winner messages, only protect against overriding existing winner messages
  if (gameWinner && statusMessageElement.style.display === "block" && 
      (statusMessageElement.textContent.includes("\u{1F3C6}") || 
       statusMessageElement.textContent.includes("\u{1F494}") ||
       statusMessageElement.textContent.includes("YOU WON") ||
       statusMessageElement.textContent.includes("defeated by"))) {
    // Don't update if we already have a winner message showing
    console.log("Protecting existing winner message from being overridden");
    return;
  }
  
  // Otherwise, set the new message
  console.log("Setting status message:", message);
  statusMessageElement.textContent = message;
  statusMessageElement.style.display = "block";
}

function killPlayerSnake() {
  if (!playerAlive) return;
  
  // Make a copy of the snake body before marking player as dead
  const snakeBodyCopy = [...playerSnake];
  
  // Mark player as dead
  playerAlive = false;
  playerStatusElem.textContent = "Dead";
  playerStatusElem.style.color = "red";
  
  // Create food remains from the copied snake body
  const colorInfo = PLAYER_COLORS[playerColor] || { body: 'lime' };
  createRemainsFoodFromSnake(snakeBodyCopy, colorInfo);
  
  // Clear the player snake array to completely remove it from display
  playerSnake = [];
  
  // Check for a winner immediately after player dies
  // This ensures that if only 1 AI snake is left, the winner message appears
  if (!gameWinner) {
    checkForWinner();
  }
  
  // Only show "You died" message if there's no winner yet (after checking)
  if (!gameWinner) {
    // Check the objective type to determine appropriate message
    let deathMessage;
    if (window.CURRENT_LEVEL_CONFIG && window.CURRENT_LEVEL_CONFIG.objective) {
      const objectiveType = window.CURRENT_LEVEL_CONFIG.objective.type;
      
      if (objectiveType === window.ObjectiveType.SURVIVE.value) {
        // For SURVIVE objectives, show the original battle message
        deathMessage = "You died!\n\nWatch as the AI snakes continue to battle for supremacy.\n\nMay the best snake win!";
      } else {
        // For other objectives (score, eat_food, time_survive), show generic failure message
        const objectiveName = window.CURRENT_LEVEL_CONFIG.objective.type.replace('_', ' ').toUpperCase();
        const currentScore = score;
        const targetScore = window.CURRENT_LEVEL_CONFIG.objective.target;
        
        deathMessage = `You failed to complete the objective!\n\nObjective: ${objectiveName}\nTarget: ${targetScore}\nYour Score: ${currentScore}`;
      }
    } else {
      // Fallback message if no objective is configured
      deathMessage = "You died!\n\nGame over!";
    }
    
    // Show status message that player died
    showStatusMessage(deathMessage);
    
    // Show restart button
    gameControlsElement.style.display = "block";
  }
  
  console.log("Player died");
}

function killAiSnake(index) {
  const snake = aiSnakes[index];
  if (!snake.alive) return;
  
  // Make a copy of snake body before marking as dead
  const snakeBodyCopy = [...snake.body];
  
  // Mark snake as dead
  snake.alive = false;
  
  // Create food remains from the copied snake body
  const colorInfo = AI_SNAKE_COLORS[snake.color] || { body: 'gray' };
  createRemainsFoodFromSnake(snakeBodyCopy, colorInfo);
  
  // Update enemies left counter
  let aliveCount = aiSnakes.filter(s => s.alive).length;
  enemiesLeftElem.textContent = aliveCount;
  
  // Only check for a winner if we don't already have one
  if (!gameWinner) {
    // Check if we have a winner after killing this AI
    checkForWinner();
  }
}

function checkForWinner() {
  // If we already have a winner determined, don't change it
  if (gameWinner) {
    return false;
  }

  // Only use last-alive logic if the objective is 'survive'
  let isSurviveObjective = false;
  if (window.CURRENT_LEVEL_CONFIG && window.CURRENT_LEVEL_CONFIG.objective) {
    isSurviveObjective = window.CURRENT_LEVEL_CONFIG.objective.type === window.ObjectiveType.SURVIVE.value;
  }
  
  // Skip old win condition logic for SURVIVE objectives - use new checkWinConditions() instead
  if (isSurviveObjective) {
    return false;
  }

  // Count alive snakes
  let aliveSnakes = [];
  if (playerAlive) {
    aliveSnakes.push({
      type: 'player',
      color: playerColor
    });
  }
  for (let i = 0; i < aiSnakes.length; i++) {
    if (aiSnakes[i].alive) {
      aliveSnakes.push({
        type: 'ai',
        color: aiSnakes[i].color,
        index: i
      });
    }
  }

  // Update enemies count
  enemiesLeftElem.textContent = aiSnakes.length > 0 ? aliveSnakes.length - (playerAlive ? 1 : 0) : 0;

  // Only trigger win/lose if objective is 'survive'
  if (isSurviveObjective) {
    if (aliveSnakes.length === 1) {
      const winner = aliveSnakes[0];
      const colorName = winner.color.charAt(0).toUpperCase() + winner.color.slice(1);
      gameWinner = {
        type: winner.type,
        color: winner.color,
        colorName: colorName,
        index: winner.type === 'ai' ? winner.index : -1
      };
      if (typeof EventSystem !== 'undefined') {
        EventSystem.emit('gameOver', { winner: gameWinner, score, aliveSnakes });
      }
      let message = '';
      if (winner.type === 'player') {
        message = `\u{1F3C6} YOU WON! \u{1F3C6}\n\nYour ${colorName} snake is victorious!\n\nKeep playing and growing your snake for as long as you wish.`;
      } else {
        message = `\u{1F494} You were defeated by the ${colorName} AI snake.\n\nWatch as the AI snake continues to move or click Restart to play again.`;
      }
      statusMessageElement.textContent = message;
      statusMessageElement.style.display = "block";
      gameControlsElement.style.display = "block";
      const returnToLevelsBtn = document.getElementById('returnToLevelsBtn');
      if (returnToLevelsBtn) {
        const isInLevel = typeof LevelManager !== 'undefined' && LevelManager.currentLevel;
        returnToLevelsBtn.style.display = isInLevel ? 'block' : 'none';
      }
      gameOver = true;
      return true;
    } else if (aliveSnakes.length === 0) {
      if (typeof EventSystem !== 'undefined') {
        EventSystem.emit('gameOver', { winner: null, score, aliveSnakes });
      }
      statusMessageElement.textContent = "All snakes have died! It's a draw!\n\nClick Restart to play again.";
      statusMessageElement.style.display = "block";
      gameControlsElement.style.display = "block";
      gameOver = true;
      return true;
    }
  }
  return false;
}

// Update objective progress display
function updateObjectiveProgress() {
  if (typeof LevelManager === 'undefined' || !LevelManager.getObjectiveProgress) {
    return;
  }
  
  const progress = LevelManager.getObjectiveProgress();
  if (!progress) return;
  
  // Find or create objective progress element
  let objectiveElem = document.getElementById('objectiveProgress');
  if (!objectiveElem) {
    objectiveElem = document.createElement('div');
    objectiveElem.id = 'objectiveProgress';
    objectiveElem.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 1000;
    `;
    document.body.appendChild(objectiveElem);
  }
  
  // Update objective display based on type
  let displayText = '';
  switch (progress.type) {
    case 'score':
      displayText = `Score: ${progress.current}/${progress.target}`;
      break;
    case 'eat_food':
      displayText = `Food: ${progress.current}/${progress.target}`;
      break;
    case 'time_survive':
      displayText = `Survive: ${progress.current}s/${progress.target}s`;
      break;
    case 'survive':
      displayText = 'Be the last snake standing';
      break;
  }
  
  // Add progress bar for non-survive objectives
  if (progress.type !== 'survive') {
    const progressPercent = Math.round(progress.progress * 100);
    displayText += ` (${progressPercent}%)`;
  }
  
  objectiveElem.textContent = displayText;
}

// Update AI scores display
function updateAiScores() {
  if (!aiScoresElem) return;
  
  aiScoresElem.innerHTML = '';
  const now = Date.now();
  const ticksPerSecond = 1000 / baseInterval;
  
  for (let i = 0; i < aiSnakes.length; i++) {
    const snake = aiSnakes[i];
    const colorName = snake.color.charAt(0).toUpperCase() + snake.color.slice(1);
    const tempRate = snake.alive && snake.speedBoostEnd > now ? snake.tempMoveRate : 0;
    const unclamped = snake.alive ? (1 + snake.permanentMoveRate) : 0;
    const effectiveMovesPerTick = snake.alive ? (Math.min(unclamped, MAX_MOVES_PER_SECOND / baseInterval * 1000) + tempRate) : 0;
    const speedMovesPerSec = (baseInterval ? (1000 / baseInterval) * effectiveMovesPerTick : 0).toFixed(2);
    
    // Only show AI score if there are any AI snakes
    if (aiSnakes.length > 0) {
      const scoreDiv = document.createElement('div');
      scoreDiv.className = `ai-score-item${snake.alive ? '' : ' dead'}`;
      scoreDiv.style.color = snake.headColor;
      scoreDiv.textContent = `${colorName}: ${snake.score} (${speedMovesPerSec}/s)`;
      aiScoresElem.appendChild(scoreDiv);
    }
  }
}

function updateGameState() {
  // Always check AI collisions if there are alive AI snakes (even if there's a winner)
  // Collision detection should continue to work normally
  if (aiSnakes.some(snake => snake.alive)) {
    checkAiCollisions();
  }
  

  // OLD WIN CONDITION LOGIC REMOVED - Using new checkWinConditions() in gameLoop instead

  // Check for a winner after collision processing, but only if we don't already have one
  if (!gameWinner) {
    checkForWinner();
  }
  
  // Update scoreboard
  if (scoreElem) scoreElem.textContent = score;
  if (speedElem) {
    const currentSpeed = 1 + playerPermanentMoveRate + playerTempMoveRate;
    speedElem.textContent = (currentSpeed * (1000 / baseInterval)).toFixed(1);
  }
  
  // Update AI scores
  updateAiScores();
  
  // Update objective progress display
  updateObjectiveProgress();
}

let pending180Turn = null;
let winConditionMetThisRound = false; // Track if win condition was met and user chose to continue

/**
 * NEW: Check win conditions using level config objective
 */
function checkWinConditions() {
  // Only check if we're in a level and don't already have a winner
  if (!window.CURRENT_LEVEL_CONFIG || gameWinner || winConditionMetThisRound) {
    if (gameWinner) {
      console.log('checkWinConditions skipped: gameWinner already set');
    }
    return;
  }
  
  const objective = window.CURRENT_LEVEL_CONFIG.objective;
  if (!objective) {
    return;
  }
  
  let winConditionMet = false;
  
  switch (objective.type) {
    case window.ObjectiveType.SCORE.value:
      winConditionMet = score >= objective.target;
      console.log(`Score check: ${score} >= ${objective.target} = ${winConditionMet}`);
      break;
      
    case window.ObjectiveType.EAT_FOOD.value:
      winConditionMet = (window.levelFoodCount || 0) >= objective.target;
      console.log(`Food check: ${window.levelFoodCount || 0} >= ${objective.target} = ${winConditionMet}`);
      break;
      
    case window.ObjectiveType.TIME_SURVIVE.value:
      winConditionMet = (window.levelSurvivalTime || 0) >= objective.target;
      console.log(`Time check: ${window.levelSurvivalTime || 0} >= ${objective.target} = ${winConditionMet}`);
      break;
      
    case window.ObjectiveType.SURVIVE.value:
      // Check if player is alive and all AI snakes are dead
      const aliveAiSnakes = aiSnakes.filter(snake => snake.alive);
      winConditionMet = playerAlive && aliveAiSnakes.length === 0;
      console.log(`Survive check: playerAlive=${playerAlive}, aliveAiSnakes=${aliveAiSnakes.length} = ${winConditionMet}`);
      break;
      
    default:
      console.warn('Unknown objective type:', objective.type);
      return;
  }
  
  if (winConditionMet) {
    console.log('WIN CONDITION MET! Showing win overlay...');
    showWinOverlay(objective);
  }
}

/**
 * NEW: Show win overlay with Next Level and Continue buttons
 */
function showWinOverlay(objective) {
  // Set game winner to prevent further win condition checks
  gameWinner = { type: 'objective', color: playerColor };
  
  // Complete the current level and unlock next level
  if (typeof LevelManager !== 'undefined' && LevelManager.completeLevel && window.CURRENT_LEVEL_CONFIG) {
    const currentLevelId = window.CURRENT_LEVEL_CONFIG.id;
    const completionResult = LevelManager.completeLevel(currentLevelId, score);
    console.log('Level completed:', completionResult);
  }
  
  // Pause the game
  if (gameInterval) {
    clearInterval(gameInterval);
  }
  if (animationInterval) {
    clearInterval(animationInterval);
  }
  
  // Create overlay positioned over the game board
  const overlay = document.createElement('div');
  overlay.id = 'winOverlay';
  overlay.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 300px;
    background: rgba(0, 0, 0, 0.9);
    border: 3px solid #00FF00;
    border-radius: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 0 30px #00FF00, inset 0 0 20px rgba(0, 255, 0, 0.1);
    backdrop-filter: blur(5px);
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    border: 2px solid #00FF00;
  `;
  
  // Create message
  const message = document.createElement('div');
  message.style.cssText = `
    font-size: 28px;
    font-weight: bold;
    color: #00FF00;
    margin-bottom: 15px;
    text-shadow: 0 0 10px #00FF00;
    text-transform: uppercase;
    letter-spacing: 2px;
  `;
  message.textContent = 'You Won!';
  dialog.appendChild(message);
  
  // Create objective details
  const details = document.createElement('div');
  details.style.cssText = `
    font-size: 14px;
    color: #CCCCCC;
    margin-bottom: 25px;
    line-height: 1.4;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
  `;
  
  let detailText = '';
  switch (objective.type) {
    case window.ObjectiveType.SCORE.value:
      detailText = `You reached the target score of ${objective.target}!\n\nFinal Score: ${score}`;
      break;
    case window.ObjectiveType.EAT_FOOD.value:
      detailText = `You ate ${objective.target} food items!\n\nFood Eaten: ${window.levelFoodCount || 0}`;
      break;
    case window.ObjectiveType.TIME_SURVIVE.value:
      const timeSeconds = Math.floor((window.levelSurvivalTime || 0) / 1000);
      const targetSeconds = Math.floor(objective.target / 1000);
      detailText = `You survived for ${timeSeconds} seconds!\n\nTarget: ${targetSeconds} seconds`;
      break;
    case window.ObjectiveType.SURVIVE.value:
      const aliveAiCount = aiSnakes.filter(snake => snake.alive).length;
      detailText = `You were the last snake standing!\n\nEnemies Defeated: ${aiSnakes.length - aliveAiCount}`;
      break;
  }
  
  details.textContent = detailText;
  dialog.appendChild(details);
  
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
    background: linear-gradient(135deg, #00FF00 0%, #00CC00 100%);
    color: #000000;
    border: 2px solid #00FF00;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  `;
  nextLevelBtn.onmouseover = () => {
    nextLevelBtn.style.background = 'linear-gradient(135deg, #00CC00 0%, #00AA00 100%)';
    nextLevelBtn.style.transform = 'translateY(-2px)';
    nextLevelBtn.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
  };
  nextLevelBtn.onmouseout = () => {
    nextLevelBtn.style.background = 'linear-gradient(135deg, #00FF00 0%, #00CC00 100%)';
    nextLevelBtn.style.transform = 'translateY(0)';
    nextLevelBtn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.5)';
  };
  nextLevelBtn.onclick = () => handleNextLevel();
  
  // Continue button
  const continueBtn = document.createElement('button');
  continueBtn.textContent = 'Continue';
  continueBtn.style.cssText = `
    padding: 12px 24px;
    font-size: 16px;
    background: linear-gradient(135deg, #333333 0%, #555555 100%);
    color: #00FF00;
    border: 2px solid #00FF00;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
  `;
  continueBtn.onmouseover = () => {
    continueBtn.style.background = 'linear-gradient(135deg, #444444 0%, #666666 100%)';
    continueBtn.style.transform = 'translateY(-2px)';
    continueBtn.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
  };
  continueBtn.onmouseout = () => {
    continueBtn.style.background = 'linear-gradient(135deg, #333333 0%, #555555 100%)';
    continueBtn.style.transform = 'translateY(0)';
    continueBtn.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';
  };
  continueBtn.onclick = () => handleContinueLevel();
  
  // Add buttons to container
  buttonContainer.appendChild(nextLevelBtn);
  buttonContainer.appendChild(continueBtn);
  dialog.appendChild(buttonContainer);
  
  // Add dialog to overlay
  overlay.appendChild(dialog);
  
  // Add overlay to game container
  const gameContainer = document.getElementById('gameContainer');
  if (gameContainer) {
    gameContainer.style.position = 'relative'; // Ensure game container can contain positioned elements
    gameContainer.appendChild(overlay);
  } else {
    // Fallback to body if game container not found
    document.body.appendChild(overlay);
  }
  
  // Show the existing side buttons (Restart and Main Menu)
  if (typeof gameControlsElement !== 'undefined' && gameControlsElement) {
    gameControlsElement.style.display = 'block';
  }
}

/**
 * NEW: Handle Next Level button click
 */
function handleNextLevel() {
  // Remove overlay
  const overlay = document.getElementById('winOverlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Get current level and next level
  const currentLevelId = window.CURRENT_LEVEL_CONFIG ? window.CURRENT_LEVEL_CONFIG.id : 1;
  const nextLevelId = currentLevelId + 1;
  
  // Check if next level exists
  if (window.LEVEL_CONFIGS && window.LEVEL_CONFIGS[nextLevelId]) {
    console.log(`Starting next level: ${nextLevelId}`);
    
    // Start next level
    if (typeof LevelUI !== 'undefined' && LevelUI.startLevel) {
      LevelUI.startLevel(nextLevelId);
    } else {
      console.error('LevelUI not available for next level');
    }
  } else {
    // No more levels - show completion message in overlay instead of browser popup
    showAllLevelsCompleteOverlay();
  }
}

/**
 * NEW: Show all levels complete overlay
 */
function showAllLevelsCompleteOverlay() {
  // Remove any existing overlay
  const existingOverlay = document.getElementById('winOverlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  // Create new overlay for all levels complete
  const overlay = document.createElement('div');
  overlay.id = 'winOverlay';
  overlay.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 300px;
    background: rgba(0, 0, 0, 0.9);
    border: 3px solid #00FF00;
    border-radius: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: Arial, sans-serif;
    box-shadow: 0 0 30px #00FF00, inset 0 0 20px rgba(0, 255, 0, 0.1);
    backdrop-filter: blur(5px);
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    border: 2px solid #00FF00;
  `;
  
  const message = document.createElement('div');
  message.style.cssText = `
    font-size: 24px;
    font-weight: bold;
    color: #00FF00;
    margin-bottom: 20px;
    text-shadow: 0 0 10px #00FF00;
    text-transform: uppercase;
    letter-spacing: 2px;
  `;
  message.textContent = 'All Levels Complete!';
  
  const details = document.createElement('div');
  details.style.cssText = `
    font-size: 14px;
    color: #CCCCCC;
    margin-bottom: 25px;
    line-height: 1.4;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
  `;
  details.textContent = 'Congratulations! You have completed all levels!';
  
  const button = document.createElement('button');
  button.textContent = 'Return to Menu';
  button.style.cssText = `
    padding: 12px 24px;
    font-size: 16px;
    background: linear-gradient(135deg, #00FF00 0%, #00CC00 100%);
    color: #000000;
    border: 2px solid #00FF00;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    box-shadow: 0 0 15px rgba(0, 255, 0, 0.5);
  `;
  button.onclick = () => {
    overlay.remove();
    if (typeof GameManager !== 'undefined' && GameManager.returnToLevelSelection) {
      GameManager.returnToLevelSelection();
    }
  };
  
  dialog.appendChild(message);
  dialog.appendChild(details);
  dialog.appendChild(button);
  overlay.appendChild(dialog);
  
  const gameContainer = document.getElementById('gameContainer');
  if (gameContainer) {
    gameContainer.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }
  
  // Show the existing side buttons (Restart and Main Menu)
  if (typeof gameControlsElement !== 'undefined' && gameControlsElement) {
    gameControlsElement.style.display = 'block';
  }
}

/**
 * NEW: Handle Continue button click
 */
function handleContinueLevel() {
  // Remove overlay
  const overlay = document.getElementById('winOverlay');
  if (overlay) {
    overlay.remove();
  }
  
  // Keep the side buttons visible when continuing - user should still have access to Restart and Main Menu
  
  // Resume the game
  console.log('Resuming game after win condition met');
  
  // Clear the game winner so the game can continue
  gameWinner = null;
  
  // Set flag to prevent win condition from triggering again this round
  winConditionMetThisRound = true;
  
  // Restart the game loop
  if (typeof baseInterval !== 'undefined') {
    gameInterval = setInterval(gameLoop, baseInterval);
    animationInterval = requestAnimationFrame(animationLoop);
  }
}

function gameLoop() {
  if (countdownActive) return;
  
  // Don't continue if level is completed (gameWinner is set but gameOver is not)
  if (gameWinner && gameWinner.type === 'objective' && !gameOver) {
    return;
  }
  
  // NEW: Check win conditions directly using level config
  checkWinConditions();
  
  // Measure actual timing for compensation
  const loopStartTime = Date.now();
  
  // Update survival time tracking for time-based objectives
  if (typeof window.levelSurvivalTime !== 'undefined' && playerAlive) {
    window.levelSurvivalTime = loopStartTime - window.levelStartTime;
  }
  if (gameLoopStartTime > 0) {
    actualGameUpdateInterval = loopStartTime - gameLoopStartTime;
    
    // Calculate timing compensation for next frame
    const expectedInterval = baseInterval;
    const timingError = actualGameUpdateInterval - expectedInterval;
    timingCompensation = Math.max(-expectedInterval * 0.5, Math.min(expectedInterval * 0.5, timingError * 0.3));
  }
  gameLoopStartTime = loopStartTime;
  
  moveCounter++;
  
  // Reset animation progress for new movement but preserve timing
  animationProgress = 0;
  lastGameUpdateTime = loopStartTime;
  
  // Check for expired temporary speed boosts
  if (playerAlive && playerSpeedBoostEnd > 0 && loopStartTime >= playerSpeedBoostEnd) {
    playerTempMoveRate = 0;
    playerSpeedBoostEnd = 0;
    console.log("Player temporary speed boost expired");
  }
  
  // Calculate total move rate for this tick
  const totalMoveRate = 1 + playerPermanentMoveRate + playerTempMoveRate;
  
  // Add to accumulator
  playerMoveAccumulator += totalMoveRate;
  
  // Handle pending 180 turn (queue the second direction if needed)
  if (pending180Turn && directionQueue.length < 2) {
    directionQueue.push(pending180Turn);
    pending180Turn = null;
  }

  // Continue processing player movement if player is alive, even if we have a winner
  if (playerAlive && playerSnake && playerSnake.length > 0) {
    const is180Turn = typeof handle180Turn === 'function' ? handle180Turn() : false;
    // Only use 180-turn logic if both is180Turn and directionQueue has 2 directions
    if (is180Turn && directionQueue.length >= 2) {
      // Only process the first direction this tick, and queue the second for next tick
      const firstDir = directionQueue.shift();
      const secondDir = directionQueue.shift();
      playerDir = firstDir;
      playerGrow = moveSnakeSmooth(playerSnake, playerDir, playerGrow);
      pending180Turn = secondDir;
      playerMoveAccumulator -= 1;
      if (!checkPlayerCollisions()) {
        processPlayerEatsFood();
      } else {
        directionQueue = [];
        playerMoveAccumulator = 0;
        pending180Turn = null;
      }
      return;
    }
    // --- Normal movement logic ---
    // Process queued direction changes
    if (directionQueue.length > 0) {
      const nextDir = directionQueue.shift();
      // Prevent 180-degree turns
      if (!(nextDir.x === -playerDir.x && nextDir.y === -playerDir.y)) {
        playerDir = nextDir;
      }
    }
    // For multiple moves per tick, spread them out for smoother animation
    let movesToProcess = Math.floor(playerMoveAccumulator);
    const fractionalPart = playerMoveAccumulator - movesToProcess;
    const maxMovesPerTick = Math.ceil((1 + playerPermanentMoveRate + playerTempMoveRate) * 1.5);
    movesToProcess = Math.min(movesToProcess, maxMovesPerTick);
    for (let moveCount = 0; moveCount < movesToProcess; moveCount++) {
      playerGrow = moveSnakeSmooth(playerSnake, playerDir, playerGrow);
      if (checkPlayerCollisions()) {
        break;
      }
      processPlayerEatsFood();
      playerMoveAccumulator -= 1;
    }
    playerMoveAccumulator = Math.max(0, fractionalPart);
  }
  
  // Update AI snake movements with enhanced timing - continue processing even if we have a winner
  for (let i = 0; i < aiSnakes.length; i++) {
    const snake = aiSnakes[i];
    if (!snake.alive) continue;
    
    // Check for expired AI temporary speed boosts
    if (snake.speedBoostEnd > 0 && loopStartTime >= snake.speedBoostEnd) {
      snake.tempMoveRate = 0;
      snake.speedBoostEnd = 0;
    }
    
    // Calculate total move rate for this tick
    const aiTotalMoveRate = 1 + snake.permanentMoveRate + snake.tempMoveRate;
    
    // Add to accumulator
    snake.moveAccumulator += aiTotalMoveRate;
    
    // Determine AI direction - using our safe wrapper
    snake.dir = aiChooseDir(i);
    
    // Process AI moves with the same smooth system
    let aiMovesToProcess = Math.floor(snake.moveAccumulator);
    const aiFractionalPart = snake.moveAccumulator - aiMovesToProcess;
    
    // Limit AI moves per tick
    const maxAiMovesPerTick = Math.ceil(aiTotalMoveRate * 1.5);
    aiMovesToProcess = Math.min(aiMovesToProcess, maxAiMovesPerTick);
    
    // Process each AI move individually
    for (let moveCount = 0; moveCount < aiMovesToProcess; moveCount++) {
      // Move the snake with enhanced timing
      snake.grow = moveSnakeSmooth(snake.body, snake.dir, snake.grow);
      
      // Process AI eating food
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
            snake.speedBoostEnd = loopStartTime + RUNTIME_TEMP_SPEED_BOOST_DURATION;
          }
          
          foods.splice(j, 1);
          if (!food.noRespawn) {
            placeNewFood(food);
          }
          break;
        }
      }
      
      // Check for collisions immediately after each movement
      if (checkAiCollisions(i)) {
        break; // Stop movement if this AI snake has died
      }
      
      // Decrement accumulator
      snake.moveAccumulator -= 1;
    }
    
    // Preserve fractional accumulator for next frame
    snake.moveAccumulator = Math.max(0, aiFractionalPart);
  }
  
  // Update game state
  updateGameState();
}

/**
 * Enhanced snake movement function with better timing
 */
function moveSnakeSmooth(snake, dir, grow) {
  // Store previous positions before moving (for animation)
  for (let i = 0; i < snake.length; i++) {
    const seg = snake[i];
    seg.prevX = seg.x;
    seg.prevY = seg.y;
    seg.isWrapping = false;
  }
  
  // Calculate new head position with or without wrapping
  const headPrev = snake[0];
  let newHeadX = headPrev.x + dir.x;
  let newHeadY = headPrev.y + dir.y;
  let isWrappingMove = false;
  
  if (wrapEnabled) {
    // Toroidal wrap
    newHeadX = (newHeadX + TILE_COUNT) % TILE_COUNT;
    newHeadY = (newHeadY + TILE_COUNT) % TILE_COUNT;
    isWrappingMove = Math.abs(newHeadX - headPrev.x) > 1 || Math.abs(newHeadY - headPrev.y) > 1;
  }
  
  const head = { 
    x: newHeadX,
    y: newHeadY,
    prevX: headPrev.x,
    prevY: headPrev.y,
    isWrapping: isWrappingMove
  };
  
  snake.unshift(head);
  
  if (grow > 0) {
    grow--;
  } else {
    // Store the tail that will be removed for animation purposes
    const tail = snake[snake.length - 1];
    if (tail && snake.length > 1) {
      // The tail should slide toward where the second-to-last segment is moving
      const secondToLast = snake[snake.length - 2];
      
      // Determine the correct color based on snake type
      let tailColor = '#666666'; // Default fallback
      if (snake === playerSnake) {
        tailColor = playerBodyColor;
      } else {
        // For AI snakes, we need to find which AI snake this is
        for (const aiSnake of aiSnakes) {
          if (aiSnake.body === snake) {
            tailColor = aiSnake.bodyColor;
            break;
          }
        }
      }
      
      removedTails.push({
        x: tail.x,
        y: tail.y,
        prevX: tail.x,
        prevY: tail.y,
        targetX: secondToLast.x, // Slide towards current position of second-to-last
        targetY: secondToLast.y,
        isWrapping: false,
        timestamp: Date.now(),
        animationDuration: baseInterval, // Use fixed base interval for consistent animation
        color: tailColor
      });
    }
    
    snake.pop();
  }
  
  // Propagate wrap flags along body to help interpolation across edges
  for (let i = 1; i < snake.length; i++) {
    const seg = snake[i];
    if (seg.prevX !== undefined && seg.prevY !== undefined) {
      const dx = Math.abs(seg.x - seg.prevX);
      const dy = Math.abs(seg.y - seg.prevY);
      if (dx > 1 || dy > 1) seg.isWrapping = true;
    }
  }
  
  return grow;
}

function setCanvasAndContainerSize() {
  if (!canvas || !gameContainer) return;
  // Set canvas size to match CANVAS_SIZE (level-specific)
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  // Center the gameContainer and set its size
  gameContainer.style.width = CANVAS_SIZE + 'px';
  gameContainer.style.height = CANVAS_SIZE + 'px';
  gameContainer.style.display = 'flex';
  gameContainer.style.justifyContent = 'center';
  gameContainer.style.alignItems = 'center';
  gameContainer.style.margin = '0 auto';
}
// Call this after level config is applied and before game starts

function returnToMainMenu() {
  // For compatibility - now redirects to GameManager
  GameManager.returnToMainMenu();
}