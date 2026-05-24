const DEFAULT_EDGE_PADDING_TILES = 3;

const MapConfigs = {
    // Our current hybrid style - good mix of caves and dungeon rooms
    default: {
        displayName: 'Hybrid Vault',
        description: 'Balanced rooms, caves, and wobbling corridors.',
        assetTheme: 'dungeon',
        layoutType: 'sequential',
        progressionTier: 1,
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
        smoothingPasses: 1,       // Cellular automata passes to round sharp edges
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // A tight, rigid, classic dungeon feel (Zelda-like)
    rigid_dungeon: {
        displayName: 'Rigid Dungeon',
        description: 'Compact square chambers with straight narrow halls.',
        assetTheme: 'dungeon',
        layoutType: 'sequential',
        progressionTier: 1,
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
        smoothingPasses: 0,       // Sharp architectural corners
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // A massive, open, organic cave system
    deep_caverns: {
        displayName: 'Deep Caverns',
        description: 'Huge eroded caves linked by wide uneven tunnels.',
        assetTheme: 'cavern',
        layoutType: 'sequential',
        progressionTier: 1,
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
        smoothingPasses: 3,       // Very round, eroded walls
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // A confusing, tight maze of small organic burrows
    the_labyrinth: {
        displayName: 'The Labyrinth',
        description: 'Many small burrows with thin, erratic paths.',
        assetTheme: 'cavern',
        layoutType: 'sequential',
        progressionTier: 1,
        cols: 100,
        rows: 100,
        numRooms: 35,
        minRoomSize: 3,
        maxRoomSize: 6,
        perfectSquareChance: 0.0, // No square rooms
        blobMinRects: 1,
        blobMaxRects: 2,
        corridorWidth: 1,         // Very narrow tunnels
        wobbleChance: 0.80,       // Extremely erratic zigzag tunnels
        smoothingPasses: 2,       // Eroded edges
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // A few massive, perfectly square arena rooms connected by wide highways
    arena_halls: {
        displayName: 'Arena Halls',
        description: 'Large square battle rooms connected by broad lanes.',
        assetTheme: 'dungeon',
        layoutType: 'sequential',
        progressionTier: 1,
        cols: 120,
        rows: 120,
        numRooms: 5,
        minRoomSize: 15,
        maxRoomSize: 26,
        perfectSquareChance: 1.0, // Only perfect squares
        blobMinRects: 1,
        blobMaxRects: 1,
        corridorWidth: 4,         // Wide highways
        wobbleChance: 0.0,        // Straight highways
        smoothingPasses: 0,       // Sharp architectural corners
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES,
        minFinalRooms: 3,
        maxFinalRooms: 5,
        generationRetryLimit: 10
    },
    // A central crypt hub with spokes to side chambers
    crypt_crossroads: {
        displayName: 'Crypt Crossroads',
        description: 'A central vault hub branches into spoke-like crypt wings.',
        assetTheme: 'crypt',
        layoutType: 'hub',
        progressionTier: 2,
        cols: 110,
        rows: 110,
        numRooms: 17,
        minRoomSize: 5,
        maxRoomSize: 12,
        perfectSquareChance: 0.55,
        blobMinRects: 1,
        blobMaxRects: 3,
        corridorWidth: 2,
        wobbleChance: 0.18,
        smoothingPasses: 1,
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // A forged ringway with outward vaults and inward machine chambers
    ironforged: {
        displayName: 'Ironforged',
        description: 'A massive iron ringway with chambers branching inward and outward.',
        assetTheme: 'forge',
        layoutType: 'ring',
        progressionTier: 2,
        cols: 160,
        rows: 160,
        numRooms: 7,
        minRoomSize: 6,
        maxRoomSize: 12,
        perfectSquareChance: 0.7,
        blobMinRects: 1,
        blobMaxRects: 1,
        corridorWidth: 4,
        wobbleChance: 0.0,
        smoothingPasses: 0,
        ringRadiusTiles: 28,
        ringThicknessTiles: 8,
        innerPathWidth: 2,
        outerBranchRooms: 4,
        innerBranchRooms: 3,
        ringVariantWeights: {
            single: 2,
            double_side: 1,
            outer_expansion: 1
        },
        secondaryRingRadiusTiles: 24,
        secondaryRingThicknessTiles: 8,
        ringSeparationTiles: 8,
        outerExpansionRadiusTiles: 50,
        outerExpansionThicknessTiles: 8,
        doubleRingOuterBranchRooms: 6,
        doubleRingInnerBranchRooms: 5,
        outerExpansionOuterBranchRooms: 4,
        outerExpansionInnerBranchRooms: 6,
        outerExpansionExtraOuterRooms: 3,
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // Separated cave islands stitched together by unstable rifts
    fractured_rift: {
        displayName: 'Fractured Rift',
        description: 'Scattered vault clusters joined by jagged rift paths.',
        assetTheme: 'rift',
        layoutType: 'cluster',
        progressionTier: 3,
        cols: 145,
        rows: 125,
        numRooms: 18,
        minRoomSize: 5,
        maxRoomSize: 14,
        perfectSquareChance: 0.05,
        blobMinRects: 2,
        blobMaxRects: 5,
        corridorWidth: 2,
        wobbleChance: 0.75,
        smoothingPasses: 2,
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    },
    // A pressure-forward chain of rooms for combat pacing
    gauntlet_passage: {
        displayName: 'Gauntlet Passage',
        description: 'A mostly linear run of chambers with limited detours.',
        assetTheme: 'dungeon',
        layoutType: 'linear',
        progressionTier: 2,
        cols: 130,
        rows: 80,
        numRooms: 14,
        minRoomSize: 5,
        maxRoomSize: 11,
        perfectSquareChance: 0.35,
        blobMinRects: 1,
        blobMaxRects: 2,
        corridorWidth: 2,
        wobbleChance: 0.22,
        smoothingPasses: 1,
        edgePaddingTiles: DEFAULT_EDGE_PADDING_TILES
    }
};

// Export for module systems if needed, but primarily used globally
if (typeof window !== 'undefined') {
    window.MapConfigs = MapConfigs;
    window.DEFAULT_EDGE_PADDING_TILES = DEFAULT_EDGE_PADDING_TILES;
}
