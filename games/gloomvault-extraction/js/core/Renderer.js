class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        // Basic placeholder system: A color rect
        this.camera = null; 
        this.assetManager = null;
    }

    setCamera(camera) {
        this.camera = camera;
    }

    setAssetManager(assetManager) {
        this.assetManager = assetManager || null;
    }

    clear(color = '#050505') {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRect(worldX, worldY, width, height, color) {
        if (!this.camera) return;
        const screenPos = this.camera.worldToScreen(worldX, worldY);
        
        // Simple culling
        if (screenPos.x + width < 0 || screenPos.x > this.camera.width ||
            screenPos.y + height < 0 || screenPos.y > this.camera.height) {
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenPos.x, screenPos.y, width, height);
    }

    drawSpriteDirect(ctx, image, srcX, srcY, srcW, srcH, destX, destY, destW, destH) {
        // Assume already translated/rotated
        ctx.drawImage(image, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
    }

    drawAnimationFrameDirect(ctx, spriteKey, state, frame, destX, destY, destW, destH) {
        if (!this.assetManager || !this.assetManager.getSpriteFrame) return false;
        const frameData = this.assetManager.getSpriteFrame(spriteKey, state, frame);
        if (!frameData) return false;

        this.drawSpriteDirect(
            ctx,
            frameData.image,
            frameData.srcX,
            frameData.srcY,
            frameData.srcW,
            frameData.srcH,
            destX,
            destY,
            destW,
            destH
        );
        return true;
    }

    drawSprite(image, srcX, srcY, srcW, srcH, destX, destY, destW, destH) {
        if (!this.camera) return;
        const screenPos = this.camera.worldToScreen(destX, destY);

        if (screenPos.x + destW < 0 || screenPos.x > this.camera.width ||
            screenPos.y + destH < 0 || screenPos.y > this.camera.height) {
            return;
        }

        this.ctx.drawImage(image, srcX, srcY, srcW, srcH, screenPos.x, screenPos.y, destW, destH);
    }

    drawCenteredImage(image, worldX, worldY, width, height, rotation = 0, alpha = 1) {
        if (!this.camera || !image) return false;
        const screenPos = this.camera.worldToScreen(worldX, worldY);

        if (screenPos.x + width / 2 < 0 || screenPos.x - width / 2 > this.camera.width ||
            screenPos.y + height / 2 < 0 || screenPos.y - height / 2 > this.camera.height) {
            return true;
        }

        this.ctx.save();
        this.ctx.globalAlpha *= alpha;
        this.ctx.translate(screenPos.x, screenPos.y);
        if (rotation) this.ctx.rotate(rotation);
        this.ctx.drawImage(image, -width / 2, -height / 2, width, height);
        this.ctx.restore();
        return true;
    }

    drawAsset(key, worldX, worldY, width, height, options = {}) {
        const image = this.assetManager && this.assetManager.getImage(key);
        if (!image) return false;
        return this.drawCenteredImage(image, worldX, worldY, width, height, options.rotation || 0, options.alpha ?? 1);
    }

    getTileNeighborMask(map, x, y, targetTile = 1) {
        if (!map || !map.getTile) return 0;
        let mask = 0;
        if (map.getTile(x, y - 1) === targetTile) mask |= 1;
        if (map.getTile(x + 1, y) === targetTile) mask |= 2;
        if (map.getTile(x, y + 1) === targetTile) mask |= 4;
        if (map.getTile(x - 1, y) === targetTile) mask |= 8;
        return mask;
    }

    getWallEdgeRotation(map, x, y) {
        const mask = this.getTileNeighborMask(map, x, y, 1);
        if (mask & 1) return -Math.PI / 2;
        if (mask & 2) return 0;
        if (mask & 4) return Math.PI / 2;
        if (mask & 8) return Math.PI;
        return 0;
    }

    shouldDrawFloorDetail(x, y) {
        const hash = typeof AssetManager !== 'undefined'
            ? AssetManager.hashString(`${x},${y},floor-detail`)
            : Renderer.hashString(`${x},${y},floor-detail`);
        return hash % 11 === 0;
    }

    getAssetManifest() {
        if (this.assetManager && this.assetManager.manifest) return this.assetManager.manifest;
        if (typeof AssetManifest !== 'undefined') return AssetManifest;
        if (typeof window !== 'undefined' && window.AssetManifest) return window.AssetManifest;
        return null;
    }

    getMapTileDefinitions() {
        const manifest = this.getAssetManifest();
        return manifest && manifest.tiles && manifest.tiles.maps ? manifest.tiles.maps : null;
    }

    getMapTileKey(map) {
        const mapTiles = this.getMapTileDefinitions();
        if (!mapTiles) return null;

        if (map && map.mapKey && mapTiles[map.mapKey]) return map.mapKey;
        if (map && map.config && map.config.mapKey && mapTiles[map.config.mapKey]) return map.config.mapKey;

        if (map && map.config && typeof MapConfigs !== 'undefined') {
            for (const key in MapConfigs) {
                if (MapConfigs[key] === map.config && mapTiles[key]) return key;
            }
        }

        return mapTiles.default ? 'default' : Object.keys(mapTiles)[0];
    }

    hasThemedMapTiles(map) {
        const mapTiles = this.getMapTileDefinitions();
        const mapKey = this.getMapTileKey(map);
        return Boolean(mapTiles && mapKey && mapTiles[mapKey]);
    }

    getMapTileAssetKey(map, pathParts) {
        const mapKey = this.getMapTileKey(map);
        if (!mapKey) return null;
        return `tiles.maps.${mapKey}.${pathParts.join('.')}`;
    }

    getFloorAssetKey(map, x, y) {
        const hash = typeof AssetManager !== 'undefined'
            ? AssetManager.hashString(`${this.getMapTileKey(map)},${x},${y},floor-variant`)
            : Renderer.hashString(`${this.getMapTileKey(map)},${x},${y},floor-variant`);
        const roll = hash % 10;
        if (roll === 0) return this.getMapTileAssetKey(map, ['floor', 'variant01']);
        if (roll === 1) return this.getMapTileAssetKey(map, ['floor', 'variant02']);
        return this.getMapTileAssetKey(map, ['floor', 'base']);
    }

    normalizeAutotileMask(mask) {
        let normalized = mask & 255;
        if ((normalized & 0b00010011) !== 0b00010011) normalized &= ~0b00010000; // NE needs N + E
        if ((normalized & 0b00100110) !== 0b00100110) normalized &= ~0b00100000; // SE needs S + E
        if ((normalized & 0b01001100) !== 0b01001100) normalized &= ~0b01000000; // SW needs S + W
        if ((normalized & 0b10001001) !== 0b10001001) normalized &= ~0b10000000; // NW needs N + W
        return normalized;
    }

    formatAutotileMask(mask) {
        return String(this.normalizeAutotileMask(mask)).padStart(3, '0');
    }

    getEightNeighborMask(map, x, y, targetTile = 0) {
        if (!map || !map.getTile) return 0;
        let mask = 0;
        if (map.getTile(x, y - 1) === targetTile) mask |= 1;
        if (map.getTile(x + 1, y) === targetTile) mask |= 2;
        if (map.getTile(x, y + 1) === targetTile) mask |= 4;
        if (map.getTile(x - 1, y) === targetTile) mask |= 8;
        if (map.getTile(x + 1, y - 1) === targetTile) mask |= 16;
        if (map.getTile(x + 1, y + 1) === targetTile) mask |= 32;
        if (map.getTile(x - 1, y + 1) === targetTile) mask |= 64;
        if (map.getTile(x - 1, y - 1) === targetTile) mask |= 128;
        return this.normalizeAutotileMask(mask);
    }

    getWallAssetKey(map, x, y) {
        const formatted = this.formatAutotileMask(this.getEightNeighborMask(map, x, y, 0));
        return this.getMapTileAssetKey(map, ['wall', 'masks', formatted]);
    }

    getMapObjectAssetKey(map, objectKey) {
        return this.getMapTileAssetKey(map, ['objects', objectKey]);
    }

    drawMapTileLayer(map, x, y, tileSize, layer) {
        const tile = map.getTile(x, y);
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

        if (layer === 'floor-base' && tile === 1) {
            const floorKey = this.getFloorAssetKey(map, x, y);
            if (floorKey && this.drawAsset(floorKey, worldX, worldY, tileSize, tileSize)) {
                return;
            }
            if (!this.drawAsset('tiles.floor', worldX, worldY, tileSize - 1, tileSize - 1)) {
                this.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1, '#333');
            }
            return;
        }

        if (layer === 'floor-detail' && tile === 1 && this.shouldDrawFloorDetail(x, y)) {
            if (this.hasThemedMapTiles(map)) return;
            this.drawAsset('tiles.floorDetail1', worldX, worldY, tileSize - 1, tileSize - 1, { alpha: 0.85 });
            return;
        }

        if (layer === 'wall' && tile === 0) {
            const wallKey = this.getWallAssetKey(map, x, y);
            if (wallKey && this.drawAsset(wallKey, worldX, worldY, tileSize, tileSize)) {
                return;
            }
            if (!this.drawAsset('tiles.wall', worldX, worldY, tileSize - 1, tileSize - 1)) {
                this.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1, '#111');
            }
            const rotation = this.getWallEdgeRotation(map, x, y);
            this.drawAsset('tiles.wallEdge', worldX, worldY, tileSize - 1, tileSize - 1, { rotation });
        }
    }

    drawMapTiles(map, startCol, endCol, startRow, endRow, tileSize, isWallVisible) {
        if (!map) return;
        const visibleWall = typeof isWallVisible === 'function' ? isWallVisible : () => true;
        const layers = ['floor-base', 'floor-detail', 'wall'];

        for (const layer of layers) {
            for (let y = startRow; y < endRow; y++) {
                for (let x = startCol; x < endCol; x++) {
                    if (layer === 'wall' && !visibleWall(x, y)) continue;
                    this.drawMapTileLayer(map, x, y, tileSize, layer);
                }
            }
        }
    }

    drawEntityRect(x, y, w, h, color) {
        if (!this.camera) return;
        const screenPos = this.camera.worldToScreen(x, y);

        // Simple culling
        if (screenPos.x + w / 2 < 0 || screenPos.x - w / 2 > this.camera.width ||
            screenPos.y + h / 2 < 0 || screenPos.y - h / 2 > this.camera.height) {
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenPos.x - w / 2, screenPos.y - h / 2, w, h);
    }

    renderMinimap(player, portal, floorTransitions, map, config, isExpanded = false, dynamicLayout = null, bossRoomButtons = [], dungeonServices = []) {
        if (!config || !map || !player) return;

        let currentWidth = isExpanded ? config.expandedWidth : config.width;
        let currentHeight = isExpanded ? config.expandedHeight : config.height;

        let uiX = this.canvas.width - currentWidth - config.xOffset;
        let uiY = config.yOffset;

        if (dynamicLayout) {
            currentWidth = dynamicLayout.width;
            currentHeight = dynamicLayout.height;
            uiX = dynamicLayout.x;
            uiY = dynamicLayout.y;
        }

        // Draw background and border
        this.ctx.fillStyle = config.backgroundColor;
        this.ctx.fillRect(uiX, uiY, currentWidth, currentHeight);
        this.ctx.strokeStyle = config.borderColor;
        this.ctx.lineWidth = 2 * (config.pixelScale || 1);
        this.ctx.strokeRect(uiX, uiY, currentWidth, currentHeight);

        // Calculate tile range to render
        const pTileX = Math.floor(player.x / map.tileSize);
        const pTileY = Math.floor(player.y / map.tileSize);

        // Minimap center
        const centerX = uiX + currentWidth / 2;
        const centerY = uiY + currentHeight / 2;

        let tileScale = config.tileScale;
        let mapCenterX = pTileX;
        let mapCenterY = pTileY;

        if (isExpanded) {
            // When expanded, scale the tiles to fit the entire map into the minimap view
            const scaleX = currentWidth / map.cols;
            const scaleY = currentHeight / map.rows;
            tileScale = Math.min(scaleX, scaleY) * 0.95; // 95% to leave a tiny padding
            // Center the entire map instead of centering on player
            mapCenterX = map.cols / 2;
            mapCenterY = map.rows / 2;
        }

        const tilesAcross = Math.ceil(currentWidth / tileScale);
        const tilesDown = Math.ceil(currentHeight / tileScale);
        
        const halfAcross = Math.floor(tilesAcross / 2);
        const halfDown = Math.floor(tilesDown / 2);

        const startTileX = Math.floor(mapCenterX - halfAcross);
        const endTileX = Math.ceil(mapCenterX + halfAcross);
        const startTileY = Math.floor(mapCenterY - halfDown);
        const endTileY = Math.ceil(mapCenterY + halfDown);

        // Set clipping mask so tiles don't overflow the minimap rect
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(uiX, uiY, currentWidth, currentHeight);
        this.ctx.clip();

        // Draw tiles
        for (let ty = startTileY; ty <= endTileY; ty++) {
            for (let tx = startTileX; tx <= endTileX; tx++) {
                // Calculate draw position
                const drawX = centerX + (tx - mapCenterX) * tileScale - tileScale / 2;
                const drawY = centerY + (ty - mapCenterY) * tileScale - tileScale / 2;

                if (tx < 0 || tx >= map.cols || ty < 0 || ty >= map.rows) {
                    // Out of bounds
                    this.ctx.fillStyle = config.fogColor;
                    this.ctx.fillRect(drawX, drawY, tileScale, tileScale);
                    continue;
                }

                const index = ty * map.cols + tx;
                const isVisited = map.visitedGrid[index];

                if (!isVisited) {
                    this.ctx.fillStyle = config.fogColor;
                } else {
                    const tileType = map.grid[index];
                    this.ctx.fillStyle = (tileType === 1 || tileType === 2) ? config.exploredFloorColor : config.exploredWallColor;
                }
                
                this.ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(tileScale), Math.ceil(tileScale));
            }
        }

        // Draw Portal (if visited)
        if (portal && !portal.isCollected) {
            const portTileX = Math.floor(portal.x / map.tileSize);
            const portTileY = Math.floor(portal.y / map.tileSize);
            if (portTileX >= 0 && portTileX < map.cols && portTileY >= 0 && portTileY < map.rows) {
                if (map.visitedGrid[portTileY * map.cols + portTileX]) {
                    const drawX = centerX + (portTileX - mapCenterX) * tileScale;
                    const drawY = centerY + (portTileY - mapCenterY) * tileScale;
                    this.ctx.fillStyle = config.portalColor;
                    this.ctx.beginPath();
                    this.ctx.arc(drawX, drawY, tileScale, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // Draw Floor Transitions (Doors and Holes)
        if (floorTransitions && floorTransitions.length > 0) {
            for (let transition of floorTransitions) {
                if (transition.activated) continue;
                
                const tTileX = Math.floor(transition.x / map.tileSize);
                const tTileY = Math.floor(transition.y / map.tileSize);
                
                if (tTileX >= 0 && tTileX < map.cols && tTileY >= 0 && tTileY < map.rows) {
                    if (map.visitedGrid[tTileY * map.cols + tTileX]) {
                        const drawX = centerX + (tTileX - mapCenterX) * tileScale - tileScale / 2;
                        const drawY = centerY + (tTileY - mapCenterY) * tileScale - tileScale / 2;
                        
                        this.ctx.fillStyle = transition.type === 'door' ? config.doorColor : config.holeColor;
                        this.ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(tileScale), Math.ceil(tileScale));
                    }
                }
            }
        }

        if (map.bossRoom) {
            const entrance = map.bossRoom.entranceTile;
            if (map.visitedGrid[entrance.y * map.cols + entrance.x]) {
                const drawX = centerX + (entrance.x - mapCenterX) * tileScale - tileScale / 2;
                const drawY = centerY + (entrance.y - mapCenterY) * tileScale - tileScale / 2;
                this.ctx.fillStyle = map.bossRoom.opened ? '#66d9ff' : (map.bossRoom.unlocked ? '#1f9fbd' : '#e74c3c');
                this.ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.ceil(tileScale), Math.ceil(tileScale));
            }
        }

        if (bossRoomButtons && bossRoomButtons.length > 0) {
            for (let button of bossRoomButtons) {
                const bTileX = Math.floor(button.x / map.tileSize);
                const bTileY = Math.floor(button.y / map.tileSize);
                if (bTileX >= 0 && bTileX < map.cols && bTileY >= 0 && bTileY < map.rows && map.visitedGrid[bTileY * map.cols + bTileX]) {
                    const drawX = centerX + (bTileX - mapCenterX) * tileScale;
                    const drawY = centerY + (bTileY - mapCenterY) * tileScale;
                    this.ctx.fillStyle = button.activated ? '#2ecc71' : '#66d9ff';
                    this.ctx.beginPath();
                    this.ctx.arc(drawX, drawY, Math.max(2, tileScale), 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        if (dungeonServices && dungeonServices.length > 0) {
            for (let service of dungeonServices) {
                const sTileX = Math.floor(service.x / map.tileSize);
                const sTileY = Math.floor(service.y / map.tileSize);
                if (sTileX >= 0 && sTileX < map.cols && sTileY >= 0 && sTileY < map.rows && map.visitedGrid[sTileY * map.cols + sTileX]) {
                    const drawX = centerX + (sTileX - mapCenterX) * tileScale;
                    const drawY = centerY + (sTileY - mapCenterY) * tileScale;
                    this.ctx.fillStyle = service.kind === 'blacksmith' ? '#ff9f43' : '#66d9ff';
                    this.ctx.fillRect(
                        Math.floor(drawX - tileScale),
                        Math.floor(drawY - tileScale),
                        Math.ceil(tileScale * 2),
                        Math.ceil(tileScale * 2)
                    );
                }
            }
        }

        // Draw Player
        const playerDrawX = centerX + (pTileX - mapCenterX) * tileScale;
        const playerDrawY = centerY + (pTileY - mapCenterY) * tileScale;
        this.ctx.fillStyle = config.playerColor;
        this.ctx.beginPath();
        this.ctx.arc(playerDrawX, playerDrawY, tileScale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    static hashString(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
}
