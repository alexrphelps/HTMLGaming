// Input and UI control event handlers

// Check if DOM elements and functions exist before adding event listeners
if (typeof useSameColorCheckbox !== 'undefined' && useSameColorCheckbox) {
  // Listen for changes to the color checkbox
  useSameColorCheckbox.addEventListener('change', () => {
    if (typeof updateColorSettings === 'function') {
      updateColorSettings();
    } else {
      console.warn("updateColorSettings function not available");
    }
  });
}

if (typeof disableWrapCheckbox !== 'undefined' && disableWrapCheckbox) {
  // Listen for changes to the wrap checkbox
  disableWrapCheckbox.addEventListener('change', () => {
    wrapEnabled = !disableWrapCheckbox.checked;
    if (typeof canvas !== 'undefined' && canvas) {
      if (wrapEnabled) {
        canvas.classList.remove('no-wrap');
      } else {
        canvas.classList.add('no-wrap');
      }
    }
    
    // Emit event for wrap setting change if EventSystem exists
    if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
      EventSystem.emit('wrapSettingChanged', wrapEnabled);
    }
  });
}

// Start menu color selection handler
if (typeof colorOptions !== 'undefined' && colorOptions) {
  colorOptions.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    
    // Remove selected class from all buttons
    const buttons = colorOptions.querySelectorAll('button');
    buttons.forEach(btn => btn.classList.remove('selected'));
    
    // Add selected class to the clicked button
    e.target.classList.add('selected');
    
    const color = e.target.getAttribute('data-color');
    console.log("Color selected:", color);
    
    // Set the player color choice
    playerColor = color;
    
    if (typeof PLAYER_COLORS !== 'undefined' && PLAYER_COLORS[color]) {
      playerHeadColor = PLAYER_COLORS[color].head;
      playerBodyColor = PLAYER_COLORS[color].body;
    } else {
      playerHeadColor = 'lime';
      playerBodyColor = 'lime';
    }
    
    // Update the preview
    if (typeof drawSnakePreview === 'function') {
      drawSnakePreview();
    }
    
    // Enable the start game button
    if (typeof startGameBtn !== 'undefined' && startGameBtn) {
      startGameBtn.disabled = false;
    }
    
    // Emit event for color selection
    if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
      EventSystem.emit('playerColorSelected', color);
    }
  });
}

// Start game button handler
if (typeof startGameBtn !== 'undefined' && startGameBtn) {
  startGameBtn.addEventListener('click', () => {
    console.log('Start Game button clicked');
    console.log('playerColor:', playerColor);
    console.log('AI_DIFFICULTY:', AI_DIFFICULTY);
    
    if (playerColor && typeof GameManager !== 'undefined' && GameManager.startGame) {
      console.log('Calling GameManager.startGame()');
      GameManager.startGame();
      console.log('GameManager.startGame() completed');
    } else {
      console.log('No player color selected or GameManager unavailable');
    }
  });
}

// Play Levels button handler
const playLevelsBtn = document.getElementById('playLevelsBtn');
if (playLevelsBtn) {
  playLevelsBtn.addEventListener('click', () => {
    console.log('Play Levels button clicked');
    if (typeof LevelUI !== 'undefined' && LevelUI.showLevelMenu) {
      LevelUI.showLevelMenu();
    } else {
      console.error('LevelUI not available');
    }
  });
}

// Restart button handler
if (typeof restartButtonElement !== 'undefined' && restartButtonElement) {
  restartButtonElement.addEventListener('click', () => {
    console.log('Restart button clicked');
    if (typeof GameManager !== 'undefined' && GameManager.initGame) {
      GameManager.initGame();
    }
  });
}

// Main Menu button handler
if (typeof mainMenuButtonElement !== 'undefined' && mainMenuButtonElement) {
  mainMenuButtonElement.addEventListener('click', () => {
    console.log('Main Menu button clicked');
    if (typeof GameManager !== 'undefined' && GameManager.returnToMainMenu) {
      GameManager.returnToMainMenu();
    }
  });
}

// Return to Levels button handler
const returnToLevelsBtn = document.getElementById('returnToLevelsBtn');
if (returnToLevelsBtn) {
  returnToLevelsBtn.addEventListener('click', () => {
    console.log('Return to Levels button clicked');
    if (typeof GameManager !== 'undefined' && GameManager.returnToLevelSelection) {
      GameManager.returnToLevelSelection();
    }
  });
}

// Settings menu open/close
if (typeof openSettingsBtn !== 'undefined' && openSettingsBtn) {
  openSettingsBtn.addEventListener('click', () => {
    if (typeof prefillSettingsFromState === 'function') {
      prefillSettingsFromState();
    }
    if (typeof startMenu !== 'undefined' && startMenu &&
        typeof settingsMenu !== 'undefined' && settingsMenu) {
      startMenu.style.display = 'none';
      settingsMenu.style.display = 'block';
    }
  });
}

if (typeof settingsCancelBtn !== 'undefined' && settingsCancelBtn) {
  settingsCancelBtn.addEventListener('click', () => {
    if (typeof settingsMenu !== 'undefined' && settingsMenu &&
        typeof startMenu !== 'undefined' && startMenu) {
      settingsMenu.style.display = 'none';
      startMenu.style.display = 'block';
    }
  });
}

if (typeof settingsSaveBtn !== 'undefined' && settingsSaveBtn) {
  settingsSaveBtn.addEventListener('click', () => {
    // Get values from UI inputs, safely checking each element exists
    const settings = {};
    
    if (typeof initialLengthSelect !== 'undefined' && initialLengthSelect) {
      settings.initialLength = parseInt(initialLengthSelect.value, 10);
    }
    if (typeof numObstaclesInput !== 'undefined' && numObstaclesInput) {
      settings.obstacles = parseInt(numObstaclesInput.value, 10) || 0;
    }
    if (typeof redGrowInput !== 'undefined' && redGrowInput) {
      settings.redGrow = parseInt(redGrowInput.value, 10) || 0;
    }
    if (typeof orangeSpeedInput !== 'undefined' && orangeSpeedInput) {
      settings.orangeSpeed = parseFloat(orangeSpeedInput.value) || 0;
    }
    if (typeof yellowBoostInput !== 'undefined' && yellowBoostInput) {
      settings.yellowBoost = parseFloat(yellowBoostInput.value) || 0;
    }
    if (typeof yellowDurationInput !== 'undefined' && yellowDurationInput && 
        typeof RUNTIME_TEMP_SPEED_BOOST_DURATION !== 'undefined') {
      settings.yellowDuration = parseInt(yellowDurationInput.value, 10) || RUNTIME_TEMP_SPEED_BOOST_DURATION;
    }
    
    // Apply settings using ConfigManager (AI difficulty is now controlled by start menu)
    if (typeof ConfigManager !== 'undefined' && ConfigManager.applySettings) {
      ConfigManager.applySettings(settings);
    }
    
    // Close settings menu
    if (typeof settingsMenu !== 'undefined' && settingsMenu && 
        typeof startMenu !== 'undefined' && startMenu) {
      settingsMenu.style.display = 'none';
      startMenu.style.display = 'block';
    }
    
    // Emit event for settings change
    if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
      EventSystem.emit('settingsChanged', settings);
    }
  });
}

if (typeof settingsDefaultsBtn !== 'undefined' && settingsDefaultsBtn) {
  settingsDefaultsBtn.addEventListener('click', () => {
    // Restore default values using ConfigManager
    if (typeof ConfigManager !== 'undefined' && ConfigManager.applyDefaults) {
      ConfigManager.applyDefaults();
    }
    
    // Update inputs to reflect defaults for user confirmation
    if (typeof prefillSettingsFromState === 'function') {
      prefillSettingsFromState();
    }
    
    // Emit event for settings reset
    if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
      EventSystem.emit('settingsReset');
    }
  });
}

// Track key states for 180-degree turn feature
const keyStates = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  KeyW: false,
  KeyS: false,
  KeyA: false,
  KeyD: false
};

// Track key press timestamps for better 180-turn detection
const keyPressTimes = {
  ArrowUp: 0,
  ArrowDown: 0,
  ArrowLeft: 0,
  ArrowRight: 0,
  KeyW: 0,
  KeyS: 0,
  KeyA: 0,
  KeyD: 0
};

// Track key presses for 180 turn

document.addEventListener('keydown', (e) => {  
  // Only track keys we care about
  if (typeof keyDirMap !== 'undefined' && keyDirMap[e.code]) {
    keyStates[e.code] = true;
    keyPressTimes[e.code] = Date.now();
  }
});

document.addEventListener('keyup', (e) => {
  // Release keys
  if (typeof keyDirMap !== 'undefined' && keyDirMap[e.code]) {
    keyStates[e.code] = false;
  }
});

// Helper function to get the opposite direction keys
function getOppositeKeys(direction) {
  if (direction.x === 0) {
    // Up/Down direction, opposites are Left/Right
    return ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'];
  } else {
    // Left/Right direction, opposites are Up/Down
    return ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'];
  }
}

// Helper to get vertical/horizontal keys based on direction
function getVerticalKeys() {
  return ['ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'];
}

function getHorizontalKeys() {
  return ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'];
}

// Helper to check if a key is being held and has been held for long enough
function isKeyHeldLongEnough(key, minTimeMs = 100) {
  if (!keyStates[key]) return false;
  
  const pressTime = keyPressTimes[key];
  const now = Date.now(); // Fix: define now here
  return (now - pressTime) >= minTimeMs;
}

// Helper to check if opposite direction key is being held
function isOppositeKeyHeld() {
  // Get the opposite direction of current player direction
  if (typeof playerDir === 'undefined') return false;
  
  const oppositeDir = { x: -playerDir.x, y: -playerDir.y };
  
  // Find the keys that would move in this opposite direction
  if (typeof keyDirMap === 'undefined') return false;
  
  const oppositeKeys = Object.entries(keyDirMap)
    .filter(([key, dir]) => dir.x === oppositeDir.x && dir.y === oppositeDir.y)
    .map(([key]) => key);
  
  // Check if any of those keys are currently pressed AND have been held for at least 100ms
  // This helps prevent accidental 180 turns during quick key presses
  return oppositeKeys.some(key => isKeyHeldLongEnough(key, 100));
}

// Track if we're in the middle of a 180-degree turn
let performing180Turn = false;
let turnSequence = [];
let last180TurnTime = 0;
const MIN_180_TURN_INTERVAL = 400; // Minimum time between 180 turns (milliseconds)

// Keyboard input handling
document.addEventListener('keydown', (e) => {
  if (typeof playerAlive === 'undefined' || !playerAlive || 
      typeof countdownActive === 'undefined' || countdownActive ||
      typeof keyDirMap === 'undefined') return;
  
  const dir = keyDirMap[e.code];
  if (!dir) return;
  
  e.preventDefault();
  
  // Normal case: prevent opposite direction (180-degree turn)
  if (typeof playerDir !== 'undefined' && dir.x === -playerDir.x && dir.y === -playerDir.y) return;
  
  // Check for 180-degree turn - with improved logic to prevent accidental triggers
  const now = Date.now();
  
  // First, check if we've recently performed a 180 turn
  if (now - last180TurnTime < MIN_180_TURN_INTERVAL) {
    // Too soon after last 180 turn, just handle as a normal direction change
    console.log('Recent 180 turn detected, skipping to normal direction change');
    if (typeof directionQueue !== 'undefined' && directionQueue.length < 2) {
      directionQueue.push(dir);
    }
    return;
  }
  
  if (typeof playerDir === 'undefined') return;
  
  const isMovingHorizontally = playerDir.x !== 0;
  const isMovingVertically = playerDir.y !== 0;
  const isPressingVertical = dir.y !== 0;
  const isPressingHorizontal = dir.x !== 0;
  
  // Check if the user is intentionally doing a 180 turn by requiring:
  // 1. User is pressing a perpendicular direction to current movement
  // 2. User is holding the opposite key with a deliberate hold time
  // 3. User is actively requesting the turn (not just coincidental key presses)
  
  const intentional180 = (
    // Moving horizontally, pressing vertical, and holding opposite horizontal
    (isMovingHorizontally && isPressingVertical && isOppositeKeyHeld()) || 
    // Moving vertically, pressing horizontal, and holding opposite vertical
    (isMovingVertically && isPressingHorizontal && isOppositeKeyHeld())
  );
  
  if (intentional180 && typeof directionQueue !== 'undefined') {
    // Get the opposite of current direction
    const oppositeDir = { x: -playerDir.x, y: -playerDir.y };
    
    // Clear the existing direction queue to make room for our 180 turn
    directionQueue = [];
    
    // Mark that we're performing a 180 turn
    performing180Turn = true;
    last180TurnTime = now;
    
    // Store both directions for the turn sequence
    turnSequence = [
      { ...dir },         // First turn - perpendicular direction
      { ...oppositeDir }  // Second turn - opposite of original direction
    ];
    
    // Add both turns to the queue immediately
    directionQueue.push(turnSequence[0]);
    directionQueue.push(turnSequence[1]);
    
    // Emit event for 180 turn
    if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
      EventSystem.emit('player180Turn', { first: dir, second: oppositeDir });
    }    
    return;
  }
  
  // Standard case - if we're not in a 180 turn, add the direction to the queue
  if (!performing180Turn && typeof directionQueue !== 'undefined' && directionQueue.length < 2) {
    directionQueue.push(dir);
    
    // Emit event for direction change
    if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
      EventSystem.emit('playerDirectionChange', dir);
    }
  }
});

// Function to handle executing the 180-degree turn in the game loop
function handle180Turn() {
  if (performing180Turn) {
    // The turn sequence is already in the direction queue
    // Reset the flag after handling the turn
    performing180Turn = false;
    return true;
  }
  return false;
}