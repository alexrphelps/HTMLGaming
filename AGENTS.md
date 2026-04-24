# AGENTS.md - GameHub Development Guide

Guidelines for agentic coding agents working in this codebase.

## Project Overview

GameHub is a modular HTML5 game platform with complete game isolation. Each game runs independently via iframe integration or native Canvas rendering. No build system - games run directly in the browser by opening `index.html`.

---

## Development Commands

### Running the Application

```bash
start index.html          # Windows
open index.html          # macOS
xdg-open index.html      # Linux
```

### Testing

No formal test framework exists. Manual testing by opening `index.html` in browser, selecting games, and verifying gameplay. To add tests, consider Jest/Mocha or Playwright for headless testing.

---

## Code Style Guidelines

### Language & Standards
- **ES6+ JavaScript** - Use classes, arrow functions, async/await, destructuring
- **No TypeScript** - Pure JavaScript codebase
- **No external dependencies** - Games are self-contained

### File Organization

```
games/[game-name]/
├── [GameName].js     # GameHub wrapper class (required)
├── index.html        # Standalone game (iframe pattern)
├── js/               # Game-specific JS
├── css/              # Game-specific CSS
└── assets/           # Images, audio, data
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `GameHubApp`, `SnakeGame` |
| Methods | camelCase | `init()`, `cleanup()` |
| Constants | UPPER_SNAKE | `MAX_SPEED`, `DEFAULT_COLORS` |
| Private fields | _camelCase | `_currentGame`, `_gameLoop` |
| DOM IDs | kebab-case | `game-screen`, `back-to-menu` |
| CSS classes | kebab-case | `game-card`, `nav-btn` |

### Class Interface

```javascript
class MyGame {
    constructor() {
        this.metadata = { name: 'My Game', description: 'A fun game', category: 'Arcade', difficulty: 'Medium', icon: '🎮', tags: ['2d'], version: '1.0.0', author: 'Name', estimatedPlayTime: 10 };
    }
    async init() { /* Initialize game, create canvas/iframe */ }
    start() { /* Start game loop, enable input */ }
    stop() { /* Pause game loop */ }
    cleanup() { /* Remove canvas/iframe, cleanup listeners */ }
}
```

### Error Handling
- Wrap async operations in try/catch
- Log errors: `console.error('Game init failed:', error)`
- Use toast notifications for user-friendly messages
- Prevent crashes from propagating to the platform

### Event Handling
- Add listeners in `init()` or `setupEventListeners()`
- Always remove listeners in `cleanup()` to prevent memory leaks
- Use arrow functions or `.bind(this)` to preserve context

### Logging
Use emoji-prefixed console logs:
```javascript
console.log('🎮 Game initialized');
console.warn('⚠️ Low memory');
console.error('❌ Failed:', error);
```

---

## Game Integration Patterns

### Iframe Integration (Recommended)

```javascript
async init() {
    this.gameContainer = document.getElementById('game-screen');
    this.iframe = document.createElement('iframe');
    this.iframe.src = 'games/my-game/index.html';
    this.gameContainer.appendChild(this.iframe);
    await new Promise(r => this.iframe.onload = r);
}
cleanup() {
    this.iframe?.remove();
}
```

### Native Canvas Integration

```javascript
async init() {
    this.canvas = document.createElement('canvas');
    document.getElementById('game-screen').appendChild(this.canvas);
    this.gameLoop = setInterval(() => { this.update(); this.render(); }, 1000/60);
}
cleanup() {
    clearInterval(this.gameLoop);
    this.canvas.remove();
}
```

---

## Platform Integration

### Register Games

Add to `ui/GameSelector.js` in `registerDefaultGames()`:
```javascript
{ name: 'Game Name', gameClass: typeof GameClass !== 'undefined' ? GameClass : null, metadata: { ... } }
```

### Access Platform Features
- Settings: `window.gameHubApp.settings`
- Navigation: `window.gameHubApp.navigateTo('screen-name')`
- Notifications: `window.gameHubApp.showNotification(message, type)`

---

## Best Practices

1. **Game Isolation** - Each game independent, no shared state
2. **Proper Cleanup** - Always implement cleanup() to remove listeners, intervals, DOM elements
3. **Focus Management** - Call `this.iframe.focus()` in start() for iframe games
4. **Error Boundaries** - Wrap init in try/catch to prevent platform crashes
5. **Memory Leaks** - Clear intervals, remove listeners, null references in cleanup()

---

## Browser Support

Chrome 80+, Firefox 75+, Safari 13.1+, Edge 80+ (ES6, Canvas 2D, localStorage required)