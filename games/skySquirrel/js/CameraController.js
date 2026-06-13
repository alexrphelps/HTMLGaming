/**
 * CameraController.js - Terrain-aware chase camera.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};
    const M = SkySquirrel.Math3D;

    class CameraController {
        constructor(config = SkySquirrel.WorldConfig) {
            this.config = config;
            this.position = M.vec3(0, 0, 0);
            this.target = M.vec3(0, 0, 0);
        }

        reset(playerState) {
            this.position = M.add(playerState.position, M.vec3(0, this.config.camera.walkingHeight, this.config.camera.walkingDistance));
            this.target = { ...playerState.position };
        }

        update(dt, playerState, terrain) {
            const cam = this.config.camera;
            const speed = playerState.velocity ? M.length(playerState.velocity) : 0;
            const velocityForward = speed > 8 ? M.normalize(playerState.velocity) : null;
            const forward = velocityForward || M.headingVector(playerState.heading, playerState.pitch || 0);
            const mode = playerState.mode;
            const speedPullback = mode === 'flying' ? M.clamp(speed / 320, 0, 1) * (cam.highSpeedExtraDistance || 0) : 0;
            const distance = mode === 'flying' ? cam.flightDistance + speedPullback : mode === 'crashed' ? cam.crashedDistance : cam.walkingDistance;
            const height = mode === 'flying' ? cam.flightHeight : mode === 'crashed' ? cam.crashedHeight : cam.walkingHeight;
            const lookHeight = mode === 'flying' ? 9 : 6;
            const desired = M.add(playerState.position, M.add(M.scale(forward, -distance), M.vec3(0, height, 0)));
            const ground = terrain.getHeightAt(desired.x, desired.z);
            desired.y = Math.max(desired.y, ground + cam.terrainClearance);
            const t = 1 - Math.pow(1 - cam.smoothness, Math.max(1, dt * 60));
            this.position = M.lerpVec(this.position, desired, t);
            const currentGround = terrain.getHeightAt(this.position.x, this.position.z);
            this.position.y = Math.max(this.position.y, currentGround + cam.terrainClearance);
            const lookAhead = mode === 'flying' ? M.scale(forward, cam.lookAheadDistance || 0) : M.vec3(0, 0, 0);
            this.target = M.lerpVec(this.target, M.add(playerState.position, M.add(lookAhead, M.vec3(0, lookHeight, 0))), t);
        }

        getViewMatrix() {
            return M.lookAt(this.position, this.target, M.vec3(0, 1, 0));
        }
    }

    SkySquirrel.CameraController = CameraController;
}());
