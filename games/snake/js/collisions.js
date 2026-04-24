// Helper functions for collision detection

// Using shared utils functions for basic collision detection
function rectsOverlap(r1, r2) {
  return SnakeUtils.rectsOverlap(r1, r2);
}

function pointInRect(p, r) {
  return SnakeUtils.pointInRect(p, r);
}

function snakeOverlapsObstacle(snake, obs) {
  if (!snake) return false;
  return snake.some(seg => pointInRect(seg, obs));
}

function occupiesPosition(x, y) {
  // Check obstacles
  for (const obs of obstacles) {
    if (x >= obs.x && x < obs.x + obs.width &&
        y >= obs.y && y < obs.y + obs.height) return true;
  }
  
  // Check player snake - only if player is alive
  if (playerAlive && playerSnake && playerSnake.some(s => s.x === x && s.y === y)) return true;
  
  // Check all AI snakes
  for (const snake of aiSnakes) {
    if (snake.alive && snake.body.some(s => s.x === x && s.y === y)) return true;
  }
  
  // Check foods
  if (foods.some(f => f.x === x && f.y === y)) return true;
  
  return false;
}

// Bresenham's line algorithm to get all grid cells between two points
function getPointsOnLine(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  while (true) {
    points.push({x: x0, y: y0});
    
    if (x0 === x1 && y0 === y1) break;
    
    const e2 = 2 * err;
    if (e2 > -dy) {
      if (x0 === x1) break;
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      if (y0 === y1) break;
      err += dx;
      y0 += sy;
    }
  }
  
  return points;
}

// Handles wrapping for collision detection paths
function getWrappedPoints(prevX, prevY, newX, newY) {
  // If wrapping is disabled, just return the direct line
  if (!wrapEnabled) {
    return getPointsOnLine(prevX, prevY, newX, newY);
  }
  
  // Calculate the movement deltas
  const deltaX = newX - prevX;
  const deltaY = newY - prevY;
  
  // If no significant movement or normal adjacent movement, return direct line
  if (Math.abs(deltaX) <= 1 && Math.abs(deltaY) <= 1) {
    return getPointsOnLine(prevX, prevY, newX, newY);
  }
  
  // Handle wrapping case - check if we wrapped around the board
  let wrapX = false, wrapY = false;
  let effectiveDeltaX = deltaX, effectiveDeltaY = deltaY;
  
  // Determine if we wrapped in X direction
  if (Math.abs(deltaX) > TILE_COUNT / 2) {
    wrapX = true;
    // Calculate the shorter path around the wrap
    if (deltaX > 0) {
      // Wrapped from left to right (went through left edge)
      effectiveDeltaX = deltaX - TILE_COUNT;
    } else {
      // Wrapped from right to left (went through right edge)
      effectiveDeltaX = deltaX + TILE_COUNT;
    }
  }
  
  // Determine if we wrapped in Y direction
  if (Math.abs(deltaY) > TILE_COUNT / 2) {
    wrapY = true;
    // Calculate the shorter path around the wrap
    if (deltaY > 0) {
      // Wrapped from top to bottom (went through top edge)
      effectiveDeltaY = deltaY - TILE_COUNT;
    } else {
      // Wrapped from bottom to top (went through bottom edge)
      effectiveDeltaY = deltaY + TILE_COUNT;
    }
  }
  
  // If no wrapping detected, return direct path
  if (!wrapX && !wrapY) {
    return getPointsOnLine(prevX, prevY, newX, newY);
  }
  
  console.log(`Wrapping detected: from (${prevX},${prevY}) to (${newX},${newY}), effective delta: (${effectiveDeltaX},${effectiveDeltaY})`);
  
  // Handle wrapping path calculation
  const allPoints = [];
  
  if (wrapX && !wrapY) {
    // X-axis wrapping only
    const exitX = effectiveDeltaX < 0 ? 0 : TILE_COUNT - 1;
    const entryX = effectiveDeltaX < 0 ? TILE_COUNT - 1 : 0;
    
    // Path to edge
    const pathToEdge = getPointsOnLine(prevX, prevY, exitX, prevY);
    allPoints.push(...pathToEdge);
    
    // Path from opposite edge
    const pathFromEdge = getPointsOnLine(entryX, prevY, newX, newY);
    allPoints.push(...pathFromEdge.slice(1)); // Skip duplicate point
    
  } else if (wrapY && !wrapX) {
    // Y-axis wrapping only
    const exitY = effectiveDeltaY < 0 ? 0 : TILE_COUNT - 1;
    const entryY = effectiveDeltaY < 0 ? TILE_COUNT - 1 : 0;
    
    // Path to edge
    const pathToEdge = getPointsOnLine(prevX, prevY, prevX, exitY);
    allPoints.push(...pathToEdge);
    
    // Path from opposite edge
    const pathFromEdge = getPointsOnLine(prevX, entryY, newX, newY);
    allPoints.push(...pathFromEdge.slice(1)); // Skip duplicate point
    
  } else {
    // Both X and Y wrapping (diagonal wrap)
    const exitX = effectiveDeltaX < 0 ? 0 : TILE_COUNT - 1;
    const exitY = effectiveDeltaY < 0 ? 0 : TILE_COUNT - 1;
    const entryX = effectiveDeltaX < 0 ? TILE_COUNT - 1 : 0;
    const entryY = effectiveDeltaY < 0 ? TILE_COUNT - 1 : 0;
    
    // For diagonal wrapping, we need to consider the path through the corner
    // Path to the exit corner
    const pathToCorner = getPointsOnLine(prevX, prevY, exitX, exitY);
    allPoints.push(...pathToCorner);
    
    // Path from entry corner to destination
    const pathFromCorner = getPointsOnLine(entryX, entryY, newX, newY);
    allPoints.push(...pathFromCorner.slice(1)); // Skip duplicate point
  }
  
  console.log(`Wrapping path contains ${allPoints.length} points`);
  return allPoints;
}

function collidesWithObstacles(head, prevX = null, prevY = null, checkPath = false) {
  // Check for wall collisions if wrapping is disabled
  if (!wrapEnabled) {
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
      return true;
    }
  }
  
  // Standard collision check for the head position
  for (const obs of obstacles) {
    if (head.x >= obs.x && head.x < obs.x + obs.width &&
        head.y >= obs.y && head.y < obs.y + obs.height) return true;
  }
  
  // Enhanced path checking for high-speed movement
  if (checkPath && prevX !== null && prevY !== null && (prevX !== head.x || prevY !== head.y)) {
    // Get all points along the path from previous to current position
    const path = getWrappedPoints(prevX, prevY, head.x, head.y);
    
    // Check every point along the path for obstacle collision
    for (let i = 1; i < path.length; i++) { // Start from 1 to skip starting position
      const point = path[i];
      
      // Check wall collisions if wrapping is disabled
      if (!wrapEnabled) {
        if (point.x < 0 || point.x >= TILE_COUNT || point.y < 0 || point.y >= TILE_COUNT) {
          return true;
        }
      }
      
      // Check if this point collides with any obstacle
      for (const obs of obstacles) {
        if (point.x >= obs.x && point.x < obs.x + obs.width &&
            point.y >= obs.y && point.y < obs.y + obs.height) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function collidesWithSnake(head, snake, startIndex = 1, prevX = null, prevY = null, checkPath = false) {
  // Standard collision check for the head position
  for (let i = startIndex; i < snake.length; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return true;
  }
  
  // Enhanced path checking for high-speed movement
  if (checkPath && prevX !== null && prevY !== null && (prevX !== head.x || prevY !== head.y)) {
    // Get all points along the path from previous to current position
    const path = getWrappedPoints(prevX, prevY, head.x, head.y);
    
    // Check every point along the path (including intermediate points)
    for (let i = 1; i < path.length; i++) { // Start from 1 to skip starting position
      const point = path[i];
      
      // Check if this point collides with any snake segment
      for (let j = startIndex; j < snake.length; j++) {
        if (snake[j].x === point.x && snake[j].y === point.y) {
          console.log(`Path collision detected at (${point.x},${point.y}) with snake segment ${j}`);
          return true;
        }
      }
    }
  }
  
  return false;
}

function collidesWithPlayer(head, prevX = null, prevY = null, checkPath = false) {
  // Only check collision with player if player is alive
  if (!playerAlive || !playerSnake || playerSnake.length === 0) return false;
  
  // Standard collision check
  for (const segment of playerSnake) {
    if (segment.x === head.x && segment.y === head.y) return true;
  }
  
  // Enhanced path checking for high-speed movement
  if (checkPath && prevX !== null && prevY !== null && (prevX !== head.x || prevY !== head.y)) {
    // Get all points along the path
    const path = getWrappedPoints(prevX, prevY, head.x, head.y);
    
    // Check every point along the path
    for (let i = 1; i < path.length; i++) { // Start from 1 to skip starting position
      const point = path[i];
      
      // Check if this point collides with the player
      for (const segment of playerSnake) {
        if (segment.x === point.x && segment.y === point.y) {
          console.log(`Path collision detected at (${point.x},${point.y}) with player segment`);
          return true;
        }
      }
    }
  }
  
  return false;
}

function collidesWithAiSnakes(head, skipIndex = -1, prevX = null, prevY = null, checkPath = false) {
  // Standard collision check
  for (let i = 0; i < aiSnakes.length; i++) {
    if (i === skipIndex || !aiSnakes[i].alive) continue;
    for (const segment of aiSnakes[i].body) {
      if (segment.x === head.x && segment.y === head.y) return true;
    }
  }
  
  // Enhanced path checking for high-speed movement
  if (checkPath && prevX !== null && prevY !== null && (prevX !== head.x || prevY !== head.y)) {
    // Get all points along the path
    const path = getWrappedPoints(prevX, prevY, head.x, head.y);
    
    // Check every point along the path
    for (let i = 1; i < path.length; i++) { // Start from 1 to skip starting position
      const point = path[i];
      
      // Check if this point collides with any AI snake
      for (let j = 0; j < aiSnakes.length; j++) {
        if (j === skipIndex || !aiSnakes[j].alive) continue;        
        for (const segment of aiSnakes[j].body) {
          if (segment.x === point.x && segment.y === point.y) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

function checkPlayerCollisions() {
  if (!playerAlive) return false; // Skip if player is already dead
  
  const head = playerSnake[0];
  const prevX = head.prevX;
  const prevY = head.prevY;
  
  // Enhanced path checking logic for high-speed movement
  // Check path if we moved more than one grid cell OR if we have high speed
  const moveDistance = Math.abs(head.x - prevX) + Math.abs(head.y - prevY);
  const currentSpeed = 1 + playerPermanentMoveRate + playerTempMoveRate;
  
  // Always check path for high-speed movement (>2 moves/second effective rate)
  // or when we actually moved more than 1 grid cell
  const checkPath = moveDistance > 1 || currentSpeed > 2;
    
  // Check self-collision with enhanced path detection
  if (collidesWithSnake(head, playerSnake, 1, prevX, prevY, checkPath)) {
    killPlayerSnake();    
    EventSystem.emit('playerCollision', { type: 'self' });   
    return true; // Collision detected
  }
  
  // Check collision with obstacles and walls
  if (collidesWithObstacles(head, prevX, prevY, checkPath)) {
    killPlayerSnake();    
    EventSystem.emit('playerCollision', { type: 'obstacle' });    
    return true; // Collision detected
  }
  
  // Check collision with any AI snake
  if (collidesWithAiSnakes(head, -1, prevX, prevY, checkPath)) {
    killPlayerSnake();
    EventSystem.emit('playerCollision', { type: 'ai' });
    return true; // Collision detected
  }  
  return false; // No collision
}

function checkAiCollisions(indexToCheck = -1) {
  let collisionDetected = false;
  
  // If an index is specified, only check that snake
  if (indexToCheck >= 0) {
    if (aiSnakes[indexToCheck] && aiSnakes[indexToCheck].alive) {
      const snake = aiSnakes[indexToCheck];
      const head = snake.body[0];
      const prevX = head.prevX;
      const prevY = head.prevY;
      
      // Enhanced path checking logic for AI snakes
      const moveDistance = Math.abs(head.x - prevX) + Math.abs(head.y - prevY);
      const currentSpeed = 1 + snake.permanentMoveRate + snake.tempMoveRate;
      
      // Always check path for high-speed movement or large movement distance
      const checkPath = moveDistance > 1 || currentSpeed > 2;
      
      // Check self-collision
      if (collidesWithSnake(head, snake.body, 1, prevX, prevY, checkPath)) {
        killAiSnake(indexToCheck);
        EventSystem.emit('aiCollision', { index: indexToCheck, type: 'self' });
        return true; // Collision detected
      }
      
      // Check collision with obstacles
      if (collidesWithObstacles(head, prevX, prevY, checkPath)) {
        killAiSnake(indexToCheck);
        EventSystem.emit('aiCollision', { index: indexToCheck, type: 'obstacle' });
        return true; // Collision detected
      }
      
      // Check collision with player
      if (collidesWithPlayer(head, prevX, prevY, checkPath)) {
        killAiSnake(indexToCheck);
        EventSystem.emit('aiCollision', { index: indexToCheck, type: 'player' });
        return true; // Collision detected
      }
      
      // Check collision with other AI snakes
      if (collidesWithAiSnakes(head, indexToCheck, prevX, prevY, checkPath)) {
        killAiSnake(indexToCheck);
        EventSystem.emit('aiCollision', { index: indexToCheck, type: 'otherAi' });
        return true; // Collision detected
      }
    }
    return false; // No collision
  }
  
  // Otherwise check all snakes
  for (let i = 0; i < aiSnakes.length; i++) {
    if (!aiSnakes[i].alive) continue;
    
    const snake = aiSnakes[i];
    const head = snake.body[0];
    const prevX = head.prevX;
    const prevY = head.prevY;
    
    // Enhanced path checking logic
    const moveDistance = Math.abs(head.x - prevX) + Math.abs(head.y - prevY);
    const currentSpeed = 1 + snake.permanentMoveRate + snake.tempMoveRate;
    
    // Always check path for high-speed movement or large movement distance
    const checkPath = moveDistance > 1 || currentSpeed > 2;
    
    // Check self-collision
    if (collidesWithSnake(head, snake.body, 1, prevX, prevY, checkPath)) {
      killAiSnake(i);
      
      // Emit AI collision event
      if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
        EventSystem.emit('aiCollision', { index: i, type: 'self' });
      }
      collisionDetected = true;
      continue;
    }
    
    // Check collision with obstacles
    if (collidesWithObstacles(head, prevX, prevY, checkPath)) {
      killAiSnake(i);
      
      // Emit AI collision event
      if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
        EventSystem.emit('aiCollision', { index: i, type: 'obstacle' });
      }
      collisionDetected = true;
      continue;
    }
    
    // Check collision with player
    if (collidesWithPlayer(head, prevX, prevY, checkPath)) {
      killAiSnake(i);
      
      // Emit AI collision event
      if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
        EventSystem.emit('aiCollision', { index: i, type: 'player' });
      }
      collisionDetected = true;
      continue;
    }
    
    // Check collision with other AI snakes
    if (collidesWithAiSnakes(head, i, prevX, prevY, checkPath)) {
      killAiSnake(i);
      
      // Emit AI collision event
      if (typeof EventSystem !== 'undefined' && EventSystem.emit) {
        EventSystem.emit('aiCollision', { index: i, type: 'otherAi' });
      }
      collisionDetected = true;
      continue;
    }
  }
  
  return collisionDetected;
}