# Sky Squirrel - Wingsuit Game

A 3D third-person wingsuit game built with Three.js and modular JavaScript architecture.

## Game Concept

- Start on a mountain peak with a flat platform
- Walk around the plateau using WASD controls
- Jump off the edge to enter wingsuit flight mode
- Glide through the air with realistic physics
- Enjoy 2-3 minutes of flight time over the mountain terrain

## Controls

### **Walking Mode:**
- **WASD** - Move around
- **Space** - Jump

### **Flight Mode:**
- **W/S** - Pitch control (unlimited up/down)
- **A/D** - Roll control (bank left/right)
- **Q/E** - Yaw control (turn left/right)

### **Camera Controls:**
- **Mouse** - Orbit camera around player
- **Scroll Wheel** - Zoom in/out
- **Click** - Enable mouse controls
- **Escape** - Exit pointer lock

## How to Run

1. Open `index.html` in a modern web browser
2. Click anywhere on the screen to enable mouse controls
3. Use WASD to walk around the plateau
4. Walk to the edge and press Space to jump into flight mode
5. Use WASD to control your wingsuit in the air

## Architecture

The game uses a modular ES6 architecture with the following components:

- **main.js** - Entry point and game initialization
- **Game.js** - Core game loop and scene management
- **Player.js** - Player logic with state machine (walking/jumping/flying)
- **InputHandler.js** - Keyboard and mouse input handling
- **CameraController.js** - Third-person follow camera
- **Terrain.js** - Procedural mountain terrain generation
- **Physics.js** - Simple physics system for gravity and collisions

## Features

- ✅ Procedural mountain terrain with plateau
- ✅ Third-person camera with smooth following
- ✅ Player state machine (walking → jumping → flying)
- ✅ Realistic wingsuit physics with reduced gravity
- ✅ Collision detection with terrain
- ✅ Mouse look controls with pointer lock
- ✅ Real-time UI showing speed, altitude, and mode
- ✅ Shadow mapping and realistic lighting

## Future Enhancements

- Physics engine integration (Ammo.js/Cannon.js)
- GLTF wingsuit model import
- Air resistance and turbulence effects
- Near-miss scoring system
- Sound effects (footsteps, wind rush)
- Multiple levels and objectives
- Multiplayer support

## Technical Details

- Built with Three.js r128 (compatible with older browsers)
- Uses regular JavaScript (no ES6 modules for file:// compatibility)
- WebGL rendering with shadow mapping
- Procedural terrain generation with noise
- Simple physics system for gravity and collisions
- Responsive design that works on desktop browsers
- Compatible with direct file opening (no web server required)

## Browser Requirements

- Modern browser with WebGL support
- Pointer Lock API support (for mouse controls)
- No web server required - works with direct file opening
