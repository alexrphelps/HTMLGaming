# Platform Documentation

GameHub is a static iframe-only launcher for standalone HTML games. It intentionally avoids host-level game lifecycle controls so each game can remain isolated and self-contained.

## Architecture

```
index.html
app.js
games.config.js
ui/
├── GameSelector.js
└── GameScreen.js
utils/
├── EventEmitter.js
├── GameMetadata.js
└── SafeStorage.js
games/
└── <folder>/index.html
```

`games.config.js` is the source of truth for registration. `GameSelector` reads `window.GAMEHUB_GAMES`, validates common config issues, normalizes metadata with `GameMetadata`, and creates an iframe-backed launch class for every entry.

`GameScreen` owns the reusable game frame: Back to Menu, current title, and `.game-container`. `GameHubIframeGame` mounts the standalone iframe into that container.

`GameHubApp` orchestrates navigation, launch, cleanup, notifications, and platform events. It does not pause, resume, restart, fullscreen, or configure running games.

## Platform Events

GameHub uses the existing `EventEmitter` pattern for platform-level activity:

- `game:launch:start`
- `game:launch:success`
- `game:launch:error`
- `game:cleanup`
- `library:favorites-changed`
- `library:recently-played-changed`
- `game:selected`

## Persistence

`SafeStorage` backs library state only:

- Custom game order
- User ratings
- Favorites
- Recently played timestamps

Game-specific saves, settings, audio, graphics, and progress belong inside each standalone game.

## Game Registration

Minimum entry:

```javascript
{
    folder: 'my-game'
}
```

Recommended entry:

```javascript
{
    folder: 'my-game',
    name: 'My Game',
    description: 'A short card description.',
    category: 'Arcade',
    difficulty: 'Medium',
    icon: 'MG',
    tags: ['keyboard'],
    estimatedPlayTime: 10,
    input: 'Keyboard',
    rendering: 'Canvas',
    saveSupport: 'Local'
}
```

GameHub launches `games/my-game/index.html`. Platform adapter classes are no longer part of the contract.

## Verification

Run focused Jest checks:

```bash
npx jest --coverage=false __tests__ --runInBand
```

For manual verification, open `index.html`, confirm the library renders, favorites persist, recent sorting updates after launch, card ratings work, and Back to Menu returns from an iframe game.
