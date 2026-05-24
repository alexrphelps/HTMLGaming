// Player class represents the stickman character.
// It handles movement, jumping, crouching, gravity, and animated drawing.

class Player {
  constructor(game) {
    this.game = game;
    // Position and size from constants
    this.worldX = GAME_CONSTANTS.PLAYER.INITIAL_X; // World position (for infinite scrolling)
    this.x = GAME_CONSTANTS.PLAYER.INITIAL_X; // Screen position (will be updated by camera)
    this.y = 0; // Will be set to ground level
    this.width = GAME_CONSTANTS.PLAYER.WIDTH;
    this.normalHeight = GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT;
    this.crouchHeight = GAME_CONSTANTS.PLAYER.CROUCH_HEIGHT;
    
    // Physics from constants
    this.speed = GAME_CONSTANTS.PLAYER.SPEED;
    this.vx = 0; // Horizontal velocity for momentum
    this.vy = 0; // Vertical velocity
    this.jumpForce = GAME_CONSTANTS.PLAYER.JUMP_FORCE;
    this.gravity = GAME_CONSTANTS.PLAYER.GRAVITY;
    
    // State
    this.isGrounded = true;
    this.isCrouching = false;
    this.direction = 1; // 1 for right, -1 for left
    this.isMoving = false; // True when actively pressing movement keys
    this.hasHorizontalMomentum = false; // True when moving due to momentum

    // Animation states
    this.walkCycle = 0; // For walking animation phase (0 to 2π)
    this.jumpPhase = 0; // 0: start, 1: apex, 2: landing
    this.crouchTransition = 0; // 0: standing, 1: fully crouched (for smooth transition)
    this.airTilt = 0; // Torso tilt in radians while airborne
    this.animationSpeed = GAME_CONSTANTS.PLAYER.WALK_ANIMATION_SPEED;
    this.crouchCycle = 0;
    this.crouchAnimationSpeed = GAME_CONSTANTS.PLAYER.CROUCH_ANIMATION_SPEED;
    this.airTime = 0; // Track how long we've been in the air for momentum effects

    // Jump randomness - new seed every jump for unique animations!
    this.jumpRandomSeed = Math.random() * 1000;

    // Double jump system
    this.canDoubleJump = true; // Can perform double jump
    this.hasDoubleJumped = false; // Has used double jump in current air session
    this.jumpKeyWasPressed = false; // Track jump key state for preventing hold-to-jump

    // Platform collision
    this.standingOnPlatform = null; // Reference to platform player is standing on

    // Power-up states
    this.speedMultiplier = 1.0;
    this.magnetActive = false;
    this.sizeState = 'normal'; // 'normal', 'small', 'large'
    this.powerUpTimers = {
      speed: 0,
      magnet: 0,
      size: 0
    };

    // Hazard effects
    this.inQuicksand = false;
    this.windForce = 0;
    
    // Invincibility system
    this.invincible = false;
    this.invincibilityTimer = 0;
  }

  update(input) {
    // Check for active input
    const leftPressed = GAME_CONSTANTS.CONTROLS.LEFT.some(key => input.keys[key]);
    const rightPressed = GAME_CONSTANTS.CONTROLS.RIGHT.some(key => input.keys[key]);
    this.isMoving = leftPressed || rightPressed;
    
    // Determine current movement speed based on crouch state and power-ups
    let baseSpeed = this.isCrouching ? GAME_CONSTANTS.CALCULATED.CROUCH_SPEED : this.speed;
    let currentSpeed = baseSpeed * this.speedMultiplier;
    
    // Apply quicksand slowdown
    if (this.inQuicksand) {
      currentSpeed *= GAME_CONSTANTS.HAZARDS.QUICKSAND_SLOW_FACTOR;
    }
    
    // Apply input-based acceleration to horizontal velocity
    if (leftPressed) {
      this.vx -= currentSpeed * 0.3; // Gradual acceleration
      this.direction = -1;
    }
    if (rightPressed) {
      this.vx += currentSpeed * 0.3; // Gradual acceleration  
      this.direction = 1;
    }
    
    // Apply air resistance or ground friction to horizontal velocity
    if (this.isGrounded) {
      // On ground: apply friction
      this.vx *= GAME_CONSTANTS.PLAYER.GROUND_FRICTION;
    } else {
      // In air: apply air resistance (maintains momentum better)
      this.vx *= GAME_CONSTANTS.PLAYER.AIR_RESISTANCE;
    }
    
    // Limit maximum horizontal velocity
    const maxVel = GAME_CONSTANTS.PLAYER.MAX_HORIZONTAL_VELOCITY;
    this.vx = Math.max(-maxVel, Math.min(maxVel, this.vx));
    
    // Determine if we have significant horizontal momentum
    this.hasHorizontalMomentum = Math.abs(this.vx) > 0.1;
    
    // Apply wind force
    if (this.windForce !== 0) {
      this.vx += this.windForce;
    }

    // Apply horizontal movement to world position
    this.worldX += this.vx;

    // Jumping with keys from constants
    const jumpPressed = GAME_CONSTANTS.CONTROLS.JUMP.some(key => input.keys[key]);
    
    if (jumpPressed && !this.jumpKeyWasPressed) { // Only on new key press (prevent holding)
      if (this.isGrounded) {
        // Regular jump from ground
        let jumpForce = this.jumpForce;
        
        // Apply quicksand jump reduction
        if (this.inQuicksand) {
          jumpForce *= GAME_CONSTANTS.HAZARDS.QUICKSAND_JUMP_REDUCTION;
        }
        
        // Apply size-based jump modification
        if (this.sizeState === 'small') {
          jumpForce *= 0.8; // Smaller jump
        } else if (this.sizeState === 'large') {
          jumpForce *= 1.2; // Bigger jump
        }
        
        this.vy = jumpForce;
        this.isGrounded = false;
        this.jumpPhase = 0; // Start jump animation
        this.airTime = 0; // Reset air time
        
        // Reset double jump availability
        this.canDoubleJump = GAME_CONSTANTS.PLAYER.DOUBLE_JUMP_ENABLED;
        this.hasDoubleJumped = false;
        
        // Generate NEW random seed for unique jump animation!
        this.jumpRandomSeed = Math.random() * 1000;
      } else if (this.canDoubleJump && !this.hasDoubleJumped && !this.isGrounded) {
        // Double jump in air
        this.vy = this.jumpForce * GAME_CONSTANTS.PLAYER.DOUBLE_JUMP_FORCE_MULTIPLIER;
        this.hasDoubleJumped = true;
        this.canDoubleJump = false; // Can't double jump again until landing
        
        // Generate NEW random seed for unique double jump animation!
        this.jumpRandomSeed = Math.random() * 1000;
      }
    }
    
    // Track jump key state for next frame
    this.jumpKeyWasPressed = jumpPressed;

    // Crouching with smooth transition using constants
    const targetCrouch = GAME_CONSTANTS.CONTROLS.CROUCH.some(key => input.keys[key]) ? 1 : 0;
    this.crouchTransition += (targetCrouch - this.crouchTransition) * GAME_CONSTANTS.PLAYER.CROUCH_TRANSITION_SPEED;
    this.isCrouching = this.crouchTransition > 0.5;

    // Apply gravity
    this.vy += this.gravity;
    this.y += this.vy;

    // Current height based on crouch transition (smooth height change)
    const height = this.normalHeight + (this.crouchHeight - this.normalHeight) * this.crouchTransition;

    // This will be handled by the game's collision system now
    // The game will call handleGroundCollision() or handlePlatformCollision()
    
    if (!this.isGrounded) {
      // Track air time for momentum effects using constants
      this.airTime += GAME_CONSTANTS.PLAYER.AIR_TIME_INCREMENT;
      
      // Airborne: update jump phase and tilt
      this.jumpPhase = Math.min(this.jumpPhase + 0.02, 2); // Progress jump phase
      if (this.isMoving) {
        this.airTilt += this.direction * 0.01; // Gradual tilt
        this.airTilt = Math.max(Math.min(this.airTilt, GAME_CONSTANTS.LIMITS.MAX_AIR_TILT), GAME_CONSTANTS.LIMITS.MIN_AIR_TILT);
      } else {
        this.airTilt *= GAME_CONSTANTS.LIMITS.AIR_TILT_DAMPING; // Dampen tilt when not moving
      }
    }

    // In infinite world, we don't limit horizontal movement
    // The camera will follow the player anywhere

    // Update walking cycle if moving on ground (either from input or momentum)
    const isActuallyMoving = this.isMoving || this.hasHorizontalMomentum;
    if (this.isGrounded && isActuallyMoving && !this.isCrouching) {
      this.walkCycle += this.animationSpeed * Math.abs(this.vx) / this.speed; // Speed-based animation
      if (this.walkCycle > 2 * Math.PI) this.walkCycle -= 2 * Math.PI;
    } else if (!isActuallyMoving && this.isGrounded) {
      this.walkCycle = 0; // Reset to idle only when grounded and no momentum
    }

    // Update crouch walking cycle
    if (this.isGrounded && isActuallyMoving && this.isCrouching) {
      this.crouchCycle += this.crouchAnimationSpeed * Math.abs(this.vx) / this.speed;
      if (this.crouchCycle > 2 * Math.PI) this.crouchCycle -= 2 * Math.PI;
    } else if (!isActuallyMoving) {
      this.crouchCycle = 0;
    }
  }

  /**
   * Handle collision with ground
   */
  handleGroundCollision() {
    const height = this.normalHeight + (this.crouchHeight - this.normalHeight) * this.crouchTransition;
    
    // Player Y position represents bottom of player
    if (this.y > GAME_CONSTANTS.CANVAS.GROUND_Y) {
      this.y = GAME_CONSTANTS.CANVAS.GROUND_Y;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpPhase = 0;
      this.airTilt = 0;
      this.airTime = 0;
      this.standingOnPlatform = null;
      
      // Reset double jump
      this.canDoubleJump = GAME_CONSTANTS.PLAYER.DOUBLE_JUMP_ENABLED;
      this.hasDoubleJumped = false;
    }
  }

  /**
   * Handle collision with platform
   * @param {Obstacle} platform - Platform to land on
   */
  handlePlatformCollision(platform) {
    if (platform.type === 'platform' && this.vy >= 0) { // Only land when falling
      this.y = platform.getTopY(); // Player's Y position is now the bottom (surface level)
      this.vy = 0;
      this.isGrounded = true;
      this.jumpPhase = 0;
      this.airTilt = 0;
      this.airTime = 0;
      this.standingOnPlatform = platform;
      
      // Reset double jump
      this.canDoubleJump = GAME_CONSTANTS.PLAYER.DOUBLE_JUMP_ENABLED;
      this.hasDoubleJumped = false;
    }
  }

  /**
   * Update screen position based on camera
   * @param {Camera} camera - Camera object
   */
  updateScreenPosition(camera) {
    const screenPos = camera.worldToScreen(this.worldX, this.y);
    this.x = screenPos.x;
  }

  /**
   * Get player's world position
   * @returns {Object} World position {x, y}
   */
  getWorldPosition() {
    return { x: this.worldX, y: this.y };
  }

  /**
   * Update power-up timers and effects
   */
  updatePowerUps() {
    // Update speed boots timer
    if (this.powerUpTimers.speed > 0) {
      this.powerUpTimers.speed -= 16; // ~60fps
      if (this.powerUpTimers.speed <= 0) {
        this.speedMultiplier = 1.0;
      }
    }

    // Update magnet timer
    if (this.powerUpTimers.magnet > 0) {
      this.powerUpTimers.magnet -= 16; // ~60fps
      if (this.powerUpTimers.magnet <= 0) {
        this.magnetActive = false;
      }
    }

    // Update size timer
    if (this.powerUpTimers.size > 0) {
      this.powerUpTimers.size -= 16; // ~60fps
      if (this.powerUpTimers.size <= 0) {
        this.sizeState = 'normal';
      }
    }
    
    // Update invincibility timer
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= 16; // ~60fps
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
      }
    }
  }

  /**
   * Apply power-up effect
   * @param {string} powerUpType - Type of power-up
   */
  applyPowerUp(powerUpType) {
    switch (powerUpType) {
      case 'speed':
        this.speedMultiplier = GAME_CONSTANTS.POWER_UPS.SPEED_BOOTS_MULTIPLIER;
        this.powerUpTimers.speed = GAME_CONSTANTS.POWER_UPS.SPEED_BOOTS_DURATION;
        break;
        
      case 'magnet':
        this.magnetActive = true;
        this.powerUpTimers.magnet = GAME_CONSTANTS.POWER_UPS.MAGNET_DURATION;
        break;
        
      case 'shrink':
        this.sizeState = 'small';
        this.powerUpTimers.size = GAME_CONSTANTS.POWER_UPS.SIZE_DURATION;
        break;
        
      case 'grow':
        this.sizeState = 'large';
        this.powerUpTimers.size = GAME_CONSTANTS.POWER_UPS.SIZE_DURATION;
        break;
    }
  }

  /**
   * Apply hazard effect
   * @param {string} hazardType - Type of hazard
   * @param {Object} hazardData - Additional hazard data
   */
  applyHazardEffect(hazardType, hazardData) {
    switch (hazardType) {
      case 'quicksand':
        this.inQuicksand = true;
        break;
        
      case 'wind':
        this.windForce = hazardData.direction * hazardData.force;
        break;
    }
  }

  /**
   * Remove hazard effect
   * @param {string} hazardType - Type of hazard
   */
  removeHazardEffect(hazardType) {
    switch (hazardType) {
      case 'quicksand':
        this.inQuicksand = false;
        break;
        
      case 'wind':
        this.windForce = 0;
        break;
    }
  }
  
  /**
   * Handle damage with invincibility system
   * @param {number} damage - Amount of damage
   * @returns {boolean} - True if damage was applied, false if invincible
   */
  takeDamage(damage) {
    if (this.invincible) {
      return false; // No damage taken
    }
    
    // Apply damage and start invincibility period
    this.invincible = true;
    this.invincibilityTimer = 2000; // 2 seconds of invincibility
    
    return true; // Damage was applied
  }

  draw(ctx) {
    // Set drawing style from constants
    // Flash effect when invincible
    if (this.invincible) {
      const flashRate = 0.1; // How fast to flash
      const flashPhase = Math.sin(Date.now() * flashRate);
      if (flashPhase < 0) {
        return; // Skip drawing this frame (creates flashing effect)
      }
    }
    
    ctx.strokeStyle = GAME_CONSTANTS.COLORS.STICKMAN;
    ctx.lineWidth = GAME_CONSTANTS.DRAWING.LINE_WIDTH;

    // Define body proportions from constants
    const headRadius = GAME_CONSTANTS.BODY.HEAD_RADIUS;
    const torsoLength = this.isCrouching ? GAME_CONSTANTS.BODY.TORSO_LENGTH_CROUCH : GAME_CONSTANTS.BODY.TORSO_LENGTH_NORMAL;
    const upperArmLength = GAME_CONSTANTS.BODY.UPPER_ARM_LENGTH;
    const lowerArmLength = GAME_CONSTANTS.BODY.LOWER_ARM_LENGTH;
    const upperLegLength = this.isCrouching ? GAME_CONSTANTS.BODY.UPPER_LEG_LENGTH_CROUCH : GAME_CONSTANTS.BODY.UPPER_LEG_LENGTH_NORMAL;
    const lowerLegLength = this.isCrouching ? GAME_CONSTANTS.BODY.LOWER_LEG_LENGTH_CROUCH : GAME_CONSTANTS.BODY.LOWER_LEG_LENGTH_NORMAL;

    // Calculate base positions using constants
    // Player Y position now represents the bottom (feet) of the player
    const centerX = this.x + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const currentHeight = this.normalHeight + (this.crouchHeight - this.normalHeight) * this.crouchTransition;
    const headY = this.y - currentHeight + headRadius + (this.isCrouching ? GAME_CONSTANTS.BODY.CROUCH_HEAD_OFFSET : 0);

    // Draw head
    ctx.beginPath();
    ctx.arc(centerX, headY, headRadius, 0, 2 * Math.PI);
    ctx.stroke();

    // Calculate torso positions with tilt for airborne movement
    const neckX = centerX;
    const neckY = headY + headRadius;
    
    let hipX = neckX;
    let hipY = neckY + torsoLength;
    
    // Apply torso tilt when airborne - ALWAYS DIVING, NEVER VERTICAL!
    if (!this.isGrounded) {
      const actualMovementDirection = this.vx > 0.1 ? 1 : (this.vx < -0.1 ? -1 : 0);
      const isActuallyMovingInAir = Math.abs(this.vx) > 0.1;
      
      // Add random tilt variation for unique dive styles!
      const randomTiltOffset = Math.sin(this.jumpRandomSeed + 400) * GAME_CONSTANTS.ANIMATION.JUMP_TILT_RANDOM_VARIATION;
      
      let tiltAmount;
      if (isActuallyMovingInAir) {
        // When moving: EXTREME tilt away from movement direction
        const baseTilt = -actualMovementDirection * GAME_CONSTANTS.ANIMATION.AIR_TILT_BASE;
        const airTimeTilt = Math.sin(this.airTime * 3) * GAME_CONSTANTS.ANIMATION.AIR_TILT_OSCILLATION;
        tiltAmount = baseTilt + airTimeTilt + randomTiltOffset;
      } else {
        // When not moving: STILL ALWAYS DIVING! Use random direction
        const randomDirection = Math.sin(this.jumpRandomSeed) > 0 ? 1 : -1;
        const minDiveTilt = randomDirection * GAME_CONSTANTS.ANIMATION.AIR_TILT_MIN_DIVE;
        const dynamicTilt = Math.sin(this.airTime * 2.5) * GAME_CONSTANTS.ANIMATION.AIR_TILT_OSCILLATION;
        tiltAmount = minDiveTilt + dynamicTilt + randomTiltOffset;
      }
      
      // Ensure we never go vertical - clamp to minimum dive angles
      const minTilt = GAME_CONSTANTS.ANIMATION.AIR_TILT_MIN_DIVE;
      if (Math.abs(tiltAmount) < minTilt) {
        tiltAmount = tiltAmount >= 0 ? minTilt : -minTilt;
      }
      
      hipX = neckX + Math.sin(tiltAmount) * torsoLength;
      hipY = neckY + Math.cos(tiltAmount) * torsoLength;
    }

    // Draw torso
    ctx.beginPath();
    ctx.moveTo(neckX, neckY);
    ctx.lineTo(hipX, hipY);
    ctx.stroke();

    // Calculate shoulder positions using constants
    const shoulderY = neckY + GAME_CONSTANTS.BODY.NECK_TO_SHOULDER;
    const shoulderOffset = GAME_CONSTANTS.BODY.SHOULDER_OFFSET;
    const leftShoulderX = neckX - shoulderOffset;
    const rightShoulderX = neckX + shoulderOffset;

    // Animation calculations using constants
    const time = Date.now() * 0.01;
    const walkSwing = Math.sin(this.walkCycle) * GAME_CONSTANTS.ANIMATION.WALK_SWING_AMPLITUDE;
    const oppositeSwing = Math.sin(this.walkCycle + Math.PI) * GAME_CONSTANTS.ANIMATION.WALK_SWING_AMPLITUDE;
    const crouchWalk = Math.sin(this.crouchCycle) * GAME_CONSTANTS.ANIMATION.CROUCH_WALK_AMPLITUDE;
    const oppositeCrouchWalk = Math.sin(this.crouchCycle + Math.PI) * GAME_CONSTANTS.ANIMATION.CROUCH_WALK_AMPLITUDE;

    // Airborne flailing effect using constants
    const airFlail = !this.isGrounded ? Math.sin(time * GAME_CONSTANTS.ANIMATION.AIR_FLAIL_SPEED) * GAME_CONSTANTS.ANIMATION.AIR_FLAIL_INTENSITY : 0;
    const airMomentum = !this.isGrounded ? this.airTime * GAME_CONSTANTS.ANIMATION.AIR_MOMENTUM_MULTIPLIER : 0;

    // === LEFT ARM ===
    this.drawArm(ctx, leftShoulderX, shoulderY, upperArmLength, lowerArmLength, 'left', {
      walkSwing: oppositeSwing,
      crouchWalk: oppositeCrouchWalk,
      airFlail,
      airMomentum
    });

    // === RIGHT ARM ===
    this.drawArm(ctx, rightShoulderX, shoulderY, upperArmLength, lowerArmLength, 'right', {
      walkSwing,
      crouchWalk,
      airFlail,
      airMomentum
    });

    // Calculate hip positions with offset for leg gap (similar to shoulder offset for arms)
    const hipOffset = GAME_CONSTANTS.BODY.HIP_OFFSET;
    const leftHipX = hipX - hipOffset;
    const rightHipX = hipX + hipOffset;

    // === LEFT LEG ===
    this.drawLeg(ctx, leftHipX, hipY, upperLegLength, lowerLegLength, 'left', {
      walkSwing,
      crouchWalk,
      airFlail,
      airMomentum
    });

    // === RIGHT LEG ===
    this.drawLeg(ctx, rightHipX, hipY, upperLegLength, lowerLegLength, 'right', {
      walkSwing: oppositeSwing,
      crouchWalk: oppositeCrouchWalk,
      airFlail,
      airMomentum
    });
  }

  // Helper method to draw arms with proper animations
  drawArm(ctx, shoulderX, shoulderY, upperLength, lowerLength, side, animations) {
    const { walkSwing, crouchWalk, airFlail, airMomentum } = animations;
    const sideMultiplier = side === 'left' ? -1 : 1;

    let upperArmAngle, lowerArmAngle;

    if (!this.isGrounded) {
      // Jumping: arms raised up with momentum flow + RANDOMNESS!
      const momentum = airMomentum * GAME_CONSTANTS.ANIMATION.ARM_JUMP_MOMENTUM;
      const momentumFlow = this.direction * momentum; // Flow in movement direction
      
      // Add random variations for unique jump animations!
      const randomArmOffset = (Math.sin(this.jumpRandomSeed + side === 'left' ? 0 : 100) * GAME_CONSTANTS.ANIMATION.JUMP_ARM_RANDOM_VARIATION);
      const randomMomentumMultiplier = 1 + (Math.cos(this.jumpRandomSeed + side === 'left' ? 50 : 150) * GAME_CONSTANTS.ANIMATION.JUMP_MOMENTUM_RANDOM_VARIATION);
      
      upperArmAngle = GAME_CONSTANTS.ANIMATION.ARM_JUMP_RAISE + (momentumFlow * randomMomentumMultiplier * sideMultiplier) + randomArmOffset + airFlail * sideMultiplier;
      lowerArmAngle = GAME_CONSTANTS.ANIMATION.ARM_JUMP_BEND + randomArmOffset * 0.3 + airFlail * sideMultiplier * 0.5;
    } else if (this.isCrouching) {
      // Crouching: arms bent down and forward, facing the correct direction
      const baseCrouchAngle = GAME_CONSTANTS.ANIMATION.ARM_CROUCH_ANGLE * this.direction;
      upperArmAngle = baseCrouchAngle + crouchWalk * 0.3;
      lowerArmAngle = GAME_CONSTANTS.ANIMATION.ARM_CROUCH_BEND + crouchWalk * 0.2;
    } else if (this.isMoving) {
      // Walking: natural arm swing
      upperArmAngle = walkSwing;
      lowerArmAngle = walkSwing * 0.3;
    } else {
      // Idle: arms floating slightly off body at angle
      upperArmAngle = sideMultiplier * GAME_CONSTANTS.ANIMATION.ARM_IDLE_ANGLE;
      lowerArmAngle = GAME_CONSTANTS.ANIMATION.ARM_IDLE_BEND;
    }

    // Calculate joint positions
    const elbowX = shoulderX + Math.sin(upperArmAngle) * upperLength;
    const elbowY = shoulderY + Math.cos(upperArmAngle) * upperLength;

    const handX = elbowX + Math.sin(upperArmAngle + lowerArmAngle) * lowerLength;
    const handY = elbowY + Math.cos(upperArmAngle + lowerArmAngle) * lowerLength;

    // Draw arm
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(elbowX, elbowY);
    ctx.lineTo(handX, handY);
    ctx.stroke();
  }

  // Helper method to draw legs with proper animations
  drawLeg(ctx, hipX, hipY, upperLength, lowerLength, side, animations) {
    const { walkSwing, crouchWalk, airFlail, airMomentum } = animations;
    const sideMultiplier = side === 'left' ? -1 : 1;

    let upperLegAngle, lowerLegAngle;

    if (!this.isGrounded) {
      // Jumping: COMPLETELY INDEPENDENT AND DYNAMIC LEGS!
      const momentum = airMomentum * GAME_CONSTANTS.ANIMATION.LEG_JUMP_MOMENTUM;
      const baseMomentumBend = -this.direction * momentum;
      
      // Create completely different behaviors for each leg!
      const legSeed = this.jumpRandomSeed + (side === 'left' ? 200 : 800); // Very different seeds
      const legTimingSeed = this.jumpRandomSeed + (side === 'left' ? 500 : 1200); // Different timing
      
      // Independent random variations for each leg
      const legIndependence = Math.sin(legSeed) * GAME_CONSTANTS.ANIMATION.JUMP_LEG_INDEPENDENCE;
      const kickStyle = Math.cos(legSeed + 100) * GAME_CONSTANTS.ANIMATION.JUMP_LEG_KICK_VARIATION;
      const timingOffset = Math.sin(legTimingSeed) * GAME_CONSTANTS.ANIMATION.JUMP_LEG_TIMING_OFFSET;
      
      // Each leg gets its own momentum multiplier and direction!
      const legMomentumMultiplier = 1 + (Math.cos(legSeed + 200) * GAME_CONSTANTS.ANIMATION.JUMP_MOMENTUM_RANDOM_VARIATION);
      const legDirectionVariation = Math.sin(legSeed + 400) * 2; // Can go completely opposite directions!
      
      // Dynamic time-based animation for each leg independently
      const legAnimationTime = this.airTime + timingOffset;
      const dynamicKick = Math.sin(legAnimationTime * 3) * kickStyle;
      const dynamicBend = Math.cos(legAnimationTime * 2.5) * legIndependence;
      
      // Combine all the independent factors
      upperLegAngle = GAME_CONSTANTS.ANIMATION.LEG_JUMP_BEND 
        + (baseMomentumBend * legMomentumMultiplier) 
        + legIndependence 
        + legDirectionVariation 
        + dynamicKick 
        + airFlail * sideMultiplier * 0.5;
        
      lowerLegAngle = GAME_CONSTANTS.ANIMATION.LEG_JUMP_BACK_BEND 
        + kickStyle * 0.6 
        + dynamicBend 
        + timingOffset * 2 
        + airFlail * sideMultiplier * 0.3;
    } else if (this.isCrouching) {
      // Crouching: feet stay in exact standing position, knees bend outward in '>' or '<' shape
      // Determine actual movement direction (including momentum)
      const actualMovementDirection = this.vx > 0.1 ? 1 : (this.vx < -0.1 ? -1 : 0);
      const isActuallyMoving = Math.abs(this.vx) > 0.1;
      
      // Calculate foot position - use hip offset for proper leg gap
      const standingLegSpread = sideMultiplier * GAME_CONSTANTS.BODY.HIP_OFFSET; // Match the hip offset
      const targetFootX = hipX + standingLegSpread;
      
      // Determine the surface level (ground or platform) for crouch positioning
      let surfaceLevel = this.y; // Player's Y position is now the bottom (surface level)
      if (this.standingOnPlatform) {
        surfaceLevel = this.standingOnPlatform.getTopY();
      }
      const targetFootY = surfaceLevel;
      
      // Calculate knee position that bends outward to form '>' or '<' shape
      let kneeOffsetX = 0;
      if (isActuallyMoving) {
        // Knee bends outward in movement direction for '>' or '<' shape
        kneeOffsetX = actualMovementDirection * 20; // 20 pixels outward
      } else {
        // When stationary, maintain last movement direction for consistent shape
        kneeOffsetX = this.direction * 15; // Use last direction with slightly less offset
      }
      
      // Add walking animation to knee movement
      kneeOffsetX += crouchWalk * 8;
      
      // Position knee: horizontally offset from hip, vertically between hip and foot
      const kneeX = hipX + kneeOffsetX;
      const kneeY = hipY + upperLength * 0.6; // Knee higher up (60% instead of 70%) to avoid dropping below feet
      
      // Ensure knee is not below foot level
      const maxKneeY = targetFootY - 15; // Keep knee at least 15 pixels above foot
      const finalKneeY = Math.min(kneeY, maxKneeY);
      
      // Calculate leg angles using inverse kinematics to reach exact positions
      upperLegAngle = Math.atan2(kneeX - hipX, finalKneeY - hipY);
      lowerLegAngle = Math.atan2(targetFootX - kneeX, targetFootY - finalKneeY) - upperLegAngle;
    } else if (this.isMoving) {
      // Walking: natural leg swing
      upperLegAngle = walkSwing * 0.6;
      lowerLegAngle = walkSwing * 0.4;
    } else {
      // Idle: legs slightly apart and angled outward like arms
      upperLegAngle = sideMultiplier * GAME_CONSTANTS.ANIMATION.LEG_IDLE_ANGLE;
      lowerLegAngle = 0; // Straight down
    }

    // Calculate joint positions
    const kneeX = hipX + Math.sin(upperLegAngle) * upperLength;
    const kneeY = hipY + Math.cos(upperLegAngle) * upperLength;

    let footX = kneeX + Math.sin(upperLegAngle + lowerLegAngle) * lowerLength;
    let footY = kneeY + Math.cos(upperLegAngle + lowerLegAngle) * lowerLength;

    // Keep feet on ground/platform when grounded
    if (this.isGrounded) {
      // Determine the surface level (ground or platform)
      let surfaceLevel = this.y; // Player's Y position is now the bottom (surface level)
      if (this.standingOnPlatform) {
        surfaceLevel = this.standingOnPlatform.getTopY();
      }
      
      footY = Math.max(footY, surfaceLevel);
      
      // When crouching, force feet to stay at exactly surface level
      if (this.isCrouching) {
        footY = surfaceLevel;
      }
    }

    // Draw leg
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  }
}
