const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const gameDir = path.join(root, 'games/lanternfall');
const gamePath = path.join(gameDir, 'index.html');
const configPath = path.join(root, 'games.config.js');
const expectedScripts = [
  'js/config.js',
  'js/math.js',
  'js/world.js',
  'js/state.js',
  'js/effects.js',
  'js/input.js',
  'js/audio.js',
  'js/ui.js',
  'js/renderer.js',
  'js/minimap.js',
  'js/game.js',
  'js/main.js'
];
const runtimeScripts = expectedScripts.filter(script => script !== 'js/main.js');

function readGameFile(relativePath) {
  return fs.readFileSync(path.join(gameDir, relativePath), 'utf8');
}

function loadLanternfallRuntime(scripts = runtimeScripts) {
  const sandbox = {
    window: {},
    document: {},
    console,
    Math,
    setTimeout,
    clearTimeout
  };
  vm.createContext(sandbox);
  scripts.forEach(scriptPath => {
    vm.runInContext(readGameFile(scriptPath), sandbox, { filename: scriptPath });
  });
  return sandbox.window.Lanternfall;
}

function createEventTarget() {
  const listeners = {};
  return {
    listeners,
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter(item => item !== handler);
    },
    emit(type, event = {}) {
      (listeners[type] || []).forEach(handler => handler(event));
    }
  };
}

function createCanvasContext() {
  const noop = () => {};
  return {
    setTransform: noop,
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    arc: noop,
    fill: noop,
    save: noop,
    restore: noop,
    clip: noop,
    createRadialGradient() {
      return { addColorStop: noop };
    }
  };
}

function createDomElement(id) {
  const target = createEventTarget();
  return {
    ...target,
    id,
    style: {},
    value: '',
    textContent: '',
    width: 0,
    height: 0,
    blur: jest.fn(),
    getContext: jest.fn(() => createCanvasContext()),
    classList: {
      values: new Set(),
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      }
    }
  };
}

describe('Lanternfall modular integration', () => {
  test('provides a clean iframe entry point with ordered external assets', () => {
    expect(fs.existsSync(gamePath)).toBe(true);

    for (const scriptPath of expectedScripts) {
      const script = readGameFile(scriptPath);
      expect(fs.existsSync(path.join(gameDir, scriptPath))).toBe(true);
      expect(() => new Function(script)).not.toThrow();
    }

    const html = fs.readFileSync(gamePath, 'utf8');
    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect(html).not.toContain('onclick=');
    expect([...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1])).toEqual(expectedScripts);
  });

  test('keeps the legacy direct URL as a lightweight redirect', () => {
    const legacy = readGameFile('lanternfall.html');

    expect(legacy).toContain('url=index.html');
    expect(legacy).not.toMatch(/<style[\s>]/);
    expect(legacy).not.toMatch(/<script[\s>]/);
  });

  test('is registered in the configured GameHub catalog', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'lanternfall',
          name: 'Lanternfall',
          category: 'Exploration',
          difficulty: 'Easy',
          icon: 'LF',
          tags: ['2d', 'exploration', 'procedural', 'cave', 'canvas'],
          input: 'Keyboard + Touch',
          rendering: 'Canvas',
          saveSupport: 'None'
        })
      ])
    );
  });

  test('deterministically generates safe origin tiles and matching distant samples', () => {
    const lf = loadLanternfallRuntime();
    const first = new lf.World(2468);
    const second = new lf.World(2468);

    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        expect(first.getTile(x, y).type).toBe(lf.TILE_TYPES.FLOOR);
      }
    }

    const samples = [
      [12, -7],
      [-31, 45],
      [100, 101]
    ];
    samples.forEach(([x, y]) => {
      expect(first.getTile(x, y)).toMatchObject(second.getTile(x, y));
    });
  });

  test('item pickup effects update score, lantern range, and remaining-duration timers', () => {
    const lf = loadLanternfallRuntime();
    const world = new lf.World(1);
    const state = lf.createInitialState(1);

    world.setTile(1, 0, { type: lf.TILE_TYPES.FLOOR, item: { kind: 'gem', taken: false }, shade: 1 });
    expect(lf.effects.resolveArrival(state, world, 1, 0).kind).toBe('gem');
    expect(state.score).toBe(lf.CONFIG.items.score);
    expect(world.getTile(1, 0).item.taken).toBe(true);

    world.setTile(2, 0, { type: lf.TILE_TYPES.FLOOR, item: { kind: 'speed', taken: false }, shade: 1 });
    lf.effects.resolveArrival(state, world, 2, 0);
    expect(state.speedRemaining).toBe(lf.CONFIG.effects.speedDuration);
    lf.effects.updateTimedEffects(state, 2);
    expect(state.speedRemaining).toBe(lf.CONFIG.effects.speedDuration - 2);

    state.visionRadius = lf.CONFIG.vision.max;
    lf.effects.applyItemEffect(state, world, 'lantern');
    expect(state.visionRadius).toBe(lf.CONFIG.vision.max);
    expect(state.lanternLevel).toBe(2);
  });

  test('uses game-time remaining durations instead of wall-clock effect deadlines', () => {
    const scripts = runtimeScripts.map(readGameFile).join('\n');
    const lf = loadLanternfallRuntime();
    const state = lf.createInitialState(7);

    state.speedRemaining = 6;
    state.compassPing = { x: 5, y: 5, remaining: 9 };
    lf.effects.updateTimedEffects(state, 0.5);

    expect(scripts).not.toContain('Date.now');
    expect(state.speedRemaining).toBe(5.5);
    expect(state.compassPing.remaining).toBe(8.5);
  });

  test('blocks movement into walls and reveals exactly within lantern range', () => {
    const lf = loadLanternfallRuntime();
    const state = lf.createInitialState(3);
    const wallWorld = { getTile: () => ({ type: lf.TILE_TYPES.WALL }) };

    expect(lf.attemptMove(state, wallWorld, { dx: 1, dy: 0 })).toBe(false);
    expect(state.player.moving).toBe(false);
    expect(state.player.gx).toBe(0);
    expect(state.player.facing).toBe('right');

    state.visionRadius = 2;
    lf.revealVisibleTiles(state);
    expect(state.explored.has('0,0')).toBe(true);
    expect(state.explored.has('2,0')).toBe(true);
    expect(state.explored.has('3,0')).toBe(false);
  });

  test('input controller clears transient state and removes listeners on cleanup', () => {
    const lf = loadLanternfallRuntime();
    const hostWindow = createEventTarget();
    const doc = createEventTarget();
    doc.visibilityState = 'visible';
    const buttons = new Map(['btnUp', 'btnDown', 'btnLeft', 'btnRight'].map(id => [id, createEventTarget()]));
    doc.getElementById = id => buttons.get(id);

    const input = new lf.InputController({ window: hostWindow, document: doc });
    input.bind();
    hostWindow.emit('keydown', { key: 'ArrowUp', preventDefault: jest.fn() });
    expect(input.desiredDir()).toEqual({ dx: 0, dy: -1 });

    hostWindow.emit('blur');
    expect(input.desiredDir()).toBe(null);

    doc.visibilityState = 'hidden';
    hostWindow.emit('keydown', { key: 'd', preventDefault: jest.fn() });
    doc.emit('visibilitychange');
    expect(input.desiredDir()).toBe(null);

    input.unbind();
    expect(hostWindow.listeners.keydown).toHaveLength(0);
    expect(hostWindow.listeners.keyup).toHaveLength(0);
    expect(hostWindow.listeners.blur).toHaveLength(0);
    expect(doc.listeners.visibilitychange).toHaveLength(0);
  });

  test('boots through main.js with the expected DOM and canvas hooks', () => {
    const elements = new Map();
    const getElementById = jest.fn(id => {
      if (!elements.has(id)) elements.set(id, createDomElement(id));
      return elements.get(id);
    });
    const hostWindow = createEventTarget();
    hostWindow.innerWidth = 960;
    hostWindow.innerHeight = 640;
    hostWindow.devicePixelRatio = 1;
    hostWindow.requestAnimationFrame = jest.fn(() => 1);
    hostWindow.cancelAnimationFrame = jest.fn();
    const doc = createEventTarget();
    doc.visibilityState = 'visible';
    doc.getElementById = getElementById;
    doc.querySelector = jest.fn(selector => {
      if (selector === '.seedRow') return getElementById('seedRow');
      return null;
    });

    const sandbox = {
      window: hostWindow,
      document: doc,
      console,
      Math,
      setTimeout,
      clearTimeout
    };
    hostWindow.window = hostWindow;
    vm.createContext(sandbox);
    expectedScripts.forEach(scriptPath => {
      vm.runInContext(readGameFile(scriptPath), sandbox, { filename: scriptPath });
    });

    expect(hostWindow.Lanternfall.app).toBeInstanceOf(hostWindow.Lanternfall.LanternfallGame);
    expect(hostWindow.requestAnimationFrame).toHaveBeenCalled();
    expect(getElementById('game').getContext).toHaveBeenCalledWith('2d');
    expect(getElementById('minimap').width).toBe(hostWindow.Lanternfall.CONFIG.minimap.size);
    expect(hostWindow.listeners.resize).toHaveLength(1);
  });
});
