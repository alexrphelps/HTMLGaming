const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const gamePath = path.join(root, 'games/castlefall_valley/index.html');
const configPath = path.join(root, 'games.config.js');
const gameDir = path.dirname(gamePath);
const expectedScripts = [
  'js/config.js',
  'js/state.js',
  'js/utils.js',
  'js/terrain.js',
  'js/effects.js',
  'js/combat.js',
  'js/systems.js',
  'js/render.js',
  'js/ui.js',
  'js/input.js',
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

function createDomElement(id) {
  const listeners = {};
  return {
    id,
    style: {},
    disabled: false,
    textContent: '',
    innerHTML: '',
    listeners,
    classList: {
      values: new Set(),
      add(name) {
        this.values.add(name);
      },
      remove(name) {
        this.values.delete(name);
      },
      toggle(name, enabled) {
        if (enabled) this.values.add(name);
        else this.values.delete(name);
      },
      contains(name) {
        return this.values.has(name);
      }
    },
    setAttribute(name, value) {
      this[name] = value;
    },
    querySelector() {
      return { style: {} };
    },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter(item => item !== handler);
    }
  };
}

function loadCastlefallRuntime(scriptPaths = [
  'js/config.js',
  'js/state.js',
  'js/utils.js',
  'js/terrain.js',
  'js/effects.js',
  'js/combat.js',
  'js/systems.js',
  'js/ui.js'
]) {
  const elements = new Map();
  const document = {
    getElementById: jest.fn(id => {
      if (!elements.has(id)) elements.set(id, createDomElement(id));
      return elements.get(id);
    })
  };
  const sandbox = {
    window: {},
    document,
    performance: { now: () => 0 },
    console,
    setTimeout,
    clearTimeout,
    Math
  };

  vm.createContext(sandbox);
  for (const scriptPath of scriptPaths) {
    vm.runInContext(readScript(scriptPath), sandbox, { filename: scriptPath });
  }

  return {
    api: sandbox.window.CastlefallValley,
    elements,
    document
  };
}

describe('Castlefall Valley static integration', () => {
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
          folder: 'castlefall_valley',
          name: 'Castlefall Valley',
          rendering: 'Canvas'
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

  test('uses responsive terrain lowering and richer unit UI controls', () => {
    const html = readGameHtml();
    const script = readScripts();

    expect(script).toContain('function terrainOffset()');
    expect(script).toContain('state.h * 0.17');
    expect(script).toContain('button.disabled = blocked');
    expect(script).toContain('function updateArmyStrip()');
    expect(script).toContain('function setupControlLabels()');
    expect(script).toContain('function setupInput()');
    expect(script).toContain('function cleanupInput()');
    expect(script).toContain('if (!e.repeat)');
    expect(html).toContain('id="armyStrip"');
    expect(html).toContain('class="touch-controls"');
  });

  test('uses guarded overlay layout rules to prevent UI overlap', () => {
    const css = readGameFile('css/style.css');

    expect(css).toContain('grid-template-rows: auto 1fr auto');
    expect(css).toContain('position: fixed');
    expect(css).toContain('bottom: var(--edge)');
    expect(css).toContain('max-height: min(36vh, 230px)');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('@media (max-width: 1100px)');
    expect(css).toContain('top: 46%');
    expect(css).toContain('flex-wrap: wrap');
  });

  test('centralizes command and build definitions while preserving DOM IDs', () => {
    const html = readGameHtml();
    const sandbox = { window: {}, console };
    vm.createContext(sandbox);
    vm.runInContext(readScript('js/config.js'), sandbox);

    const config = sandbox.window.CastlefallValley.config;

    expect(config.COMMAND_ORDER).toEqual(['rush', 'formation', 'retreat']);
    expect(config.BUILD_ORDER).toEqual(['wall', 'barracks', 'tower', 'forge', 'chapel', 'repair']);

    for (const type of config.COMMAND_ORDER) {
      expect(html).toContain(`id="${config.commandDefs[type].id}"`);
    }

    for (const type of config.BUILD_ORDER) {
      expect(html).toContain(`id="${config.buildDefs[type].id}"`);
      expect(config.buildDefs[type].cost).toBeGreaterThan(0);
    }
  });

  test('reset restores config-backed state and starting loadout', () => {
    const { api } = loadCastlefallRuntime();

    api.state.w = 1280;
    api.state.h = 720;
    api.state.gold = 999;
    api.state.playerCastle.hp = 1;

    api.reset();

    expect(api.state.w).toBe(1280);
    expect(api.state.h).toBe(720);
    expect(api.state.gold).toBe(api.config.INITIAL_RESOURCES.gold);
    expect(api.state.playerCastle.hp).toBe(api.config.CASTLE_DEFS.player.hp);
    expect(api.state.enemyCastle.hp).toBe(api.config.CASTLE_DEFS.enemy.hp);
    expect(api.state.hero.x).toBe(api.config.HERO_DEF.x);
    expect(api.state.hero.y).toBe(api.terrainY(api.config.HERO_DEF.x) - api.config.HERO_DEF.h);
    expect(api.state.units).toHaveLength(api.config.INITIAL_UNIT_LOADOUT.length);
  });

  test('build definitions own costs and effects', () => {
    const { api, elements } = loadCastlefallRuntime();
    api.reset();
    api.state.gold = 1000;

    expect(api.build('wall')).toBe(true);
    expect(api.state.gold).toBe(1000 - api.config.buildDefs.wall.cost);
    expect(api.state.playerCastle.wallLevel).toBe(1);
    expect(api.state.playerCastle.maxHp).toBe(api.config.CASTLE_DEFS.player.maxHp + 180);

    api.state.gold = 0;
    expect(api.build('tower')).toBe(false);
    expect(elements.get('message').textContent).toBe('Not enough gold for that build.');
  });

  test('spawn cooldowns block repeated paid spawns', () => {
    const { api } = loadCastlefallRuntime();
    api.reset();
    api.state.gold = 1000;

    const before = api.state.units.length;
    expect(api.spawnUnit('knight', 1, true)).toBe(true);
    expect(api.state.gold).toBe(1000 - api.config.unitDefs.knight.cost);
    expect(api.state.spawnCooldowns.knight).toBe(api.config.unitDefs.knight.spawnCd);
    expect(api.spawnUnit('knight', 1, true)).toBe(false);
    expect(api.state.units).toHaveLength(before + 1);
  });

  test('command and wave behavior use centralized definitions', () => {
    const { api, elements } = loadCastlefallRuntime();
    api.reset();

    api.setCommand('rush');
    expect(api.state.command).toBe('rush');
    expect(elements.get('message').textContent).toBe('Command stance: Full Rush');

    api.state.time = api.config.enemyWavePlan.waveLength;
    api.state.spawnTimers.enemy = 99;
    const before = api.state.units.length;

    api.updateEnemyAI(0);

    expect(api.state.wave).toBe(2);
    expect(api.state.units).toHaveLength(before + api.config.enemyWavePlan.reinforcements.length);
    expect(elements.get('message').textContent).toContain('enemy wave 2 arrives');
  });

  test('tower target selection avoids sorting and keeps side-specific priority', () => {
    const { api } = loadCastlefallRuntime();
    api.state.units = [
      { side: -1, x: 800 },
      { side: -1, x: 400 },
      { side: -1, x: 1300 },
      { side: 1, x: 2200 },
      { side: 1, x: 2900 },
      { side: 1, x: 1600 }
    ];

    expect(api.selectTowerTarget(-1, 1250, 'front').x).toBe(400);
    expect(api.selectTowerTarget(1, api.config.WORLD_W - 1250, 'rear').x).toBe(2900);
  });
});
