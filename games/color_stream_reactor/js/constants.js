const COLORS = [
    "#ff4d4d",
    "#4dd2ff",
    "#ffd24d",
    "#7dff7d",
    "#c084ff",
    "#ff8a47",
    "#ff66c4",
    "#ffffff"
];

const COLOR_KEYS = ["q","w","e","r","a","s","d","f"];

const COLOR_UNLOCKS = [
    { score:0, colors:1 },
    { score:6, colors:2 },
    { score:13, colors:3 },
    { score:21, colors:4 },
    { score:31, colors:5 },
    { score:43, colors:6 },
    { score:57, colors:7 },
    { score:73, colors:8 }
];

const DIFFICULTY_SETTINGS = {
    noob: {
        key: "noob",
        label: "Noob",
        progressionEnabled: true,
        startColors: 1,
        revealedColors: 1,
        maxColors: 4,
        spawnRateMultiplier: 1,
        fallSpeedMultiplier: 1,
        spawnRateStepMultiplier: 1,
        fallSpeedStepMultiplier: 1
    },
    basic: {
        key: "basic",
        label: "Basic",
        progressionEnabled: true,
        startColors: 1,
        revealedColors: 1,
        maxColors: COLORS.length,
        spawnRateMultiplier: 1,
        fallSpeedMultiplier: 1,
        spawnRateStepMultiplier: 1,
        fallSpeedStepMultiplier: 1
    },
    pro: {
        key: "pro",
        label: "Pro",
        progressionEnabled: false,
        startColors: COLORS.length,
        revealedColors: COLORS.length,
        maxColors: COLORS.length,
        spawnRateMultiplier: 0.8,
        fallSpeedMultiplier: 1.25,
        spawnRateStepMultiplier: 1.25,
        fallSpeedStepMultiplier: 1.25
    }
};

const STORAGE_KEY = "colorStreamReactorHighScore";
const BASE_SPAWN_RATE = 1000;
const MIN_SPAWN_RATE = 350;
const SPAWN_RATE_STEP = 4;
const BASE_FALL_SPEED = 114;
const FALL_SPEED_STEP = 0.72;
const PROJECTILE_SPEED = 660;
const WARNING_INTERVAL = 450;
const MAX_DELTA = 100;
