window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createPhysicsSystem = function(runtime) {
    const MOVER_SUPPORT_TOLERANCE = 10;

    function buildSolids() {
      runtime.systems.progression.updateGates();
      const closedGates = runtime.roomState.gates.filter(function(gate) {
        return !gate.open;
      });
      runtime.roomState.solids = runtime.room.platforms.map(ns.copyRect).concat(runtime.roomState.movers, closedGates);
    }

    function markOutOfBounds(obj, isPlayer) {
      const bounds = runtime.config.world.outOfBounds;
      const outOfBounds = obj.x < bounds.left ||
        obj.x > bounds.right ||
        obj.y < bounds.top ||
        obj.y > bounds.bottom;

      if (!outOfBounds) return;
      if (isPlayer) runtime.queueDeath();
      else obj.alive = false;
    }

    function hasHorizontalSupportOverlap(obj, mover) {
      return obj.x < mover.x + mover.w &&
        obj.x + obj.w > mover.x;
    }

    function findSupportedMover(obj, tolerance) {
      if (!obj.onGround) return null;
      const supportTolerance = tolerance == null ? MOVER_SUPPORT_TOLERANCE : tolerance;

      for (const mover of runtime.roomState.movers) {
        if (!hasHorizontalSupportOverlap(obj, mover)) continue;

        if (runtime.roomState.gravity === 1) {
          const feetY = obj.y + obj.h;
          if (Math.abs(feetY - mover.y) <= supportTolerance) return mover;
        } else {
          const headY = obj.y;
          const moverBottomY = mover.y + mover.h;
          if (Math.abs(headY - moverBottomY) <= supportTolerance) return mover;
        }
      }

      return null;
    }

    function isCrushedAgainstSolid(obj, ignoredSolid) {
      for (const solid of runtime.roomState.solids) {
        if (solid === ignoredSolid) continue;
        if (ns.rectsOverlap(obj, solid)) return true;
      }
      return false;
    }

    function carryWithMover(obj, mover, options) {
      if (!mover) return true;
      const settings = options || {};

      obj.x += mover.x - mover.oldX;
      obj.y += mover.y - mover.oldY;

      if (runtime.roomState.gravity === 1) {
        obj.y = mover.y - obj.h;
      } else {
        obj.y = mover.y + mover.h;
      }

      obj.onGround = true;

      if (settings.crushKills && isCrushedAgainstSolid(obj, mover)) {
        if (settings.isPlayer) runtime.queueDeath();
        else obj.alive = false;
        return false;
      }

      return true;
    }

    function moveAndCollide(obj, dt, options) {
      const settings = options || {};
      obj.onGround = false;

      obj.x += obj.vx * dt;
      for (const solid of runtime.roomState.solids) {
        if (!ns.rectsOverlap(obj, solid)) continue;
        if (obj.vx > 0) obj.x = solid.x - obj.w;
        else if (obj.vx < 0) obj.x = solid.x + solid.w;
        obj.vx = 0;
      }

      obj.y += obj.vy * dt;
      for (const solid of runtime.roomState.solids) {
        if (!ns.rectsOverlap(obj, solid)) continue;
        if (obj.vy > 0) {
          obj.y = solid.y - obj.h;
          if (runtime.roomState.gravity === 1) obj.onGround = true;
        } else if (obj.vy < 0) {
          obj.y = solid.y + solid.h;
          if (runtime.roomState.gravity === -1) obj.onGround = true;
        }
        obj.vy = 0;
      }

      markOutOfBounds(obj, Boolean(settings.isPlayer));
    }

    function updateMover(mover, dt) {
      mover.oldX = mover.x;
      mover.oldY = mover.y;
      mover.t += dt;
      const wave = Math.sin(mover.t * mover.speed / 60);
      if (mover.axis === "x") mover.x = mover.baseX + wave * mover.range;
      else mover.y = mover.baseY + wave * mover.range;
    }

    return {
      buildSolids: buildSolids,
      carryWithMover: carryWithMover,
      findSupportedMover: findSupportedMover,
      isCrushedAgainstSolid: isCrushedAgainstSolid,
      moveAndCollide: moveAndCollide,
      updateMover: updateMover
    };
  };
})(window.GravityLocksmith);
