// Game class manages the overall game state, rendering, and update loop.
// It initializes the canvas, player, and input handler.

class Game {
  constructor() {
    // Canvas dimensions from constants
    this.width = GAME_CONSTANTS.CANVAS.WIDTH;
    this.height = GAME_CONSTANTS.CANVAS.HEIGHT;
    // Ground level from constants
    this.groundY = GAME_CONSTANTS.CANVAS.GROUND_Y;

    // Get canvas context
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Initialize infinite world systems
    this.camera = new Camera();
    this.world = new World(this.camera, this);
    this.input = new InputHandler();
    this.player = new Player(this);
    this.score = new Score();
    
    // Game state management
    this.gameState = GAME_CONSTANTS.GAME_STATES.PLAYING;
    this.ashPile = null; // Ash pile effect when player is vaporized
    
    // Death animation timing
    this.deathTime = 0; // When player died (timestamp)
    this.showGameOver = false; // Whether to show game over screen
    this.gameOverAlpha = 0; // Current alpha for fade-in effect
    this.deathCause = null; // Track what caused death ('ufo' or 'bomb')
    
    // Set initial player position on ground (bottom of player at ground level)
    this.player.y = this.groundY;
    
    // Generate initial world now that player exists
    this.world.generateInitialWorld();
    
    // Set camera to follow player initially
    this.camera.setPosition(this.player.worldX - GAME_CONSTANTS.WORLD.CAMERA_OFFSET_X);
  }

  // Update game state
  update() {
    // Only update game logic if playing
    if (this.gameState === GAME_CONSTANTS.GAME_STATES.PLAYING) {
      // Update player
      this.player.update(this.input);
      
      // Update player power-ups
      this.player.updatePowerUps();
      
      // Handle collision detection
      this.handleCollisions();
      
      // Update camera to follow player with directional offset
      this.camera.update(this.player.worldX, this.player.direction);
      
      // Update player's screen position based on camera
      this.player.updateScreenPosition(this.camera);
      
      // Update world (procedural generation and cleanup)
      this.world.update(this.player.worldX);
      
      // Update world objects
      this.world.getCollectibles().forEach(collectible => collectible.update());
      this.world.getHazards().forEach(hazard => hazard.update());
      this.world.getMovingPlatforms().forEach(platform => platform.update());
      this.world.getPowerUps().forEach(powerUp => powerUp.update());
      this.world.getUFOs().forEach(ufo => ufo.update());
    } else if (this.gameState === GAME_CONSTANTS.GAME_STATES.GAME_OVER) {
      // Update ash pile animation during game over
      if (this.ashPile) {
        this.ashPile.update();
      }
      
      // Update death animation timing
      this.updateDeathAnimation();
      
      // Check for restart input
      this.handleGameOverInput();
    }
  }

  // Handle all collision detection
  handleCollisions() {
    // Check ground collision
    this.player.handleGroundCollision();
    
    // Check platform collisions
    const obstacles = this.world.getObstacles();
    for (const obstacle of obstacles) {
      const collision = obstacle.checkCollision(this.player);
      if (collision) {
        if (collision.direction === 'top' && obstacle.type === 'platform' && this.player.vy >= 0) {
          // Player is falling onto a platform
          this.player.handlePlatformCollision(obstacle);
        } else if (collision.direction === 'bottom' && obstacle.type === 'platform' && this.player.vy < 0) {
          // Player is jumping into platform from below - stop upward movement
          this.player.vy = 0;
          // Position player so their top is just below the platform bottom (hit their head)
          const playerHeight = this.player.normalHeight + (this.player.crouchHeight - this.player.normalHeight) * this.player.crouchTransition;
          this.player.y = obstacle.y + obstacle.height + playerHeight;
        } else if ((collision.direction === 'left' || collision.direction === 'right') && obstacle.type === 'platform') {
          // Player is hitting side of platform - stop horizontal movement
          if (collision.direction === 'left') {
            this.player.worldX = obstacle.x - this.player.width / 2;
          } else {
            this.player.worldX = obstacle.x + obstacle.width + this.player.width / 2;
          }
          this.player.vx = 0; // Stop horizontal velocity
        }
      }
    }
    
    // Check if player is still on platform AFTER all collision detection
    if (this.player.isGrounded && this.player.standingOnPlatform) {
      // Check if still on platform
      const platform = this.player.standingOnPlatform;
      const playerLeft = this.player.worldX - this.player.width / 2;
      const playerRight = this.player.worldX + this.player.width / 2;
      
      // Debug logging
      console.log(`Platform check: Player(${this.player.worldX.toFixed(1)}) L:${playerLeft.toFixed(1)} R:${playerRight.toFixed(1)} | Platform(${platform.x.toFixed(1)}-${(platform.x + platform.width).toFixed(1)})`);
      
      // Player falls off if any part of their body is off the platform
      if (playerRight <= platform.x || playerLeft >= platform.x + platform.width) {
        // Player walked off platform
        console.log(`Player fell off platform! Right:${playerRight.toFixed(1)} <= Platform:${platform.x.toFixed(1)} OR Left:${playerLeft.toFixed(1)} >= Platform:${(platform.x + platform.width).toFixed(1)}`);
        this.player.isGrounded = false;
        this.player.standingOnPlatform = null;
      }
    }
    
    // Check collectible collisions
    const collectibles = this.world.getCollectibles();
    for (const collectible of collectibles) {
      if (collectible.checkCollision(this.player)) {
        collectible.collect(this.score);
        this.world.removeCollectible(collectible);
      }
    }
    
    // Check hazard collisions
    const hazards = this.world.getHazards();
    for (const hazard of hazards) {
      const collision = hazard.checkCollision(this.player);
      if (collision) {
        if (collision.type === 'damage') {
          // Handle damage (could respawn player, reduce health, etc.)
          this.handlePlayerDamage(collision.damage);
        } else if (collision.type === 'platform') {
          // Handle collapsing platform
          this.player.handlePlatformCollision(collision.platform);
        } else if (collision.type === 'quicksand') {
          // Apply quicksand effect
          this.player.applyHazardEffect('quicksand', collision.hazard);
        } else if (collision.type === 'wind') {
          // Apply wind effect
          this.player.applyHazardEffect('wind', collision);
        }
      }
    }
    
    // Check moving platform collisions
    const movingPlatforms = this.world.getMovingPlatforms();
    for (const platform of movingPlatforms) {
      const collision = platform.checkCollision(this.player);
      if (collision) {
        if (collision.direction === 'top' && this.player.vy >= 0) {
          // Player is falling onto a moving platform
          this.player.handlePlatformCollision(platform);
          platform.playerOnPlatform = true;
        } else if (collision.direction === 'bottom' && this.player.vy < 0) {
          // Player is jumping into platform from below - stop upward movement
          this.player.vy = 0;
          this.player.y = platform.y + platform.height;
        } else if ((collision.direction === 'left' || collision.direction === 'right')) {
          // Player is hitting side of platform - stop horizontal movement
          if (collision.direction === 'left') {
            this.player.worldX = platform.x - GAME_CONSTANTS.PLAYER.WIDTH;
          } else {
            this.player.worldX = platform.x + platform.width;
          }
          this.player.vx = 0;
        }
      } else {
        // Player is not colliding with platform
        platform.playerOnPlatform = false;
      }
    }
    
    // Check power-up collisions
    const powerUps = this.world.getPowerUps();
    for (const powerUp of powerUps) {
      if (powerUp.checkCollision(this.player)) {
        const powerUpType = powerUp.collect();
        this.player.applyPowerUp(powerUpType);
        this.world.removePowerUp(powerUp);
      }
    }
    
    // Handle magnet effect
    if (this.player.magnetActive) {
      this.handleMagnetEffect();
    }
    
    // Check UFO collisions
    const ufos = this.world.getUFOs();
    for (const ufo of ufos) {
      if (ufo.checkCollision(this.player)) {
        // Player hit by UFO - trigger vaporization and game over
        this.triggerGameOver('ufo');
        break; // Only one collision needed
      }
    }
    
    // Check bomb collisions
    const bombs = this.world.getBombs();
    for (const bomb of bombs) {
      if (bomb.checkCollision(this.player)) {
        // Player hit bomb - trigger explosion and game over
        console.log('Bomb collision detected!');
        bomb.explode();
        this.triggerGameOver('bomb');
        break; // Only one collision needed
      }
    }
  }

  // Draw game elements
  draw() {
    // Clear canvas with background color from constants
    this.ctx.fillStyle = GAME_CONSTANTS.COLORS.BACKGROUND;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw world (ground, obstacles, collectibles)
    this.world.draw(this.ctx);
    
    // Draw player only if game is playing
    if (this.gameState === GAME_CONSTANTS.GAME_STATES.PLAYING) {
      this.player.draw(this.ctx);
    }
    
    // Draw UI elements (score on top)
    this.score.draw(this.ctx);
    
    // Draw ash pile if game over
    if (this.gameState === GAME_CONSTANTS.GAME_STATES.GAME_OVER && this.ashPile) {
      this.ashPile.draw(this.ctx, this.camera);
    }
    
    // Draw game over overlay if game over
    if (this.gameState === GAME_CONSTANTS.GAME_STATES.GAME_OVER) {
      this.drawGameOverScreen();
    }
    
    // Debug info (temporary) - DISABLED FOR PRODUCTION
    // this.drawDebugInfo();
  }

  // Handle player damage
  handlePlayerDamage(damage) {
    // Check if player can take damage (invincibility system)
    if (!this.player.takeDamage(damage)) {
      return; // Player is invincible, no damage taken
    }
    
    // Player took damage - respawn at starting position
    this.player.worldX = GAME_CONSTANTS.PLAYER.INITIAL_X;
    this.player.y = this.groundY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.standingOnPlatform = null;
    
    // Reset power-ups
    this.player.speedMultiplier = 1.0;
    this.player.magnetActive = false;
    this.player.sizeState = 'normal';
    this.player.powerUpTimers = { speed: 0, magnet: 0, size: 0 };
    
    // Reset hazard effects
    this.player.inQuicksand = false;
    this.player.windForce = 0;
  }

  // Handle magnet effect - attract nearby collectibles
  handleMagnetEffect() {
    const collectibles = this.world.getCollectibles();
    const playerCenterX = this.player.worldX + GAME_CONSTANTS.PLAYER.CENTER_OFFSET;
    const playerCenterY = this.player.y + GAME_CONSTANTS.PLAYER.NORMAL_HEIGHT / 2;
    
    for (const collectible of collectibles) {
      const distance = Math.sqrt(
        Math.pow(collectible.x - playerCenterX, 2) + 
        Math.pow(collectible.y - playerCenterY, 2)
      );
      
      if (distance <= GAME_CONSTANTS.POWER_UPS.MAGNET_RANGE) {
        // Move collectible towards player
        const deltaX = playerCenterX - collectible.x;
        const deltaY = playerCenterY - collectible.y;
        const moveDistance = GAME_CONSTANTS.POWER_UPS.MAGNET_FORCE;
        
        collectible.x += (deltaX / distance) * moveDistance;
        collectible.y += (deltaY / distance) * moveDistance;
      }
    }
  }

  // Trigger game over state
  triggerGameOver(deathCause = 'bomb') {
    this.gameState = GAME_CONSTANTS.GAME_STATES.GAME_OVER;
    this.deathTime = Date.now(); // Record when player died
    this.showGameOver = false; // Don't show game over screen yet
    this.gameOverAlpha = 0; // Start with no alpha
    this.deathCause = deathCause; // Track what caused death
    
    // Create appropriate ash pile based on death cause
    if (deathCause === 'ufo') {
      // UFO death - create falling ash pile
      this.ashPile = new UFOAshPile(this.player.worldX, this.player.y);
    } else {
      // Bomb death - create dramatic ash effect
      this.ashPile = new AshPile(this.player.worldX, this.player.y);
    }
  }

  // Update death animation timing and fade effects
  updateDeathAnimation() {
    const currentTime = Date.now();
    const timeSinceDeath = currentTime - this.deathTime;
    
    // After 2 seconds, start showing game over screen
    if (timeSinceDeath >= GAME_CONSTANTS.GAME_OVER.DEATH_DELAY) {
      this.showGameOver = true;
      
      // Calculate fade-in progress
      const fadeStartTime = GAME_CONSTANTS.GAME_OVER.DEATH_DELAY;
      const fadeProgress = Math.min((timeSinceDeath - fadeStartTime) / GAME_CONSTANTS.GAME_OVER.FADE_DURATION, 1);
      
      // Interpolate alpha from 0 to target alpha
      this.gameOverAlpha = GAME_CONSTANTS.GAME_OVER.FADE_START_ALPHA + 
        (GAME_CONSTANTS.GAME_OVER.FADE_END_ALPHA - GAME_CONSTANTS.GAME_OVER.FADE_START_ALPHA) * fadeProgress;
    }
  }

  // Handle input during game over state
  handleGameOverInput() {
    const spacePressed = this.input.keys[' '];
    const rPressed = this.input.keys['r'] || this.input.keys['R'];
    
    if (spacePressed || rPressed) {
      this.restartGame();
    }
  }

  // Restart the game
  restartGame() {
    // Reset game state
    this.gameState = GAME_CONSTANTS.GAME_STATES.PLAYING;
    this.ashPile = null;
    
    // Reset death animation timing
    this.deathTime = 0;
    this.showGameOver = false;
    this.gameOverAlpha = 0;
    this.deathCause = null;
    
    // Reset player
    this.player.worldX = GAME_CONSTANTS.PLAYER.INITIAL_X;
    this.player.y = this.groundY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.standingOnPlatform = null;
    
    // Reset power-ups
    this.player.speedMultiplier = 1.0;
    this.player.magnetActive = false;
    this.player.sizeState = 'normal';
    this.player.powerUpTimers = { speed: 0, magnet: 0, size: 0 };
    
    // Reset hazard effects
    this.player.inQuicksand = false;
    this.player.windForce = 0;
    
    // Reset invincibility
    this.player.invincible = false;
    this.player.invincibilityTimer = 0;
    
    // Reset score
    this.score.reset();
    
    // Reset world (clear all objects)
    this.world.obstacles = [];
    this.world.collectibles = [];
    this.world.hazards = [];
    this.world.movingPlatforms = [];
    this.world.powerUps = [];
    this.world.ufos = [];
    this.world.bombs = [];
    this.world.generatedChunks.clear();
    
    // Regenerate initial world
    this.world.generateInitialWorld();
    
    // Reset camera
    this.camera.setPosition(this.player.worldX - GAME_CONSTANTS.WORLD.CAMERA_OFFSET_X);
  }

  // Draw game over screen overlay
  drawGameOverScreen() {
    // Only draw if we should show the game over screen
    if (!this.showGameOver) return;
    
    // Draw semi-transparent overlay with current alpha
    const overlayColor = GAME_CONSTANTS.GAME_OVER.OVERLAY_COLOR;
    const alphaOverlay = overlayColor.replace('0.8)', `${this.gameOverAlpha})`);
    this.ctx.fillStyle = alphaOverlay;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Center the text
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Draw "GAME OVER" title with alpha
    const titleColor = GAME_CONSTANTS.GAME_OVER.TITLE_COLOR;
    const alphaTitle = titleColor.replace('1)', `${this.gameOverAlpha})`);
    this.ctx.fillStyle = alphaTitle;
    this.ctx.font = GAME_CONSTANTS.GAME_OVER.TITLE_FONT;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(GAME_CONSTANTS.GAME_OVER.TITLE_TEXT, centerX, centerY - 50);
    
    // Draw final score with alpha
    const scoreColor = GAME_CONSTANTS.GAME_OVER.SCORE_COLOR;
    const alphaScore = scoreColor.replace('1)', `${this.gameOverAlpha})`);
    this.ctx.fillStyle = alphaScore;
    this.ctx.font = GAME_CONSTANTS.GAME_OVER.SCORE_FONT;
    this.ctx.fillText(
      GAME_CONSTANTS.GAME_OVER.SCORE_PREFIX + this.score.getScore(), 
      centerX, 
      centerY + 20
    );
    
    // Draw restart instruction with alpha
    const instructionColor = GAME_CONSTANTS.GAME_OVER.INSTRUCTION_COLOR;
    const alphaInstruction = instructionColor.replace('1)', `${this.gameOverAlpha})`);
    this.ctx.fillStyle = alphaInstruction;
    this.ctx.font = GAME_CONSTANTS.GAME_OVER.INSTRUCTION_FONT;
    this.ctx.fillText(
      GAME_CONSTANTS.GAME_OVER.RESTART_INSTRUCTION, 
      centerX, 
      centerY + 60
    );
    
    // Reset text alignment
    this.ctx.textAlign = 'left';
  }

  // Debug information display
  drawDebugInfo() {
    this.ctx.fillStyle = 'white';
    this.ctx.font = '14px Arial';
    this.ctx.fillText(`World X: ${Math.round(this.player.worldX)}`, 20, 60);
    this.ctx.fillText(`Screen X: ${Math.round(this.player.x)}`, 20, 80);
    this.ctx.fillText(`Camera X: ${Math.round(this.camera.getX())}`, 20, 100);
    this.ctx.fillText(`Grounded: ${this.player.isGrounded}`, 20, 120);
    this.ctx.fillText(`Obstacles: ${this.world.getObstacles().length}`, 20, 140);
    this.ctx.fillText(`Collectibles: ${this.world.getCollectibles().length}`, 20, 160);
    this.ctx.fillText(`Hazards: ${this.world.getHazards().length}`, 20, 180);
    this.ctx.fillText(`Moving Platforms: ${this.world.getMovingPlatforms().length}`, 20, 200);
    this.ctx.fillText(`Power-ups: ${this.world.getPowerUps().length}`, 20, 220);
    this.ctx.fillText(`UFOs: ${this.world.getUFOs().length}`, 20, 240);
    this.ctx.fillText(`Game State: ${this.gameState}`, 20, 260);
    this.ctx.fillText(`Speed Multiplier: ${this.player.speedMultiplier.toFixed(1)}`, 20, 280);
    this.ctx.fillText(`Magnet Active: ${this.player.magnetActive}`, 20, 300);
    this.ctx.fillText(`Size State: ${this.player.sizeState}`, 20, 320);
    this.ctx.fillText(`Invincible: ${this.player.invincible}`, 20, 340);
    this.ctx.fillText(`Invincibility Timer: ${Math.max(0, this.player.invincibilityTimer)}ms`, 20, 360);
    
    // Progressive difficulty info
    const distanceFromStart = Math.abs(this.player.worldX - GAME_CONSTANTS.PLAYER.INITIAL_X);
    const ufoSpawnChance = this.world.calculateUFOSpawnChance(distanceFromStart);
    this.ctx.fillText(`Distance from Start: ${Math.round(distanceFromStart)}px`, 20, 380);
    this.ctx.fillText(`UFO Spawn Chance: ${(ufoSpawnChance * 100).toFixed(1)}%`, 20, 400);
    
    // Camera info
    this.ctx.fillText(`Player Direction: ${this.player.direction}`, 20, 420);
    this.ctx.fillText(`Camera Direction: ${this.camera.currentDirection}`, 20, 440);
    this.ctx.fillText(`Camera Offset: ${Math.round(this.camera.offsetX)}px`, 20, 460);
    this.ctx.fillText(`Target Offset: ${Math.round(this.camera.targetOffsetX)}px`, 20, 480);
    this.ctx.fillText(`Bombs: ${this.world.getBombs().length}`, 20, 500);
    this.ctx.fillText(`Player Y: ${Math.round(this.player.y)}`, 20, 520);
    this.ctx.fillText(`Ground Y: ${GAME_CONSTANTS.CANVAS.GROUND_Y}`, 20, 540);
  }

  // Main game loop
  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }
}

