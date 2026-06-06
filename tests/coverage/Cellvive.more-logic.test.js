const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

function loadCell(context, relativePath, exports) {
  return loadBrowserScript(context, `games/Cellvive/js/${relativePath}`, exports);
}

function cellContext(overrides = {}) {
  const context = createBrowserContext({
    document,
    localStorage,
    setTimeout,
    clearTimeout,
    GameLogger: { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
    CELLVIVE_CONSTANTS: {
      TESTING: { ENABLED: false },
      WORLD: { WIDTH: 1000, HEIGHT: 1000 },
      PERFORMANCE: { SIMULATION_DISTANCE: 500 },
      PLAYER: { BASE_SPEED: 2, BASE_RADIUS: 20 },
      POWERUPS: { SPAWN_RATE: 1 },
      BIOMES: {},
      HAZARDS: {}
    },
    ...overrides
  });
  context.window.game = null;
  return context;
}

function talentDom() {
  document.body.innerHTML = '<div id="talent-popup" class="hidden"></div><div id="talent-grid"></div><div id="talent-info-panel"></div><button id="talent-select-btn"></button><button id="talent-cancel-btn"></button><div id="selected-talent-name"></div><div id="selected-talent-description"></div><div id="selected-talent-cost"></div>';
}

function talentConstants() {
  return {
    PLAYER: { STARTING_MAX_HEALTH: 100 },
    TALENTS: {
      TALENT_TREE: {
        TIER_1: {
          RAPID_MOVEMENT: {
            ID: 'rapid_movement',
            NAME: 'Rapid Movement',
            DESCRIPTION: 'desc',
            CATEGORY: 'Movement',
            ICON: 'R',
            MAX_LEVEL: 3,
            EFFECT_PER_LEVEL: { VALUE: 0.5 },
            COST_PER_LEVEL: 1,
            PREREQUISITES: []
          }
        },
        TIER_2: {
          PHOTOSYNTHESIS: {
            ID: 'photosynthesis',
            NAME: 'Photosynthesis',
            DESCRIPTION: 'desc',
            CATEGORY: 'Survival',
            ICON: 'P',
            MAX_LEVEL: 3,
            EFFECT_PER_LEVEL: { VALUE: 5 },
            COST_PER_LEVEL: 2,
            PREREQUISITES: ['tier_1_complete']
          }
        },
        TIER_3: {}
      }
    }
  };
}

function talentPlayer(overrides = {}) {
  return {
    talentPoints: 0,
    talentLevels: {},
    updateMaxSpeed: jest.fn(),
    maxHealth: 100,
    health: 100,
    ...overrides
  };
}

// Behaviour under test: Cellvive cells update type, movement, eating, colour helpers, and cloning deterministically.
describe('Cellvive Cell model', () => {
  afterEach(() => jest.restoreAllMocks());

  test('cell type, distance, canEat, and eat update size and health', () => {
    const context = cellContext();
    const { Cell } = loadCell(context, 'Cell.js', ['Cell']);
    const eater = new Cell({ x: 0, y: 0, radius: 20 });
    const food = new Cell({ x: 3, y: 4, radius: 5 });
    const before = eater.radius;
    eater.eat(food);
    expect([eater.determineType(), eater.distanceTo(food), eater.canEat(food), eater.radius > before]).toEqual(['large', 5, true, true]);
  });

  test('cell movement helpers and render props expose current state', () => {
    const context = cellContext();
    const { Cell } = loadCell(context, 'Cell.js', ['Cell']);
    const cell = new Cell({ x: 0, y: 0, radius: 10, color: '#336699' });
    cell.setTarget(10, 0);
    cell.moveTowardsTarget();
    const clone = cell.clone();
    expect([cell.isMoving(), cell.getDirection(), cell.lightenColor('#000000', 50), cell.darkenColor('#ffffff', 50), clone.radius, cell.getRenderProps().type])
      .toEqual([true, expect.any(Number), expect.any(String), expect.any(String), 8, cell.type]);
  });
});

// Behaviour under test: Cellvive input, power-ups, particles, and talent system update state without rendering.
describe('Cellvive supporting systems', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    localStorage.clear();
  });

  test('InputHandler maps movement, custom mappings, simulated keys, and cleanup', () => {
    jest.useFakeTimers();
    const context = cellContext();
    const { InputHandler } = loadCell(context, 'InputHandler.js', ['InputHandler']);
    const input = new InputHandler();
    input.handleKeyDown({ code: 'KeyW' });
    input.handleKeyDown({ code: 'KeyD' });
    input.addKeyMapping('KeyZ', 'dash');
    input.simulateKeyPress('dash', 50);
    jest.advanceTimersByTime(60);
    const direction = input.getMovementDirection();
    input.cleanup();
    expect([input.shouldPreventDefault('Space'), direction.x > 0, direction.y < 0, input.isKeyPressed('dash'), input.eventListeners.length]).toEqual([true, true, true, false, 0]);
  });

  test('PowerUp applies energy size and health effects and expires', () => {
    const context = cellContext();
    const { PowerUp } = loadCell(context, 'PowerUp.js', ['PowerUp', 'PowerUpManager']);
    const cell = { x: 0, y: 0, radius: 10, maxHealth: 100, health: 50, speed: 1, maxSpeed: 1 };
    const energy = new PowerUp({ x: 0, y: 0, type: 'energy', value: 10 });
    const size = new PowerUp({ x: 0, y: 0, type: 'size_boost', value: 5 });
    const health = new PowerUp({ x: 0, y: 0, type: 'health', value: 10 });
    energy.applyTo(cell);
    size.applyTo(cell);
    health.applyTo(cell);
    expect([energy.canBeCollectedBy(cell), cell.maxHealth, cell.radius, cell.health, energy.shouldRemove()]).toEqual([false, 110, 15, 70, true]);
  });

  test('ParticleSystem reuses particles and clears active list', () => {
    const context = cellContext();
    const { ParticleSystem } = loadCell(context, 'ParticleSystem.js', ['ParticleSystem']);
    const system = new ParticleSystem();
    system.createDeathParticles(0, 0, 10, '#fff');
    const activeBefore = system.particles.length;
    system.update();
    system.clear();
    expect([activeBefore > 0, system.particles.length]).toEqual([true, 0]);
  });

  test('TalentSystem confirms affordable selections, spends points, mirrors levels, and resets unlocks', () => {
    talentDom();
    const context = cellContext({ CELLVIVE_CONSTANTS: talentConstants() });
    const player = talentPlayer({ talentPoints: 1 });
    const { TalentSystem } = loadCell(context, 'TalentSystem.js', ['TalentSystem']);
    const talents = new TalentSystem({ player, pauseGame: jest.fn(), resumeGame: jest.fn(), audioManager: { playTalentUnlock: jest.fn() } });
    talents.showPopup();

    document.querySelector('[data-talent-id="rapid_movement"]').click();
    const confirmed = talents.confirmSelection();

    expect([confirmed, player.talentPoints, player.talentLevels.rapid_movement, player.speedMultiplier, player.updateMaxSpeed.mock.calls.length]).toEqual([true, 0, 1, 1.5, 1]);

    talents.resetTalents();
    expect([talents.hasTalent('rapid_movement'), player.talentLevels.rapid_movement, player.updateMaxSpeed.mock.calls.length, talents.getUnlockedTalents()]).toEqual([false, undefined, 2, []]);
  });

  test('TalentSystem cancel preserves talent points and does not apply a selected talent', () => {
    talentDom();
    const context = cellContext({ CELLVIVE_CONSTANTS: talentConstants() });
    const player = talentPlayer({ talentPoints: 2 });
    const { TalentSystem } = loadCell(context, 'TalentSystem.js', ['TalentSystem']);
    const talents = new TalentSystem({ player, pauseGame: jest.fn(), resumeGame: jest.fn() });
    talents.showPopup();

    document.querySelector('[data-talent-id="rapid_movement"]').click();
    document.getElementById('talent-cancel-btn').click();

    expect([player.talentPoints, player.talentLevels.rapid_movement, player.speedMultiplier, talents.selectedTalent, document.getElementById('talent-popup').classList.contains('hidden')])
      .toEqual([2, undefined, undefined, null, true]);
  });

  test('TalentSystem adds points to the active player after the game player is replaced', () => {
    talentDom();
    const context = cellContext({ CELLVIVE_CONSTANTS: talentConstants() });
    const oldPlayer = talentPlayer({ talentPoints: 0 });
    const game = { player: oldPlayer, pauseGame: jest.fn(), resumeGame: jest.fn() };
    const { TalentSystem } = loadCell(context, 'TalentSystem.js', ['TalentSystem']);
    const talents = new TalentSystem(game);
    const currentPlayer = talentPlayer({ talentPoints: 1 });

    game.player = currentPlayer;
    talents.addTalentPoints(1);

    expect([oldPlayer.talentPoints, currentPlayer.talentPoints]).toEqual([0, 2]);
  });

  test('TalentSystem leaves locked or unaffordable talents unavailable', () => {
    talentDom();
    const context = cellContext({ CELLVIVE_CONSTANTS: talentConstants() });
    const player = talentPlayer({ talentPoints: 0 });
    const { TalentSystem } = loadCell(context, 'TalentSystem.js', ['TalentSystem']);
    const talents = new TalentSystem({ player, pauseGame: jest.fn(), resumeGame: jest.fn() });
    talents.showPopup();

    const tier1 = document.querySelector('[data-talent-id="rapid_movement"]');
    const tier2 = document.querySelector('[data-talent-id="photosynthesis"]');
    const selected = talents.selectTalentBox(talents.talents.RAPID_MOVEMENT);
    const confirmed = talents.confirmSelection();

    expect([tier1.classList.contains('unavailable'), tier2.classList.contains('unavailable'), selected, confirmed, player.talentPoints, player.talentLevels.rapid_movement])
      .toEqual([true, true, false, false, 0, undefined]);
  });

  test('TutorialManager tolerates missing optional environment arrays and still finds supported nearby elements', () => {
    document.body.innerHTML = '<div id="game-container"></div>';
    const context = cellContext({
      CELLVIVE_CONSTANTS: {
        ENVIRONMENT: { HAZARDS: { ENABLED: false } }
      }
    });
    const { TutorialManager } = loadCell(context, 'TutorialManager.js', ['TutorialManager']);
    const player = { x: 100, y: 100 };
    const tutorial = new TutorialManager({
      player,
      cells: [{ x: 110, y: 100 }],
      enemies: [{ x: 120, y: 100, enemyType: 'amoeba' }, { x: 130, y: 100, enemyType: 'virus' }],
      environmentManager: {
        getRenderElements: () => ({
          biomes: [{ x: 115, y: 100, type: 'nutrient' }],
          foodSpawners: [{ x: 118, y: 100 }]
        })
      },
      powerUpManager: { powerUps: [] }
    });

    expect(tutorial.getNearbyElements(player).map(entry => entry.type)).toEqual([
      'food',
      'amoeba',
      'virus',
      'biome_nutrient',
      'obstacle'
    ]);
  });

  test('TutorialManager fails soft when environment render payload is invalid and EnvironmentManager returns stable arrays', () => {
    document.body.innerHTML = '<div id="game-container"></div>';
    const tutorialContext = cellContext({
      CELLVIVE_CONSTANTS: {
        ENVIRONMENT: { HAZARDS: { ENABLED: true } }
      }
    });
    const { TutorialManager } = loadCell(tutorialContext, 'TutorialManager.js', ['TutorialManager']);
    const tutorial = new TutorialManager({
      player: { x: 0, y: 0 },
      cells: [],
      enemies: [],
      environmentManager: { getRenderElements: () => null },
      powerUpManager: { powerUps: [] }
    });

    expect(tutorial.getNearbyElements({ x: 0, y: 0 })).toEqual([]);

    const environmentContext = cellContext({
      BiomeTypes: {},
      SpawnerTypes: {},
      Biome: function Biome() {},
      FoodSpawner: function FoodSpawner() {}
    });
    const { EnvironmentManager } = loadCell(environmentContext, 'EnvironmentManager.js', ['EnvironmentManager']);
    const manager = Object.create(EnvironmentManager.prototype);
    manager.biomes = [{ getRenderProps: () => ({ type: 'nutrient' }) }];
    manager.foodSpawners = [{ getRenderProps: () => ({ type: 'organic' }) }];

    expect(manager.getRenderElements()).toEqual({
      biomes: [{ type: 'nutrient' }],
      foodSpawners: [{ type: 'organic' }],
      hazards: [],
      currents: [],
      activeEvent: null
    });
  });

  function environmentConstants(overrides = {}) {
    return {
      ENVIRONMENT: {
        BIOMES: {
          INITIAL_COUNT: 0,
          MAX_COUNT: 5,
          SPAWN_RATE: 1,
          REGULAR_SIZE_MIN: 900,
          REGULAR_SIZE_MAX: 1000,
          NUTRIENT_SIZE_MIN: 1200,
          NUTRIENT_SIZE_MAX: 1300
        },
        FOOD_SPAWNERS: {
          INITIAL_COUNT: 0,
          MAX_COUNT: 3,
          SPAWN_RATE: 1,
          MIN_RADIUS: 20,
          MAX_RADIUS: 30
        },
        HAZARDS: {
          ENABLED: true,
          INITIAL_COUNT: 0,
          MAX_COUNT: 3,
          SPAWN_RATE: 1,
          MIN_SIZE: 50,
          MAX_SIZE: 60,
          TYPES: {
            TOXIC: { TYPE: 'toxic', NAME: 'Toxin Cloud', COLOR: '#7CFC00', DAMAGE: 2, DAMAGE_INTERVAL: 0, SLOW_MULTIPLIER: 0.5 }
          }
        },
        CURRENTS: {
          ENABLED: true,
          INITIAL_COUNT: 0,
          MAX_COUNT: 3,
          SPAWN_RATE: 1,
          MIN_LENGTH: 100,
          MAX_LENGTH: 100,
          MIN_WIDTH: 50,
          MAX_WIDTH: 50,
          MIN_FORCE: 0.2,
          MAX_FORCE: 0.2
        },
        EVENTS: {
          ENABLED: true,
          MIN_INTERVAL: 1,
          MAX_INTERVAL: 1,
          DURATION: 1000,
          TYPES: {
            SPORE_STORM: { TYPE: 'spore_storm', NAME: 'Spore Storm', COLOR: '#FFD700' },
            PREDATOR_MIGRATION: { TYPE: 'predator_migration', NAME: 'Predator Migration', COLOR: '#FF6B6B' }
          }
        },
        SPORE_TYPES: {
          GREEN: { TYPE: 'growth_hormone', COLOR: '#90EE90', SPAWN_WEIGHT: 1, GROWTH_VALUES: { SMALL: { radius: 3, growth: 1 } } },
          YELLOW: { TYPE: 'speed_boost', COLOR: '#FFD700', SPAWN_WEIGHT: 0, RADIUS: 6, GROWTH: 0 },
          ORANGE: { TYPE: 'talent_upgrade', COLOR: '#FFA500', SPAWN_WEIGHT: 0, RADIUS: 8, GROWTH: 0 }
        }
      },
      ...overrides
    };
  }

  test('EnvironmentManager creates stable visible biomes inside world bounds', () => {
    const context = cellContext({ CELLVIVE_CONSTANTS: environmentConstants() });
    loadCell(context, 'Biome.js', ['Biome', 'BiomeTypes']);
    loadCell(context, 'Obstacle.js', ['FoodSpawner', 'SpawnerTypes']);
    const { EnvironmentManager } = loadCell(context, 'EnvironmentManager.js', ['EnvironmentManager']);
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);

    const manager = new EnvironmentManager(1000, 1000);
    const biome = manager.createRandomBiome();
    const props = biome.getRenderProps();
    const radius = Math.max(props.width, props.height) / 2;

    expect([
      typeof props.id,
      props.x >= radius,
      props.x <= 1000 - radius,
      props.y >= radius,
      props.y <= 1000 - radius,
      props.width >= 900
    ]).toEqual(['string', true, true, true, true, true]);

    random.mockRestore();
  });

  test('EnvironmentManager uses configured spawner cap and spawn rate', () => {
    const context = cellContext({ CELLVIVE_CONSTANTS: environmentConstants() });
    loadCell(context, 'Biome.js', ['Biome', 'BiomeTypes']);
    loadCell(context, 'Obstacle.js', ['FoodSpawner', 'SpawnerTypes']);
    const { EnvironmentManager } = loadCell(context, 'EnvironmentManager.js', ['EnvironmentManager']);
    const manager = new EnvironmentManager(1000, 1000);
    let spawned = 0;
    manager.foodSpawners = [{ x: 100, y: 100 }, { x: 300, y: 300 }];
    manager.createRandomFoodSpawner = () => ({ x: 500 + spawned++ * 100, y: 500, radius: 20 });

    manager.spawnFoodSpawners();
    manager.spawnFoodSpawners();

    expect([manager.foodSpawners.length, spawned]).toEqual([3, 1]);
  });

  test('EnvironmentManager applies hazards, currents, render payloads, and event spawn multipliers', () => {
    const context = cellContext({ CELLVIVE_CONSTANTS: environmentConstants() });
    loadCell(context, 'Biome.js', ['Biome', 'BiomeTypes']);
    loadCell(context, 'Obstacle.js', ['FoodSpawner', 'SpawnerTypes']);
    const { EnvironmentManager, Hazard, Current } = loadCell(context, 'EnvironmentManager.js', ['EnvironmentManager', 'Hazard', 'Current']);
    const manager = new EnvironmentManager(1000, 1000);
    const cell = {
      x: 100,
      y: 100,
      radius: 10,
      health: 100,
      velocityX: 1,
      velocityY: 0,
      takeDamage(amount) { this.health -= amount; }
    };
    manager.hazards = [new Hazard({ x: 100, y: 100, radius: 80, damage: 2, damageInterval: 0, slowMultiplier: 0.5, name: 'Toxin Cloud' })];
    manager.currents = [new Current({ x: 100, y: 100, length: 200, width: 80, angle: 0, force: 0.2 })];

    manager.applyEffectsToCell(cell);
    manager.triggerRandomEvent('spore_storm');
    const payload = manager.getRenderElements();

    expect([
      cell.health,
      cell.velocityX > 0.5,
      payload.hazards.length,
      payload.currents.length,
      manager.getNearestThreat(cell).label,
      manager.getSpawnMultipliers().cells > 1
    ]).toEqual([98, true, 1, 1, 'Toxin Cloud', true]);
  });

  test('FoodSpawner stores center-relative points so moved spawners render from their new position', () => {
    const context = cellContext({ CELLVIVE_CONSTANTS: environmentConstants() });
    const { FoodSpawner } = loadCell(context, 'Obstacle.js', ['FoodSpawner']);
    const spawner = new FoodSpawner({ x: 0, y: 0, radius: 20, numPoints: 6 });
    spawner.setPosition(100, 125);
    const props = spawner.getRenderProps();

    expect([
      props.x,
      props.y,
      props.points.every(point => Math.abs(point.x) < 30 && Math.abs(point.y) < 30)
    ]).toEqual([100, 125, true]);
  });

  test('Renderer draws moved food spawners with zoom-aware world coordinates', () => {
    const context = cellContext();
    const { Renderer } = loadCell(context, 'Renderer.js', ['Renderer', 'MyceliumRenderer']);
    const moveCalls = [];
    const ctx = {
      canvas: { width: 800, height: 600 },
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn((x, y) => moveCalls.push({ x, y })),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      set fillStyle(value) {},
      set strokeStyle(value) {},
      set lineWidth(value) {},
      set shadowColor(value) {},
      set shadowBlur(value) {}
    };
    const renderer = new Renderer(ctx, ctx.canvas);

    renderer.renderFoodSpawner({
      x: 100,
      y: 125,
      radius: 20,
      color: '#fff',
      strokeColor: '#000',
      strokeWidth: 1,
      points: [{ x: 10, y: 0 }, { x: 0, y: 10 }]
    }, { x: 50, y: 25, zoom: 0.5 });

    expect(moveCalls[0]).toEqual({ x: 30, y: 50 });
  });

  test('MyceliumRenderer scales large networks and prevents orphaned nodes', () => {
    const context = cellContext();
    const { MyceliumRenderer } = loadCell(context, 'Renderer.js', ['MyceliumRenderer']);
    const renderer = new MyceliumRenderer();
    const network = renderer.generateMyceliumNetwork({ id: 'large', x: 0, y: 0, width: 2400, height: 2400, type: 'toxic' });
    const incidentCounts = network.nodes.map(() => 0);

    network.connections.forEach((connections, index) => {
      connections.forEach(connection => {
        incidentCounts[index]++;
        incidentCounts[connection.targetIndex]++;
      });
    });

    expect([network.nodes.length > 50, incidentCounts.every(count => count > 0)]).toEqual([true, true]);
  });

  test('MyceliumRenderer keeps network lines and nodes visible at low zoom', () => {
    const context = cellContext();
    const { MyceliumRenderer } = loadCell(context, 'Renderer.js', ['MyceliumRenderer']);
    const renderer = new MyceliumRenderer();
    const lineWidths = [];
    const nodeRadii = [];
    let currentLineWidth = 0;
    const ctx = {
      canvas: { width: 800, height: 600 },
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(() => lineWidths.push(currentLineWidth)),
      arc: jest.fn((x, y, radius) => nodeRadii.push(radius)),
      fill: jest.fn(),
      set strokeStyle(value) {},
      set fillStyle(value) {},
      set lineCap(value) {},
      set lineWidth(value) { currentLineWidth = value; }
    };
    const network = {
      nodes: [{ x: 0, y: 0, radius: 1, type: 'minor' }, { x: 10, y: 0, radius: 1, type: 'minor' }],
      connections: [[{ targetIndex: 1, thickness: 1, distance: 10 }], []]
    };

    renderer.renderConnections(ctx, network, { x: 0, y: 0, zoom: 0.1 }, { type: 'toxic' }, 0, 0);
    renderer.renderNodes(ctx, network, { x: 0, y: 0, zoom: 0.1 }, { type: 'toxic' }, 0, 0);

    expect([Math.min(...lineWidths), Math.min(...nodeRadii)]).toEqual([1.5, 2]);
  });

  function spawnConstants() {
    return {
      WORLD: {
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 600,
        SIZE_MULTIPLIER: 1,
        BASE_WIDTH: 1000,
        BASE_HEIGHT: 1000,
        ZONES: {
          SAFE_ZONE: { RADIUS: 100 },
          NORMAL_ZONE: { RADIUS: 250 },
          DANGER_ZONE: { RADIUS: 400 },
          DEATH_ZONE: { RADIUS: Infinity }
        }
      },
      CELLS: { INITIAL_COUNT: 3, MAX_COUNT: 4, SPAWN_RATE: 1, SPEED: 0.3 },
      ENEMIES: { INITIAL_COUNT: 2, MAX_COUNT: 3, SPAWN_RATE: 1 },
      POWERUPS: { SPAWN_RATE: 1, MAX_COUNT: 2 },
      PERFORMANCE: { TARGET_FPS: 60, SIMULATION_DISTANCE: 500, MAX_DELTA_TIME: 50 },
      ENVIRONMENT: {
        BIOMES: { INITIAL_COUNT: 0, MAX_COUNT: 2, SPAWN_RATE: 0 },
        FOOD_SPAWNERS: { INITIAL_COUNT: 0, MAX_COUNT: 2, SPAWN_RATE: 0 },
        HAZARDS: { ENABLED: false, INITIAL_COUNT: 0, MAX_COUNT: 0, SPAWN_RATE: 0 },
        CURRENTS: { ENABLED: false, INITIAL_COUNT: 0, MAX_COUNT: 0, SPAWN_RATE: 0 },
        EVENTS: { ENABLED: false },
        SPORE_TYPES: {
          GREEN: { TYPE: 'growth_hormone', COLOR: '#90EE90', SPAWN_WEIGHT: 0.6, GROWTH_VALUES: { SMALL: { radius: 3, growth: 1 } } },
          YELLOW: { TYPE: 'speed_boost', COLOR: '#FFD700', SPAWN_WEIGHT: 0.25, RADIUS: 6, GROWTH: 0, SPEED_BOOST: 1.5 },
          ORANGE: { TYPE: 'talent_upgrade', COLOR: '#FFA500', SPAWN_WEIGHT: 0.15, RADIUS: 8, GROWTH: 0 }
        }
      },
      TESTING: { ENABLED: false },
      PLAYER: { STARTING_MAX_HEALTH: 100, STARTING_SPEED: 3, GROWTH_AMOUNT_MULTIPLIER: 0.1 },
      EATING: {},
      PROGRESSION: { PHASES: [{ ID: 'seedling', NAME: 'Seedling', MIN_SIZE: 0 }, { ID: 'predator', NAME: 'Predator', MIN_SIZE: 50 }] },
      MUTATIONS: {
        CHOICES_PER_ORANGE_SPORE: 2,
        OPTIONS: [
          { ID: 'membrane_patch', NAME: 'Membrane Patch', DESCRIPTION: 'heal', TYPE: 'health_patch', HEALTH: 10, MAX_HEALTH: 5 },
          { ID: 'cilia_burst', NAME: 'Cilia Burst', DESCRIPTION: 'speed', TYPE: 'temporary_speed', VALUE: 0.2, DURATION: 1000 }
        ]
      },
      PERSISTENCE: { STORAGE_KEY: 'cellvive_test_progress', DISCOVERY_LIMIT: 5 },
      LOGGING: { ENABLED: false }
    };
  }

  test('SpawnManager uses configured caps, weighted spores, and world-bound positions', () => {
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      AmoebaEnemy: function AmoebaEnemy(options) { Object.assign(this, options, { health: 100 }); },
      VirusEnemy: function VirusEnemy(options) { Object.assign(this, options, { health: 100 }); }
    });
    loadCell(context, 'Cell.js', ['Cell']);
    const { SpawnManager } = loadCell(context, 'SpawnManager.js', ['SpawnManager']);
    const game = {
      config: { worldWidth: 1000, worldHeight: 1000, maxCells: 4, maxEnemies: 3, cellSpawnRate: 1, enemySpawnRate: 1 },
      player: { x: 995, y: 995, radius: 20 },
      cells: [],
      enemies: []
    };
    const spawns = new SpawnManager(game);

    jest.spyOn(Math, 'random')
      .mockReturnValue(0.5)
      .mockReturnValueOnce(0.99)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(0.99);
    const orange = spawns.createRandomCell();
    spawns.spawnInitialCells(10);
    spawns.spawnInitialEnemies(10);

    expect([orange.sporeType, game.cells.length, game.enemies.length, game.cells.every(cell => cell.x >= 50 && cell.x <= 950 && cell.y >= 50 && cell.y <= 950)])
      .toEqual(['talent_upgrade', 4, 3, true]);
  });

  test('CellviveGame cleanup removes managed listeners and cancels the active loop', () => {
    const button = document.createElement('button');
    document.body.appendChild(button);
    const cancelAnimationFrame = jest.fn();
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      cancelAnimationFrame,
      GameLogger: { gameInit: jest.fn(), gameEnd: jest.fn(), error: jest.fn() }
    });
    const { CellviveGame } = loadCell(context, 'Game.js', ['CellviveGame']);
    const game = new CellviveGame();
    let clicks = 0;
    game.gameLoopId = 123;
    game.inputHandler = { cleanup: jest.fn() };
    game.particleSystem = { cleanup: jest.fn() };
    game.cells = [{}];
    game.enemies = [{}];
    game.addManagedEventListener(button, 'click', () => { clicks++; });

    button.click();
    game.cleanup();
    button.click();

    expect([clicks, cancelAnimationFrame.mock.calls[0][0], game.cells.length, game.enemies.length, game.inputHandler]).toEqual([1, 123, 0, 0, null]);
  });

  test('CellviveGame pause reasons prevent one overlay from resuming another', () => {
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      GameLogger: { gameInit: jest.fn(), gameEnd: jest.fn(), error: jest.fn() }
    });
    const { CellviveGame } = loadCell(context, 'Game.js', ['CellviveGame']);
    const game = new CellviveGame();
    game.isRunning = true;

    game.pauseGame('manual');
    game.pause('tutorial');
    game.resume('tutorial');
    const stillPaused = game.isPaused;
    game.resumeGame('manual');

    expect([stillPaused, game.isPaused, game.pauseReasons.size]).toEqual([true, false, 0]);
  });

  test('CellviveGame updateUI mirrors talent points into both HUD counters', () => {
    document.body.innerHTML = '<span id="score"></span><span id="size"></span><span id="cell-count"></span><span id="health"></span><span id="talent-points"></span><span id="talent-points-bottom"></span><span id="phase"></span><span id="active-event"></span><span id="nearest-danger"></span><span id="best-run"></span><span id="codex-count"></span><span id="zone"></span>';
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      GameLogger: { gameInit: jest.fn(), gameEnd: jest.fn(), error: jest.fn() }
    });
    const { CellviveGame } = loadCell(context, 'Game.js', ['CellviveGame']);
    const game = new CellviveGame();
    game.score = 12;
    game.cells = [{}, {}];
    game.config.worldWidth = 1000;
    game.config.worldHeight = 1000;
    game.player = { x: 500, y: 500, radius: 24, health: 80, maxHealth: 100, talentPoints: 3 };

    game.updateUI();

    expect([
      document.getElementById('talent-points').textContent,
      document.getElementById('talent-points-bottom').textContent,
      document.getElementById('health').textContent
    ]).toEqual(['3', '3', '80/100']);
  });

  test('CellviveGame applies mutation choices, progression phases, and persisted best stats', () => {
    document.body.innerHTML = '<div id="mutation-popup" class="hidden"></div><div id="mutation-choice-grid"></div><button id="mutation-skip-btn"></button>';
    localStorage.clear();
    const context = cellContext({
      CELLVIVE_CONSTANTS: spawnConstants(),
      GameLogger: { gameInit: jest.fn(), gameEnd: jest.fn(), error: jest.fn() }
    });
    const { CellviveGame } = loadCell(context, 'Game.js', ['CellviveGame']);
    const game = new CellviveGame();
    game.player = {
      x: 0,
      y: 0,
      radius: 60,
      health: 40,
      maxHealth: 100,
      updateMaxSpeed: jest.fn()
    };
    game.enhancedUI = { addNotification: jest.fn() };
    game.spawnManager = { spawnRandomGreenSpore: jest.fn() };
    game.pauseReasons.add('mutation');
    game.isPaused = true;

    game.updateProgression();
    game.applyMutationChoice(spawnConstants().MUTATIONS.OPTIONS[0]);
    game.updateBestRunStats(250, 60, 12);
    game.recordDiscovery('hazard_toxic');
    const saved = JSON.parse(localStorage.getItem('cellvive_test_progress'));

    expect([
      game.progression.phase.ID,
      game.player.maxHealth,
      game.player.health,
      saved.bestScore,
      saved.bestSize,
      saved.bestSurvivalTime,
      saved.discoveries.includes('hazard_toxic')
    ]).toEqual(['predator', 105, 50, 250, 60, 12, true]);
  });
});
