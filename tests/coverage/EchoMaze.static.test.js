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
    <aside id="vitalsDock"></aside>
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
    expect(html).toContain('id="vitalsDock"');
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
    expect(a.objectives).toHaveLength(em.activeAnchorCountForTier(1));
    expect(a.objectives.map(obj => `${obj.x},${obj.y}`)).toEqual(b.objectives.map(obj => `${obj.x},${obj.y}`));

    const start = em.cellOfWorld(a.player.x, a.player.y);
    const pathToObjective = em.findPath(a, start, a.objective, em.CONFIG.pathLimit);
    expect(pathToObjective).toBeTruthy();
    expect(pathUsesOpenEdges(em, a, pathToObjective)).toBe(true);

    for (const obj of a.objectives) {
      expect(obj.tier).toBe(1);
      expect(em.objectiveRadius(obj.x, obj.y)).toBeGreaterThan(0);
      const path = em.findPath(a, start, obj, em.CONFIG.pathLimit);
      expect(path).toBeTruthy();
      expect(pathUsesOpenEdges(em, a, path)).toBe(true);
    }
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
    expect(app.dom.overlayStats.innerHTML).toContain('data-menu-mode="noExit"');
    expect(app.dom.overlayStats.textContent).toContain('Beginner Run');
    expect(app.dom.overlayStats.textContent).toContain('Classic Run');
    expect(app.dom.overlayStats.textContent).toContain('No Exit');
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

    context.window.EchoMaze.openMainMenu(app);
    context.window.EchoMaze.renderOverlay(app);
    const noExitCard = app.dom.overlayStats.querySelector('[data-menu-mode="noExit"]');
    context.window.EchoMaze.handleOverlayStatsAction(app, { target: noExitCard, preventDefault: jest.fn() });
    expect(app.state.mode).toBe('playing');
    expect(app.state.gameMode).toBe('noExit');
    expect(app.state.void).toEqual(expect.objectContaining({
      active: false,
      radius: 0
    }));
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
    expect(state.player.fuel).toBeUndefined();
    expect(state.player.maxFuel).toBeUndefined();
    expect(state.player.minVision).toBe(em.CONFIG.baseVision);
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
    expect(app.state.player.fuel).toBeUndefined();

    collectCurrentTutorialItem(em, app.state);
    em.updateHud(app);
    expect(app.dom.itemMeters.textContent).toContain('Vision');
    expect(app.dom.itemMeters.textContent).not.toContain('Fuel');
    expect(app.dom.itemMeters.textContent).not.toContain('Phase');
    expect(app.dom.itemMeters.textContent).not.toContain('Danger');
  });

  test('classic HUD renders health and shields as bottom-center icon slots', () => {
    const context = loadEchoMazeBootstrapContext();
    const em = context.window.EchoMaze;
    const app = em.bootstrap(context.document, context.window);

    em.startMode(app, 'classic');
    em.updateHud(app);

    expect(app.dom.itemMeters.textContent).not.toContain('Phase');
    expect(app.dom.runStats.textContent).not.toContain('Integrity');
    expect(app.dom.runStats.textContent).not.toContain('HP');
    expect(app.dom.runStats.textContent).not.toContain('SH');
    expect(app.dom.vitalsDock.classList.contains('hidden')).toBe(false);
    expect(app.dom.vitalsDock.firstElementChild.classList.contains('phase-vitals')).toBe(true);
    expect(app.dom.vitalsDock.querySelector('.phase-vitals').textContent).toContain('Phase');
    expect(app.dom.vitalsDock.querySelector('.phase-vitals').textContent).toContain('1/9');
    expect(app.dom.vitalsDock.querySelector('.phase-vitals').textContent).toContain('Active');
    expect(app.dom.vitalsDock.querySelector('.phase-vitals').textContent).toContain('Cooldown');
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.health')).toHaveLength(3);
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.health.filled')).toHaveLength(3);
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.shield')).toHaveLength(5);
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.shield.filled')).toHaveLength(1);
    expect(app.dom.vitalsDock.textContent).not.toMatch(/\d+\s*(HP|SH)/);
  });

  test('beginner vitals reveal phase before health and shields', () => {
    const context = loadEchoMazeBootstrapContext();
    const em = context.window.EchoMaze;
    const app = em.bootstrap(context.document, context.window);

    em.startMode(app, 'beginner');
    em.updateHud(app);
    expect(app.dom.vitalsDock.classList.contains('hidden')).toBe(true);
    expect(app.dom.vitalsDock.innerHTML).toBe('');

    while (app.state.tutorialTarget.kind === 'item' && app.state.tutorialTarget.itemType !== 'phase') {
      collectCurrentTutorialItem(em, app.state);
      em.continueTutorial(app.state);
    }

    collectCurrentTutorialItem(em, app.state);
    em.updateHud(app);

    expect(em.hasDiscoveredTutorial(app.state, 'phase')).toBe(true);
    expect(app.dom.vitalsDock.classList.contains('hidden')).toBe(false);
    expect(app.dom.vitalsDock.querySelector('.phase-vitals')).toBeTruthy();
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.health')).toHaveLength(0);
    expect(app.dom.itemMeters.textContent).not.toContain('Phase');
    em.continueTutorial(app.state);

    while (app.state.tutorialTarget.kind === 'item' && app.state.tutorialTarget.itemType !== 'shield') {
      collectCurrentTutorialItem(em, app.state);
      em.continueTutorial(app.state);
    }

    collectCurrentTutorialItem(em, app.state);
    em.updateHud(app);

    expect(em.hasDiscoveredTutorial(app.state, 'shield')).toBe(true);
    expect(app.dom.vitalsDock.classList.contains('hidden')).toBe(false);
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.health')).toHaveLength(3);
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.shield')).toHaveLength(5);
    expect(app.dom.vitalsDock.querySelectorAll('.vital-icon.shield.filled')).toHaveLength(1);
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
    const trainingRadius = em.objectiveRadius(anchor.x, anchor.y);
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
    expect(em.objectiveRadius(state.objective.x, state.objective.y)).toBeGreaterThan(trainingRadius);

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

  test('upgrade overlay uses inline horizontal choices without footer buttons', () => {
    const context = loadEchoMazeBootstrapContext();
    const app = context.window.EchoMaze.bootstrap(context.document, context.window);
    const em = context.window.EchoMaze;
    const css = fs.readFileSync(path.join(gameDir, 'css/style.css'), 'utf8');

    app.state.mode = 'upgrade';
    app.state.pendingUpgrades = ['compassObjective', 'phaseDuration', 'lanternFocus'];
    em.renderOverlay(app);

    expect(app.dom.overlayStats.innerHTML).toContain('data-upgrade-id="compassObjective"');
    expect(app.dom.overlayStats.className).toContain('upgrade-grid');
    expect(app.dom.overlayStats.querySelectorAll('.upgrade-choice')).toHaveLength(3);
    expect(app.dom.primaryBtn.style.display).toBe('none');
    expect(app.dom.secondaryBtn.style.display).toBe('none');
    expect(app.dom.tertiaryBtn.style.display).toBe('none');
    expect(css).toMatch(/\.upgrade-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(3,/);
    expect(css).toMatch(/\.upgrade-choice\s*\{[\s\S]*grid-template-columns:\s*26px\s+minmax/);
    expect(css).not.toContain('aspect-ratio: 1 / 1');
    expect(css).not.toContain('.upgrade-grid { grid-template-columns: 1fr; }');
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

  test('new runs start with minimum vision and no fuel fields', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(112233);

    expect(em.CONFIG.baseVision).toBe(2);
    expect(state.player.fuel).toBeUndefined();
    expect(state.player.maxFuel).toBeUndefined();
    expect(state.player.minVision).toBe(2);
    expect(state.player.vision).toBe(2);
    expect(state.player.vision).toBeLessThanOrEqual(em.CONFIG.maxVision);

    for (const key of state.revealed) {
      const cell = em.parseKey(key);
      expect(Math.hypot(cell.x, cell.y)).toBeLessThanOrEqual(2);
    }
  });

  test('compass lenses alone gate anchor signals by chunk distance', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(1212);

    state.objective = {
      type: 'anchor',
      x: em.CONFIG.chunk * 5,
      y: 0,
      name: 'Signal Test Anchor'
    };
    state.objectives = [state.objective];
    state.revealed.delete(em.keyOf(state.objective.x, state.objective.y));

    expect(em.CONFIG.playerCaps.maxCompass).toBe(8);
    expect(em.anchorSignalInfo(state).distanceChunks).toBe(5);
    expect(em.isAnchorSignalDetected(state)).toBe(false);

    state.player.compass = 5;
    expect(em.isAnchorSignalDetected(state)).toBe(true);

    state.objective.x = em.CONFIG.chunk * 5 + 1;
    expect(em.isAnchorSignalDetected(state)).toBe(false);

    state.player.compassObjective = 3;
    expect(em.isAnchorSignalDetected(state)).toBe(false);

    state.player.compass = 8;
    state.objective.x = em.CONFIG.chunk * 80;
    expect(em.anchorSignalInfo(state).always).toBe(true);
    expect(em.isAnchorSignalDetected(state)).toBe(true);
  });

  test('default anchor signal targets the closest active anchor', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(1213);
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const far = { type: 'anchor', x: pc.x + em.CONFIG.chunk * 6, y: pc.y, tier: 1, name: 'Far Anchor' };
    const close = { type: 'anchor', x: pc.x + em.CONFIG.chunk * 2, y: pc.y, tier: 1, name: 'Close Anchor' };

    state.objective = far;
    state.objectives = [far, close];
    state.player.compass = 2;

    expect(em.closestActiveAnchor(state)).toBe(close);
    expect(em.anchorSignalInfo(state).distanceChunks).toBe(2);
    expect(em.isAnchorSignalDetected(state)).toBe(true);
    expect(em.anchorSignalInfo(state, far).distanceChunks).toBe(6);
    expect(em.isAnchorSignalDetected(state, far)).toBe(false);
  });

  test('anchor goal text hides exact distance until and after compass detection', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(1313);

    state.mode = 'playing';
    state.objective = {
      type: 'anchor',
      x: em.CONFIG.chunk * 6,
      y: 0,
      tier: 1,
      name: 'Signal Test Anchor'
    };
    state.objectives = [state.objective];

    state.player.compass = 0;
    expect(em.goalHtmlForState(state)).toContain('Search for Compass Lenses');
    expect(em.goalHtmlForState(state)).not.toContain('cells away');

    state.player.compass = 5;
    expect(em.goalHtmlForState(state)).toContain('Compass scans 5 chunks');
    expect(em.goalHtmlForState(state)).not.toContain('cells away');

    state.player.compass = 8;
    expect(em.goalHtmlForState(state)).toContain('Anchor signal detected');
    expect(em.goalHtmlForState(state)).not.toContain('cells away');
  });

  test('unrevealed anchors do not appear as minimap dots even with full compass signal', () => {
    const context = loadEchoMazeBootstrapContext();
    const em = context.window.EchoMaze;
    const state = em.createRun(1414);
    const pc = em.cellOfWorld(state.player.x, state.player.y);
    const ctx = {
      fillStyle: '',
      shadowColor: '',
      shadowBlur: 0,
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn()
    };

    state.objective = {
      type: 'anchor',
      x: pc.x + 3,
      y: pc.y,
      name: 'Signal Test Anchor'
    };
    state.player.compass = 8;
    state.revealed.delete(em.keyOf(state.objective.x, state.objective.y));

    expect(em.isAnchorSignalDetected(state)).toBe(true);
    expect(em.isKnownSignal(state, state.objective)).toBe(false);
    em.drawMinimapSignal(ctx, state, state.objective, pc, 0, 0, 10, 6, '#ffe27a');
    expect(ctx.arc).not.toHaveBeenCalled();

    state.revealed.add(em.keyOf(state.objective.x, state.objective.y));
    expect(em.isKnownSignal(state, state.objective)).toBe(true);
    em.drawMinimapSignal(ctx, state, state.objective, pc, 0, 0, 10, 6, '#ffe27a');
    expect(ctx.arc).toHaveBeenCalledTimes(1);
  });

  test('HUD compass pips show collected lenses rather than clarity upgrades', () => {
    const context = loadEchoMazeBootstrapContext();
    const em = context.window.EchoMaze;
    const app = em.bootstrap(context.document, context.window);

    em.startMode(app, 'classic');
    app.state.player.compass = 2;
    app.state.player.compassObjective = 3;
    em.updateHud(app);

    expect(app.dom.itemMeters.textContent).toContain('Compass');
    expect(app.dom.itemMeters.textContent).toContain('2/8');
    expect(app.dom.itemMeters.textContent).not.toContain('5/8');
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
          const beforeVision = state.player.vision;
          em.collectItem(state, 6, 0, { type: 'lantern', data: em.ITEM_DATA.lantern });
          expect(state.player.vision).toBeGreaterThan(beforeVision);
          expect(state.player.fuel).toBeUndefined();

          const boostedVision = state.player.vision;
          em.updateVisionAndDanger(state, 5);
          expect(state.player.vision).toBeLessThan(boostedVision);
          expect(state.player.vision).toBeGreaterThanOrEqual(state.player.minVision);
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
          state.player.health = 2;
          const before = state.player.battery;
          em.collectItem(state, 12, 0, { type: 'battery', data: em.ITEM_DATA.battery });
          expect(state.player.battery).toBe(before + 1);
          expect(state.player.health).toBe(3);
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

  test('health redesign caps shields at five and batteries heal missing health only', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(3434);

    expect(em.CONFIG.playerCaps.maxHealth).toBe(3);
    expect(em.CONFIG.playerCaps.maxShields).toBe(5);

    state.player.shields = 4;
    em.collectItem(state, 20, 0, { type: 'shield', data: em.ITEM_DATA.shield });
    expect(state.player.shields).toBe(5);

    em.collectItem(state, 21, 0, { type: 'shield', data: em.ITEM_DATA.shield });
    expect(state.player.shields).toBe(5);

    state.player.health = 1;
    em.collectItem(state, 22, 0, { type: 'battery', data: em.ITEM_DATA.battery });
    expect(state.player.health).toBe(2);

    em.collectItem(state, 23, 0, { type: 'battery', data: em.ITEM_DATA.battery });
    em.collectItem(state, 24, 0, { type: 'battery', data: em.ITEM_DATA.battery });
    expect(state.player.health).toBe(3);
  });

  test('maxed Quickstep pickups become a temporary speed boost', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(3435);
    state.mode = 'playing';
    state.player.speed = em.CONFIG.playerCaps.maxSpeed;

    em.collectItem(state, 27, 0, { type: 'boots', data: em.ITEM_DATA.boots });
    expect(state.player.speed).toBe(em.CONFIG.playerCaps.maxSpeed);
    expect(state.player.speedBoostTimer).toBe(em.CONFIG.upgrades.quickstepOverflowDuration);
    expect(em.effectivePlayerSpeed(state)).toBeGreaterThan(state.player.speed);

    em.update(state, 3.2, { x: 0, y: 0 });
    expect(state.player.speedBoostTimer).toBe(0);
    expect(em.effectivePlayerSpeed(state)).toBe(state.player.speed);
  });

  test('Map Fragments reveal a smaller local area', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(3436);

    expect(em.ITEM_DATA.map.effect.revealRadius).toBe(7);
    expect(em.ITEM_DATA.map.effect.pathBurstRadius).toBe(4);

    const before = state.revealed.size;
    em.collectItem(state, 32, 0, { type: 'map', data: em.ITEM_DATA.map });
    expect(state.revealed.size).toBeGreaterThan(before);
    expect(state.revealed.size - before).toBeLessThan(260);
  });

  test('anchors no longer heal health during stabilization rewards', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(3535);

    state.mode = 'playing';
    state.player.health = 1;

    for (let i = 0; i < 2; i++) {
      const obj = state.objective;
      state.player.x = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
      state.player.y = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
      em.checkObjective(state, { x: obj.x, y: obj.y });
      expect(state.player.health).toBe(1);
      expect(em.chooseUpgrade(state, state.pendingUpgrades[0])).toBe(true);
    }
  });

  test('damage consumes shields before health and names non-Warden sources', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(3636);

    state.player.shields = 1;
    state.player.health = 3;
    em.damagePlayer(state, 'Wall-Crawler');

    expect(state.player.shields).toBe(0);
    expect(state.player.health).toBe(3);
    expect(state.messages[0].text).toContain('Wall-Crawler');
    expect(state.messages[0].text).not.toContain('Warden');

    em.damagePlayer(state, 'Sentry Eye');
    expect(state.player.health).toBe(2);
    expect(state.messages[0].text).toContain('Sentry Eye');
  });

  test('danger palette is reserved for enemies while item colors stay distinct', () => {
    const em = loadEchoMazeRuntime();
    const dangerColors = new Set(['#ff4e38', '#ff9f1c', '#ff6b1a', '#ff2f4f']);
    const itemColors = Object.values(em.ITEM_DATA).map(item => item.color);

    expect(Object.values(em.ENEMY_DATA).map(enemy => enemy.color).sort()).toEqual([...dangerColors].sort());
    expect(itemColors).not.toContain('#ff88c8');
    expect(itemColors).not.toContain('#ffb86c');
    expect(itemColors.every(color => !dangerColors.has(color))).toBe(true);
    expect(em.ITEM_DATA.battery.color).toBe('#6ee7d8');
    expect(em.ITEM_DATA.relic.color).toBe('#c8f26a');
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
    let previousRadius = 0;

    for (let i = 0; i < em.CONFIG.runAnchors; i++) {
      const obj = state.objective;
      const radius = em.objectiveRadius(obj.x, obj.y);
      expect(radius).toBeGreaterThan(previousRadius);
      previousRadius = radius;

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

  test('No Exit keeps spawning anchors past the normal exit threshold', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(4445, { gameMode: 'noExit', mode: 'playing' });
    let previousRadius = 0;

    for (let i = 0; i < em.CONFIG.runAnchors; i++) {
      const obj = state.objective;
      const radius = em.objectiveRadius(obj.x, obj.y);
      expect(radius).toBeGreaterThan(previousRadius);
      previousRadius = radius;

      state.player.x = obj.x * em.CONFIG.cell + em.CONFIG.cell / 2;
      state.player.y = obj.y * em.CONFIG.cell + em.CONFIG.cell / 2;
      em.checkObjective(state, { x: obj.x, y: obj.y });
      expect(state.mode).toBe('upgrade');
      expect(em.chooseUpgrade(state, state.pendingUpgrades[0])).toBe(true);
    }

    expect(state.anchors).toBe(em.CONFIG.runAnchors);
    expect(state.exitPortal).toBe(null);
    expect(state.mode).toBe('playing');
    expect(state.objective).toEqual(expect.objectContaining({ type: 'anchor', tier: em.CONFIG.runAnchors + 1 }));
    expect(state.objectives.length).toBeGreaterThan(0);
    expect(em.objectiveRadius(state.objective.x, state.objective.y)).toBeGreaterThan(previousRadius);
  });

  test('No Exit void activates after five seconds, grows, and kills with void message', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(4446, { gameMode: 'noExit', mode: 'playing' });

    expect(state.void.active).toBe(false);
    state.time = em.CONFIG.noExit.voidDelay - 0.1;
    expect(em.updateNoExitVoid(state)).toBe(false);
    expect(state.void.active).toBe(false);

    state.player.x = em.CONFIG.cell * 20;
    state.player.y = em.CONFIG.cell / 2;
    state.time = em.CONFIG.noExit.voidDelay;
    expect(em.updateNoExitVoid(state)).toBe(false);
    expect(state.void.active).toBe(true);
    expect(state.void.radius).toBe(0);

    state.time = em.CONFIG.noExit.voidDelay + 10;
    expect(em.updateNoExitVoid(state)).toBe(false);
    expect(state.void.radius).toBeGreaterThan(0);

    state.player.x = state.void.x;
    state.player.y = state.void.y;
    expect(em.updateNoExitVoid(state)).toBe(true);
    expect(state.mode).toBe('gameover');
    expect(state.finalStats.reason).toBe('you were lost to the void');
  });

  test('No Exit destroys void-covered anchors and replenishes farther out', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(4447, { gameMode: 'noExit', mode: 'playing' });
    const desired = em.activeAnchorCountForTier(state.tier);
    const swallowedRadius = Math.max(...state.objectives.map(obj => em.objectiveRadius(obj.x, obj.y))) + 2;

    state.void.active = true;
    state.void.radius = swallowedRadius * em.CONFIG.cell;
    state.time = em.CONFIG.noExit.voidDelay + 1;
    state.player.x = em.CONFIG.cell * (swallowedRadius + 24);
    state.player.y = em.CONFIG.cell / 2;

    expect(state.objectives.some(obj => em.isAnchorCoveredByVoid(state, obj))).toBe(true);
    em.ensureNoExitAnchors(state);

    expect(state.objectives).toHaveLength(desired);
    expect(state.objectives.every(obj => !em.isAnchorCoveredByVoid(state, obj))).toBe(true);
    expect(state.objectives.every(obj => em.objectiveRadius(obj.x, obj.y) > swallowedRadius)).toBe(true);
    expect(em.closestActiveAnchor(state)).toBeTruthy();
    expect(em.isAnchorCoveredByVoid(state, em.closestActiveAnchor(state))).toBe(false);
  });

  test('No Exit HUD and results show open-ended anchor counts', () => {
    const context = loadEchoMazeBootstrapContext();
    const em = context.window.EchoMaze;
    const app = em.bootstrap(context.document, context.window);

    em.startMode(app, 'noExit');
    app.state.anchors = 7;
    em.updateHud(app);
    expect(app.dom.runStats.textContent).toContain('Anchors7');
    expect(app.dom.runStats.textContent).not.toContain('7/5');

    em.endRun(app.state, 'gameover', 'you were lost to the void');
    em.renderOverlay(app);
    expect(app.dom.overlayStats.textContent).toContain('Anchors7');
    expect(app.dom.overlayStats.textContent).not.toContain('7/5');
  });

  test('multiple active anchors can be found and any one advances the outward chain', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(4545);
    state.mode = 'playing';

    expect(state.objectives).toHaveLength(em.activeAnchorCountForTier(1));
    const alternate = state.objectives[1];
    const alternateRadius = em.objectiveRadius(alternate.x, alternate.y);
    const primary = state.objective;
    expect(alternate).not.toEqual(primary);

    state.player.x = alternate.x * em.CONFIG.cell + em.CONFIG.cell / 2;
    state.player.y = alternate.y * em.CONFIG.cell + em.CONFIG.cell / 2;
    em.checkObjective(state, { x: alternate.x, y: alternate.y });

    expect(state.anchors).toBe(1);
    expect(state.objective).toBe(null);
    expect(state.objectives).toEqual([]);
    expect(state.lastAnchorRadius).toBeGreaterThanOrEqual(alternateRadius);
    expect(em.chooseUpgrade(state, state.pendingUpgrades[0])).toBe(true);
    expect(state.objectives).toHaveLength(em.activeAnchorCountForTier(state.tier));
    expect(state.objectives.length).toBeGreaterThan(em.activeAnchorCountForTier(1));
    expect(em.objectiveRadius(state.objective.x, state.objective.y)).toBeGreaterThan(alternateRadius);
    for (const obj of state.objectives) {
      expect(em.objectiveRadius(obj.x, obj.y)).toBeGreaterThan(alternateRadius);
    }
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

  test('vision fades toward minimum and danger rises with distance from spawn', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(8888);
    state.mode = 'playing';

    state.player.visionBonus = 2;
    em.updateLanternVision(state, 0);
    const boostedVision = state.player.vision;
    em.updateVisionAndDanger(state, 8);
    expect(state.player.vision).toBeLessThan(boostedVision);
    expect(state.player.vision).toBeGreaterThanOrEqual(state.player.minVision);

    state.player.x = em.CONFIG.cell * 150;
    state.player.y = em.CONFIG.cell / 2;
    em.updateVisionAndDanger(state, 6);
    expect(state.danger).toBeGreaterThan(0);

    const beforeBattery = state.danger;
    em.collectItem(state, 40, 0, { type: 'battery', data: em.ITEM_DATA.battery });
    expect(state.danger).toBeLessThan(beforeBattery);
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

  test('maxed phase pickups force activate through cooldown', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(9998);
    state.mode = 'playing';
    state.player.phaseCharges = em.CONFIG.playerCaps.maxPhaseCharges;
    state.player.phaseCooldownTimer = 2;

    em.collectItem(state, 44, 0, { type: 'phase', data: em.ITEM_DATA.phase });
    expect(state.player.phaseCharges).toBe(em.CONFIG.playerCaps.maxPhaseCharges - 1);
    expect(state.player.phaseTimer).toBe(state.player.phaseDuration);
    expect(state.player.phaseCooldownTimer).toBe(state.player.phaseCooldown);

    state.player.phaseCharges = em.CONFIG.playerCaps.maxPhaseCharges;
    state.player.phaseTimer = 0.5;
    em.collectItem(state, 45, 0, { type: 'relic', data: em.ITEM_DATA.relic });
    expect(state.player.phaseCharges).toBe(em.CONFIG.playerCaps.maxPhaseCharges - 1);
    expect(state.player.phaseTimer).toBe(state.player.phaseDuration);
  });

  test('lantern upgrades raise minimum vision and fade never drops below it', () => {
    const em = loadEchoMazeRuntime();
    const state = em.createRun(10101);
    state.mode = 'playing';

    const baseMin = state.player.minVision;
    em.applyUpgrade(state, 'lanternReservoir');
    em.applyUpgrade(state, 'lanternFocus');
    expect(state.player.minVision).toBeGreaterThan(baseMin);

    state.player.visionBonus = 3;
    em.updateLanternVision(state, 0);
    expect(state.player.vision).toBeGreaterThan(state.player.minVision);

    em.updateVisionAndDanger(state, 1000);
    expect(state.player.vision).toBe(state.player.minVision);
    expect(state.player.vision).toBeGreaterThan(baseMin);
  });

  test('biomes are deterministic per chunk and preserve portal symmetry', () => {
    const em = loadEchoMazeRuntime();
    const a = em.createRun(24680);
    const b = em.createRun(24680);

    expect(em.biomeForChunk(a, 2, -3).id).toBe(em.biomeForChunk(b, 2, -3).id);
    expect(em.biomeForChunk(a, 2, -3).dangerBand).toBe(em.biomeForChunk(b, 2, -3).dangerBand);
    expect(em.dangerForChunk(0, 0)).toBeLessThan(em.dangerForChunk(8, 0));
    expect(em.dangerBandForChunk(8, 0)).toBeGreaterThanOrEqual(em.dangerBandForChunk(1, 0));

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

  test('farther danger bands spawn more and faster damaging enemies', () => {
    const em = loadEchoMazeRuntime();
    const near = em.createRun(54545);
    const far = em.createRun(54545);

    near.anchors = 2;
    far.anchors = 2;
    far.player.x = em.CONFIG.cell * 150;
    far.player.y = em.CONFIG.cell / 2;

    em.spawnAmbientEnemies(near);
    em.spawnAmbientEnemies(far);
    expect(far.enemies.length).toBeGreaterThan(near.enemies.length);
    expect(em.currentDangerPressure(far)).toBeGreaterThan(em.CONFIG.enemies.criticalThreshold);

    const nearEnemy = em.createEnemy(near, 'shadow', { x: 12, y: 0 }, 1);
    const farEnemy = em.createEnemy(far, 'shadow', { x: 150, y: 0 }, 1);
    near.enemies = [nearEnemy];
    far.enemies = [farEnemy];
    nearEnemy.path = [{ x: 12, y: 0 }, { x: 11, y: 0 }];
    farEnemy.path = [{ x: 150, y: 0 }, { x: 149, y: 0 }];
    nearEnemy.pathTimer = 1;
    farEnemy.pathTimer = 1;

    const nearBefore = nearEnemy.x;
    const farBefore = farEnemy.x;
    em.updateMobileEnemy(near, nearEnemy, 0.5, { x: 0, y: 0 });
    em.updateMobileEnemy(far, farEnemy, 0.5, { x: 0, y: 0 });
    expect(Math.abs(farEnemy.x - farBefore)).toBeGreaterThan(Math.abs(nearEnemy.x - nearBefore));
    expect(em.enemyDamageForState(far)).toBeGreaterThan(em.enemyDamageForState(near));

    far.enemies = [];
    far.enemySpawnClock = 10;
    em.updateEnemies(far, 0.1, em.cellOfWorld(far.player.x, far.player.y));
    expect(em.nearbyEnemyCount(far, em.cellOfWorld(far.player.x, far.player.y), em.CONFIG.enemies.nearbyRadius)).toBeGreaterThanOrEqual(em.CONFIG.enemies.criticalMinNearby);
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
