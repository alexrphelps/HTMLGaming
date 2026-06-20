const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextDecoder, TextEncoder } = require('util');

global.TextDecoder = global.TextDecoder || TextDecoder;
global.TextEncoder = global.TextEncoder || TextEncoder;

const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '../..');
const gamePath = path.join(root, 'games/depthbound/index.html');
const gameDir = path.dirname(gamePath);
const configPath = path.join(root, 'games.config.js');

const expectedScripts = [
  'js/config.js',
  'js/utils.js',
  'js/state.js',
  'js/world.js',
  'js/navigation.js',
  'js/progression.js',
  'js/entities.js',
  'js/systems.js',
  'js/render.js',
  'js/ui.js',
  'js/main.js'
];

const runtimeScripts = expectedScripts.filter(scriptPath => scriptPath !== 'js/main.js');

function readGameFile(relativePath) {
  return fs.readFileSync(path.join(gameDir, relativePath), 'utf8');
}

function loadDepthboundRuntime() {
  const sandbox = {
    window: {},
    console,
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);

  runtimeScripts.forEach(scriptPath => {
    vm.runInContext(readGameFile(scriptPath), sandbox, {
      filename: path.join(gameDir, scriptPath)
    });
  });

  return sandbox.window.Depthbound;
}

function attachDepthboundRuntimeStubs(db) {
  const noop = () => {};
  const fakeEl = () => ({
    style: {},
    innerHTML: '',
    textContent: '',
    addEventListener: noop,
    appendChild: noop
  });

  db.canvas = { clientWidth: 1280, clientHeight: 720, width: 1280, height: 720 };
  db.devicePixelRatio = 1;
  db.document = {
    createElement: () => fakeEl(),
    getElementById: () => fakeEl()
  };
  db.mouse = { x: 640, y: 360, down: false, worldX: 0, worldY: 0 };
  db.keys = new Set();
  db.justPressed = new Set();
  db.tone = noop;
  db.choicePanel = fakeEl();
  db.choiceTitle = fakeEl();
  db.choiceText = fakeEl();
  db.choicesEl = fakeEl();
  db.gameOverPanel = fakeEl();
  db.gameOverStats = fakeEl();
  db.codexPanel = fakeEl();
  db.codexContent = fakeEl();
}

function createCanvasContext() {
  const noop = () => {};
  return {
    setTransform: noop,
    clearRect: noop,
    save: noop,
    restore: noop,
    translate: noop,
    fillRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    fillText: noop,
    strokeText: noop,
    createLinearGradient() {
      return { addColorStop: noop };
    },
    measureText(text) {
      return { width: String(text).length * 7 };
    }
  };
}

function loadDepthboundPage() {
  const html = fs.readFileSync(gamePath, 'utf8');
  const dom = new JSDOM(html, {
    url: 'http://localhost/games/depthbound/index.html',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(window) {
      window.HTMLCanvasElement.prototype.getContext = () => createCanvasContext();
    }
  });

  dom.window.requestAnimationFrame = () => 0;
  dom.window.cancelAnimationFrame = () => {};
  dom.window.devicePixelRatio = 1;

  expectedScripts.forEach(scriptPath => {
    dom.window.eval(readGameFile(scriptPath));
  });

  return dom;
}

describe('Depthbound modular GameHub entry', () => {
  test('provides a clean iframe entry point with ordered external assets', () => {
    expect(fs.existsSync(gamePath)).toBe(true);

    for (const scriptPath of expectedScripts) {
      const fullPath = path.join(gameDir, scriptPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(() => new Function(readGameFile(scriptPath))).not.toThrow();
    }

    const html = fs.readFileSync(gamePath, 'utf8');
    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect(html).not.toContain('style=');
    expect(html).not.toContain('onclick=');
    expect([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1])).toEqual(expectedScripts);
  });

  test('keeps doorway previews mysterious and visual instead of text-labeled', () => {
    const renderSource = readGameFile('js/render.js');

    expect(renderSource).toContain('function drawDoorPortal');
    expect(renderSource).toContain('function drawDoorInvites');
    expect(renderSource).not.toContain('walk in');
    expect(renderSource).not.toContain('function drawDoorLabels');
    expect(renderSource).not.toMatch(/fillText\(t,/);
  });

  test('is registered in the configured AI Slope catalog section', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'depthbound',
          name: 'Depthbound',
          category: 'Action RPG',
          input: 'Keyboard + Mouse',
          rendering: 'Canvas',
          saveSupport: 'High Score',
          libraryList: 'ai-slope'
        })
      ])
    );
  });

  test('boots the full page and starts a run from the Start button', () => {
    const dom = loadDepthboundPage();
    const db = dom.window.Depthbound;

    expect(db).toBeDefined();
    expect(dom.window.getComputedStyle(dom.window.document.getElementById('startPanel')).display).toBe('flex');
    expect(db.getGame()).toBeNull();

    dom.window.document.getElementById('startBtn').click();

    expect(db.getGame()).toBeDefined();
    expect(db.currentRoom().type).toBe('start');
    expect(db.getGame().player.abilities.q).toBe('Grenade');
    expect(dom.window.document.getElementById('startPanel').style.display).toBe('none');

    dom.window.dispatchEvent(new dom.window.KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }));

    expect(db.getGame().roomX).toBe(1);
    expect(db.getGame().roomY).toBe(0);
    expect(db.currentRoom().type).toBe('combat');
    expect(db.getGame().enemies.length).toBeGreaterThan(0);
  });

  test('exposes deterministic helpers through the Depthbound namespace', () => {
    const db = loadDepthboundRuntime();
    const first = db.mulberry32(12345);
    const second = db.mulberry32(12345);

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
    expect(db.seeded(77, 1, -2, 'room')()).toBe(db.seeded(77, 1, -2, 'room')());
  });

  test('creates the default player and run state expected by the dungeon loop', () => {
    const db = loadDepthboundRuntime();
    const player = db.defaultPlayer();
    const run = db.createRunState(1234, { getItem: () => '42' });

    expect(player.hp).toBe(6);
    expect(player.maxHp).toBe(6);
    expect(player.branch).toEqual({ Gunner: 0, Phantom: 0, Occult: 0, Engineer: 0, Alchemist: 0 });
    expect(player.stats.damage).toBe(1);
    expect(player.stats.projectiles).toBe(1);
    expect(run.player.abilities.q).toBe('Grenade');
    expect(run.highScore).toBe(42);
  });

  test('generates a start room and a valid adjacent combat path', () => {
    const db = loadDepthboundRuntime();
    const run = db.createRunState(9876, { getItem: () => null });

    db.setGame(run);

    const start = db.makeRoom(0, 0, 'start');
    const combat = db.makeRoom(1, 0, 'combat');

    expect(start.type).toBe('start');
    expect(start.exits).toEqual(expect.arrayContaining(['N', 'E', 'S', 'W']));
    expect(combat.type).toBe('combat');
    expect(combat.exits).toContain('W');
    expect(combat.obstacles.every(obstacle => obstacle.x >= 0 && obstacle.y >= 0)).toBe(true);
    expect(combat.validated).toBe(true);
    expect(combat.spawnPoints.length).toBeGreaterThan(0);
  });

  test('exports deterministic room navigation helpers', () => {
    const db = loadDepthboundRuntime();

    expect(typeof db.buildRoomDoorZones).toBe('function');
    expect(typeof db.buildRoomReservedLanes).toBe('function');
    expect(typeof db.buildNavGrid).toBe('function');
    expect(typeof db.findPath).toBe('function');
    expect(typeof db.hasLineOfSight).toBe('function');
    expect(typeof db.getDoorSpawnPoint).toBe('function');
  });

  test('validates generated rooms so every open door and spawn is reachable', () => {
    const db = loadDepthboundRuntime();
    const seeds = [7, 11, 23, 41, 73, 101, 151, 211];
    const coords = [[0, 0, 'start'], [1, 0, 'combat'], [2, 1, 'elite'], [-2, 1, 'cursed'], [3, -2, 'treasure']];

    for (const seed of seeds) {
      const run = db.createRunState(seed, { getItem: () => null });
      db.setGame(run);

      for (const [x, y, type] of coords) {
        const room = db.makeRoom(x, y, type);
        expect(room.validated).toBe(true);
        for (const exit of room.exits) {
          const door = db.getDoorSpawnPoint(exit);
          expect(db.findPath(room, db.ROOM_W / 2, db.ROOM_H / 2, door.x, door.y).length).toBeGreaterThan(0);
        }
        expect(room.spawnPoints.length).toBeGreaterThan(0);
        for (const point of room.spawnPoints.slice(0, 8)) {
          expect(db.isPointBlocked(room, point.x, point.y)).toBe(false);
          expect(db.pointTouchesReserved(point.x, point.y, room.reservedLanes, 12)).toBe(false);
          expect(db.findPath(room, db.ROOM_W / 2, db.ROOM_H / 2, point.x, point.y).length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('spawns combat enemies only on reachable navigation points', () => {
    const db = loadDepthboundRuntime();
    const run = db.createRunState(4242, { getItem: () => null });
    db.setGame(run);
    const room = db.makeRoom(2, 0, 'combat');

    db.setupRoom(room);

    expect(run.enemies.length).toBeGreaterThan(0);
    for (const enemy of run.enemies) {
      expect(db.isPointBlocked(room, enemy.x, enemy.y, enemy.r)).toBe(false);
      expect(db.pointTouchesReserved(enemy.x, enemy.y, room.reservedLanes, 8)).toBe(false);
      expect(db.findPath(room, db.ROOM_W / 2, db.ROOM_H / 2, enemy.x, enemy.y).length).toBeGreaterThan(0);
      expect(enemy.path).toEqual([]);
      expect(enemy.role).toEqual(expect.any(String));
      expect(enemy.pathTarget).toBeNull();
      expect(enemy.desiredRange).toBeGreaterThan(0);
    }
  });

  test('finds paths around obstacles and reports no route across sealed walls', () => {
    const db = loadDepthboundRuntime();
    const run = db.createRunState(9001, { getItem: () => null });
    db.setGame(run);
    const room = {
      x: 0,
      y: 0,
      key: 'synthetic',
      type: 'combat',
      exits: ['E', 'W'],
      obstacles: [
        { x: 480, y: 0, w: 40, h: 280, kind: 'wall' },
        { x: 480, y: 400, w: 40, h: 280, kind: 'wall' }
      ],
      reservedLanes: [],
      doorZones: db.buildRoomDoorZones(['E', 'W']),
      spawnPoints: [],
      navGrid: null
    };

    expect(db.findPath(room, 180, 340, 860, 340).length).toBeGreaterThan(0);

    room.obstacles.push({ x: 480, y: 280, w: 40, h: 120, kind: 'wall' });
    room.navGrid = null;
    expect(db.findPath(room, 180, 340, 860, 340)).toEqual([]);
    expect(db.findNearestReachablePoint(room, 500, 340)).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
  });

  test('enemy path following moves non-phasing enemies toward waypoints', () => {
    const db = loadDepthboundRuntime();
    const run = db.createRunState(31415, { getItem: () => null });
    db.setGame(run);
    const room = db.makeRoom(1, 1, 'combat');
    run.roomX = 1;
    run.roomY = 1;
    run.rooms.set(room.key, room);
    run.player.x = db.ROOM_W / 2;
    run.player.y = db.ROOM_H / 2;
    const start = room.spawnPoints[0];
    const enemy = db.spawnEnemy('ratling', start.x, start.y, 1, false, run.rng);
    const before = db.dist(enemy.x, enemy.y, run.player.x, run.player.y);

    for (let i = 0; i < 24; i++) db.updateEnemyAI(enemy, 1 / 30, 1);

    expect(enemy.path.length).toBeGreaterThan(0);
    expect(db.dist(enemy.x, enemy.y, run.player.x, run.player.y)).toBeLessThan(before);
  });

  test('door transitions use readable zones, locks, grace, and boss gate creation', () => {
    const db = loadDepthboundRuntime();
    const run = db.createRunState(8181, { getItem: () => null });
    db.setGame(run);
    const start = db.makeRoom(0, 0, 'start');
    db.enterRoom(0, 0, 'start');

    run.transitionGrace = 0;
    run.player.x = db.ROOM_W / 2;
    run.player.y = 20;
    db.updateTransitions(1 / 60);
    expect(run.roomX).toBe(0);
    expect(run.roomY).toBe(-1);
    expect(run.player.y).toBeGreaterThan(db.ROOM_H - 100);

    db.enterRoom(0, 0, 'start');
    start.locked = true;
    run.transitionGrace = 0;
    run.player.x = db.ROOM_W - 20;
    run.player.y = db.ROOM_H / 2;
    db.updateTransitions(1 / 60);
    expect(run.roomX).toBe(0);
    expect(run.roomY).toBe(0);

    start.locked = false;
    run.bossMeter = run.bossMeterMax;
    run.transitionGrace = 0;
    run.player.x = db.ROOM_W - 20;
    run.player.y = db.ROOM_H / 2;
    db.updateTransitions(1 / 60);
    expect(run.roomX).toBe(1);
    expect(run.roomY).toBe(0);
    expect(db.currentRoom().type).toBe('boss');
  });

  test('caps volatile combat arrays and clears cleared-room projectile storms during pause', () => {
    const db = loadDepthboundRuntime();
    attachDepthboundRuntimeStubs(db);
    const run = db.createRunState(67890, { getItem: () => null });
    db.setGame(run);
    run.started = true;
    run.personality = db.PERSONALITIES.find(personality => personality.id === 'hungry') || run.personality;
    const room = db.makeRoom(1, 0, 'boss');
    run.roomX = 1;
    run.roomY = 0;
    db.setupRoom(room);
    const boss = run.enemies.find(enemy => enemy.boss);

    run.player.stats.projectiles = 12;
    run.player.stats.fireRate = 12;
    run.player.stats.explosive = 1;
    run.player.stats.lightning = 1;
    run.player.stats.homing = 1;
    run.player.stats.damage = 10;

    for (let i = 0; i < 80; i++) {
      db.firePlayerShot(run.player.x, run.player.y, db.angleTo(run.player.x, run.player.y, boss.x, boss.y));
    }

    expect(run.bullets.length).toBeLessThanOrEqual(db.VOLATILE_LIMITS.bullets);
    expect(run.particles.length).toBeLessThanOrEqual(db.VOLATILE_LIMITS.particles);

    for (let i = 0; i < 180; i++) db.update(1 / 60);

    expect(room.cleared).toBe(true);
    expect(run.paused).toBe(true);
    expect(run.player.bossesKilled).toBe(1);
    expect(run.bullets).toHaveLength(0);
    expect(run.enemyBullets).toHaveLength(0);
    expect(run.hazards).toHaveLength(0);
    expect(run.mines).toHaveLength(0);
    expect(run.particles.length).toBeLessThanOrEqual(db.VOLATILE_LIMITS.particles);
  });

  test('paused cleanup decays visual effects instead of freezing them behind modals', () => {
    const db = loadDepthboundRuntime();
    attachDepthboundRuntimeStubs(db);
    const run = db.createRunState(13579, { getItem: () => null });
    db.setGame(run);
    run.started = true;
    db.makeRoom(0, 0, 'start');
    db.enterRoom(0, 0, 'start');
    const room = db.currentRoom();
    room.cleared = false;

    for (let i = 0; i < db.VOLATILE_LIMITS.particles + 80; i++) db.particle(120, 120, '#ffffff', 0, 0.05, 2);
    for (let i = 0; i < db.VOLATILE_LIMITS.damageTexts + 20; i++) db.addDamageText(160, 160, '1', '#ffffff');
    run.paused = true;

    expect(run.particles.length).toBe(db.VOLATILE_LIMITS.particles);
    expect(run.damageTexts.length).toBe(db.VOLATILE_LIMITS.damageTexts);

    db.update(0.7);

    expect(run.paused).toBe(true);
    expect(run.particles.length).toBe(0);
    expect(run.damageTexts.length).toBe(0);
    expect(run.bullets.length).toBe(0);
  });

  test('keeps branch, relic, and ability data available for future tests', () => {
    const db = loadDepthboundRuntime();
    const branches = new Set(db.TALENTS.map(talent => talent.branch));
    const talentNames = db.TALENTS.map(talent => talent.name);
    const relicNames = db.RELICS.map(relic => relic.name);

    expect(branches).toEqual(new Set(['Gunner', 'Phantom', 'Occult', 'Engineer', 'Alchemist']));
    expect(talentNames).toEqual(expect.arrayContaining([
      'Grenadier Keybind',
      'Blink Sigil',
      'Black Hole Ritual',
      'Ice Nova'
    ]));
    expect(relicNames).toEqual(expect.arrayContaining(['Rat King\'s Tooth', 'Bullet Halo', 'Witch Battery']));
  });
});
