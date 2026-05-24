# Snake Battle Royale - Architecture Documentation

## Project Structure

The Snake Battle Royale game follows a modular architecture with clear separation of concerns. This document outlines the architecture and how the components interact. All details below are kept in sync with the actual JavaScript source files, which are the source of truth.

## Core Modules

### 1. EventSystem

- Provides pub/sub functionality for communication between modules
- Allows modules to emit and subscribe to events, reducing direct dependencies
- Located in `js/eventSystem.js`
- **Key Events:**
  - `playerAteFood` - When player consumes food
  - `aiAteFood` - When AI snake consumes food
  - `playerCollision` - When player collides with obstacles/snakes
  - `aiCollision` - When AI snake collides with obstacles/snakes
  - `settingsChanged` - When game settings are modified
  - `settingsReset` - When settings are restored to defaults
  - `playerColorSelected` - When player selects a color
  - `difficultyChanged` - When AI difficulty level is modified
  - `wrapSettingChanged` - When wrap mode is toggled
  - `player180Turn` - When player performs a 180-degree turn
  - `playerDirectionChange` - When player changes direction

### 2. Utils (SnakeUtils)

- Contains shared utility functions used across multiple modules
- Eliminates code duplication and centralizes common operations
- Located in `js/utils.js`
- **Key Functions:**
  - `randomPosition()` - Generates random grid positions
  - `capitalizeFirstLetter()` - String utility
  - `pointInRect()` - Collision detection helper
  - `rectsOverlap()` - Rectangle overlap detection

### 3. ConfigManager

- Manages game configuration settings
- Provides validation and default values
- Centralizes configuration changes
- Located in `js/configManager.js`
- **Key Features:**
  - Settings validation with range checking
  - Default value restoration
  - Real-time settings application
  - Event emission for settings changes
  - AI difficulty level management

## Game Systems

### 1. GameManager

- Coordinates high-level game operations
- Manages game state transitions (start, end, restart)
- Initializes other subsystems
- Controls game lifecycle (initGame, returnToMainMenu)
- **Level System Integration**: Supports both quick play and level-based gameplay
- Located in `js/gameManager.js`
- **Key Methods:**
  - `init()` - Initialize the game manager and level system
  - `startGame()` - Start a new quick play game session
  - `initLevel()` - Initialize a level-based game with specific configuration
  - `initGame()` - Initialize game state and objects (supports both modes)
  - `returnToMainMenu()` - Return to main menu from any state
  - `returnToLevelSelection()` - Return to level selection from level play
  - `animationLoop()` - Handle smooth animations with requestAnimationFrame
  - `safeUpdateAiScores()` - Safe wrapper for updateAiScores with loading order protection
- **Enhanced Features:**
  - Script loading order protection with safe function calls
  - Retry mechanisms for functions not yet loaded
  - Graceful error handling and fallback implementations
  - **Dual Mode Support**: Handles both traditional quick play and structured level progression
  - **Context-Aware UI**: Shows appropriate navigation buttons based on game mode
  - **Settings Management**: Temporarily applies level settings, restores defaults on exit

### 2. FoodManager

- Handles all food-related functionality
- Creates, places, and manages food items
- Processes food consumption by snakes
- Supports per-level food type selection and effect overrides via LevelManager config
- Located in `js/foodManager.js`
- **Key Methods:**
  - `init()` - Alias for `initFoods()`
  - `initFoods()` - Create initial food placement (per-level food types supported)
  - `placeNewFood()` - Spawn new food after consumption
  - `createRemainsFoodFromSnake()` - Create food from dead snakes
  - `processPlayerEatsFood()` - Handle player food consumption
  - `processAiEatsFood()` - Handle AI food consumption

### 3. Renderer

- Handles all drawing operations
- Manages animations and visual effects
- Isolates drawing logic from game logic
- Located in `js/renderer.js`
- **Key Functions:**
  - `drawGameState()` - Main rendering function
  - `drawSnakeSegment()` - Draw individual snake segments with animation
  - `drawPlayerSnake()` - Render player snake with smooth animation and countdown support
  - `drawAiSnakes()` - Render all AI snakes with countdown display
  - `drawObstacles()` - Render game obstacles
  - `drawFoods()` - Render food items
  - `drawSnakePreview()` - Color selection preview
  - `calculateAnimationProgress()` - Enhanced timing calculations with compensation
  - `calculateSubPixelPositions()` - Sub-pixel positioning for ultra-smooth movement
  - `drawRemovedTails()` - Animate removed tail segments

### 4. AI - Advanced Difficulty System

- Manages AI snake behavior with sophisticated difficulty levels
- Contains adaptive pathfinding and strategic decision making logic
- Located in `js/ai.js`
- **Difficulty Levels:**
  - **Easy**: Slow reactions, basic pathfinding, minimal aggression
  - **Medium**: Balanced performance with moderate intelligence
  - **Hard**: Fast reactions, advanced strategies, aggressive behavior
- **Core AI Functions:**
  - `aiChooseDir()` - Enhanced AI decision making with difficulty-based behavior
  - `findPathToFood()` - Advanced pathfinding with accuracy variations
  - `findAggressiveMove()` - Strategic blocking and trapping behavior
  - `willCauseEncirclement()` - Self-collision prediction and avoidance
  - `isPositionSafe()` - Comprehensive safety checking
  - `calculateDistance()` - Wrapping-aware distance calculations
- **AI Behavior Features:**
  - **Reaction Time Scaling**: Variable delays based on difficulty (50ms-300ms)
  - **Pathfinding Accuracy**: Probabilistic optimal move selection (Easy: 0.1, Medium: 0.2, Hard: 1)
  - **Self-Avoidance Intelligence**: Lookahead depth varies by difficulty (2-8 steps)
  - **Aggressive Tactics**: Blocking and trapping attempts (10%-60% chance)
  - **Trap Detection**: Enhanced pattern recognition (3-10 depth analysis)
  - **Movement Efficiency**: Strategic planning effectiveness (Easy: 0.7, Medium: 0.85, Hard: 1)
  - **Loop Detection**: Sophisticated position history analysis
  - **Predictive Behavior**: Multi-step consequence evaluation

### 5. Collisions

- Detects and handles collisions between game objects
- Implements algorithms for collision detection
- Located in `js/collisions.js`
- **Advanced Features:**
  - High-speed collision detection with intelligent path checking
  - Bresenham's line algorithm for complete path tracing
  - Wrapping-aware collision detection with diagonal support
  - Self-collision, obstacle, and inter-snake collision detection
  - Event emission for collision types
  - Speed-adaptive collision activation (>2 moves/second)
  - Pixel-perfect accuracy eliminating "death at distance" issues
  - Debug logging system for troubleshooting

### 6. Controls

- Manages user input handling
- Implements game controls and input validation
- Located in `js/controls.js`
- **Advanced Features:**
  - 180-degree turn detection with key timing and event emission
  - Direction queue for smooth input
  - Key state tracking with timestamps
  - Settings menu management
  - Color selection handling
  - AI difficulty selection interface (now only on Select Level page, not main menu)
  - Emits `player180Turn` and `playerDirectionChange` events

### 7. LevelManager

- Manages the comprehensive 16-level progression system (plus Quick Play)
- Handles level unlocking, completion tracking, and score management
- Applies level-specific configurations and settings
- Uses localStorage for progression persistence
- TESTING_MODE flag unlocks all levels for development
- Located in `js/levelManager.js`
- **Key Features:**
  - **Level Progression**: Sequential unlocking system with completion tracking
  - **Score Management**: Best score tracking per level with localStorage persistence
  - **Configuration Application**: Dynamic game setting modifications per level
  - **Objective System**: Multiple objective types (score, survival, time, food collection)
  - **Testing Mode**: Development flag to unlock all levels for testing
- **Core Methods:**
  - `init()` - Initialize level manager and load progression
  - `startLevel(levelId)` - Start a specific level with its configuration
  - `completeLevel(levelId, score)` - Mark level as completed and update scores
  - `checkLevelObjective()` - Verify if current level objective is met
  - `applyLevelConfig(config)` - Apply level-specific game settings (sets global window properties)
  - `resetToDefaults()` - Restore default game settings and clear level globals
- **Level Configuration Structure:**
  ```javascript
  {
    id: number,
    name: string,
    description: string,
    type: string,
    difficulty: string, // Star rating (? to ?????)
    settings: {
      initialSnakeLength: number,
      numObstacles: number,
      numAISnakes: number,
      aiDifficulty: string,
      wrapEnabled: boolean,
      baseInterval: number,
      foodTypes: object,
      GRID_SIZE: number,
      CANVAS_SIZE: number
    },
    objective: {
      type: string, // 'score', 'survive', 'time_survive', 'eat_food'
      target: number,
      description: string
    },
    instructions: string
  }
  ```

### 8. LevelUI

- Manages the level selection interface and user experience
- Provides visual feedback for level progression and status
- Integrates Quick Play functionality within level selection
- Uses static HTML for the menu, only updates content and listeners
- Located in `js/levelUI.js`
- **Key Features:**
  - **4x4 Grid Layout**: Compact level selection in 16-button grid
  - **Visual Status Indicators**: Completion checkmarks, lock icons, best scores
  - **Main Menu Integration**: Uses same layout structure as starting menu
  - **Quick Play Integration**: Battle Royale mode accessible from level selection (level 17)
  - **Level Information Panel**: Detailed level descriptions and objectives
  - **AI Difficulty Selection**: Now located below Quick Play button on Select Level page only
- **Core Methods:**
  - `init()` - Initialize level UI system
  - `generateLevelButtons()` - Create 4x4 grid of level buttons
  - `selectLevel(level)` - Handle level selection and info display
  - `startLevel(levelId)` - Begin selected level
  - `setupQuickPlayButton()` - Configure Quick Play functionality (uses level 17 config)
  - `setupDifficultySelectionLevel()` - Configure AI difficulty selection for Select Level page
- **UI Components:**
  - **Level Grid**: 4x4 arrangement of compact level buttons
  - **Level Info Panel**: Right-side detailed level information
  - **Quick Play Section**: Integrated battle royale access (level 17)
  - **AI Difficulty Selection**: Below Quick Play button on Select Level page
  - **Action Buttons**: Play Level and Back to Main Menu

## Data Structures & State Management

### 1. Core Data Structures (gameObjects.js)

**Primary game state repository providing single source of truth**

- **Dependencies**: config.js constants (BASE_GAME_INTERVAL)
- **Note**: Many settings are also stored as global window properties for level-specific overrides.

#### Game Objects (Arrays)

- `playerSnake: Array<SegmentObject>` - Player snake body segments
  ```javascript
  // Segment structure: { x, y, prevX, prevY, isWrapping }
  ```
- `aiSnakes: Array<SnakeObject>` - AI snake collection
  ```javascript
  // Snake structure: { body, dir, grow, color, headColor, bodyColor, alive, speedBoostEnd, tempMoveRate, permanentMoveRate, moveAccumulator, score }
  ```
- `foods: Array<FoodObject>` - Active food items
  ```javascript
  // Food structure: { x, y, type, grow, speedInc, tempSpeedInc, noRespawn?, color? }
  ```
- `obstacles: Array<ObstacleObject>` - Static obstacles
  ```javascript
  // Obstacle structure: { x, y, width, height }
  ```
- `aiPositionHistories: Array<Array<PositionObject>>` - AI movement history for loop detection
- `removedTails: Array<TailObject>` - Animation data for removed tail segments
  ```javascript
  // Tail structure: { x, y, prevX, prevY, targetX, targetY, isWrapping, timestamp, animationDuration, color }
  ```

#### Game State (Primitives)

- `gameOver: boolean` - Overall game state
- `gameWinner: Object|null` - Winner information
  ```javascript
  // Winner structure: { type, color, colorName, index }
  ```
- `playerAlive: boolean` - Player life status
- `countdownActive: boolean` - Countdown phase flag
- `score: number` - Player score
- `moveCounter: number` - Total moves counter

#### Player State

- `playerColor: string|null` - Selected player color
- `playerHeadColor: string` - Player head color
- `playerBodyColor: string` - Player body color
- `playerDir: DirectionObject` - Current direction
  ```javascript
  // Direction structure: { x, y }
  ```
- `playerGrow: number` - Segments to grow
- `playerSpeedBoostEnd: number` - Speed boost expiration timestamp
- `playerPermanentMoveRate: number` - Permanent speed increase
- `playerTempMoveRate: number` - Temporary speed increase
- `playerMoveAccumulator: number` - Fractional movement accumulator

#### AI State Tracking (Enhanced)

- `aiLastDecisionTime: Array<number>` - Track last decision time for each AI
- `aiAggressionCooldown: Array<number>` - Track aggression cooldown for each AI
- `aiTrapHistory: Array<Array<string>>` - Track positions AI tried to create traps

#### Control State

- `directionQueue: Array<DirectionObject>` - Input direction buffer

#### Timing & Animation State

- `gameInterval: number|null` - Game loop interval ID
- `animationInterval: number|null` - Animation loop interval ID
- `lastUpdateTime: number` - Last animation frame timestamp
- `lastGameUpdateTime: number` - Last game update timestamp
- `animationProgress: number` - Current animation progress (0-1)
- `gameLoopStartTime: number` - Game loop timing reference
- `targetGameUpdateInterval: number` - Target update interval
- `actualGameUpdateInterval: number` - Measured update interval
- `timingCompensation: number` - Frame timing adjustment

#### Sub-pixel Animation State

- `playerSubPixelPosition: Object|null` - Enhanced player position data
- `aiSubPixelPositions: Array<Object>` - Enhanced AI position data

#### Game Settings State

- `baseInterval: number` - Current base game interval
- `useSameColor: boolean` - Head/body color mode
- `wrapEnabled: boolean` - Screen wrapping enabled (always reference via window.wrapEnabled)
- `gameSessionId: string` - Unique session identifier

### 2. Configuration Constants (config.js)

**Static configuration values and modifiable settings**

- **Dependencies**: None (base configuration layer)

#### Core Grid Settings (Constants)

- `GRID_SIZE: 25` - Pixel size of each grid cell
- `CANVAS_SIZE: 1000` - Canvas dimensions
- `TILE_COUNT: 40` - Grid cells per dimension (calculated)

#### Timing Configuration (Constants)

- `COUNTDOWN_SECONDS: 3` - Countdown duration
- `COUNTDOWN_INTERVAL: 1000` - Countdown timing
- `BASE_GAME_INTERVAL: 200` - Base game speed (5 moves/sec)
- `MIN_GAME_INTERVAL: 67` - Maximum game speed (15 moves/sec)
- `ANIMATION_FPS: 60` - Animation frame rate
- `ANIMATION_INTERVAL: 16.67` - Animation timing (calculated)
- `MAX_MOVES_PER_SECOND: 12` - Speed system cap

#### AI Difficulty Configuration (Object)

- `AI_DIFFICULTY: string` - Current difficulty level ('easy', 'medium', 'hard')
- `AI_DIFFICULTY_CONFIG: Object` - Comprehensive difficulty settings
  ```javascript
  {
    easy: {
      name: 'Easy',
      reactionDelay: 300,
      pathfindingAccuracy: 0.1,
      selfAvoidanceLookahead: 2,
      aggressiveness: 0.1,
      trapDetectionDepth: 3,
      movementEfficiency: 0.7
    },
    medium: {
      name: 'Medium',
      reactionDelay: 150,
      pathfindingAccuracy: 0.2,
      selfAvoidanceLookahead: 4,
      aggressiveness: 0.3,
      trapDetectionDepth: 5,
      movementEfficiency: 0.85
    },
    hard: {
      name: 'Hard',
      reactionDelay: 50,
      pathfindingAccuracy: 1,
      selfAvoidanceLookahead: 8,
      aggressiveness: 0.6,
      trapDetectionDepth: 10,
      movementEfficiency: 1
    }
  }
  ```

#### Modifiable Game Settings (Variables)

- `INITIAL_SNAKE_LENGTH: number` - Starting snake size (default: 3)
- `RUNTIME_TEMP_SPEED_BOOST_DURATION: number` - Boost duration (default: 3000ms)
- Removed: NUM_OBSTACLES and NUM_AI_SNAKES (now set by level config only)

#### Food Type Configuration (Object)

- `FOOD_TYPES: Object` - Food behavior definitions
  ```javascript
  {
    red: { color, grow: 2, speedInc: 0, tempSpeedInc: 0 },
    orange: { color, grow: 1, speedInc: 0.25, tempSpeedInc: 0 },
    yellow: { color, grow: 1, speedInc: 0, tempSpeedInc: 0.75 },
    remains: { color, grow: 3, speedInc: 0, tempSpeedInc: 0, noRespawn: true }
  }
  ```

#### Color Scheme Objects

- `AI_SNAKE_COLORS: Object` - AI snake color mappings
- `PLAYER_COLORS: Object` - Player color options
- `ORIGINAL_AI_COLORS: Object` - Backup AI colors
- `ORIGINAL_PLAYER_COLORS: Object` - Backup player colors
- `THEME_COLORS: Object` - UI theme colors

#### Input Configuration (Object)

- `keyDirMap: Object` - Keyboard input mappings
  ```javascript
  {
    ArrowUp: { x: 0, y: -1 },
    KeyW: { x: 0, y: -1 },
    // ... other directions
  }
  ```

#### Feature Flags (Constants)

- Removed: USE_PARTICLES and MAX_PARTICLES (particle effects are not available)

### 3. Event System Data (eventSystem.js)

**Centralized event management system**

- **Dependencies**: None (core system)

#### Event Storage

- `EventSystem.events: Object` - Event subscriber storage
  ```javascript
  // Structure: { eventName: [callback1, callback2, ...] }
  ```

### 4. Configuration Manager Data (configManager.js)

**Settings management and validation**

- **Dependencies**: config.js constants, EventSystem

#### Default Settings Object

- `ConfigManager.defaults: Object` - Reference default values
  ```javascript
  {
    INITIAL_SNAKE_LENGTH: 3,
    RED_GROW: 2,
    ORANGE_SPEED: 0.25,
    YELLOW_BOOST: 0.75,
    YELLOW_DURATION: 3000,
    AI_DIFFICULTY: 'medium'
  }
  ```

### 5. Utility Functions Data (utils.js)

**Shared utility object with helper functions**

- **Dependencies**: config.js (TILE_COUNT)

#### Utility Object

- `SnakeUtils: Object` - Collection of utility functions
  ```javascript
  {
    randomPosition(): { x, y },
    capitalizeFirstLetter(str): string,
    pointInRect(point, rect): boolean,
    rectsOverlap(rect1, rect2): boolean
  }
  ```

### 6. Control System Data (controls.js)

**Input handling and state tracking**

- **Dependencies**: config.js (keyDirMap), gameObjects.js, EventSystem

#### Key State Tracking

- `keyStates: Object` - Current key press states
  ```javascript
  // Structure: { keyCode: boolean }
  ```
- `keyPressTimes: Object` - Key press timestamps
  ```javascript
  // Structure: { keyCode: timestamp }
  ```

### 7. Collision System Data (collisions.js)

**Collision detection algorithms and data structures**

- **Dependencies**: config.js, gameObjects.js, EventSystem

#### Path Calculation Data

- Dynamic arrays for Bresenham's line algorithm
- Wrapped path point collections for toroidal collision detection
- Collision state tracking for high-speed movement

### 8. AI System Data (ai.js)

**AI behavior and pathfinding data structures**

- **Dependencies**: config.js, gameObjects.js, collisions.js

#### AI State Data

- Position history arrays for loop detection
- Pathfinding state information
- Decision-making data structures
- Difficulty-based behavior modifiers

### 9. Renderer Data (renderer.js)

**Visual rendering and animation data**

- **Dependencies**: config.js, gameObjects.js

#### Animation Data

- Sub-pixel position calculations
- Animation timing data
- Visual effect state information

### 10. Food Manager Data (foodManager.js)

**Food system management**

- **Dependencies**: config.js, gameObjects.js, utils.js

#### Food Management State

- Food placement algorithms (per-level food types supported)
- Consumption tracking
- Respawn management data

### 11. Game Manager Data (gameManager.js)

**High-level game coordination**

- **Dependencies**: Most other modules

#### Management State

- Initialization state tracking
- Lifecycle management data
- Cross-module coordination state

### 12. Level Manager Data (levelManager.js)

**Level progression and management data**

- **Dependencies**: config.js, gameObjects.js, EventSystem

#### Level Progression Data

- `progression: Object` - Persistent progression tracking (localStorage)
  ```javascript
  {
    unlockedLevels: [1, 2, ...], // Array of unlocked level IDs
    completedLevels: [1, ...],   // Array of completed level IDs
    levelScores: { 1: 25, ... }  // Best scores per level
  }
  ```
- `currentLevel: number|null` - Currently active level ID
- `TESTING_MODE: boolean` - Development flag for unlocking all levels

#### Level Configuration Constants (LevelManager.LEVEL_CONFIGS)

- **17 Levels** with varied challenges and objectives:
  - Levels 1-16: Structured progression
  - Level 17: "Quick Play (Default)" for instant classic battle royale

#### UI Data Structures (LevelUI)

- **Grid Layout**: 4x4 CSS Grid for level button arrangement
- **Level Button States**: locked, unlocked, completed, selected, coming-soon
- **Level Information Display**: Dynamic content based on selection

### 13. IndexedDB Data (for persistence)

**Persistent storage for high scores and progression**

- **Dependencies**: None (browser-based storage)

#### Database Structure

- **Object Store**: `gameData`
  - **Key Path**: `id`
  - **Index**: `idx` for score sorting

### 14. Fallback/Safety Wrappers (gameState.js)

- Provides fallback implementations for collision and state functions if modules are not loaded
- Ensures game does not crash due to script loading order
- Used for: occupiesPosition, snakeOverlapsObstacle, checkPlayerCollisions, checkAiCollisions, aiChooseDir, etc.

## Event Communication

Modules communicate through events to reduce tight coupling. Key event patterns:

- **Food Consumption**: `playerAteFood`, `aiAteFood` with food type data
- **Collisions**: `playerCollision`, `aiCollision` with collision type
- **Settings**: `settingsChanged`, `settingsReset` for configuration updates
- **UI Events**: `playerColorSelected` for interface interactions
- **Difficulty Events**: `difficultyChanged` for AI behavior updates
- **Level Events**: `levelStarted`, `levelCompleted`, `levelFailed`, `progressionUpdated`
- **Input Events**: `player180Turn`, `playerDirectionChange`

## Best Practices

### Code Organization

1. **Single Responsibility Principle**: Each module has a specific responsibility
2. **Dependency Inversion**: High-level modules don't depend on low-level modules
3. **Event-Driven Communication**: Loose coupling through events
4. **Centralized Configuration**: Game settings are managed centrally
5. **Clear Dependency Chain**: Scripts are loaded in a specific order

### Performance Considerations

1. **Efficient Collision Detection**: Optimized algorithms for high-speed gameplay with intelligent path checking
2. **Animation Optimization**: 60 FPS rendering with minimal overhead and sub-pixel precision
3. **Memory Management**: Proper cleanup of intervals and event listeners
4. **State Management**: Minimal redundant state calculations
5. **Speed-Adaptive Systems**: Collision detection and rendering automatically adapt to movement speed
6. **Loading Order Protection**: Safe function calls prevent unnecessary retries and errors

### Code Quality Standards

1. **Consistent Naming**: camelCase for functions and variables
2. **Comprehensive Documentation**: JSDoc-style comments for all major functions
3. **Error Handling**: Try-catch blocks in critical sections
4. **Validation**: Input validation and range checking
5. **Modular Design**: Clear separation between rendering, logic, and state

## Level Selection UI Architecture

### Visual Design System

The level selection interface follows a unified design language that mirrors the main menu structure while optimizing for the multi-level experience:

#### Layout Structure

- **Main Menu Consistency**: Uses identical frame, styling, and layout system as starting menu
- **Two-Column Design**: Left column for level selection, right column for information
- **Responsive Grid**: 4x4 CSS Grid layout accommodating 16 levels in compact format
- **Visual Hierarchy**: Clear separation between level selection, information, and actions

#### Level Button Design

- **Compact Format**: 80px height buttons optimized for 4x4 grid
- **State Visualization**:
  - **Unlocked**: Full color with hover effects
  - **Locked**: Grayed out with lock icon (??)
  - **Completed**: Success styling with checkmark (?)
  - **Selected**: Highlighted border and background
  - **Coming Soon**: Placeholder styling for future levels
- **Information Density**: Level number, name, difficulty stars, and best score in compact layout

#### Level Information Panel

- **Dynamic Content**: Updates based on selected level
- **Structured Information**:
  - Level title with difficulty rating
  - Descriptive text explaining the challenge
  - Objective section with clear goals
  - Instructions section with gameplay guidance
  - Progress tracking showing completion status and best scores
- **Visual Coding**: Color-coded sections for different information types

#### Quick Play Integration

- **Accessibility**: Battle Royale mode accessible without level progression (level 17)
- **Placement**: Positioned below level grid in left column
- **Context**: Clear description differentiating from level-based play
- **Functionality**: Bypasses level system for immediate classic gameplay

### CSS Architecture for Level System

#### Grid Layout System

```css
.level-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 8px;
  max-width: 400px;
}
```

#### Level Button States

- **Base State**: Dark background with lime border
- **Hover State**: Glowing effect with transform animation
- **Selected State**: Enhanced glow and border color
- **Completed State**: Green-tinted styling
- **Locked State**: Reduced opacity and disabled cursor

#### Information Panel Styling

- **Sectioned Layout**: Distinct areas for different information types
- **Color Coding**: Objective (green), Instructions (blue), Progress (yellow)
- **Typography**: Consistent font sizing and spacing hierarchy
- **Responsive Design**: Adapts to content length variations

### Navigation Flow Architecture

#### Menu Navigation System

1. **Main Menu**: Starting point with "Let's GO!" button leading to level selection
2. **Level Selection**: 16-level grid with Quick Play option (level 17)
3. **Level Play**: Individual level with "Return to Levels" button
4. **Quick Play**: Traditional battle royale with "Main Menu" button

#### State Management

- **Menu State Tracking**: System knows current menu context
- **Button Visibility**: Context-appropriate buttons show/hide automatically
- **Settings Persistence**: Level settings applied temporarily, restored on exit
- **Progress Tracking**: Real-time updates to completion status

#### User Flow Optimization

- **Minimal Clicks**: Direct access to desired gameplay mode
- **Clear Exit Points**: Obvious return paths from any game state
- **Progress Preservation**: Completion status visible throughout experience
- **Quick Access**: Immediate battle royale access via Quick Play

### Integration with Existing Architecture

#### GameManager Integration

- **State Differentiation**: Distinguishes between level play and quick play
- **Configuration Management**: Applies level-specific settings temporarily (via global window properties)
- **UI Coordination**: Shows appropriate buttons based on play mode
- **Reset Functionality**: Properly restores defaults when exiting levels

#### Event System Integration

- **Level Events**: New event types for level start, completion, and progression
- **UI Events**: Level selection and navigation events
- **State Synchronization**: UI updates based on progression events
- **Error Handling**: Graceful handling of level system failures

#### Renderer Integration

- **Level-Specific Rendering**: Adapts to level configuration (obstacles, wrapping)
- **UI Element Management**: Shows/hides level-specific UI components
- **Animation Consistency**: Maintains smooth animations across all play modes
- **Performance Optimization**: No rendering overhead for level system

This architectural approach ensures the level system integrates seamlessly with existing code while providing a rich, progressive gameplay experience that scales from beginner to expert challenges.

### Data Flow Dependencies

```
config.js (base constants)
    ?
gameObjects.js (state repository)
    ?
utils.js, eventSystem.js (core utilities)
    ?
configManager.js (settings management)
    ?
levelManager.js, levelUI.js (level system)
    ?
collisions.js, foodManager.js, ai.js, renderer.js (game systems)
    ?
controls.js (input handling)
    ?
gameManager.js (coordination)
    ?
main.js (initialization)
```

### Level System Data Flow

The level system introduces additional data flow patterns for progression and configuration management:

#### Level Selection Flow

```
User Interface ? LevelUI ? LevelManager ? GameManager ? Game Systems
```

#### Configuration Application Flow

```
Level Config ? LevelManager.applyLevelConfig() ? Global Settings Override (window properties) ? Game Initialization
```

#### Progression Tracking Flow

```
Game Events ? LevelManager.checkLevelObjective() ? Progression Update ? localStorage ? UI Refresh
```

#### Navigation Flow

```
Menu Selection ? UI State Change ? GameManager Context Switch ? Appropriate Game Mode
```

## Win Condition System

The win condition for each level is determined by the `objective` property in the level configuration (see `levelConfigs.js`).

- **Objective Types:**
  - `score`: Win by reaching a target score.
  - `survive`: Win by being the last snake alive.
  - `eat_food`: Win by eating a specific number of food items.
  - `time_survive`: Win by surviving for a set amount of time (milliseconds).
- **How it works:**
  - At the start of each level, the objective type and target are set from the level config.
  - The game checks for the objective in real time (not just last-alive).
  - When the objective is met, the win message is displayed and the level is marked as complete.

**Relevant Files:**

- `levelConfigs.js`: Level objectives are defined here (including Quick Play as level 17).
- `gameState.js`: The main game loop checks for the current objective and triggers the win logic.
- `levelManager.js`: Handles checking and completing objectives, and progression.

**Example Level Config:**

```js
objective: {
  type: 'score',
  target: 10
}
```

**Note:**

- The old hardcoded "last alive" win condition is now only used for levels with `objective.type: 'survive'`.
- All other objective types are handled automatically.
- Level 17 (Quick Play) is always available for instant play.