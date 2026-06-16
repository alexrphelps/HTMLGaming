Mini Invaders - Dev Notes
=========================

Summary
-------
 - Consolidated input handling to SmartInputManager and integrated it into the main index.html.
- Disabled the legacy STUCK_KEY_FIX.js (moved to STUCK_KEY_FIX.js.disabled) to avoid duplicate listeners and intervals.
- Updated CODE_IMPROVEMENTS_GUIDE.md to recommend SmartInputManager and to update script include instructions.

Why
---
Multiple overlapping input systems caused duplicate event listeners, duplicate intervals, and potential memory leaks and unexpected behavior. SmartInputManager is the authoritative, cleaned-up implementation and should be used in the improved miniinvaders page.

Files of Interest
-----------------
- SmartInputManager.js - canonical input system (contains stuck-key detection and cleanup)
- MiniInvadersConfig.js / MiniInvadersState.js / MiniInvadersTalents.js / MiniInvadersFormations.js / MiniInvadersCombat.js - extracted testable browser-script modules
- GameLoop.js - canonical loop owner used by index.html to prevent stacked requestAnimationFrame loops
- MemoryManager.js - loaded by index.html for managed audio/resource cleanup
- InputManager.js - legacy reference only; do not load it or add new tests against it
- STUCK_KEY_FIX.js.disabled - disabled to avoid duplication
- ImprovedMiniInvaders.html was removed; main index.html now uses SmartInputManager
- CODE_IMPROVEMENTS_GUIDE.md - documentation updated

Recommended Next Steps
----------------------
1. Manual QA: open ImprovedMiniInvaders.html in a browser and validate controls and stuck-key behavior.
2. Continue extracting high-churn game rules from index.html into small browser-script modules.
3. Keep tests pointed at the modules loaded by index.html; legacy InputManager coverage should not be expanded.

Notes
-----
- This branch: feature/input-consolidation
- Last commit: chore(miniinvaders): consolidate input to SmartInputManager and disable duplicate stuck-key script; update docs
