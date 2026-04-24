/**
 * Physics.js - Simple physics system for gravity and collision detection
 * Handles gravity, ground collision, and basic physics calculations
 */

class SkySquirrelPhysics {
    constructor() {
        this.gravity = -9.81; // m/s²
        this.groundLevel = 0;
        this.waterLevel = 0;
        this.terrain = null;
    }

    init() {
        console.log('Physics system initialized');
    }

    setTerrain(terrain) {
        this.terrain = terrain;
        if (terrain) {
            this.waterLevel = terrain.waterLevel;
        }
    }

    /**
     * Apply gravity to velocity
     * @param {THREE.Vector3} velocity - Current velocity
     * @param {number} deltaTime - Time step
     * @param {boolean} isFlying - Whether player is in flight mode
     */
    applyGravity(velocity, deltaTime, isFlying = false) {
        const gravityMultiplier = isFlying ? 0.3 : 1.0; // Reduced gravity when flying
        velocity.y += this.gravity * gravityMultiplier * deltaTime;
    }

    /**
     * Check if position is on ground
     * @param {THREE.Vector3} position - Position to check
     * @returns {boolean} True if on ground
     */
    isOnGround(position) {
        if (!this.terrain) return position.y <= this.groundLevel;
        
        const groundHeight = this.terrain.getHeightAt(position.x, position.z);
        return position.y <= groundHeight + 0.1; // Small tolerance
    }

    isInWater(position) {
        return position.y <= this.waterLevel;
    }

    /**
     * Get ground height at position
     * @param {number} x - X coordinate
     * @param {number} z - Z coordinate
     * @returns {number} Ground height
     */
    getGroundHeight(x, z) {
        if (!this.terrain) return this.groundLevel;
        return this.terrain.getHeightAt(x, z);
    }

    /**
     * Handle collision with terrain
     * @param {THREE.Vector3} position - Current position
     * @param {THREE.Vector3} velocity - Current velocity
     * @param {number} radius - Collision radius
     * @returns {Object} {position, velocity, onGround}
     */
    handleCollision(position, velocity, radius = 0.5) {
        const result = {
            position: position.clone(),
            velocity: velocity.clone(),
            onGround: false
        };

        if (!this.terrain) {
            // Simple ground collision
            if (position.y <= this.groundLevel + radius) {
                result.position.y = this.groundLevel + radius;
                result.velocity.y = Math.max(0, velocity.y); // Stop downward velocity
                result.onGround = true;
            }
            return result;
        }

        // Terrain collision
        const groundHeight = this.terrain.getHeightAt(position.x, position.z);
        
        if (position.y <= groundHeight + radius) {
            result.position.y = groundHeight + radius;
            result.velocity.y = Math.max(0, velocity.y);
            result.onGround = true;
        }

        return result;
    }

    /**
     * Calculate air resistance for flight
     * @param {THREE.Vector3} velocity - Current velocity
     * @param {number} deltaTime - Time step
     * @returns {THREE.Vector3} Air resistance force
     */
    calculateAirResistance(velocity, deltaTime) {
        const airResistance = 0.98; // Air resistance coefficient
        const resistance = velocity.clone().multiplyScalar(1 - airResistance);
        return resistance;
    }

    /**
     * Update physics (called each frame)
     * @param {number} deltaTime - Time step
     */
    update(deltaTime) {
        // Physics update logic can be added here
        // For now, this is handled by individual objects
    }

    /**
     * Get physics constants
     * @returns {Object} Physics constants
     */
    getConstants() {
        return {
            gravity: this.gravity,
            groundLevel: this.groundLevel
        };
    }
}
