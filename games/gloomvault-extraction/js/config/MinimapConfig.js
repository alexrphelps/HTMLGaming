const MinimapConfig = {
    // UI Placement and Dimensions
    width: 200,
    height: 200,
    xOffset: 20, // Distance from right edge
    yOffset: 20, // Distance from top edge
    
    // Scale and Logic
    tileScale: 4, // Pixels per map tile on the minimap
    visionRadius: 12, // How many tiles around the player are revealed (roughly matches screen view)
    
    // Colors
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderColor: '#444',
    fogColor: '#000000', // Unexplored tiles
    exploredFloorColor: '#333333',
    exploredWallColor: '#666666',
    playerColor: '#00ff00',
    portalColor: '#9900ff'
};

if (typeof window !== 'undefined') {
    window.MinimapConfig = MinimapConfig;
}
