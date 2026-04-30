class FloorTransition extends Entity {
    constructor(x, y, type) {
        super(x, y, 40, 40);
        this.type = type; // 'door' or 'hole'
        this.interactionRadius = 60;
        this.pulse = 0;
        this.activated = false;
    }

    update(dt) {
        if (!this.activated) {
            this.pulse += dt * 2;
        }
    }

    interact(gameEngine) {
        if (this.activated) return;
        this.activated = true;
        gameEngine.descendToNextFloor();
    }

    render(ctx, renderer) {
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        
        if (this.type === 'door') {
            // Draw wooden door
            ctx.fillStyle = '#5c4033'; // Dark brown
            ctx.fillRect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);
            
            // Door frame/details
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenPos.x - this.width/2, screenPos.y - this.height/2, this.width, this.height);
            
            // Doorknob
            ctx.fillStyle = '#ffd700'; // Gold
            ctx.beginPath();
            ctx.arc(screenPos.x + 10, screenPos.y, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'hole') {
            // Draw dark pit
            ctx.fillStyle = '#0a0a0a';
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Hole edge
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // Draw interaction pulse if not activated
        if (!this.activated) {
            ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + Math.sin(this.pulse) * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.interactionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
