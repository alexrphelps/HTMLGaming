const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const gameDir = path.join(root, 'games/lumenkin');
const gamePath = path.join(gameDir, 'index.html');
const configPath = path.join(root, 'games.config.js');
const expectedScripts = [
  'js/config.js',
  'js/rng.js',
  'js/art.js',
  'js/lineage.js',
  'js/save.js',
  'js/input.js',
  'js/chapters.js',
  'js/render.js',
  'js/game.js',
  'js/main.js'
];

function read(relativePath) {
  return fs.readFileSync(path.join(gameDir, relativePath), 'utf8');
}

function createCoreRuntime() {
  const sandbox = {
    window: {},
    console,
    Math,
    Date,
    JSON,
    Map,
    Set,
    Image: class {},
    document: { createElement: () => ({ width: 0, height: 0, getContext: () => ({ imageSmoothingEnabled: false, save() {}, restore() {}, drawImage() {}, fillRect() {}, translate() {}, scale() {} }) }) }
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  ['js/config.js', 'js/rng.js', 'js/art.js', 'js/lineage.js', 'js/save.js', 'js/chapters.js'].forEach(file => vm.runInContext(read(file), sandbox));
  return sandbox.window.Lumenkin;
}

describe('Lumenkin static integration', () => {
  test('provides an ordered dependency-free GameHub entry point', () => {
    const html = read('index.html');
    const scriptSources = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    expect(scriptSources).toEqual(expectedScripts);
    expect(html).toContain('<canvas id="game" width="384" height="216"');
    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expectedScripts.forEach(script => {
      expect(fs.existsSync(path.join(gameDir, script))).toBe(true);
      expect(() => new Function(read(script))).not.toThrow();
    });
  });

  test('registers the complete campaign in GameHub without disturbing other entries', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);
    expect(sandbox.window.GAMEHUB_GAMES).toEqual(expect.arrayContaining([
      expect.objectContaining({ folder: 'lumenkin', name: 'Lumenkin', category: 'Simulation', input: 'Keyboard + Mouse', rendering: 'Canvas', saveSupport: 'Campaign' })
    ]));
  });

  test('bundles a transparent local atlas with valid registered frames', () => {
    const atlasPath = path.join(gameDir, 'assets/lumenkin-atlas.png');
    expect(fs.existsSync(atlasPath)).toBe(true);
    const png = fs.readFileSync(atlasPath);
    expect(png.toString('ascii', 1, 4)).toBe('PNG');
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const ns = createCoreRuntime();
    const catalog = new ns.ArtCatalog('unused');
    expect(width).toBeGreaterThanOrEqual(1200);
    expect(height).toBeGreaterThanOrEqual(1200);
    expect(catalog.validate(width, height)).toEqual([]);
    expect(Object.keys(ns.FRAME_DATA)).toEqual(expect.arrayContaining(['creatureSwift', 'topSwift', 'nursery', 'settlementGarden', 'ark']));
  });

  test('implements five mechanically distinct chapter classes and a shared lifecycle', () => {
    const script = read('js/chapters.js');
    ['FirstGlowChapter', 'BroodChapter', 'CityChapter', 'WorldrootChapter', 'BloomChapter'].forEach(name => expect(script).toContain(`class ${name}`));
    expect(script).toContain('enter()');
    expect(script).toContain('objective()');
    expect(script).toContain('actions()');
    expect(script).toContain('cleanup()');
    expect(script).toContain("input.consume('q')");
    expect(script).toContain('selectedRegion');
    expect(script).toContain('destination: 1800');
  });

  test('keeps the responsive canvas crisp and exposes accessibility modes', () => {
    const css = read('css/style.css');
    expect(css).toContain('image-rendering: pixelated');
    expect(css).toContain('aspect-ratio: 16 / 9');
    expect(css).toContain('@media (max-width: 780px)');
    expect(css).toContain('body.reduced-motion');
    expect(css).toContain('body.high-contrast');
    expect(css).toContain('body.color-amber');
    expect(css).toContain('--ui-scale');
  });
});

describe('Lumenkin lineage and simulation logic', () => {
  test('assembles deterministic appearances and inherits valid compatible parts', () => {
    const ns = createCoreRuntime();
    const genes = { body: 'swift', palette: 'cyan' };
    const first = ns.CreatureAppearance.fromGenes(genes, 'same-seed');
    const second = ns.CreatureAppearance.fromGenes(genes, 'same-seed');
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(['fin', 'tuft']).toContain(first.crest);

    const other = ns.CreatureAppearance.fromGenes({ body: 'shell', palette: 'coral' }, 'other');
    const child = ns.CreatureAppearance.inherit(first, other, 'child');
    expect(['swift', 'shell']).toContain(child.body);
    expect(['cyan', 'coral']).toContain(child.palette);
  });

  test('permanently excludes conflicting branches within a lineage', () => {
    const ns = createCoreRuntime();
    const campaign = ns.createCampaign(ns.CONFIG.eggTypes[0], 'branch-seed');
    ns.commitBranch(campaign, 'grasping-limbs');
    expect(campaign.lineage.branches).toEqual(['grasping-limbs']);
    expect(() => ns.commitBranch(campaign, 'shellback')).toThrow(/already committed/);
    expect(ns.effectsFor(campaign.lineage).gather).toBeGreaterThan(1);
  });

  test('round-trips named saves and creates an independent transition checkpoint', () => {
    const ns = createCoreRuntime();
    const values = new Map();
    const storage = {
      get length() { return values.size; },
      key(index) { return [...values.keys()][index]; },
      getItem(key) { return values.has(key) ? values.get(key) : null; },
      setItem(key, value) { values.set(key, value); }
    };
    const manager = new ns.SaveManager(storage);
    const campaign = ns.createCampaign(ns.CONFIG.eggTypes[1], 'save-seed');
    campaign.lineage.founder.marking = 'bands';
    manager.saveSlot('Test Colony', campaign);
    const loaded = manager.loadSlot('Test Colony');
    expect(loaded.lineage.founder.marking).toBe('bands');
    manager.checkpoint(loaded);
    const branch = manager.branchFromCheckpoint(loaded);
    branch.lineage.founder.marking = 'constellation';
    expect(loaded.lineage.founder.marking).toBe('bands');
  });

  test('initializes every chapter with meaningful actions and an achievable objective', () => {
    const ns = createCoreRuntime();
    const game = { hint() {}, log() {}, particles: { emit() {} } };
    const campaign = ns.createCampaign(ns.CONFIG.eggTypes[2], 'chapter-seed');
    const classes = [ns.FirstGlowChapter, ns.BroodChapter, ns.CityChapter, ns.WorldrootChapter, ns.BloomChapter];
    classes.forEach((Chapter, index) => {
      campaign.chapter = index;
      campaign.chapterState = {};
      if (index === 1 && !campaign.lineage.mate) campaign.lineage.mate = ns.CreatureAppearance.fromGenes({ body: 'shell', palette: 'coral' }, 'mate');
      const chapter = new Chapter(game, campaign);
      chapter.enter();
      expect(chapter.actions().length).toBeGreaterThanOrEqual(4);
      expect(chapter.objective().target).toBeGreaterThan(0);
      expect(chapter.serialize().chapterId).toBe(ns.CONFIG.chapters[index].id);
    });
  });
});
