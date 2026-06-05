const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const gamePath = path.join(root, 'games/stormline-runner/index.html');
const configPath = path.join(root, 'games.config.js');
const gameDir = path.dirname(gamePath);
const expectedScripts = [
  'js/config.js',
  'js/rng.js',
  'js/input.js',
  'js/talents.js',
  'js/world.js',
  'js/player.js',
  'js/render.js',
  'js/main.js'
];

function readGameHtml() {
  return fs.readFileSync(gamePath, 'utf8');
}

function readGameFile(relativePath) {
  return fs.readFileSync(path.join(gameDir, relativePath), 'utf8');
}

function readScript(relativePath) {
  return readGameFile(relativePath);
}

function readScripts() {
  return expectedScripts.map(readScript).join('\n');
}

function loadCoreRuntime() {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  [
    'js/config.js',
    'js/rng.js',
    'js/talents.js',
    'js/world.js',
    'js/player.js'
  ].forEach(scriptPath => {
    vm.runInContext(readScript(scriptPath), sandbox);
  });
  return sandbox.window.StormlineRunner;
}

describe('Stormline Runner static integration', () => {
  test('provides the GameHub iframe entry point and parseable external scripts', () => {
    expect(fs.existsSync(gamePath)).toBe(true);

    for (const scriptPath of expectedScripts) {
      expect(fs.existsSync(path.join(gameDir, scriptPath))).toBe(true);
      expect(() => new Function(readScript(scriptPath))).not.toThrow();
    }
  });

  test('is registered in the configured GameHub catalog', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'stormline-runner',
          name: 'Stormline Runner',
          category: 'Platformer',
          rendering: 'Canvas',
          input: 'Keyboard',
          saveSupport: 'None'
        })
      ])
    );
  });

  test('uses a layout-only entry point with ordered assets', () => {
    const html = readGameHtml();

    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect(html).not.toContain('style=');
    expect(html).not.toContain('onclick=');

    const scriptSources = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    expect(scriptSources).toEqual(expectedScripts);
  });

  test('includes weather-front generation, movement verbs, and shrine talents', () => {
    const script = readScripts();

    expect(script).toContain('Magnetic Rain');
    expect(script).toContain('Heat Bloom');
    expect(script).toContain('Static Fog');
    expect(script).toContain('Prism Squall');
    expect(script).toContain('Overcast Calm');
    expect(script).toContain('createDraft(currentWeather, nextWeather)');
    expect(script).toContain('getDashDurationBonus(weather)');
    expect(script).toContain('maxRunSpeed');
    expect(script).toContain('platformLayerStep');
    expect(script).toContain('maxGapWidth');
    expect(script).toContain('wallJumpX');
    expect(script).toContain('coyoteTime');
    expect(script).toContain('jumpBuffer');
    expect(script).toContain('dashCooldown');
  });

  test('gives the player full horizontal control without forced forward motion', () => {
    const ns = loadCoreRuntime();
    const world = new ns.StormWorld('control-smoke');
    const talents = new ns.TalentSystem(ns.createRng('control-smoke:talents'));
    const weather = world.getWeatherAt(0);
    const idlePlayer = new ns.RunnerPlayer();
    const movingPlayer = new ns.RunnerPlayer();
    const idleActions = { left: false, right: false, jumpHeld: false, jumpPressed: false, dashHeld: false, dashPressed: false };
    const rightActions = { left: false, right: true, jumpHeld: false, jumpPressed: false, dashHeld: false, dashPressed: false };

    for (let i = 0; i < 30; i++) {
      idlePlayer.update(1 / 60, idleActions, world, talents, weather);
      movingPlayer.update(1 / 60, rightActions, world, talents, weather);
    }

    expect(idlePlayer.x).toBeLessThan(ns.CONFIG.world.startX + 2);
    expect(Math.abs(idlePlayer.vx)).toBeLessThan(2);
    expect(movingPlayer.x).toBeGreaterThan(ns.CONFIG.world.startX + 45);
    expect(movingPlayer.vx).toBeGreaterThan(120);
  });

  test('generates reachable early platform layers and low obstacles', () => {
    const ns = loadCoreRuntime();
    const world = new ns.StormWorld('reachability-smoke');
    world.generateUntil(ns.CONFIG.world.chunkWidth * 16);

    const floor = ns.CONFIG.world.floorY;
    const layer = ns.CONFIG.world.platformLayerStep;
    const earlyPlatforms = world.platforms.filter(platform => platform.x < ns.CONFIG.world.chunkWidth * 8);
    const earlyHazards = world.hazards.filter(hazard => hazard.x < ns.CONFIG.world.chunkWidth * 8);

    expect(earlyPlatforms.length).toBeGreaterThan(12);
    earlyPlatforms.forEach(platform => {
      expect(platform.y).toBeGreaterThanOrEqual(floor - layer * 2 - ns.CONFIG.world.maxGroundStep);
      expect(platform.y).toBeLessThanOrEqual(floor + ns.CONFIG.world.maxGroundStep);
    });
    earlyHazards.forEach(hazard => {
      expect(hazard.h).toBeLessThanOrEqual(28);
      expect(hazard.w).toBeLessThanOrEqual(48);
    });
    world.platforms
      .filter(platform => platform.type === 'wall')
      .forEach(wall => expect(wall.h).toBeLessThanOrEqual(46));
  });

  test('keeps the visual shell responsive and non-overlapping', () => {
    const css = readGameFile('css/style.css');

    expect(css).toContain('grid-template-columns: minmax(220px, 1fr) minmax(220px, 1fr)');
    expect(css).toContain('max-height: calc(100vh - 44px)');
    expect(css).toContain('overflow: auto');
    expect(css).toContain('@media (max-width: 760px)');
    expect(css).toContain('grid-template-columns: 1fr');
    expect(css).toContain('text-overflow: ellipsis');
  });
});
