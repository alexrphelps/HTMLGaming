# Gloomvault Extraction - AI State

Read this before changing Gloomvault Extraction. Keep it current when you make meaningful gameplay, architecture, data-model, or workflow changes.

## Current Product Shape

Gloomvault Extraction is a pure JavaScript HTML5 Canvas extraction roguelite embedded in GameHub through `GloomvaultExtraction.js`, which creates an iframe pointed at `games/gloomvault-extraction/index.html`.

The game is playable as a standalone page and uses global browser scripts rather than modules or a build step. Load order in `index.html` matters because classes/configs are attached to global scope.

Current gameplay loop:

1. Use stash equipment and saved scraps from `localStorage`.
2. Select a map family or Random.
3. Enter a generated dungeon floor.
4. Fight, loot, equip, use trinkets, find rare dungeon services, descend, or extract.
5. Extraction lets the player move loot into stash or salvage it for scraps.
6. Rare Blacksmith and Void Bank objects can provide mid-run crafting/stash access, and rare Healing Wells can restore the player once while granting a temporary regeneration buff.
7. Death deletes active equipment and run inventory, but leaves stash/scraps intact.

## Architecture Map

- `GloomvaultExtraction.js`: GameHub wrapper. Creates/removes iframe and focuses it on start.
- `index.html`: All screen markup and script load order. Contains main menu, map select, stash, extraction, play canvas, inventory overlay, dungeon service overlay, action bar, stacked boss health rows, durability HUD, and minimap canvas.
- `css/style.css`: Full standalone UI and game overlay styling.
- `js/main.js`: DOM coordinator. Creates the engine, asset manager, screen controller, inventory UI controller, and exposes `window.gloomvaultApp`.
- `js/core/GameEngine.js`: Runtime orchestrator. Owns canvas loop, map selection state, entity arrays, dungeon service spawning/interactions, extraction/death, boss-room flow, guardian spawn flow, borrowed boss powers, minimap render call, and dev helpers. HUD updates are controller-owned, with small legacy fallbacks only for isolated tests.
- `js/core/Input.js`: Keyboard and mouse state. Attached to canvas by the engine, with idempotent `attach()`, `detach()`, and `destroy()` cleanup.
- `js/core/Camera.js`: Fixed world-space viewport, browser-DPR backing canvas handling, zoom for dev mode, map clamping, screenshake, and world/screen transforms.
- `js/core/Renderer.js`: Drawing helpers and minimap rendering.
- `js/systems/MapGen.js`: Procedural map generation, layout families, connectivity repair, boss-room placement, floor lookup helpers, 2x2 service-object placement helpers, and transition position queries.
- `js/systems/SpawnManager.js`: Enemy population from map size, effective floor, safe-zone, and difficulty/dev multipliers.
- `js/systems/FloorOrchestrator.js`: Single floor-generation path. Selects map config, creates `MapGen`, prepares/keeps player loadout, resets floor entities, populates enemies, and places portals, chests, transitions, services, guardians, and boss-room entities through engine APIs.
- `js/systems/ProjectileCombatResolver.js`: Projectile update/collision service for player/enemy projectile hits, lifesteal, thorns, stagger/knockback, ability projectile cleanup, and impact feedback.
- `js/systems/InventoryTransferService.js` and `js/systems/DropZoneBinder.js`: Shared inventory movement/salvage rules and reusable drag/drop binding for stash, extraction, dungeon service, and run inventory UI.
- `js/systems/EquipmentStatsService.js`: Shared equipment/stat projection for player recalculation and inventory/stash stat display. Keep modifier application, broken-item exclusions, weapon projection, gear score, dodge cooldown, and lifesteal formatting here rather than duplicating stat math in UI.
- `js/systems/EnemyFactory.js`: Data-driven enemy base stat and weapon setup used by `Enemy`.
- `js/systems/Pathfinder.js`: A* tile pathing for enemy chase/wander behavior.
- `js/systems/LootGen.js`: Item generation, rarity, affixes, implicits, weapon subtypes, trinket active abilities, traits, durability initialization, and guaranteed minimum-rarity encounter rewards.
- `js/config/BossConfig.js`: Data-driven boss/guardian registry. Defines boss identities, AI overrides, thresholds, modifiers, borrowed powers, and encounter tags.
- `js/systems/Weapon.js`: Weapon archetype behavior. Attacks return `Projectile` instances. Used by player and enemies.
- `js/systems/UpgradeSystem.js`: Scrap upgrade, salvage, repair, and upgrade-preview logic.
- `js/systems/DevPanel.js`: Backtick debug panel when `DevConfig.DEV_MODE_ENABLED` is true. Can spawn loot, chests, enemies, transitions, portals, Blacksmiths, and Void Banks.
- `js/systems/ParticleSystem.js` and `CombatFeedback.js`: Visual juice and floating text.
- `js/entities/*`: Base entity plus player, enemies, projectiles, dropped loot, extraction portal, floor transitions, chests, boss-room seal buttons, and dungeon service objects. `Enemy.js` now supports boss-tier runtime metadata, shields, thresholds, modifiers, and borrowed powers without separate boss subclasses.
- `js/config/*`: Tuning for map families, difficulty, combat caps/formulas, loot pools, upgrade costs, durability, minimap, and dev overrides.
- `js/config/EnemyAIConfig.js`: Enemy awareness, movement, role, squad, and dodge tuning for patrol and combat behavior.
- `js/config/AssetManifest.js` + `js/systems/AssetManager.js`: Sprite and image registration for player/enemy sheets, loot icons, extraction portal frames, and dungeon service object variants. Blacksmith and Void Bank art is now selected by variant key, with primitive render fallback still preserved.
- `js/entities/LootChest.js`: Loot chests now support deterministic sprite variants with matching closed/opened art, sprite-first rendering with primitive fallback, and a locked-state overlay treatment for boss-room reward chests.

## Runtime Data And Persistence

LocalStorage keys currently used:

- `gloomvault_stash`: Stash array.
- `gloomvault_equipment`: Starting gear and active equipment persisted on extraction. Removed on death.
- `gloomvault_scraps`: Scrap currency.

Important item shape:

```js
{
    id,
    name,
    type,              // helm, chest, pants, boots, weapon, trinket
    weaponType,        // weapon only
    element,           // weapon only; frost, fire, felfire, holy, shadow, poison, arcane, or null
    weaponVariant,     // weapon only; currently overcharged for Staff Burst
    rarity, color,
    gearScore,
    modifiers,
    upgradeLevel,
    activeAbility,     // trinket only
    passiveTrait,
    baseArmor,
    durability,        // non-trinket non-starter items
    maxDurability,
    isStarter
}
```

Starter equipment migration is centralized through `EquipmentService`, `InventoryStore`, and `LoadoutService`. New loadout defaults should be changed there rather than in UI or engine code.

## Current Gameplay Systems

### Controls

- WASD: move.
- Mouse: aim.
- Left mouse: weapon slot 1 primary attack.
- Right mouse: weapon slot 2 attack.
- Q/E: trinket 1/2 active abilities.
- Shift: dodge.
- Tab or I: pause and open inventory overlay.
- F: contextual interaction for loot, chests, portals, floor transitions, boss-room entrance/buttons, Blacksmiths, and Void Banks.
- Backtick: dev panel when dev mode is enabled.

### Player And Combat

- Player has HP, optional shield, shield regen after not taking damage, dodge, melee lunge, inventory, equipment, two weapon slots, two trinket slots, and active HoTs.
- Stats are recalculated from non-broken equipment modifiers in `Player.recalculateStats()`.
- Damage taken flows through `CombatConfig.calculateDamageTaken(rawDamage, armor, damageReduction)`.
- Lifesteal, thorns, knockback, stagger, wall-slam bonus damage, screenshake, sparks, and floating text are implemented in the engine/entity/projectile path.
- Enemies use explicit AI states for patrol, wander, investigate, chase, reposition, attack, flee, dodge, and stagger. Non-boss enemies can patrol in squads, share nearby squad aggro, and some ranged/grunt enemies dodge predicted player ranged projectiles on cooldown.
- Boss-tier enemies are still `Enemy` instances, but they can carry a `bossProfile` with tier, AI overrides, thresholds, hooks, modifiers, borrowed powers, and HUD tags.
- Damage-over-time status effects accumulate their actual HP damage and show colored floating damage text roughly twice per second, using the status effect color.
- Broken weapons cannot be used. Broken armor provides no stats.

### Weapons And Abilities

- Internal weapon archetype IDs remain `pistol`, `shotgun`, `assault_rifle`, `sniper`, `melee_stab`, and `melee_cleave`, but the current fantasy presentation is Wand, Staff, Crossbow, Longbow, Shortsword/Lance, and Greataxe/Scythe.
- Wands and Staffs always roll an element. Crossbows and Longbows have a 50% element chance. Melee weapons have a 25% element chance. Enemy weapons use the same roll rules.
- Elements are `frost` slow, `fire` long burn, `felfire` short stacking burn, `holy` radiance death projectile spread, `shadow` amplify plus player projectile pierce, `poison` sickness short-range death projectile spread, and `arcane` charge-to-release damage scaling.
- Active status effects render colored glow arcs around enemies and the player. Multiple active effect colors split the glow circle evenly.
- Arcane player weapons charge while mouse is held and fire on release or at the 3 second cap. Max charge is 1.5x damage.
- Staff Burst is the shotgun-style attack behavior, but generated item names use `Staff`; the `overcharged` staff variant displays as `Overcharged Staff` and staggers enemies hit at melee range.
- Melee weapons are projectile-like short-lived hit volumes; player melee gets a damage multiplier.
- Rapier is fast and grants movement speed but does not lunge. Lance increases lunge duration.
- Trinket actives: heal, nova, dash, heal-over-time.
- Action bar shows both weapons and trinket cooldowns.

### Loot, Stash, Upgrades, Durability

- Rarities: Common, Epic, Legendary.
- Gear score is floor-scaled, then multiplied by rarity.
- Armor pieces get base armor plus slot implicits. Weapons use clean archetype names with only element and variant prefixes, while trinkets are named from active ability identity.
- Armor prefixes/suffixes and random modifier pools are config-driven in `LootConfig`.
- Epic/Legendary items may roll passive traits with tradeoffs.
- Enemies have a default 20% loot-drop chance, overrideable through visible dev panel settings.
- Chests drop 2-5 items and force at least one Epic/Legendary if necessary.
- Scraps come from salvage and pay for upgrades/repairs.
- Upgrades max at +5, boost gear score/mod values by 10% per level, upgrade trinket ability payloads, and fully repair the item.
- Repair cost scales with missing durability, gear score, and rarity.
- Rare Blacksmith objects spawn as 2x2 floor services and open a mid-run crafting overlay for player inventory/equipment salvage, upgrades, and repairs.
- Rare Void Bank objects spawn as 2x2 floor services and open full mid-run stash access, including stash transfer, equipment swaps, salvage, upgrades, and repairs.
- Rare Healing Well objects spawn as 2x2 floor services. They close after one use, heal the player to full, and add stackable 90 second passive buffs that each grant 10% max HP and heal 2% of current max HP every 5 seconds.

### Maps, Floors, Extraction

- `MapConfigs` currently includes nine map keys: `default`, `rigid_dungeon`, `deep_caverns`, `the_labyrinth`, `arena_halls`, `crypt_crossroads`, `ironforged`, `fractured_rift`, `gauntlet_passage`.
- Layout types include sequential, hub, ring, cluster, and linear. `structured` support exists in `MapGen` but no current map config uses it.
- Map selection is run-scoped. Random chooses from all `MapConfigs`.
- Floors are generated fresh on start and descent. Existing player is preserved on descent, but map/entities/projectiles/drops reset.
- Effective floor for difficulty/loot is `(currentFloor - 1) + gearDifficultyFloor`.
- Gear difficulty floor is calculated from equipped gear score on a new run.
- Extraction portal appears on even-numbered floors at the final room when possible and renders a four-frame animated sprite sequence with the canvas portal as fallback.
- Doors and holes act as floor transitions. A fallback exit is ensured if random placement fails.
- Transitions and portals block interaction while nearby enemies are within their own enemy-check radius.
- Dungeon service objects spawn independently per floor at low chance: Blacksmith 8%, Void Bank 6%, Healing Well 7%. They require reachable 2x2 floor space in non-start rooms and avoid nearby exits, chests, boss buttons, and other service objects.
- Minimap uses fog of war and an expanded inventory minimap drawn on a second canvas.
- The regular minimap has a DOM label underneath showing current floor and generated map display name.

### Boss Rooms

- Optional boss rooms are generated by `MapGen` and intentionally sealed with a locked entrance tile.
- Boss rooms now roll one main boss from the `BossConfig` roster, plus one optional curated boss modifier and one optional borrowed trinket-style power from that boss's allowlist.
- Boss rooms spawn three seal buttons outside the boss room and 2-3 locked reward chests.
- Activating all seal buttons unlocks the entrance, but the tile remains closed until the player presses F at the entrance.
- Boss HUD is now a stacked encounter panel that only shows boss-tier enemies currently in combat.
- Main boss death still uses chest-style loot, unlocks boss-room chests, and triggers screenshake.
- A floor guardian mini-boss has an 8% spawn chance outside boss rooms, uses the same boss-tier runtime/HUD plumbing, and guarantees one uncommon-or-better drop.
- Connectivity code must preserve sealed boss rooms and validate that opened boss rooms are reachable.

## High-Risk Couplings And Maintenance Notes

- Script order is dependency order. If converting to modules, plan the migration instead of moving tags casually.
- `InventoryUiController.js` remains large and mixes stash, extraction, service overlays, tooltip rendering, and inventory HUD updates. Future UI work should prefer extracting focused controllers/services rather than adding more closure state.
- `GameEngine.start()` always calls `generateFloor(false)`. Re-entering play from menu starts a new run. Avoid adding menu transitions that accidentally call it twice.
- `GameEngine.generateFloor()` intentionally delegates only to `FloorOrchestrator`; avoid reintroducing fallback floor-generation logic in the engine.
- `Input.attach()` is idempotent and `destroy()` removes keyboard/canvas listeners. Keep new input listeners behind `Input` or `EventRegistry` so iframe cleanup stays reliable.
- `InventoryUiController` persistent document/window/button/stat listeners should go through `EventRegistry` via its local `addUiEvent()` helper. Direct listeners are acceptable for generated item elements that are removed with their parent cells.
- `AbilitySystem` owns player trinket ability resolution, decoys, ability-created runtime effects, and ability projectile cleanup. Prefer adding new trinket/ability runtime behavior there instead of growing `GameEngine`.
- HUD action bar, health/shield, boss rows, durability, interaction hints, and passive buffs are owned by `HudController`/`HudAdapter`. Avoid reintroducing duplicated HUD mutation paths in `GameEngine` except compatibility fallbacks for prototype-style tests.
- Camera intentionally caps visible world space and scales to the canvas backing size. Do not change canvas resize/zoom logic without checking browser zoom cannot reveal extra dungeon area.
- Minimap and inventory minimap depend on `Renderer.renderMinimap()` and `mapGen.visitedGrid`.
- Boss room locked entrances are represented by wall tiles until opened. Connectivity/pruning code must not delete or prematurely open these.
- Add new bosses, guardian variants, modifiers, or borrowed powers in `js/config/BossConfig.js` first. Only extend `GameEngine`/`Enemy` when a new mechanic truly needs runtime support.
- The docs and old comments may say "isometric"; implementation is top-down 3/4/orthographic Canvas, not true isometric.
- `DevConfig.DEV_MODE_ENABLED` is currently true in source. Be deliberate before shipping or committing gameplay changes with dev mode enabled.
- Generated coverage files are often dirty after tests. Do not stage or revert coverage unless the task explicitly asks.

## Tests And Verification

There is Jest coverage under `tests/coverage/Gloomvault.systems.test.js`. It exercises map generation/connectivity, boss-room behavior, engine fallback exits, loot/upgrade/durability branches, player/trinket behavior, and weapon variants.

Recommended checks after meaningful changes:

```bash
npm test -- tests/coverage/Gloomvault.systems.test.js
```

Manual smoke test:

1. Open `index.html`.
2. Launch Gloomvault Extraction.
3. Select Random and confirm movement, aiming, attacks, inventory, minimap, and interactions.
4. Use stash, salvage, upgrade, repair, and extraction screens.
5. Use the dev panel to spawn Blacksmith and Void Bank objects, then verify mid-run service overlays pause/resume correctly.
6. If touching maps/bosses, force or repeatedly run map generations and verify all runs have an exit and boss rooms open/reward correctly.

## Future Work Backlog

- Continue splitting `InventoryUiController.js` into stash, extraction, service, inventory, and tooltip modules.
- Extract enemy AI role behaviors from `Enemy.js` behind an `EnemyAiController` or role-behavior modules once additional enemy types are added.
- Decide whether weapon slot 2 is intended to remain a second weapon attack or become a true secondary ability system.
- Add richer boss mechanics beyond current chase/cleave boss.
- Add quick-equip/unequip and better inventory quality-of-life.
- Add sprite/audio asset pipeline while keeping primitive fallbacks.
- Add progression locks for `progressionTier` map metadata.
- Expand legendary effects into actual gameplay hooks beyond passive stat traits.
