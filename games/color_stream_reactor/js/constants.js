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

const STORAGE_KEY = "colorStreamReactorHighScore";
const BASE_SPAWN_RATE = 1000;
const MIN_SPAWN_RATE = 350;
const SPAWN_RATE_STEP = 4;
const BASE_FALL_SPEED = 114;
const FALL_SPEED_STEP = 0.72;
const PROJECTILE_SPEED = 660;
const WARNING_INTERVAL = 450;
const MAX_DELTA = 100;
