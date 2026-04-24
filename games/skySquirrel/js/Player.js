/**
 * Player.js - Player logic with walking, jumping, and wingsuit physics
 * Manages player state machine, movement, and physics interactions
 */

class SkySquirrelPlayer {
    constructor(physics) {
        this.physics = physics;
        this.mesh = null;
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0);
        
        // Player states
        this.mode = 'walking'; // 'walking', 'jumping', 'flying'
        this.onGround = false;
        this.jumpCooldown = 0;
        
        // Movement constants
        this.walkSpeed = 5.0;
        this.jumpForce = 8.0;
        this.airControl = 0.3;
        this.maxSpeed = 15.0;
        
        // Flight constants
        this.glideSpeed = 12.0;
        this.pitchSpeed = 3.0; // Increased for more responsive pitch control
        this.rollSpeed = 4.0; // Increased for more responsive roll control
        this.yawSpeed = 2.5; // Added yaw control for better steering
        this.minFlightSpeed = 8.0;
        // Removed all rotation limits for unlimited movement
        
        // Input state
        this.inputState = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            rollLeft: false,  // Q key
            rollRight: false  // E key
        };
    }

    async init() {
        // Create player mesh (simple capsule for now)
        this.createMesh();
        console.log('Player initialized');
    }

    createMesh() {
        // Create a group to hold all player parts
        this.mesh = new THREE.Group();
        
        // Create body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4444ff,
            transparent: true,
            opacity: 0.8
        });
        this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.bodyMesh.castShadow = true;
        this.bodyMesh.receiveShadow = true;
        this.bodyMesh.position.y = 0.4; // Position body above ground
        this.mesh.add(this.bodyMesh);
        
        // Create yellow ball head
        const headGeometry = new THREE.SphereGeometry(0.2, 8, 6);
        const headMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xFFFF00, // Bright yellow
            transparent: true,
            opacity: 0.9
        });
        this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
        this.headMesh.castShadow = true;
        this.headMesh.receiveShadow = true;
        this.headMesh.position.y = 1.0; // Position head on top of body
        this.mesh.add(this.headMesh);
        
        // Add a simple wingsuit indicator when flying
        this.wingsuitMesh = this.createWingsuitMesh();
        this.mesh.add(this.wingsuitMesh);
        this.wingsuitMesh.visible = false;
        
        // Set up the main mesh properties
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
    }

    createWingsuitMesh() {
        // Create a group for the wingsuit
        const wingsuitGroup = new THREE.Group();
        
        // Main wing surface
        const wingGeometry = new THREE.PlaneGeometry(2.2, 0.9);
        const wingMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff4444,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const mainWing = new THREE.Mesh(wingGeometry, wingMaterial);
        mainWing.position.set(0, 0.2, 0);
        mainWing.rotation.set(0, 0, 0);
        wingsuitGroup.add(mainWing);
        
        // Add wing tips for better visibility
        const tipGeometry = new THREE.SphereGeometry(0.1, 6, 4);
        const tipMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xff6666,
            transparent: true,
            opacity: 0.8
        });
        
        const leftTip = new THREE.Mesh(tipGeometry, tipMaterial);
        leftTip.position.set(-1.1, 0.2, 0);
        wingsuitGroup.add(leftTip);
        
        const rightTip = new THREE.Mesh(tipGeometry, tipMaterial);
        rightTip.position.set(1.1, 0.2, 0);
        wingsuitGroup.add(rightTip);
        
        return wingsuitGroup;
    }

    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.copy(this.position);
        }
    }

    handleInput(input) {
        this.inputState = { ...this.inputState, ...input };
    }

    update(deltaTime) {
        // Update jump cooldown
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }

        // Handle input
        this.processInput(deltaTime);

        // Apply physics
        this.updatePhysics(deltaTime);

        // Update mesh position and rotation
        this.updateMesh();

        // Update mode based on state
        this.updateMode();
    }

    processInput(deltaTime) {
        const moveVector = new THREE.Vector3();
        
        // Calculate movement direction
        if (this.inputState.forward) moveVector.z -= 1;
        if (this.inputState.backward) moveVector.z += 1;
        if (this.inputState.left) moveVector.x -= 1;
        if (this.inputState.right) moveVector.x += 1;

        // Normalize movement vector
        if (moveVector.length() > 0) {
            moveVector.normalize();
        }

        // Apply movement based on mode
        if (this.mode === 'walking') {
            this.handleWalkingMovement(moveVector, deltaTime);
        } else if (this.mode === 'flying') {
            this.handleFlyingMovement(moveVector, deltaTime);
        }

        // Handle jumping
        if (this.inputState.jump && this.jumpCooldown <= 0) {
            this.handleJump();
        }

        // Handle mouse look
        this.handleMouseLook(deltaTime);
    }

    handleWalkingMovement(moveVector, deltaTime) {
        if (moveVector.length() > 0) {
            // Apply movement in world space
            const worldMove = moveVector.clone();
            worldMove.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
            
            // Apply movement speed
            worldMove.multiplyScalar(this.walkSpeed * deltaTime);
            
            // Add to velocity
            this.velocity.x += worldMove.x;
            this.velocity.z += worldMove.z;
            
            // Apply friction
            this.velocity.x *= 0.8;
            this.velocity.z *= 0.8;
            
            // Rotate player to face movement direction
            if (moveVector.length() > 0) {
                const targetRotation = Math.atan2(moveVector.x, moveVector.z);
                this.rotation.y = this.lerp(this.rotation.y, targetRotation, 0.1);
            }
        } else {
            // Apply friction when not moving
            this.velocity.x *= 0.7;
            this.velocity.z *= 0.7;
        }
    }

    handleFlyingMovement(moveVector, deltaTime) {
        // Forward/backward controls pitch (nose up/down) - relative to current facing direction
        if (this.inputState.forward) {
            this.applyPitchRotation(-this.pitchSpeed * deltaTime);
        }
        if (this.inputState.backward) {
            this.applyPitchRotation(this.pitchSpeed * deltaTime);
        }

        // A/D controls roll (banking left/right) - relative to current facing direction
        if (this.inputState.left) {
            this.applyRollRotation(-this.rollSpeed * deltaTime);
        }
        if (this.inputState.right) {
            this.applyRollRotation(this.rollSpeed * deltaTime);
        }

        // Q/E controls yaw (turning left/right) - relative to current facing direction
        if (this.inputState.rollLeft) {
            this.applyYawRotation(-this.yawSpeed * deltaTime);
        }
        if (this.inputState.rollRight) {
            this.applyYawRotation(this.yawSpeed * deltaTime);
        }

        // No limits - allow unlimited movement in all directions
        // this.rotation.x = this.clamp(this.rotation.x, -this.maxPitchAngle, this.maxPitchAngle);
        // this.rotation.z = this.clamp(this.rotation.z, -this.maxRollAngle, this.maxRollAngle);

        // Calculate forward direction based on current rotation
        const forwardVector = new THREE.Vector3(0, 0, -1);
        forwardVector.applyEuler(new THREE.Euler(this.rotation.x, this.rotation.y, this.rotation.z));
        
        // Maintain minimum flight speed
        const currentSpeed = this.velocity.length();
        if (currentSpeed < this.minFlightSpeed) {
            forwardVector.multiplyScalar(this.minFlightSpeed);
            this.velocity.copy(forwardVector);
        } else {
            // Apply forward thrust based on current orientation
            const thrustVector = forwardVector.clone().multiplyScalar(this.glideSpeed * deltaTime);
            this.velocity.add(thrustVector);
        }

        // Apply air resistance
        const airResistance = this.physics.calculateAirResistance(this.velocity, deltaTime);
        this.velocity.sub(airResistance);
    }

    handleJump() {
        if (this.mode === 'walking' && this.onGround) {
            this.velocity.y = this.jumpForce;
            this.mode = 'jumping';
            this.jumpCooldown = 0.5;
        } else if (this.mode === 'walking' && !this.onGround) {
            // Jump off cliff - enter flight mode
            this.enterFlightMode();
        }
    }

    handleMouseLook(deltaTime) {
        // Mouse look is now handled by the camera controller
        // Player no longer responds to mouse input
    }

    applyPitchRotation(pitchDelta) {
        // Apply pitch rotation relative to the player's current facing direction
        // Use the player's local right vector as the rotation axis
        
        // Get the player's current rotation matrix
        const currentMatrix = new THREE.Matrix4();
        currentMatrix.makeRotationFromEuler(new THREE.Euler(this.rotation.x, this.rotation.y, this.rotation.z));
        
        // Get the player's local right vector (X-axis in local space)
        const rightVector = new THREE.Vector3(1, 0, 0);
        rightVector.applyMatrix4(currentMatrix);
        
        // Create rotation around the local right vector
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(rightVector, pitchDelta);
        
        // Apply the rotation
        const newMatrix = new THREE.Matrix4();
        newMatrix.multiplyMatrices(rotationMatrix, currentMatrix);
        
        // Convert back to Euler angles
        const newEuler = new THREE.Euler();
        newEuler.setFromRotationMatrix(newMatrix);
        
        // Update the player's rotation
        this.rotation.x = newEuler.x;
        this.rotation.y = newEuler.y;
        this.rotation.z = newEuler.z;
    }

    applyRollRotation(rollDelta) {
        // Apply roll rotation relative to the player's current facing direction
        // Use the player's local forward vector as the rotation axis
        
        // Get the player's current rotation matrix
        const currentMatrix = new THREE.Matrix4();
        currentMatrix.makeRotationFromEuler(new THREE.Euler(this.rotation.x, this.rotation.y, this.rotation.z));
        
        // Get the player's local forward vector (Z-axis in local space, but negative)
        const forwardVector = new THREE.Vector3(0, 0, -1);
        forwardVector.applyMatrix4(currentMatrix);
        
        // Create rotation around the local forward vector
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(forwardVector, rollDelta);
        
        // Apply the rotation
        const newMatrix = new THREE.Matrix4();
        newMatrix.multiplyMatrices(rotationMatrix, currentMatrix);
        
        // Convert back to Euler angles
        const newEuler = new THREE.Euler();
        newEuler.setFromRotationMatrix(newMatrix);
        
        // Update the player's rotation
        this.rotation.x = newEuler.x;
        this.rotation.y = newEuler.y;
        this.rotation.z = newEuler.z;
    }

    applyYawRotation(yawDelta) {
        // Apply yaw rotation relative to the player's current facing direction
        // Use the player's local up vector as the rotation axis
        
        // Get the player's current rotation matrix
        const currentMatrix = new THREE.Matrix4();
        currentMatrix.makeRotationFromEuler(new THREE.Euler(this.rotation.x, this.rotation.y, this.rotation.z));
        
        // Get the player's local up vector (Y-axis in local space)
        const upVector = new THREE.Vector3(0, 1, 0);
        upVector.applyMatrix4(currentMatrix);
        
        // Create rotation around the local up vector
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(upVector, yawDelta);
        
        // Apply the rotation
        const newMatrix = new THREE.Matrix4();
        newMatrix.multiplyMatrices(rotationMatrix, currentMatrix);
        
        // Convert back to Euler angles
        const newEuler = new THREE.Euler();
        newEuler.setFromRotationMatrix(newMatrix);
        
        // Update the player's rotation
        this.rotation.x = newEuler.x;
        this.rotation.y = newEuler.y;
        this.rotation.z = newEuler.z;
    }

    updatePhysics(deltaTime) {
        // Apply gravity
        this.physics.applyGravity(this.velocity, deltaTime, this.mode === 'flying');

        // Update position
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // Handle collision
        const collision = this.physics.handleCollision(this.position, this.velocity, 0.5);
        this.position.copy(collision.position);
        this.velocity.copy(collision.velocity);
        this.onGround = collision.onGround;

        // Check for mode transitions
        this.checkModeTransitions();
    }

    checkModeTransitions() {
        if (this.mode === 'jumping' && this.onGround) {
            this.mode = 'walking';
        } else if (this.mode === 'walking' && !this.onGround && this.velocity.y < -2) {
            // Falling off cliff - enter flight mode
            this.enterFlightMode();
        }
    }

    enterFlightMode() {
        this.mode = 'flying';
        this.wingsuitMesh.visible = true;
        
        // Set initial flight velocity
        const forwardVector = new THREE.Vector3(0, 0, -1);
        forwardVector.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        forwardVector.multiplyScalar(this.glideSpeed);
        this.velocity.copy(forwardVector);
        
        console.log('Entered flight mode!');
    }

    updateMesh() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }

    updateMode() {
        // Update wingsuit visibility
        if (this.wingsuitMesh) {
            this.wingsuitMesh.visible = this.mode === 'flying';
        }
    }

    getSpeed() {
        return this.velocity.length();
    }

    getAltitude() {
        return this.position.y;
    }

    getMode() {
        return this.mode.charAt(0).toUpperCase() + this.mode.slice(1);
    }

    getPosition() {
        return this.position.clone();
    }

    getVelocity() {
        return this.velocity.clone();
    }

    getRotation() {
        return this.rotation.clone();
    }

    // Helper methods for Three.js compatibility
    lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}
