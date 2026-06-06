const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const gameDir = path.join(root, 'games/contraband-skies');
const configPath = path.join(root, 'games.config.js');
const expectedScripts = [
  'js/config.js',
  'js/rng.js',
  'js/routeResolver.js',
  'js/campaign.js',
  'js/storage.js',
  'js/render.js',
  'js/tutorial.js',
  'js/main.js'
];

function readGameFile(relativePath) {
  return fs.readFileSync(path.join(gameDir, relativePath), 'utf8');
}

function loadLogicRuntime() {
  const sandbox = {
    window: {},
    console,
    Date: { now: () => 1700000000000 },
    Math,
    JSON,
    localStorage: null
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.console = console;
  sandbox.window.Date = sandbox.Date;
  sandbox.window.Math = Math;
  sandbox.window.JSON = JSON;
  sandbox.window.localStorage = null;
  vm.createContext(sandbox);
  ['js/config.js', 'js/rng.js', 'js/routeResolver.js', 'js/campaign.js', 'js/storage.js', 'js/tutorial.js'].forEach(scriptPath => {
    vm.runInContext(readGameFile(scriptPath), sandbox);
  });
  return sandbox.window.ContrabandSkies;
}

describe('Contraband Skies logic and integration', () => {
  test('provides a clean iframe entry point with ordered browser scripts', () => {
    const html = readGameFile('index.html');

    expect(html).toContain('<link rel="stylesheet" href="css/style.css">');
    expect(html).not.toMatch(/<style[\s>]/);
    expect(html).not.toMatch(/<script>([\s\S]*?)<\/script>/);
    expect(html).not.toContain('onclick=');

    const scriptSources = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match => match[1]);
    expect(scriptSources).toEqual(expectedScripts);
    expect(html).toContain('id="guide-panel"');
    expect(html).toContain('class="log-panel"');
    expect(html).toContain('id="log-toggle-btn"');
    expect(html).toContain('class="shipyard-panel"');
    expect(html).toContain('data-tutorial-gate="status"');
    expect(html).toContain('data-tutorial-gate="contracts"');
    expect(html).toContain('data-tutorial-gate="route"');
    expect(html).toContain('data-tutorial-gate="advanced"');

    expectedScripts.forEach(scriptPath => {
      expect(fs.existsSync(path.join(gameDir, scriptPath))).toBe(true);
      expect(() => new Function(readGameFile(scriptPath))).not.toThrow();
    });
  });

  test('is registered in the configured GameHub catalog with save support', () => {
    const sandbox = { window: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    expect(sandbox.window.GAMEHUB_GAMES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          folder: 'contraband-skies',
          name: 'Contraband Skies',
          category: 'Strategy',
          difficulty: 'Medium',
          rendering: 'Canvas',
          input: 'Mouse + Keyboard',
          saveSupport: 'Campaign'
        })
      ])
    );
  });

  test('generates valid campaign routes and contracts', () => {
    const ns = loadLogicRuntime();
    const campaign = ns.createNewCampaign('valid-network');

    expect(campaign.settlements).toHaveLength(ns.CONFIG.settlementCount);
    expect(campaign.routes.length).toBeGreaterThanOrEqual(ns.CONFIG.settlementCount);
    expect(campaign.contracts).toHaveLength(1);
    expect(campaign.tutorial).toEqual({ status: 'active', stepId: 'map', firstRun: true });

    campaign.contracts.forEach(contract => {
      const route = ns.getRoute(campaign, contract.routeId);
      expect(route).toBeTruthy();
      expect(contract.originId).toBe(campaign.currentSettlementId);
      expect([route.fromId, route.toId]).toContain(contract.destinationId);
      expect(contract.payout).toBeGreaterThan(80);
      expect(contract.deadline).toBeGreaterThanOrEqual(2);
    });
  });

  test('curated first route is safe and valid with tutorial defaults', () => {
    const ns = loadLogicRuntime();
    const campaign = ns.createNewCampaign('tutorial-safe-route');
    const contract = campaign.contracts[0];
    const route = ns.getRoute(campaign, contract.routeId);
    const hazard = ns.getHazard(route.hazardId);
    const result = ns.resolveRouteLeg(contract, route, hazard, ns.TUTORIAL_DEFAULT_DIALS, campaign.upgrades, 'tutorial-check');

    expect(contract.id).toBe('tutorial-first-route');
    expect(contract.cargo.familyId).toBe('contraband');
    expect(hazard.id).toBe('migration-shadow');
    expect(result.success).toBe(true);
    expect(result.cargoCondition).toBeGreaterThanOrEqual(70);
    expect(result.timeCost).toBeLessThanOrEqual(contract.deadline);
  });

  test('migrates existing tutorial-less saves based on progress', () => {
    const ns = loadLogicRuntime();
    const fresh = ns.createNewCampaign('migration-fresh');
    delete fresh.tutorial;
    fresh.contracts = ns.generateContracts(fresh, ns.createRng('migration-fresh-normal'));
    ns.normalizeTutorialState(fresh);

    const progressed = ns.createNewCampaign('migration-progressed');
    delete progressed.tutorial;
    progressed.deliveries = 2;
    ns.normalizeTutorialState(progressed);

    expect(fresh.tutorial.status).toBe('active');
    expect(fresh.tutorial.firstRun).toBe(false);
    expect(progressed.tutorial.status).toBe('complete');
  });

  test('route resolution is deterministic for seeded inputs', () => {
    const ns = loadLogicRuntime();
    const campaign = ns.createNewCampaign('deterministic');
    const contract = campaign.contracts[0];
    const route = ns.getRoute(campaign, contract.routeId);
    const hazard = ns.getHazard(route.hazardId);
    const dials = { pace: 64, altitude: 58, engine: 47, stealth: 71, care: 63 };

    const first = ns.resolveRouteLeg(contract, route, hazard, dials, campaign.upgrades, 'fixed-seed');
    const second = ns.resolveRouteLeg(contract, route, hazard, dials, campaign.upgrades, 'fixed-seed');

    expect(first).toEqual(second);
    expect(first.fuelCost).toBeGreaterThan(0);
    expect(first.timeCost).toBeGreaterThan(0);
    expect(first.eventRisk).toBeGreaterThanOrEqual(5);
    expect(first.eventRisk).toBeLessThanOrEqual(92);
  });

  test('save manager round-trips campaign state through storage', () => {
    const ns = loadLogicRuntime();
    const store = new Map();
    const storage = {
      setItem: (key, value) => store.set(key, value),
      getItem: key => store.get(key) || null,
      removeItem: key => store.delete(key)
    };
    const manager = ns.createSaveManager(storage, 'test-save');
    const campaign = ns.createNewCampaign('save-roundtrip');
    ns.selectContract(campaign, campaign.contracts[0].id);
    ns.skipTutorial(campaign);

    expect(manager.save(campaign)).toBe(true);
    expect(manager.load()).toEqual(campaign);
    expect(manager.load().tutorial.status).toBe('skipped');
    expect(manager.clear()).toBe(true);
    expect(manager.load()).toBeNull();
  });

  test('tutorial gates advance, skip, replay, and complete predictably', () => {
    const ns = loadLogicRuntime();
    const campaign = ns.createNewCampaign('tutorial-flow');

    expect(ns.isTutorialGateVisible(campaign, 'status')).toBe(false);
    ns.advanceTutorial(campaign);
    expect(campaign.tutorial.stepId).toBe('status');
    expect(ns.isTutorialGateVisible(campaign, 'status')).toBe(true);
    expect(ns.isTutorialGateVisible(campaign, 'contracts')).toBe(false);
    ns.skipTutorial(campaign);
    expect(ns.isTutorialGateVisible(campaign, 'advanced')).toBe(true);
    ns.replayTutorial(campaign);
    expect(campaign.tutorial).toEqual({ status: 'active', stepId: 'map', firstRun: false });
    ns.completeTutorial(campaign);
    expect(campaign.tutorial.status).toBe('complete');
  });

  test('first completed route marks the tutorial complete and restores normal contracts', () => {
    const ns = loadLogicRuntime();
    const campaign = ns.createNewCampaign('first-delivery-completion');
    ns.advanceTutorial(campaign);
    ns.advanceTutorial(campaign);
    ns.advanceTutorial(campaign);
    ns.advanceTutorial(campaign);
    ns.flySelectedRoute(campaign, ns.TUTORIAL_DEFAULT_DIALS);

    expect(campaign.completedContracts).toHaveLength(1);
    expect(campaign.tutorial.status).toBe('complete');
    expect(campaign.contracts).toHaveLength(ns.CONFIG.activeContractCount);
  });

  test('ended seasons expose an allowed inherited perk', () => {
    const ns = loadLogicRuntime();
    const campaign = ns.createNewCampaign('collapse-check');
    campaign.hull = 1;
    ns.selectContract(campaign, campaign.contracts[0].id);
    ns.flySelectedRoute(campaign, { pace: 90, altitude: 10, engine: 85, stealth: 10, care: 15 });

    expect(campaign.status).toBe('ended');
    expect(campaign.outcome.kind).toBe('collapse');
    expect(ns.INHERITED_PERKS.map(perk => perk.id)).toContain(campaign.outcome.inheritedPerk.id);
  });

  test('styles include hard-gated tutorial reveal states', () => {
    const css = readGameFile('css/style.css');

    expect(css).toContain('[data-tutorial-hidden="true"]');
    expect(css).toContain('.guide-panel');
    expect(css).toContain('.guide-actions');
    expect(css).toContain('grid-template-areas:');
    expect(css).toContain('"log map cockpit"');
    expect(css).toContain('"shipyard shipyard shipyard"');
    expect(css).toContain('.cockpit-panel');
    expect(css).toContain('overflow: hidden;');
    expect(css).toContain('.log-collapsed');
    expect(css).toContain('.shipyard-panel .upgrade-list');
    expect(css).toContain('grid-template-columns: repeat(4, minmax(180px, 1fr))');
  });
});
