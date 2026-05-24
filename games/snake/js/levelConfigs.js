// levelConfigs.js
// This file contains all level configuration objects for the game.

// ObjectiveType Enum with Descriptions
const ObjectiveType = Object.freeze({
  SCORE: { value: "score", description: "Reach a target score by eating food." },
  SURVIVE: { value: "survive", description: "Be the last snake standing or survive against all opponents." },
  TIME_SURVIVE: { value: "time_survive", description: "Survive for a set amount of time." },
  EAT_FOOD: { value: "eat_food", description: "Eat a specific number of food items." }
});

// Make ObjectiveType globally available
window.ObjectiveType = ObjectiveType;

if (typeof window.LEVEL_CONFIGS === 'undefined') {
  window.LEVEL_CONFIGS = {
    1: {
      id: 1,
      name: "Classic Snake",
      description: "The original Snake experience - simple and pure!",
      type: "classic",
      difficulty: "⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 0,
        numAISnakes: 0, // Single player
        aiDifficulty: null,
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 500,
        foodTypes: {
          red: { grow: 1 },
          //orange: { grow: 1, speedInc: 0.25 },
          //yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 5
      },
      instructions: "Use arrow keys or WASD to control your snake. Eat food to grow and increase your score. Don't hit yourself!"
    },
    2: {
      id: 2,
      name: "More Food!",
      description: "More food to eat! - Grow more or increase speed",
      type: "classic",
      difficulty: "⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 0,
        numAISnakes: 0, // Single player
        aiDifficulty: null,
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 500,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          //yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 10
      },
      instructions: "Use arrow keys or WASD to control your snake. Eat food to grow and increase your score. Don't hit yourself!"
    },
    3: {
      id: 3,
      name: "More More Food!",
      description: "More food to eat! - Grow more or increase speed",
      type: "classic",
      difficulty: "⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 0,
        numAISnakes: 0, // Single player
        aiDifficulty: null,
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 500,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 15
      },
      instructions: "Use arrow keys or WASD to control your snake. Eat food to grow and increase your score. Don't hit yourself!"
    },
    4: {
      id: 4,
      name: "Obstacles!",
      description: "",
      type: "classic",
      difficulty: "⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 2,
        numAISnakes: 0, // Single player
        aiDifficulty: null,
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 500,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 5
      },
      instructions: "Navigate carefully around the obstacle to collect food. Don't hit the walls or yourself!"
    },
    5: {
      id: 5,
      name: "More Obstacles",
      description: "Navigate through more obstacles!",
      type: "maze",
      difficulty: "⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 6,
        numAISnakes: 0,
        aiDifficulty: null,
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 500,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 8
      },
      instructions: "Navigate carefully through more obstacles to collect food and reach the target score!"
    },
    6: {
      id: 6,
      name: "Obstacle Maze!",
      description: "Navigate through a challenging maze with 10 obstacles!",
      type: "maze",
      difficulty: "⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 10,
        numAISnakes: 0,
        aiDifficulty: null,
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 12
      },
      instructions: "Navigate through a large maze of obstacles to collect food and reach the target score!"
    },
    7: {
      id: 7,
      name: "More Snakes!",
      description: "Face your first AI opponent!",
      type: "battle",
      difficulty: "⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 4,
        numAISnakes: 1,
        aiDifficulty: "easy",
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 10
      },
      instructions: "Compete against your first AI opponent! Collect food and reach the target score while avoiding the AI snake."
    },
    8: {
      id: 8,
      name: "Deadly Edges",
      description: "Something tells you that the edges are deadly!",
      type: "battle",
      difficulty: "⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 4,
        numAISnakes: 1,
        aiDifficulty: "easy",
        wrapEnabled: false,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 12
      },
      instructions: "Watch out! The edges are deadly now. Compete against an AI opponent while avoiding the deadly walls!"
    },
    9: {
      id: 9,
      name: "Even More Snakes!",
      description: "Face off against two AI opponents!",
      type: "battle",
      difficulty: "⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 4,
        numAISnakes: 2,
        aiDifficulty: "medium",
        wrapEnabled: false,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 15
      },
      instructions: "Face two AI opponents! Collect food and reach the target score while avoiding both AI snakes and the deadly edges!"
    },
    10: {
      id: 10,
      name: "Battle Royale!",
      description: "Be the last snake standing!",
      type: "battle_royale",
      difficulty: "⭐⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 4,
        numAISnakes: 4,
        aiDifficulty: "medium",
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "Be the last snake standing! Compete against 4 AI opponents in this battle royale."
    },
    11: {
      id: 11,
      name: "Battle Royale Again!",
      description: "Be the last snake standing!",
      type: "battle_royale",
      difficulty: "⭐⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 4,
        numAISnakes: 4,
        aiDifficulty: "hard",
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "Be the last snake standing! Compete against 4 hard AI opponents in this battle royale."
    },
    12: {
      id: 12,
      name: "Deadly Battle Royale",
      description: "Survive against 4 hard AI opponents with deadly edges!",
      type: "battle_royale",
      difficulty: "⭐⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 8,
        numAISnakes: 4,
        aiDifficulty: "hard",
        wrapEnabled: false,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.25 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1 }
        }
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "Be the last snake standing! Compete against 4 hard AI opponents with deadly edges and more obstacles."
    },
    13: {
      id: 13,
      name: "No Walls",
      description: "Pure snake action with no obstacles!",
      type: "pure",
      difficulty: "⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 0,
        numAISnakes: 2,
        aiDifficulty: "medium",
        wrapEnabled: true,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: null
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "No obstacles to hide behind - just pure snake vs snake action!"
    },
    14: {
      id: 14,
      name: "Chaos Mode",
      description: "Unpredictable and chaotic gameplay!",
      type: "chaos",
      difficulty: "⭐⭐⭐⭐⭐",
      settings: {
        initialSnakeLength: 2,
        numObstacles: 20,
        numAISnakes: 5,
        aiDifficulty: "hard",
        wrapEnabled: false,
        baseInterval: 150,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 3 },
          orange: { grow: 1, speedInc: 1.0 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 2.0 }
        }
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "Everything is amplified! More obstacles, faster speed, stronger effects!"
    },
    15: {
      id: 15,
      name: "Master Class",
      description: "The ultimate challenge for masters!",
      type: "master",
      difficulty: "⭐⭐⭐⭐⭐",
      settings: {
        initialSnakeLength: 4,
        numObstacles: 15,
        numAISnakes: 4,
        aiDifficulty: "hard",
        wrapEnabled: false,
        baseInterval: 160,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: null
      },
      objective: {
        type: ObjectiveType.SCORE.value,
        target: 40
      },
      instructions: "Only true masters can complete this challenge. Perfect technique required!"
    },
    16: {
      id: 16,
      name: "Legend",
      description: "Become a legend by completing this final test!",
      type: "legend",
      difficulty: "⭐⭐⭐⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 12,
        numAISnakes: 7,
        aiDifficulty: "hard",
        wrapEnabled: true,
        baseInterval: 140,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { grow: 2 },
          orange: { grow: 1, speedInc: 0.5 },
          yellow: { grow: 1, speedInc: 0, tempSpeedInc: 1.0 }
        }
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "The final challenge! Face 7 expert AI snakes in the ultimate battle royale!"
    },
    17: {
      id: 17,
      name: "Quick Play (Default)",
      description: "Classic Battle Royale mode with default settings.",
      type: "battle_royale",
      difficulty: "⭐⭐⭐",
      settings: {
        initialSnakeLength: 3,
        numObstacles: 10,
        numAISnakes: 4,
        //aiDifficulty: "medium",
        wrapEnabled: false,
        baseInterval: 200,
        GRID_SIZE: 25,
        CANVAS_SIZE: 1000,
        foodTypes: {
          red: { color: 'red', grow: 2, speedInc: 0, tempSpeedInc: 0 },
          orange: { color: 'orange', grow: 1, speedInc: 0.25, tempSpeedInc: 0 },
          yellow: { color: 'yellow', grow: 1, speedInc: 0, tempSpeedInc: 0.75 }
        }
      },
      objective: {
        type: ObjectiveType.SURVIVE.value,
        target: null
      },
      instructions: "Battle against 4 AI snakes! Eat food to grow and become stronger. Survive longer than your opponents to win!"
    }
  };
}
