class DroppedItem extends Entity {
    constructor(x, y, itemData) {
        super(x, y, 15, 15, 1); // small entity
        this.itemData = itemData;
        this.pickupRadius = 50;
        
        // Floating animation
        this.floatOffset = 0;
        this.floatTime = Math.random() * Math.PI * 2;
        this.floatSpeed = 3;
        this.floatAmplitude = 5;
    }

    update(dt) {
        this.floatTime += dt * this.floatSpeed;
        this.floatOffset = Math.sin(this.floatTime) * this.floatAmplitude;
    }

    render(ctx, renderer) {
        const screenPos = renderer.camera.worldToScreen(this.x, this.y + this.floatOffset);
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.itemData.color;
        
        // Draw diamond shape
        ctx.fillStyle = this.itemData.color;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - this.height/2);
        ctx.lineTo(screenPos.x + this.width/2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + this.height/2);
        ctx.lineTo(screenPos.x - this.width/2, screenPos.y);
        ctx.closePath();
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw interaction hint if player is nearby (handled by GameEngine/Renderer, but for now we draw a small outline)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
}
