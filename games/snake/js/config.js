/*
  Possible color choices you can apply:
  Named CSS colors:
  - 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'lime', 'cyan', 'magenta',
    'brown', 'black', 'white', 'gray', 'teal', 'lightblue', 'darkgreen', 'lightgreen',
    'gold', 'silver', 'navy', 'teal', 'maroon', 'olive', 'coral', 'crimson'
  Hex codes:
  - '#FF0000' (red)
  - '#FFA500' (orange)
  - '#FFFF00' (yellow)
  - '#00FF00' (lime/green)
  - '#0000FF' (blue)
  - '#800080' (purple)
  - '#FFC0CB' (pink)
  - '#003366' (dark blue)
  - '#3399FF' (light blue)
  - '#AA00FF' (bright purple)
  - '#FF66CC' (bright pink)
  - '#660099' (dark purple)
  RGB or RGBA values are also accepted, e.g.:
  - 'rgb(255, 0, 0)'
  - 'rgba(255, 0, 0, 0.5)'
  Feel free to experiment and use any valid CSS color string!
*/

// --- CONFIGURABLE SETTINGS ---
// Countdown settings
const COUNTDOWN_SECONDS = 3;
const COUNTDOWN_INTERVAL = 1000;

// Initial snake length - can be modified in settings
let INITIAL_SNAKE_LENGTH = 3;

// Number of obstacles - can be modified in settings
let NUM_OBSTACLES = 0;

// AI Difficulty Settings
let AI_DIFFICULTY = 'medium'; // Default difficulty

const AI_DIFFICULTY_CONFIG = {
  easy: {
    name: 'Easy',
    reactionDelay: 300,          // Higher delay = slower reaction
    pathfindingAccuracy: 0.7,    // 70% chance to make optimal move toward food
    selfAvoidanceLookahead: 1,   // Minimal lookahead to avoid getting stuck
    aggressiveness: 0.05,        // 5% chance to be aggressive
    trapDetectionDepth: 3,       // Simple trap detection
    movementEfficiency: 0.8,     // 80% efficiency in movement planning
    foodPriority: 0.9,           // 90% priority on food-seeking
    riskTolerance: 0.3           // 30% tolerance for risky moves toward food
  },
  medium: {
    name: 'Medium',
    reactionDelay: 150,          // Moderate reaction time
    pathfindingAccuracy: 0.85,   // 85% chance to make optimal move
    selfAvoidanceLookahead: 3,   // Moderate lookahead
    aggressiveness: 0.2,         // 20% chance to be aggressive
    trapDetectionDepth: 5,       // Better trap detection
    movementEfficiency: 0.9,     // 90% efficiency
    foodPriority: 0.95,          // 95% priority on food-seeking
    riskTolerance: 0.2           // 20% tolerance for risky moves
  },
  hard: {
    name: 'Hard',
    reactionDelay: 50,           // Fast reaction time
    pathfindingAccuracy: 0.95,   // 95% chance to make optimal move
    selfAvoidanceLookahead: 6,   // Deep lookahead for strategic play
    aggressiveness: 0.4,         // 40% chance to be aggressive
    trapDetectionDepth: 10,      // Advanced trap detection
    movementEfficiency: 0.98,    // 98% efficiency
    foodPriority: 0.98,          // 98% priority on food-seeking
    riskTolerance: 0.1           // 10% tolerance for risky moves (very careful)
  }
};

// Food types configuration
let FOOD_TYPES = {
  red:     { color: 'red',    grow: 2, speedInc: 0,   tempSpeedInc: 0 },
  orange:  { color: 'orange', grow: 1, speedInc: 0.25, tempSpeedInc: 0 },
  yellow:  { color: 'yellow', grow: 1, speedInc: 0,   tempSpeedInc: 0.75 },
  remains: { color: 'gray',   grow: 3, speedInc: 0,   tempSpeedInc: 0, noRespawn: true }
};

// AI Snake colors - Now making head and body the same color
const AI_SNAKE_COLORS = {
  red:       { head: '#CC0000', body: '#CC0000' },
  white:     { head: 'white', body: 'white' },
  lightblue: { head: '#3399FF', body: '#3399FF' },
  purple:    { head: '#AA00FF', body: '#AA00FF' },
  pink:      { head: '#FF66CC', body: '#FF66CC' },
};

// Available colors for player - Now making head and body the same color
const PLAYER_COLORS = {
  lime:      { head: 'lime', body: 'lime' },
  lightblue: { head: '#3399FF', body: '#3399FF' },
  purple:    { head: '#AA00FF', body: '#AA00FF' },
  pink:      { head: '#FF66CC', body: '#FF66CC' },
};

// Backup of original colors with different head/body
const ORIGINAL_AI_COLORS = {
  red:       { head: 'red',      body: '#990000' },
  white:     { head: 'white',    body: '#EEEEEE' },
  lightblue: { head: '#3399FF',  body: '#0077FF' },
  purple:    { head: '#AA00FF',  body: '#660099' },
  pink:      { head: '#FF66CC',  body: '#CC3399' },
};

const ORIGINAL_PLAYER_COLORS = {
  lime:      { head: 'lime', body: 'lime' },
  lightblue: { head: '#3399FF', body: '#0077FF' },
  purple:    { head: '#AA00FF', body: '#660099' },
  pink:      { head: '#FF66CC', body: '#CC3399' }
};

// Speed settings: 5 moves/sec = 200ms interval, 15 moves/sec = ~67ms interval
const BASE_GAME_INTERVAL = 200; // Changed from 120ms to 200ms (5 moves/sec)
const MIN_GAME_INTERVAL = 67;   // Changed from 40ms to 67ms (15 moves/sec)
const TEMP_SPEED_BOOST_DURATION = 3000; // milliseconds
let RUNTIME_TEMP_SPEED_BOOST_DURATION = TEMP_SPEED_BOOST_DURATION;

// Animation settings
const ANIMATION_FPS = 60;       // Frames per second for smooth animation
const ANIMATION_INTERVAL = 1000 / ANIMATION_FPS;
let SEGMENT_SIZE = 24; // Default, will be set dynamically per level

// Speed cap
const MAX_MOVES_PER_SECOND = 12;

// Input settings
const QUICK_TURN_WINDOW_MS = 150;
const keyDirMap = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyW: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 }
};

// Theme colors
const THEME_COLORS = {
  baseGreen: 'lime',
  obstacleGreen: '#00cc00'
};

// Settings defaults
const DEFAULTS = {
  INITIAL_SNAKE_LENGTH: 3,
  RED_GROW: 2,
  ORANGE_SPEED: 0.25,
  YELLOW_BOOST: 0.75,
  YELLOW_DURATION: TEMP_SPEED_BOOST_DURATION,
  AI_DIFFICULTY: 'medium'
};

// Enemy AI loop detection
const MAX_HISTORY = 20;
