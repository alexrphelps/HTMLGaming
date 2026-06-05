(function() {
  "use strict";

  const ns = window.StormlineRunner;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  class RunnerPlayer {
    constructor() {
      const config = ns.CONFIG.player;
      this.x = ns.CONFIG.world.startX;
      this.y = ns.CONFIG.world.startY;
      this.w = config.width;
      this.h = config.height;
      this.vx = 0;
      this.vy = 0;
      this.facing = 1;
      this.grounded = false;
      this.wallDir = 0;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.dashTimer = 0;
      this.dashCooldown = 0;
      this.invulnTimer = 0;
      this.health = config.maxHealth;
      this.battery = config.maxBattery;
      this.maxBattery = config.maxBattery;
      this.lastSafeX = this.x;
      this.lastSafeY = this.y;
      this.standingPlatform = null;
      this.runTime = 0;
    }

    reset() {
      const fresh = new RunnerPlayer();
      Object.assign(this, fresh);
    }

    getRect() {
      return {
        x: this.x,
        y: this.y,
        w: this.w,
        h: this.h
      };
    }

    addBattery(amount) {
      this.battery = clamp(this.battery + amount, 0, this.maxBattery);
    }

    heal(amount) {
      this.health = clamp(this.health + amount, 0, ns.CONFIG.player.maxHealth);
    }

    damage(amount) {
      if (this.invulnTimer > 0) return false;
      this.health = Math.max(0, this.health - amount);
      this.invulnTimer = ns.CONFIG.player.invulnTime;
      this.vy = Math.min(this.vy, -260);
      this.vx *= 0.72;
      return true;
    }

    update(dt, actions, world, talents, weather) {
      const config = ns.CONFIG.player;
      this.runTime += dt;
      this.maxBattery = config.maxBattery + talents.getMaxBatteryBonus();
      this.battery = Math.min(this.battery, this.maxBattery);

      if (actions.jumpPressed) this.jumpBufferTimer = config.jumpBuffer;
      this.coyoteTimer = this.grounded ? config.coyoteTime : Math.max(0, this.coyoteTimer - dt);
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      this.dashCooldown = Math.max(0, this.dashCooldown - dt);
      this.invulnTimer = Math.max(0, this.invulnTimer - dt);

      const inputAxis = (actions.right ? 1 : 0) - (actions.left ? 1 : 0);
      if (inputAxis !== 0) this.facing = inputAxis;

      this.handleJump(actions, config);
      this.handleDash(actions, talents, weather, config);
      this.applyMovement(dt, inputAxis, world, talents, weather, config);
      this.applyBattery(dt, talents, weather, config);
      this.applyRecovery(dt, talents, weather);

      if (this.y > ns.CONFIG.world.floorY + 260) {
        this.damage(28);
        this.battery = Math.max(0, this.battery - 12);
        this.x = Math.max(ns.CONFIG.world.startX, this.lastSafeX - 70);
        this.y = this.lastSafeY - 120;
        this.vy = -260;
      }
    }

    handleJump(actions, config) {
      if (this.jumpBufferTimer <= 0) return;
      if (this.coyoteTimer > 0) {
        this.vy = -config.jumpSpeed;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
      } else if (this.wallDir !== 0) {
        this.vx = -this.wallDir * config.wallJumpX;
        this.vy = -config.wallJumpY;
        this.facing = -this.wallDir;
        this.wallDir = 0;
        this.jumpBufferTimer = 0;
      }
      if (!actions.jumpHeld && this.vy < -280) {
        this.vy = -280;
      }
    }

    handleDash(actions, talents, weather, config) {
      if (this.dashTimer > 0) return;
      if (!actions.dashPressed || this.dashCooldown > 0) return;
      const cost = config.dashBatteryCost * talents.getDashCostMultiplier(weather);
      if (this.battery < cost) return;
      this.battery -= cost;
      this.dashTimer = config.dashDuration + talents.getDashDurationBonus(weather);
      this.dashCooldown = config.dashCooldown;
      this.vx = this.facing * config.dashSpeed;
      this.vy *= 0.35;
    }

    applyMovement(dt, inputAxis, world, talents, weather, config) {
      const gravity = ns.CONFIG.world.gravity * weather.gravityMultiplier;
      const ramp = Math.min(config.maxSpeedBonus, Math.max(0, this.x / 10) * config.speedRampPerMeter);
      const talentSpeed = talents.getSpeedBonus(weather);
      const targetSpeed = inputAxis * (config.maxRunSpeed + ramp + talentSpeed);
      const accel = this.grounded ? config.inputAccel : config.airAccel;

      if (this.dashTimer > 0) {
        this.dashTimer = Math.max(0, this.dashTimer - dt);
      } else {
        if (inputAxis !== 0) {
          this.vx += clamp(targetSpeed - this.vx, -accel * dt, accel * dt);
        } else if (this.grounded) {
          this.vx += clamp(0 - this.vx, -config.friction * dt, config.friction * dt);
        } else {
          this.vx += clamp(0 - this.vx, -config.airAccel * 0.16 * dt, config.airAccel * 0.16 * dt);
        }
        this.vy = Math.min(ns.CONFIG.world.maxFallSpeed, this.vy + gravity * dt);
      }

      if (this.wallDir !== 0 && !this.grounded && this.vy > config.wallSlideSpeed) {
        this.vy = config.wallSlideSpeed;
        this.addBattery(talents.getWallBatteryGain(weather) * dt);
      }

      this.moveAndCollide(dt, world);

      if (this.standingPlatform && this.standingPlatform.rail) {
        this.vx += talents.getRailSpeedBonus(weather) * dt;
        this.addBattery(talents.getRailBatteryGain(weather) * dt);
      }
    }

    moveAndCollide(dt, world) {
      this.grounded = false;
      this.wallDir = 0;
      this.standingPlatform = null;

      this.x += this.vx * dt;
      this.resolveCollisions(world.getSolids(), "x");

      this.y += this.vy * dt;
      this.resolveCollisions(world.getSolids(), "y");

      if (this.grounded) {
        this.lastSafeX = this.x;
        this.lastSafeY = this.y;
      }
    }

    resolveCollisions(solids, axis) {
      const rect = this.getRect();
      for (let i = 0; i < solids.length; i++) {
        const solid = solids[i];
        if (!ns.rectsOverlap(rect, solid)) continue;

        if (axis === "x") {
          if (this.vx > 0) {
            this.x = solid.x - this.w;
            this.wallDir = 1;
          } else if (this.vx < 0) {
            this.x = solid.x + solid.w;
            this.wallDir = -1;
          }
          this.vx *= solid.type === "wall" ? -0.08 : 0;
          rect.x = this.x;
        } else {
          if (this.vy > 0) {
            this.y = solid.y - this.h;
            this.grounded = true;
            this.standingPlatform = solid;
          } else if (this.vy < 0) {
            this.y = solid.y + solid.h;
          }
          this.vy = 0;
          rect.y = this.y;
        }
      }
    }

    applyBattery(dt, talents, weather, config) {
      const drain = Math.max(0.35, config.baseBatteryDrain + weather.batteryDrain);
      this.battery = Math.max(0, this.battery - drain * talents.getBatteryDrainMultiplier(weather) * dt);
      if (this.dashTimer > 0) {
        this.battery = Math.max(0, this.battery - 2.1 * dt);
      }
    }

    applyRecovery(dt, talents, weather) {
      const calmHeal = talents.getCalmHealPerSecond(weather);
      if (calmHeal > 0 && this.battery > this.maxBattery * 0.36) {
        this.heal(calmHeal * dt);
      }
    }

    isDead() {
      return this.health <= 0 || this.battery <= 0;
    }
  }

  ns.RunnerPlayer = RunnerPlayer;
})();
