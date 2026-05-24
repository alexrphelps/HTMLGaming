document.addEventListener('DOMContentLoaded', () => {
    console.log('Gloomvault Extraction - main.js loaded');

    const engine = new GameEngine('game-canvas');
    const expandedMinimapCanvas = document.getElementById('expanded-minimap-canvas');
    const assetManifest = typeof AssetManifest !== 'undefined' ? AssetManifest : window.AssetManifest;
    const assetManager = typeof AssetManager !== 'undefined' ? new AssetManager(assetManifest) : null;
    window.gloomvaultAssets = assetManager;
    window.gameAssets = assetManager ? assetManager.getLegacyGameAssets() : {};
    if (assetManager && engine.renderer && engine.renderer.setAssetManager) {
        engine.renderer.setAssetManager(assetManager);
        assetManager.loadAll().then(() => {
            window.gameAssets = assetManager.getLegacyGameAssets();
            if (engine.state === 'PLAYING') {
                engine.render(0);
            }
        });
    }

    let screenController = null;
    window.gloomvaultApp = { engine };

    const inventoryUi = typeof InventoryUiController !== 'undefined'
        ? new InventoryUiController({
            engine,
            expandedMinimapCanvas,
            showScreen: id => screenController && screenController.showScreen(id)
        })
        : null;

    screenController = typeof ScreenController !== 'undefined'
        ? new ScreenController({
            engine,
            mapConfigs: typeof MapConfigs !== 'undefined' ? MapConfigs : {},
            onShowStash: () => inventoryUi && inventoryUi.updateStashUI(),
            onHideExpandedMinimap: () => inventoryUi && inventoryUi.hideExpandedMinimap()
        })
        : null;

    window.gloomvaultApp.showScreen = id => {
        if (screenController) screenController.showScreen(id);
    };
    window.gloomvaultApp.updateInventoryUI = () => inventoryUi && inventoryUi.updateInventoryUI();
    window.gloomvaultApp.updateDurabilityHUD = player => inventoryUi && inventoryUi.updateDurabilityHUD(player);
    window.gloomvaultApp.setupExtraction = inventory => inventoryUi && inventoryUi.setupExtraction(inventory);
    window.gloomvaultApp.destroy = () => {
        if (inventoryUi && inventoryUi.destroy) inventoryUi.destroy();
        if (screenController && screenController.destroy) screenController.destroy();
        if (engine && engine.destroy) engine.destroy();
    };
});
