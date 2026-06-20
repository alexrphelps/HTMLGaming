# Lumenkin

Lumenkin is a five-chapter pixel-art evolutionary campaign. A run begins with one bioluminescent creature and repeatedly changes scale and genre until that creature's descendants carry a living civilization through the Great Bloom.

The central design contract is:

> Every chapter should feel mechanically different, while inherited bodies, behaviors, culture, and ecological choices remain meaningful in later chapters.

This document describes both the player experience and the implementation contracts future contributors and coding agents should preserve.

## Game Overview

One lineage moves through five chapters:

1. **First Glow** - side-view care-schedule management.
2. **The Brood** - top-down family expedition management.
3. **Living City** - three-quarter colony management.
4. **Worldroot** - island-scale ecological statecraft.
5. **The Great Bloom** - living-ark voyage planning.

Players choose when to trigger each metamorphosis after completing the chapter objective. A metamorphosis commits a permanent branch to the lineage and retires the previous chapter's active simulation.

The current GameHub metadata describes Lumenkin as:

- Category: `Simulation`
- Difficulty: `Medium`
- Input: `Keyboard + Mouse`
- Rendering: `Canvas`
- Save support: `Campaign`
- Estimated campaign length: 75-100 minutes

## Core Design Pillars

### Vastly Different Chapters

New chapters should introduce a new scale, camera, interaction model, and decision space. Do not turn chapter progression into a cosmetic reskin of the same loop.

### Permanent Lineage

Early decisions must have visible and mechanical consequences later. A branch should affect several of the following where relevant:

- movement or survival capabilities,
- creature silhouettes and markings,
- autonomous behavior,
- family coordination,
- architecture,
- diplomacy and ecological policy,
- living-ark organs,
- final migration options.

Avoid branches that only add an isolated percentage bonus.

### Resilient Ecology

Failure should emerge from understandable pressures and usually provide a recovery opportunity. Extinction remains possible, but ordinary setbacks should create stories rather than abruptly erase a healthy campaign.

### Decision-Dense Life

The world remains animated in real time, but gameplay time advances only when the player resolves a complete three-commitment plan. Inspection and plan editing are free. Every resolved cycle must create a meaningful outcome; never require idling for resources, cooldowns, threats, or objective progress.

### Pixel-Art Continuity

The camera and sprite scale change between chapters, but the founder's body family, palette, markings, cultural symbols, and architecture should remain recognizable throughout the lineage.

## Controls

Every chapter is led with the mouse and remains keyboard navigable with Tab and Enter. Canvas clicks inspect or select targets; they never directly move creatures.

### First Glow

- Plan morning, afternoon, and dusk care commitments
- Resolve the day to see autonomous needs, discoveries, and relationships develop

### The Brood

- Assign founder, adult kin, and young kin to expedition roles
- Resolve the expedition to gather, defend, nurture, scout, or reinforce

### Living City

- Set one civic priority and two seasonal projects
- Citizens perform routine work autonomously from their aptitudes and needs

### Worldroot

- Select regions, commit three council mandates, and resolve the season

### The Great Bloom

- Choose a route, ark-organ duty, and crew posture for each voyage leg
- Resolve seeded encounters while preserving hull, stores, cohesion, and the seedbank

## Technical Architecture

Lumenkin follows the repository's no-build browser-script architecture:

- Pure ES6+ JavaScript
- No TypeScript
- No runtime package dependencies
- No bundler
- No module loader
- One browser-global namespace: `window.Lumenkin`
- Standalone entry point: `games/lumenkin/index.html`
- GameHub registration: `games.config.js`

Scripts must remain in dependency order:

```text
js/config.js
js/rng.js
js/art.js
js/lineage.js
js/save.js
js/input.js
js/chapters.js
js/render.js
js/game.js
js/main.js
```

If a script is added, removed, or reordered, update both `index.html` and `tests/coverage/Lumenkin.static.test.js`.

## File Ownership

### `index.html`

Owns semantic page structure and ordered asset loading. Keep gameplay logic, inline styles, and inline event handlers out of this file.

### `css/style.css`

Owns the responsive shell, HUD, overlays, pixel-panel presentation, accessibility modes, and compact breakpoints.

### `js/config.js`

Owns stable global configuration:

- internal canvas resolution,
- fixed simulation step,
- save schema version and storage keys,
- chapter metadata and targets,
- palettes,
- egg archetypes.

New broadly shared tuning values belong here instead of being duplicated between chapters and rendering.

### `js/rng.js`

Owns deterministic hashing and seeded random generation. Gameplay randomness that must survive save/load or support reproducible tests should derive from the campaign seed.

Do not use `Math.random()` for deterministic world, lineage, or chapter outcomes.

### `js/art.js`

Owns atlas metadata and shared rendering primitives:

- `ArtCatalog`
- `CreatureAppearance`
- `SpriteAssembler`
- `AnimationPlayer`
- `PaletteManager`
- `ParticleSystem`
- `PixelCamera`

Atlas frames define source bounds, pivots, and compatibility tags. Validate every new frame against the real image dimensions.

### `js/lineage.js`

Owns permanent branches, aggregate branch effects, branch eligibility, commitment, and campaign creation.

Branch IDs are persistent save data. Renaming or removing an ID requires a save migration.

### `js/save.js`

Owns serialization, schema checking, autosaves, named slots, and transition checkpoints.

Save data is untrusted input even though it originates in local storage. Validate shapes and render all save-derived strings safely.

### `js/input.js`

Owns keyboard and pointer state and coordinate conversion from the responsive canvas to the fixed 384x216 world.

Every listener added here must be removed by `destroy()`.

### `js/chapters.js`

Owns chapter-specific simulation and actions. Every chapter extends `BaseChapter` and provides:

```javascript
enter()
update(dt)
planModel()
assignOrder(slotId, orderId, targetId)
clearOrder(slotId)
canResolve()
resolveCycle()
objective()
stats()
ready()
serialize()
cleanup()
```

`update()` may advance presentation time only. All gameplay mutation belongs to `resolveCycle()`. Keep renderer-specific frame coordinates out of chapter state; chapter state should represent gameplay truth.

### `js/render.js`

Owns all Canvas drawing and chapter camera presentation. Rendering must not mutate simulation state.

### `js/game.js`

Owns orchestration:

- initialization,
- the fixed-step animation loop,
- chapter lifecycle,
- DOM HUD updates,
- metamorphosis flow,
- panels and settings,
- save timing,
- extinction and victory.

Do not move chapter rules into this controller.

### `js/main.js`

Owns safe browser bootstrapping only.

## Campaign and Save Model

The campaign object is the durable root of a run. Important fields include:

```text
schemaVersion
seed
chapter
elapsed
score
status
lineage
ecology
history
settings
chapterState
checkpoint
```

`lineage` contains the founder appearance, mate appearance, permanent branches, portraits, generation count, and peak population.

`chapterState` belongs exclusively to the active chapter and includes its cycle index, draft plan, stable entity IDs, deterministic encounter history, milestones, and resolved behavior counts. Completed chapters are reduced to lineage history, portraits, branch choices, and other explicit legacy data.

### Save Compatibility Rules

- Increment `CONFIG.schemaVersion` when the persisted shape changes incompatibly.
- Schema-1 real-time campaigns are extracted into safe, read-only legacy records. They are never approximated into the cycle simulation.
- Never silently reinterpret an existing branch ID.
- Do not persist DOM nodes, Canvas objects, image objects, functions, or event listeners.
- Treat malformed or partially missing saves as recoverable errors.
- Closing the page freezes the campaign; there is no offline progression.

## Chapter Contracts

### First Glow

The player should form an attachment to one autonomous creature by planning its daily care. Habitat quality and resolved behavior attract a mate; reproduction is not a generic menu button.

The chapter must preserve:

- readable needs,
- meaningful care schedules and visible autonomous reactions,
- habitat improvement,
- mate attraction and bonding,
- founder appearance and temperament,
- a deliberate morphology choice at metamorphosis.

### The Brood

The player assigns living family groups to expedition roles rather than possessing an individual. Individual health, inherited appearance, aptitudes, and family survival matter.

Dead creatures must not move, act, attract predators, reproduce, or count toward objectives.

### Living City

The game changes into management rather than asking the player to care for every individual manually. Autonomy should satisfy routine needs while player priorities shape the settlement.

The long-term target is a bounded individual simulation of up to 120 creatures. Performance optimizations may aggregate rendering and distant work, but should not discard genealogy, aptitudes, age, relationships, or life history.

### Worldroot

The game changes into ecological statecraft across several regions. Restoration, exploitation, diplomacy, settlement, and ark preparation should create genuine tradeoffs.

Every repeatable action requires a limiting factor such as time, capacity, regional exhaustion, political cost, or escalating consequence.

### The Great Bloom

The game becomes a moving-city voyage-planning journey. Each leg combines a route, ark organ, crew posture, and deterministic seeded encounter. The ark must visibly and mechanically inherit morphology, culture, civic development, alliances, and ecological history.

Victory requires:

- reaching compatible land,
- preserving a viable seedbank,
- maintaining hull integrity,
- establishing a self-sustaining successor ecosystem.

## Pixel-Art and Rendering Rules

- Internal resolution is `384x216`.
- Disable Canvas smoothing.
- Snap world rendering to integer coordinates.
- Prefer integer display scaling and letterboxing where the viewport permits it.
- Use hard clusters, colored outlines, limited ramps, and restrained additive glow.
- Do not blur sprite layers to simulate lighting.
- Maintain color-independent status shapes and high-contrast support.
- Keep particles bounded.
- Cache composed creature sprites by appearance, view, and age band.

The local atlas is:

```text
assets/lumenkin-atlas.png
```

Do not overwrite it casually. When changing the atlas:

1. Preserve or deliberately update every referenced frame.
2. Update `FRAME_DATA` in `art.js`.
3. Validate transparent edges and source bounds.
4. Verify every chapter visually.
5. Add or update static atlas tests.

## UI and Accessibility Contracts

- Detailed information should appear on selection or hover rather than permanently covering the world.
- Status must not rely on color alone.
- Preserve reduced-motion, reduced-glow, high-contrast, color-mode, and UI-scale settings.
- Keyboard focus must survive routine HUD refreshes.
- Normal game panels should avoid unnecessary simulation pauses.
- Use `textContent` or explicit DOM construction for save-derived or user-authored strings.
- Maintain usable layouts at desktop and below the `780px` and `520px` breakpoints.

## Testing

Run Lumenkin's focused suite:

```bash
npx jest --coverage=false tests/coverage/Lumenkin.static.test.js --runInBand
```

Run adjacent GameHub regression coverage:

```bash
npx jest --coverage=false tests/coverage/Lumenkin.static.test.js __tests__/GameSelector.behavior.test.js __tests__/FrameworkMaintainability.test.js --runInBand
```

Run syntax checks for browser scripts before browser testing:

```powershell
Get-ChildItem games\lumenkin\js\*.js | ForEach-Object { node --check $_.FullName }
```

### Required Test Scenarios

Future changes should cover behavior rather than only file presence:

- deterministic appearance generation,
- valid inherited anatomy combinations,
- save round-trips at every chapter,
- malformed and unavailable storage,
- branch eligibility and permanent exclusions,
- death removal and extinction,
- every metamorphosis transition,
- transition checkpoint branching,
- bounded resources and repeatable actions,
- campaign victory,
- input cleanup,
- responsive canvas coordinate conversion,
- accessibility settings,
- mature 120-creature performance.

Browser verification should include:

- the egg-selection flow,
- every chapter presentation,
- atlas transparency,
- pixel alignment while moving,
- desktop and compact layouts,
- keyboard-only panel navigation,
- save/load and resume,
- console errors.

## Known Technical Debt

These are existing issues, not intended behavior. Address them before layering large new systems on top:

1. Only one checkpoint is stored, it is overwritten at the next transition, and checkpoint branching is not exposed in the UI.
2. Most inherited anatomy fields are stored but not rendered by `SpriteAssembler`.
3. Later chapters do not yet carry enough founder appearance and cultural symbolism into citizens, settlements, and architecture.
4. The interface uses a system monospace font rather than a bundled bitmap font.
5. `AnimationPlayer` and `PixelCamera` are currently exported but unused.

When fixing these, add regression tests that fail against the old behavior.

## Adding Features Safely

### Adding a Branch

1. Add a stable branch definition in `lineage.js`.
2. Define concrete behavior-based eligibility.
3. Define exclusions and save compatibility.
4. Apply mechanical effects only through explicit ownership seams.
5. Add visible changes in all relevant later chapters.
6. Add deterministic tests for eligibility, commitment, persistence, and effects.

### Adding a Structure

1. Define its simulation cost and behavior in the owning chapter.
2. Add atlas metadata or a deliberate fallback rendering.
3. Ensure construction cannot overlap or bypass resource constraints.
4. Include it in save data through plain serializable state.
5. Add tests for construction, effects, selection, and save/load.

### Adding a Chapter

Adding a chapter is a major campaign and save-schema change.

1. Add metadata to `CONFIG.chapters`.
2. Implement the complete `BaseChapter` lifecycle.
3. Add a renderer with a distinct interaction and camera language.
4. Define incoming and outgoing legacy mappings.
5. Update branch groups and transition logic.
6. Migrate existing saves.
7. Update ordered tests and complete-campaign simulations.

### Changing the Campaign State

Keep state normalized and serializable. Prefer stable IDs over object references for creatures, parents, structures, regions, and events.

## Future-Agent Working Agreement

When enhancing Lumenkin:

1. Read this README, the root `AGENTS.md`, and the focused test before editing.
2. Inspect the real implementation instead of relying on concept-plan assumptions.
3. Preserve the no-build browser-script architecture.
4. Treat the five chapter identities and permanent lineage consequences as product contracts.
5. Do not hardcode gameplay state in the renderer or DOM.
6. Do not use unsafe HTML for user-controlled or save-controlled values.
7. Keep deterministic simulation logic testable without the browser.
8. Add cleanup for every new listener, timer, and resource.
9. Update save migrations whenever persistent shapes or IDs change.
10. Pair every bug fix with focused regression coverage.
11. Run syntax, focused Jest, adjacent GameHub, and browser checks.
12. Report any verification that could not be completed; do not claim visual testing without opening the game.

## Definition of Done

A Lumenkin change is complete when:

- the requested behavior works in the relevant chapter,
- earlier choices still affect later chapters correctly,
- save/load preserves the new behavior,
- keyboard and pointer interaction remain usable,
- the pixel-art presentation remains crisp and responsive,
- cleanup and error paths are handled,
- focused and adjacent tests pass,
- browser verification shows no new console errors,
- this README is updated if an architectural or gameplay contract changed.
