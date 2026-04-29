const MapConfigs = {
    // Our current hybrid style - good mix of caves and dungeon rooms
    default: {
        cols: 100,
        rows: 100,
        numRooms: 15,
        minRoomSize: 5,
        maxRoomSize: 12,
        perfectSquareChance: 0.1, // 10% chance for a perfect square room
        blobMinRects: 2,          // Minimum rectangles in a blob cluster
        blobMaxRects: 4,          // Maximum rectangles in a blob cluster
        corridorWidth: 2,         // Width of connecting tunnels
        wobbleChance: 0.30,       // 30% chance for corridor to zigzag/wobble
        smoothingPasses: 1        // Cellular automata passes to round sharp edges
    },
    // A tight, rigid, classic dungeon feel (Zelda-like)
    rigid_dungeon: {
        cols: 80,
        rows: 80,
        numRooms: 20,
        minRoomSize: 4,
        maxRoomSize: 8,
        perfectSquareChance: 0.8, // Mostly square rooms
        blobMinRects: 1,
        blobMaxRects: 2,
        corridorWidth: 1,         // Narrow hallways
        wobbleChance: 0.0,        // Straight hallways
        smoothingPasses: 0        // Sharp architectural corners
    },
    // A massive, open, organic cave system
    deep_caverns: {
        cols: 150,
        rows: 150,
        numRooms: 10,
        minRoomSize: 8,
        maxRoomSize: 20,
        perfectSquareChance: 0.0, // No square rooms
        blobMinRects: 3,
        blobMaxRects: 6,          // Massive chaotic blob rooms
        corridorWidth: 3,         // Wide tunnels
        wobbleChance: 0.60,       // Highly erratic tunnels
        smoothingPasses: 3        // Very round, eroded walls
    }
};

// Export for module systems if needed, but primarily used globally
if (typeof window !== 'undefined') {
    window.MapConfigs = MapConfigs;
}