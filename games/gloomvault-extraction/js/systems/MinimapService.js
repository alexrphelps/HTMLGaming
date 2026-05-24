class MinimapService {
    getCurrentMapDisplayName(engine) {
        const config = engine.currentMapConfig || {};
        if (config.displayName) return config.displayName;
        if (!engine.currentMapKey) return 'Unknown Map';

        return engine.currentMapKey
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());
    }

    getResponsiveMinimapSize(engine) {
        if (typeof MinimapConfig === 'undefined') {
            return { width: 300, height: 300, xOffset: 20, yOffset: 20 };
        }

        const canvas = engine.canvas;
        const viewportWidth = Math.max(320, canvas ? canvas.clientWidth || canvas.width : 320);
        const viewportHeight = Math.max(240, canvas ? canvas.clientHeight || canvas.height : 240);
        const maxSide = Math.min(viewportWidth * 0.24, viewportHeight * 0.32, MinimapConfig.expandedWidth || 800);
        const width = Math.round(Math.max(220, Math.min(maxSide, 340)));
        const height = Math.round(Math.max(220, Math.min(maxSide, 340)));
        const xOffset = Math.round(Math.max(16, Math.min(MinimapConfig.xOffset || 20, viewportWidth * 0.04)));
        const yOffset = Math.round(Math.max(16, Math.min(MinimapConfig.yOffset || 20, viewportHeight * 0.04)));
        return { width, height, xOffset, yOffset };
    }

    getCanvasCssToBackingScale(engine) {
        const canvas = engine.canvas;
        if (!canvas) return { x: 1, y: 1, uniform: 1 };

        const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
        const cssWidth = Math.max(1, canvas.clientWidth || (rect && rect.width) || canvas.width || 1);
        const cssHeight = Math.max(1, canvas.clientHeight || (rect && rect.height) || canvas.height || 1);
        const scaleX = Math.max(0.01, (canvas.width || cssWidth) / cssWidth);
        const scaleY = Math.max(0.01, (canvas.height || cssHeight) / cssHeight);
        return { x: scaleX, y: scaleY, uniform: Math.min(scaleX, scaleY) };
    }

    getMinimapRenderConfig(engine, cssSize = this.getResponsiveMinimapSize(engine)) {
        if (typeof MinimapConfig === 'undefined') return null;
        const scale = this.getCanvasCssToBackingScale(engine);
        return {
            ...MinimapConfig,
            width: Math.round(cssSize.width * scale.x),
            height: Math.round(cssSize.height * scale.y),
            xOffset: Math.round(cssSize.xOffset * scale.x),
            yOffset: Math.round(cssSize.yOffset * scale.y),
            tileScale: (MinimapConfig.tileScale || 4) * scale.uniform,
            pixelScale: scale.uniform
        };
    }

    getInventoryPaneLayout(viewportWidth, viewportHeight, headerHeight = 0, options = {}) {
        const isLargeFormFactor = viewportWidth >= 1000 && viewportHeight >= 1000;
        const gap = options.gap ?? (isLargeFormFactor ? 16 : 12);
        const panePadding = options.panePadding ?? (isLargeFormFactor ? 24 : 12);
        const safePadding = options.safePadding ?? 32;
        const bodyPadding = options.bodyPadding ?? gap;
        const baseContentSize = options.baseContentSize ?? 620;
        const maxContentScale = options.maxContentScale ?? 1.12;
        const paneBorder = options.paneBorder ?? 2;
        const availableWidth = Math.max(1, viewportWidth - safePadding - gap - (bodyPadding * 2));
        const availableHeight = Math.max(1, viewportHeight - safePadding - headerHeight - (bodyPadding * 2));
        const paneSize = Math.max(1, Math.floor(Math.min(availableWidth / 2, availableHeight)));
        const innerPaneSize = Math.max(1, paneSize - (panePadding * 2) - paneBorder);

        return {
            paneSize,
            gap,
            panePadding,
            innerPaneSize,
            contentScale: Math.min(maxContentScale, innerPaneSize / baseContentSize)
        };
    }

    revealAroundPlayer(engine) {
        if (!engine.player || !engine.mapGen || typeof MinimapConfig === 'undefined') return;
        const pX = Math.floor(engine.player.x / engine.mapGen.tileSize);
        const pY = Math.floor(engine.player.y / engine.mapGen.tileSize);
        const vr = MinimapConfig.visionRadius;

        for (let y = pY - vr; y <= pY + vr; y++) {
            for (let x = pX - vr; x <= pX + vr; x++) {
                if (x >= 0 && x < engine.mapGen.cols && y >= 0 && y < engine.mapGen.rows && Math.hypot(x - pX, y - pY) <= vr) {
                    engine.mapGen.visitedGrid[y * engine.mapGen.cols + x] = true;
                }
            }
        }
    }

    updateInfo(engine) {
        const hud = engine.getHudElements();
        if (!hud.minimapHud || !hud.minimapInfo || !hud.minimapFloorLabel || !hud.minimapMapLabel) return;

        if (engine.showMinimap === false) {
            engine.setHudHidden('minimapInfoHidden', hud.minimapHud, true);
            return;
        }

        engine.setHudHidden('minimapInfoHidden', hud.minimapHud, false);
        if (typeof MinimapConfig !== 'undefined') {
            const minimapSize = this.getResponsiveMinimapSize(engine);
            engine.setHudStyle('minimapHudTop', hud.minimapHud, 'top', `${minimapSize.yOffset + minimapSize.height + 8}px`);
            engine.setHudStyle('minimapHudRight', hud.minimapHud, 'right', `${minimapSize.xOffset}px`);
            engine.setHudStyle('minimapHudWidth', hud.minimapHud, 'width', `${minimapSize.width}px`);
            engine.setHudStyle('minimapInfoWidth', hud.minimapInfo, 'width', '100%');
        }

        engine.setHudText('minimapFloorLabel', hud.minimapFloorLabel, `Floor ${engine.currentFloor}`);
        engine.setHudText('minimapMapLabel', hud.minimapMapLabel, this.getCurrentMapDisplayName(engine));
    }
}

if (typeof window !== 'undefined') {
    window.MinimapService = MinimapService;
}
