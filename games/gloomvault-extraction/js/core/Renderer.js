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
}