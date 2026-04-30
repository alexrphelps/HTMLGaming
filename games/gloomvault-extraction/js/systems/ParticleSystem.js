class ParticleSystem {
    constructor() {
        this.maxParticles = 1000;
        this.particles = new Array(this.maxParticles);
        for (let i = 0; i < this.maxParticles; i++) {
            this.particles[i] = {
                active: false,
                x: 0, y: 0,
                vx: 0, vy: 0,
                color: '#fff',
                size: 2,
                life: 0,
                maxLife: 1
            };
        }
        this.poolIndex = 0;
    }

    emit(x, y, vx, vy, color, size, maxLife) {
        // Find next inactive particle
        let p = null;
        for (let i = 0; i < this.maxParticles; i++) {
            const index = (this.poolIndex + i) % this.maxParticles;
            if (!this.particles[index].active) {
                p = this.particles[index];
                this.poolIndex = (index + 1) % this.maxParticles;
                break;
            }
        }

        if (p) {
            p.active = true;
            p.x = x;
            p.y = y;
            p.vx = vx;
            p.vy = vy;
            p.color = color;
            p.size = size;
            p.life = maxLife;
            p.maxLife = maxLife;
        }
    }

    emitImpact(x, y, color, count = 10) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 100 + 50;
            const size = Math.random() * 3 + 2;
            const life = Math.random() * 0.2 + 0.1;
            this.emit(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, size, life);
        }
    }

    emitDashTrail(x, y, color) {
        const size = Math.random() * 8 + 6;
        const life = Math.random() * 0.2 + 0.1;
        this.emit(x, y, 0, 0, color, size, life);
    }

    update(dt) {
        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (p.active) {
                p.life -= dt;
                if (p.life <= 0) {
                    p.active = false;
                } else {
                    p.x += p.vx * dt;
                    p.y += p.vy * dt;
                    p.size = Math.max(0, p.size * 0.95); // shrink slightly
                }
            }
        }
    }

    render(ctx, renderer) {
        if (!renderer.camera) return;

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particles[i];
            if (p.active) {
                const screenPos = renderer.camera.worldToScreen(p.x, p.y);
                
                // Culling
                if (screenPos.x + p.size < 0 || screenPos.x > renderer.canvas.width ||
                    screenPos.y + p.size < 0 || screenPos.y > renderer.canvas.height) {
                    continue;
                }

                ctx.fillStyle = p.color;
                // fade out
                ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
                ctx.fillRect(screenPos.x - p.size/2, screenPos.y - p.size/2, p.size, p.size);
            }
        }
        ctx.globalAlpha = 1.0;
    }
}
