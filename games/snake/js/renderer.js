/**
 * Enhanced Renderer - Handles all drawing operations with focused high-speed movement support
 * 
 * Key Features:
 * - Dual animation timing system (normal vs high-speed)
 * - Sub-pixel precision rendering for ultra-smooth movement
 * - Speed-adaptive interpolation (linear for high speeds, smooth curves for normal speeds)
 * - Clean separation between normal and high-speed rendering logic
 * 
 * High-Speed Enhancement:
 * - Automatically detects when move rate > 2x
 * - Uses shorter animation intervals for smoother high-speed movement
 * - Linear interpolation prevents choppy movement at high speeds
 * - Normal speeds remain unchanged for consistent feel
 */

/**
 * Calculate smooth animation progress with high-speed enhancement
 */
function calculateAnimationProgress() {
  if (lastGameUpdateTime <= 0) {
    return 1;
  }
  
  const now = Date.now();
  const elapsed = now - lastGameUpdateTime;
  
  // Use actual measured interval for snake head animation (smooth movement)
  // But ensure it's not too large to prevent artifacts
  const effectiveInterval = Math.min(actualGameUpdateInterval || baseInterval, baseInterval * 2);
  
  // Calculate progress with timing compensation
  let progress = Math.min((elapsed + timingCompensation) / effectiveInterval, 1);
  
  // Apply easing for smoother movement
  if (progress < 1) {
    // Use smooth step function for natural acceleration/deceleration
    progress = progress * progress * (3 - 2 * progress);
  }
  
  return progress;
}

/**
 * Enhanced animation progress specifically for high-speed movement
 * This function provides better interpolation when the snake is moving very fast
 */
function calculateHighSpeedAnimationProgress() {
  if (lastGameUpdateTime <= 0) {
    return 1;
  }
  
  const now = Date.now();
  const elapsed = now - lastGameUpdateTime;
  
  // For high-speed movement, use a shorter effective interval to prevent choppy animation
  const currentMoveRate = 1 + (playerPermanentMoveRate || 0) + (playerTempMoveRate || 0);
  const isHighSpeed = currentMoveRate > 2;
  
  let effectiveInterval;
  if (isHighSpeed) {
    // Use a much shorter interval for high-speed movement to ensure smooth animation
    effectiveInterval = Math.min(actualGameUpdateInterval || baseInterval, baseInterval * 0.5);
  } else {
    // Normal interval for regular speeds
    effectiveInterval = Math.min(actualGameUpdateInterval || baseInterval, baseInterval * 2);
  }
  
  // Calculate progress with timing compensation
  let progress = Math.min((elapsed + timingCompensation) / effectiveInterval, 1);
  
  // Apply easing for smoother movement
  if (progress < 1) {
    if (isHighSpeed) {
      // Linear interpolation for high speeds to prevent choppy movement
      progress = progress;
    } else {
      // Smooth step function for normal speeds
      progress = progress * progress * (3 - 2 * progress);
    }
  }
  
  return progress;
}

/**
 * Enhanced snake segment drawing with sub-pixel precision
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} x - X position
 * @param {number} y - Y Position
 * @param {string} color - Segment color
 * @param {boolean} isHead - Whether this is a head segment
 * @param {number} animProgress - Animation progress (0-1)
 * @param {number} prevX - Previous X position (for animation)
 * @param {number} prevY - Previous Y Position (for animation)
 * @param {boolean} isWrapping - Whether the segment is wrapping around the edge
 * @param {boolean} hasSpeedBoost - Whether this snake has an active speed boost
 * @param {object} subPixelPos - Sub-pixel position for ultra-smooth movement
 */
function drawSnakeSegment(ctx, x, y, color, isHead = false, animProgress = 1, prevX = null, prevY = null, isWrapping = false, hasSpeedBoost = false, subPixelPos = null) {
  // Use sub-pixel position if available for ultra-smooth movement
  let drawX = x, drawY = y;
  
  if (subPixelPos && animProgress < 1) {
    // Use pre-calculated sub-pixel positions for maximum smoothness
    drawX = subPixelPos.x;
    drawY = subPixelPos.y;
  } else if (animProgress < 1 && prevX !== null && prevY !== null) {
    if (isWrapping) {
      // Handle wrapping animation properly
      let deltaX = x - prevX;
      let deltaY = y - prevY;
      
      // If the movement distance is greater than half the board width/height,
      // we wrapped around, so animate in the shorter direction
      if (Math.abs(deltaX) > TILE_COUNT / 2) {
        if (deltaX > 0) {
          // Wrapped from right to left, animate leftward through the edge
          deltaX = deltaX - TILE_COUNT;
        } else {
          // Wrapped from left to right, animate rightward through the edge  
          deltaX = deltaX + TILE_COUNT;
        }
      }
      
      if (Math.abs(deltaY) > TILE_COUNT / 2) {
        if (deltaY > 0) {
          // Wrapped from bottom to top, animate upward through the edge
          deltaY = deltaY - TILE_COUNT;
        } else {
          // Wrapped from top to bottom, animate downward through the edge
          deltaY = deltaY + TILE_COUNT;
        }
      }
      
      // Calculate the interpolated position with improved smoothing
      const smoothProgress = animProgress * animProgress * (3 - 2 * animProgress);
      drawX = prevX + deltaX * smoothProgress;
      drawY = prevY + deltaY * smoothProgress;
      
      // Handle edge cases where the animated position goes outside bounds
      // This creates the smooth wrapping effect
      if (drawX < 0) {
        drawX += TILE_COUNT;
      } else if (drawX >= TILE_COUNT) {
        drawX -= TILE_COUNT;
      }
      
      if (drawY < 0) {
        drawY += TILE_COUNT;
      } else if (drawY >= TILE_COUNT) {
        drawY -= TILE_COUNT;
      }
    } else {
      // Normal non-wrapping animation with improved smoothing
      const smoothProgress = animProgress * animProgress * (3 - 2 * animProgress);
      drawX = prevX + (x - prevX) * smoothProgress;
      drawY = prevY + (y - prevY) * smoothProgress;
    }
  }
  
  // Calculate segment dimensions
  let segmentWidth = SEGMENT_SIZE;
  let segmentHeight = SEGMENT_SIZE;
  
  // If this is a head with larger size, adjust dimensions
  if (isHead) {
    segmentWidth = SEGMENT_SIZE + 2;
    segmentHeight = SEGMENT_SIZE + 2;
  }
  
  // Calculate pixel positions for drawing with sub-pixel precision
  // Center both head and body segments within the same grid cell
  const baseCenterOffset = (GRID_SIZE - SEGMENT_SIZE) / 2; // Always center based on body size
  const pixelX = drawX * GRID_SIZE + baseCenterOffset;
  const pixelY = drawY * GRID_SIZE + baseCenterOffset;
  
  // For heads, we need to adjust the position to keep them centered despite being larger
  let adjustedPixelX = pixelX;
  let adjustedPixelY = pixelY;
  
  if (isHead) {
    // Offset the head by 1 pixel left and up to keep it centered in the grid cell
    adjustedPixelX = pixelX - 1;
    adjustedPixelY = pixelY - 1;
  }
  
  // Draw the main segment
  ctx.fillStyle = color;
  ctx.fillRect(adjustedPixelX, adjustedPixelY, segmentWidth, segmentHeight);
  
  // Add yellow border for speed boost (only on head)
  if (isHead && hasSpeedBoost) {
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 2;
    ctx.strokeRect(adjustedPixelX, adjustedPixelY, segmentWidth, segmentHeight);
  }
}

/**
 * Calculate sub-pixel positions for ultra-smooth movement
 */
function calculateSubPixelPositions(snake, animProgress, isPlayer = false) {
  if (!snake || snake.length === 0 || animProgress >= 1) {
    return null;
  }
  
  const positions = [];
  
  for (let i = 0; i < snake.length; i++) {
    const segment = snake[i];
    let drawX = segment.x;
    let drawY = segment.y;
    
    if (segment.prevX !== null && segment.prevY !== null) {
      if (segment.isWrapping) {
        // Handle wrapping with sub-pixel precision
        let deltaX = segment.x - segment.prevX;
        let deltaY = segment.y - segment.prevY;
        
        if (Math.abs(deltaX) > TILE_COUNT / 2) {
          deltaX = deltaX > 0 ? deltaX - TILE_COUNT : deltaX + TILE_COUNT;
        }
        
        if (Math.abs(deltaY) > TILE_COUNT / 2) {
          deltaY = deltaY > 0 ? deltaY - TILE_COUNT : deltaY + TILE_COUNT;
        }
        
        drawX = segment.prevX + deltaX * animProgress;
        drawY = segment.prevY + deltaY * animProgress;
        
        // Wrap positions
        if (drawX < 0) drawX += TILE_COUNT;
        else if (drawX >= TILE_COUNT) drawX -= TILE_COUNT;
        if (drawY < 0) drawY += TILE_COUNT;
        else if (drawY >= TILE_COUNT) drawY -= TILE_COUNT;
      } else {
        // Normal interpolation with sub-pixel precision
        drawX = segment.prevX + (segment.x - segment.prevX) * animProgress;
        drawY = segment.prevY + (segment.y - segment.prevY) * animProgress;
      }
    }
    
    positions.push({ x: drawX, y: drawY });
  }
  
  return positions;
}

/**
 * Draw the player snake with enhanced smoothness
 */
function drawPlayerSnake(animProgress = 1) {
  // During countdown, show the snake even if technically not "alive" yet
  // After countdown ends, only show if player is alive
  const shouldDraw = countdownActive || playerAlive;
  
  if (!shouldDraw || !playerSnake || playerSnake.length === 0) {
    return;
  }
  
  // Check if player has active speed boost (only relevant after countdown)
  const now = Date.now();
  const hasSpeedBoost = !countdownActive && playerSpeedBoostEnd > now;
  
  // Calculate sub-pixel positions for ultra-smooth movement
  const subPixelPositions = calculateSubPixelPositions(playerSnake, animProgress, true);
  
  // Draw the body segments first (in reverse so head is on top)
  for (let i = playerSnake.length - 1; i > 0; i--) {
    const segment = playerSnake[i];
    const subPixelPos = subPixelPositions ? subPixelPositions[i] : null;
    
    drawSnakeSegment(
      ctx, 
      segment.x, 
      segment.y, 
      playerBodyColor, 
      false,
      animProgress, 
      segment.prevX, 
      segment.prevY,
      segment.isWrapping,
      false, // Body segments don't show speed boost indicator
      subPixelPos
    );
  }
  
  // Draw the head on top with speed boost indicator
  const head = playerSnake[0];
  const headSubPixelPos = subPixelPositions ? subPixelPositions[0] : null;
  
  drawSnakeSegment(
    ctx, 
    head.x, 
    head.y, 
    playerHeadColor, 
    true,
    animProgress, 
    head.prevX, 
    head.prevY,
    head.isWrapping,
    hasSpeedBoost, // Show yellow border if speed boost is active
    headSubPixelPos
  );
}

/**
 * Draw all AI snakes with enhanced smoothness
 */
function drawAiSnakes(animProgress = 1) {
  const now = Date.now();
  
  for (let snakeIndex = 0; snakeIndex < aiSnakes.length; snakeIndex++) {
    const snake = aiSnakes[snakeIndex];
    
    // During countdown, show all snakes. After countdown, only show alive snakes
    const shouldDraw = countdownActive || snake.alive;
    
    if (!shouldDraw || !snake.body || snake.body.length === 0) continue;
    
    // Check if this AI snake has active speed boost (only relevant after countdown)
    const hasSpeedBoost = !countdownActive && snake.speedBoostEnd > now;
    
    // Calculate sub-pixel positions for this AI snake
    const subPixelPositions = calculateSubPixelPositions(snake.body, animProgress, false);
    
    // Draw body segments first (in reverse so head is on top)
    for (let i = snake.body.length - 1; i > 0; i--) {
      const segment = snake.body[i];
      const subPixelPos = subPixelPositions ? subPixelPositions[i] : null;
      
      drawSnakeSegment(
        ctx, 
        segment.x, 
        segment.y, 
        snake.bodyColor, 
        false,
        animProgress, 
        segment.prevX, 
        segment.prevY,
        segment.isWrapping,
        false, // Body segments don't show speed boost indicator
        subPixelPos
      );
    }
    
    // Draw the head on top with speed boost indicator
    const head = snake.body[0];
    const headSubPixelPos = subPixelPositions ? subPixelPositions[0] : null;
    
    drawSnakeSegment(
      ctx, 
      head.x, 
      head.y, 
      snake.headColor, 
      true,
      animProgress, 
      head.prevX, 
      head.prevY,
      head.isWrapping,
      hasSpeedBoost, // Show yellow border if speed boost is active
      headSubPixelPos
    );
  }
}

/**
 * Draw obstacles
 */
function drawObstacles() {
  ctx.fillStyle = THEME_COLORS.obstacleGreen;
  
  for (const obs of obstacles) {
    ctx.fillRect(
      obs.x * GRID_SIZE, 
      obs.y * GRID_SIZE, 
      obs.width * GRID_SIZE, 
      obs.height * GRID_SIZE
    );
  }
}

/**
 * Draw food items
 */
function drawFoods() {
  for (const food of foods) {
    // Get the correct color for the food type
    let foodColor;
    
    if (food.color) {
      foodColor = food.color; // Custom color (for remains)
    } else if (FOOD_TYPES[food.type]) {
      foodColor = FOOD_TYPES[food.type].color;
    } else {
      foodColor = 'white'; // Default fallback
    }
    
    ctx.fillStyle = foodColor;
    
    // Draw food as a circle
    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE / 2,
      food.y * GRID_SIZE + GRID_SIZE / 2,
      SEGMENT_SIZE / 2.5, // Slightly smaller than snake segments
      0, 
      2 * Math.PI
    );
    ctx.fill();
  }
}

/**
 * Draw the game border
 * Draws a green border if wrap is enabled, red if disabled.
 * Red border is thicker for better visibility.
 */
function drawBorder() {
  if (!window.wrapEnabled) {
    ctx.lineWidth = 7; // Thicker red border
    ctx.strokeStyle = 'red';
  } else {
    ctx.lineWidth = 3;
    ctx.strokeStyle = THEME_COLORS.baseGreen;
  }
  ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

/**
 * Draw the game grid (optional)
 */
function drawGrid() {
  // Uncomment to enable grid drawing
  // ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
  // ctx.lineWidth = 0.5;
  
  // // Draw vertical lines
  // for (let i = 0; i <= TILE_COUNT; i++) {
  //   ctx.beginPath();
  //   ctx.moveTo(i * GRID_SIZE, 0);
  //   ctx.lineTo(i * GRID_SIZE, CANVAS_SIZE);
  //   ctx.stroke();
  // }
  
  // // Draw horizontal lines
  // for (let i = 0; i <= TILE_COUNT; i++) {
  //   ctx.beginPath();
  //   ctx.moveTo(0, i * GRID_SIZE);
  //   ctx.lineTo(CANVAS_SIZE, i * GRID_SIZE);
  //   ctx.stroke();
  // }
}

/**
 * Enhanced drawGameState with improved animation timing
 */
function drawGameState() {
  if (!ctx) {
    return;
  }

  // Calculate animation progress - use high-speed version if moving fast
  const currentMoveRate = 1 + (playerPermanentMoveRate || 0) + (playerTempMoveRate || 0);
  const isHighSpeed = currentMoveRate > 2;
  const animProgress = isHighSpeed ? calculateHighSpeedAnimationProgress() : calculateAnimationProgress();

  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  
  // Draw background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  
  // Draw grid and border
  drawGrid();
  drawBorder();
  
  // Draw game elements
  drawObstacles();
  drawFoods();
  
  // Draw removed tails first (so they appear behind active snakes)
  drawRemovedTails(animProgress);
  
  // Draw active snakes with enhanced smoothness
  drawAiSnakes(animProgress);
  drawPlayerSnake(animProgress);
}


/**
 * Draw the snake preview for color selection
 */
function drawSnakePreview() {
  if (!previewCtx) return;
  
  // Clear the preview canvas
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // Draw black background
  previewCtx.fillStyle = 'black';
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  
  // Draw a mini snake with current colors
  const snakeSize = 10; // Size of each segment
  const headSize = snakeSize + 2; // Head is 2 pixels bigger
  const centerY = previewCanvas.height / 2;
  
  // Draw a snake head (properly centered)
  previewCtx.fillStyle = playerHeadColor;
  const headX = 35 - headSize / 2;
  const headY = centerY - headSize / 2;
  previewCtx.fillRect(headX, headY, headSize, headSize);
  
  // Draw snake body
  previewCtx.fillStyle = playerBodyColor;
  for (let i = 0; i < 10; i++) {
    previewCtx.fillRect(
      45 + i * snakeSize, 
      centerY - snakeSize / 2, 
      snakeSize - 1, 
      snakeSize
    );
  }
}

/**
 * Draw removed tail segments with enhanced animation
 */
function drawRemovedTails(animProgress = 1) {
  const now = Date.now();
  
  // Clean up expired tails and draw active ones
  for (let i = removedTails.length - 1; i >= 0; i--) {
    const tail = removedTails[i];
    const elapsed = now - tail.timestamp;
    
    // Remove tails that have completed their animation
    if (elapsed > tail.animationDuration) {
      removedTails.splice(i, 1);
      continue;
    }
    
    // Calculate animation progress for this tail with easing
    let tailAnimProgress = elapsed / tail.animationDuration;
    tailAnimProgress = tailAnimProgress * tailAnimProgress * (3 - 2 * tailAnimProgress);
    
    // Calculate the position for sliding animation
    let drawX = tail.x;
    let drawY = tail.y;
    
    if (tail.targetX !== undefined && tail.targetY !== undefined) {
      // Check if this is a wrapping movement
      const deltaX = tail.targetX - tail.prevX;
      const deltaY = tail.targetY - tail.prevY;
      const isWrappingTail = Math.abs(deltaX) > TILE_COUNT / 2 || Math.abs(deltaY) > TILE_COUNT / 2;
      
      if (isWrappingTail) {
        // Apply the same wrapping logic as the main snake segments
        let adjustedDeltaX = deltaX;
        let adjustedDeltaY = deltaY;
        
        // Handle X-axis wrapping
        if (Math.abs(deltaX) > TILE_COUNT / 2) {
          if (deltaX > 0) {
            // Wrapped from right to left, animate leftward through the edge
            adjustedDeltaX = deltaX - TILE_COUNT;
          } else {
            // Wrapped from left to right, animate rightward through the edge
            adjustedDeltaX = deltaX + TILE_COUNT;
          }
        }
        
        // Handle Y-axis wrapping
        if (Math.abs(deltaY) > TILE_COUNT / 2) {
          if (deltaY > 0) {
            // Wrapped from bottom to top, animate upward through the edge
            adjustedDeltaY = deltaY - TILE_COUNT;
          } else {
            // Wrapped from top to bottom, animate downward through the edge
            adjustedDeltaY = deltaY + TILE_COUNT;
          }
        }
        
        // Calculate the interpolated position with wrapping
        drawX = tail.prevX + adjustedDeltaX * tailAnimProgress;
        drawY = tail.prevY + adjustedDeltaY * tailAnimProgress;
        
        // Handle edge cases where the animated position goes outside bounds
        if (drawX < 0) {
          drawX += TILE_COUNT;
        } else if (drawX >= TILE_COUNT) {
          drawX -= TILE_COUNT;
        }
        
        if (drawY < 0) {
          drawY += TILE_COUNT;
        } else if (drawY >= TILE_COUNT) {
          drawY -= TILE_COUNT;
        }
      } else {
        // Normal non-wrapping tail animation
        drawX = tail.prevX + (tail.targetX - tail.prevX) * tailAnimProgress;
        drawY = tail.prevY + (tail.targetY - tail.prevY) * tailAnimProgress;
      }
    }
    
    // Draw the tail segment with the exact snake color (no opacity change)
    ctx.fillStyle = tail.color || '#666666';
    ctx.fillRect(
      drawX * GRID_SIZE + (GRID_SIZE - SEGMENT_SIZE) / 2, 
      drawY * GRID_SIZE + (GRID_SIZE - SEGMENT_SIZE) / 2, 
      SEGMENT_SIZE, 
      SEGMENT_SIZE
    );
  }
}