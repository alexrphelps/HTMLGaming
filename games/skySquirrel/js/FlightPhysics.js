/**
 * FlightPhysics.js - Walking, launch, wingsuit flight, crash, and restart state.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};
    const M = SkySquirrel.Math3D;

    class FlightPhysics {
        constructor(config = SkySquirrel.WorldConfig) {
            this.config = config;
            this.tuning = config.physics;
            this.state = 'walking';
            this.position = M.vec3();
            this.velocity = M.vec3();
            this.heading = config.world.spawnHeading;
            this.pitch = 0;
            this.roll = 0;
            this.launchPoint = null;
            this.collisionGrace = 0;
            this.crashTimer = 0;
            this.distance = 0;
        }

        reset(launchPoint) {
            this.state = 'walking';
            this.position = M.vec3(launchPoint.x, launchPoint.y, launchPoint.z);
            this.velocity = M.vec3(0, 0, 0);
            this.heading = launchPoint.heading;
            this.pitch = -0.04;
            this.roll = 0;
            this.launchPoint = { ...launchPoint };
            this.collisionGrace = 0;
            this.crashTimer = 0;
            this.distance = 0;
        }

        update(dt, input, terrain) {
            const safeDt = M.clamp(dt, 0, 1 / 20);
            if (input.restart && this.state === 'crashed' && this.crashTimer >= this.tuning.restartDelay) {
                this.reset(terrain.getLaunchPoint());
                return;
            }

            if (this.state === 'crashed') {
                this.crashTimer += safeDt;
                return;
            }

            if (this.state === 'walking') {
                this.updateWalking(safeDt, input, terrain);
            } else if (this.state === 'flying') {
                this.collisionGrace = Math.max(0, this.collisionGrace - safeDt);
                this.updateFlying(safeDt, input, terrain);
            }

            this.distance += M.length(this.velocity) * safeDt;
            this.resolveCollision(terrain);
        }

        updateWalking(dt, input, terrain) {
            const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
            const move = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
            this.heading += turn * this.tuning.yawRate * dt;

            const forward = M.headingVector(this.heading, 0);
            if (move !== 0) {
                this.velocity.x += forward.x * move * this.tuning.walkingSpeed * dt * 5;
                this.velocity.z += forward.z * move * this.tuning.walkingSpeed * dt * 5;
            }
            this.velocity.x *= this.tuning.walkingFriction;
            this.velocity.z *= this.tuning.walkingFriction;

            const next = M.add(this.position, M.scale(this.velocity, dt));
            const ground = terrain.getHeightAt(next.x, next.z);
            const launchPoint = this.launchPoint || terrain.getLaunchPoint();
            const offLaunch = Math.hypot(next.x - launchPoint.x, next.z - launchPoint.z) > (launchPoint.launchRadius || 120);

            this.position.x = next.x;
            this.position.z = next.z;
            this.position.y = ground + this.config.world.startPadding;
            this.velocity.y = 0;

            if (input.jump || offLaunch) {
                this.enterFlight(input.jump ? this.tuning.launchImpulse : 0);
            }
        }

        enterFlight(upImpulse) {
            const forward = M.headingVector(this.heading, -0.08);
            this.state = 'flying';
            this.pitch = -0.16;
            this.roll = 0;
            this.collisionGrace = this.tuning.launchCollisionGrace || 0;
            this.velocity = M.add(M.scale(forward, this.tuning.initialFlightSpeed), M.vec3(0, upImpulse - 18, 0));
        }

        updateFlying(dt, input, terrain) {
            const pitchInput = (input.backward ? 1 : 0) - (input.forward ? 1 : 0);
            const rollInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
            const yawInput = (input.yawRight ? 1 : 0) - (input.yawLeft ? 1 : 0);

            this.pitch = M.clamp(this.pitch + pitchInput * this.tuning.pitchRate * dt, -1.05, 0.72);
            this.roll = M.clamp(this.roll + rollInput * this.tuning.rollRate * dt, -1.25, 1.25);
            this.roll *= Math.pow(0.72, dt * 3);

            const speed = Math.max(M.length(this.velocity), 1);
            const bankTurn = Math.sin(this.roll) * this.tuning.bankTurnInfluence * M.clamp(speed / 180, 0.35, 1.6);
            this.heading += (yawInput * this.tuning.yawRate + bankTurn) * dt;

            const forward = M.headingVector(this.heading, this.pitch);
            const lift = Math.max(0, speed - this.tuning.stallSpeed) * this.tuning.lift * Math.cos(this.pitch);
            const drag = this.tuning.drag * speed;
            const dive = -Math.sin(this.pitch) * this.tuning.diveAcceleration;

            this.velocity.x += forward.x * dive * dt;
            this.velocity.z += forward.z * dive * dt;
            this.velocity.y += (-this.tuning.gravity + lift) * dt;
            this.velocity.y += Math.max(0, -this.pitch) * 7.5 * dt;
            this.velocity.x -= this.velocity.x * drag * dt;
            this.velocity.y -= this.velocity.y * drag * dt * 0.34;
            this.velocity.z -= this.velocity.z * drag * dt;

            const currentSpeed = M.length(this.velocity);
            if (currentSpeed > this.tuning.maxFlightSpeed) {
                this.velocity = M.scale(M.normalize(this.velocity), this.tuning.maxFlightSpeed);
            } else if (currentSpeed < this.tuning.minFlightSpeed) {
                this.velocity = M.add(this.velocity, M.scale(forward, (this.tuning.minFlightSpeed - currentSpeed) * dt));
            }

            this.position = M.add(this.position, M.scale(this.velocity, dt));
        }

        resolveCollision(terrain) {
            const ground = terrain.getHeightAt(this.position.x, this.position.z);
            const water = this.config.world.waterLevel;
            const radius = this.tuning.bodyRadius;

            if (this.state === 'flying' && this.position.y <= water + radius && !terrain.isInsideIsland(this.position.x, this.position.z)) {
                this.crash('water', water + radius);
                return;
            }

            if (this.position.y <= ground + radius && this.collisionGrace <= 0) {
                if (this.state === 'walking') {
                    this.position.y = ground + this.config.world.startPadding;
                    this.velocity.y = 0;
                    return;
                }
                this.crash(terrain.getSurfaceType(this.position.x, this.position.z), ground + radius);
            }
        }

        crash(surface, safeHeight) {
            this.state = 'crashed';
            this.position.y = safeHeight;
            this.velocity = M.scale(this.velocity, 0.08);
            this.crashSurface = surface;
            this.crashTimer = 0;
        }

        getForwardVector() {
            return M.headingVector(this.heading, this.pitch);
        }

        getState() {
            return {
                mode: this.state,
                position: { ...this.position },
                velocity: { ...this.velocity },
                heading: this.heading,
                pitch: this.pitch,
                roll: this.roll,
                crashSurface: this.crashSurface || null
            };
        }

        getTelemetry() {
            const speed = M.length(this.velocity);
            return {
                speed,
                speedKmh: speed * 3.6,
                altitude: this.position.y - this.config.world.waterLevel,
                verticalSpeed: this.velocity.y,
                distance: this.distance,
                mode: this.state
            };
        }
    }

    SkySquirrel.FlightPhysics = FlightPhysics;
}());
