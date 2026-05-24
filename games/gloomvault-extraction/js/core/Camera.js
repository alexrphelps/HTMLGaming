class Camera {
    constructor(width, height, maxWorldWidth = 1600, maxWorldHeight = 900) {
        this.x = 0;
        this.y = 0;
        this.screenWidth = width;
        this.screenHeight = height;
        this.maxWorldWidth = maxWorldWidth;
        this.maxWorldHeight = maxWorldHeight;
        this.width = maxWorldWidth;
        this.height = maxWorldHeight;
        this.renderScale = 1;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        // The bounds of the map, updated when a level is generated
        this.minX = 0;
        this.minY = 0;
        this.maxX = 10000;
        this.maxY = 10000;

        // Screenshake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;

        this.updateDimensions(width, height);
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    updateDimensions(width, height) {
        this.screenWidth = Math.max(1, width || 1);
        this.screenHeight = Math.max(1, height || 1);
        this.width = this.maxWorldWidth * this.zoom;
        this.height = this.maxWorldHeight * this.zoom;

        this.renderScale = Math.max(
            this.screenWidth / this.width,
            this.screenHeight / this.height
        );
        this.offsetX = (this.screenWidth - this.width * this.renderScale) / 2;
        this.offsetY = (this.screenHeight - this.height * this.renderScale) / 2;
        this.x = Math.max(this.minX, Math.min(this.x, this.maxX - this.width));
        this.y = Math.max(this.minY, Math.min(this.y, this.maxY - this.height));
    }

    setZoom(zoom) {
        this.zoom = Math.max(1, zoom || 1);
        this.updateDimensions(this.screenWidth, this.screenHeight);
    }

    setBounds(maxX, maxY) {
        this.maxX = maxX;
        this.maxY = maxY;
    }

    follow(target, dt) {
        // Center the camera on the target
        let targetX = target.x - this.width / 2;
        let targetY = target.y - this.height / 2;

        // Apply Screenshake
        if (this.shakeDuration > 0) {
            targetX += (Math.random() - 0.5) * 2 * this.shakeIntensity;
            targetY += (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeDuration -= dt || 0.016; // default 60fps dt if missing
        }

        // Optional smooth follow (lerp)
        const lerpFactor = 0.1;
        this.x += (targetX - this.x) * lerpFactor;
        this.y += (targetY - this.y) * lerpFactor;

        // Clamp camera to map bounds
        this.x = Math.max(this.minX, Math.min(this.x, this.maxX - this.width));
        this.y = Math.max(this.minY, Math.min(this.y, this.maxY - this.height));
    }

    worldToScreen(x, y) {
        return { x: x - this.x, y: y - this.y };
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.offsetX) / this.renderScale + this.x,
            y: (y - this.offsetY) / this.renderScale + this.y
        };
    }

    applyTransform(ctx) {
        ctx.setTransform(this.renderScale, 0, 0, this.renderScale, this.offsetX, this.offsetY);
    }
}
