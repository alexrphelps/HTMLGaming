                                                                                                                                                                    # Cellvive - 2D Cell Survival Game Documentation

## 📋 Table of Contents
1. [Game Overview](#game-overview)
2. [Core Gameplay](#core-gameplay)
3. [Game Objects Reference](#game-objects-reference)
4. [Player System](#player-system)
5. [AI Ecosystem](#ai-ecosystem)
6. [Enemy System](#enemy-system)
7. [Environmental Systems](#environmental-systems)
8. [Power-Up System](#power-up-system)
9. [Camera & Zoom System](#camera--zoom-system)
10. [Visual Systems](#visual-systems)
11. [Game Mechanics](#game-mechanics)
12. [UI and HUD](#ui-and-hud)
13. [Tutorial System](#tutorial-system)
14. [Testing & Debug Features](#testing--debug-features)
15. [Technical Architecture](#technical-architecture)
16. [Configuration](#configuration)
17. [Development Roadmap](#development-roadmap)

---

## 🎮 Game Overview

**Cellvive** is a 2D cell survival game where players control a blob-like cell in a competitive ecosystem. The goal is to survive, grow, and thrive in a dynamic world filled with AI-controlled cells, environmental hazards, and natural currents.

### Core Concept
- **Survival of the Fittest**: Eat smaller cells to grow, avoid larger dangerous ones
- **Dynamic Ecosystem**: AI cells that hunt, flee, and compete for survival
- **Environmental Challenges**: Navigate hazards, currents, and biomes
- **Progressive Growth**: Start small and grow into a dominant organism

---

## 🧬 Game Objects Reference

This section provides a comprehensive overview of all game objects, their mechanics, logic, and visual structures.

### 🎮 Player Objects

#### Player (class: Player)
**File**: `Player.js`  
**Purpose**: The main character controlled by the player

**Mechanics & Logic**:
- **Movement**: WASD/Arrow key input with acceleration/friction physics
- **Health System**: 100 base health, regenerates over time, decays when damaged
- **Growth System**: Radius increases when eating smaller cells (10% of eaten cell's radius)
- **Size-Speed Relationship**: Larger players move slower (speed reduction factor: 0.3)
- **Maximum Size**: 1000 radius limit
- **Collision**: Can eat cells 80% of its radius or smaller

**Visual Structure**:
- **Shape**: Blob-like circular form with organic wobble animation
- **Color**: Blue (`#4a90e2`) with darker blue stroke (`#357abd`)
- **Animation**: Continuous wobble effect, growth animation, pulse effects
- **Rendering**: Custom blob shape with 12 points, smooth curves using quadratic curves

---

### 🍎 Food & Cell Objects

#### Cell (class: Cell) 
**File**: `Cell.js`  
**Purpose**: AI-controlled food cells and small organisms

**Mechanics & Logic**:
- **AI States**: `drift`, `hunt`, `flee` behaviors
- **Health Decay**: 0.005 health per frame, dies when health reaches 0
- **Spore-like Movement**: Slow drifting movement (0.3 speed)
- **Size Range**: 3-25 radius
- **AI Update Frequency**: Every 120 frames (2 seconds at 60fps)

**Visual Structure**:
- **Shape**: Simple circles with subtle wobble animation
- **Colors**: Various (`#ff6b6b`, `#90EE90`, `#FFD700`, etc.)
- **Animation**: Gentle pulse and wobble effects
- **Rendering**: Filled circles with no borders

---

### 👾 Enemy Objects

#### AmoebaEnemy (class: AmoebaEnemy extends Enemy)
**File**: `AmoebaEnemy.js`  
**Purpose**: Slow-moving dangerous enemies that can engulf smaller cells

**Mechanics & Logic**:
- **Movement**: Unpredictable, slow movement with random direction changes
- **Hunting**: Actively seeks nearby smaller cells
- **Engulfment**: Can consume cells up to 90% of its size
- **Health**: 150-300 health points
- **Size**: 30-80 radius
- **Split Behavior**: Can split into smaller amoebas when damaged

**Visual Structure**:
- **Shape**: Irregular blob with 8-12 points, very organic appearance
- **Color**: Light blue (`#87CEEB`) with pseudopod-like extensions
- **Animation**: Flowing, liquid-like movement with shape deformation
- **Rendering**: Complex blob shape with smooth organic curves

#### VirusEnemy (class: VirusEnemy extends Enemy)
**File**: `VirusEnemy.js`  
**Purpose**: Aggressive spiky enemies that cluster together

**Mechanics & Logic**:
- **Group Behavior**: Managed by VirusGroupManager, works as collective organism
- **Aggression**: Can kill cells up to 20% larger than themselves
- **Clustering**: Tend to form groups of 3-8 viruses
- **Connection System**: Share health and coordinate attacks within groups
- **Size**: 15-40 radius
- **Speed**: Fast, direct movement toward targets

**Visual Structure**:
- **Shape**: Circular core with 8-16 sharp spikes radiating outward
- **Color**: Red (`#FF6B6B`) with darker red core
- **Animation**: Rotating spikes, pulsing core, connection lines between group members
- **Rendering**: Circle with triangular spikes, glowing connections

---

### 🌍 Environmental Objects

#### Biome (class: Biome)
**File**: `Biome.js`  
**Purpose**: Environmental zones with different effects on cells

**Biome Types & Effects**:

##### Nutrient-Rich Zone (`BiomeTypes.NUTRIENT_RICH`)
- **Effects**: +0.05 health regen, +0.001 size growth, 1.0x speed
- **Visual**: Green polygon shapes with particle effects
- **Size**: 200x200 base, irregular polygon shape

##### Toxic Zone (`BiomeTypes.TOXIC`)
- **Effects**: -0.02 health decay, -0.002 size shrink, 0.8x speed
- **Visual**: Large red mycelium network with animated connections
- **Size**: 60% of canvas size (720-1080px typical)
- **Rendering**: Special mycelium renderer with red color scheme
- **Color**: Red (`#DC143C`) - Updated from original orange

##### Slow Zone (`BiomeTypes.SLOW_ZONE`)
- **Effects**: 0.6x speed, +0.01 health regen
- **Visual**: Large blue circle with geometric oval and polygon cutouts
- **Size**: 150x150 base (now scales to match toxic/aggressive zones)
- **Rendering**: Custom clipping with even-odd fill rule
- **Color**: Sky Blue (`#87CEEB`) with transparency

##### Aggressive Zone (`BiomeTypes.AGGRESSIVE`)
- **Effects**: 1.2x speed, +0.1 aggression bonus, +0.02 health regen
- **Visual**: Large orange mycelium network (same as toxic but orange)
- **Size**: 60% of canvas size (matches toxic zone)
- **Rendering**: Special mycelium renderer with orange color scheme
- **Color**: Orange (`#FFA500`) for mycelium networks

#### FoodSpawner (class: FoodSpawner)
**File**: `Obstacle.js`  
**Purpose**: Stationary objects that continuously spawn food cells

**Mechanics & Logic**:
- **Spawn Rate**: Every 180-300 frames (3-5 seconds)
- **Capacity**: Spawns 5-15 food cells before depleting
- **Regeneration**: Slowly regenerates capacity over time
- **Types**: Different spawner types with varying spawn rates and food types

**Visual Structure**:
- **Shape**: Organic, tree-like structure with branches
- **Color**: Green (`#90EE90`) with darker green core
- **Animation**: Pulsing when spawning, particle effects
- **Size**: 30-60 radius with extending branches

#### Hazard (class: Hazard)
**File**: `Hazard.js`  
**Purpose**: Dangerous environmental obstacles

**Hazard Types**:

##### Toxin Hazard (`HazardTypes.TOXIN`)
- **Effect**: -2 health per frame on contact
- **Visual**: Purple/green bubble with toxic particle effects
- **Animation**: Bubbling, pulsing, particle emission

##### Acid Hazard (`HazardTypes.ACID`)
- **Effect**: -3 health per frame, corrosive damage
- **Visual**: Yellow-green with dissolving edges
- **Animation**: Corrosive particle effects, edge flickering

#### Current (class: Current)
**File**: `Current.js`  
**Purpose**: Environmental flows that push objects in specific directions

**Mechanics & Logic**:
- **Force Application**: Applies velocity to objects within current area
- **Strength**: Variable strength (0.1-2.0 force multiplier)
- **Direction**: Fixed direction vector
- **Affects**: All moveable objects (cells, enemies, player)

**Visual Structure**:
- **Shape**: Rectangular or circular flow areas
- **Visual**: Animated arrow patterns showing flow direction
- **Color**: Cyan (`#00FFFF`) with transparency
- **Animation**: Flowing arrow animations, particle streams

---

### ⚡ Interactive Objects

#### PowerUp (class: PowerUp)
**File**: `PowerUp.js`  
**Purpose**: Temporary beneficial effects for the player

**PowerUp Types & Effects**:

##### Speed Boost
- **Effect**: +50% movement speed for 10 seconds
- **Visual**: Yellow star with speed lines
- **Icon**: Lightning bolt symbol

##### Health Regeneration
- **Effect**: +20 health instantly, +0.5 health/sec for 15 seconds
- **Visual**: Green cross with healing particles
- **Icon**: Medical cross symbol

##### Size Boost
- **Effect**: +20% radius increase for 20 seconds
- **Visual**: Blue circle with expansion animation
- **Icon**: Plus symbol

##### Invincibility
- **Effect**: Immunity to damage for 5 seconds
- **Visual**: Golden shield with sparkle effects
- **Icon**: Shield symbol

##### Magnet
- **Effect**: Attracts food cells within 100 radius for 15 seconds
- **Visual**: Purple magnet with attraction lines
- **Icon**: Magnet symbol

**Visual Structure**:
- **Shape**: Geometric symbols (star, cross, circle, shield, magnet)
- **Animation**: Rotating, pulsing, particle effects
- **Size**: 15-25 radius
- **Glow**: Colored glow effects matching power type

---

### 🎛️ System Objects

#### ParticleSystem (class: ParticleSystem)
**File**: `ParticleSystem.js`  
**Purpose**: Manages visual particle effects throughout the game

**Particle Types**:
- **Food Consumption**: Sparkle effects when eating
- **Damage**: Red particles when taking damage
- **Healing**: Green particles for health restoration
- **Environmental**: Ambient particles in biomes
- **Death**: Explosion effects when cells die

#### VirusGroupManager (class: VirusGroupManager)
**File**: `VirusGroupManager.js`  
**Purpose**: Manages virus clustering and group behavior

**Mechanics**:
- **Group Formation**: Automatically clusters nearby viruses
- **Shared Health**: Group members share health pool
- **Coordinated Attacks**: Groups attack same targets
- **Connection Rendering**: Visual lines between group members

#### TalentSystem (class: TalentSystem)
**File**: `TalentSystem.js`  
**Purpose**: Player progression and upgrade system

**Mechanics**:
- **Talent Points**: Earned through growth and survival
- **Skill Trees**: Different upgrade paths
- **Passive Bonuses**: Permanent improvements to player stats

---

### 🎨 Rendering & Visual Systems

#### Renderer (class: Renderer)
**File**: `Renderer.js`  
**Purpose**: Main rendering engine for all game objects

**Rendering Features**:
- **Blob Rendering**: Organic shapes using quadratic curves
- **Layered Rendering**: Background, biomes, objects, UI layers
- **Special Effects**: Glow, particles, animations
- **Camera System**: World-to-screen coordinate transformation

#### MyceliumRenderer (class: MyceliumRenderer)
**File**: `Renderer.js`  
**Purpose**: Specialized renderer for toxic and aggressive zone networks

**Visual Features**:
- **Network Generation**: Procedural node and connection networks
- **Animated Effects**: Pulsing, glowing, flowing animations
- **Color Variants**: Red for toxic, orange for aggressive zones
- **Performance Optimization**: Cached network patterns

---

## 🎯 Core Gameplay

### Basic Mechanics
- **Movement**: WASD or Arrow Keys for player control
- **Eating**: Consume smaller cells to gain mass and energy
- **Growth**: Larger size provides advantages but makes you a target
- **Health System**: Health decays over time, eating restores health
- **Camera Following**: Smooth camera that follows the player

### Win/Lose Conditions
- **Survival**: Stay alive as long as possible
- **Growth**: Achieve larger sizes for higher scores
- **Death Causes**:
  - Eaten by larger cells or enemies
  - Starvation (health reaches zero)
  - Environmental hazards

---

## 👤 Player System

### Player Cell Properties
```javascript
{
    x, y: position,
    radius: size (grows when eating),
    health: survival meter (100 max),
    color: visual appearance,
    speed: movement velocity,
    shapeSeed: consistent blob shape
}
```

### Visual Features
- **Organic Blob Shape**: Non-circular, irregular cell appearance
- **Consistent Shape**: Shape remains stable, doesn't "spin" during movement
- **Fluid Wobble**: Subtle animation for organic feel
- **Size-Based Scaling**: Visual radius scales with actual size

### Movement System
- **Smooth Controls**: Responsive keyboard input
- **Speed Scaling**: Movement speed decreases with size
- **Momentum**: Natural acceleration and deceleration

---

## 🤖 AI Ecosystem

### AI Cell Types

#### Regular AI Cells
- **Behavior**: Wander, hunt smaller cells, flee from larger ones
- **AI States**: WANDER, HUNT, FLEE
- **Survival**: Health decay, eating mechanics, growth system
- **Visual**: Same organic blob shapes as player

#### Amoeba Enemies
- **Type**: Engulfing predator
- **Behavior**: Slow, unpredictable movement
- **Attack**: Engulfs smaller cells
- **Visual**: Translucent blue/green, flowing appearance
- **Size Advantage**: Can engulf cells smaller than themselves

#### Virus Enemies
- **Type**: Aggressive killer
- **Behavior**: Persistent hunting, clustering behavior
- **Attack**: Can kill cells up to 20% larger
- **Visual**: Spiky red/purple outline
- **Clustering**: Groups together for coordinated attacks

### AI Behavior System
```javascript
// AI State Machine
WANDER → HUNT (when prey detected)
HUNT → FLEE (when predator detected)
FLEE → WANDER (when safe)
```

---

## 🌍 Environmental Systems

### Biomes
Regions with different environmental effects:

#### Nutrient-Rich Zones
- **Effect**: Increased health regeneration
- **Visual**: Green tinted areas with dot patterns
- **Benefit**: Faster recovery for cells

#### Toxic Areas (Recently Updated)
- **Effect**: Health damage over time
- **Visual**: Large red mycelium networks with animated connections
- **Color**: Changed from orange to red (`#DC143C`)
- **Size**: Massive zones (60% of canvas size)
- **Risk**: Dangerous but may contain valuable resources

#### Slow Zones (Recently Updated)
- **Effect**: Reduced movement speed
- **Visual**: Large blue circles with geometric cutouts
- **Size**: Now matches toxic/aggressive zone scaling
- **Rendering**: Custom clipping with even-odd fill rule
- **Tactical**: Can be used strategically for defense

#### Aggressive Zones (New Feature)
- **Effect**: Increased movement speed and aggression
- **Visual**: Large orange mycelium networks (similar to toxic zones)
- **Size**: Massive zones (60% of canvas size, same as toxic)
- **Benefits**: Faster movement but increased danger from enhanced enemies
- **Color**: Orange (`#FFA500`) mycelium networks

### Obstacles
- **Solid Rocks**: Impassable barriers
- **Collision Detection**: Cells cannot pass through
- **Visual**: Gray rectangular blocks with borders
- **Strategic**: Create chokepoints and hiding spots

### Hazards (Irregular Shapes)
Environmental dangers with organic, irregular boundaries:

#### Toxin Pools
- **Shape**: Highly irregular, jagged boundaries
- **Effect**: Gradual health damage and size reduction
- **Visual**: Orange color with bubble patterns
- **Collision**: Ray casting algorithm for precise detection

#### Acid Lakes
- **Shape**: Extremely jagged, complex boundaries
- **Effect**: Severe damage and rapid size reduction
- **Visual**: Green color with wave patterns
- **Risk**: Most dangerous hazard type

#### Radiation Zones
- **Shape**: Smoother, more regular boundaries
- **Effect**: Moderate damage and slight size reduction
- **Visual**: Yellow color with solid patterns
- **Duration**: Long-lasting environmental effect

#### Virus Spawns
- **Shape**: Most chaotic, unpredictable boundaries
- **Effect**: Moderate damage with viral effects
- **Visual**: Purple color with bubble patterns
- **Duration**: Temporary, disappears after 30 seconds

### Currents (Wave Streams)
Beautiful, flowing streams that influence cell movement:

#### Ocean Currents
- **Pattern**: Gentle, flowing waves
- **Effect**: Moderate push in stream direction
- **Visual**: Light blue, 60 segments, smooth curves
- **Behavior**: Consistent, predictable flow

#### Whirlpools
- **Pattern**: Dramatic, swirling motion
- **Effect**: Strong circular motion
- **Visual**: Blue, 80 segments, complex curves
- **Behavior**: Intense, dangerous currents

#### Wind Tunnels
- **Pattern**: Straight streams with slight waves
- **Effect**: Strong linear push
- **Visual**: Light transparent, 40 segments
- **Behavior**: Fast, directional flow

#### Murky Water
- **Pattern**: Slow, meandering streams
- **Effect**: Moderate push with turbulence
- **Visual**: Brown, 50 segments, gentle curves
- **Behavior**: Slow, unpredictable flow

---

## ⚡ Power-Up System

### Power-Up Types
Strategic collectibles that provide permanent benefits:

#### Energy Cells (Gold)
- **Effect**: Permanent energy boost - increases max health
- **Visual**: Golden gradient with pulsing animation
- **Value**: +30 energy points (permanent)
- **Strategy**: Essential for long-term survival

#### Size Boost Cells (Green)
- **Effect**: Permanent size increase - increases radius
- **Visual**: Green gradient with organic appearance
- **Value**: +5 radius increase (permanent)
- **Strategy**: Makes you more powerful but also a bigger target

#### Health Cells (Pink)
- **Effect**: Permanent health boost - restores health
- **Visual**: Pink gradient with healing animation
- **Value**: +50 health points (permanent)
- **Strategy**: Immediate health restoration and boost

### Power-Up Mechanics
- **Spawn System**: Randomly spawn throughout the world
- **Lifetime**: Disappear after 30 seconds if not collected
- **Collection**: Touch to collect and apply permanent effects
- **Visual Effects**: Glowing, pulsing, and rotating animations
- **Strategic Depth**: Risk vs reward for collecting in dangerous areas

### Power-Up Manager
- **Spawn Logic**: Intelligent placement avoiding hazards
- **Balance System**: Ensures fair distribution across world
- **Visual Polish**: Enhanced rendering with gradients and effects
- **Integration**: Seamless integration with game progression

---

## 📹 Camera & Zoom System

### Dynamic Zoom Mechanics
Automatic camera zoom that responds to player growth:

#### Zoom Calculation
```javascript
// Every 100+ size increases zoom out by 10%
const zoomOutFactor = Math.floor(playerSize / 100) * 0.1;
const targetZoom = Math.max(0.3, 1.0 - zoomOutFactor);
```

#### Zoom Features
- **Automatic Scaling**: Zoom out as player grows larger
- **Minimum Zoom**: 30% zoom out maximum (prevents too much zoom)
- **Smooth Transitions**: Gradual zoom changes for smooth gameplay
- **Effective Viewport**: Calculates actual visible world area
- **Performance Optimized**: Efficient zoom calculations

### Camera Behavior
- **Size-Based Zoom**: Larger cells see more of the world
- **Smooth Following**: Interpolated camera movement
- **Boundary Constraints**: Prevents camera from leaving world bounds
- **Zoom Indicators**: Visual feedback showing current zoom level

### Enhanced Minimap
- **Zoom-Aware**: Minimap viewport reflects actual camera zoom
- **Accurate Representation**: Shows exactly what area is visible
- **Zoom Level Display**: Shows current zoom percentage
- **Real-Time Updates**: Minimap updates with camera changes

---

## 🎨 Visual Systems

### Cell Rendering
- **Organic Shapes**: Mathematical blob generation using sine waves
- **Consistent Appearance**: Fixed shape seeds prevent "spinning"
- **Gradient Effects**: Radial gradients for depth
- **Size Scaling**: Proportional visual scaling

### Enemy Rendering
- **Amoeba**: Translucent, flowing blob shapes with enhanced wobble
- **Virus**: Spiky outlines with contrasting colors
- **Pattern Recognition**: Distinct visual styles for each enemy type

### Environmental Rendering
- **Biome Patterns**: Dots, stripes, and solid patterns
- **Hazard Shapes**: Irregular polygon boundaries with ray casting
- **Current Streams**: Smooth Bezier curves with wave motion
- **Dynamic Effects**: Animated patterns and flowing motion

### Camera System
- **Smooth Following**: Interpolated camera movement
- **Boundary Constraints**: Prevents camera from leaving world
- **Dynamic Zoom**: Automatic zoom-out based on player size growth
- **Zoom Indicators**: Visual feedback showing current zoom level
- **Effective Viewport**: Calculates actual visible world area

---

## ⚙️ Game Mechanics

### Collision Detection
- **Circle-Based**: Efficient radius-based collision for cells
- **Polygon-Based**: Ray casting for irregular hazards
- **Stream-Based**: Distance calculations for wave currents
- **Performance Optimized**: Spatial partitioning for large numbers of objects

### Growth System
```javascript
// Growth mechanics
eatingSmallerCell() {
    this.radius += target.radius * 0.3;
    this.health = Math.min(100, this.health + 20);
    this.score += target.radius * 10;
}
```

### Health System
- **Decay Rate**: Health decreases over time
- **Restoration**: Eating cells restores health
- **Death Threshold**: Game over at 0 health
- **Visual Feedback**: Health bar and color changes

### Scoring System
- **Base Score**: Points for eating cells
- **Size Bonus**: Larger size = higher multiplier
- **Survival Time**: Time-based scoring
- **Final Stats**: Size, survival time, death cause

---

## 🖥️ UI and HUD

### Game HUD
- **Health Bar**: Current health percentage
- **Score Display**: Real-time score counter
- **Size Indicator**: Current cell radius
- **Mini Map**: Player position relative to world size

### Mini Map Features
- **Player Dot**: Shows player position
- **World Scale**: Represents entire world size
- **Camera Frame**: Shows current view area (zoom-aware)
- **Position Tracking**: Real-time position updates
- **Zoom Indicator**: Displays current zoom percentage
- **Accurate Viewport**: Reflects actual visible game area

### Game Over Screen
- **Final Score**: Total points achieved
- **Final Size**: Largest radius reached
- **Survival Time**: How long player survived
- **Death Cause**: How the player died
- **Restart Button**: Play again option

### Menu System
- **Game Selection**: Integration with GameHub platform
- **Settings**: Configurable game options
- **Controls**: Input method selection

---

## 📚 Tutorial System (Recently Enhanced)

### Interactive Tutorials
Context-sensitive tutorials that guide new players:

#### Tutorial Types
- **Movement**: WASD/Arrow key controls
- **Eating**: How to consume smaller cells
- **Avoiding**: How to avoid larger threats
- **Power-ups**: How to collect beneficial items
- **Viruses**: Warning about dangerous virus connections

#### Tutorial Features
- **Smart Triggers**: Appears when relevant elements are encountered
- **Visual Overlays**: Highlight specific game elements
- **Non-Intrusive**: Can be dismissed and won't reappear
- **Progressive Learning**: Introduces concepts as needed
- **Testing Integration**: Can be disabled via debug panel
- **Enable/Disable Toggle**: Full tutorial system can be toggled on/off
- **Tutorial Persistence**: Remembers what tutorials have been shown

### Tutorial Manager
- **Context Detection**: Identifies when tutorials should appear
- **Priority System**: Manages tutorial order and importance
- **Visual Polish**: Smooth animations and clear instructions
- **Player Choice**: Option to skip or disable tutorials

---

## 🧪 Testing & Debug Features (Recently Enhanced)

### Testing Panel
Built-in testing interface for development and debugging:

#### Testing Controls
- **No Tutorial Toggle**: Disable tutorial system for testing (now fully functional)
- **God Mode**: Player invincibility for testing
- **Fast Growth**: Accelerated growth for testing
- **Debug Information**: Show detailed game state information
- **Performance Metrics**: Monitor FPS and object counts
- **Object Spawning**: Individual spawn buttons for all game objects
- **Quick Actions**: Reset all testing options

#### Debug Features
- **Object Counts**: Display number of cells, enemies, power-ups
- **Performance Stats**: Real-time FPS and memory usage
- **State Information**: Current game state and player stats
- **Console Integration**: Browser console access for advanced debugging

### Testing Manager
- **Panel Integration**: Manages testing interface
- **State Persistence**: Remembers testing preferences
- **Feature Toggles**: Enable/disable various debug features
- **Development Tools**: Streamlined development workflow

---

## 🏗️ Technical Architecture

### Core Classes

#### Game.js
- **Main Game Loop**: Update and render cycle
- **State Management**: Menu, playing, game over states
- **Object Management**: Player, cells, enemies, environment
- **Collision Handling**: All collision detection and response

#### Player.js
- **Player Logic**: Movement, health, growth
- **Visual Properties**: Shape, color, animations
- **Input Handling**: Keyboard response
- **Rendering Data**: Properties for renderer

#### Cell.js
- **AI Behavior**: State machine implementation
- **Survival Logic**: Health, eating, growth
- **Movement AI**: Wander, hunt, flee behaviors
- **Visual Consistency**: Shape and appearance

#### Enemy.js (Base Class)
- **Enemy AI**: Aggressive behaviors
- **Attack Systems**: Engulfing and killing mechanics
- **Target Acquisition**: Finding and pursuing prey
- **Clustering**: Group behavior for viruses

#### AmoebaEnemy.js
- **Engulfing Logic**: Consuming smaller cells
- **Unpredictable Movement**: Irregular pathfinding
- **Visual Rendering**: Flowing, translucent appearance

#### VirusEnemy.js
- **Killing Mechanics**: Attacking larger cells
- **Clustering Behavior**: Group coordination
- **Spiky Visuals**: Distinctive appearance
- **Persistent Hunting**: Long-term pursuit

#### EnvironmentManager.js
- **Biome Management**: Creating and updating biomes
- **Hazard Generation**: Irregular shape creation
- **Current Spawning**: Wave stream generation
- **Effect Application**: Environmental impacts on cells

#### PowerUp.js & PowerUpManager
- **Power-Up Logic**: Collectible item mechanics
- **Spawn System**: Intelligent power-up placement
- **Effect Application**: Permanent player enhancements
- **Visual Rendering**: Enhanced power-up graphics

#### EnhancedUI.js
- **Advanced HUD**: Enhanced user interface elements
- **Power-Up Display**: Visual feedback for active effects
- **Damage Indicators**: Visual damage feedback
- **Notification System**: Game event notifications

#### TutorialManager.js
- **Tutorial System**: Context-sensitive help system
- **Smart Triggers**: Automatic tutorial activation
- **Visual Overlays**: Highlighting game elements
- **Progress Tracking**: Tutorial completion state

#### TestingManager.js
- **Debug Interface**: Built-in testing tools
- **Feature Toggles**: Enable/disable debug features
- **Performance Monitoring**: FPS and object tracking
- **Development Tools**: Streamlined testing workflow

#### VirusGroupManager.js
- **Virus Clustering**: Group behavior for virus enemies
- **Connection System**: Virus-to-virus connections
- **Group Coordination**: Coordinated virus attacks
- **Size Calculation**: Effective group size for combat

#### Renderer.js
- **Canvas Rendering**: All visual output
- **Shape Generation**: Blob and irregular shapes
- **Animation Systems**: Flowing and pulsing effects
- **Camera Integration**: World-to-screen conversion with zoom
- **Minimap Rendering**: Zoom-aware minimap display

### File Structure
```
games/Cellvive/
├── index.html              # Game HTML structure
├── styles.css              # Game styling
├── main.js                 # Entry point
├── CellviveGame.js         # GameHub wrapper
├── js/
│   ├── Game.js             # Main game logic
│   ├── Player.js           # Player cell
│   ├── Cell.js             # AI cells
│   ├── Enemy.js            # Base enemy class
│   ├── AmoebaEnemy.js      # Amoeba enemies
│   ├── VirusEnemy.js       # Virus enemies
│   ├── VirusGroupManager.js # Virus clustering system
│   ├── InputHandler.js     # Input management
│   ├── Renderer.js         # Visual rendering with zoom
│   ├── CollisionDetector.js # Collision system
│   ├── Biome.js            # Biome system
│   ├── Obstacle.js         # Obstacle system
│   ├── Hazard.js           # Hazard system
│   ├── Current.js          # Current system
│   ├── EnvironmentManager.js # Environment coordination
│   ├── PowerUp.js          # Power-up system
│   ├── ParticleSystem.js   # Particle effects
│   ├── EnhancedUI.js       # Advanced UI system
│   ├── TutorialManager.js  # Tutorial system
│   ├── TestingManager.js   # Debug and testing tools
│   └── Constants.js        # Game configuration
├── test_*.html             # Testing files
└── CELLVIVE_DOCUMENTATION.md # This file
```

---

## ⚙️ Configuration

### Game Settings
```javascript
const config = {
    // World settings
    worldSize: 3000,
    worldSizeMultiplier: 3,
    
    // Player settings
    playerSpeed: 3.0,
    playerHealthDecay: 0.02,
    
    // AI settings
    maxCells: 50,
    cellSpawnRate: 0.01,
    maxEnemies: 25,
    enemySpawnRate: 0.02,
    
    // Environment settings
    maxBiomes: 15,
    maxObstacles: 20,
    maxHazards: 12,
    maxCurrents: 8,
    
    // Power-up settings
    maxPowerUps: 15,
    powerUpSpawnRate: 0.005,
    powerUpLifetime: 30000, // 30 seconds
    
    // Camera and zoom settings
    zoom: {
        enabled: true,
        zoomOutFactor: 0.1, // 10% zoom out per 100 size
        zoomOutInterval: 100, // Every 100 size units
        minZoom: 0.3, // Minimum zoom level (30% zoom out max)
        zoomTransitionSpeed: 0.05 // Smooth transition speed
    },
    
    // UI settings
    showPowerUpStatus: true,
    showMinimap: true,
    showDebugInfo: false,
    showGrid: false
};
```

### Debug Commands
```javascript
// Available in browser console
window.game.player.radius = 100;        // Set player size
window.game.worldSize = 5000;           // Change world size
window.game.spawnEnemy();               // Spawn enemy
window.game.environmentManager.spawnInitialElements(); // Reset environment
window.game.powerUpManager.spawnPowerUp(); // Spawn power-up
window.game.camera.zoom = 0.5;          // Set camera zoom
window.game.enhancedUI.toggleMinimap(); // Toggle minimap
window.game.tutorialManager.clearCurrentTutorial(); // Clear tutorial
```

---

### Potential Future Features 🔮
- [ ] Evolution system with trait upgrades
- [ ] Level progression system
- [ ] Advanced AI behaviors (flocking, territory)


---

## 🎯 Game Design Philosophy

### Core Principles
1. **Emergent Gameplay**: Simple rules create complex interactions
2. **Visual Clarity**: Clear visual feedback for all game states
3. **Balanced Challenge**: Difficulty scales with player progression
4. **Organic Feel**: Natural, flowing animations and behaviors
5. **Performance First**: Smooth 60fps gameplay with many objects

### Design Goals
- **Survival Focus**: Every decision should impact survival
- **Growth Satisfaction**: Meaningful progression through size increase
- **Environmental Interaction**: World feels alive and reactive
- **Competitive Ecosystem**: AI creates dynamic, unpredictable challenges
- **Visual Appeal**: Beautiful, organic visuals that enhance gameplay

---

## 📊 Technical Specifications

### Performance Targets
- **60 FPS**: Smooth gameplay on modern browsers
- **50+ Objects**: Support for many cells, enemies, and environmental elements
- **Large World**: 3000x3000 unit world with efficient rendering
- **Real-time Collision**: Instant collision response for all interactions

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **HTML5 Canvas**: Full canvas API support required
- **ES6+ Features**: Modern JavaScript features used throughout
- **No Dependencies**: Pure JavaScript implementation

### Memory Management
- **Object Pooling**: Reuse objects to prevent garbage collection
- **Efficient Rendering**: Only render visible objects
- **Smart Culling**: Remove off-screen objects from processing
- **Cleanup Systems**: Proper cleanup on game restart

---

*This documentation reflects the current state of Cellvive as of the latest development iteration. The game continues to evolve with new features and improvements, maintaining a focus on emergent gameplay, visual clarity, and smooth performance.*
