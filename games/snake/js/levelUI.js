/**
 * Level UI Manager - Handles level selection and progression display
 */
const LevelUI = {
  /**
   * Initialize level UI
   */
  init() {
    console.log("LevelUI initialization started");
    // No longer create the menu, just set up listeners and dynamic content
    this.setupEventListeners();
    this.setupQuickPlayButton();
    this.setupDifficultySelectionLevel();
    this.generateLevelButtons();
    // Restore focus to the game canvas or window to ensure keyboard controls work
    if (typeof game !== 'undefined' && game && typeof game.focus === 'function') {
      game.focus();
    } else if (typeof window !== 'undefined' && window.focus) {
      window.focus();
    }
  },
  
  /**
   * No longer creates the menu, just generates dynamic content
   */
  createLevelSelectionMenu() {
    // No-op: static HTML now in index.html
  },
  
  /**
   * Setup AI Difficulty selection for level menu
   */
  setupDifficultySelectionLevel() {
    const difficultyOptions = document.getElementById('difficultyOptionsLevel');
    const quickPlayBtn = document.getElementById('quickPlayBtn');
    const difficultyText = document.getElementById('difficultyTextLevel');
    const difficultyDescriptions = {
      easy: "Easy: AI snakes have slower reactions, less accurate pathfinding, and minimal aggression. Perfect for beginners.",
      medium: "Medium: Balanced AI with good pathfinding and moderate aggression. A fair challenge for most players.",
      hard: "Hard: AI snakes react quickly, use advanced pathfinding, and actively try to trap you. Prepare for a fight!"
    };
    // Make difficulty buttons match the width of the Quick Play button
    if (difficultyOptions && quickPlayBtn) {
      const quickPlayWidth = quickPlayBtn.offsetWidth || quickPlayBtn.clientWidth || 240;
      // Set each button to 1/3 of the quick play button width (with small margin for gap)
      const btns = difficultyOptions.querySelectorAll('button');
      btns.forEach(btn => {
        btn.style.width = `calc(${quickPlayWidth / 3 - 8}px)`;
        btn.style.minWidth = '80px';
        btn.style.maxWidth = '200px';
        btn.style.display = 'inline-block';
      });
      // Make the row flex
      difficultyOptions.style.display = 'flex';
      difficultyOptions.style.flexDirection = 'row';
      difficultyOptions.style.justifyContent = 'center';
      difficultyOptions.style.gap = '8px';
      difficultyOptions.style.margin = '10px 0';
    }
    if (difficultyOptions) {
      difficultyOptions.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') return;
        // Remove selected class from all buttons
        const buttons = difficultyOptions.querySelectorAll('button');
        buttons.forEach(btn => btn.classList.remove('selected'));
        // Add selected class to the clicked button
        e.target.classList.add('selected');
        const difficulty = e.target.getAttribute('data-difficulty');
        // Update global difficulty setting
        if (typeof AI_DIFFICULTY !== 'undefined') {
          AI_DIFFICULTY = difficulty;
        }
        // Update difficulty description text
        if (difficultyText && difficultyDescriptions[difficulty]) {
          difficultyText.textContent = difficultyDescriptions[difficulty];
        }
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
        // Emit event for difficulty change
        if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
          EventSystem.emit('difficultyChanged', difficulty);
        }
      });
    }
  },
  
  /**
   * Generate level selection buttons
   */
  generateLevelButtons() {
    const levelGrid = document.getElementById('levelGrid');
    if (!levelGrid) return;
    
    levelGrid.innerHTML = '';
    
    // Generate all 16 levels
    for (let i = 1; i <= 16; i++) {
      const level = window.LEVEL_CONFIGS[i];
      const levelButton = document.createElement('div');
      levelButton.className = 'level-button';
      levelButton.dataset.levelId = i;
      
      const isUnlocked = LevelManager.isLevelUnlocked(i);
      const isCompleted = LevelManager.isLevelCompleted(i);
      
      if (!isUnlocked) {
        levelButton.classList.add('locked');
      }
      if (isCompleted) {
        levelButton.classList.add('completed');
      }
      
      if (level) {
        // Level exists with configuration
        const bestScore = LevelManager.progression.levelScores[i] || 0;
        
        levelButton.innerHTML = `
          <div class="level-number">${i}</div>
          <div class="level-name">${level.name}</div>
          <div class="level-difficulty">${level.difficulty}</div>
          ${isCompleted ? `<div class="level-score">Best: ${bestScore}</div>` : ''}
          ${!isUnlocked ? '<div class="level-lock">??</div>' : ''}
          ${isCompleted ? '<div class="level-checkmark">?</div>' : ''}
        `;
        
        if (isUnlocked) {
          levelButton.addEventListener('click', () => this.selectLevel(level));
        }
      } else {
        // Level slot exists but no content yet
        levelButton.classList.add('coming-soon');
        levelButton.innerHTML = `
          <div class="level-number">${i}</div>
          <div class="level-name">Coming Soon</div>
          <div class="level-difficulty">??</div>
        `;
      }
      
      levelGrid.appendChild(levelButton);
    }
  },
  
  /**
   * Select a level and show its details
   */
  selectLevel(level) {
    // Remove previous selection
    document.querySelectorAll('.level-button.selected').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    // Add selection to clicked button
    const buttonElement = document.querySelector(`[data-level-id="${level.id}"]`);
    if (buttonElement) {
      buttonElement.classList.add('selected');
    }
    
    // Update level info panel
    this.updateLevelInfo(level);
    
    // Enable play button
    const playButton = document.getElementById('playLevelBtn');
    if (playButton) {
      playButton.disabled = false;
      playButton.onclick = () => this.startLevel(level.id);
    }
  },
  
  /**
   * Update the level information panel
   */
  updateLevelInfo(level) {
    const titleElement = document.getElementById('levelTitle');
    const descriptionElement = document.getElementById('levelDescription');
    const objectiveElement = document.getElementById('levelObjective');
    const instructionsElement = document.getElementById('levelInstructions');
    const progressElement = document.getElementById('levelProgress');
    
    if (titleElement) {
      titleElement.textContent = `${level.name} ${level.difficulty}`;
    }
    
    if (descriptionElement) {
      descriptionElement.textContent = level.description;
    }
    
    if (objectiveElement && level.objective) {
      const objectiveType = level.objective.type;
      const objectiveTarget = level.objective.target;
      
      // Find the objective description from the enum
      let objectiveDescription = '';
      if (window.ObjectiveType) {
        const objectiveEnum = Object.values(window.ObjectiveType).find(obj => obj.value === objectiveType);
        if (objectiveEnum) {
          objectiveDescription = objectiveEnum.description;
        }
      }
      
      // Build the objective text
      let objectiveText;
      if (objectiveType === 'survive') {
        // Simplify SURVIVE objective to avoid redundancy
        objectiveText = 'Be the last snake standing!';
      } else {
        objectiveText = objectiveDescription;
        if (objectiveTarget !== null && objectiveTarget !== undefined) {
          // Format the target based on objective type
          if (objectiveType === 'time_survive') {
            const targetSeconds = Math.floor(objectiveTarget / 1000);
            objectiveText += ` (Target: ${targetSeconds} seconds)`;
          } else if (objectiveType === 'score') {
            objectiveText += ` (Target: ${objectiveTarget} points)`;
          } else if (objectiveType === 'eat_food') {
            objectiveText += ` (Target: ${objectiveTarget} food items)`;
          } else {
            objectiveText += ` (Target: ${objectiveTarget})`;
          }
        }
      }
      
      objectiveElement.innerHTML = `<strong>Objective:</strong> ${objectiveText}`;
    }
    
    if (instructionsElement) {
      instructionsElement.innerHTML = `<strong>How to Play:</strong> ${level.instructions}`;
    }
    
    if (progressElement) {
      const isCompleted = LevelManager.isLevelCompleted(level.id);
      const bestScore = LevelManager.progression.levelScores[level.id] || 0;
      
      let progressText = '';
      if (isCompleted) {
        progressText = `<span class="completed-text">? COMPLETED</span><br>Best Score: ${bestScore}`;
      } else {
        progressText = '<span class="not-completed-text">Not completed yet</span>';
      }
      
      progressElement.innerHTML = progressText;
    }
  },
  
  /**
   * Start the selected level
   */
  startLevel(levelId) {
    console.log(`Starting level ${levelId}`);

    // Set the current level config globally
    window.CURRENT_LEVEL_CONFIG = window.LEVEL_CONFIGS[levelId];

    // Start the level through LevelManager
    if (LevelManager.startLevel(levelId)) {
      // Hide level menu and show game
      this.hideLevelMenu();      
      // Initialize the game with level settings
        if (typeof GameManager !== 'undefined' && GameManager.initLevel) {
            console.log(`Calling GameManager.initLevel with levelId: ${levelId}`);
            GameManager.initLevel(window.LEVEL_CONFIGS[levelId]);
        } else {
            console.error('GameManager is undefined or GameManager.initLevel is false');
        }
    }
  },
  
  /**
   * Show the level selection menu
   */
  showLevelMenu() {
    const levelMenu = document.getElementById('levelMenu');
    const startMenu = document.getElementById('startMenu');
    
    if (levelMenu) {
      levelMenu.style.display = 'block';
      this.generateLevelButtons(); // Refresh button states
    }
    
    if (startMenu) {
      startMenu.style.display = 'none';
    }
    // Restore focus to the game canvas or window to ensure keyboard controls work
    if (typeof game !== 'undefined' && game && typeof game.focus === 'function') {
      game.focus();
    } else if (typeof window !== 'undefined' && window.focus) {
      window.focus();
    }
  },
  
  /**
   * Hide the level selection menu
   */
  hideLevelMenu() {
    const levelMenu = document.getElementById('levelMenu');
    
    if (levelMenu) {
      levelMenu.style.display = 'none';
    }
  },
  
  /**
   * Return to main menu
   */
  returnToMainMenu() {
    this.hideLevelMenu();
    
    const startMenu = document.getElementById('startMenu');
    if (startMenu) {
      startMenu.style.display = 'block';
    }
  },
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.id === 'backToMainBtn') {
        this.returnToMainMenu();
      }
    });
    
    // Listen for level completion events
    if (typeof EventSystem !== 'undefined') {
      EventSystem.on('gameOver', (data) => {
        if (LevelManager.currentLevel) {
          LevelManager.onLevelComplete(data);
        }
      });
    }
  },

  /**
   * Setup Quick Play button functionality
   */
  setupQuickPlayButton() {
    const quickPlayBtn = document.getElementById('quickPlayBtn');
    if (quickPlayBtn) {
      quickPlayBtn.addEventListener('click', () => {
        console.log('Quick Play button clicked from level menu');
        // Hide level menu and start quick play using level 17 config
        this.hideLevelMenu();
        if (typeof GameManager !== 'undefined' && GameManager.initLevel && typeof LevelManager !== 'undefined') {
          // Get selected difficulty from the difficultyOptionsLevel buttons
          const difficultyOptions = document.getElementById('difficultyOptionsLevel');
          let selectedDifficulty = 'medium'; // default fallback
          if (difficultyOptions) {
            const selectedBtn = difficultyOptions.querySelector('button.selected');
            if (selectedBtn) {
              selectedDifficulty = selectedBtn.getAttribute('data-difficulty') || 'medium';
            }
          }
          // Clone the config to avoid mutating the original
          const quickPlayConfig = JSON.parse(JSON.stringify(window.LEVEL_CONFIGS[17]));
          quickPlayConfig.settings.aiDifficulty = selectedDifficulty;
          GameManager.initLevel(quickPlayConfig);
        } else {
          console.error('GameManager or LevelManager is undefined or GameManager.initLevel is false');
        }
      });
    }
  }
};