# Game Integration Guide

GameHub is now an iframe-only launcher. A game should be a complete standalone web page that can run on its own at `games/<folder>/index.html`.

## Minimum Integration

Create this shape:

```
games/my-game/
├── index.html
├── js/
├── css/
└── assets/
```

Then register it in `games.config.js`:

```javascript
window.GAMEHUB_GAMES = [
    {
        folder: 'my-game',
        name: 'My Game',
        description: 'A short description for the library card.',
        category: 'Arcade',
        difficulty: 'Medium',
        icon: 'MG',
        tags: ['arcade', 'keyboard'],
        version: '1.0.0',
        author: 'Your Name',
        estimatedPlayTime: 10,
        aiEffortRating: 3,
        defaultRating: 3,
        input: 'Keyboard',
        rendering: 'Canvas',
        saveSupport: 'Local'
    }
];
```

`folder` is the only required field. GameHub derives a readable name and safe defaults for missing metadata.

## Runtime Contract

GameHub loads:

```text
games/<folder>/index.html
```

The platform frame owns only:

- Back to Menu
- The current game title
- The iframe host container

Everything else belongs to the game. If a game needs pause, restart, volume, graphics settings, fullscreen, FPS, HUD, or save/load controls, implement those inside the game page.

## Metadata Fields

Common fields:

- `folder`: folder under `games/`
- `name`: library display name
- `description`: card summary
- `category`: category filter value
- `difficulty`: `Easy`, `Medium`, or `Hard`
- `icon`: short text or emoji shown on the card
- `tags`: searchable tags
- `version`: game version
- `author`: creator name
- `estimatedPlayTime`: minutes
- `aiEffortRating`: 1 to 5 stars
- `defaultRating`: default user-facing rating
- `input`: concise input hint, such as `Keyboard`
- `rendering`: concise rendering hint, such as `Canvas`
- `saveSupport`: concise save hint, such as `Local`

Avoid adding platform adapter classes. Historical adapter files can remain in game folders, but GameHub does not load or call them.

## Testing

Run the focused Jest suite after platform changes:

```bash
npx jest --coverage=false __tests__ --runInBand
```

Manual launch checks are still useful: open `index.html`, launch the game, confirm it appears in the iframe, interact with it, and return with Back to Menu.
