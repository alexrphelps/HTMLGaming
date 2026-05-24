class ExtractionPortal extends Entity {
    constructor(x, y) {
        super(x, y, 112, 112, 1);
        this.radius = 30;
        this.interactionRadius = 60;
        this.closedRadius = 40;
        this.pulse = 0;
        this.enemiesNearby = false;
        this.enemyCheckRadius = 300;
        this.frameCount = 4;
        this.frameDuration = 0.12;
    }

    update(dt, enemies = []) {
        this.pulse += dt * 2;
        this.updateAnimation(dt);
        this.enemiesNearby = false;
        for (let enemy of enemies) {
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            if (dist <= this.enemyCheckRadius) {
                this.enemiesNearby = true;
                break;
            }
        }
    }

    getSpriteKey() {
        const frame = (Math.floor(this.currentFrame || 0) % this.frameCount) + 1;
        return `sprites.extractionPortal.${frame}`;
    }

    renderBlockedOverlay(ctx, camera) {
        const screenPos = camera.worldToScreen(this.x, this.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;

        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.closedRadius + Math.sin(this.pulse) * 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 50, 50, 0.26)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 90, 90, 0.72)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.closedRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    render(ctx, rendererOrCamera) {
        const renderer = rendererOrCamera && rendererOrCamera.camera ? rendererOrCamera : null;
        const camera = renderer ? renderer.camera : rendererOrCamera;
        if (!camera) return;

        if (renderer && renderer.drawAsset && renderer.drawAsset(this.getSpriteKey(), this.x, this.y, this.width, this.height)) {
            if (this.enemiesNearby) {
                this.renderBlockedOverlay(ctx, camera);
            }
            return;
        }

        const screenPos = camera.worldToScreen(this.x, this.y);
        const screenX = screenPos.x;
        const screenY = screenPos.y;

        // Draw outer portal glow
        ctx.beginPath();
        if (this.enemiesNearby) {
            ctx.arc(screenX, screenY, this.closedRadius + Math.sin(this.pulse) * 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 50, 50, 0.3)'; // Red glow
        } else {
            ctx.arc(screenX, screenY, this.radius + Math.sin(this.pulse) * 5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(138, 43, 226, 0.3)'; // Purple glow
        }
        ctx.fill();

        // Draw inner portal core
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius - 10, 0, Math.PI * 2);
        if (this.enemiesNearby) {
            ctx.fillStyle = 'rgba(150, 0, 0, 0.8)'; // Dark red core
        } else {
            ctx.fillStyle = 'rgba(75, 0, 130, 0.8)'; // Darker purple core
        }
        ctx.fill();

        // Swirling effect
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.pulse);
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(15, 0);
        ctx.moveTo(0, -15);
        ctx.lineTo(0, 15);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
}
