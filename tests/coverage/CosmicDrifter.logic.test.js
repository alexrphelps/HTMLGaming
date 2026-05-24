const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadCosmic() {
  document.body.innerHTML = `
    <div id="currentMission"></div><div id="sectorValue"></div><div id="progressValue"></div>
    <div id="gameOverScreen" class=""></div><div id="gameOverTitle"></div><div id="gameOverMessage"></div><div id="gameOverStats"></div>
    <div id="upgradePanel" class="show"></div><div id="upgradeFragments"></div><div id="upgradeCrystals"></div>
  `;
  const context = createBrowserContext({ document, AudioContext: jest.fn(), webkitAudioContext: jest.fn() });
  return loadBrowserScript(context, 'games/cosmicdrifter/js/CosmicDrifterGame.js', ['CosmicDrifterGame']).CosmicDrifterGame;
}

// Behaviour under test: Cosmic Drifter deterministic world helpers and mission state update without canvas rendering.
describe('Cosmic Drifter state helpers', () => {
  let game;

  beforeEach(() => {
    const CosmicDrifterGame = loadCosmic();
    game = new CosmicDrifterGame();
    game.addMessage = jest.fn();
    game.playSound = jest.fn();
    game.updateMissionDisplay = jest.fn();
    game.closeUpgradePanel = jest.fn();
  });

  test('seeded random, area keys, and explored areas are deterministic', () => {
    const rngA = game.seededRandom(42);
    const rngB = game.seededRandom(42);
    game.markAreaAsExplored(750, -10);
    expect([rngA(), rngB(), game.getAreaKey(750, -10), game.exploredAreas.has('1,-1')]).toEqual([expect.any(Number), expect.any(Number), '1,-1', true]);
  });

  test('safe position rejects player and object proximity', () => {
    game.player.x = 0;
    game.player.y = 0;
    game.energyOrbs = [{ x: 100, y: 0 }];
    expect([game.isPositionSafe(10, 0, 50), game.isPositionSafe(110, 0, 50), game.isPositionSafe(300, 0, 50)]).toEqual([false, false, true]);
  });

  test('mission progress completes objectives and applies rewards', () => {
    game.missions.objectives = [
      { id: 'collect_fragments', current: 0, target: 2, completed: false, description: 'Collect fragments', reward: 'Scanner' },
      { id: 'upgrade_ship', current: 0, target: 1, completed: false, description: 'Upgrade', reward: 'Win' }
    ];
    game.missions.current = game.missions.objectives[0];
    game.updateMissionProgress('collect_fragments', 2);
    expect([game.missions.completed.length, game.upgrades.scannerRange, game.missions.current.id]).toEqual([1, 3, 'upgrade_ship']);
  });

  test('sector progress advances level and emits warnings once', () => {
    game.distance = 2500;
    game.player.x = 1600;
    game.player.y = 0;
    game.nextSectorDistance = 1000;
    game.updateMissionProgress = jest.fn();
    game.updateSectorProgress();
    expect([game.level, game.sectorsExplored, game.addMessage.mock.calls.length, game.updateMissionProgress]).toEqual([3, 2, 4, expect.any(Function)]);
  });

  test('upgrade affordability, cost breakdown, and purchase mutate resources and station', () => {
    game.resources.techFragments = 10;
    game.resources.crystals = 5;
    game.currentStation = { type: 'ship', x: 100, y: 0, departureSpeed: 2 };
    const option = game.getStationUpgrades('ship')[0];
    game.purchaseUpgrade(option.name);
    expect([
      game.canAffordUpgrade({ cost: { techFragments: 999, crystals: 0 } }),
      game.calculateCostBreakdown(7, 1, 1),
      game.upgrades.energyEfficiency,
      game.currentStation.departing
    ]).toEqual([false, { needsFragments: 0, needsCrystals: 2 }, 1, true]);
  });

  test('safe zones suppress game over while unsafe depleted player ends the game', () => {
    game.stations = [{ x: 0, y: 0, active: true, departing: false }];
    game.player.energy = 0;
    game.checkGameOver();
    const safeState = game.gameState;
    game.stations = [];
    game.checkGameOver();
    expect([safeState, game.gameState, game.isRunning]).toEqual(['loading', 'gameOver', false]);
  });
});
