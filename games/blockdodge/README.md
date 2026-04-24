# Block Dodge 🎮⬛

A fast-paced arcade survival game where you control a square and dodge falling blocks as difficulty increases over time!

## 🎯 Game Overview

**Block Dodge** is a simple yet addictive reflex-testing game built with pure HTML5, CSS3, and JavaScript. Test your reflexes and see how long you can survive as the blocks fall faster and spawn more frequently!

### Core Features
- **Pure HTML5** - Single-file game with no external dependencies
- **Smooth 60 FPS** gameplay using requestAnimationFrame
- **Progressive difficulty** - Blocks get faster and spawn more frequently every 10 seconds
- **Score tracking** - Local high score saved in localStorage
- **Modern UI** - Clean, arcade-style visuals with gradients and glow effects
- **Keyboard controls** - Arrow keys or WASD for movement
- **Instant restart** - Press SPACE or click to restart after game over

## 🎮 How to Play

### Controls
- **Arrow Keys** or **WASD Keys** - Move in all directions (up, down, left, right)
- **SPACE** or **Click** - Restart game (when game over)

### Objective
Survive as long as possible by dodging blocks coming from all directions! As you progress, blocks will start spawning from multiple directions, making the game increasingly challenging.

### Scoring
- Earn **10 points** for every block that passes off the bottom of the screen
- The longer you survive, the higher your score
- Try to beat your high score!

### Difficulty Scaling
Every 10 seconds, the game gets harder:
- Blocks move **0.5 units faster**
- Blocks spawn **50ms more frequently**
- Minimum spawn interval: **200ms**
- **New block directions unlock progressively:**
  - **Level 3**: Upward-moving blocks (bottom to top)
  - **Level 6**: Rightward-moving blocks (left to right)
  - **Level 9**: Leftward-moving blocks (right to left)

## 📁 File Structure

```
games/blockdodge/
├── index.html              # Standalone single-file game
├── BlockDodgeGame.js       # GameHub integration wrapper
└── README.md              # This file
```

## 🔧 Technical Details

### Architecture
The game follows a clean, modular architecture:

1. **Configuration System** - All game parameters in a CONFIG object
2. **Entity Classes** - Player and Block classes with their own update/draw logic
3. **Game State Management** - Centralized gameState object
4. **Game Loop** - Fixed 60 FPS using requestAnimationFrame
5. **Collision Detection** - AABB (Axis-Aligned Bounding Box) algorithm
6. **Persistence** - High scores saved in localStorage

### Code Structure

```javascript
// Game Configuration
CONFIG = {
    canvas: { ... },
    player: { ... },
    block: { ... },
    difficulty: { ... }
}

// Main Classes
class Player {
    update()   // Handle movement input
    draw()     // Render player with glow effects
    getBounds() // Collision detection
}

class Block {
    update()   // Move downward and rotate
    draw()     // Render with rotation and glow
    getBounds() // Collision detection
}

// Game Functions
initGame()          // Initialize/reset game
gameLoop()          // Main game loop (60 FPS)
update()            // Update game logic
render()            // Render all elements
checkCollision()    // Collision detection
increaseDifficulty() // Scale difficulty
```

### Performance Optimizations
- Fixed timestep game loop for consistent physics
- Efficient collision detection with early exits
- Canvas shadow blur only where needed
- Array splice for removing off-screen blocks
- LocalStorage caching for high scores

## 🎨 Visual Design

### Color Scheme
- **Player**: Bright cyan (#00ff88) with glow effect
- **Blocks**: Various shades of red/orange with rotation
- **Background**: Dark navy (#1a1a2e) with subtle grid
- **UI**: Semi-transparent panels with backdrop blur

### Effects
- **Glow effects** on player and blocks
- **Rotation animation** on falling blocks
- **Smooth transitions** for game over screen
- **Pulsing animation** on restart hint

## 🔌 GameHub Integration

### Integration Pattern
Block Dodge uses the **Iframe Integration** pattern for complete isolation:

```javascript
class BlockDodgeGame {
    constructor() { /* Metadata */ }
    async init()  { /* Create iframe */ }
    start()       { /* Focus iframe */ }
    cleanup()     { /* Remove iframe */ }
}
```

### Benefits
- Complete isolation from platform
- No DOM conflicts
- Reliable cleanup
- Easy to test standalone

## 🎓 Code Quality

### Best Practices
✅ **ES6+ Syntax** - Modern JavaScript features  
✅ **Modular Design** - Clear separation of concerns  
✅ **Clean Code** - Descriptive names and comments  
✅ **Error Handling** - Graceful error recovery  
✅ **Documentation** - Comprehensive inline comments  
✅ **Maintainability** - Easy to modify and extend

### Code Comments
Every major section includes detailed comments:
- Configuration explanation
- Class method documentation
- Algorithm descriptions
- System overviews

## 🚀 Future Enhancement Ideas

Potential features to add:
- [ ] Power-ups (slow-motion, shield, etc.)
- [ ] Different block types (bouncy, explosive, etc.)
- [ ] Combo system for dodging multiple blocks
- [ ] Visual themes / skins
- [ ] Sound effects and background music
- [ ] Particle effects on collision
- [ ] Leaderboard system
- [ ] Mobile touch controls
- [ ] Progressive web app (PWA) support

## 🧪 Testing Checklist

### Standalone Testing
- [x] Game loads without errors
- [x] Player moves left and right correctly
- [x] Blocks spawn and fall
- [x] Collision detection works
- [x] Score increases correctly
- [x] Difficulty scales over time
- [x] Game over triggers on collision
- [x] High score saves and loads
- [x] Restart functionality works
- [x] 60 FPS performance maintained

### Platform Integration Testing
- [x] Loads in GameHub iframe
- [x] Input works in iframe
- [x] Game exits cleanly
- [x] No memory leaks
- [x] Multiple play sessions work
- [x] Back button returns to menu

## 📊 Game Statistics

| Metric | Value |
|--------|-------|
| File Size | ~13 KB (single HTML file) |
| Lines of Code | ~600 lines |
| Target FPS | 60 |
| Difficulty Tiers | Unlimited (scales infinitely) |
| Initial Block Speed | 3 units/frame |
| Speed Increase | 0.5 units/frame per tier |
| Initial Spawn Rate | 1000ms |
| Min Spawn Rate | 200ms |

## 🎯 Achievement Ideas

Fun challenges for players:
- **Survivor** - Survive for 30 seconds
- **Veteran** - Survive for 60 seconds
- **Master Dodger** - Survive for 120 seconds
- **Century Club** - Score 1000 points
- **Difficulty 10** - Reach difficulty level 10
- **Perfect Timing** - Dodge 100 blocks without getting hit

## 🐛 Known Issues

None at this time! The game is fully functional and tested.

## 📝 Version History

### v1.0.0 (Current)
- Initial release
- Core gameplay mechanics
- Difficulty scaling system
- High score tracking
- Modern UI design
- GameHub integration

## 👨‍💻 Developer Notes

### Code Philosophy
This game demonstrates:
1. **Simplicity** - Single file, no dependencies
2. **Clarity** - Clean, readable code with comments
3. **Performance** - Optimized for 60 FPS
4. **Modularity** - Easy to extend and modify
5. **Best Practices** - Modern JavaScript patterns

### Learning Opportunities
Great for learning:
- Canvas API and 2D rendering
- Game loop architecture
- Collision detection algorithms
- Input handling
- State management
- LocalStorage persistence
- CSS animations and effects

## 📄 License

Part of the GameHub platform. Free to use, modify, and extend!

---

**Created by**: GameHub Team  
**Version**: 1.0.0  
**Last Updated**: 2025

Enjoy the game! 🎮⬛
