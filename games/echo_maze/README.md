# Echo Maze

Echo Maze is a top-down maze survival game about reading signals, collecting useful discoveries, and pushing deeper into the maze while staying ahead of the danger that wakes with every step.

## Game Overview

The core loop is simple:

1. Explore the maze.
2. Collect items and learn what they do.
3. Stabilize Echo Anchors.
4. Survive the rising pressure of the maze.
5. Escape through the Exit Portal.

The game is built around tension between exploration and caution. Light, speed, mapping, protection, and signal reading all matter, and the maze becomes more dangerous as the run progresses.

## Main Features

### Two Play Modes

- `Beginner` mode introduces the game one item at a time.
- `Classic` mode is the full run with the complete item pool and normal pressure.

### Objective-Based Runs

- Echo Anchors are the main objectives.
- Stabilizing Anchors advances the run.
- A run is won by completing the Anchor objective chain and reaching the Exit Portal.

### Maze Exploration

- The maze is generated as a large connected world made of chunks.
- Biomes add variety and change the feel of different regions.
- The minimap and revealed tiles help you keep your bearings.

### Signal Reading

- Compass Lenses improve Anchor detection.
- The Compass helps you read the direction of the next objective.
- Signal strength becomes more useful as you gather more lenses.

### Item Collection

Echo Maze includes a clear set of item types with distinct roles:

- `Lantern Core` - expands vision.
- `Quickstep Boots` - increases movement speed.
- `Phase Crystal` - restores Phase charges for wall slipping.
- `Compass Lens` - strengthens Anchor tracking.
- `Map Fragment` - reveals nearby maze structure.
- `Ward Shield` - adds protection.
- `Echo Battery` - restores health and stabilizes your lantern.
- `Lost Relic` - rare score treasure that also grants a Phase charge.

### Progression and Upgrades

- Runs award upgrades between milestones.
- Upgrade choices appear as a small set of clear options.
- Upgrades support movement, visibility, Phase usage, and survival.

### Threat System

- The maze grows more dangerous over time.
- Enemies appear and pressure increases as Anchors are secured.
- The Warden adds a stronger late-run chase threat.
- Different enemy types create different movement and pursuit patterns.

### Survival Tools

- Vision starts limited and can be improved.
- Phase lets you briefly slip through walls.
- Shields absorb damage before health is lost.
- Batteries can restore health and reduce danger pressure.

### Tutorial Flow

- Beginner mode teaches the game in sequence.
- Each lesson focuses on one item or one core system.
- The tutorial ends by transitioning into the normal run structure.

### HUD and Feedback

- The HUD shows the most important run stats.
- The overlay presents menus, tutorial info, upgrade choices, and end-of-run results.
- Messages and visual effects reinforce pickups, danger, and major state changes.

## Controls

- `WASD` or arrow keys: move
- `Space`: use Phase
- `Escape`: pause or back out of menus

## What Makes Echo Maze Distinct

- It combines maze exploration with objective hunting instead of pure survival.
- Player power grows through meaningful finds, not just raw score.
- The tutorial is part of the game flow, not a separate dead-end mode.
- The maze stays readable through signal, map, and reveal mechanics rather than brute-force memorization.

## Entry Points

- `index.html` is the main game entry.
- `echo_maze.html` is the dedicated launcher page.

## Intended Experience

Echo Maze is designed to feel like:

- a tense exploration run,
- a steady climb in capability,
- a readable but dangerous maze,
- and a race to finish before the Warden closes the gap.

