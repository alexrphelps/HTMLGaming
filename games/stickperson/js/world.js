// World class manages the infinite side-scrolling world
// Handles procedural generation, cleanup, and world bounds

class World {
  constructor(camera, game) {
    this.camera = camera;
    this.game = game;
    this.obstacles = []; // Array of all active obstacles
    this.collectibles = []; // Array of all active collectibles
    this.hazards = []; // Array of all active hazards
    this.movingPlatforms = []; // Array of all active moving platforms
    this.powerUps = []; // Array of all active power-ups
    this.ufos = []; // Array of all active UFOs
    this.bombs = []; // Array of all active bombs
    
    // Track generated world chunks
    this.generatedChunks = new Set(); // Track which chunks have been generated
    this.lastPlayerChunk = 0; // Last chunk the player was in
    
    // World generation settings
    this.chunkSize = GAME_CONSTANTS.WORLD.CHUNK_SIZE;
    this.generationDistance = GAME_CONSTANTS.WORLD.GENERATION_DISTANCE;
    this.cleanupDistance = GAME_CONSTANTS.WORLD.CLEANUP_DISTANCE;
    
    // Initial world generation will be called by Game after player is created
  }

  /**
   * Generate initial world content around spawn point
   */
  generateInitialWorld() {
    // Generate a few chunks around the starting position
    for (let chunkIndex = -2; chunkIndex <= 2; chunkIndex++) {
      this.generateChunk(chunkIndex);
    }
  }

  /**
   * Update world based on player position
   * Generates new content ahead and cleans up content behind
   * @param {number} playerWorldX - Player's world X position
   */
  update(playerWorldX) {
    const currentChunk = Math.floor(playerWorldX / this.chunkSize);
    
    // Generate new chunks ahead of player
    const chunksAhead = Math.ceil(this.generationDistance / this.chunkSize);
    for (let i = 0; i <= chunksAhead; i++) {
      const chunkIndex = currentChunk + i;
      if (!this.generatedChunks.has(chunkIndex)) {
        this.generateChunk(chunkIndex);
      }
    }
    
    // Generate chunks behind player (for backtracking)
    const chunksBehind = Math.ceil(this.generationDistance / this.chunkSize);
    for (let i = 1; i <= chunksBehind; i++) {
      const chunkIndex = currentChunk - i;
      if (!this.generatedChunks.has(chunkIndex)) {
        this.generateChunk(chunkIndex);
      }
    }
    
    // Clean up distant chunks to save memory
    this.cleanupDistantContent(playerWorldX);
    
    this.lastPlayerChunk = currentChunk;
  }

  /**
   * Generate content for a specific world chunk
   * @param {number} chunkIndex - Index of chunk to generate
   */
  generateChunk(chunkIndex) {
    if (this.generatedChunks.has(chunkIndex)) return; // Already generated
    
    const chunkStartX = chunkIndex * this.chunkSize;
    const chunkEndX = chunkStartX + this.chunkSize;
    
    // Generate obstacles in this chunk
    this.generateObstaclesInChunk(chunkStartX, chunkEndX);
    
    // Generate collectibles in this chunk
    this.generateCollectiblesInChunk(chunkStartX, chunkEndX);
    
    // Generate hazards in this chunk
    this.generateHazardsInChunk(chunkStartX, chunkEndX);
    
    // Generate moving platforms in this chunk
    this.generateMovingPlatformsInChunk(chunkStartX, chunkEndX);
    
    // Generate power-ups in this chunk
    this.generatePowerUpsInChunk(chunkStartX, chunkEndX);
    
    // Generate UFOs in this chunk (pass player position for difficulty calculation)
    this.generateUFOsInChunk(chunkStartX, chunkEndX, this.game.player.worldX);
    
    // Generate bombs in this chunk
    this.generateBombsInChunk(chunkStartX, chunkEndX);
    
    // Mark chunk as generated
    this.generatedChunks.add(chunkIndex);
  }

  /**
   * Generate obstacles within a chunk
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   */
  generateObstaclesInChunk(startX, endX) {
    let currentX = startX;
    
    while (currentX < endX) {
      // Random spacing between obstacles
      const spacing = GAME_CONSTANTS.OBSTACLES.MIN_SPACING + 
        Math.random() * (GAME_CONSTANTS.OBSTACLES.MAX_SPACING - GAME_CONSTANTS.OBSTACLES.MIN_SPACING);
      
      currentX += spacing;
      
      // Chance to spawn obstacle (only platforms now)
      if (Math.random() < GAME_CONSTANTS.OBSTACLES.SPAWN_CHANCE && currentX < endX) {
        const obstacle = this.createObstacle(currentX, 'platform');
        this.obstacles.push(obstacle);
        
        // Skip past this obstacle for next spawn
        currentX += obstacle.width;
      }
    }
  }

  /**
   * Generate collectibles within a chunk
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   */
  generateCollectiblesInChunk(startX, endX) {
    const collectibleCount = Math.floor(Math.random() * 3) + 1; // 1-3 collectibles per chunk
    
    for (let i = 0; i < collectibleCount; i++) {
      const x = startX + Math.random() * (endX - startX);
      
      // Randomly place on ground, on platforms, or in air
      let y;
      const placement = Math.random();
      
      if (placement < 0.1) {
        // On ground (reduced from 40% to 10%)
        y = GAME_CONSTANTS.CANVAS.GROUND_Y - GAME_CONSTANTS.COLLECTIBLES.RADIUS;
      } else if (placement < 0.3) {
        // On a platform (reduced from 30% to 20%)
        const nearbyPlatform = this.findNearbyPlatform(x);
        if (nearbyPlatform) {
          y = nearbyPlatform.y - GAME_CONSTANTS.COLLECTIBLES.RADIUS;
        } else {
          // If no platform nearby, spawn in air instead
          y = GAME_CONSTANTS.COLLECTIBLES.MIN_Y + 
            Math.random() * (GAME_CONSTANTS.CANVAS.GROUND_Y - GAME_CONSTANTS.COLLECTIBLES.MAX_Y_OFFSET - GAME_CONSTANTS.COLLECTIBLES.MIN_Y);
        }
      } else {
        // In air (increased from 30% to 70%)
        y = GAME_CONSTANTS.COLLECTIBLES.MIN_Y + 
          Math.random() * (GAME_CONSTANTS.CANVAS.GROUND_Y - GAME_CONSTANTS.COLLECTIBLES.MAX_Y_OFFSET - GAME_CONSTANTS.COLLECTIBLES.MIN_Y);
      }
      
      const collectible = WorldCollectible.createRandomApple(x, y);
      this.collectibles.push(collectible);
    }
  }

  /**
   * Generate hazards within a chunk
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   */
  generateHazardsInChunk(startX, endX) {
    let currentX = startX;
    
    while (currentX < endX) {
      // Random spacing between hazards
      const spacing = GAME_CONSTANTS.HAZARDS.HAZARD_MIN_SPACING + 
        Math.random() * 200; // Additional random spacing
      
      currentX += spacing;
      
      // Chance to spawn hazard
      if (Math.random() < GAME_CONSTANTS.HAZARDS.HAZARD_SPAWN_CHANCE && currentX < endX) {
        const hazard = Hazard.createRandomHazard(currentX, GAME_CONSTANTS.CANVAS.GROUND_Y, this.game);
        this.hazards.push(hazard);
        
        // Skip past this hazard for next spawn
        currentX += 100; // Average hazard width
      }
    }
  }

  /**
   * Generate moving platforms within a chunk
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   */
  generateMovingPlatformsInChunk(startX, endX) {
    let currentX = startX;
    
    while (currentX < endX) {
      // Random spacing between moving platforms
      const spacing = GAME_CONSTANTS.MOVING_PLATFORMS.MIN_SPACING + 
        Math.random() * 200; // Additional random spacing
      
      currentX += spacing;
      
      // Chance to spawn moving platform
      if (Math.random() < GAME_CONSTANTS.MOVING_PLATFORMS.SPAWN_CHANCE && currentX < endX) {
        const y = GAME_CONSTANTS.CANVAS.GROUND_Y - 100 - Math.random() * 200; // Above ground
        const movingPlatform = MovingPlatform.createRandomMovingPlatform(currentX, y, this.game);
        this.movingPlatforms.push(movingPlatform);
        
        // Skip past this platform for next spawn
        currentX += movingPlatform.width;
      }
    }
  }

  /**
   * Generate power-ups within a chunk
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   */
  generatePowerUpsInChunk(startX, endX) {
    let currentX = startX;
    
    while (currentX < endX) {
      // Random spacing between power-ups
      const spacing = GAME_CONSTANTS.POWER_UPS.POWER_UP_MIN_SPACING + 
        Math.random() * 300; // Additional random spacing
      
      currentX += spacing;
      
      // Chance to spawn power-up
      if (Math.random() < GAME_CONSTANTS.POWER_UPS.POWER_UP_SPAWN_CHANCE && currentX < endX) {
        const y = GAME_CONSTANTS.CANVAS.GROUND_Y - 50 - Math.random() * 150; // Above ground
        const powerUp = PowerUp.createRandomPowerUp(currentX, y, this.game);
        this.powerUps.push(powerUp);
        
        // Skip past this power-up for next spawn
        currentX += 100; // Average power-up spacing
      }
    }
  }

  /**
   * Generate UFOs within a chunk with progressive difficulty
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   * @param {number} playerWorldX - Player's current world X position
   */
  generateUFOsInChunk(startX, endX, playerWorldX) {
    let currentX = startX;
    
    while (currentX < endX) {
      // Random spacing between UFOs
      const spacing = GAME_CONSTANTS.UFO.MIN_SPACING + 
        Math.random() * 400; // Additional random spacing
      
      currentX += spacing;
      
      // Calculate progressive difficulty based on distance from starting point
      const distanceFromStart = Math.abs(currentX - GAME_CONSTANTS.PLAYER.INITIAL_X);
      const spawnChance = this.calculateUFOSpawnChance(distanceFromStart);
      
      // Chance to spawn UFO with progressive difficulty
      if (Math.random() < spawnChance && currentX < endX) {
        const y = GAME_CONSTANTS.CANVAS.GROUND_Y - 
          GAME_CONSTANTS.UFO.MIN_HEIGHT - 
          Math.random() * (GAME_CONSTANTS.UFO.MAX_HEIGHT - GAME_CONSTANTS.UFO.MIN_HEIGHT);
        
        const ufo = UFO.createRandomUFO(currentX, y, this.game);
        this.ufos.push(ufo);
        
        // Skip past this UFO for next spawn
        currentX += 200; // Average UFO spacing
      }
    }
  }
  
  /**
   * Calculate UFO spawn chance based on distance from starting point
   * @param {number} distanceFromStart - Distance from starting position
   * @returns {number} Spawn chance (0.0 to 1.0)
   */
  calculateUFOSpawnChance(distanceFromStart) {
    const startDistance = GAME_CONSTANTS.UFO.DIFFICULTY_START_DISTANCE;
    const maxDistance = GAME_CONSTANTS.UFO.DIFFICULTY_MAX_DISTANCE;
    const curve = GAME_CONSTANTS.UFO.DIFFICULTY_CURVE;
    
    // If we're before the start distance, use base spawn chance
    if (distanceFromStart < startDistance) {
      return GAME_CONSTANTS.UFO.BASE_SPAWN_CHANCE;
    }
    
    // If we're beyond max distance, use max spawn chance
    if (distanceFromStart >= maxDistance) {
      return GAME_CONSTANTS.UFO.MAX_SPAWN_CHANCE;
    }
    
    // Calculate difficulty progression using a power curve
    const progress = (distanceFromStart - startDistance) / (maxDistance - startDistance);
    const difficultyMultiplier = Math.pow(progress, curve);
    
    // Interpolate between base and max spawn chance
    const baseChance = GAME_CONSTANTS.UFO.BASE_SPAWN_CHANCE;
    const maxChance = GAME_CONSTANTS.UFO.MAX_SPAWN_CHANCE;
    
    return baseChance + (maxChance - baseChance) * difficultyMultiplier;
  }

  /**
   * Generate bombs within a chunk
   * @param {number} startX - Chunk start X position
   * @param {number} endX - Chunk end X position
   */
  generateBombsInChunk(startX, endX) {
    let currentX = startX;
    
    while (currentX < endX) {
      // Check if we should spawn a bomb
      if (Math.random() < GAME_CONSTANTS.BOMB.SPAWN_CHANCE) {
        // Check minimum spacing from other bombs
        const tooClose = this.bombs.some(bomb => 
          Math.abs(bomb.x - currentX) < GAME_CONSTANTS.BOMB.MIN_SPACING
        );
        
        if (!tooClose) {
          // Spawn bomb on ground level (bottom edge at ground)
          const bombX = currentX + Math.random() * 200; // Random position within chunk
          const bombY = GAME_CONSTANTS.CANVAS.GROUND_Y - GAME_CONSTANTS.BOMB.BODY_HEIGHT / 2; // Bottom edge at ground
          
          const bomb = new Bomb(bombX, bombY);
          this.bombs.push(bomb);
          console.log(`Bomb created at (${bombX}, ${bombY})`);
        }
      }
      
      // Move to next potential spawn location
      currentX += GAME_CONSTANTS.BOMB.MIN_SPACING;
    }
  }

  /**
   * Create an obstacle of specified type
   * @param {number} x - X position
   * @param {string} type - 'platform' or 'overhead'
   * @returns {Obstacle} Created obstacle
   */
  createObstacle(x, type) {
    const obstacle = new Obstacle(x, type);
    return obstacle;
  }

  /**
   * Find platform near a given X position
   * @param {number} x - X position to search near
   * @returns {Obstacle|null} Nearby platform or null
   */
  findNearbyPlatform(x) {
    return this.obstacles.find(obstacle => 
      obstacle.type === 'platform' && 
      Math.abs(obstacle.x - x) < 100
    ) || null;
  }

  /**
   * Clean up content that's too far from player
   * @param {number} playerWorldX - Player's world X position
   */
  cleanupDistantContent(playerWorldX) {
    // Remove distant obstacles
    this.obstacles = this.obstacles.filter(obstacle => {
      const distance = Math.abs(obstacle.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Remove distant collectibles
    this.collectibles = this.collectibles.filter(collectible => {
      const distance = Math.abs(collectible.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Remove distant hazards
    this.hazards = this.hazards.filter(hazard => {
      const distance = Math.abs(hazard.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Remove distant moving platforms
    this.movingPlatforms = this.movingPlatforms.filter(platform => {
      const distance = Math.abs(platform.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Remove distant power-ups
    this.powerUps = this.powerUps.filter(powerUp => {
      const distance = Math.abs(powerUp.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Remove distant UFOs
    this.ufos = this.ufos.filter(ufo => {
      const distance = Math.abs(ufo.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Remove distant bombs
    this.bombs = this.bombs.filter(bomb => {
      const distance = Math.abs(bomb.x - playerWorldX);
      return distance < this.cleanupDistance;
    });
    
    // Clean up chunk tracking for very distant chunks
    const currentChunk = Math.floor(playerWorldX / this.chunkSize);
    const maxChunkDistance = Math.ceil(this.cleanupDistance / this.chunkSize);
    
    for (const chunkIndex of this.generatedChunks) {
      if (Math.abs(chunkIndex - currentChunk) > maxChunkDistance) {
        this.generatedChunks.delete(chunkIndex);
      }
    }
  }

  /**
   * Draw the infinite ground
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  drawGround(ctx) {
    const bounds = this.camera.getBounds();
    
    // Draw ground line across the visible area
    ctx.strokeStyle = GAME_CONSTANTS.COLORS.FLOOR;
    ctx.lineWidth = GAME_CONSTANTS.DRAWING.FLOOR_LINE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(0, GAME_CONSTANTS.CANVAS.GROUND_Y);
    ctx.lineTo(GAME_CONSTANTS.CANVAS.WIDTH, GAME_CONSTANTS.CANVAS.GROUND_Y);
    ctx.stroke();
  }

  /**
   * Draw all world objects (obstacles and collectibles)
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  draw(ctx) {
    // Draw ground
    this.drawGround(ctx);
    
    // Draw obstacles that are visible
    this.obstacles.forEach(obstacle => {
      if (this.camera.isVisible(obstacle.x, obstacle.width)) {
        obstacle.draw(ctx, this.camera);
      }
    });
    
    // Draw collectibles that are visible
    this.collectibles.forEach(collectible => {
      if (this.camera.isVisible(collectible.x, collectible.radius * 2)) {
        collectible.draw(ctx, this.camera);
      }
    });
    
    // Draw hazards that are visible
    this.hazards.forEach(hazard => {
      if (this.camera.isVisible(hazard.x, hazard.width || 100)) {
        hazard.draw(ctx, this.camera);
      }
    });
    
    // Draw moving platforms that are visible
    this.movingPlatforms.forEach(platform => {
      if (this.camera.isVisible(platform.x, platform.width)) {
        platform.draw(ctx, this.camera);
      }
    });
    
    // Draw power-ups that are visible
    this.powerUps.forEach(powerUp => {
      if (this.camera.isVisible(powerUp.x, powerUp.radius * 2)) {
        powerUp.draw(ctx, this.camera);
      }
    });
    
    // Draw UFOs that are visible
    this.ufos.forEach(ufo => {
      if (this.camera.isVisible(ufo.x, ufo.width)) {
        ufo.draw(ctx, this.camera);
      }
    });
    
    // Draw bombs that are visible
    this.bombs.forEach(bomb => {
      if (this.camera.isVisible(bomb.x, bomb.width)) {
        bomb.draw(ctx, this.camera);
      }
    });
  }

  /**
   * Get all obstacles for collision detection
   * @returns {Array} Array of obstacles
   */
  getObstacles() {
    return this.obstacles;
  }

  /**
   * Get all collectibles for collision detection
   * @returns {Array} Array of collectibles
   */
  getCollectibles() {
    return this.collectibles;
  }

  /**
   * Get all hazards for collision detection
   * @returns {Array} Array of hazards
   */
  getHazards() {
    return this.hazards;
  }

  /**
   * Get all moving platforms for collision detection
   * @returns {Array} Array of moving platforms
   */
  getMovingPlatforms() {
    return this.movingPlatforms;
  }

  /**
   * Get all power-ups for collision detection
   * @returns {Array} Array of power-ups
   */
  getPowerUps() {
    return this.powerUps;
  }

  /**
   * Get all UFOs for collision detection
   * @returns {Array} Array of UFOs
   */
  getUFOs() {
    return this.ufos;
  }

  /**
   * Get all bombs for collision detection
   * @returns {Array} Array of bombs
   */
  getBombs() {
    return this.bombs;
  }

  /**
   * Remove a collectible from the world (when collected)
   * @param {WorldCollectible} collectible - Collectible to remove
   */
  removeCollectible(collectible) {
    const index = this.collectibles.indexOf(collectible);
    if (index > -1) {
      this.collectibles.splice(index, 1);
    }
  }

  /**
   * Remove a power-up from the world (when collected)
   * @param {PowerUp} powerUp - Power-up to remove
   */
  removePowerUp(powerUp) {
    const index = this.powerUps.indexOf(powerUp);
    if (index > -1) {
      this.powerUps.splice(index, 1);
    }
  }
}
