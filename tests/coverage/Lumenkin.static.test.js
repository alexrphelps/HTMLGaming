const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
const { JSDOM } = require('jsdom');

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
      expect.objectContaining({ folder: 'lumenkin', name: 'Lumenkin', category: 'Simulation', input: 'Mouse + Keyboard', rendering: 'Canvas', saveSupport: 'Campaign', estimatedPlayTime: 90 })
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
    expect(script).toContain('planModel()');
    expect(script).toContain('assignOrder(slotId, orderId, targetId)');
    expect(script).toContain('resolveCycle()');
    expect(script).toContain('cleanup()');
    expect(script).not.toContain('input.axis()');
    expect(script).toContain('selectedRegion');
    expect(script).toContain('destination: 2100');
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

  test('boots the real ordered browser entrypoint through main.js', async () => {
    const dom = new JSDOM(read('index.html'), { runScripts: 'outside-only', url: 'https://lumenkin.test/' });
    const context = { imageSmoothingEnabled: false, save() {}, restore() {}, drawImage() {}, fillRect() {}, strokeRect() {}, translate() {}, scale() {}, beginPath() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, closePath() {}, stroke() {}, fill() {}, fillText() {}, setLineDash() {} };
    dom.window.HTMLCanvasElement.prototype.getContext = () => context;
    dom.window.requestAnimationFrame = () => 1;
    dom.window.Image = class {
      constructor() { this.naturalWidth = 2048; this.naturalHeight = 2048; }
      set src(value) { this._src = value; Promise.resolve().then(() => this.onload && this.onload()); }
      get src() { return this._src; }
    };
    expectedScripts.forEach(script => dom.window.eval(read(script)));
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    await Promise.resolve();
    await Promise.resolve();
    expect(dom.window.lumenkinGame).toBeInstanceOf(dom.window.Lumenkin.LumenkinGame);
    expect(dom.window.lumenkinGame.running).toBe(true);
    expect(dom.window.document.getElementById('resolveCycleButton')).not.toBeNull();
    dom.window.lumenkinGame.startNew();
    const selects = [...dom.window.document.querySelectorAll('.plan-slot select')];
    expect(selects).toHaveLength(3);
    selects.forEach((select, index) => { select.value = index === 0 ? 'forage' : index === 1 ? 'play' : 'rest'; select.dispatchEvent(new dom.window.Event('change')); });
    expect(dom.window.document.querySelector('.plan-slot select')).toBe(selects[0]);
    expect(dom.window.document.getElementById('resolveCycleButton').disabled).toBe(false);
    dom.window.lumenkinGame.resolveCycle();
    expect(dom.window.lumenkinGame.chapter.state.cycle).toBe(1);
    dom.window.lumenkinGame.showLegacyRecord({ name: '<img src=x>', chapter: 0, generations: 1, populationPeak: 1, branches: [], history: ['<script>bad()</script>'] });
    expect(dom.window.document.querySelector('#panelContent img')).toBeNull();
    expect(dom.window.document.querySelector('#panelContent script')).toBeNull();
    expect(dom.window.document.getElementById('panelContent').textContent).toContain('<img src=x>');
    dom.window.lumenkinGame.destroy();
    dom.window.close();
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
    campaign.chapterState.actions = { forage: 1, explore: 1 };
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

  test('initializes every chapter with three meaningful planning commitments', () => {
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
      const model = chapter.planModel();
      expect(model.slots).toHaveLength(3);
      model.slots.forEach(slot => expect(slot.orders.length).toBeGreaterThanOrEqual(3));
      expect(model.canResolve).toBe(false);
      expect(chapter.objective().target).toBeGreaterThan(0);
      expect(chapter.serialize().chapterId).toBe(ns.CONFIG.chapters[index].id);
    });
  });
});

describe('Lumenkin management cycles', () => {
  function makeChapter(index, seed = 'cycle-seed') {
    const ns = createCoreRuntime();
    const campaign = ns.createCampaign(ns.CONFIG.eggTypes[2], seed);
    campaign.chapter = index;
    campaign.chapterState = {};
    if (index > 0) campaign.lineage.mate = ns.CreatureAppearance.fromGenes({ body: 'shell', palette: 'coral' }, `${seed}:mate`);
    const game = { hint() {}, log(message) { campaign.history.unshift(message); }, particles: { emit() {} } };
    const chapter = new [ns.FirstGlowChapter, ns.BroodChapter, ns.CityChapter, ns.WorldrootChapter, ns.BloomChapter][index](game, campaign);
    chapter.enter();
    return { ns, campaign, chapter };
  }

  function assign(chapter, orderIds) {
    chapter.slots().forEach((slot, index) => expect(chapter.assignOrder(slot.id, orderIds[index])).toBe(true));
    expect(chapter.canResolve()).toBe(true);
  }

  test('idle updates animate without changing gameplay state', () => {
    for (let index = 0; index < 5; index += 1) {
      const { chapter } = makeChapter(index, `idle-${index}`);
      const before = JSON.stringify(chapter.serialize());
      for (let tick = 0; tick < 600; tick += 1) chapter.update(1 / 60, { pointer: { clicked: false } });
      expect(JSON.stringify(chapter.serialize())).toBe(before);
    }
  });

  test('editing a plan is free and a resolved plan is charged exactly once', () => {
    const { chapter } = makeChapter(0);
    const before = JSON.stringify(chapter.serialize());
    chapter.assignOrder('morning', 'nest');
    chapter.clearOrder('morning');
    expect(JSON.stringify(chapter.serialize())).toBe(before);
    assign(chapter, ['nest', 'nest', 'nest']);
    chapter.resolveCycle();
    expect(chapter.state.food).toBe(1);
    expect(chapter.state.cycle).toBe(1);
    expect(chapter.state.plan).toEqual({});
  });

  test('identical seeds and plans resolve identically', () => {
    const first = makeChapter(4, 'same-voyage');
    const second = makeChapter(4, 'same-voyage');
    assign(first.chapter, ['storm', 'sails', 'bold']);
    assign(second.chapter, ['storm', 'sails', 'bold']);
    first.chapter.resolveCycle();
    second.chapter.resolveCycle();
    expect(JSON.stringify(first.chapter.serialize())).toBe(JSON.stringify(second.chapter.serialize()));
  });

  test('dead brood members cannot act or count toward the living family', () => {
    const { chapter } = makeChapter(1);
    chapter.state.creatures[0].hp = 0;
    const dead = JSON.stringify(chapter.state.creatures[0]);
    expect(chapter.orders('founders').map(order => order.id)).toEqual(['regroup']);
    assign(chapter, ['regroup', 'nurture', 'scout']);
    chapter.resolveCycle();
    expect(JSON.stringify(chapter.state.creatures[0])).toBe(dead);
    expect(chapter.stats().find(([label]) => label === 'Living Kin')[1]).toBe(chapter.state.creatures.length - 1);
  });

  test('city citizens remain bounded and world harvesting exhausts its target', () => {
    const city = makeChapter(2);
    const template = city.chapter.state.citizens[0];
    while (city.chapter.state.citizens.length < city.ns.CONFIG.maxCreatures) city.chapter.state.citizens.push(Object.assign({}, template, { id: city.chapter.state.citizens.length + 1 }));
    city.chapter.state.food = 100;
    assign(city.chapter, ['nourish', 'reserve', 'reserve']);
    city.chapter.resolveCycle();
    expect(city.chapter.state.citizens.length).toBe(city.ns.CONFIG.maxCreatures);

    const world = makeChapter(3);
    world.chapter.assignOrder('mandateA', 'restore');
    world.chapter.selectAt({ x: 165, y: 75 });
    expect(world.chapter.planModel().slots[0].targetLabel).toBe('First Clearing');
    world.chapter.clearOrder('mandateA');
    for (let cycle = 0; cycle < 2; cycle += 1) { assign(world.chapter, ['harvest', 'harvest', 'harvest']); world.chapter.resolveCycle(); }
    expect(world.chapter.state.regions[1].exhaustion).toBeGreaterThanOrEqual(70);
    expect(world.chapter.orders('mandateA').find(order => order.id === 'harvest').disabled).toBe(true);
  });

  test('schema-one saves become safe legacy records instead of campaigns', () => {
    const ns = createCoreRuntime();
    const values = new Map();
    const storage = { get length() { return values.size; }, key(index) { return [...values.keys()][index]; }, getItem(key) { return values.get(key) || null; }, setItem(key, value) { values.set(key, value); } };
    const manager = new ns.SaveManager(storage);
    const oldPayload = JSON.stringify({ schemaVersion: 1, campaign: { chapter: 3, lineage: { name: '<img src=x>', generations: 4, populationPeak: 29, branches: ['wardens'] }, history: ['<script>bad()</script>'] } });
    expect(() => manager.deserialize(oldPayload)).toThrow(ns.LegacySaveError);
    const record = manager.listLegacyRecords()[0];
    expect(record.name).toBe('<img src=x>');
    expect(record.chapter).toBe(3);
    expect(record.history[0]).toBe('<script>bad()</script>');
  });
});
