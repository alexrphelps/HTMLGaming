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

    renderMinimap(player, portal, map, config) {
        if (!config || !map || !player) return;

        const uiX = this.canvas.width - config.width - config.xOffset;
        const uiY = config.yOffset;

        // Draw background and border
        this.ctx.fillStyle = config.backgroundColor;
        this.ctx.fillRect(uiX, uiY, config.width, config.height);
        this.ctx.strokeStyle = config.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(uiX, uiY, config.width, config.height);

        // Calculate tile range to render
        const pTileX = Math.floor(player.x / map.tileSize);
        const pTileY = Math.floor(player.y / map.tileSize);

        // Minimap center
        const centerX = uiX + config.width / 2;
        const centerY = uiY + config.height / 2;

        const tileScale = config.tileScale;
        const tilesAcross = Math.ceil(config.width / tileScale);
        const tilesDown = Math.ceil(config.height / tileScale);
        
        const halfAcross = Math.floor(tilesAcross / 2);
        const halfDown = Math.floor(tilesDown / 2);

        const startTileX = pTileX - halfAcross;
        const endTileX = pTileX + halfAcross;
        const startTileY = pTileY - halfDown;
        const endTileY = pTileY + halfDown;

        // Set clipping mask so tiles don't overflow the minimap rect
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(uiX, uiY, config.width, config.height);
        this.ctx.clip();

        // Draw tiles
        for (let ty = startTileY; ty <= endTileY; ty++) {
            for (let tx = startTileX; tx <= endTileX; tx++) {
                // Calculate draw position
                const drawX = centerX + (tx - pTileX) * tileScale - tileScale / 2;
                const drawY = centerY + (ty - pTileY) * tileScale - tileScale / 2;

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
                    const drawX = centerX + (portTileX - pTileX) * tileScale;
                    const drawY = centerY + (portTileY - pTileY) * tileScale;
                    this.ctx.fillStyle = config.portalColor;
                    this.ctx.beginPath();
                    this.ctx.arc(drawX, drawY, tileScale, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }

        // Draw Player
        this.ctx.fillStyle = config.playerColor;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, tileScale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }
}