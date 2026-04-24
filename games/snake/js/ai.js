// AI Snake Logic with Difficulty System

/**
 * Calculate distance between two points with wrapping support
 */
function calculateDistance(pos1, pos2) {
  let dx = Math.abs(pos1.x - pos2.x);
  let dy = Math.abs(pos1.y - pos2.y);
  
  if (wrapEnabled) {
    dx = Math.min(dx, TILE_COUNT - dx);
    dy = Math.min(dy, TILE_COUNT - dy);
  }
  
  return dx + dy;
}

/**
 * Check if AI snake is stuck in a small area and needs exploration
 */
function isSnakeStuckInSmallArea(snakeIndex) {
  const snake = aiSnakes[snakeIndex];
  const history = aiTrapHistory[snakeIndex] || [];
  
  if (history.length < 10) return false;
  
  // Get unique positions from recent history
  const uniquePositions = new Set(history.slice(-10));
  
  // If we've been in fewer than 6 unique positions in the last 10 moves, we're likely stuck
  return uniquePositions.size < 6;
}

/**
 * Check if a position will lead to self-encirclement
 */
function willCauseEncirclement(snakeIndex, testPosition, lookaheadDepth) {
  const snake = aiSnakes[snakeIndex];
  const config = AI_DIFFICULTY_CONFIG[AI_DIFFICULTY];
  
  if (lookaheadDepth <= 0) return false;
  
  // Create a temporary snake with the new position
  const tempSnake = [...snake.body];
  tempSnake.unshift(testPosition);
  if (tempSnake.length > snake.body.length) {
    tempSnake.pop(); // Remove tail if not growing
  }
  
  // Count available moves from this position
  const possibleDirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
  ];
  
  let safeMoves = 0;
  for (const dir of possibleDirs) {
    const nextPos = {
      x: wrapEnabled ? (testPosition.x + dir.x + TILE_COUNT) % TILE_COUNT : testPosition.x + dir.x,
      y: wrapEnabled ? (testPosition.y + dir.y + TILE_COUNT) % TILE_COUNT : testPosition.y + dir.y
    };
    
    if (isPositionSafe(nextPos, snakeIndex, tempSnake)) {
      safeMoves++;
    }
  }
  
  // If we have fewer safe moves than the lookahead depth suggests, it might be encirclement
  return safeMoves < Math.max(1, Math.floor(config.selfAvoidanceLookahead / 3));
}

/**
 * Check if a position is safe for movement
 */
function isPositionSafe(pos, snakeIndex, customSnake = null) {
  // Check bounds if wrapping is disabled
  if (!wrapEnabled && (pos.x < 0 || pos.x >= TILE_COUNT || pos.y < 0 || pos.y >= TILE_COUNT)) {
    return false;
  }
  
  const snake = customSnake || aiSnakes[snakeIndex];
  
  // Check collision with own body (skip head)
  if (collidesWithSnake(pos, snake.body || snake, 1)) return false;
  
  // Check collision with player
  if (collidesWithPlayer(pos)) return false;
  
  // Check collision with other AI snakes
  if (collidesWithAiSnakes(pos, snakeIndex)) return false;
  
  // Check collision with obstacles
  if (collidesWithObstacles(pos)) return false;
  
  return true;
}

/**
 * Advanced pathfinding with difficulty-based accuracy
 */
function findPathToFood(snakeIndex, targetFood) {
  const snake = aiSnakes[snakeIndex];
  const head = snake.body[0];
  const config = AI_DIFFICULTY_CONFIG[AI_DIFFICULTY];
  
  const possibleDirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
  ];
  
  let bestDir = null;
  let bestDistance = Infinity;
  
  for (const dir of possibleDirs) {
    // Don't allow 180-degree turns
    if (dir.x === -snake.dir.x && dir.y === -snake.dir.y) continue;
    
    const nextPos = {
      x: wrapEnabled ? (head.x + dir.x + TILE_COUNT) % TILE_COUNT : head.x + dir.x,
      y: wrapEnabled ? (head.y + dir.y + TILE_COUNT) % TILE_COUNT : head.y + dir.y
    };
    
    if (!isPositionSafe(nextPos, snakeIndex)) continue;
    
    // Check for encirclement based on difficulty
    if (willCauseEncirclement(snakeIndex, nextPos, config.selfAvoidanceLookahead)) {
      continue;
    }
    
    const distance = calculateDistance(nextPos, targetFood);
    
    // Apply difficulty-based accuracy
    const shouldChooseOptimal = Math.random() < config.pathfindingAccuracy;
    
    if (shouldChooseOptimal && distance < bestDistance) {
      bestDistance = distance;
      bestDir = dir;
    } else if (!shouldChooseOptimal && distance > bestDistance * 0.8) {
      // Sometimes choose a slightly suboptimal path for easier difficulties
      bestDir = dir;
    }
  }
  
  return bestDir;
}

/**
 * Detect potential traps and blocking opportunities
 */
function findAggressiveMove(snakeIndex) {
  const snake = aiSnakes[snakeIndex];
  const head = snake.body[0];
  const config = AI_DIFFICULTY_CONFIG[AI_DIFFICULTY];
  
  // Check if we should be aggressive based on difficulty
  if (Math.random() > config.aggressiveness) return null;
  
  // Check cooldown
  const now = Date.now();
  if (aiAggressionCooldown[snakeIndex] > now) return null;
  
  const possibleDirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
  ];
  
  for (const dir of possibleDirs) {
    if (dir.x === -snake.dir.x && dir.y === -snake.dir.y) continue;
    
    const nextPos = {
      x: wrapEnabled ? (head.x + dir.x + TILE_COUNT) % TILE_COUNT : head.x + dir.x,
      y: wrapEnabled ? (head.y + dir.y + TILE_COUNT) % TILE_COUNT : head.y + dir.y
    };
    
    if (!isPositionSafe(nextPos, snakeIndex)) continue;
    
    // Check if this move could block the player or another AI
    const targetPositions = [];
    
    // Add player head if alive
    if (playerAlive && playerSnake.length > 0) {
      targetPositions.push(playerSnake[0]);
    }
    
    // Add other AI heads
    for (let i = 0; i < aiSnakes.length; i++) {
      if (i !== snakeIndex && aiSnakes[i].alive) {
        targetPositions.push(aiSnakes[i].body[0]);
      }
    }
    
    // Check if we can get close to block a target
    for (const target of targetPositions) {
      const distanceToTarget = calculateDistance(nextPos, target);
      
      if (distanceToTarget <= config.trapDetectionDepth) {
        // Set cooldown for aggression
        aiAggressionCooldown[snakeIndex] = now + (2000 / config.aggressiveness);
        return dir;
      }
    }
  }
  
  return null;
}

/**
 * Enhanced AI decision making with difficulty levels
 */
function aiChooseDir(snakeIndex) {
  const snake = aiSnakes[snakeIndex];
  if (!snake.alive) return snake.dir;
  
  const head = snake.body[0];
  const history = aiPositionHistories[snakeIndex];
  const config = AI_DIFFICULTY_CONFIG[AI_DIFFICULTY];
  const now = Date.now();
  
  // Initialize AI state if needed
  if (!aiLastDecisionTime[snakeIndex]) {
    aiLastDecisionTime[snakeIndex] = 0;
    aiAggressionCooldown[snakeIndex] = 0;
    aiTrapHistory[snakeIndex] = [];
  }
  
  // Apply reaction delay based on difficulty
  if (now - aiLastDecisionTime[snakeIndex] < config.reactionDelay) {
    return snake.dir; // Keep current direction
  }
  
  aiLastDecisionTime[snakeIndex] = now;
  
  // Add current position to history
  history.push(`${head.x},${head.y}`);
  if (history.length > MAX_HISTORY) history.shift();
  
  // Debug logging for AI behavior (can be disabled in production)
  if (Math.random() < 0.01) { // 1% chance to log for debugging
    console.log(`AI ${snakeIndex} (${AI_DIFFICULTY}): pos(${head.x},${head.y}), foods:${foods.length}, history:${history.length}`);
  }

  const possibleDirs = [
    { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }
  ];

  // Filter safe directions with food-focused logic
  const safeDirs = possibleDirs.filter(d => {
    const nx = head.x + d.x;
    const ny = head.y + d.y;
    const nextPos = wrapEnabled ? {
      x: (nx + TILE_COUNT) % TILE_COUNT,
      y: (ny + TILE_COUNT) % TILE_COUNT
    } : { x: nx, y: ny };

    // Don't allow 180-degree turns
    if (d.x === -snake.dir.x && d.y === -snake.dir.y) return false;
    
    // Check if position is safe
    if (!isPositionSafe(nextPos, snakeIndex)) return false;
    
    // For easy difficulty, be less strict about encirclement to avoid getting stuck
    if (config.selfAvoidanceLookahead > 1) {
      if (willCauseEncirclement(snakeIndex, nextPos, config.selfAvoidanceLookahead)) {
        // Check if this move gets us closer to food - if so, take the risk
        if (foods.length > 0 && Math.random() < config.riskTolerance) {
          const currentMinDist = Math.min(...foods.map(f => calculateDistance(head, f)));
          const nextMinDist = Math.min(...foods.map(f => calculateDistance(nextPos, f)));
          if (nextMinDist < currentMinDist) {
            return true; // Take the risk for food
          }
        }
        return false;
      }
    }
    
    return true;
  });

  if (safeDirs.length === 0) return snake.dir;

  // Enhanced loop detection based on difficulty
  let loopDetected = false;
  if (history.length >= config.trapDetectionDepth) {
    const recentPositions = history.slice(-config.trapDetectionDepth).join('|');
    const earlierPositions = history.slice(0, -config.trapDetectionDepth).join('|');
    if (earlierPositions.includes(recentPositions)) {
      loopDetected = true;
    }
  }

  // Try aggressive moves first (blocking, trapping)
  const aggressiveMove = findAggressiveMove(snakeIndex);
  if (aggressiveMove && safeDirs.some(d => d.x === aggressiveMove.x && d.y === aggressiveMove.y)) {
    return aggressiveMove;
  }

  // Enhanced loop detection with smarter alternatives
  if (loopDetected) {
    console.log(`AI ${snakeIndex} detected loop, breaking out...`);
    
    // Try multiple strategies to break the loop
    const strategies = [
      // Strategy 1: Avoid recent positions
      safeDirs.filter(d => {
        const np = { 
          x: wrapEnabled ? (head.x + d.x + TILE_COUNT) % TILE_COUNT : head.x + d.x,
          y: wrapEnabled ? (head.y + d.y + TILE_COUNT) % TILE_COUNT : head.y + d.y
        };
        return !history.includes(`${np.x},${np.y}`);
      }),
      
      // Strategy 2: Move toward food even if it means revisiting positions
      safeDirs.filter(d => {
        if (foods.length === 0) return false;
        const np = { 
          x: wrapEnabled ? (head.x + d.x + TILE_COUNT) % TILE_COUNT : head.x + d.x,
          y: wrapEnabled ? (head.y + d.y + TILE_COUNT) % TILE_COUNT : head.y + d.y
        };
        const currentMinDist = Math.min(...foods.map(f => calculateDistance(head, f)));
        const nextMinDist = Math.min(...foods.map(f => calculateDistance(np, f)));
        return nextMinDist < currentMinDist;
      }),
      
      // Strategy 3: Change direction completely (perpendicular moves)
      safeDirs.filter(d => {
        return d.x !== snake.dir.x && d.y !== snake.dir.y;
      })
    ];
    
    // Try each strategy in order of preference
    for (const strategy of strategies) {
      if (strategy.length > 0) {
        // Choose the best move from this strategy
        if (foods.length > 0 && Math.random() < config.foodPriority) {
          let bestDir = strategy[0];
          let bestScore = -Infinity;
          
          for (const dir of strategy) {
            const nextPos = {
              x: wrapEnabled ? (head.x + dir.x + TILE_COUNT) % TILE_COUNT : head.x + dir.x,
              y: wrapEnabled ? (head.y + dir.y + TILE_COUNT) % TILE_COUNT : head.y + dir.y
            };
            
            let score = 0;
            for (const food of foods) {
              const dist = calculateDistance(nextPos, food);
              score += Math.max(0, 20 - dist);
            }
            
            if (score > bestScore) {
              bestScore = score;
              bestDir = dir;
            }
          }
          return bestDir;
        } else {
          return strategy[Math.floor(Math.random() * strategy.length)];
        }
      }
    }
    
    // If all strategies fail, just pick any safe direction
    console.log(`AI ${snakeIndex} couldn't break loop, using random safe direction`);
  }

  // Check if snake is stuck in a small area and needs exploration
  const isStuck = isSnakeStuckInSmallArea(snakeIndex);
  if (isStuck) {
    console.log(`AI ${snakeIndex} is stuck in small area, prioritizing exploration`);
    
    // When stuck, prioritize moves that lead to unexplored areas
    const explorationDirs = safeDirs.filter(d => {
      const np = { 
        x: wrapEnabled ? (head.x + d.x + TILE_COUNT) % TILE_COUNT : head.x + d.x,
        y: wrapEnabled ? (head.y + d.y + TILE_COUNT) % TILE_COUNT : head.y + d.y
      };
      return !history.includes(`${np.x},${np.y}`);
    });
    
    if (explorationDirs.length > 0) {
      // Choose exploration direction that also moves toward food if possible
      if (foods.length > 0) {
        let bestExplorationDir = explorationDirs[0];
        let bestScore = -Infinity;
        
        for (const dir of explorationDirs) {
          const nextPos = {
            x: wrapEnabled ? (head.x + dir.x + TILE_COUNT) % TILE_COUNT : head.x + dir.x,
            y: wrapEnabled ? (head.y + dir.y + TILE_COUNT) % TILE_COUNT : head.y + dir.y
          };
          
          let score = 0;
          for (const food of foods) {
            const dist = calculateDistance(nextPos, food);
            score += Math.max(0, 20 - dist);
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestExplorationDir = dir;
          }
        }
        return bestExplorationDir;
      } else {
        return explorationDirs[Math.floor(Math.random() * explorationDirs.length)];
      }
    }
  }

  // Enhanced food-seeking with priority system
  if (foods.length > 0) {
    // Check if we should prioritize food based on difficulty
    if (Math.random() < config.foodPriority) {
      let bestDir = null;
      let bestScore = -Infinity;
      
      // Evaluate each safe direction based on food proximity and strategic value
      for (const d of safeDirs) {
        const nx = head.x + d.x;
        const ny = head.y + d.y;
        const np = wrapEnabled ? {
          x: (nx + TILE_COUNT) % TILE_COUNT,
          y: (ny + TILE_COUNT) % TILE_COUNT
        } : { x: nx, y: ny };
        
        let score = 0;
        
        // Calculate food proximity score (closer = better)
        for (const food of foods) {
          const distToFood = calculateDistance(np, food);
          const currentDist = calculateDistance(head, food);
          
          // Bonus for getting closer to food
          if (distToFood < currentDist) {
            score += (currentDist - distToFood) * 10;
          }
          
          // Base score based on proximity (closer food = higher score)
          score += Math.max(0, 20 - distToFood);
        }
        
        // Bonus for maintaining forward momentum (reduces jittery movement)
        if (d.x === snake.dir.x && d.y === snake.dir.y) {
          score += 5;
        }
        
        // Apply difficulty-based accuracy
        if (Math.random() < config.pathfindingAccuracy) {
          if (score > bestScore) {
            bestScore = score;
            bestDir = d;
          }
        } else {
          // Sometimes choose suboptimal move for easier difficulties
          if (score > bestScore * 0.7) {
            bestScore = score;
            bestDir = d;
          }
        }
      }
      
      if (bestDir) {
        return bestDir;
      }
    }
    
    // Fallback: simple distance-based selection with better logic
    let bestDir = safeDirs[0];
    let bestDistance = Infinity;
    
    for (const d of safeDirs) {
      const nx = head.x + d.x;
      const ny = head.y + d.y;
      const np = wrapEnabled ? {
        x: (nx + TILE_COUNT) % TILE_COUNT,
        y: (ny + TILE_COUNT) % TILE_COUNT
      } : { x: nx, y: ny };
      
      // Find closest food to this position
      let minDistToFood = Infinity;
      for (const food of foods) {
        const distToFood = calculateDistance(np, food);
        minDistToFood = Math.min(minDistToFood, distToFood);
      }
      
      if (minDistToFood < bestDistance) {
        bestDistance = minDistToFood;
        bestDir = d;
      }
    }
    
    return bestDir;
  }
  
  // No food available, just pick a safe direction
  return safeDirs[Math.floor(Math.random() * safeDirs.length)];
}