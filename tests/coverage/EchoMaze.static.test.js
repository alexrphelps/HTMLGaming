const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

const root = path.resolve(__dirname, '../..');
const gamePath = path.join(root, 'games/echo_maze/index.html');
const gameDir = path.dirname(gamePath);
const configPath = path.join(root, 'games.config.js');

const expectedScripts = [
  'js/core/namespace.js',
  'js/config/constants.js',
  'js/config/items.js',
  'js/core/coords.js',
  'js/core/rng.js',
  'js/core/collections.js',
  'js/world/biomes.js',
  'js/world/chunks.js',
  'js/world/mazeGeneration.js',
  'js/world/collision.js',
  'js/world/pathfinding.js',
  'js/state/createRun.js',
  'js/state/messages.js',
  'js/systems/upgrades.js',
  'js/state/progression.js',
  'js/entities/items.js',
  'js/entities/objectives.js',
  'js/entities/warden.js',
  'js/entities/enemies.js',
  'js/entities/playerMovement.js',
  'js/render/canvas.js',
  'js/render/worldRenderer.js',
  'js/render/entityRenderer.js',
  'js/render/effectsRenderer.js',
  'js/render/uiRenderer.js',
  'js/ui/hud.js',
  'js/ui/overlay.js',
  'js/input.js',
  'js/main.js'
];

const runtimeScripts = expectedScripts.filter(scriptPath => (
  !scriptPath.startsWith('js/render/') &&
  !scriptPath.startsWith('js/ui/') &&
  scriptPath !== 'js/main.js'
));

function loadEchoMazeRuntime() {
  const context = createBrowserContext();
  runtimeScripts.forEach(file => loadBrowserScript(context, `games/echo_maze/${file}`, []));
  return context.window.EchoMaze;
}

function pathUsesOpenEdges(em, state, pathCells) {
  for (let i = 1; i < pathCells.length; i++) {
    const a = pathCells[i - 1];
    const b = pathCells[i];
    if (em.isBlockedBetween(state, a.x, a.y, b.x, b.y)) return false;
  }

  return true;
}

function findBlockedEdge(em, state, dir) {
  for (let y = -10; y <= 10; y++) {
    for (let x = -10; x <= 10; x++) {
      const nx = x + em.VEC[dir].x;
      const ny = y + em.VEC[dir].y;

      if (em.isBlockedBetween(state, x, y, nx, ny)) {
        return { x, y, nx, ny };
      }
    }
  }

  throw new Error(`No blocked ${dir} edge found`);
}

function findOpenEdge(em, state, dir) {
  for (let y = -10; y <= 10; y++) {
    for (let x = -10; x <= 10; x++) {
      const nx = x + em.VEC[dir].x;
      const ny = y + em.VEC[dir].y;

      if (!em.isBlockedBetween(state, x, y, nx, ny)) {
        return { x, y, nx, ny };
      }
    }
  }

  throw new Error(`No open ${dir} edge found`);
}

describe('Echo Maze modular runtime', () => {
  test('provides a clean iframe entry point with ordered external assets', () => {
    expect(fs.existsSync(gamePath)).toBe(true);

    for (const scriptPath of expectedScripts) {
      const fullPath = path.join(gameDir, scriptPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(() => new Function(fs.readFileSync(fullPath, 'utf8'))).not.toThrow();
    }

    const html = fs.readFileSync(gamePath, 'utf8');
    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).toContain('id="runStats"');
    expect(html).toContain('id="itemMeters"');
    expect(html).toContain('id="controlsDock"');
    expect(html).toContain('id="tertiaryBtn"');
    expect(html).toContain('<span>Menu</span><kbd>Esc</kbd>');
    expect(html).not.toContain('<span>Pause</span><kbd>P</kbd>');
    expect(html).not.toContain('<span>Restart</span><kbd>R</kbd>');
    expect(html).not.toContain('<span>New</span><kbd>N</kbd>');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1])).toEqual(expectedScripts);
  });

  test('is registered in the configured GameHub catalog', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'echo_maze',
          name: 'Echo Maze',
          input: 'Keyboard',
          rendering: 'Canvas',
          saveSupport: 'None'
        })
      ])
    );
  });

  test('creates deterministic seeded runs with reachable first objectives', () => {
    const em = loadEchoMazeRuntime();
    const a = em.createRun(12345);
    const b = em.createRun(12345);

    expect(em.CONFIG.cell).toBe(63);

    expect(a.objective).toEqual(expect.objectContaining({
      x: b.objective.x,
      y: b.objective.y,
      tier: 1
    }));

    const start = em.cellOfWorld(a.player.x, a.player.y);
    const pathToObjective = em.findPath(a, start, a.objective, em.CONFIG.pathLimit);
    expect(pathToObjective).toBeTruthy();
    expect(pathUsesOpenEdges(em, a, pathToObjective)).toBe(true);
  });

  test('new runs start with fuel-powered light clamped to max vision', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(112233);

    expect(state.player.fuel).toBe(100);
    expect(state.player.maxFuel).toBe(100);
    expect(state.player.vision).toBeGreaterThan(em.CONFIG.baseVision);
    expect(state.player.vision).toBeLessThanOrEqual(em.CONFIG.maxVision);

    for (const key of state.revealed) {
      const cell = em.parseKey(key);
      expect(Math.hypot(cell.x, cell.y)).toBeLessThanOrEqual(3);
    }
  });

  test('chunk portals and blocked-edge checks are symmetric across boundaries', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(67890);

    for (let cy = -1; cy <= 1; cy++) {
      for (let cx = -1; cx <= 1; cx++) {
        for (const ly of em.portalPositionsForEdge(state, cx, cy, 'E')) {
          const left = { x: cx * em.CONFIG.chunk + em.CONFIG.chunk - 1, y: cy * em.CONFIG.chunk + ly };
          const right = { x: left.x + 1, y: left.y };
          expect(em.isBlockedBetween(state, left.x, left.y, right.x, right.y)).toBe(false);
        }

        for (const lx of em.portalPositionsForEdge(state, cx, cy, 'S')) {
          const top = { x: cx * em.CONFIG.chunk + lx, y: cy * em.CONFIG.chunk + em.CONFIG.chunk - 1 };
          const bottom = { x: top.x, y: top.y + 1 };
          expect(em.isBlockedBetween(state, top.x, top.y, bottom.x, bottom.y)).toBe(false);
        }
      }
    }
  });

  test('spawn area is connected and normal movement does not accelerate diagonally', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(2222);
    const start = em.cellOfWorld(state.player.x, state.player.y);

    expect(em.findPath(state, start, { x: 1, y: 1 }, 100)).toBeTruthy();

    const inputState = { player: { angle: 0 } };
    const input = { keys: new Set(['w', 'd']) };
    const vector = em.readInput(inputState, input);
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1);
  });

  test('player collision blocks walls from both sides at exact boundaries', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(2468);
    const r = state.player.r - 1;

    const east = findBlockedEdge(em, state, 'E');
    state.player.y = east.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.x = (east.x + 1) * em.CONFIG.cell - r;
    em.moveAxis(state, 'x', 8);
    expect(state.player.x).toBe((east.x + 1) * em.CONFIG.cell - r);

    state.player.y = east.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.x = east.nx * em.CONFIG.cell + r;
    em.moveAxis(state, 'x', -8);
    expect(state.player.x).toBe(east.nx * em.CONFIG.cell + r);

    const south = findBlockedEdge(em, state, 'S');
    state.player.x = south.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.y = (south.y + 1) * em.CONFIG.cell - r;
    em.moveAxis(state, 'y', 8);
    expect(state.player.y).toBe((south.y + 1) * em.CONFIG.cell - r);

    state.player.x = south.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.y = south.ny * em.CONFIG.cell + r;
    em.moveAxis(state, 'y', -8);
    expect(state.player.y).toBe(south.ny * em.CONFIG.cell + r);
  });

  test('item collection applies upgrades once', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(3333);
    const item = { type: 'lantern', data: em.ITEM_DATA.lantern };
    state.player.fuel = 40;
    em.updateLanternVision(state);
    const beforeVision = state.player.vision;

    em.collectItem(state, 6, 0, item);
    expect(state.collected.has('6,0')).toBe(true);
    expect(state.player.vision).toBeGreaterThan(beforeVision);
    expect(state.player.fuel).toBeGreaterThan(40);
    expect(em.itemForCell(state, 6, 0)).toBe(null);
  });

  test('pickup reachability respects blocked and open maze edges', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(1357);

    const blocked = findBlockedEdge(em, state, 'E');
    expect(em.canReachItemForPickup(state, { x: blocked.x, y: blocked.y }, blocked.x, blocked.y)).toBe(true);
    expect(em.canReachItemForPickup(state, { x: blocked.x, y: blocked.y }, blocked.nx, blocked.ny)).toBe(false);

    const open = findOpenEdge(em, state, 'E');
    expect(em.canReachItemForPickup(state, { x: open.x, y: open.y }, open.nx, open.ny)).toBe(true);
  });

  test('five anchors create a reachable exit and reaching it wins the run', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(4444);

    for (let i = 0; i < em.CONFIG.runAnchors; i++) {
      const obj = state.objective;
      state.player.x = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
      state.player.y = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
      em.checkObjective(state, { x: obj.x, y: obj.y });
      expect(state.mode).toBe('upgrade');
      expect(state.pendingUpgrades).toHaveLength(3);
      expect(em.chooseUpgrade(state, state.pendingUpgrades[0])).toBe(true);
    }

    expect(state.objective).toBe(null);
    expect(state.exitPortal).toBeTruthy();

    const start = em.cellOfWorld(state.player.x, state.player.y);
    const pathToExit = em.findPath(state, start, state.exitPortal, em.CONFIG.pathLimit);
    expect(pathToExit).toBeTruthy();

    state.player.x = state.exitPortal.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.y = state.exitPortal.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    em.checkObjective(state, { x: state.exitPortal.x, y: state.exitPortal.y });
    expect(state.mode).toBe('victory');
    expect(state.finalStats.anchors).toBe(em.CONFIG.runAnchors);
  });

  test('Warden pathing and fallback movement never cross blocked edges', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(5555);
    em.spawnWarden(state);
    state.warden.wake = 0;

    const playerCell = em.cellOfWorld(state.player.x, state.player.y);
    em.updateWarden(state, 0.6, playerCell);
    expect(pathUsesOpenEdges(em, state, state.warden.path)).toBe(true);

    const fallback = em.fallbackWardenStep(state, { x: state.warden.cellX, y: state.warden.cellY }, playerCell);
    expect(pathUsesOpenEdges(em, state, fallback)).toBe(true);
  });

  test('seeded upgrade choices are deterministic and apply once before resuming', () => {
    const em = loadEchoMazeRuntime();
    const a = em.createRun(7777);
    const b = em.createRun(7777);

    a.anchors = 1;
    b.anchors = 1;

    const choicesA = em.generateUpgradeChoices(a);
    const choicesB = em.generateUpgradeChoices(b);
    expect(choicesA).toEqual(choicesB);
    expect(choicesA).toHaveLength(3);

    a.pendingAnchorAdvance = { complete: false, objName: 'Echo Anchor 1', reward: 500 };
    em.beginUpgradeSelection(a);
    const choice = a.pendingUpgrades[0];
    expect(em.chooseUpgrade(a, choice)).toBe(true);
    expect(a.upgrades[choice]).toBe(1);
    expect(a.mode).toBe('playing');
    expect(a.objective).toBeTruthy();
  });

  test('fuel drains, danger rises at low fuel, and anchors restore fuel', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(8888);
    state.mode = 'playing';
    const beforeFuel = state.player.fuel;

    em.updateLanternFuel(state, 3);
    expect(state.player.fuel).toBeLessThan(beforeFuel);
    expect(state.player.vision).toBeLessThanOrEqual(em.CONFIG.maxVision);

    state.player.fuel = 1;
    em.updateLanternFuel(state, 3);
    expect(state.danger).toBeGreaterThan(0);

    em.restoreFuel(state, 40);
    expect(state.player.fuel).toBeGreaterThan(1);
  });

  test('phase duration and cooldown upgrades affect activation', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(9999);
    state.mode = 'playing';

    em.applyUpgrade(state, 'phaseDuration');
    em.applyUpgrade(state, 'phaseCooldown');
    em.usePhase(state);

    expect(state.player.phaseTimer).toBeGreaterThan(em.CONFIG.phaseDuration);
    expect(state.player.phaseCooldownTimer).toBe(state.player.phaseCooldown);
    expect(state.player.phaseCooldown).toBeLessThan(em.CONFIG.phaseCooldown);
  });

  test('biomes are deterministic per chunk and preserve portal symmetry', () => {
    const em = loadEchoMazeRuntime();
    const a = em.createRun(24680);
    const b = em.createRun(24680);

    expect(em.biomeForChunk(a, 2, -3).id).toBe(em.biomeForChunk(b, 2, -3).id);

    const chunk = em.getChunk(a, 2, -3);
    expect(chunk.biomeId).toBe(em.biomeForChunk(a, 2, -3).id);

    for (const ly of em.portalPositionsForEdge(a, 2, -3, 'E')) {
      const left = { x: 2 * em.CONFIG.chunk + em.CONFIG.chunk - 1, y: -3 * em.CONFIG.chunk + ly };
      const right = { x: left.x + 1, y: left.y };
      expect(em.isBlockedBetween(a, left.x, left.y, right.x, right.y)).toBe(false);
    }
  });

  test('ambient enemies spawn with valid paths and do not cross blocked edges', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(54321);
    state.anchors = 2;
    em.spawnAmbientEnemies(state);

    expect(state.enemies.length).toBeGreaterThan(0);
    const playerCell = em.cellOfWorld(state.player.x, state.player.y);
    em.updateEnemies(state, 0.8, playerCell);

    for (const enemy of state.enemies) {
      if (enemy.path && enemy.path.length > 1) {
        expect(pathUsesOpenEdges(em, state, enemy.path)).toBe(true);
      }
    }
  });

  test('memory trail persists long enough to navigate back', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(1212);
    state.mode = 'playing';
    const input = { x: 1, y: 0 };

    em.addCrumb(state, 0.2, input);
    expect(state.crumbs).toHaveLength(1);
    expect(state.crumbs[0].ttl).toBeCloseTo(em.CONFIG.memoryTrailTtl - 0.2);

    em.addCrumb(state, 5, { x: 0, y: 0 });
    expect(state.crumbs).toHaveLength(1);
    expect(state.crumbs[0].ttl).toBeGreaterThan(10);
  });
});
