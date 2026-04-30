const DifficultyConfig = {
    // Gear score to starting floor conversion
    gearScorePerFloor: 40,       // Every 40 GS = +1 starting floor
    minStartingFloor: 1,

    // Per-floor scaling (applied multiplicatively)
    enemyHpScale: 0.2,           // +20% HP per floor
    enemyDamageScale: 0.2,       // +20% damage per floor
    enemyCountScale: 0.1,        // +10% enemy count per floor

    // In-dungeon descent bonus (stacks on top of starting floor)
    descentFloorIncrement: 1,    // Each door/hole adds this many floors
    minTransitionDistance: 300,  // Minimum pixel distance between any two floor transitions
};
