/**
 * Game Objects - Defines the core game objects and state variables
 * Provides a single source of truth for game state
 *
 * NOTE: All modules should reference wrapEnabled via window.wrapEnabled for consistency.
 */

// Game objects - initialized empty
let playerSnake = [];
let aiSnakes = [];
let foods = [];
let obstacles = [];
let aiPositionHistories = [];
let removedTails = []; // Track removed tail segments for animation

// Game state
let gameOver = false;
let gameWinner = null;
let playerAlive = true;
let countdownActive = false;
let score = 0;
let moveCounter = 0;

// Player settings
let playerColor = null;
let playerHeadColor = 'lime';
let playerBodyColor = 'lime';
let playerDir = { x: 0, y: 1 }; // Default direction down
let playerGrow = 0;
let playerSpeedBoostEnd = 0;
let playerPermanentMoveRate = 0;
let playerTempMoveRate = 0;
let playerMoveAccumulator = 0;

// Direction queue for smooth controls
let directionQueue = [];

// Game intervals
let gameInterval = null;
let animationInterval = null;

// Enhanced timing variables for smooth animation
let lastUpdateTime = 0;
let lastGameUpdateTime = 0;
let animationProgress = 1;
let gameLoopStartTime = 0;
let targetGameUpdateInterval = BASE_GAME_INTERVAL;
let actualGameUpdateInterval = BASE_GAME_INTERVAL;
let timingCompensation = 0;

// Sub-pixel position tracking for ultra-smooth animation
let playerSubPixelPosition = null;
let aiSubPixelPositions = [];

// AI state tracking for difficulty-based behavior
let aiLastDecisionTime = []; // Track last decision time for each AI
let aiAggressionCooldown = []; // Track aggression cooldown for each AI
let aiTrapHistory = []; // Track positions AI tried to create traps

// Game settings
let baseInterval = BASE_GAME_INTERVAL;
let useSameColor = true; // Default to same color for head and body
// Always reference wrapEnabled via window.wrapEnabled for consistency
Object.defineProperty(window, 'wrapEnabled', {
  value: true,
  writable: true,
  configurable: true
});

// Random ID for this game session
const gameSessionId = Math.random().toString(36).substring(2, 15);