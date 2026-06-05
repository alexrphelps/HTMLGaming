/*
 * GameHub game list.
 *
 * To add a game:
 * 1. Create a folder in games, for example games/my_game.
 * 2. Put the playable file at games/my_game/index.html.
 * 3. Add one entry below with at least the folder name.
 *
 * Optional fields: name, description, category, difficulty, icon, tags,
 * version, author, estimatedPlayTime, aiEffortRating, defaultRating,
 * input, rendering, saveSupport.
 */
window.GAMEHUB_GAMES = [
    {
        folder: 'snake',
        name: 'Snake!',
        description: 'Classic Snake game with AI opponents and multiple food types',
        category: 'Arcade',
        difficulty: 'Easy',
        icon: 'S',
        tags: ['2d', 'classic', 'arcade', 'ai'],
        author: 'GameHub Team',
        estimatedPlayTime: 5,
        aiEffortRating: 4,
        defaultRating: 3
    },
    {
        folder: 'miniinvaders',
        name: 'Mini Invaders',
        description: 'Classic Space Invaders! Shoot descending aliens before they reach the bottom.',
        category: 'Arcade',
        difficulty: 'Medium',
        icon: 'MI',
        tags: ['2d', 'arcade', 'shooter', 'retro', 'classic'],
        author: 'GameHub Team',
        estimatedPlayTime: 10,
        aiEffortRating: 4,
        defaultRating: 5
    },
    {
        folder: 'Cellvive',
        name: 'Cellvive',
        description: 'Survive as a blob-like cell. Eat smaller cells to grow while avoiding bigger ones.',
        category: 'Action',
        difficulty: 'Easy',
        icon: 'CV',
        tags: ['2d', 'survival', 'action', 'arcade', 'cells'],
        author: 'GameHub Team',
        estimatedPlayTime: 10,
        aiEffortRating: 3,
        defaultRating: 2
    },
    {
        folder: 'cosmicdrifter',
        name: 'Cosmic Drifter',
        description: 'Drift through shattered worlds, collect resources, avoid hazards, and upgrade your ship.',
        category: 'Exploration',
        difficulty: 'Medium',
        icon: 'CD',
        tags: ['2d', 'exploration', 'survival', 'space', 'open-world', 'upgrades'],
        author: 'GameHub Team',
        estimatedPlayTime: 20,
        aiEffortRating: 2,
        defaultRating: 2
    },
    {
        folder: 'stickperson',
        name: 'Stickman Platformer',
        description: 'A simple 2D platformer with a stickman character',
        category: 'Platformer',
        difficulty: 'Easy',
        icon: 'SP',
        tags: ['2d', 'platformer', 'action'],
        author: 'GameHub Team',
        estimatedPlayTime: 10,
        aiEffortRating: 2,
        defaultRating: 1
    },
    {
        folder: 'elemental-stickman',
        name: 'Elemental Stickman',
        description: 'Gesture-cast four elements in a side-scrolling stickman platform fighting sandbox.',
        category: 'Platformer',
        difficulty: 'Medium',
        icon: 'ES',
        tags: ['2d', 'platformer', 'fighting', 'elemental', 'gesture', 'canvas'],
        author: 'GameHub',
        estimatedPlayTime: 15,
        aiEffortRating: 5,
        defaultRating: 4,
        input: 'Keyboard + Mouse',
        rendering: 'Canvas',
        saveSupport: 'None'
    },
    {
        folder: 'stormline-runner',
        name: 'Stormline Runner',
        description: 'Endless neon-weather platformer where generated storm fronts reshape hazards, routes, and talent value.',
        category: 'Platformer',
        difficulty: 'Medium',
        icon: 'SR',
        tags: ['2d', 'platformer', 'arcade', 'endless', 'procedural', 'talents'],
        author: 'GameHub',
        estimatedPlayTime: 12,
        aiEffortRating: 4,
        defaultRating: 4,
        input: 'Keyboard',
        rendering: 'Canvas',
        saveSupport: 'None'
    },
    {
        folder: 'blockdodge',
        name: 'Block Dodge',
        description: 'Control a square and dodge falling blocks as the difficulty increases.',
        category: 'Arcade',
        difficulty: 'Easy',
        icon: 'BD',
        tags: ['2d', 'arcade', 'reflex', 'survival'],
        author: 'GameHub Team',
        estimatedPlayTime: 5,
        aiEffortRating: 1,
        defaultRating: 2
    },
    {
        folder: 'color_stream_reactor',
        name: 'Color Stream Reactor',
        description: 'Match neon energy colors before the falling stream overloads the reactor.',
        category: 'Arcade',
        difficulty: 'Medium',
        icon: 'CSR',
        tags: ['arcade', 'reflex', 'color-match', 'neon'],
        author: 'GameHub',
        estimatedPlayTime: 5,
        aiEffortRating: 2,
        defaultRating: 3
    },
    {
        folder: 'gloomvault-extraction',
        name: 'Gloomvault Extraction',
        description: 'Isometric roguelite dungeon crawler with extraction mechanics and loot progression.',
        category: 'Action RPG',
        difficulty: 'Hard',
        icon: 'GE',
        tags: ['roguelite', 'action', 'loot', 'dungeon-crawler'],
        author: 'GameHub',
        estimatedPlayTime: 15,
        aiEffortRating: 5,
        defaultRating: 4
    },
    {
        folder: 'void_signal',
        name: 'Void Signal',
        category: 'Other',
        icon: 'VS',
        aiEffortRating: 1,
        defaultRating: 2
    },
    {
        folder: 'reaction_diffusion_simulator',
        name: 'Reaction Diffusion Simulator',
        description: 'A hands-on Gray-Scott reaction-diffusion lab for painting, tuning, and studying generative patterns.',
        category: 'Simulation',
        difficulty: 'Medium',
        icon: 'RD',
        tags: ['simulation', 'science', 'sandbox', 'canvas', 'generative'],
        author: 'GameHub',
        estimatedPlayTime: 15,
        aiEffortRating: 3,
        defaultRating: 3
    },
    {
        folder: 'the_gravity_locksmith',
        name: 'The Gravity Locksmith',
        description: 'Break into impossible sky-vaults by stealing the direction of falling. Flip gravity, dodge spikes, outrun the shadow.',
        category: 'Platformer',
        difficulty: 'Medium',
        icon: 'TGL',
        tags: ['2d', 'platformer', 'puzzle', 'gravity', 'action'],
        author: 'GameHub Team',
        estimatedPlayTime: 15,
        aiEffortRating: 4,
        defaultRating: 4
    },
    {
        folder: 'castlefall_valley',
        name: 'Castlefall Valley',
        description: 'Command troops, build your keep, and lead a hero through a terraced side-scroller siege battlefield.',
        category: 'Strategy',
        difficulty: 'Medium',
        icon: 'CV',
        tags: ['2d', 'strategy', 'siege', 'side-scroller', 'canvas'],
        author: 'GameHub',
        estimatedPlayTime: 15,
        aiEffortRating: 3,
        defaultRating: 3,
        input: 'Keyboard + Touch',
        rendering: 'Canvas',
        saveSupport: 'None'
    }
];
