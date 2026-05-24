class GameRenderer {
    render(engine, dt) {
        if (engine.state !== 'PLAYING') return;

        engine.renderer.clear();
        engine.ctx.save();
        engine.camera.applyTransform(engine.ctx);

        if (engine.renderer.setAssetManager && typeof window !== 'undefined' && window.gloomvaultAssets) {
            engine.renderer.setAssetManager(window.gloomvaultAssets);
        }

        this.drawMap(engine);
        this.drawWorldObjects(engine);
        this.drawActors(engine);
        engine.renderTrinketEffects(engine.ctx, engine.renderer);
        engine.particleSystem.render(engine.ctx, engine.renderer);
        engine.combatFeedback.render(engine.ctx, engine.renderer);
        engine.ctx.restore();

        this.drawDevOverlay(engine, dt);
        this.drawMinimap(engine);
    }

    drawMap(engine) {
        const startCol = Math.floor(engine.camera.x / engine.tileSize);
        const endCol = startCol + Math.floor(engine.camera.width / engine.tileSize) + 2;
        const startRow = Math.floor(engine.camera.y / engine.tileSize);
        const endRow = startRow + Math.floor(engine.camera.height / engine.tileSize) + 2;

        if (engine.renderer.drawMapTiles) {
            engine.renderer.drawMapTiles(
                engine.mapGen,
                startCol,
                endCol,
                startRow,
                endRow,
                engine.tileSize,
                (x, y) => engine.isWallVisible(x, y)
            );
            return;
        }

        for (let y = startRow; y < endRow; y++) {
            for (let x = startCol; x < endCol; x++) {
                const tile = engine.mapGen.getTile(x, y);
                const worldX = x * engine.tileSize;
                const worldY = y * engine.tileSize;
                if (tile === 1) {
                    engine.renderer.drawRect(worldX, worldY, engine.tileSize - 1, engine.tileSize - 1, '#333');
                } else if (tile === 0 && engine.isWallVisible(x, y)) {
                    engine.renderer.drawRect(worldX, worldY, engine.tileSize - 1, engine.tileSize - 1, '#111');
                }
            }
        }
    }

    drawWorldObjects(engine) {
        for (const service of (engine.dungeonServices || [])) service.render(engine.ctx, engine.renderer);
        if (engine.portal) engine.portal.render(engine.ctx, engine.renderer);
        for (const transition of engine.floorTransitions) transition.render(engine.ctx, engine.renderer);
        engine.renderBossRoomEntrance();
        for (const button of engine.bossRoomButtons) button.render(engine.ctx, engine.renderer);
        for (const chest of engine.lootChests) chest.render(engine.ctx, engine.renderer);
        for (const item of engine.droppedItems) item.render(engine.ctx, engine.renderer);
    }

    drawActors(engine) {
        if (engine.player) engine.player.render(engine.ctx, engine.renderer);
        for (const enemy of engine.enemies) enemy.render(engine.ctx, engine.renderer);
        for (const projectile of engine.projectiles) projectile.render(engine.ctx, engine.renderer);
    }

    drawDevOverlay(engine, dt) {
        if (!engine.isDevOverlayVisible() || !engine.player) return;
        const fps = dt > 0 ? Math.round(1 / dt) : 0;
        engine.ctx.fillStyle = '#fff';
        engine.ctx.font = '16px monospace';
        engine.ctx.fillText(`FPS: ${fps}`, 10, 20);
        engine.ctx.fillText(`Player: (${Math.floor(engine.player.x)}, ${Math.floor(engine.player.y)})`, 10, 40);
    }

    drawMinimap(engine) {
        engine.updateMinimapInfoUI();
        if (engine.showMinimap === false || typeof MinimapConfig === 'undefined') return;
        const minimapSize = engine.getResponsiveMinimapSize();
        const minimapConfig = engine.getMinimapRenderConfig(minimapSize);
        engine.renderer.renderMinimap(
            engine.player,
            engine.portal,
            engine.floorTransitions,
            engine.mapGen,
            minimapConfig,
            false,
            null,
            engine.bossRoomButtons,
            engine.dungeonServices || []
        );
    }
}

if (typeof window !== 'undefined') {
    window.GameRenderer = GameRenderer;
}
