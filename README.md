# GameHub

GameHub is a lightweight HTML5 game launcher. The platform provides the library UI, favorites, ratings, custom ordering, recently played sorting, the current game title, and a reliable Back to Menu button. Every game itself runs as a standalone page in an iframe.

There is no build step for the platform. Open `index.html` directly or serve the folder with any static web server.

## Project Structure

```
HTMLGaming/
├── index.html
├── app.js
├── games.config.js
├── css/
│   └── main.css
├── ui/
│   ├── GameSelector.js
│   └── GameScreen.js
├── utils/
│   ├── EventEmitter.js
│   ├── GameMetadata.js
│   └── SafeStorage.js
├── games/
│   └── your-game/
│       └── index.html
└── __tests__/
```

## Adding A Game

Minimum contract:

1. Add a standalone game at `games/<folder>/index.html`.
2. Add an entry to `games.config.js`.

Example:

```javascript
{
    folder: 'my-game',
    name: 'My Game',
    description: 'A compact arcade challenge.',
    category: 'Arcade',
    difficulty: 'Medium',
    icon: 'MG',
    tags: ['arcade'],
    estimatedPlayTime: 10
}
```

GameHub will launch `games/my-game/index.html` in the shared game frame. Pause, restart, volume, fullscreen, graphics quality, FPS, save/load UI, and any HUD belong inside the standalone game page if that game needs them.

## Platform State

GameHub stores library preferences with `SafeStorage`: custom order, ratings, favorites, and recently played timestamps. Older localStorage keys are still read for compatibility where supported.

## Tests

The repo uses Jest for focused platform and game checks.

```bash
npx jest --coverage=false __tests__ --runInBand
```

You can also manually verify the launcher by opening `index.html`, favoriting games, launching a game, returning with Back to Menu, and confirming recently played sorting updates.
