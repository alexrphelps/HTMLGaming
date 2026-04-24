/**
 * CameraController.js - Orbit camera that can move independently around the player
 * Provides free camera movement with mouse controls
 */

class SkySquirrelCameraController {
    constructor(camera, player) {
        this.camera = camera;
        this.player = player;
        
        // Orbit camera settings
        this.distance = 8.0;
        this.minDistance = 2.0;
        this.maxDistance = 20.0;
        this.height = 3.0;
        this.smoothness = 0.1;
        
        // Camera state
        this.targetPosition = new THREE.Vector3();
        this.currentPosition = new THREE.Vector3();
        this.lookAtTarget = new THREE.Vector3();
        
        // Orbit angles (independent of player rotation)
        this.orbitYaw = 0;      // Horizontal orbit around player
        this.orbitPitch = 0.3;  // Vertical orbit angle
        this.targetYaw = 0;
        this.targetPitch = 0.3;
        
        // Mouse controls
        this.mouseSensitivity = 0.003;
        this.maxPitch = Math.PI / 2 - 0.1;
        this.minPitch = -Math.PI / 2 + 0.1;
        
        // Camera modes
        this.mode = 'orbit'; // 'orbit', 'cinematic'
        this.autoRotate = false;
        this.rotationSpeed = 0.5;
    }

    init() {
        // Set initial camera position
        this.updateTargetPosition();
        this.currentPosition.copy(this.targetPosition);
        this.camera.position.copy(this.currentPosition);
        
        console.log('Camera controller initialized');
    }

    update(deltaTime) {
        this.updateTargetPosition();
        this.updateCameraPosition(deltaTime);
        this.updateCameraLookAt();
    }

    updateTargetPosition() {
        const playerPos = this.player.getPosition();
        
        // Smooth orbit angle interpolation
        this.orbitYaw += (this.targetYaw - this.orbitYaw) * this.smoothness * 5;
        this.orbitPitch += (this.targetPitch - this.orbitPitch) * this.smoothness * 5;
        
        // Calculate camera position using orbit angles
        const offset = new THREE.Vector3();
        
        // Calculate horizontal and vertical offsets based on orbit angles
        offset.x = Math.sin(this.orbitYaw) * Math.cos(this.orbitPitch) * this.distance;
        offset.y = Math.sin(this.orbitPitch) * this.distance + this.height;
        offset.z = Math.cos(this.orbitYaw) * Math.cos(this.orbitPitch) * this.distance;
        
        // Position camera relative to player
        this.targetPosition.copy(playerPos).add(offset);
    }


    updateCameraPosition(deltaTime) {
        // Smooth interpolation to target position
        this.currentPosition.lerp(this.targetPosition, this.smoothness);
        
        // Handle camera collision with terrain
        this.handleCameraCollision();
        
        // Set camera position
        this.camera.position.copy(this.currentPosition);
    }

    updateCameraLookAt() {
        const playerPos = this.player.getPosition();
        
        // Always look at the player's center
        this.lookAtTarget.copy(playerPos);
        this.lookAtTarget.y += 1; // Look at player's center
        
        this.camera.lookAt(this.lookAtTarget);
    }

    handleCameraCollision() {
        // Simple camera collision with terrain
        // This could be enhanced with proper raycasting
        const playerPos = this.player.getPosition();
        const cameraPos = this.currentPosition;
        
        // Check if camera is too close to player
        const distanceToPlayer = cameraPos.distanceTo(playerPos);
        if (distanceToPlayer < 2.0) {
            // Move camera away from player
            const direction = cameraPos.clone().sub(playerPos).normalize();
            cameraPos.copy(playerPos).add(direction.multiplyScalar(2.0));
        }
        
        // Check if camera is below ground level
        if (cameraPos.y < 1.0) {
            cameraPos.y = 1.0;
        }
    }

    handleMouseInput(mouseX, mouseY) {
        // Update orbit angles based on mouse input
        this.targetYaw -= mouseX * this.mouseSensitivity;
        this.targetPitch -= mouseY * this.mouseSensitivity;
        
        // Clamp pitch to prevent camera from going too high/low
        this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch));
    }

    // Method to be called by the game with mouse input
    updateMouseInput(mouseX, mouseY) {
        this.handleMouseInput(mouseX, mouseY);
    }

    // Handle scroll wheel for zoom
    handleScroll(deltaY) {
        const zoomSpeed = 0.5;
        this.distance += deltaY * zoomSpeed;
        this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
    }

    setMode(mode) {
        this.mode = mode;
    }

    setDistance(distance) {
        this.distance = distance;
    }

    setHeight(height) {
        this.height = height;
    }

    setSmoothness(smoothness) {
        this.smoothness = smoothness;
    }

    getPosition() {
        return this.camera.position.clone();
    }

    getTargetPosition() {
        return this.targetPosition.clone();
    }

    // Cinematic camera methods for future use
    startCinematicMode() {
        this.mode = 'cinematic';
        this.autoRotate = true;
    }

    stopCinematicMode() {
        this.mode = 'follow';
        this.autoRotate = false;
    }

    // Camera shake effect for impacts
    shake(intensity = 1.0, duration = 0.5) {
        // Simple camera shake implementation
        const originalPosition = this.camera.position.clone();
        const shakeAmount = intensity * 0.1;
        
        const shakeInterval = setInterval(() => {
            this.camera.position.x += (Math.random() - 0.5) * shakeAmount;
            this.camera.position.y += (Math.random() - 0.5) * shakeAmount;
            this.camera.position.z += (Math.random() - 0.5) * shakeAmount;
        }, 16);
        
        setTimeout(() => {
            clearInterval(shakeInterval);
            this.camera.position.copy(originalPosition);
        }, duration * 1000);
    }
}
