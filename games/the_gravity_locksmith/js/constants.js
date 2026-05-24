window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.W = 1920;
  ns.H = 1080;
  ns.SCREEN = {
    TITLE: "title",
    PLAY: "play",
    RESPAWN: "respawn",
    WIN: "win"
  };
  ns.CONFIG = {
    world: {
      width: ns.W,
      height: ns.H,
      outOfBounds: {
        left: -120,
        right: ns.W + 120,
        top: -200,
        bottom: ns.H + 200
      }
    },
    player: {
      width: 38,
      height: 52,
      moveSpeed: 340,
      groundAcceleration: 3600,
      airAcceleration: 2150,
      groundFriction: 2550,
      airFriction: 720,
      jumpVelocity: 565,
      doubleJumpVelocity: 535,
      maxJumps: 2,
      gravityAcceleration: 1460,
      maxFallSpeed: 980,
      coyoteTime: 0.1,
      jumpBufferTime: 0.12,
      maxEnergy: 100,
      energyPerFlip: 35,
      maxDoubleJumpEnergy: 300,
      doubleJumpEnergyCost: 100,
      gravityFlipVelocityCarry: 0.35
    },
    enemy: {
      gravityAcceleration: 1260,
      maxFallSpeed: 860,
      defaultPatrolSpeed: 86,
      gravityFlipVelocityCarry: 0.2
    },
    chase: {
      startX: -180,
      baseSpeed: 68,
      rampPerSecond: 7,
      killOffset: 78
    },
    effects: {
      cameraShakeDeath: 12,
      cameraShakeFlip: 8,
      cameraShakeDecayPerSecond: 35,
      roomCompleteFlashDecayPerSecond: 2,
      roomCompleteFlashAlpha: 0.18,
      starCount: 180,
      starDriftFactor: 0.002
    },
    timing: {
      frameClamp: 0.033,
      respawnDelay: 0.38
    },
    colors: {
      player: "#55f7ff",
      playerTrail: "#ffd96a",
      death: "#ff4d6d",
      enemy: "#9c6bff",
      shard: "#ffd96a",
      exit: "#75ff9d"
    }
  };
})(window.GravityLocksmith);
