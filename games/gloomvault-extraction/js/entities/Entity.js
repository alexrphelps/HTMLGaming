class Entity {
    constructor(x, y, width, height, maxHp) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.hp = maxHp;

        // Animation State
        this.animationState = 'idle'; // idle, run, attack
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDuration = 0.1; // 10 FPS
        this.frameCount = 4; // Assume 4 frames per animation row
    }

    takeDamage(amount) {
        const appliedDamage = Math.max(0, Math.min(this.hp, amount));
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        return { shield: 0, hp: appliedDamage };
    }

    updateAnimation(dt) {
        const frameCount = this.getAnimationFrameCount ? this.getAnimationFrameCount() : this.frameCount;
        const frameDuration = this.getAnimationFrameDuration ? this.getAnimationFrameDuration() : this.frameDuration;
        this.frameTimer += dt;
        if (this.frameTimer >= frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % Math.max(1, frameCount || this.frameCount || 1);
        }
    }

    getStatusGlowColors() {
        if (!this.statusEffects || this.statusEffects.length === 0) return [];

        const colors = [];
        for (const effect of this.statusEffects) {
            if (effect.durationLeft <= 0 || !effect.color) continue;
            if (!colors.includes(effect.color)) {
                colors.push(effect.color);
            }
        }
        return colors;
    }

    renderStatusGlow(ctx, renderer, radius = null) {
        const colors = this.getStatusGlowColors();
        if (colors.length === 0 || !renderer || !renderer.camera) return;

        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        const glowRadius = radius || Math.max(this.width, this.height) * 0.72;
        const segment = (Math.PI * 2) / colors.length;

        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = Math.max(3, glowRadius * 0.18);
        ctx.shadowBlur = 12;

        for (let i = 0; i < colors.length; i++) {
            const start = -Math.PI / 2 + segment * i;
            const end = start + segment;
            ctx.strokeStyle = colors[i];
            ctx.shadowColor = colors[i];
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, glowRadius, start, end);
            ctx.stroke();
        }

        ctx.restore();
    }
}
