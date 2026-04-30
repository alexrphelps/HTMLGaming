class Projectile extends Entity {
    constructor(x, y, angle, speed, damage, lifetime, isPlayerOwned = true, weaponType = 'pistol') {
        super(x, y, 10, 10, 1);
        this.angle = angle;
        this.speed = speed;
        this.damage = Math.round(damage);
        this.lifetime = lifetime;
        this.isPlayerOwned = isPlayerOwned;
        this.weaponType = weaponType;
        this.timer = 0;
        this.markedForDeletion = false;
        
        if (this.weaponType === 'melee_cleave') {
            this.width = 30;
            this.height = 30;
        }
    }

    update(dt, mapGen, particleSystem) {
        this.timer += dt;
        if (this.timer >= this.lifetime) {
            this.markedForDeletion = true;
            return;
        }

        // Move projectile
        this.x += Math.cos(this.angle) * this.speed * dt;
        this.y += Math.sin(this.angle) * this.speed * dt;

        if (particleSystem) {
            if (this.weaponType === 'melee_stab' || this.weaponType === 'melee_cleave') {
                particleSystem.emitDashTrail(this.x, this.y, '#ffffff');
            }
        }

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
        
        if (this.weaponType === 'melee_cleave') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.width, this.angle - 0.5, this.angle + 0.5);
            ctx.stroke();
            return;
        } else if (this.weaponType === 'melee_stab') {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(screenPos.x - Math.cos(this.angle) * 10, screenPos.y - Math.sin(this.angle) * 10);
            ctx.lineTo(screenPos.x + Math.cos(this.angle) * 10, screenPos.y + Math.sin(this.angle) * 10);
            ctx.stroke();
            return;
        }
        
        ctx.fillStyle = this.isPlayerOwned ? '#ffff00' : '#ff0000'; // Glowing yellow/white or red
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
