const { createBrowserContext, loadBrowserScript } = require('../helpers/browserScriptHarness');

const gravityFiles = [
  'games/the_gravity_locksmith/js/constants.js',
  'games/the_gravity_locksmith/js/utils.js',
  'games/the_gravity_locksmith/js/roomSchema.js',
  'games/the_gravity_locksmith/js/rooms.js',
  'games/the_gravity_locksmith/js/factories.js',
  'games/the_gravity_locksmith/js/systems.physics.js',
  'games/the_gravity_locksmith/js/systems.effects.js',
  'games/the_gravity_locksmith/js/systems.progression.js',
  'games/the_gravity_locksmith/js/systems.enemies.js',
  'games/the_gravity_locksmith/js/systems.player.js',
  'games/the_gravity_locksmith/js/runtime.js',
  'games/the_gravity_locksmith/js/input.js',
  'games/the_gravity_locksmith/js/render.js'
];

function loadGravityNamespace(context) {
  gravityFiles.forEach(file => loadBrowserScript(context, file, []));
  return context.window.GravityLocksmith;
}

function createRuntime(roomDefinitions) {
  const context = createBrowserContext();
  const ns = loadGravityNamespace(context);
  const rooms = roomDefinitions || ns.ROOM_DEFINITIONS;
  const runtime = ns.createGameRuntime(rooms, { random: () => 0 });
  return { context, ns, runtime };
}

function createFakeEventTarget() {
  const listeners = {};
  return {
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter(candidate => candidate !== handler);
    },
    fire(type, code) {
      const event = { code, preventDefault: jest.fn() };
      (listeners[type] || []).forEach(handler => handler(event));
      return event;
    }
  };
}

function createFakeCanvasContext() {
  const calls = [];
  const noop = function(name) {
    return function(...args) {
      calls.push([name].concat(args));
    };
  };
  return {
    calls,
    save: noop('save'),
    restore: noop('restore'),
    fillRect: noop('fillRect'),
    strokeRect: noop('strokeRect'),
    beginPath: noop('beginPath'),
    closePath: noop('closePath'),
    moveTo: noop('moveTo'),
    lineTo: noop('lineTo'),
    arc: noop('arc'),
    arcTo: noop('arcTo'),
    fill: noop('fill'),
    stroke: noop('stroke'),
    translate: noop('translate'),
    scale: noop('scale'),
    rotate: noop('rotate'),
    fillText: noop('fillText'),
    createLinearGradient() {
      return { addColorStop: noop('addColorStop') };
    }
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Behaviour under test: The Gravity Locksmith runtime keeps room/session state deterministic and aligned with the new movement contract.
describe('Gravity Locksmith runtime', () => {
  test('room reset starts a clean room state from validated data', () => {
    const { runtime } = createRuntime();
    runtime.startNewSession();

    expect([
      runtime.session.screen,
      runtime.session.roomIndex,
      runtime.session.roomTime,
      runtime.session.roomDeaths,
      runtime.session.roomFlips,
      runtime.player.x,
      runtime.player.y,
      runtime.player.jumpsRemaining,
      runtime.player.doubleJumpEnergy,
      runtime.roomState.shards.length
    ]).toEqual(['play', 0, 0, 0, 0, 110, 900, 2, 300, 1]);
  });

  test('input controller maps Shift to flip and does not map E anymore', () => {
    const context = createBrowserContext();
    const ns = loadGravityNamespace(context);
    const target = createFakeEventTarget();
    const input = ns.createInputController(target);

    target.fire('keydown', 'ShiftLeft');
    expect(input.getActions().flipPressed).toBe(true);
    input.endFrame();
    target.fire('keyup', 'ShiftLeft');

    target.fire('keydown', 'KeyE');
    expect(input.getActions().flipPressed).toBe(false);
    input.cleanup();
  });

  test('gravity flips consume energy and count exactly once', () => {
    const { runtime } = createRuntime();
    runtime.startNewSession();
    runtime.player.onGround = true;

    runtime.systems.player.applyFlip();
    runtime.systems.player.applyFlip();

    expect([
      runtime.roomState.gravity,
      runtime.player.energy,
      runtime.session.roomFlips,
      runtime.session.totalFlips
    ]).toEqual([1, 30, 2, 2]);
  });

  test('double jump can be used once in air and not more than once before landing', () => {
    const roomDefinitions = [{
      name: 'Jump Test',
      spawn: { x: 100, y: 948 },
      exit: { x: 1800, y: 860, w: 80, h: 120 },
      platforms: [
        { x: 0, y: 1008, w: 1920, h: 72 },
        { x: 0, y: 0, w: 1920, h: 36 }
      ],
      shards: [],
      spikes: [],
      enemies: [],
      movers: []
    }];
    const { ns, runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.onGround = true;

    runtime.systems.player.update(0, { jumpPressed: true });
    const firstJumpVy = runtime.player.vy;
    const afterFirstJump = runtime.player.jumpsRemaining;

    runtime.player.onGround = false;
    runtime.player.coyote = -0.01;
    runtime.systems.player.update(0, { jumpPressed: true });
    const secondJumpVy = runtime.player.vy;
    const afterSecondJump = runtime.player.jumpsRemaining;

    runtime.player.vy = 12;
    runtime.systems.player.update(0, { jumpPressed: true });

    expect([
      firstJumpVy < 0,
      secondJumpVy < 0 && secondJumpVy > firstJumpVy,
      afterFirstJump,
      afterSecondJump,
      runtime.player.jumpsRemaining,
      runtime.player.vy
    ]).toEqual([true, true, 1, 0, 0, 12]);
  });

  test('landing does not restore spent gravity or double-jump resources', () => {
    const roomDefinitions = [{
      name: 'Landing Test',
      spawn: { x: 100, y: 948 },
      exit: { x: 1800, y: 860, w: 80, h: 120 },
      platforms: [
        { x: 0, y: 1008, w: 1920, h: 72 },
        { x: 0, y: 0, w: 1920, h: 36 }
      ],
      shards: [],
      spikes: [],
      enemies: [],
      movers: []
    }];
    const { ns, runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.jumpsRemaining = 0;
    runtime.player.energy = 30;
    runtime.player.doubleJumpEnergy = 0;
    runtime.player.onGround = false;

    runtime.systems.player.applyFlip();
    const afterFlip = [runtime.player.energy, runtime.player.doubleJumpEnergy, runtime.player.jumpsRemaining];

    runtime.player.onGround = true;
    runtime.systems.player.update(0, {});

    expect([
      afterFlip,
      runtime.player.energy,
      runtime.player.doubleJumpEnergy,
      runtime.player.jumpsRemaining
    ]).toEqual([[30, 0, 0], 30, 0, 0]);
  });

  test('death increments room and session stats once and respawns through the update loop', () => {
    const { ns, runtime } = createRuntime();
    runtime.startNewSession();
    runtime.player.jumpsRemaining = 0;
    runtime.queueDeath();

    expect([
      runtime.session.screen,
      runtime.session.roomDeaths,
      runtime.session.totalDeaths,
      runtime.player.alive
    ]).toEqual([ns.SCREEN.RESPAWN, 1, 1, false]);

    runtime.update(0.2, {});
    expect(runtime.session.screen).toBe(ns.SCREEN.RESPAWN);

    runtime.update(0.2, {});
    expect([
      runtime.session.screen,
      runtime.player.alive,
      runtime.player.x,
      runtime.player.y,
      runtime.player.jumpsRemaining
    ]).toEqual([ns.SCREEN.PLAY, true, runtime.room.spawn.x, runtime.room.spawn.y, 2]);
  });

  test('room completion records stats once and advances progression', () => {
    const { ns, runtime } = createRuntime();
    runtime.startNewSession();
    runtime.session.roomTime = 12.3;
    runtime.session.roomDeaths = 1;
    runtime.session.roomFlips = 4;
    runtime.systems.progression.advanceRoom();

    expect([
      runtime.session.screen,
      runtime.session.roomIndex,
      runtime.session.totalTime,
      runtime.session.roomStats.length,
      runtime.session.roomStats[0].flips
    ]).toEqual([ns.SCREEN.PLAY, 1, 12.3, 1, 4]);
  });

  test('expanded campaign rooms validate with unique ids and par metadata', () => {
    const { ns, runtime } = createRuntime();
    const ids = runtime.rooms.map(room => room.id);
    const campaignRooms = runtime.rooms;

    expect(runtime.rooms.length).toBe(40);
    expect(new Set(ids).size).toBe(ids.length);
    expect(campaignRooms.every(room => Number.isFinite(room.parTime) && Number.isFinite(room.parFlips))).toBe(true);

    runtime.startNewSession();
    runtime.loadRoom(7, { resetRoomStats: true });
    runtime.session.roomTime = 21.5;
    runtime.session.roomFlips = 4;
    runtime.systems.progression.advanceRoom();

    expect([
      runtime.session.screen,
      runtime.session.roomStats[0].id,
      runtime.session.roomStats[0].parTime,
      runtime.session.roomStats[0].parFlips
    ]).toEqual([ns.SCREEN.PLAY, '8-two-flip-lie', 27, 4]);
  });

  test('campaign collectibles stay out of platforms and battery placements are unique', () => {
    const { runtime } = createRuntime();
    const batteryPlacements = new Set();

    for (const room of runtime.rooms) {
      const collectibles = []
        .concat(room.shards.map(item => ({ kind: 'shard', size: 32, item })))
        .concat(room.flipBatteries.map(item => ({ kind: 'flip', size: 34, item })))
        .concat(room.jumpBatteries.map(item => ({ kind: 'jump', size: 34, item })));

      for (const collectible of collectibles) {
        const rect = {
          x: collectible.item.x,
          y: collectible.item.y,
          w: collectible.size,
          h: collectible.size
        };
        expect(room.platforms.some(platform => rectsOverlap(rect, platform))).toBe(false);

        if (collectible.kind !== 'shard') {
          const key = collectible.kind + ':' + collectible.item.x + ',' + collectible.item.y;
          expect(batteryPlacements.has(key)).toBe(false);
          batteryPlacements.add(key);
        }
      }
    }
  });

  test('win renderer lays out expanded campaign stats without throwing', () => {
    const { ns, runtime } = createRuntime();
    const ctx = createFakeCanvasContext();
    const renderer = ns.createRenderer({ width: 1920, height: 1080 }, ctx);

    runtime.session.screen = ns.SCREEN.WIN;
    runtime.session.roomStats = runtime.rooms.map((room, index) => ({
      id: room.id,
      name: room.name,
      time: 10 + index,
      deaths: index % 3,
      flips: index % 5
    }));

    expect(() => renderer.render(runtime.getRenderState())).not.toThrow();
    expect(ctx.calls.some(call => call[0] === 'fillText' && call[1] === '40. The Crown Tumbler')).toBe(true);
  });

  test('chase rooms queue death when the shadow reaches the player threshold', () => {
    const { ns, runtime } = createRuntime();
    runtime.startNewSession();
    const chaseIndex = runtime.rooms.findIndex(room => room.chase);
    runtime.loadRoom(chaseIndex, { resetRoomStats: true });
    runtime.session.screen = ns.SCREEN.PLAY;
    runtime.player.x = 40;
    runtime.roomState.shadowX = 0;

    runtime.systems.progression.updateChase(0);
    expect(runtime.session.screen).toBe(ns.SCREEN.RESPAWN);
  });

  test('flip batteries restore energy once and reset with the room', () => {
    const roomDefinitions = [{
      name: 'Battery Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: [],
      flipBatteries: [{ x: 0, y: 0, amount: 45 }]
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.energy = 20;

    runtime.systems.player.update(0, {});
    expect([runtime.player.energy, runtime.roomState.flipBatteries[0].got]).toEqual([65, true]);

    runtime.player.energy = 20;
    runtime.systems.player.update(0, {});
    expect(runtime.player.energy).toBe(20);

    runtime.loadRoom(0, { resetRoomStats: false });
    expect(runtime.roomState.flipBatteries[0].got).toBe(false);
  });

  test('flip batteries can overcharge energy until the next room reset', () => {
    const roomDefinitions = [{
      name: 'Overcharge Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: [],
      flipBatteries: [{ x: 0, y: 0, amount: 45 }]
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.energy = runtime.config.player.maxEnergy;

    runtime.systems.player.update(0, {});
    expect(runtime.player.energy).toBe(145);

    runtime.loadRoom(0, { resetRoomStats: false });
    expect(runtime.player.energy).toBe(runtime.config.player.maxEnergy);
  });

  test('jump batteries restore double-jump charge once and reset with the room', () => {
    const roomDefinitions = [{
      name: 'Jump Battery Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: [],
      jumpBatteries: [{ x: 0, y: 0, amount: 100 }]
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.doubleJumpEnergy = 0;
    runtime.player.doubleJumpAvailable = false;

    runtime.systems.player.update(0, {});
    expect([
      runtime.player.doubleJumpEnergy,
      runtime.player.doubleJumpAvailable,
      runtime.roomState.jumpBatteries[0].got
    ]).toEqual([100, true, true]);

    runtime.player.doubleJumpEnergy = 0;
    runtime.systems.player.update(0, {});
    expect(runtime.player.doubleJumpEnergy).toBe(0);

    runtime.loadRoom(0, { resetRoomStats: false });
    expect(runtime.roomState.jumpBatteries[0].got).toBe(false);
  });

  test('jump batteries can overcharge double-jump energy until the next room reset', () => {
    const roomDefinitions = [{
      name: 'Jump Overcharge Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: [],
      jumpBatteries: [{ x: 0, y: 0, amount: 100 }]
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.doubleJumpEnergy = runtime.config.player.maxDoubleJumpEnergy;

    runtime.systems.player.update(0, {});
    expect(runtime.player.doubleJumpEnergy).toBe(400);

    runtime.loadRoom(0, { resetRoomStats: false });
    expect(runtime.player.doubleJumpEnergy).toBe(runtime.config.player.maxDoubleJumpEnergy);
  });

  test('gates block while closed and leave solids after shard locks open', () => {
    const roomDefinitions = [{
      name: 'Gate Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [{ x: 0, y: 0 }],
      spikes: [],
      enemies: [],
      movers: [],
      locks: [{ id: 'one', shards: 1 }],
      gates: [{ id: 'gate', x: 50, y: 0, w: 40, h: 100, lockId: 'one' }]
    }];
    const { ns, runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();

    runtime.systems.physics.buildSolids();
    const closedGate = runtime.roomState.solids.find(solid => solid.id === 'gate');
    expect([closedGate.y, closedGate.h]).toEqual([0, ns.H]);

    runtime.systems.player.update(0, {});
    runtime.systems.physics.buildSolids();
    expect([
      runtime.roomState.gates[0].open,
      runtime.roomState.solids.some(solid => solid.id === 'gate')
    ]).toEqual([true, false]);
  });

  test('wall gates open when every shard to their left is collected', () => {
    const roomDefinitions = [{
      name: 'Left Keys Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [
        { x: 10, y: 0 },
        { x: 100, y: 0 },
        { x: 500, y: 0 }
      ],
      spikes: [],
      enemies: [],
      movers: [],
      gates: [{ id: 'left-wall', x: 300, y: 0, w: 40, h: 100, shards: 3 }]
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();

    runtime.roomState.shards[0].got = true;
    runtime.systems.physics.buildSolids();
    expect(runtime.roomState.gates[0].open).toBe(false);

    runtime.roomState.shards[1].got = true;
    runtime.systems.physics.buildSolids();
    expect([
      runtime.roomState.gates[0].open,
      runtime.roomState.solids.some(solid => solid.id === 'left-wall')
    ]).toEqual([true, false]);
  });

  test('per-room chase config overrides global chase defaults', () => {
    const roomDefinitions = [{
      name: 'Chase Config Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      chase: { startX: -50, baseSpeed: 200, rampPerSecond: 20, killOffset: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: []
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();

    expect(runtime.systems.progression.getChaseConfig()).toEqual({
      startX: -50,
      baseSpeed: 200,
      rampPerSecond: 20,
      killOffset: 120
    });
  });

  test('sentry beams only kill while active', () => {
    const roomDefinitions = [{
      name: 'Sentry Test',
      spawn: { x: 80, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: [],
      hazards: [{ x: 0, y: 0, w: 40, h: 40, axis: 'x', length: 200, period: 2, activeTime: 0.5 }]
    }];
    const { ns, runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.session.roomTime = 1;
    runtime.systems.player.update(0, {});
    expect(runtime.session.screen).toBe(ns.SCREEN.PLAY);

    runtime.session.roomTime = 0;
    runtime.systems.player.update(0, {});
    expect(runtime.session.screen).toBe(ns.SCREEN.RESPAWN);
  });

  test('hunters pursue deterministically and die on spikes', () => {
    const roomDefinitions = [{
      name: 'Hunter Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [{ x: 90, y: 0, w: 40, h: 80, dir: -1 }],
      enemies: [{ type: 'hunter', axis: 'x', x: 50, y: 0, w: 42, h: 42, speed: 100 }],
      movers: []
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();
    runtime.player.x = 200;

    runtime.systems.enemies.update(0.1);
    expect(runtime.roomState.enemies[0].vx).toBe(100);
    expect(runtime.roomState.enemies[0].alive).toBe(false);
  });

  function createMoverRuntime(moverOverrides, roomOverrides) {
    const mover = Object.assign({ x: 100, y: 100, w: 160, h: 20, axis: 'x', range: 100, speed: 120 }, moverOverrides || {});
    const room = Object.assign({
      name: 'Mover Test',
      spawn: { x: 130, y: 48 },
      exit: { x: 1800, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [],
      spikes: [],
      enemies: [],
      movers: [mover]
    }, roomOverrides || {});
    const { ns, runtime } = createRuntime([room]);
    runtime.startNewSession();
    runtime.player.x = 130;
    runtime.player.y = 48;
    runtime.player.w = 38;
    runtime.player.h = 52;
    runtime.player.vx = 0;
    runtime.player.vy = 0;
    runtime.player.onGround = true;
    return { ns, runtime };
  }

  test('horizontal moving platforms carry a standing player exactly once', () => {
    const { runtime } = createMoverRuntime({ axis: 'x' });
    const mover = runtime.roomState.movers[0];
    const startPlayerX = runtime.player.x;

    runtime.update(1 / 30, {});

    const moverDelta = mover.x - mover.oldX;
    expect(runtime.player.x).toBeCloseTo(startPlayerX + moverDelta, 5);
    expect(runtime.player.y + runtime.player.h).toBeCloseTo(mover.y, 5);
    expect(runtime.player.onGround).toBe(true);
  });

  test('downward vertical moving platforms keep a standing player attached', () => {
    const { runtime } = createMoverRuntime({ axis: 'y' });
    const mover = runtime.roomState.movers[0];

    runtime.update(1 / 30, {});

    expect(mover.y).toBeGreaterThan(mover.oldY);
    expect(runtime.player.y + runtime.player.h).toBeCloseTo(mover.y, 5);
    expect(runtime.player.onGround).toBe(true);
    expect(runtime.player.vy).toBe(0);
  });

  test('upward vertical moving platforms keep a standing player attached without tunneling', () => {
    const { runtime } = createMoverRuntime({ axis: 'y' });
    const mover = runtime.roomState.movers[0];
    mover.t = Math.PI * 60 / mover.speed;

    runtime.update(1 / 30, {});

    expect(mover.y).toBeLessThan(mover.oldY);
    expect(runtime.player.y + runtime.player.h).toBeCloseTo(mover.y, 5);
    expect(runtime.player.onGround).toBe(true);
    expect(runtime.player.vy).toBe(0);
  });

  test('inverted gravity supports riding the underside of a moving platform', () => {
    const { runtime } = createMoverRuntime({ axis: 'x' });
    const mover = runtime.roomState.movers[0];
    runtime.roomState.gravity = -1;
    runtime.player.y = mover.y + mover.h;
    runtime.player.onGround = true;
    const startPlayerX = runtime.player.x;

    runtime.update(1 / 30, {});

    const moverDelta = mover.x - mover.oldX;
    expect(runtime.player.x).toBeCloseTo(startPlayerX + moverDelta, 5);
    expect(runtime.player.y).toBeCloseTo(mover.y + mover.h, 5);
    expect(runtime.player.onGround).toBe(true);
  });

  test('jumping from a moving platform breaks attachment after the jump', () => {
    const { runtime } = createMoverRuntime({ axis: 'x' });
    const mover = runtime.roomState.movers[0];

    runtime.update(1 / 30, { jumpPressed: true });
    const afterJumpX = runtime.player.x;
    const jumpVy = runtime.player.vy;
    runtime.update(1 / 30, {});

    expect(jumpVy).toBeLessThan(0);
    expect(runtime.player.onGround).toBe(false);
    expect(runtime.player.x).toBeCloseTo(afterJumpX, 5);
    expect(runtime.player.y + runtime.player.h).not.toBeCloseTo(mover.y, 1);
  });

  test('moving platforms crush the player when carried into another solid', () => {
    const { ns, runtime } = createMoverRuntime(
      { axis: 'x' },
      { platforms: [{ x: 172, y: 40, w: 40, h: 120 }] }
    );

    runtime.update(1 / 30, {});

    expect(runtime.session.screen).toBe(ns.SCREEN.RESPAWN);
  });

  test('falling onto a moving platform lands normally and carries on the next frame', () => {
    const { runtime } = createMoverRuntime({ axis: 'x' });
    const mover = runtime.roomState.movers[0];
    runtime.player.y = 45;
    runtime.player.vy = 400;
    runtime.player.onGround = false;

    runtime.update(1 / 30, {});
    const landedX = runtime.player.x;
    expect(runtime.player.onGround).toBe(true);
    expect(runtime.player.y + runtime.player.h).toBeCloseTo(mover.y, 5);

    runtime.update(1 / 30, {});
    expect(runtime.player.x).toBeGreaterThan(landedX);
    expect(runtime.player.y + runtime.player.h).toBeCloseTo(mover.y, 5);
    expect(runtime.player.onGround).toBe(true);
  });

  test('exit only advances after every shard is collected', () => {
    const roomDefinitions = [{
      name: 'Exit Test',
      spawn: { x: 0, y: 0 },
      exit: { x: 50, y: 0, w: 80, h: 120 },
      platforms: [],
      shards: [{ x: 10, y: 0 }],
      spikes: [],
      enemies: [],
      movers: []
    }];
    const { runtime } = createRuntime(roomDefinitions);
    runtime.startNewSession();

    runtime.player.x = 50;
    runtime.player.y = 0;
    runtime.player.vx = 0;
    runtime.player.vy = 0;
    runtime.systems.player.update(0, {});
    expect(runtime.session.roomIndex).toBe(0);

    runtime.player.x = 10;
    runtime.player.y = 0;
    runtime.systems.player.update(0, {});
    runtime.player.x = 50;
    runtime.player.y = 0;
    runtime.systems.player.update(0, {});

    expect(runtime.session.screen).toBe('win');
  });

  test('room validation rejects malformed definitions', () => {
    const context = createBrowserContext();
    const ns = loadGravityNamespace(context);

    expect(() => ns.createGameRuntime([{
      name: 'Broken Room',
      spawn: { x: 0, y: 0 },
      exit: { x: 0, y: 0, w: 10, h: 10 },
      platforms: [],
      shards: [],
      spikes: [{ x: 0, y: 0, w: 10, h: 10, dir: 0 }],
      enemies: [],
      movers: []
    }], { random: () => 0 })).toThrow('dir must be 1 or -1');
  });
});
