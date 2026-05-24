window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createGameRuntime = function(roomDefinitions, configOverrides) {
    const config = Object.assign({}, ns.CONFIG, configOverrides || {});
    const random = (configOverrides && configOverrides.random) || Math.random;
    const rooms = ns.validateAndNormalizeRooms(roomDefinitions);
    const runtime = {
      config: config,
      rooms: rooms,
      room: rooms[0],
      random: random,
      stars: ns.createStars(config.effects.starCount, config.world.width, config.world.height, random),
      session: {
        screen: ns.SCREEN.TITLE,
        roomIndex: 0,
        roomTime: 0,
        roomDeaths: 0,
        roomFlips: 0,
        totalDeaths: 0,
        totalFlips: 0,
        totalTime: 0,
        roomStats: [],
        cameraShake: 0,
        roomCompleteFlash: 0,
        respawnTimer: 0,
        clock: 0
      },
      player: ns.createPlayerState(config),
      roomState: {
        gravity: 1,
        shadowX: config.chase.startX,
        shards: [],
        flipBatteries: [],
        jumpBatteries: [],
        enemies: [],
        movers: [],
        gates: [],
        hazards: [],
        solids: [],
        particles: []
      },
      systems: {}
    };

    runtime.systems.physics = ns.createPhysicsSystem(runtime);
    runtime.systems.effects = ns.createEffectsSystem(runtime);
    runtime.systems.progression = ns.createProgressionSystem(runtime);
    runtime.systems.player = ns.createPlayerSystem(runtime);
    runtime.systems.enemies = ns.createEnemySystem(runtime);

    runtime.queueDeath = function() {
      runtime.systems.progression.queueRespawn();
    };

    runtime.loadRoom = function(roomIndex, options) {
      const settings = options || {};
      runtime.session.roomIndex = roomIndex;
      runtime.room = runtime.rooms[roomIndex];
      runtime.roomState.gravity = 1;
      runtime.roomState.shadowX = runtime.systems.progression.getChaseConfig().startX;

      if (settings.resetRoomStats) {
        runtime.systems.progression.startRoomStats();
      }

      const entities = ns.createRoomEntities(runtime.room, runtime.random);
      runtime.roomState.shards = entities.shards;
      runtime.roomState.flipBatteries = entities.flipBatteries;
      runtime.roomState.jumpBatteries = entities.jumpBatteries;
      runtime.roomState.enemies = entities.enemies;
      runtime.roomState.movers = entities.movers;
      runtime.roomState.gates = entities.gates;
      runtime.roomState.hazards = entities.hazards;
      runtime.roomState.particles = [];

      runtime.player.x = runtime.room.spawn.x;
      runtime.player.y = runtime.room.spawn.y;
      runtime.player.vx = 0;
      runtime.player.vy = 0;
      runtime.player.onGround = false;
      runtime.player.energy = runtime.config.player.maxEnergy;
      runtime.player.doubleJumpEnergy = runtime.config.player.maxDoubleJumpEnergy;
      runtime.player.doubleJumpAvailable = true;
      runtime.player.face = 1;
      runtime.player.coyote = 0;
      runtime.player.jumpBuffer = 0;
      runtime.player.jumpsRemaining = runtime.config.player.maxJumps;
      runtime.player.alive = true;

      runtime.systems.physics.buildSolids();
    };

    runtime.startNewSession = function() {
      runtime.session.screen = ns.SCREEN.PLAY;
      runtime.session.roomIndex = 0;
      runtime.session.roomTime = 0;
      runtime.session.roomDeaths = 0;
      runtime.session.roomFlips = 0;
      runtime.session.totalDeaths = 0;
      runtime.session.totalFlips = 0;
      runtime.session.totalTime = 0;
      runtime.session.roomStats = [];
      runtime.session.cameraShake = 0;
      runtime.session.roomCompleteFlash = 0;
      runtime.session.respawnTimer = 0;
      runtime.session.clock = 0;
      runtime.loadRoom(0, { resetRoomStats: true });
    };

    runtime.returnToTitle = function() {
      runtime.session.screen = ns.SCREEN.TITLE;
      runtime.session.roomIndex = 0;
      runtime.session.roomTime = 0;
      runtime.session.roomDeaths = 0;
      runtime.session.roomFlips = 0;
      runtime.session.totalDeaths = 0;
      runtime.session.totalFlips = 0;
      runtime.session.totalTime = 0;
      runtime.session.roomStats = [];
      runtime.session.cameraShake = 0;
      runtime.session.roomCompleteFlash = 0;
      runtime.session.respawnTimer = 0;
      runtime.session.clock = 0;
      runtime.loadRoom(0, { resetRoomStats: true });
    };

    runtime.getRenderState = function() {
      return {
        config: runtime.config,
        room: runtime.room,
        rooms: runtime.rooms,
        session: runtime.session,
        roomState: runtime.roomState,
        player: runtime.player,
        chaseConfig: runtime.systems.progression.getChaseConfig(),
        stars: runtime.stars
      };
    };

    runtime.update = function(dt, input) {
      const actions = input || {};
      runtime.systems.effects.updateStars(dt);
      runtime.systems.effects.updateParticles(dt);
      runtime.systems.effects.updateTimers(dt);

      if (runtime.session.screen === ns.SCREEN.TITLE) {
        if (actions.confirmPressed) runtime.startNewSession();
        return;
      }

      if (runtime.session.screen === ns.SCREEN.WIN) {
        if (actions.confirmPressed) runtime.returnToTitle();
        return;
      }

      if (runtime.session.screen === ns.SCREEN.RESPAWN) {
        runtime.systems.progression.updateRespawn(dt);
        return;
      }

      if (actions.restartPressed) {
        runtime.queueDeath();
        return;
      }

      runtime.session.roomTime += dt;

      const supportedMover = runtime.systems.physics.findSupportedMover(runtime.player);
      for (const mover of runtime.roomState.movers) {
        runtime.systems.physics.updateMover(mover, dt);
      }
      runtime.systems.physics.buildSolids();

      runtime.systems.physics.carryWithMover(runtime.player, supportedMover, { isPlayer: true, crushKills: true });
      if (runtime.session.screen !== ns.SCREEN.PLAY) return;

      runtime.systems.player.update(dt, actions);
      if (runtime.session.screen !== ns.SCREEN.PLAY) return;

      runtime.systems.enemies.update(dt);
      if (runtime.session.screen !== ns.SCREEN.PLAY) return;

      runtime.systems.progression.updateChase(dt);
    };

    runtime.loadRoom(0, { resetRoomStats: true });
    runtime.session.screen = ns.SCREEN.TITLE;
    return runtime;
  };
})(window.GravityLocksmith);
