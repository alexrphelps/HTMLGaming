window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createStars = function(count, width, height, random) {
    const rng = random || Math.random;
    const stars = [];
    for (let index = 0; index < count; index++) {
      stars.push({
        x: rng() * width,
        y: rng() * height,
        r: rng() * 1.8 + 0.3,
        a: rng() * 0.55 + 0.15,
        drift: rng() * 12 + 4
      });
    }
    return stars;
  };

  ns.createPlayerState = function(config) {
    return {
      x: 96,
      y: 860,
      w: config.player.width,
      h: config.player.height,
      vx: 0,
      vy: 0,
      onGround: false,
      energy: config.player.maxEnergy,
      doubleJumpEnergy: config.player.maxDoubleJumpEnergy,
      doubleJumpAvailable: true,
      face: 1,
      coyote: 0,
      jumpBuffer: 0,
      jumpsRemaining: config.player.maxJumps,
      alive: true
    };
  };

  ns.createRoomEntities = function(room, random) {
    const rng = random || Math.random;
    return {
      shards: room.shards.map(function(shard) {
        return { x: shard.x, y: shard.y, w: 32, h: 32, got: false, bob: rng() * 10 };
      }),
      enemies: room.enemies.map(function(enemy) {
        return {
          type: enemy.type,
          axis: enemy.axis,
          x: enemy.x,
          y: enemy.y,
          w: enemy.w,
          h: enemy.h,
          vx: enemy.vx || (enemy.type === "hunter" && enemy.axis === "x" ? enemy.speed : 0),
          vy: enemy.vy || (enemy.type === "hunter" && enemy.axis === "y" ? enemy.speed : 0),
          speed: enemy.speed,
          alive: true,
          onGround: false
        };
      }),
      movers: room.movers.map(function(mover) {
        return {
          x: mover.x,
          y: mover.y,
          w: mover.w,
          h: mover.h,
          baseX: mover.x,
          baseY: mover.y,
          oldX: mover.x,
          oldY: mover.y,
          t: 0,
          axis: mover.axis,
          range: mover.range,
          speed: mover.speed
        };
      }),
      flipBatteries: room.flipBatteries.map(function(battery) {
        return { x: battery.x, y: battery.y, w: 34, h: 34, amount: battery.amount, got: false, bob: rng() * 10 };
      }),
      jumpBatteries: room.jumpBatteries.map(function(battery) {
        return { x: battery.x, y: battery.y, w: 34, h: 34, amount: battery.amount, got: false, bob: rng() * 10 };
      }),
      gates: room.gates.map(function(gate) {
        return {
          id: gate.id,
          x: gate.x,
          y: 0,
          w: gate.w,
          h: ns.H,
          shards: gate.shards,
          lockId: gate.lockId,
          open: false
        };
      }),
      hazards: room.hazards.map(function(hazard) {
        return {
          type: hazard.type,
          axis: hazard.axis,
          x: hazard.x,
          y: hazard.y,
          w: hazard.w,
          h: hazard.h,
          length: hazard.length,
          thickness: hazard.thickness,
          period: hazard.period,
          activeTime: hazard.activeTime,
          phase: hazard.phase,
          dir: hazard.dir
        };
      }),
      particles: []
    };
  };
})(window.GravityLocksmith);
