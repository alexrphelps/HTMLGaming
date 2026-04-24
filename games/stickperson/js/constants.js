// Constants for the Stickperson Game
// This file contains all configurable game settings for easy modification

const GAME_CONSTANTS = {
  // === CANVAS & DISPLAY ===
    CANVAS: {
      WIDTH: 1400,
      HEIGHT: 800,
      GROUND_Y: 650, // Ground level position from top (adjusted for larger height)
    },

  // === COLORS ===
  COLORS: {
    BACKGROUND: 'black',
    FLOOR: 'lime',
    STICKMAN: 'white',
  },

  // === DRAWING SETTINGS ===
  DRAWING: {
    LINE_WIDTH: 2,
    FLOOR_LINE_WIDTH: 2,
  },

  // === PLAYER PHYSICS ===
  PLAYER: {
    // Position & Size
    INITIAL_X: 100,
    WIDTH: 50,
    NORMAL_HEIGHT: 100,
    CROUCH_HEIGHT: 60,
    CENTER_OFFSET: 25, // Half of player width for centering

    // Movement
    SPEED: 5,
    CROUCH_SPEED_MULTIPLIER: 0.5, // Movement speed when crouching
    JUMP_FORCE: -10, // Negative for upward force
    DOUBLE_JUMP_FORCE: -8, // Slightly weaker second jump
    GRAVITY: 0.2,

    // Momentum Physics
    AIR_RESISTANCE: 0.98, // How much horizontal momentum is retained in air (0.98 = 2% loss per frame)
    GROUND_FRICTION: 0.85, // How quickly momentum stops on ground (0.85 = 15% loss per frame)
    MAX_HORIZONTAL_VELOCITY: 8, // Maximum horizontal speed from momentum

    // Animation Timing
    WALK_ANIMATION_SPEED: 0.2,
    CROUCH_ANIMATION_SPEED: 0.1,
    CROUCH_TRANSITION_SPEED: 0.2, // Smoothness of crouch transition
    AIR_TIME_INCREMENT: 0.016, // Roughly 16ms per frame

    // Double Jump System
    DOUBLE_JUMP_ENABLED: true, // Enable/disable double jump feature
    DOUBLE_JUMP_FORCE_MULTIPLIER: 0.8, // Double jump is 80% of normal jump force
  },

  // === STICKMAN BODY PROPORTIONS ===
  BODY: {
    // Head
    HEAD_RADIUS: 10,
    CROUCH_HEAD_OFFSET: 5, // How much to lower head when crouching

    // Torso
    TORSO_LENGTH_NORMAL: 35,
    TORSO_LENGTH_CROUCH: 25,
    NECK_TO_SHOULDER: 8,
    SHOULDER_OFFSET: 10, // Distance from center to shoulders
    HIP_OFFSET: 8, // Distance from center to hip joints (leg gap)

    // Arms
    UPPER_ARM_LENGTH: 20,
    LOWER_ARM_LENGTH: 15,

    // Legs
    UPPER_LEG_LENGTH_NORMAL: 25,
    LOWER_LEG_LENGTH_NORMAL: 25,
    UPPER_LEG_LENGTH_CROUCH: 18,
    LOWER_LEG_LENGTH_CROUCH: 18,
  },

  // === ANIMATION SETTINGS ===
  ANIMATION: {
    // Walking
    WALK_SWING_AMPLITUDE: 0.4,
    CROUCH_WALK_AMPLITUDE: 0.3,

    // Jumping & Airborne
    AIR_FLAIL_SPEED: 0.8, // Speed of flailing animation
    AIR_FLAIL_INTENSITY: 0.12, // Intensity of flailing motion
    AIR_MOMENTUM_MULTIPLIER: 0.3,
    AIR_TILT_BASE: 1.2, // Base tilt amount when moving in air - EXTREME DIVING!
    AIR_TILT_OSCILLATION: 0.2, // Oscillation in air for dynamic diving
    AIR_TILT_MAX: 1.5, // Maximum tilt angle (radians) - VERY EXTREME!
    AIR_TILT_MIN_DIVE: 0.8, // Minimum dive angle - NEVER VERTICAL!

    // Jump Randomness - Make each jump unique!
    JUMP_ARM_RANDOM_VARIATION: 0.8, // Random arm angle variation (±0.8 radians)
    JUMP_LEG_RANDOM_VARIATION: 0.6, // Random leg angle variation (±0.6 radians)
    JUMP_TILT_RANDOM_VARIATION: 0.4, // Random body tilt variation (±0.4 radians)
    JUMP_MOMENTUM_RANDOM_VARIATION: 0.5, // Random momentum multiplier (±0.5)
    
    // Dynamic Leg Independence - Make legs completely different!
    JUMP_LEG_INDEPENDENCE: 1.2, // How different each leg can be (±1.2 radians)
    JUMP_LEG_KICK_VARIATION: 0.8, // Random kick styles for each leg
    JUMP_LEG_TIMING_OFFSET: 0.3, // Different timing for each leg animation

    // Arm Angles
    ARM_IDLE_ANGLE: 0.3, // Outward angle for idle arms
    ARM_IDLE_BEND: 0.1, // Slight downward bend for idle
    ARM_JUMP_RAISE: -Math.PI * 0.4, // How much to raise arms when jumping (negative = upward) - INCREASED!
    ARM_JUMP_MOMENTUM: 2.5, // Momentum flow factor for jumping arms - DRAMATICALLY INCREASED!
    ARM_JUMP_CROSSOVER: 1.8, // How much arms cross over to trailing side when jumping
    ARM_JUMP_BEND: -0.8, // Arm bend when jumping - INCREASED!
    ARM_CROUCH_ANGLE: 0.6, // Forward angle for crouching arms
    ARM_CROUCH_BEND: 0.4, // Bend for crouching arms

    // Leg Angles
    LEG_IDLE_ANGLE: 0.2, // Outward angle for idle legs
    LEG_JUMP_BEND: 1.0, // Basic leg bend when jumping - DRAMATICALLY INCREASED!
    LEG_JUMP_MOMENTUM: 2.0, // Momentum effect for jumping legs - DRAMATICALLY INCREASED!
    LEG_JUMP_BACK_BEND: -1.2, // How much to bend legs back when jumping - DRAMATICALLY INCREASED!
    LEG_CROUCH_FORWARD_BEND: 0.2, // Slight forward bend for upper leg when crouching
    LEG_CROUCH_KNEE_BEND: 0.8, // Strong knee bend for crouching to keep feet in place
    LEG_CROUCH_SPREAD: 0.1, // Minimal foot spread when crouching
    LEG_CROUCH_DIRECTIONAL_BEND: 0.5, // How much legs bend toward movement direction when crouching
  },

  // === INPUT KEYS ===
  CONTROLS: {
    LEFT: ['ArrowLeft', 'a', 'A'],
    RIGHT: ['ArrowRight', 'd', 'D'],
    JUMP: [' ', 'w', 'W'], // Space, W
    CROUCH: ['ArrowDown', 's', 'S'],
  },

  // === PHYSICS LIMITS ===
  LIMITS: {
    // Screen boundaries
    MIN_X: 0,
    // MAX_X will be calculated as CANVAS.WIDTH - PLAYER.WIDTH
    
    // Air tilt limits
    MAX_AIR_TILT: 0.3, // ~17 degrees
    MIN_AIR_TILT: -0.3,
    
    // Animation damping
    AIR_TILT_DAMPING: 0.95, // How quickly tilt dampens when not moving
  },

  // === PERFORMANCE ===
  PERFORMANCE: {
    TARGET_FPS: 60,
    FRAME_TIME: 1000 / 60, // ~16.67ms per frame
  },

  // === COLLECTIBLES & SCORING ===
  COLLECTIBLES: {
    // Collectible Properties
    RADIUS: 10, // Size of collectible circle - SAME AS HEAD RADIUS!
    COLOR: 'red', // Collectible color
    OUTLINE_COLOR: 'darkred', // Outline color for better visibility
    OUTLINE_WIDTH: 2,
    
    // Spawn Settings
    MIN_X: 50, // Minimum distance from left edge
    MAX_X_OFFSET: 100, // Distance from right edge
    MIN_Y: 50, // Minimum height above ground
    MAX_Y_OFFSET: 200, // Maximum height above ground
    
    // Collection
    COLLECTION_DISTANCE: 40, // Very forgiving - any part of stickman can touch apple!
    SCORE_VALUE: 1, // Points per collectible
  },

  SCORE: {
    // Display Settings
    FONT_SIZE: 24,
    FONT_FAMILY: 'Arial, sans-serif',
    COLOR: 'white',
    POSITION_X: 20,
    POSITION_Y: 30,
    
    // Score Text
    PREFIX: 'Score: ',
    INITIAL_SCORE: 0,
  },

  // === INFINITE WORLD & CAMERA ===
  WORLD: {
    // Camera System
    CAMERA_FOLLOW_SPEED: 0.1, // How smoothly camera follows player (0-1)
    CAMERA_OFFSET_X: 400, // Player position from left edge of screen (default)
    CAMERA_OFFSET_X_LEFT: 1050, // Player position when moving left (75% of screen width)
    CAMERA_OFFSET_X_RIGHT: 300, // Player position when moving right (more to the left side)
    
    // Camera Directional Thresholds
    CAMERA_DIRECTION_THRESHOLD: 300, // Pixels to move before changing camera position
    CAMERA_TRANSITION_SPEED: 0.02, // Slower transition speed for smoother movement
    
    // World Generation
    CHUNK_SIZE: 1000, // Size of world chunks for procedural generation
    GENERATION_DISTANCE: 2000, // How far ahead to generate content
    CLEANUP_DISTANCE: 3000, // How far behind to clean up content
  },

  // === OBSTACLES ===
  OBSTACLES: {
    // Platform Obstacles (jumpable)
    PLATFORM_COLOR: 'lime', // Same color as floor
    PLATFORM_MIN_WIDTH: 80,
    PLATFORM_MAX_WIDTH: 200,
    PLATFORM_HEIGHT: 20,
    PLATFORM_MIN_HEIGHT: 100, // Above ground
    PLATFORM_MAX_HEIGHT: 300, // Above ground
    
    // Spawn Settings
    MIN_SPACING: 200, // Minimum distance between obstacles
    MAX_SPACING: 500, // Maximum distance between obstacles
    SPAWN_CHANCE: 0.7, // Probability of spawning obstacle at each opportunity
  },

  // === HAZARDS ===
  HAZARDS: {
    // Spike Properties
    SPIKE_COLOR: 'red',
    SPIKE_HEIGHT: 20,
    SPIKE_WIDTH: 15,
    SPIKE_DAMAGE: 1,
    
    // Fire Pit Properties
    FIRE_COLOR: 'orange',
    FIRE_HEIGHT: 30,
    FIRE_WIDTH: 40,
    FIRE_DAMAGE: 1,
    FIRE_ANIMATION_SPEED: 0.1,
    
    // Pendulum Properties
    PENDULUM_COLOR: 'darkred',
    PENDULUM_RADIUS: 15,
    PENDULUM_CHAIN_LENGTH: 100,
    PENDULUM_SWING_SPEED: 0.05,
    PENDULUM_DAMAGE: 1,
    
    // Collapsing Platform Properties
    COLLAPSING_COLOR: 'orange',
    COLLAPSING_DELAY: 1000, // ms before collapse
    COLLAPSING_FALL_SPEED: 5,
    
    // Quicksand Properties
    QUICKSAND_COLOR: 'brown',
    QUICKSAND_SLOW_FACTOR: 0.3, // Movement speed multiplier
    QUICKSAND_JUMP_REDUCTION: 0.5, // Jump height multiplier
    
    // Wind Properties
    WIND_FORCE: 0.5,
    WIND_DURATION: 3000, // ms
    WIND_COOLDOWN: 5000, // ms between gusts
    
    // Spawn Settings
    HAZARD_SPAWN_CHANCE: 0.05, // Probability of spawning hazard (reduced from 0.3)
    HAZARD_MIN_SPACING: 1200, // Minimum distance between hazards (increased from 300)
  },

  // === MOVING PLATFORMS ===
  MOVING_PLATFORMS: {
    // Platform Properties
    COLOR: 'lightblue',
    WIDTH: 120,
    HEIGHT: 20,
    
    // Movement Properties
    HORIZONTAL_SPEED: 1,
    VERTICAL_SPEED: 0.5,
    MOVEMENT_RANGE: 200, // How far platforms move
    
    // Spawn Settings
    SPAWN_CHANCE: 0.2, // Probability of spawning moving platform
    MIN_SPACING: 400, // Minimum distance between moving platforms
  },

  // === POWER-UPS ===
  POWER_UPS: {
    // Speed Boots
    SPEED_BOOTS_COLOR: 'yellow',
    SPEED_BOOTS_DURATION: 5000, // ms
    SPEED_BOOTS_MULTIPLIER: 2.0,
    
    // Magnet
    MAGNET_COLOR: 'purple',
    MAGNET_DURATION: 5000, // ms
    MAGNET_RANGE: 100, // pixels
    MAGNET_FORCE: 0.3,
    
    // Shrink/Grow
    SHRINK_COLOR: 'blue',
    GROW_COLOR: 'green',
    SIZE_DURATION: 8000, // ms
    SHRINK_MULTIPLIER: 0.6,
    GROW_MULTIPLIER: 1.4,
    
    // Spawn Settings
    POWER_UP_SPAWN_CHANCE: 0.1, // Probability of spawning power-up
    POWER_UP_MIN_SPACING: 500, // Minimum distance between power-ups
  },

  // === APPLE VARIANTS ===
  APPLE_VARIANTS: {
    // Normal Apple
    NORMAL: {
      COLOR: 'limegreen',
      OUTLINE_COLOR: 'darkgreen',
      SCORE_VALUE: 1,
      SPAWN_CHANCE: 0.4, // 40% of apples
    },
    
    // Golden Apple
    GOLDEN: {
      COLOR: 'lightblue',
      OUTLINE_COLOR: 'blue',
      SCORE_VALUE: 5,
      SPAWN_CHANCE: 0.3, // 30% of apples
    },
    
    // Rotten Apple
    ROTTEN: {
      COLOR: 'purple',
      OUTLINE_COLOR: 'darkviolet',
      SCORE_VALUE: -1,
      SPAWN_CHANCE: 0.3, // 30% of apples
    },
  },

  // === UFO ENEMIES ===
  UFO: {
    // UFO Appearance
    BODY_COLOR: 'silver',
    DOME_COLOR: 'lightblue',
    OUTLINE_COLOR: 'darkgray',
    LIGHT_COLOR: 'yellow',
    RED_LIGHT_COLOR: 'red', // Flashing red warning lights
    
    // UFO Dimensions
    BODY_WIDTH: 80, // Increased from 60
    BODY_HEIGHT: 25, // Increased from 20
    DOME_RADIUS: 20, // Increased from 15
    LIGHT_RADIUS: 4, // Increased from 3
    
    // Movement Properties
    SPEED: 1.5, // Horizontal movement speed
    FLOAT_AMPLITUDE: 10, // How much UFOs bob up and down
    FLOAT_SPEED: 0.05, // Speed of floating animation
    
    // Spawn Settings
    BASE_SPAWN_CHANCE: 0.1, // Base probability of spawning UFO (reduced from 0.3)
    MAX_SPAWN_CHANCE: 0.8, // Maximum probability at far distances
    MIN_SPACING: 400, // Minimum distance between UFOs (reduced for testing)
    MIN_HEIGHT: 50, // Minimum height above ground (reduced)
    MAX_HEIGHT: 600, // Maximum height above ground (increased to near roof)
    
    // Progressive Difficulty
    DIFFICULTY_START_DISTANCE: 2000, // Distance where difficulty starts increasing
    DIFFICULTY_MAX_DISTANCE: 10000, // Distance where difficulty reaches maximum
    DIFFICULTY_CURVE: 2.0, // How steep the difficulty curve is (higher = steeper)
    
    // Collision
    COLLISION_BUFFER: 5, // Extra collision detection buffer
  },

  // === GAME STATES ===
  GAME_STATES: {
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
  },

  // === GAME OVER SCREEN ===
  GAME_OVER: {
    // Overlay Properties
    OVERLAY_COLOR: 'rgba(0, 0, 0, 0.8)',
    
    // Text Properties
    TITLE_FONT: '48px Arial',
    TITLE_COLOR: 'red',
    SCORE_FONT: '24px Arial',
    SCORE_COLOR: 'white',
    INSTRUCTION_FONT: '18px Arial',
    INSTRUCTION_COLOR: 'lightgray',
    
    // Text Content
    TITLE_TEXT: 'GAME OVER',
    SCORE_PREFIX: 'Final Score: ',
    RESTART_INSTRUCTION: 'Press SPACE or R to Restart',
    
    // Ash Pile Properties
    ASH_COLOR: 'gray',
    ASH_PARTICLES: 8, // Number of ash particles
    ASH_FALL_SPEED: 2, // How fast ash falls
    
    // Death Animation Timing
    DEATH_DELAY: 2000, // 2 seconds before showing game over
    FADE_DURATION: 1000, // 1 second fade-in duration
    FADE_START_ALPHA: 0.0,
    FADE_END_ALPHA: 0.8
  },

  // === BOMB HAZARD ===
  BOMB: {
    // Visual Properties
    BODY_COLOR: 'darkred',
    BODY_OUTLINE: 'black',
    SPIKES_COLOR: 'gray',
    SPIKES_OUTLINE: 'black',
    FUSE_COLOR: 'yellow',
    FUSE_FLAME_COLOR: 'orange',
    
    // Dimensions
    BODY_WIDTH: 30,
    BODY_HEIGHT: 25,
    SPIKES_COUNT: 8,
    SPIKES_LENGTH: 8,
    FUSE_LENGTH: 15,
    
    // Spawn Settings
    SPAWN_CHANCE: 0.3, // 30% chance per chunk (increased for testing)
    MIN_SPACING: 800, // Minimum distance between bombs
    FLOOR_ONLY: true, // Only spawn on ground level
    
    // Animation
    FUSE_FLICKER_SPEED: 0.3, // How fast fuse flickers
    FUSE_FLAME_SIZE: 3, // Size of flame on fuse
  }
};

// Calculated constants (derived from base constants)
GAME_CONSTANTS.CALCULATED = {
  MAX_PLAYER_X: GAME_CONSTANTS.CANVAS.WIDTH - GAME_CONSTANTS.PLAYER.WIDTH,
  CROUCH_SPEED: GAME_CONSTANTS.PLAYER.SPEED * GAME_CONSTANTS.PLAYER.CROUCH_SPEED_MULTIPLIER,
};

// Export for use in other files
window.GAME_CONSTANTS = GAME_CONSTANTS;
