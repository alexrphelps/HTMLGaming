window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createPlayerSystem = function(runtime) {
    function createJumpBurst(player, color, count, speed) {
      runtime.systems.effects.burst(
        player.x + player.w / 2,
        player.y + (runtime.roomState.gravity === 1 ? player.h : 0),
        color,
        count,
        speed
      );
    }

    function applyFlip() {
      const player = runtime.player;
      if (player.energy < runtime.config.player.energyPerFlip) return false;

      runtime.roomState.gravity *= -1;
      player.energy -= runtime.config.player.energyPerFlip;
      player.vy *= runtime.config.player.gravityFlipVelocityCarry;
      runtime.session.roomFlips += 1;
      runtime.session.totalFlips += 1;
      runtime.session.cameraShake = runtime.config.effects.cameraShakeFlip;
      runtime.systems.effects.burst(player.x + player.w / 2, player.y + player.h / 2, runtime.config.colors.player, 28, 230);

      for (const enemy of runtime.roomState.enemies) {
        if (!enemy.alive) continue;
        enemy.vy *= runtime.config.enemy.gravityFlipVelocityCarry;
        runtime.systems.effects.burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, runtime.config.colors.enemy, 8, 110);
      }

      return true;
    }

    function consumeJump(player, velocity, isDoubleJump) {
      player.vy = -runtime.roomState.gravity * velocity;
      player.jumpBuffer = 0;
      player.coyote = 0;
      if (isDoubleJump) {
        player.doubleJumpEnergy = Math.max(0, player.doubleJumpEnergy - runtime.config.player.doubleJumpEnergyCost);
        player.doubleJumpAvailable = false;
      }
      player.jumpsRemaining = player.doubleJumpAvailable && player.doubleJumpEnergy >= runtime.config.player.doubleJumpEnergyCost ? 1 : 0;
      createJumpBurst(player, isDoubleJump ? runtime.config.colors.playerTrail : "#edf7ff", isDoubleJump ? 14 : 8, isDoubleJump ? 140 : 90);
    }

    function update(dt, input) {
      const player = runtime.player;
      const config = runtime.config.player;
      const acceleration = player.onGround ? config.groundAcceleration : config.airAcceleration;
      const friction = player.onGround ? config.groundFriction : config.airFriction;

      let direction = 0;
      if (input.moveLeft) direction -= 1;
      if (input.moveRight) direction += 1;

      if (direction !== 0) {
        player.vx += direction * acceleration * dt;
        player.face = direction;
      } else {
        const frictionDelta = friction * dt;
        if (Math.abs(player.vx) <= frictionDelta) player.vx = 0;
        else player.vx -= Math.sign(player.vx) * frictionDelta;
      }

      player.vx = ns.clamp(player.vx, -config.moveSpeed, config.moveSpeed);

      if (input.jumpPressed) player.jumpBuffer = config.jumpBufferTime;
      else player.jumpBuffer -= dt;

      if (player.onGround) {
        player.coyote = config.coyoteTime;
        player.doubleJumpAvailable = true;
      } else {
        player.coyote -= dt;
      }

      if (player.jumpBuffer > 0) {
        if (player.coyote > 0) {
          consumeJump(player, config.jumpVelocity, false);
        } else if (player.doubleJumpAvailable && player.doubleJumpEnergy >= config.doubleJumpEnergyCost) {
          consumeJump(player, config.doubleJumpVelocity, true);
        }
      }

      if (input.flipPressed) applyFlip();

      player.vy += runtime.roomState.gravity * config.gravityAcceleration * dt;
      player.vy = ns.clamp(player.vy, -config.maxFallSpeed, config.maxFallSpeed);
      runtime.systems.physics.moveAndCollide(player, dt, { isPlayer: true });

      player.jumpsRemaining = player.doubleJumpAvailable && player.doubleJumpEnergy >= config.doubleJumpEnergyCost ? 1 : 0;

      for (const spike of runtime.room.spikes) {
        if (ns.rectsOverlap(player, spike)) {
          runtime.queueDeath();
          return;
        }
      }

      for (const enemy of runtime.roomState.enemies) {
        if (enemy.alive && ns.rectsOverlap(player, enemy)) {
          runtime.queueDeath();
          return;
        }
      }

      for (const hazard of runtime.roomState.hazards) {
        if (!ns.isSentryActive(hazard, runtime.session.roomTime)) continue;
        if (ns.rectsOverlap(player, hazard) || ns.rectsOverlap(player, ns.getSentryBeamRect(hazard))) {
          runtime.queueDeath();
          return;
        }
      }

      for (const shard of runtime.roomState.shards) {
        if (shard.got || !ns.rectsOverlap(player, shard)) continue;
        shard.got = true;
        runtime.systems.effects.burst(shard.x + shard.w / 2, shard.y + shard.h / 2, runtime.config.colors.shard, 18, 170);
      }

      for (const battery of runtime.roomState.flipBatteries) {
        if (battery.got || !ns.rectsOverlap(player, battery)) continue;
        battery.got = true;
        player.energy += battery.amount;
        runtime.systems.effects.burst(battery.x + battery.w / 2, battery.y + battery.h / 2, runtime.config.colors.playerTrail, 24, 210);
      }

      for (const battery of runtime.roomState.jumpBatteries) {
        if (battery.got || !ns.rectsOverlap(player, battery)) continue;
        battery.got = true;
        player.doubleJumpEnergy += battery.amount;
        player.doubleJumpAvailable = true;
        player.jumpsRemaining = player.doubleJumpAvailable && player.doubleJumpEnergy >= config.doubleJumpEnergyCost ? 1 : 0;
        runtime.systems.effects.burst(battery.x + battery.w / 2, battery.y + battery.h / 2, runtime.config.colors.player, 24, 210);
      }

      const allCollected = runtime.roomState.shards.every(function(shard) {
        return shard.got;
      });
      if (allCollected && ns.rectsOverlap(player, runtime.room.exit)) {
        runtime.systems.effects.burst(
          runtime.room.exit.x + runtime.room.exit.w / 2,
          runtime.room.exit.y + runtime.room.exit.h / 2,
          runtime.config.colors.exit,
          40,
          240
        );
        runtime.systems.progression.advanceRoom();
      }
    }

    return {
      update: update,
      applyFlip: applyFlip
    };
  };
})(window.GravityLocksmith);
