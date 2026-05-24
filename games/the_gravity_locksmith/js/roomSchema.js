window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  function assertFiniteNumber(value, label) {
    if (!Number.isFinite(value)) {
      throw new Error(label + " must be a finite number");
    }
  }

  function normalizeRect(rect, label) {
    if (!rect || typeof rect !== "object") {
      throw new Error(label + " is required");
    }
    const normalized = {
      x: Number(rect.x),
      y: Number(rect.y),
      w: Number(rect.w),
      h: Number(rect.h)
    };
    assertFiniteNumber(normalized.x, label + ".x");
    assertFiniteNumber(normalized.y, label + ".y");
    assertFiniteNumber(normalized.w, label + ".w");
    assertFiniteNumber(normalized.h, label + ".h");
    if (normalized.w <= 0 || normalized.h <= 0) {
      throw new Error(label + " must have positive width and height");
    }
    return normalized;
  }

  function normalizePoint(point, label) {
    if (!point || typeof point !== "object") {
      throw new Error(label + " is required");
    }
    const normalized = {
      x: Number(point.x),
      y: Number(point.y)
    };
    assertFiniteNumber(normalized.x, label + ".x");
    assertFiniteNumber(normalized.y, label + ".y");
    return normalized;
  }

  function normalizeArray(items, label, mapFn) {
    if (items == null) return [];
    if (!Array.isArray(items)) {
      throw new Error(label + " must be an array");
    }
    return items.map(mapFn);
  }

  function normalizeOptionalNumber(value, label, fallback) {
    if (value == null) return fallback;
    const normalized = Number(value);
    assertFiniteNumber(normalized, label);
    return normalized;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function moveItemOutsidePlatforms(item, platforms, size) {
    const adjusted = Object.assign({}, item);
    let itemRect = { x: adjusted.x, y: adjusted.y, w: size, h: size };

    for (const platform of platforms) {
      if (!rectsOverlap(itemRect, platform)) continue;

      const itemCenterY = itemRect.y + itemRect.h / 2;
      const platformCenterY = platform.y + platform.h / 2;
      adjusted.y = itemCenterY <= platformCenterY
        ? platform.y - size - 8
        : platform.y + platform.h + 8;
      itemRect = { x: adjusted.x, y: adjusted.y, w: size, h: size };
    }

    return adjusted;
  }

  function moveItemsOutsidePlatforms(items, platforms, size) {
    return items.map(function(item) {
      return moveItemOutsidePlatforms(item, platforms, size);
    });
  }

  function normalizeChase(chase, index) {
    if (chase == null || chase === false) return false;
    if (chase === true) return true;
    if (typeof chase !== "object") {
      throw new Error("room[" + index + "].chase must be a boolean or object");
    }
    return {
      startX: normalizeOptionalNumber(chase.startX, "room[" + index + "].chase.startX", null),
      baseSpeed: normalizeOptionalNumber(chase.baseSpeed, "room[" + index + "].chase.baseSpeed", null),
      rampPerSecond: normalizeOptionalNumber(chase.rampPerSecond, "room[" + index + "].chase.rampPerSecond", null),
      killOffset: normalizeOptionalNumber(chase.killOffset, "room[" + index + "].chase.killOffset", null)
    };
  }

  ns.normalizeRoomDefinition = function(room, index) {
    if (!room || typeof room !== "object") {
      throw new Error("Room " + index + " must be an object");
    }

    const normalizedRoom = {
      id: room.id || "room-" + index,
      name: String(room.name || "Room " + (index + 1)),
      tip: String(room.tip || ""),
      chase: normalizeChase(room.chase, index),
      parTime: normalizeOptionalNumber(room.parTime, "room[" + index + "].parTime", null),
      parFlips: normalizeOptionalNumber(room.parFlips, "room[" + index + "].parFlips", null),
      parDeaths: normalizeOptionalNumber(room.parDeaths, "room[" + index + "].parDeaths", 0),
      spawn: normalizePoint(room.spawn, "room[" + index + "].spawn"),
      exit: normalizeRect(room.exit, "room[" + index + "].exit"),
      platforms: normalizeArray(room.platforms, "room[" + index + "].platforms", function(platform, platformIndex) {
        return normalizeRect(platform, "room[" + index + "].platforms[" + platformIndex + "]");
      }),
      shards: normalizeArray(room.shards, "room[" + index + "].shards", function(shard, shardIndex) {
        return normalizePoint(shard, "room[" + index + "].shards[" + shardIndex + "]");
      }),
      spikes: normalizeArray(room.spikes, "room[" + index + "].spikes", function(spike, spikeIndex) {
        const normalizedSpike = normalizeRect(spike, "room[" + index + "].spikes[" + spikeIndex + "]");
        normalizedSpike.dir = Number(spike.dir);
        if (normalizedSpike.dir !== 1 && normalizedSpike.dir !== -1) {
          throw new Error("room[" + index + "].spikes[" + spikeIndex + "].dir must be 1 or -1");
        }
        return normalizedSpike;
      }),
      enemies: normalizeArray(room.enemies, "room[" + index + "].enemies", function(enemy, enemyIndex) {
        const normalizedEnemy = normalizeRect(enemy, "room[" + index + "].enemies[" + enemyIndex + "]");
        normalizedEnemy.type = enemy.type || "patrol";
        if (normalizedEnemy.type !== "patrol" && normalizedEnemy.type !== "hunter") {
          throw new Error("room[" + index + "].enemies[" + enemyIndex + "].type must be patrol or hunter");
        }
        normalizedEnemy.axis = enemy.axis || "x";
        if (normalizedEnemy.axis !== "x" && normalizedEnemy.axis !== "y") {
          throw new Error("room[" + index + "].enemies[" + enemyIndex + "].axis must be x or y");
        }
        normalizedEnemy.vx = Number(enemy.vx == null ? 0 : enemy.vx);
        normalizedEnemy.vy = Number(enemy.vy == null ? 0 : enemy.vy);
        normalizedEnemy.speed = normalizeOptionalNumber(enemy.speed, "room[" + index + "].enemies[" + enemyIndex + "].speed", 86);
        assertFiniteNumber(normalizedEnemy.vx, "room[" + index + "].enemies[" + enemyIndex + "].vx");
        assertFiniteNumber(normalizedEnemy.vy, "room[" + index + "].enemies[" + enemyIndex + "].vy");
        return normalizedEnemy;
      }),
      movers: normalizeArray(room.movers, "room[" + index + "].movers", function(mover, moverIndex) {
        const normalizedMover = normalizeRect(mover, "room[" + index + "].movers[" + moverIndex + "]");
        normalizedMover.axis = mover.axis;
        normalizedMover.range = Number(mover.range);
        normalizedMover.speed = Number(mover.speed);
        if (normalizedMover.axis !== "x" && normalizedMover.axis !== "y") {
          throw new Error("room[" + index + "].movers[" + moverIndex + "].axis must be x or y");
        }
        assertFiniteNumber(normalizedMover.range, "room[" + index + "].movers[" + moverIndex + "].range");
        assertFiniteNumber(normalizedMover.speed, "room[" + index + "].movers[" + moverIndex + "].speed");
        return normalizedMover;
      }),
      flipBatteries: normalizeArray(room.flipBatteries, "room[" + index + "].flipBatteries", function(battery, batteryIndex) {
        const normalizedBattery = normalizePoint(battery, "room[" + index + "].flipBatteries[" + batteryIndex + "]");
        normalizedBattery.amount = normalizeOptionalNumber(battery.amount, "room[" + index + "].flipBatteries[" + batteryIndex + "].amount", 45);
        return normalizedBattery;
      }),
      jumpBatteries: normalizeArray(room.jumpBatteries, "room[" + index + "].jumpBatteries", function(battery, batteryIndex) {
        const normalizedBattery = normalizePoint(battery, "room[" + index + "].jumpBatteries[" + batteryIndex + "]");
        normalizedBattery.amount = normalizeOptionalNumber(battery.amount, "room[" + index + "].jumpBatteries[" + batteryIndex + "].amount", 100);
        return normalizedBattery;
      }),
      locks: normalizeArray(room.locks, "room[" + index + "].locks", function(lock, lockIndex) {
        if (!lock || typeof lock !== "object") {
          throw new Error("room[" + index + "].locks[" + lockIndex + "] must be an object");
        }
        return {
          id: String(lock.id || "lock-" + lockIndex),
          shards: normalizeOptionalNumber(lock.shards, "room[" + index + "].locks[" + lockIndex + "].shards", 0)
        };
      }),
      gates: normalizeArray(room.gates, "room[" + index + "].gates", function(gate, gateIndex) {
        const normalizedGate = normalizeRect(gate, "room[" + index + "].gates[" + gateIndex + "]");
        normalizedGate.id = String(gate.id || "gate-" + gateIndex);
        normalizedGate.shards = normalizeOptionalNumber(gate.shards, "room[" + index + "].gates[" + gateIndex + "].shards", 0);
        normalizedGate.lockId = gate.lockId == null ? null : String(gate.lockId);
        return normalizedGate;
      }),
      hazards: normalizeArray(room.hazards, "room[" + index + "].hazards", function(hazard, hazardIndex) {
        const normalizedHazard = normalizeRect(hazard, "room[" + index + "].hazards[" + hazardIndex + "]");
        normalizedHazard.type = hazard.type || "sentry";
        if (normalizedHazard.type !== "sentry") {
          throw new Error("room[" + index + "].hazards[" + hazardIndex + "].type must be sentry");
        }
        normalizedHazard.axis = hazard.axis || "x";
        if (normalizedHazard.axis !== "x" && normalizedHazard.axis !== "y") {
          throw new Error("room[" + index + "].hazards[" + hazardIndex + "].axis must be x or y");
        }
        normalizedHazard.length = normalizeOptionalNumber(hazard.length, "room[" + index + "].hazards[" + hazardIndex + "].length", 360);
        normalizedHazard.thickness = normalizeOptionalNumber(hazard.thickness, "room[" + index + "].hazards[" + hazardIndex + "].thickness", 18);
        normalizedHazard.period = normalizeOptionalNumber(hazard.period, "room[" + index + "].hazards[" + hazardIndex + "].period", 2.2);
        normalizedHazard.activeTime = normalizeOptionalNumber(hazard.activeTime, "room[" + index + "].hazards[" + hazardIndex + "].activeTime", 1.05);
        normalizedHazard.phase = normalizeOptionalNumber(hazard.phase, "room[" + index + "].hazards[" + hazardIndex + "].phase", 0);
        normalizedHazard.dir = normalizeOptionalNumber(hazard.dir, "room[" + index + "].hazards[" + hazardIndex + "].dir", 1);
        if (normalizedHazard.dir !== 1 && normalizedHazard.dir !== -1) {
          throw new Error("room[" + index + "].hazards[" + hazardIndex + "].dir must be 1 or -1");
        }
        return normalizedHazard;
      })
    };

    normalizedRoom.shards = moveItemsOutsidePlatforms(normalizedRoom.shards, normalizedRoom.platforms, 32);
    normalizedRoom.flipBatteries = moveItemsOutsidePlatforms(normalizedRoom.flipBatteries, normalizedRoom.platforms, 34);
    normalizedRoom.jumpBatteries = moveItemsOutsidePlatforms(normalizedRoom.jumpBatteries, normalizedRoom.platforms, 34);

    return normalizedRoom;
  };

  ns.validateAndNormalizeRooms = function(roomDefinitions) {
    if (!Array.isArray(roomDefinitions) || roomDefinitions.length === 0) {
      throw new Error("At least one room definition is required");
    }
    return roomDefinitions.map(function(room, index) {
      return ns.normalizeRoomDefinition(room, index);
    });
  };
})(window.GravityLocksmith);
