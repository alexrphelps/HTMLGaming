/**
 * Cellvive Game Constants
 * Central configuration file for all game settings
 * Modify these values to easily tweak game behavior
 */

const CELLVIVE_CONSTANTS = {
    
    // ========================================
    // GAME WORLD SETTINGS
    // ========================================
    WORLD: {
        // Base world dimensions - DOUBLED for explorative experience
        BASE_WIDTH: 8000,
        BASE_HEIGHT: 6000,
        
        // World size multiplier (affects total world size)
        SIZE_MULTIPLIER: 1.0,
        
        // Canvas dimensions
        CANVAS_WIDTH: 1200,
        CANVAS_HEIGHT: 800,
        
        // Grid settings
        GRID_SIZE: 50,
        GRID_OPACITY: 0.1,
        GRID_COLOR: 'rgba(255, 255, 255, 0.1)',
        
        // Background colors
        BACKGROUND_COLORS: {
            CENTER: '#0f3460',
            MIDDLE: '#1a1a2e', 
            OUTER: '#0d1421'
        },
        
        // Zone system for progressive difficulty
        ZONES: {
            SAFE_ZONE: {
                RADIUS: 1000, // Safe area around center
                DESCRIPTION: 'Safe Zone - Small food cells, no enemies'
            },
            NORMAL_ZONE: {
                RADIUS: 2000, // Normal difficulty area
                DESCRIPTION: 'Normal Zone - Regular food and small enemies'
            },
            DANGER_ZONE: {
                RADIUS: 3500, // Dangerous area
                DESCRIPTION: 'Danger Zone - Larger enemies, fewer food cells'
            },
            DEATH_ZONE: {
                RADIUS: Infinity, // Most dangerous area
                DESCRIPTION: 'Death Zone - Massive enemies, minimal food'
            }
        }
    },
    
    // ========================================
    // PLAYER SETTINGS
    // ========================================
    PLAYER: {
        // Starting properties
        STARTING_RADIUS: 20,
        STARTING_HEALTH: 100,
        STARTING_MAX_HEALTH: 100,
        STARTING_SPEED: 3,
        
        // Maximum values
        MAX_RADIUS: 1000,
        MAX_HEALTH: 1000,
        
        // Movement settings
        ACCELERATION: 0.3,
        FRICTION: 0.85,
        
        // Size-based speed reduction
        SPEED_REDUCTION_FACTOR: 0.3, // Minimum speed multiplier
        SPEED_REDUCTION_DIVISOR: 200, // How quickly speed reduces with size
        
        // Health regeneration
        HEALTH_REGEN_RATE: 0.5, // Health per second
        HEALTH_REGEN_DELAY: 2000, // Delay after taking damage (ms)
        
        // Growth settings - SLOWER for explorative experience
        GROWTH_AMOUNT_MULTIPLIER: 0.1, // 10% of eaten cell's radius (reduced from 30%)
        GROWTH_ANIMATION_DURATION: 1000, // Animation duration (ms)
        
        // Visual properties
        STROKE_COLOR: '#00ff00',
        STROKE_WIDTH: 3,
        IS_BLOB: true,
        WOBBLE_INTENSITY: 0.8,
        WOBBLE_VARIATION: 0.4
    },
    
    // ========================================
    // CELL SETTINGS
    // ========================================
    CELLS: {
        // Spawning
        INITIAL_COUNT: 50,
        MAX_COUNT: 200,
        SPAWN_RATE: 0.02, // Probability per frame
        
        // Size ranges
        MIN_RADIUS: 5,
        MAX_RADIUS: 1000,
        SIZE_VARIATION: 0.3,
        
        // Movement (spore-like behavior)
        SPEED: 0.3,
        MAX_SPEED: 0.3,
        FRICTION: 0.95,
        
        // AI behavior
        AI_UPDATE_INTERVAL: 120, // Frames between AI updates
        AI_STATES: ['drift', 'wander'],
        
        // Visual properties
        STROKE_COLOR: 'transparent',
        STROKE_WIDTH: 0,
        IS_BLOB: false, // Render as circles
        
        // Health
        STARTING_HEALTH: 50,
        MAX_HEALTH: 100
    },
    
    // ========================================
    // ENEMY SETTINGS
    // ========================================
    ENEMIES: {
        // Spawning
        INITIAL_COUNT: 8,
        MAX_COUNT: 30,
        SPAWN_RATE: 0.01,
        
        // Size ranges
        MIN_RADIUS: 15,
        MAX_RADIUS: 1000,
        
        // General enemy properties
        DANGER_LEVEL: 3,
        HUNT_RANGE: 120,
        AGGRESSION: 0.9,
        HUNT_PERSISTENCE: 0.8,
        SEARCH_RADIUS: 250
    },
    
    // ========================================
    // VIRUS ENEMY SETTINGS
    // ========================================
    VIRUS: {
        // Visual properties
        SPIKE_COUNT_MIN: 6,
        SPIKE_COUNT_MAX: 9,
        SPIKE_LENGTH_MULTIPLIER: 0.3, // 30% of radius
        KILL_RADIUS_MULTIPLIER: 1.2, // Can kill cells 20% larger
        
        // Movement
        SPEED_MIN: 0.4,
        SPEED_MAX: 0.7,
        
        // Connection system
        CONNECTION_RANGE: 35,
        MAX_CONNECTIONS: 10,
        FORMATION_SPACING: 0, // Edge-to-edge connection
        
        // Group behavior
        GROUP_SLOWDOWN_FACTOR: 0.1, // 10% slower per additional virus
        MIN_GROUP_SPEED: 0.3, // Minimum speed when in group
        MIN_FLEE_SPEED: 0.4, // Minimum speed when fleeing
        
        // Growth and survival
        GROWTH_TARGET: 30,
        HUNGER_INCREASE_RATE: 0.5,
        MAX_HUNGER: 1000,
        HUNGER_REDUCTION_ON_EAT: 200,
        
        // AI behavior
        AI_UPDATE_INTERVAL: 30,
        EXPLORATION_DISTANCE_MIN: 150,
        EXPLORATION_DISTANCE_MAX: 550,
        TARGET_REACHED_DISTANCE: 8
    },
    
    // ========================================
    // POWER-UP SETTINGS
    // ========================================
    POWERUPS: {
        // Spawning
        SPAWN_RATE: 0.005, // Probability per frame
        MAX_COUNT: 15,
        LIFETIME: 30000, // 30 seconds
        
        // Types and effects
        TYPES: {
            ENERGY: {
                VALUE: 30,
                DURATION: 1, // Instant/permanent
                COLOR: '#FFD700',
                DESCRIPTION: 'Permanent energy boost'
            },
            SIZE_BOOST: {
                VALUE: 5,
                DURATION: 1, // Instant/permanent
                COLOR: '#32CD32',
                DESCRIPTION: 'Permanent size increase'
            },
            HEALTH: {
                VALUE: 50,
                DURATION: 1, // Instant/permanent
                COLOR: '#FF69B4',
                DESCRIPTION: 'Permanent health boost'
            }
        },
        
        // Visual properties
        GLOW_INTENSITY: 0.5,
        GLOW_SPEED: 0.05,
        PULSE_SPEED: 0.02
    },
    
    // ========================================
    // ENVIRONMENT SETTINGS
    // ========================================
    ENVIRONMENT: {
        // Biome settings
        BIOMES: {
            INITIAL_COUNT: 8,
            MAX_COUNT: 20,
            SPAWN_RATE: 0.001,
            
            // Size ranges
            REGULAR_SIZE_MIN: 150,
            REGULAR_SIZE_MAX: 200,
            NUTRIENT_SIZE_MIN: 1500, // MODIFIED: Increased by 500% (300 * 5)
            NUTRIENT_SIZE_MAX: 3500, // MODIFIED: Increased by 500% (700 * 5)
            
            // Types
            TYPES: {
                NUTRIENT_RICH: {
                    TYPE: 'nutrient',
                    SHAPE: 'polygon',
                    COLOR: '#90EE90',
                    EFFECT: 'growth_boost'
                },
                TOXIC: {
                    TYPE: 'toxic',
                    SHAPE: 'circle',
                    COLOR: '#8B4513',
                    EFFECT: 'damage'
                },
                HEALING: {
                    TYPE: 'healing',
                    SHAPE: 'circle',
                    COLOR: '#87CEEB',
                    EFFECT: 'healing'
                }
            }
        },
        
        // Hazard settings - DISABLED
        HAZARDS: {
            ENABLED: false, // Disable all hazards
            INITIAL_COUNT: 0,
            MAX_COUNT: 0,
            SPAWN_RATE: 0,
            
            // Size ranges
            MIN_SIZE: 80,
            MAX_SIZE: 200,
            
            // Visual properties
            IRREGULARITY: 0.3,
            NUM_POINTS: 8,
            OPACITY: 0.6,
            
            // Types
            TYPES: {
                ACID: {
                    COLOR: '#FF4500',
                    DAMAGE: 2,
                    DAMAGE_INTERVAL: 1000
                },
                TOXIC: {
                    COLOR: '#8B4513',
                    DAMAGE: 1,
                    DAMAGE_INTERVAL: 2000
                }
            }
        },
        
        // Current flow (DISABLED)
        CURRENTS: {
            ENABLED: false,
            INITIAL_COUNT: 0,
            MAX_COUNT: 0,
            SPAWN_RATE: 0
        },
        
        // Food Spawner settings
        FOOD_SPAWNERS: {
            ENABLED: true,
            INITIAL_COUNT: 3,
            MAX_COUNT: 8,
            SPAWN_RATE: 0.0005,
            
            // Size ranges
            MIN_RADIUS: 15,
            MAX_RADIUS: 35,
            
            // Spore spawning
            SPORE_SPAWN_RATE: 0.02, // Probability per frame
            SPORE_SPAWN_INTERVAL: 3000, // 3 seconds between spawns
            MAX_SPORE_DISTANCE: 200,
            
            // Spore properties
            SPORE_SIZE_MIN: 3,
            SPORE_SIZE_MAX: 7,
            SPORE_SPEED_MIN: 0.5,
            SPORE_SPEED_MAX: 1.5
        },
        
        // Spore Types and Effects
        SPORE_TYPES: {
            GREEN: {
                TYPE: 'growth_hormone',
                COLOR: '#90EE90',
                NAME: 'Green Growth Spore',
                DESCRIPTION: 'Gives energy, increases size, and increases health (Very common, abundant)',
                SPAWN_WEIGHT: 0.6, // 60% chance (very common)
                ZONE_BIAS: 'center', // Spawn more in center zones
                
                // Size-based growth values
                GROWTH_VALUES: {
                    SMALL: { radius: 3, growth: 1 },    // +1 size
                    MEDIUM: { radius: 4, growth: 2 },   // +2 size
                    LARGE: { radius: 5, growth: 3 },    // +3 size
                    XLARGE: { radius: 6, growth: 4 },   // +4 size
                    XXLARGE: { radius: 7, growth: 5 }   // +5 size (rare, outer zones)
                }
            },
            
            YELLOW: {
                TYPE: 'speed_boost',
                COLOR: '#FFD700',
                NAME: 'Yellow Energy Spore',
                DESCRIPTION: 'Gives energy, health, and increases max energy',
                SPAWN_WEIGHT: 0.25, // 25% chance (common)
                ZONE_BIAS: 'nutrient', // Spawn more in nutrient zones
                
                // Energy boost properties
                HEALTH_RESTORE: 20,    // Restores 20 health
                MAX_ENERGY_BOOST: 5,   // Increases max energy by 5
                RADIUS: 6,             // Visual size
                GROWTH: 0              // No size increase
            },
            
            ORANGE: {
                TYPE: 'talent_upgrade',
                COLOR: '#FFA500',
                NAME: 'Orange Talent Spore',
                DESCRIPTION: 'Gives energy and +1 talent point (Uncommon)',
                SPAWN_WEIGHT: 0.15, // 15% chance (uncommon)
                ZONE_BIAS: 'outer', // Spawn more in outer zones
                
                // Talent properties
                HEALTH_RESTORE: 15,  // Restores 15 health (energy)
                TALENT_POINTS: 1,    // Gives +1 talent point
                RADIUS: 8,           // Increased size - more prominent
                GROWTH: 0,           // No size increase
                RARITY: 'uncommon'   // Special handling
            }
        }
    },
    
    // ========================================
    // TALENT SYSTEM SETTINGS
    // ========================================
    TALENTS: {
        ENABLED: true,
        
        // Talent points system
        POINTS_PER_ORANGE_SPORE: 1,
        MAX_TALENT_LEVEL: 3, // Reduced for more impactful upgrades
        
        // Evolution-themed talent tree
        TALENT_TREE: {
            // ==== TIER 1: CELLULAR FOUNDATION ====
            // Basic evolutionary improvements - Available from start
            TIER_1: {
                EFFICIENT_METABOLISM: {
                    ID: 'efficient_metabolism',
                    NAME: 'Efficient Metabolism',
                    DESCRIPTION: 'Your cell processes nutrients better. +30% growth from all food per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 1,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'growth_multiplier',
                        VALUE: 0.3 // 30% more growth per level (1.3x, 1.6x, 1.9x)
                    },
                    PREREQUISITES: [],
                    ICON: '🧬',
                    CATEGORY: 'growth',
                    TIER: 1
                },
                
                THICK_MEMBRANE: {
                    ID: 'thick_membrane',
                    NAME: 'Thick Membrane',
                    DESCRIPTION: 'Reinforced cell wall. +25 max health and +15% damage resistance per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 1,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'health_boost',
                        MAX_HEALTH: 25, // +25 max health per level
                        DAMAGE_REDUCTION: 0.15 // 15% less damage per level
                    },
                    PREREQUISITES: [],
                    ICON: '🛡️',
                    CATEGORY: 'defense',
                    TIER: 1
                },
                
                RAPID_MOVEMENT: {
                    ID: 'rapid_movement',
                    NAME: 'Rapid Movement',
                    DESCRIPTION: 'Evolved flagella for faster movement. +20% base speed per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 1,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'speed_multiplier',
                        VALUE: 0.2 // 20% speed increase per level (1.2x, 1.4x, 1.6x)
                    },
                    PREREQUISITES: [],
                    ICON: '⚡',
                    CATEGORY: 'movement',
                    TIER: 1
                }
            },
            
            // ==== TIER 2: SPECIALIZED ADAPTATION ====
            // Advanced evolutionary traits - Requires any Tier 1 maxed (3/3)
            TIER_2: {
                PHOTOSYNTHESIS: {
                    ID: 'photosynthesis',
                    NAME: 'Photosynthesis',
                    DESCRIPTION: 'Slowly regenerate health over time. +5 health/sec per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 2,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'health_regen',
                        VALUE: 5, // 5 health per second per level (5, 10, 15)
                        COMBAT_THRESHOLD: 0 // Always active
                    },
                    PREREQUISITES: ['tier_1_complete'],
                    ICON: '🌿',
                    CATEGORY: 'survival',
                    TIER: 2
                },
                
                MAGNETIC_ORGANELLE: {
                    ID: 'magnetic_organelle',
                    NAME: 'Magnetic Organelle',
                    DESCRIPTION: 'Evolved attraction field. Food spores pulled toward you. +100 range per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 2,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'spore_attraction',
                        RADIUS: 100, // 100px radius per level (100, 200, 300)
                        STRENGTH: 0.15 // 15% pull strength per level
                    },
                    PREREQUISITES: ['tier_1_complete'],
                    ICON: '🧲',
                    CATEGORY: 'utility',
                    TIER: 2
                },
                
                ADAPTIVE_SIZE: {
                    ID: 'adaptive_size',
                    NAME: 'Adaptive Size',
                    DESCRIPTION: 'Overcome size limitations. -30% speed penalty from growth per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 2,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'speed_reduction_modifier',
                        VALUE: 0.3 // 30% less speed penalty per level
                    },
                    PREREQUISITES: ['tier_1_complete'],
                    ICON: '📏',
                    CATEGORY: 'movement',
                    TIER: 2
                },
                
                TOXIC_RESISTANCE: {
                    ID: 'toxic_resistance',
                    NAME: 'Toxic Resistance',
                    DESCRIPTION: 'Adapted to hostile environments. -50% damage from toxic zones per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 2,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'toxic_resistance',
                        VALUE: 0.5 // 50% less toxic damage per level
                    },
                    PREREQUISITES: ['tier_1_complete'],
                    ICON: '☣️',
                    CATEGORY: 'defense',
                    TIER: 2
                }
            },
            
            // ==== TIER 3: APEX EVOLUTION ====
            // Ultimate mutations - Requires any Tier 2 maxed (3/3)
            TIER_3: {
                PREDATORY_INSTINCT: {
                    ID: 'predatory_instinct',
                    NAME: 'Predatory Instinct',
                    DESCRIPTION: 'Hunt larger prey. Eat cells up to +10% larger per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 3,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'eat_size_modifier',
                        VALUE: 0.10 // 10% larger cells per level (110%, 120%, 130%)
                    },
                    PREREQUISITES: ['tier_2_complete'],
                    ICON: '🦁',
                    CATEGORY: 'combat',
                    TIER: 3
                },
                
                CELLULAR_DIVISION: {
                    ID: 'cellular_division',
                    NAME: 'Cellular Division',
                    DESCRIPTION: 'Rapidly reproduce. Gain +0.5 size/sec when below half max size per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 3,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'size_growth',
                        VALUE: 0.5, // +0.5 radius/sec per level (0.5, 1.0, 1.5)
                        THRESHOLD: 0.5 // Only when below 50% max size
                    },
                    PREREQUISITES: ['tier_2_complete'],
                    ICON: '🔬',
                    CATEGORY: 'growth',
                    TIER: 3
                },
                
                SYMBIOTIC_SHIELD: {
                    ID: 'symbiotic_shield',
                    NAME: 'Symbiotic Shield',
                    DESCRIPTION: 'Protective bacteria layer. Immune to damage when above 80% health per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 3,
                    EFFECT_PER_LEVEL: {
                        TYPE: 'phase_shift',
                        TRIGGER_HEALTH: 0.80, // Triggers at 80% health threshold
                        DURATION: 2000, // 2 seconds immunity per level (2s, 4s, 6s)
                        COOLDOWN: 15000 // 15 second cooldown (constant)
                    },
                    PREREQUISITES: ['tier_2_complete'],
                    ICON: '🛡️',
                    CATEGORY: 'defense',
                    TIER: 3
                },
                
                EVOLUTIONARY_LEAP: {
                    ID: 'evolutionary_leap',
                    NAME: 'Evolutionary Leap',
                    DESCRIPTION: 'Transcend limitations. +50% to ALL stats per level.',
                    MAX_LEVEL: 3,
                    COST_PER_LEVEL: 5, // Very expensive ultimate talent
                    EFFECT_PER_LEVEL: {
                        TYPE: 'all_stats_multiplier',
                        SPEED: 0.5, // +50% speed
                        GROWTH: 0.5, // +50% growth
                        HEALTH: 50, // +50 max health
                        REGEN: 3 // +3 health regen/sec
                    },
                    PREREQUISITES: ['tier_2_complete'],
                    ICON: '⭐',
                    CATEGORY: 'ultimate',
                    TIER: 3
                }
            }
        }
    },
    
    // ========================================
    // CAMERA SETTINGS
    // ========================================
    CAMERA: {
        // Following behavior
        FOLLOW_SPEED: 0.1,
        
        // Zoom settings
        ZOOM: {
            ENABLED: true,
            ZOOM_OUT_FACTOR: 0.1, // 10% zoom out per 100 size
            ZOOM_OUT_INTERVAL: 100, // Every 100 size units
            MIN_ZOOM: 0.3, // Minimum zoom level (30% zoom out max)
            ZOOM_TRANSITION_SPEED: 0.05 // Smooth transition speed
        }
    },
    
    // ========================================
    // COLLISION SETTINGS
    // ========================================
    COLLISION: {
        // Detection ranges
        DETECTION_RANGE: 300,
        
        // Eating mechanics
        EAT_DISTANCE_MULTIPLIER: 1.1, // Can eat cells 10% larger
        EAT_GROWTH_MULTIPLIER: 0.3, // Grow by 30% of eaten cell's radius
        
        // Push forces
        PUSH_FORCE: 0.1,
        OPTIMAL_DISTANCE: 20
    },
    
    // ========================================
    // UI SETTINGS
    // ========================================
    UI: {
        // HUD settings
        HUD: {
            BACKGROUND_OPACITY: 0.7,
            HEALTH_BAR_WIDTH: 200,
            HEALTH_BAR_HEIGHT: 20,
            HEALTH_BAR_COLOR: '#ff0000',
            HEALTH_BAR_BACKGROUND: 'rgba(0, 0, 0, 0.7)'
        },
        
        // Animation settings
        ANIMATIONS: {
            SIZE_ANIMATION_SPEED: 0.05,
            HEALTH_ANIMATION_SPEED: 0.1,
            POWERUP_FADE_SPEED: 0.02
        },
        
        // Debug settings
        DEBUG: {
            SHOW_GRID: false,
            SHOW_DEBUG_INFO: false,
            SHOW_POWERUP_STATUS: true,
            SHOW_MINIMAP: true
        }
    },
    
    // ========================================
    // PARTICLE SYSTEM SETTINGS
    // ========================================
    PARTICLES: {
        // Background particles
        BACKGROUND: {
            COUNT: 50,
            SIZE_MIN: 1,
            SIZE_MAX: 3,
            OPACITY: 0.3,
            SPEED: 0.5
        },
        
        // Movement trail
        TRAIL: {
            ENABLED: true,
            LENGTH: 10,
            OPACITY: 0.6,
            FADE_SPEED: 0.1
        },
        
        // Connection effects
        CONNECTION: {
            ENABLED: false, // Disabled to reduce spam
            COUNT: 5,
            SIZE: 2,
            OPACITY: 0.8,
            LIFETIME: 1000
        }
    },
    
    // ========================================
    // TUTORIAL SETTINGS
    // ========================================
    TUTORIAL: {
        ENABLED: true,
        AUTO_HIDE_DELAY: 5000, // 5 seconds
        DISCOVERY_DELAY: 2000, // 2 seconds
        
        // Tutorial messages
        MESSAGES: {
            MOVEMENT: 'Use WASD or Arrow Keys to move',
            EATING: 'Move into smaller cells to eat them and grow',
            AVOIDING: 'Avoid larger cells - they can eat you!',
            POWERUPS: 'Collect power-ups for permanent boosts',
            VIRUSES: 'Watch out for virus cells - they connect together!'
        }
    },
    
    // ========================================
    // PERFORMANCE SETTINGS
    // ========================================
    PERFORMANCE: {
        // Frame rate
        TARGET_FPS: 60,
        MAX_DELTA_TIME: 50, // Cap delta time to prevent large jumps
        
        // Rendering optimizations
        CULLING_DISTANCE: 500, // Don't render objects beyond this distance
        BATCH_SIZE: 100, // Process objects in batches
        
        // Update intervals
        AI_UPDATE_INTERVAL: 2, // Update AI every N frames
        PHYSICS_UPDATE_INTERVAL: 1, // Update physics every frame
        RENDER_UPDATE_INTERVAL: 1, // Render every frame
        
        // Game loop optimizations - ENABLED FOR FULL WORLD SIMULATION
        MAX_NEARBY_CELLS: 20,
        NEARBY_CELL_RANGE: 300,
        CELL_CULLING_DISTANCE: 1500,
        SIMULATION_DISTANCE: Infinity, // Simulate entire world (no distance limit)
        MIN_CELL_RADIUS: 3,
        MIN_CELL_HEALTH: 0,
        
        // Collision detection optimization
        COLLISION_BATCH_SIZE: 50, // Process collisions in batches
        COLLISION_SKIP_FRAMES: 1, // Skip collision detection every N frames for distant objects
        
        // Magic number constants for better maintainability
        EAT_SIZE_MULTIPLIER: 1.05, // Can eat cells 5% larger (reduced from 10% for better feel)
        EAT_SIZE_MULTIPLIER_ENEMY: 1.2, // Enemies can eat cells 20% larger
        DIAGONAL_MOVEMENT_FACTOR: 0.707, // 1/sqrt(2) for diagonal normalization
        MIN_SPEED_THRESHOLD: 0.5, // Minimum speed to prevent stopping
        DEFAULT_ACCELERATION: 0.3, // Default player acceleration
        DEFAULT_FRICTION: 0.85, // Default player friction
        
        // Debug settings
        DEBUG_LOGGING: false, // Master switch for debug logs
        PERFORMANCE_MONITORING: false, // Enable performance metrics
        MAX_CONSOLE_LOGS_PER_SECOND: 10, // Rate limit console output
        
        // Particle system optimizations
        PARTICLE_POOL_SIZE: 100,
        MAX_PARTICLES: 200,
        CACHE_CLEAR_INTERVAL: 60, // Clear caches every 60 frames
        OBJECT_POOL_MAX_SIZE: 50
    },
    
    // ========================================
    // CAMERA AND ZOOM SETTINGS
    // ========================================
    CAMERA: {
        ZOOM_TRANSITION_SPEED: 0.05,
        CAMERA_FOLLOW_SPEED: 0.1,
        MIN_ZOOM: 0.1,
        MAX_ZOOM: 5.0,
        TARGET_ZOOM_MIN: 0.3,
        TARGET_ZOOM_MAX: 2.0,
        ZOOM_OUT_FACTOR: 0.1,
        ZOOM_OUT_INTERVAL: 100
    },
    
    // ========================================
    // SAFETY AND BOUNDS SETTINGS
    // ========================================
    SAFETY: {
        MIN_CANVAS_SIZE: 100,
        MIN_WORLD_SIZE: 100,
        MAX_WORLD_SIZE: 10000,
        DEFAULT_CANVAS_WIDTH: 800,
        DEFAULT_CANVAS_HEIGHT: 600,
        DEFAULT_WORLD_WIDTH: 3000,
        DEFAULT_WORLD_HEIGHT: 3000
    },
    
    // ========================================
    // LOGGING SETTINGS
    // ========================================
    LOGGING: {
        ENABLED: true,
        LEVEL: 'warn', // 'debug', 'info', 'warn', 'error', 'none'
        SHOW_TIMESTAMPS: false,
        SHOW_EMOJIS: true,
        
        // Production mode - set to false to disable all logging
        PRODUCTION_MODE: true
    },
    
    // ========================================
    // DEBUGGING SETTINGS
    // ========================================
    DEBUGGING: {
        // Debug logging thresholds
        MAX_COLLISION_LOGS: 10, // Only show collision logs for first N cells
        STATUS_LOG_INTERVAL_MS: 5000, // How often to log status updates (milliseconds)
        
        // Category-specific logging flags
        ENABLE_COLLISION_LOGS: true,
        ENABLE_SPAWN_LOGS: true,
        ENABLE_GROWTH_LOGS: true,
        ENABLE_POWERUP_LOGS: true,
        ENABLE_MOVEMENT_LOGS: false, // Usually too verbose
        
        // Verbose modes (show every event, not just periodically)
        VERBOSE_COLLISIONS: false,
        VERBOSE_SPAWNING: false
    },
    
    // ========================================
    // EATING MECHANICS
    // ========================================
    EATING: {
        // Size requirements for eating cells
        AI_CELL_SIZE_MULTIPLIER: 1.05, // Player must be 5% larger to eat AI cells
        ENEMY_CELL_SIZE_MULTIPLIER: 1.20, // Enemies must be 20% larger to eat
        
        // Spore mechanics
        SPORES_ALWAYS_EDIBLE: true, // Spores bypass size check
        
        // Comparison mode
        USE_STRICT_SIZE_CHECK: true, // true = use >, false = use >=
        
        // Growth mechanics
        GROWTH_ANIMATION_SPEED: 0.05, // How fast cells grow after eating
        MIN_GROWTH_AMOUNT: 0.1 // Minimum growth from eating anything
    },
    
    // ========================================
    // TESTING/DEBUG SETTINGS
    // ========================================
    TESTING: {
        // Enable/disable testing mode
        ENABLED: false, // DISABLED FOR PRODUCTION - Set to true to show testing panel for development
        
        // Testing features
        GODMODE: false, // Player cannot die
        NO_TUTORIAL: false, // Skip tutorial messages
        FAST_GROWTH: false, // Player grows faster
        SHOW_DEBUG_INFO: false, // Show debug information
        SHOW_COLLISION_BOXES: false, // Show collision detection boxes
        SHOW_AI_STATES: false, // Show AI state information
        SPAWN_MORE_CELLS: false, // Spawn more cells for testing
        SPAWN_MORE_ENEMIES: false, // Spawn more enemies for testing
        
        // Testing panel settings
        PANEL: {
            POSITION: 'bottom-left', // 'bottom-left', 'bottom-right', 'top-left', 'top-right'
            WIDTH: 250,
            HEIGHT: 300,
            BACKGROUND_COLOR: 'rgba(0, 0, 0, 0.8)',
            TEXT_COLOR: '#ffffff',
            BORDER_COLOR: '#00ff00',
            BORDER_WIDTH: 2
        }
    }
};

// Export for use in other modules
window.CELLVIVE_CONSTANTS = CELLVIVE_CONSTANTS;
