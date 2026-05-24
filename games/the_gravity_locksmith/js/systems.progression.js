window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createProgressionSystem = function(runtime) {
    function getChaseConfig() {
      const chase = runtime.room && runtime.room.chase;
      const base = runtime.config.chase;
      if (!chase) return base;
      if (chase === true) return base;
      return {
        startX: chase.startX == null ? base.startX : chase.startX,
        baseSpeed: chase.baseSpeed == null ? base.baseSpeed : chase.baseSpeed,
        rampPerSecond: chase.rampPerSecond == null ? base.rampPerSecond : chase.rampPerSecond,
        killOffset: chase.killOffset == null ? base.killOffset : chase.killOffset
      };
    }

    function startRoomStats() {
      runtime.session.roomTime = 0;
      runtime.session.roomDeaths = 0;
      runtime.session.roomFlips = 0;
    }

    function collectedShardCount() {
      return runtime.roomState.shards.filter(function(shard) {
        return shard.got;
      }).length;
    }

    function lockIsOpen(lockId) {
      if (!lockId) return true;
      const lock = runtime.room.locks.find(function(candidate) {
        return candidate.id === lockId;
      });
      return Boolean(lock) && collectedShardCount() >= lock.shards;
    }

    function leftSideKeysAreCollected(gate) {
      const leftSideShards = runtime.roomState.shards.filter(function(shard) {
        return shard.x + shard.w / 2 < gate.x;
      });
      return leftSideShards.length > 0 && leftSideShards.every(function(shard) {
        return shard.got;
      });
    }

    function updateGates() {
      const shards = collectedShardCount();
      for (const gate of runtime.roomState.gates) {
        const countOrLockOpen = shards >= gate.shards && lockIsOpen(gate.lockId);
        const shouldOpen = leftSideKeysAreCollected(gate) || countOrLockOpen;
        if (shouldOpen && !gate.open) {
          runtime.systems.effects.burst(gate.x + gate.w / 2, gate.y + gate.h / 2, runtime.config.colors.exit, 18, 150);
        }
        gate.open = shouldOpen;
      }
    }

    function recordRoomCompletion() {
      runtime.session.roomStats.push({
        id: runtime.room.id,
        name: runtime.room.name,
        time: runtime.session.roomTime,
        deaths: runtime.session.roomDeaths,
        flips: runtime.session.roomFlips,
        parTime: runtime.room.parTime,
        parFlips: runtime.room.parFlips,
        parDeaths: runtime.room.parDeaths
      });
      runtime.session.totalTime += runtime.session.roomTime;
    }

    function queueRespawn() {
      if (!runtime.player.alive || runtime.session.screen === ns.SCREEN.RESPAWN) return;
      runtime.player.alive = false;
      runtime.session.roomDeaths += 1;
      runtime.session.totalDeaths += 1;
      runtime.session.screen = ns.SCREEN.RESPAWN;
      runtime.session.respawnTimer = runtime.config.timing.respawnDelay;
      runtime.session.cameraShake = runtime.config.effects.cameraShakeDeath;
      runtime.systems.effects.burst(
        runtime.player.x + runtime.player.w / 2,
        runtime.player.y + runtime.player.h / 2,
        runtime.config.colors.death,
        32,
        260
      );
    }

    function advanceRoom() {
      recordRoomCompletion();
      runtime.session.roomIndex += 1;
      runtime.session.roomCompleteFlash = 1;

      if (runtime.session.roomIndex >= runtime.rooms.length) {
        runtime.session.screen = ns.SCREEN.WIN;
        return;
      }

      runtime.loadRoom(runtime.session.roomIndex, { resetRoomStats: true });
      runtime.session.screen = ns.SCREEN.PLAY;
    }

    function updateChase(dt) {
      if (!runtime.room.chase) return;
      const chase = getChaseConfig();
      runtime.roomState.shadowX += (chase.baseSpeed + runtime.session.roomTime * chase.rampPerSecond) * dt;
      if (runtime.player.x < runtime.roomState.shadowX + chase.killOffset) {
        queueRespawn();
      }
    }

    function updateRespawn(dt) {
      runtime.session.respawnTimer -= dt;
      if (runtime.session.respawnTimer > 0) return;
      runtime.loadRoom(runtime.session.roomIndex, { resetRoomStats: false });
      runtime.session.screen = ns.SCREEN.PLAY;
    }

    return {
      startRoomStats: startRoomStats,
      queueRespawn: queueRespawn,
      advanceRoom: advanceRoom,
      getChaseConfig: getChaseConfig,
      updateGates: updateGates,
      updateChase: updateChase,
      updateRespawn: updateRespawn
    };
  };
})(window.GravityLocksmith);
