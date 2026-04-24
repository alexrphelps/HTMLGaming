# GameHub Game Integration Guide

This guide explains how to integrate games into the GameHub platform. GameHub is designed with complete game isolation as its core principle - each game is completely independent with its own engine, core systems, and dependencies.

## 🎯 Core Philosophy

**Game Isolation & Modularity**: Each game is completely independent and self-contained. This ensures:
- **Zero Cross-Game Dependencies** - Games cannot interfere with each other
- **Easy Testing** - Each game can be tested in isolation
- **Simple Maintenance** - Changes to one game don't affect others
- **Flexible Development** - Games can use any technology stack they need

## Integration Patterns

### Pattern 1: Iframe Integration (Recommended for Existing Games)

**When to use:** For existing standalone games that you want to integrate into GameHub.

**Why this pattern:** After extensive testing with the Snake game, we found that trying to recreate complex DOM structures and manage multiple JavaScript files leads to numerous integration issues. The iframe approach completely isolates the game and preserves all its original functionality.

**Benefits:**
- Complete isolation from platform
- No DOM conflicts
- Easy integration
- Reliable cleanup
- Preserves original game functionality

#### Implementation Steps

1. **Create a new folder** in `games/[game-name]/`
2. **Place your existing game** in the folder (HTML, CSS, JS files)
3. **Create a wrapper class** that loads your game in an iframe:

```javascript
class MyGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.metadata = {
            name: 'My Awesome Game',
            description: 'An amazing game experience',
            category: 'Action',
            difficulty: 'Medium',
            icon: '🎮',
            tags: ['2d', 'action', 'arcade'],
            version: '1.0.0',
            author: 'Your Name',
            estimatedPlayTime: 10
        };
        
        console.log('🎮 My Game wrapper created (iframe approach)');
    }
    
    async init() {
        try {
            console.log('🎮 Initializing My Game with iframe approach...');
            
            // Get the game container from GameHub
            this.gameContainer = document.getElementById('game-screen');
            if (!this.gameContainer) {
                console.error('🎮 GameHub game screen not found');
                throw new Error('GameHub game screen not found');
            }

            // Clear any existing content in the game container
            this.gameContainer.innerHTML = '';

            // Create an iframe to load your original game
            this.iframe = document.createElement('iframe');
            this.iframe.src = 'games/my-game/index.html';
            this.iframe.style.width = '100%';
            this.iframe.style.height = '100%';
            this.iframe.style.border = 'none';
            this.iframe.style.backgroundColor = 'var(--background-primary)'; // Match GameHub background
            this.iframe.setAttribute('allowfullscreen', 'true');
            this.iframe.setAttribute('webkitallowfullscreen', 'true');
            this.iframe.setAttribute('mozallowfullscreen', 'true');
            this.iframe.setAttribute('tabindex', '0'); // Make iframe focusable

            this.gameContainer.appendChild(this.iframe);

            // Wait for the iframe to load
            await new Promise(resolve => {
                this.iframe.onload = () => {
                    console.log('🎮 My Game iframe loaded.');
                    resolve();
                };
            });

            console.log('🎮 My Game initialized successfully (iframe)');
            
        } catch (error) {
            console.error('🎮 Error initializing My Game:', error);
            throw error;
        }
    }

    start() {
        console.log('🎮 Starting My Game (iframe)...');
        // Focus the iframe to ensure input works
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    stop() {
        console.log('🎮 Stopping My Game (iframe)...');
        // No specific stop logic needed for iframe, as it's removed on cleanup
    }

    cleanup() {
        console.log('🎮 Cleaning up My Game (iframe)...');
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
        this.gameContainer = null;
        console.log('🎮 My Game cleaned up (iframe)');
    }

    // Optional: Methods to communicate with the iframe if needed
    sendMessageToGame(message) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(message, '*');
        }
    }
}
```

4. **Register your game** in the platform by adding it to the games array in `app.js`:

```javascript
// In app.js, add to the games array
{
    name: 'My Awesome Game',
    gameClass: MyGame,
    metadata: {
        name: 'My Awesome Game',
        description: 'An amazing game experience',
        category: 'Action',
        difficulty: 'Medium',
        icon: '🎮',
        tags: ['2d', 'action', 'arcade'],
        version: '1.0.0',
        author: 'Your Name',
        estimatedPlayTime: 10
    }
}
```

#### Real-World Example: Snake Game

The Snake game demonstrates this pattern perfectly:

```javascript
// games/snake/SnakeGame.js
class SnakeGame {
    constructor() {
        this.gameContainer = null;
        this.iframe = null;
        this.metadata = {
            name: 'Snake!',
            description: 'Classic Snake game with AI opponents and multiple food types',
            category: 'Arcade',
            difficulty: 'Easy',
            icon: '🐍',
            tags: ['2d', 'classic', 'arcade', 'ai'],
            version: '1.0.0',
            author: 'GameHub Team',
            estimatedPlayTime: 5
        };
    }

    async init() {
        this.gameContainer = document.getElementById('game-screen');
        this.gameContainer.innerHTML = '';
        
        this.iframe = document.createElement('iframe');
        this.iframe.src = 'games/snake/index.html';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        this.iframe.style.border = 'none';
        this.iframe.style.backgroundColor = 'var(--background-primary)';
        
        this.gameContainer.appendChild(this.iframe);
        
        await new Promise(resolve => {
            this.iframe.onload = resolve;
        });
    }

    start() {
        if (this.iframe) {
            this.iframe.focus();
        }
    }

    cleanup() {
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
            this.iframe = null;
        }
    }
}
```

### Pattern 2: Native Integration (For New Games)

**When to use:** For games built specifically for GameHub from the ground up.

**Benefits:**
- Direct access to platform features
- Better performance
- Shared utilities
- Platform integration

#### Implementation Steps

1. **Create a new folder** in `games/[game-name]/`
2. **Create your game class** that integrates directly with GameHub:

```javascript
class MyNativeGame {
    constructor() {
        this.gameContainer = null;
        this.canvas = null;
        this.ctx = null;
        this.gameLoop = null;
        this.metadata = {
            name: 'My Native Game',
            description: 'Built specifically for GameHub',
            category: 'Puzzle',
            difficulty: 'Easy',
            icon: '🧩',
            tags: ['2d', 'puzzle', 'native'],
            version: '1.0.0',
            author: 'Your Name',
            estimatedPlayTime: 15
        };
    }

    async init() {
        console.log('🧩 Initializing My Native Game...');
        
        this.gameContainer = document.getElementById('game-screen');
        if (!this.gameContainer) {
            throw new Error('GameHub game screen not found');
        }

        // Clear any existing content
        this.gameContainer.innerHTML = '';

        // Create your game canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.border = 'none';
        
        this.ctx = this.canvas.getContext('2d');
        this.gameContainer.appendChild(this.canvas);

        // Initialize your game systems
        this.setupEventListeners();
        this.loadAssets();
        
        console.log('🧩 My Native Game initialized successfully');
    }

    start() {
        console.log('🧩 Starting My Native Game...');
        this.gameLoop = setInterval(() => {
            this.update();
            this.render();
        }, 1000 / 60); // 60 FPS
    }

    stop() {
        console.log('🧩 Stopping My Native Game...');
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
            this.gameLoop = null;
        }
    }

    cleanup() {
        console.log('🧩 Cleaning up My Native Game...');
        this.stop();
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        this.canvas = null;
        this.ctx = null;
        this.gameContainer = null;
    }

    setupEventListeners() {
        // Add your event listeners here
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    loadAssets() {
        // Load your game assets here
    }

    update() {
        // Your game logic here
    }

    render() {
        // Your rendering code here
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Draw your game
    }

    handleKeyDown(event) {
        // Handle input here
    }
}
```

## Best Practices

### 1. Game Isolation
- **Keep games completely independent** - No shared state between games
- **Use iframe pattern for existing games** - Preserves original functionality
- **Implement proper cleanup** - Always clean up resources when exiting

### 2. Error Handling
- **Handle initialization errors gracefully** - Don't crash the platform
- **Provide meaningful error messages** - Help with debugging
- **Implement fallback mechanisms** - Graceful degradation

### 3. Performance
- **Clean up resources properly** - Prevent memory leaks
- **Use efficient rendering** - Optimize for 60 FPS
- **Minimize DOM manipulation** - Use canvas for games when possible

### 4. User Experience
- **Focus management** - Ensure input works correctly
- **Responsive design** - Work on different screen sizes
- **Loading states** - Show progress during initialization

## Common Pitfalls

### 1. DOM Conflicts
**Problem:** Games interfere with each other's DOM elements
**Solution:** Use iframe pattern for existing games

### 2. Global Variable Pollution
**Problem:** Games overwrite each other's global variables
**Solution:** Complete isolation through iframe or proper namespacing

### 3. Event Listener Conflicts
**Problem:** Games interfere with each other's event listeners
**Solution:** Proper cleanup and isolation

### 4. Memory Leaks
**Problem:** Games don't clean up resources properly
**Solution:** Implement comprehensive cleanup methods

## Testing Checklist

### Before Integration
- [ ] Game works standalone
- [ ] All assets load correctly
- [ ] Input handling works
- [ ] Audio works (if applicable)
- [ ] Game can be paused/resumed
- [ ] Game can be exited cleanly

### After Integration
- [ ] Game loads in GameHub
- [ ] Game starts correctly
- [ ] Input works in GameHub
- [ ] Game exits cleanly
- [ ] No console errors
- [ ] No memory leaks
- [ ] Game can be loaded multiple times
- [ ] Other games still work

### Cross-Game Testing
- [ ] Load Game A, then Game B - both work
- [ ] Load Game A, exit, load Game B - both work
- [ ] Load Game A, load Game B, exit both - no issues
- [ ] Platform navigation works with all games

## File Structure

### Iframe Integration
```
games/
└── my-game/
    ├── MyGame.js          # GameHub integration wrapper
    ├── index.html         # Original standalone game
    ├── css/
    │   └── style.css      # Game's own styling
    ├── js/
    │   ├── main.js        # Game's main logic
    │   ├── game.js        # Game logic
    │   └── utils.js       # Game utilities
    └── assets/
        ├── images/
        ├── sounds/
        └── data/
```

### Native Integration
```
games/
└── my-native-game/
    ├── MyNativeGame.js    # GameHub integration
    ├── css/
    │   └── style.css      # Game styling
    ├── js/
    │   ├── game.js        # Game logic
    │   └── utils.js       # Game utilities
    └── assets/
        ├── images/
        ├── sounds/
        └── data/
```

## Conclusion

The iframe integration pattern is recommended for existing games as it provides complete isolation and preserves original functionality. For new games built specifically for GameHub, native integration offers better performance and platform integration.

Remember: **Game isolation is the key to a reliable platform**. Each game should be completely independent and self-contained.

---

*For more technical details, see `PLATFORM_DOCUMENTATION.md`*