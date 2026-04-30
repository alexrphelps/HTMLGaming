class ExtractionPortal extends Entity {
    constructor(x, y) {
        super(x, y);
        this.radius = 30;
        this.interactionRadius = 60;
        this.pulse = 0;
    }

    update(dt) {
        this.pulse += dt * 2;
    }

    render(ctx, camera) {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

        // Draw outer portal glow
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius + Math.sin(this.pulse) * 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(138, 43, 226, 0.3)'; // Purple glow
        ctx.fill();

        // Draw inner portal core
        ctx.beginPath();
        ctx.arc(screenX, screenY, this.radius - 10, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(75, 0, 130, 0.8)'; // Darker purple core
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
