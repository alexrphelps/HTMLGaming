class Renderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        // Basic placeholder system: A color rect
        this.camera = null; 
    }

    setCamera(camera) {
        this.camera = camera;
    }

    clear(color = '#050505') {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRect(worldX, worldY, width, height, color) {
        if (!this.camera) return;
        const screenPos = this.camera.worldToScreen(worldX, worldY);
        
        // Simple culling
        if (screenPos.x + width < 0 || screenPos.x > this.canvas.width ||
            screenPos.y + height < 0 || screenPos.y > this.canvas.height) {
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenPos.x, screenPos.y, width, height);
    }

    drawSpriteDirect(ctx, image, srcX, srcY, srcW, srcH, destX, destY, destW, destH) {
        // Assume already translated/rotated
        ctx.drawImage(image, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
    }

    drawSprite(image, srcX, srcY, srcW, srcH, destX, destY, destW, destH) {
        if (!this.camera) return;
        const screenPos = this.camera.worldToScreen(destX, destY);

        if (screenPos.x + destW < 0 || screenPos.x > this.canvas.width ||
            screenPos.y + destH < 0 || screenPos.y > this.canvas.height) {
            return;
        }

        this.ctx.drawImage(image, srcX, srcY, srcW, srcH, screenPos.x, screenPos.y, destW, destH);
    }

    drawEntityRect(x, y, w, h, color) {
        if (!this.camera) return;
        const screenPos = this.camera.worldToScreen(x, y);

        // Simple culling
        if (screenPos.x + w / 2 < 0 || screenPos.x - w / 2 > this.canvas.width ||
            screenPos.y + h / 2 < 0 || screenPos.y - h / 2 > this.canvas.height) {
            return;
        }

        this.ctx.fillStyle = color;
        this.ctx.fillRect(screenPos.x - w / 2, screenPos.y - h / 2, w, h);
    }

    renderMinimap(player, portal, floorTransitions, map, config, isExpanded = false, dynamicLayout = null) {
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
        this.ctx.lineWidth = 2;
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

        // Draw Player
        const playerDrawX = centerX + (pTileX - mapCenterX) * tileScale;
        const playerDrawY = centerY + (pTileY - mapCenterY) * tileScale;
        this.ctx.fillStyle = config.playerColor;
        this.ctx.beginPath();
        this.ctx.arc(playerDrawX, playerDrawY, tileScale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }
}