# The Gravity Locksmith Level Expansion Plan

## Current Structure Read

The Gravity Locksmith is a data-driven canvas platformer. The campaign is defined in `js/rooms.js` as a linear array of room definitions. Each room currently supports:

- `spawn`: player start point.
- `exit`: gate rectangle, opened after every shard is collected.
- `platforms`: static solid rectangles.
- `shards`: required collectibles.
- `spikes`: hazard rectangles with floor or ceiling direction.
- `enemies`: gravity-affected patrol blocks that kill the player on touch and can die on spikes.
- `movers`: sinusoidal moving platforms on the x or y axis.
- `chase`: optional shadow chase using the global chase tuning in `js/constants.js`.
- `tip`: one-line HUD guidance.

Important existing constraints:

- Progression is strictly linear.
- Gravity charge is global player state: max 100, flip cost 35, regen only while grounded.
- A room can ask for at most two immediate flips before the player must touch safe ground to recharge.
- Chase speed is currently global, not per room.
- There are no switches, locks, keys, doors, checkpoints, one-way platforms, crumble blocks, teleports, hazards on movers, optional collectibles, medal goals, or level select.
- The win screen draws every completed room in one fixed-height card, so a much longer campaign will need a paged or scroll-like results presentation.

## Current Campaign Role

1. The Open Tumbler: movement and double jump.
2. Ceiling Relay: first gravity flip route.
3. Teeth Between Worlds: spike awareness and recovery.
4. Clockwork Drift: enemy pressure and enemy gravity behavior.
5. Pendulum Gallery: moving platform timing.
6. Twin Shard Lattice: multi-shard route planning.
7. The Inverted Chase: first full synthesis under chase pressure.

The base game already has a good skill ladder. The expansion should keep rooms short, lethal, and readable, then use shard order, charge management, enemy disposal, and mover timing to create hard decisions.

## Replayability Pillars

- Tight optional mastery: add per-room par time, par deaths, and par flips in a later feature pass.
- Meaningful route decisions: place shards so the fastest route is riskier than the safe route.
- Execution windows: use movers and chase rooms to force committed jumps instead of wait-and-solve pacing.
- Energy economy: require players to choose when to spend flips, when to land and recharge, and when to preserve double jump.
- Practice value: each hard room should teach one repeatable trick before combining it with other tricks.
- Campaign rhythm: alternate cerebral puzzle rooms with speed rooms so difficulty feels sharp instead of exhausting.

## Proposed Campaign Expansion

Target shape: 30 total rooms. Existing rooms remain 1-7. New rooms 8-30 create three acts: Expert Locks, Master Vaults, and Grandmaster Contracts.

### Act 2: Expert Locks

8. Crossbite Landing
- Main idea: Two short routes cross at center, one floor-side and one ceiling-side.
- Decision: Take a safe recharge platform before the second shard, or spend a flip early for a faster line.
- Difficulty: Medium-hard.
- Current-schema fit: Static platforms, spikes, 2 shards.

9. The Locksmith's Tax
- Main idea: A patrolling guard blocks the easy path; flipping can kill it on ceiling spikes, but doing so spends charge needed later.
- Decision: Kill the guard and wait to recharge, or thread past it for speed.
- Difficulty: Hard.
- Current-schema fit: Enemy, ceiling spikes, staggered platforms.

10. Hourglass Ferry
- Main idea: Two vertical movers pass each other near the center while floor and ceiling spike beds close the room.
- Decision: Board early for a risky fast transfer, or wait for the safer alignment and lose time.
- Difficulty: Hard timing.
- Current-schema fit: Vertical movers, spikes, 1 shard.

11. Borrowed Ceiling
- Main idea: The exit is visible early, but the only shard is on a ceiling alcove that requires returning through the same spike channel.
- Decision: Spend a flip before or after collecting the shard, changing which half of the route is dangerous.
- Difficulty: Hard puzzle.
- Current-schema fit: Static platforms, spikes, 1 shard.

12. Split Receipt
- Main idea: Three shards form a triangle with no obvious route order.
- Decision: Pick lower-first, upper-first, or center-first. Each route has a different flip count and timing burden.
- Difficulty: Hard routing.
- Current-schema fit: 3 shards, static platforms, light spikes.

13. Blue Needle Gallery
- Main idea: Thin platforms over a long floor spike field; ceiling platforms offer recovery but require exact gravity flips.
- Decision: Keep gravity normal and double-jump the needles, or invert and take a tighter but faster ceiling path.
- Difficulty: Hard precision.
- Current-schema fit: Static platforms, floor and ceiling spikes.

14. Counterweight Court
- Main idea: Horizontal movers create a moving staircase in opposite phases.
- Decision: Use the lower mover chain slowly, or jump to the upper mover chain with a flip at the crossing point.
- Difficulty: Hard timing.
- Current-schema fit: Horizontal movers, spikes, 2 shards.

15. The Second Shadow
- Main idea: A shorter chase room with one optional-looking detour shard that is actually required.
- Decision: Grab the near shard first and risk the shadow, or commit to the far shard and backtrack through a mover window.
- Difficulty: Hard chase.
- Current-schema fit: Chase, movers, 2 shards.

### Act 3: Master Vaults

16. Deadbolt Orchard
- Main idea: Three guards patrol separated ledges; each can be used as a timing obstacle or flipped into spikes.
- Decision: Which guards are worth killing? Killing all is safer but slower and charge-expensive.
- Difficulty: Hard puzzle-action.
- Current-schema fit: Enemies, spikes, static platforms.

17. Recharge Verdict
- Main idea: Safe platforms are deliberately placed off the fastest path to create charge economy decisions.
- Decision: Touch down and recharge for a clean final flip, or attempt a low-charge double-jump recovery.
- Difficulty: Hard resource management.
- Current-schema fit: Static platforms, spikes, 2 shards.

18. Pendulum Teeth
- Main idea: Moving platforms pass between opposing spike beds. A shard sits between two bad cycles.
- Decision: Wait for the perfect ferry, or force the cycle with a gravity flip and double jump.
- Difficulty: Very hard timing.
- Current-schema fit: Movers, spikes, 1 shard.

19. Ceiling Debt
- Main idea: Starts normally but quickly becomes a ceiling-first level where returning to floor gravity is a trap.
- Decision: Resist the instinct to flip back after each jump; preserve inverted control until the final descent.
- Difficulty: Very hard execution.
- Current-schema fit: Static platforms, ceiling exit, spikes.

20. Black Ledger Run
- Main idea: A chase room with two lanes. Lower lane is faster but has enemies; upper lane is safer but longer.
- Decision: Fast dangerous lane or slow controlled lane under increasing chase pressure.
- Difficulty: Very hard chase.
- Current-schema fit: Chase, enemies, spikes, 2 shards.

21. Ratchet Chapel
- Main idea: Alternating ceiling and floor platforms make the player commit to a flip rhythm.
- Decision: Break rhythm to recharge at a safe island, or keep tempo and risk an undercharged final section.
- Difficulty: Very hard rhythm.
- Current-schema fit: Static platforms, 2-3 shards.

22. The False Shortcut
- Main idea: A visually obvious route reaches the shard fast but leaves the player with poor position for the exit.
- Decision: Take the obvious route and survive a brutal return, or take the slower setup route.
- Difficulty: Very hard routing.
- Current-schema fit: Static platforms, spikes, movers.

23. Keyhole in the Storm
- Main idea: A vertical mover gives access to both the shard and exit, but only if boarded from different gravity states.
- Decision: Use the mover as floor, then later as ceiling; missing the timing costs the whole cycle.
- Difficulty: Very hard timing puzzle.
- Current-schema fit: Vertical mover, spikes, 1 shard.

### Act 4: Grandmaster Contracts

24. Needle Exchange
- Main idea: Tiny safe islands across both gravity orientations with no long rest points.
- Decision: Spend double jump early for safety, or preserve it for a recovery after the shard.
- Difficulty: Expert precision.
- Current-schema fit: Static platforms, dense spikes, 1 shard.

25. The Third Shadow
- Main idea: Chase room where the first shard is behind the player after a required flip.
- Decision: Backtrack briefly under chase pressure, then outrun the shadow on a cleaner forward line.
- Difficulty: Expert chase.
- Current-schema fit: Chase, spikes, 2 shards.

26. Kill Switch Without a Switch
- Main idea: The player must remove a guard by flipping it into spikes because the patrol corridor is too tight to pass reliably.
- Decision: Spend charge to kill the guard immediately, or bait it into a better position first.
- Difficulty: Expert puzzle-action.
- Current-schema fit: Enemy, spikes, static platforms.

27. Twin Pendulum Audit
- Main idea: Two mover chains are offset; the correct route changes depending on gravity state.
- Decision: Choose which chain to trust, then commit through a no-recharge middle section.
- Difficulty: Expert timing.
- Current-schema fit: Multiple movers, spikes, 2 shards.

28. The Quiet Bad Choice
- Main idea: No chase, fewer spikes, but the route is a charge puzzle that punishes casual flips.
- Decision: Every flip matters. The player must land intentionally to recharge before the final ceiling exit.
- Difficulty: Expert puzzle.
- Current-schema fit: Static platforms, 3 shards.

29. Crownless Vault
- Main idea: A long room mixing enemy disposal, mover boarding, and a ceiling shard before the floor exit.
- Decision: Decide whether to clear enemies first or route around them while movers are favorable.
- Difficulty: Expert synthesis.
- Current-schema fit: Enemies, movers, spikes, 2 shards.

30. The Crown Tumbler
- Main idea: Final chase gauntlet combining all existing mechanics: shard fork, enemy pressure, mover transfer, spike needles, and an inverted exit.
- Decision: There should be two viable routes: a consistent survival line and a fast high-risk line for replays.
- Difficulty: Grandmaster.
- Current-schema fit: Chase, enemies, movers, spikes, 3 shards.

## Feature Reworks That Would Improve These Levels

These are not required to add more room data, but they would make the expanded campaign much more replayable.

1. Add `parTime`, `parFlips`, and `parDeaths` to room definitions.
2. Add a level select or practice menu once a room has been reached.
3. Add results paging or scrolling for the win screen before the campaign exceeds roughly 10 rooms.
4. Add per-room chase tuning, for example `chase: { baseSpeed, rampPerSecond, startX }`, while preserving `chase: true` as the default shorthand.
5. Add optional bonus shards that do not gate the exit, to support risky replay routes.
6. Add a best-times store in localStorage keyed by room id.
7. Add ghost split display or simple best-run delta in the HUD.
8. Add room tags such as `precision`, `routing`, `chase`, and `enemy` for future level select filtering.
9. Add checkpoints only for very long challenge rooms, or deliberately avoid them and keep every room under 45 seconds.
10. Add a compact debug level-jump tool for tuning the later rooms quickly.

## Implementation Order

1. Add win-screen paging and optional room `id` fields so long campaigns stay readable.
2. Add 8-10 new current-schema rooms first, covering rooms 8-15.
3. Manually tune each new room in browser, tracking expected clear time, typical flips, and common deaths.
4. Add par metrics and best-room persistence.
5. Add rooms 16-23 after replay metrics exist, so difficulty can be tuned around real timings.
6. Add rooms 24-30 last, and treat them as expert/postgame contracts if the main campaign becomes too punishing.

## Level Data Guidelines

- Keep most hard rooms below 35 seconds for a clean clear.
- Avoid requiring more than two flips without an obvious grounded recharge point.
- Put at least one safe read point near the start of every puzzle-heavy room.
- In chase rooms, make the first 20 percent readable and the last 30 percent decisive.
- Use 2 shards for route decisions and 3 shards only when the route order is the puzzle.
- Do not make every late room a spike tunnel; alternate enemy, mover, routing, and chase pressure.
- Tips should hint at the decision, not solve the route.

