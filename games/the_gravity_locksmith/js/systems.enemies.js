window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createEnemySystem = function(runtime) {
    function update(dt) {
      for (const enemy of runtime.roomState.enemies) {
        if (!enemy.alive) continue;

        if (enemy.type === "hunter") {
          if (enemy.axis === "x") {
            enemy.vx = runtime.player.x + runtime.player.w / 2 < enemy.x + enemy.w / 2 ? -enemy.speed : enemy.speed;
          } else {
            enemy.vy = runtime.player.y + runtime.player.h / 2 < enemy.y + enemy.h / 2 ? -enemy.speed : enemy.speed;
          }
        }

        enemy.vy += runtime.roomState.gravity * runtime.config.enemy.gravityAcceleration * dt;
        enemy.vy = ns.clamp(enemy.vy, -runtime.config.enemy.maxFallSpeed, runtime.config.enemy.maxFallSpeed);

        const oldX = enemy.x;
        const oldY = enemy.y;
        runtime.systems.physics.moveAndCollide(enemy, dt, { isPlayer: false });

        if (enemy.type !== "hunter" && (enemy.vx === 0 || Math.abs(enemy.x - oldX) < 0.01)) {
          enemy.vx = -enemy.vx || runtime.config.enemy.defaultPatrolSpeed;
        }

        if (enemy.type === "hunter" && enemy.axis === "y" && Math.abs(enemy.y - oldY) < 0.01) {
          enemy.vy = -enemy.vy || enemy.speed;
        }

        for (const spike of runtime.room.spikes) {
          if (!ns.rectsOverlap(enemy, spike)) continue;
          enemy.alive = false;
          runtime.systems.effects.burst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, runtime.config.colors.enemy, 20, 180);
        }
      }
    }

    return { update: update };
  };
})(window.GravityLocksmith);
