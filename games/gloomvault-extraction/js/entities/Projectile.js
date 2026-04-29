class Projectile extends Entity {
    constructor(x, y, angle, speed, damage, lifetime) {
        super(x, y, 10, 10, 1);
        this.angle = angle;
        this.speed = speed;
        this.damage = damage;
        this.lifetime = lifetime;
        this.timer = 0;
        this.markedForDeletion = false;
    }

    update(dt, mapGen) {
        this.timer += dt;
        if (this.timer >= this.lifetime) {
            this.markedForDeletion = true;
            return;
        }

        // Move projectile
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;

        // Check wall collision
        if (this.checkCollision(mapGen)) {
            this.markedForDeletion = true;
            // Optionally spawn hit particles or feedback here
        }
    }

    checkCollision(mapGen) {
        if (!mapGen) return false;

        const checkRadius = this.width / 2;
        const leftTile = Math.floor((this.x - checkRadius) / mapGen.tileSize);
        const rightTile = Math.floor((this.x + checkRadius) / mapGen.tileSize);
        const topTile = Math.floor((this.y - checkRadius) / mapGen.tileSize);
        const bottomTile = Math.floor((this.y + checkRadius) / mapGen.tileSize);

        // Map bounds check
        if (this.x - checkRadius < 0 || this.x + checkRadius > mapGen.cols * mapGen.tileSize ||
            this.y - checkRadius < 0 || this.y + checkRadius > mapGen.rows * mapGen.tileSize) {
            return true;
        }

        // Tile collision check
        for (let y = topTile; y <= bottomTile; y++) {
            for (let x = leftTile; x <= rightTile; x++) {
                if (mapGen.getTile(x, y) === 0) { // 0 is wall
                    return true;
                }
            }
        }

        return false;
    }

    render(ctx, renderer) {
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        
        ctx.fillStyle = '#ffff00'; // Glowing yellow/white
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Small inner core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, this.width / 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
