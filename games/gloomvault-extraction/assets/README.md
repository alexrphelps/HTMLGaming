# Gloomvault Asset Drop Folders

Add PNG files with these names and the game will pick them up automatically.

## Character Sprites

Place sprite sheets in `sprites/`:

- `player.png` - 64x64 frames, rows: idle, run, attack. Each row should loop 5-10 horizontal frames; the default manifest expects 8.
- `enemy.png` - generic fallback enemy sheet, 64x64 frames, rows: idle, run, attack. Each row should loop 5-10 horizontal frames; the default manifest expects 8.
- `enemy-grunt.png` - optional grunt-specific sheet using the same row/frame layout.
- `enemy-ranged.png` - optional ranged-specific sheet using the same row/frame layout.
- `enemy-brute.png` - optional brute-specific sheet using the same row/frame layout.
- `enemy-boss.png` - optional boss-specific sheet using the same row/frame layout.

## Dungeon Tiles

Place fallback single-tile images in `tiles/`. These are drawn at the game tile size.

- `floor.png` - base floor tile.
- `floor-detail-1.png` - optional decorative floor overlay.
- `wall.png` - base visible wall tile.
- `wall-edge.png` - wall edge/cap overlay; the renderer rotates it toward adjacent floor.
- `door-locked.png` - closed boss entrance.
- `door-open.png` - opened/unlocked boss entrance.

Map-themed terrain lives in `tiles/maps/[map-key]/`:

- `floor/base.png` - opaque seamless 128x128 walkable ground.
- `floor/variant-01.png` and `floor/variant-02.png` - subtle deterministic floor variants.
- `wall/mask-000.png` etc. - transparent 128x128 blocking wall sprites using normalized 8-neighbor masks.
- `objects/door-locked.png` and `objects/door-open.png` - boss entrance states.

Wall mask bits are N=1, E=2, S=4, W=8, NE=16, SE=32, SW=64, NW=128. Diagonal bits are normalized away unless both adjacent cardinal neighbors are present, producing the standard 47-mask autotile set.

## Loot Icons

Place square item icons in `icons/loot/`:

- Armor: `helm-1.png` to `helm-8.png`, `chest-1.png` to `chest-8.png`, `pants-1.png` to `pants-8.png`, `boots-1.png` to `boots-8.png`.
- Weapons: `wand-1.png` to `wand-4.png`, `staff-1.png` to `staff-4.png`, `crossbow-1.png` to `crossbow-4.png`, `bow-1.png` to `bow-4.png`.
- Melee weapons: `shortsword-1.png` to `shortsword-4.png`, `lance-1.png` to `lance-4.png`, `axe-1.png` to `axe-4.png`.
- Trinkets: `trinket-1.png` to `trinket-8.png`.

Loot items choose from the matching type pool deterministically from item metadata, so the same item keeps the same icon between UI refreshes. Missing files fall back to the existing colored item labels.
