# 🤖 Gloomvault Extraction - AI Context & State Tracker

**Notice to AI Agents:** Read this document first to understand the current state of the Gloomvault Extraction project before making changes. Update this document as you complete major milestones.

## 📌 Project Overview
A real-time top-down 3/4 perspective dungeon crawler with extraction mechanics and randomized loot progression. Built using pure JavaScript and HTML5 Canvas 2D for the GameHub platform.

## 🏗️ Architecture & Design Decisions
*   **Integration:** Runs in an iframe wrapper (`GloomvaultExtraction.js`) via GameHub.
*   **Perspective:** Top-down 3/4 view (not true isometric).
*   **Engine:** Custom `requestAnimationFrame` loop in `js/core/GameEngine.js`.
*   **Rendering:** Canvas 2D (`js/core/Renderer.js`), currently using geometric shapes, structured to support sprite sheets with 5-10 frames per animation in the future.
*   **World:** Procedurally generated continuous grid (Cluster Blob rooms, 2-tile wide wobbling cave corridors, and cellular automata smoothing) via `js/systems/MapGen.js`. Configurations are externalized in `js/config/MapConfig.js`.
*   **Input:** WASD movement, Mouse aiming (relative to camera), Shift to dodge. Handled by `js/core/Input.js`.

## 🟢 Current State (Phase 4 Completed)
*   **Menu Shell:** `index.html` and `style.css` implemented for screen switching.
*   **Core Engine:** Active. Delta time, update/render loops, and AABB separated-axis wall collision are working perfectly.
*   **Camera:** Follows the player and culls off-screen rendering.
*   **Player:** Can move, dodge (with cooldown), and aim towards the mouse cursor. Base Entity class implemented for health.
*   **Combat:** Primary attack (Left Click) spawns projectiles with cooldowns. Projectiles collide with walls and disappear, spawning floating text feedback.
*   **Map:** Dynamically generates organic cave/dungeon hybrids based on `MapConfig.js`.
*   **Pathfinding & AI:** A* Pathfinding system active. Enemy base class implemented with Grunt (chase/flee), Ranged (kite/shoot), and Brute (telegraph/dash) behaviors. Support for elite modifiers (fast/vampiric).
*   **Enemy Spawning:** Global Pre-population via `SpawnManager.js` (Option A). Entire map is populated with enemies based on floor size and difficulty level, keeping a strict 800-pixel safe zone around the player's spawn.
*   **Combat Resolution:** Projectiles correctly filter collisions based on ownership (Player vs Enemy). Damage numbers pop up on hit, and dead enemies are removed.

---

## 🚀 Execution Roadmap for AI Agents
When starting a new session, pick the lowest incomplete phase and execute it entirely.

### 🎒 Phase 5: Loot & HTML DOM Inventory
1.  **Loot Generation:** Create `js/systems/LootGen.js` to roll Gear Score (depth-based), Rarity (Common/Epic/Legendary), and modifiers.
2.  **World Drops:** Create a `DroppedItem` entity. Add a pickup interaction radius (Press 'E').
3.  **DOM Overlay UI:** Implement the Inventory (5x5 grid) and Equipment slots using HTML `<div>`s in `index.html` and `style.css`.
    *   *Critical:* Hook the Inventory key (Tab/I) to pause the `GameEngine.js` loop and display the HTML overlay. Implement drag-and-drop logic for items.
4.  **Stat Hookup:** Ensure the Player's combat stats dynamically recalculate based on equipped DOM inventory items.

### 🌀 Phase 6: Extraction & Persistence
1.  **The Portal:** Implement `ExtractionPortal` entity. Spawns randomly in rooms. Interacting triggers Extraction Success.
2.  **Stash Persistence:** Use `localStorage`. Move Inventory to Stash on success. Load Stash on game boot.
3.  **Death Penalty:** Wipe the current run's inventory on Player death, but preserve the Stash. Switch to `GAME_OVER` screen.

### 🎨 Phase 7: Polish & Game Feel
1.  **Sprite Integration:** Update `js/core/Renderer.js` to replace rectangles with actual sprite sheets (Idle, Run, Attack).
2.  **Juice:** Add camera screenshake on heavy hits, particle emitters for impacts, and dash trails.
