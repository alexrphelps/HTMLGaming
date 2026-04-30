class Camera {
    constructor(width, height) {
        this.x = 0;
        this.y = 0;
        this.width = width;
        this.height = height;
        // The bounds of the map, updated when a level is generated
        this.minX = 0;
        this.minY = 0;
        this.maxX = 10000;
        this.maxY = 10000;

        // Screenshake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
    }

    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    updateDimensions(width, height) {
        this.width = width;
        this.height = height;
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
        return { x: x + this.x, y: y + this.y };
    }
}