class CombatFeedback {
    constructor() {
        this.texts = [];
    }

    addText(text, x, y, color = '#ff0000', size = 16, lifetime = 1.0) {
        // Stack text if there are overlaps
        let overlap = true;
        let adjustedY = y;
        let attempts = 0;
        
        while (overlap && attempts < 10) {
            overlap = false;
            for (let t of this.texts) {
                // If texts are close horizontally and vertically, stack the new one up
                if (Math.abs(t.x - x) < 20 && Math.abs(t.y - adjustedY) < size + 2) {
                    overlap = true;
                    adjustedY -= (size + 2);
                    break;
                }
            }
            attempts++;
        }

        this.texts.push({
            text: text,
            x: x,
            y: adjustedY,
            color: color,
            size: size,
            lifetime: lifetime,
            timer: 0,
            vy: -30 // drift upwards 30 pixels per second
        });
    }

    update(dt) {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            let t = this.texts[i];
            t.timer += dt;
            t.y += t.vy * dt;

            if (t.timer >= t.lifetime) {
                this.texts.splice(i, 1);
            }
        }
    }

    render(ctx, renderer) {
        for (let t of this.texts) {
            const screenPos = renderer.camera.worldToScreen(t.x, t.y);
            
            // Calculate alpha for fade out in the second half of life
            let alpha = 1;
            if (t.timer > t.lifetime / 2) {
                alpha = 1 - ((t.timer - (t.lifetime / 2)) / (t.lifetime / 2));
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = t.color;
            ctx.font = `bold ${t.size}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Add a small black stroke for readability
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(t.text, screenPos.x, screenPos.y);
            ctx.fillText(t.text, screenPos.x, screenPos.y);
            
            ctx.globalAlpha = 1.0; // Reset
        }
    }
}
