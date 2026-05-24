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
    expect(script).toContain('function setupUnitCards()');
    expect(script).toContain('if (!e.repeat)');
    expect(html).toContain('id="armyStrip"');
    expect(html).toContain('class="touch-controls"');
  });

  test('uses guarded overlay layout rules to prevent UI overlap', () => {
    const css = readGameFile('css/style.css');

    expect(css).toContain('grid-template-rows: auto 1fr auto');
    expect(css).toContain('max-height: min(36vh, 230px)');
    expect(css).toContain('overflow-y: auto');
    expect(css).toContain('@media (max-width: 1100px)');
    expect(css).toContain('top: 46%');
    expect(css).toContain('flex-wrap: wrap');
  });
});
