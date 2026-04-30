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

## 🟢 Current State (Phase 6 Completed)
*   **Menu Shell:** `index.html` and `style.css` implemented for screen switching, including Stash and Game Over screens.
*   **Core Engine:** Active. Delta time, update/render loops, and AABB separated-axis wall collision are working perfectly.
*   **Camera:** Follows the player and culls off-screen rendering.
*   **Player:** Can move, dodge (with cooldown), aim, and has a fully functional inventory system with stat recalculation.
*   **Combat:** Primary attack (Left Click) spawns projectiles with cooldowns. Projectiles collide with walls and disappear, spawning floating text feedback.
*   **Map:** Dynamically generates organic cave/dungeon hybrids based on `MapConfig.js`.
*   **Pathfinding & AI:** A* Pathfinding system active. Enemy base class implemented with Grunt (chase/flee), Ranged (kite/shoot), and Brute (telegraph/dash) behaviors. Support for elite modifiers (fast/vampiric).
*   **Enemy Spawning:** Global Pre-population via `SpawnManager.js` (Option A). Entire map is populated with enemies based on floor size and difficulty level, keeping a strict 800-pixel safe zone around the player's spawn.
*   **Combat Resolution:** Projectiles correctly filter collisions based on ownership (Player vs Enemy). Damage numbers pop up on hit, and dead enemies are removed.
*   **Loot & Inventory:** Enemies have a chance to drop loot when killed. Dropped items can be picked up with 'E'. An HTML DOM-based inventory overlay handles dragging and dropping items between the backpack (5x5 grid) and equipment slots, correctly recalculating player stats on the fly.
*   **Extraction & Persistence:** `ExtractionPortal` entity spawns in the deepest room of the dungeon. Interacting with it successfully extracts the player, saving equipped items to `gloomvault_equipment` and moving backpack items to the persistent `gloomvault_stash` in `localStorage`.
*   **Death Penalty:** If the player dies, their active inventory and equipped items are permanently lost. The stash remains untouched. A "GAME OVER" screen effectively communicates the failure state.
*   **🛠️ Recent Fixes:** Added safe checks for stash null items, updated grid rendering to correctly parse UI slots, properly updated HP.

---

## 🚀 Execution Roadmap for AI Agents
When starting a new session, pick the lowest incomplete phase and execute it entirely.

### 🎨 Phase 7: Polish & Game Feel
1.  **Sprite Integration:** Update `js/core/Renderer.js` to replace rectangles with actual sprite sheets (Idle, Run, Attack).
2.  **Juice:** Add camera screenshake on heavy hits, particle emitters for impacts, and dash trails.

### ✨ Additional Enhancements & Future Changes
*   **Advanced Loot Generation:** Implement prefix/suffix system natively visible on item names.
*   **Unique Legendary Effects:** Add custom logic hooks for legendary items (e.g. chance to shoot 3 projectiles, explode on hit, trigger chain lightning).
*   **Secondary Abilities (Right Click) & Trinkets (Q/E):** Expand the `Weapon` class to support a secondary attack and connect Trinket equipment slots to active ability triggers.
*   **Floor Transitions:** Add stairs down to advance to higher difficulty floors during the same run before extracting.
*   **Boss Mechanics:** Create dedicated Boss entities with phased combat, AoE hazard attacks, charges, and projectile bursts.
*   **Inventory Quality of Life:** Add right-click quick-equip/unequip functionality to bypass manual drag-and-drop.
