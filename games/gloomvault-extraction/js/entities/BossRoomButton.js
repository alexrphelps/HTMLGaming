class BossRoomButton extends Entity {
    constructor(x, y, index) {
        super(x, y, 34, 34, 1);
        this.index = index;
        this.interactionRadius = 58;
        this.activated = false;
        this.pulse = 0;
    }

    update(dt) {
        if (!this.activated) {
            this.pulse += dt * 3;
        }
    }

    interact(gameEngine) {
        if (this.activated) return;

        this.activated = true;
        if (gameEngine.combatFeedback) {
            gameEngine.combatFeedback.addText(`Seal ${this.index + 1} Released`, this.x, this.y - 20, '#66d9ff', 14, 1.2);
        }

        gameEngine.checkBossRoomUnlock();
    }

    render(ctx, renderer) {
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        const glow = this.activated ? 0.7 : 0.35 + Math.sin(this.pulse) * 0.25;

        ctx.fillStyle = this.activated ? '#2ecc71' : '#1f5f7a';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.activated ? '#b8ffcf' : `rgba(102, 217, 255, ${glow})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.interactionRadius / 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}
