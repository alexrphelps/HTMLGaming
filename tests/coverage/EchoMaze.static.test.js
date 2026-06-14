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
  'js/state/tutorial.js',
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

function loadEchoMazeBootstrapContext() {
  const context = createBrowserContext();
  const doc = context.document;
  doc.body.innerHTML = `
    <canvas id="game"></canvas>
    <section id="hud">
      <p id="goalText"></p>
      <div id="runStats"></div>
      <div id="itemMeters"></div>
      <div id="secondaryStats"></div>
    </section>
    <div id="messageLog"></div>
    <div id="overlay">
      <h2 id="overlayTitle"></h2>
      <p id="overlayText"></p>
      <div id="overlayStats"></div>
      <button id="primaryBtn"></button>
      <button id="secondaryBtn"></button>
      <button id="tertiaryBtn"></button>
    </div>
  `;
  context.window.requestAnimationFrame = jest.fn(() => 1);
  context.window.cancelAnimationFrame = jest.fn();
  context.window.addEventListener = jest.fn();
  context.window.performance = { now: () => 0 };
  context.window.document = doc;
  loadBrowserScript(context, 'games/echo_maze/js/core/namespace.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/config/constants.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/config/items.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/core/coords.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/core/rng.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/core/collections.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/world/biomes.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/world/chunks.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/world/mazeGeneration.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/world/collision.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/world/pathfinding.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/state/createRun.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/state/messages.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/systems/upgrades.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/state/progression.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/state/tutorial.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/entities/items.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/entities/objectives.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/entities/warden.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/entities/enemies.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/entities/playerMovement.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/render/canvas.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/render/worldRenderer.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/render/entityRenderer.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/render/effectsRenderer.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/render/uiRenderer.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/ui/hud.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/ui/overlay.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/input.js', []);
  loadBrowserScript(context, 'games/echo_maze/js/main.js', []);
  return context;
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

function collectCurrentTutorialItem(em, state) {
  const target = state.tutorialTarget;
  const item = em.itemForCell(state, target.x, target.y);
  em.collectItem(state, target.x, target.y, item);
  return item;
}

function findProceduralBeginnerItems(em, state, limit = 44) {
  return findItemsInWindow(em, state, -limit, -limit, limit * 2 + 1);
}

function findItemsInWindow(em, state, minX, minY, size) {
  const found = [];

  for (let y = minY; y < minY + size; y++) {
    for (let x = minX; x < minX + size; x++) {
      if (em.tutorialTargetAt(state, x, y)) continue;
      const item = em.itemForCell(state, x, y);
      if (item) found.push({ x, y, type: item.type });
    }
  }

  return found;
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
    expect(html).not.toContain('New Seed');
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
    expect(a.mode).toBe('mainMenu');
    expect(a.gameMode).toBe('classic');

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

  test('bootstrap is idempotent so the game loop cannot be started twice', () => {
    const context = loadEchoMazeBootstrapContext();
    const first = context.window.EchoMaze.bootstrap(context.document, context.window);
    const second = context.window.EchoMaze.bootstrap(context.document, context.window);

    expect(second).toBe(first);
    expect(context.window.requestAnimationFrame).toHaveBeenCalledTimes(1);
    expect(context.window.EchoMazeApp).toBe(first);
  });

  test('boots into a formal main menu before starting the classic run', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);

    expect(app.state.mode).toBe('mainMenu');

    context.window.EchoMaze.renderOverlay(app);
    expect(app.dom.overlay.classList.contains('visible')).toBe(true);
    expect(app.dom.overlayTitle.textContent).toBe('Echo Maze');
    expect(app.dom.overlayStats.innerHTML).toContain('data-menu-mode="beginner"');
    expect(app.dom.overlayStats.innerHTML).toContain('data-menu-mode="classic"');
    expect(app.dom.overlayStats.textContent).toContain('Beginner Run');
    expect(app.dom.overlayStats.textContent).toContain('Classic Run');
    expect(app.dom.primaryBtn.textContent).toBe('Classic Run');
    expect(app.dom.primaryBtn.style.display).toBe('none');
    expect(app.dom.secondaryBtn.style.display).toBe('none');
    expect(app.dom.tertiaryBtn.style.display).toBe('none');

    context.window.EchoMaze.handlePrimaryAction(app);
    expect(app.state.mode).toBe('playing');
    expect(app.state.gameMode).toBe('classic');
  });

  test('menu cards submit their own run modes', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);

    context.window.EchoMaze.renderOverlay(app);
    const beginnerCard = app.dom.overlayStats.querySelector('[data-menu-mode="beginner"]');
    const preventPointer = jest.fn();
    const preventClick = jest.fn();
    context.window.EchoMaze.handleOverlayStatsAction(app, { target: beginnerCard, preventDefault: preventPointer });
    const firstBeginnerState = app.state;
    const firstBeginnerSeed = app.state.seed;
    context.window.EchoMaze.handleOverlayStatsAction(app, { target: beginnerCard, preventDefault: preventClick });
    expect(app.state.mode).toBe('playing');
    expect(app.state.gameMode).toBe('beginner');
    expect(app.state).toBe(firstBeginnerState);
    expect(app.state.seed).toBe(firstBeginnerSeed);
    expect(preventPointer).toHaveBeenCalledTimes(1);
    expect(preventClick).toHaveBeenCalledTimes(1);
    expect(app.state.tutorialTarget).toEqual(expect.objectContaining({
      kind: 'item',
      itemType: 'lantern'
    }));

    const staleState = app.state;
    context.window.EchoMaze.handleOverlayStatsAction(app, { target: beginnerCard, preventDefault: jest.fn() });
    expect(app.state).toBe(staleState);

    context.window.EchoMaze.openMainMenu(app);
    context.window.EchoMaze.renderOverlay(app);
    const classicCard = app.dom.overlayStats.querySelector('[data-menu-mode="classic"]');
    context.window.EchoMaze.handleOverlayStatsAction(app, { target: classicCard, preventDefault: jest.fn() });
    expect(app.state.mode).toBe('playing');
    expect(app.state.gameMode).toBe('classic');
    expect(app.state.objective).toEqual(expect.objectContaining({ type: 'anchor', tier: 1 }));
  });

  test('beginner mode uses default biome and starts without hidden advanced resources', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(9191, { gameMode: 'beginner', mode: 'playing' });
    const target = state.tutorialTarget;

    expect(state.gameMode).toBe('beginner');
    expect(state.mode).toBe('playing');
    expect(em.biomeForChunk(state, 4, -3).id).toBe('stone');
    expect(state.player.phaseCharges).toBe(0);
    expect(state.player.shields).toBe(0);
    expect(state.player.fuel).toBe(100);
    expect(state.player.vision).toBe(em.CONFIG.baseVision);
    expect(target).toEqual(expect.objectContaining({
      kind: 'item',
      itemType: 'lantern'
    }));
    expect(state.tutorialTargets.length).toBeGreaterThan(1);
    expect(state.tutorialTargets.every(entry => entry.itemType === 'lantern')).toBe(true);
    expect(em.itemForCell(state, target.x, target.y).type).toBe('lantern');
    const alternate = state.tutorialTargets[1];
    expect(em.itemForCell(state, alternate.x, alternate.y).type).toBe('lantern');
    expect(findProceduralBeginnerItems(em, state)).toHaveLength(0);
  });

  test('beginner procedural items spawn map-wide from completed lesson unlocks', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(9192, { gameMode: 'beginner', mode: 'playing' });
    const distantWindows = [
      { x: -80, y: -80 },
      { x: 48, y: -24 },
      { x: -36, y: 54 }
    ];

    expect(em.unlockedBeginnerItemTypes(state)).toEqual([]);
    expect(findProceduralBeginnerItems(em, state)).toHaveLength(0);
    for (const win of distantWindows) {
      expect(findItemsInWindow(em, state, win.x, win.y, 42)).toHaveLength(0);
    }

    collectCurrentTutorialItem(em, state);
    expect(em.continueTutorial(state)).toBe(true);
    expect(em.unlockedBeginnerItemTypes(state)).toEqual(['lantern']);
    expect(em.itemForCell(state, state.tutorialTarget.x, state.tutorialTarget.y).type).toBe('boots');

    const lanternWindows = distantWindows.map(win => findItemsInWindow(em, state, win.x, win.y, 42));
    expect(lanternWindows.every(items => items.length > 0)).toBe(true);
    expect(lanternWindows.flat().every(item => item.type === 'lantern')).toBe(true);

    const lanternKeys = lanternWindows.flat().map(item => `${item.x},${item.y}`).sort();

    collectCurrentTutorialItem(em, state);
    expect(em.continueTutorial(state)).toBe(true);
    expect(em.unlockedBeginnerItemTypes(state)).toEqual(['lantern', 'boots']);

    const unlockedItems = distantWindows.flatMap(win => findItemsInWindow(em, state, win.x, win.y, 42));
    const unlockedKeys = unlockedItems.map(item => `${item.x},${item.y}`).sort();
    expect(unlockedKeys).toEqual(lanternKeys);
    expect(unlockedItems.every(item => ['lantern', 'boots'].includes(item.type))).toBe(true);
    expect(new Set(unlockedItems.map(item => item.type))).toEqual(new Set(['lantern', 'boots']));
  });

  test('beginner item pickup advances epoch and rerolls map-wide procedural items', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(9193, { gameMode: 'beginner', mode: 'playing' });

    collectCurrentTutorialItem(em, state);
    expect(em.continueTutorial(state)).toBe(true);

    const firstWindow = findItemsInWindow(em, state, -70, 20, 48);
    expect(firstWindow.length).toBeGreaterThan(0);

    const beforeEpoch = state.beginnerItemEpoch;
    const beforeKeys = firstWindow.map(item => `${item.x},${item.y}`).sort();
    const picked = firstWindow[0];
    em.collectItem(state, picked.x, picked.y, em.itemForCell(state, picked.x, picked.y));

    expect(state.mode).toBe('playing');
    expect(state.beginnerItemEpoch).toBe(beforeEpoch + 1);

    const afterKeys = findItemsInWindow(em, state, -70, 20, 48).map(item => `${item.x},${item.y}`).sort();
    expect(afterKeys).not.toEqual(beforeKeys);
    expect(afterKeys).not.toContain(`${picked.x},${picked.y}`);
  });

  test('beginner HUD hides undiscovered classic stats until lessons reveal them', () => {
    const context = loadEchoMazeBootstrapContext();
    const em = context.window.EchoMaze;
    const app = em.bootstrap(context.document, context.window);

    em.startMode(app, 'beginner');
    em.updateHud(app);
    expect(app.dom.runStats.textContent).toContain('Beginner');
    expect(app.dom.runStats.textContent).toContain('Lessons');
    expect(app.dom.runStats.textContent).not.toContain('Anchors');
    expect(app.dom.runStats.textContent).not.toContain('Warden');
    expect(app.dom.itemMeters.textContent).not.toContain('Fuel');
    expect(app.dom.itemMeters.textContent).not.toContain('Phase');
    expect(app.dom.itemMeters.textContent).not.toContain('Compass');
    expect(app.dom.itemMeters.textContent).not.toContain('Danger');
    expect(app.state.danger).toBe(0);
    expect(app.state.player.fuel).toBe(100);

    collectCurrentTutorialItem(em, app.state);
    em.updateHud(app);
    expect(app.dom.itemMeters.textContent).toContain('Fuel');
    expect(app.dom.itemMeters.textContent).toContain('Vision');
    expect(app.dom.itemMeters.textContent).not.toContain('Phase');
    expect(app.dom.itemMeters.textContent).not.toContain('Danger');
  });

  test('beginner phase is inert until the phase lesson is complete', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(6262, { gameMode: 'beginner', mode: 'playing' });

    em.usePhase(state);
    expect(state.player.phaseTimer).toBe(0);
    expect(state.player.phaseCharges).toBe(0);

    collectCurrentTutorialItem(em, state);
    em.continueTutorial(state);
    collectCurrentTutorialItem(em, state);
    em.continueTutorial(state);

    em.usePhase(state);
    expect(state.player.phaseTimer).toBe(0);
    expect(state.player.phaseCharges).toBe(0);

    collectCurrentTutorialItem(em, state);
    expect(state.tutorialInfo).toEqual(expect.objectContaining({ type: 'phase' }));
    expect(state.player.phaseCharges).toBe(1);
    em.continueTutorial(state);

    em.usePhase(state);
    expect(state.player.phaseCharges).toBe(0);
    expect(state.player.phaseTimer).toBeGreaterThan(0);
  });

  test('beginner item lessons pause with info and advance through each pickup', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(8181, { gameMode: 'beginner', mode: 'playing' });
    const expected = ['lantern', 'boots', 'phase', 'compass', 'map', 'shield', 'battery', 'relic'];

    for (const type of expected) {
      expect(state.tutorialTarget).toEqual(expect.objectContaining({ kind: 'item', itemType: type }));

      const before = {
        vision: state.player.vision,
        speed: state.player.speed,
        phaseCharges: state.player.phaseCharges,
        compass: state.player.compass,
        revealed: state.revealed.size,
        shields: state.player.shields,
        battery: state.player.battery,
        score: state.score
      };

      const item = collectCurrentTutorialItem(em, state);
      expect(item.type).toBe(type);
      expect(state.mode).toBe('tutorialInfo');
      expect(state.tutorialInfo).toEqual(expect.objectContaining({ type }));

      if (type === 'lantern') expect(state.player.vision).toBeGreaterThan(before.vision);
      if (type === 'boots') expect(state.player.speed).toBeGreaterThan(before.speed);
      if (type === 'phase') expect(state.player.phaseCharges).toBeGreaterThan(before.phaseCharges);
      if (type === 'compass') expect(state.player.compass).toBeGreaterThan(before.compass);
      if (type === 'map') expect(state.revealed.size).toBeGreaterThan(before.revealed);
      if (type === 'shield') expect(state.player.shields).toBeGreaterThan(before.shields);
      if (type === 'battery') expect(state.player.battery).toBeGreaterThan(before.battery);
      if (type === 'relic') expect(state.score).toBeGreaterThan(before.score);

      expect(em.continueTutorial(state)).toBe(true);
      expect(state.mode).toBe('playing');
    }

    expect(state.tutorialTarget).toEqual(expect.objectContaining({ kind: 'anchor' }));
    expect(state.objective).toEqual(expect.objectContaining({ tutorialFinal: true }));
  });

  test('final beginner anchor graduates the same run into classic mode', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(7171, { gameMode: 'beginner', mode: 'playing' });

    while (state.tutorialTarget.kind === 'item') {
      collectCurrentTutorialItem(em, state);
      em.continueTutorial(state);
    }

    const anchor = state.objective;
    state.player.x = anchor.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.y = anchor.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    em.checkObjective(state, { x: anchor.x, y: anchor.y });

    expect(state.mode).toBe('tutorialInfo');
    expect(state.tutorialInfo).toEqual(expect.objectContaining({ type: 'anchor' }));

    em.continueTutorial(state);
    expect(state.mode).toBe('upgrade');
    expect(state.gameMode).toBe('classic');
    expect(state.anchors).toBe(1);
    expect(state.tier).toBe(2);
    expect(em.hasDiscoveredTutorial(state, 'lantern')).toBe(true);
    expect(em.hasDiscoveredTutorial(state, 'anchor')).toBe(true);
    expect(state.pendingUpgrades).toHaveLength(3);
    expect(state.objective).toBe(null);
    expect(state.warden).toBeTruthy();

    expect(em.chooseUpgrade(state, state.pendingUpgrades[0])).toBe(true);
    expect(state.mode).toBe('playing');
    expect(state.objective).toEqual(expect.objectContaining({ type: 'anchor', tier: 2 }));

    const start = em.cellOfWorld(state.player.x, state.player.y);
    const pathToObjective = em.findPath(state, start, state.objective, em.CONFIG.pathLimit);
    expect(pathToObjective).toBeTruthy();
    expect(pathUsesOpenEdges(em, state, pathToObjective)).toBe(true);
  });

  test('pause and result overlays hide seed-management actions', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);

    context.window.EchoMaze.handlePrimaryAction(app);
    context.window.EchoMaze.pauseRun(app.state);
    context.window.EchoMaze.renderOverlay(app);

    expect(app.state.mode).toBe('paused');
    expect(app.dom.primaryBtn.textContent).toBe('Resume');
    expect(app.dom.secondaryBtn.textContent).toBe('Main Menu');
    expect(app.dom.tertiaryBtn.style.display).toBe('none');
    expect(app.dom.overlayText.textContent).not.toMatch(/seed/i);

    context.window.EchoMaze.handleSecondaryAction(app);
    expect(app.state.mode).toBe('mainMenu');

    context.window.EchoMaze.handlePrimaryAction(app);
    context.window.EchoMaze.endRun(app.state, 'gameover', 'The Warden shattered your echo.');
    context.window.EchoMaze.renderOverlay(app);

    expect(app.dom.primaryBtn.textContent).toBe('Main Menu');
    expect(app.dom.secondaryBtn.style.display).toBe('none');
    expect(app.dom.tertiaryBtn.style.display).toBe('none');
  });

  test('upgrade overlay uses the clickable cards without footer buttons', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);
    const em = context.window.EchoMaze;

    app.state.mode = 'upgrade';
    app.state.pendingUpgrades = ['compassObjective', 'phaseDuration', 'lanternFocus'];
    em.renderOverlay(app);

    expect(app.dom.overlayStats.innerHTML).toContain('data-upgrade-id="compassObjective"');
    expect(app.dom.primaryBtn.style.display).toBe('none');
    expect(app.dom.secondaryBtn.style.display).toBe('none');
    expect(app.dom.tertiaryBtn.style.display).toBe('none');
  });

  test('upgrade card clicks are ignored outside upgrade mode', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);
    const em = context.window.EchoMaze;

    app.state.pendingUpgrades = ['compassObjective', 'phaseDuration', 'lanternFocus'];
    app.state.mode = 'playing';
    const staleUpgradeButton = app.document.createElement('button');
    staleUpgradeButton.setAttribute('data-upgrade-id', 'compassObjective');

    em.handleOverlayStatsAction(app, { target: staleUpgradeButton, preventDefault: jest.fn() });
    expect(app.state.mode).toBe('playing');
    expect(app.state.upgrades.compassObjective).toBe(0);
    expect(app.state.pendingUpgrades).toEqual(['compassObjective', 'phaseDuration', 'lanternFocus']);
  });

  test('destroy cancels the active animation frame and removes listeners', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);

    expect(app.rafId).toBe(1);
    app.destroy();

    expect(context.window.cancelAnimationFrame).toHaveBeenCalledWith(1);
    expect(app.isDestroyed).toBe(true);
    expect(context.window.EchoMazeApp).toBe(null);
  });

  test('destroyed apps can be bootstrapped fresh', () => {
    const context = loadEchoMazeBootstrapContext();
    const first = context.window.EchoMaze.bootstrap(context.document, context.window);
    first.destroy();

    const second = context.window.EchoMaze.bootstrap(context.document, context.window);
    expect(second).not.toBe(first);
    expect(second.isDestroyed).toBe(false);
    expect(context.window.EchoMazeApp).toBe(second);
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

  test('item collection applies registry effects once', () => {
    const em = loadEchoMazeRuntime();
    const cases = {
      lantern: {
        x: 6,
        y: 0,
        assertEffect(state) {
          state.player.fuel = 40;
          em.updateLanternVision(state);
          const beforeVision = state.player.vision;
          em.collectItem(state, 6, 0, { type: 'lantern', data: em.ITEM_DATA.lantern });
          expect(state.player.vision).toBeGreaterThan(beforeVision);
          expect(state.player.fuel).toBeGreaterThan(40);
        }
      },
      boots: {
        x: 7,
        y: 0,
        assertEffect(state) {
          const before = state.player.speed;
          em.collectItem(state, 7, 0, { type: 'boots', data: em.ITEM_DATA.boots });
          expect(state.player.speed).toBeGreaterThan(before);
        }
      },
      phase: {
        x: 8,
        y: 0,
        assertEffect(state) {
          const before = state.player.phaseCharges;
          em.collectItem(state, 8, 0, { type: 'phase', data: em.ITEM_DATA.phase });
          expect(state.player.phaseCharges).toBe(before + 1);
        }
      },
      compass: {
        x: 9,
        y: 0,
        assertEffect(state) {
          const before = state.player.compass;
          em.collectItem(state, 9, 0, { type: 'compass', data: em.ITEM_DATA.compass });
          expect(state.player.compass).toBe(before + 1);
        }
      },
      map: {
        x: 10,
        y: 0,
        assertEffect(state) {
          const before = state.revealed.size;
          em.collectItem(state, 10, 0, { type: 'map', data: em.ITEM_DATA.map });
          expect(state.revealed.size).toBeGreaterThan(before);
        }
      },
      shield: {
        x: 11,
        y: 0,
        assertEffect(state) {
          const before = state.player.shields;
          em.collectItem(state, 11, 0, { type: 'shield', data: em.ITEM_DATA.shield });
          expect(state.player.shields).toBe(before + 1);
        }
      },
      battery: {
        x: 12,
        y: 0,
        assertEffect(state) {
          state.danger = 0.5;
          const before = state.player.battery;
          em.collectItem(state, 12, 0, { type: 'battery', data: em.ITEM_DATA.battery });
          expect(state.player.battery).toBe(before + 1);
          expect(state.danger).toBeLessThan(0.5);
        }
      },
      relic: {
        x: 13,
        y: 0,
        assertEffect(state) {
          const beforeCharges = state.player.phaseCharges;
          const beforeScore = state.score;
          em.collectItem(state, 13, 0, { type: 'relic', data: em.ITEM_DATA.relic });
          expect(state.player.phaseCharges).toBe(beforeCharges + 1);
          expect(state.score).toBeGreaterThan(beforeScore);
        }
      }
    };

    for (const [type, testCase] of Object.entries(cases)) {
      const state = em.createRun(3333);
      testCase.assertEffect(state);
      expect(state.collected.size).toBe(1);
      expect(state.collected.has(`${testCase.x},${testCase.y}`)).toBe(true);
      expect(state.items).toBe(1);
      expect(em.itemForCell(state, testCase.x, testCase.y)).toBe(null);
      expect(em.ITEM_EFFECTS[type]).toBeTruthy();
    }
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
