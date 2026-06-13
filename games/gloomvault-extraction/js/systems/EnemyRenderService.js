class EnemyRenderService {
    getBaseSpriteKey(enemy) {
        if (enemy.type === 'brown_grunt') return 'sprites.enemy.brownGrunt';
        if (enemy.type === 'brute' && (enemy.spriteVariant === 'blue' || enemy.spriteVariant === 'purple')) {
            return `sprites.enemy.brute.${enemy.spriteVariant}`;
        }
        if (enemy.type === 'ranged' && enemy.spriteVariant === 'mage') return 'sprites.enemy.ranged.mage';
        return `sprites.enemy.${enemy.type || 'grunt'}`;
    }

    getSpriteKey(enemy) {
        return (enemy.bossProfile && enemy.bossProfile.spriteKey) || this.getBaseSpriteKey(enemy);
    }

    getSpriteFallbackKey(enemy) {
        return enemy.bossProfile && enemy.bossProfile.spriteKey ? this.getBaseSpriteKey(enemy) : 'sprites.enemy';
    }

    getAnimationFrameCount(enemy) {
        const assets = typeof window !== 'undefined' && window.gloomvaultAssets;
        if (!assets || !assets.getAnimationFrameCount) return enemy.frameCount;
        return assets.getAnimationFrameCount(this.getSpriteKey(enemy), enemy.animationState) ||
            assets.getAnimationFrameCount(this.getSpriteFallbackKey(enemy), enemy.animationState) ||
            assets.getAnimationFrameCount('sprites.enemy', enemy.animationState) ||
            enemy.frameCount;
    }

    getAnimationFrameDuration(enemy) {
        const assets = typeof window !== 'undefined' && window.gloomvaultAssets;
        if (!assets || !assets.getAnimationFrameDuration) return enemy.frameDuration;
        return assets.getAnimationFrameDuration(this.getSpriteKey(enemy)) ||
            assets.getAnimationFrameDuration(this.getSpriteFallbackKey(enemy)) ||
            assets.getAnimationFrameDuration('sprites.enemy') ||
            enemy.frameDuration;
    }

    getSpriteRenderSize(enemy) {
        if (enemy.bossProfile && enemy.bossProfile.spriteRenderScale) {
            return Math.max(enemy.width, enemy.height) * 2 * enemy.bossProfile.spriteRenderScale;
        }
        if (enemy.type === 'brute') return 30 * 2 * 1.2;
        if (enemy.type === 'brown_grunt') return 30 * 2 * 1.15;
        if (enemy.type === 'ranged' && enemy.spriteVariant === 'mage') return Math.max(enemy.width, enemy.height) * 2 * 1.35;
        return Math.max(enemy.width, enemy.height) * 2;
    }

    render(enemy, ctx, renderer) {
        const spriteKey = this.getSpriteKey(enemy);
        let renderSpriteKey = spriteKey;
        let spriteFrame = renderer && renderer.assetManager && renderer.assetManager.getSpriteFrame
            ? renderer.assetManager.getSpriteFrame(spriteKey, enemy.animationState, enemy.currentFrame)
            : null;

        if (!spriteFrame) {
            const fallbackKey = this.getSpriteFallbackKey(enemy);
            spriteFrame = renderer && renderer.assetManager && renderer.assetManager.getSpriteFrame
                ? renderer.assetManager.getSpriteFrame(fallbackKey, enemy.animationState, enemy.currentFrame)
                : null;
            if (spriteFrame) renderSpriteKey = fallbackKey;
        }

        if (renderer && renderer.drawAnimationFrameDirect && spriteFrame) {
            enemy.renderStatusGlow(ctx, renderer);
            ctx.save();
            const screenPos = renderer.camera.worldToScreen(enemy.x, enemy.y);
            ctx.translate(screenPos.x, screenPos.y);
            ctx.rotate(enemy.angle - Math.PI / 2);
            const spriteSize = this.getSpriteRenderSize(enemy);
            renderer.drawAnimationFrameDirect(ctx, renderSpriteKey, enemy.animationState, enemy.currentFrame, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
            ctx.restore();
            return;
        }

        this.renderFallback(enemy, ctx, renderer);
    }

    renderFallback(enemy, ctx, renderer) {
        const screenPos = renderer.camera.worldToScreen(enemy.x, enemy.y);
        enemy.renderStatusGlow(ctx, renderer);

        ctx.fillStyle = enemy.hitFlashTimer > 0 ? '#ffffff' : enemy.color;
        if (enemy.state === 'attack' && (enemy.type === 'brute' || enemy.type === 'boss')) {
            if (Math.floor(Math.max(0, enemy.attackTimer) * 10) % 2 === 0) ctx.fillStyle = '#ffffff';
        } else if (enemy.state === 'dodge') {
            ctx.fillStyle = '#66d9ff';
        }

        ctx.beginPath();
        if (enemy.isGruntLike()) {
            ctx.rect(screenPos.x - enemy.width / 2, screenPos.y - enemy.height / 2, enemy.width, enemy.height);
        } else if (enemy.type === 'ranged') {
            ctx.moveTo(screenPos.x + Math.cos(enemy.angle) * enemy.width / 2, screenPos.y + Math.sin(enemy.angle) * enemy.height / 2);
            ctx.lineTo(screenPos.x + Math.cos(enemy.angle + 2.6) * enemy.width / 2, screenPos.y + Math.sin(enemy.angle + 2.6) * enemy.height / 2);
            ctx.lineTo(screenPos.x + Math.cos(enemy.angle - 2.6) * enemy.width / 2, screenPos.y + Math.sin(enemy.angle - 2.6) * enemy.height / 2);
        } else if (enemy.type === 'brute' || enemy.type === 'boss') {
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(
                    screenPos.x + enemy.width / 2 * Math.cos(enemy.angle + i * Math.PI / 3),
                    screenPos.y + enemy.height / 2 * Math.sin(enemy.angle + i * Math.PI / 3)
                );
            }
        }
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenPos.x + Math.cos(enemy.angle) * enemy.width / 2, screenPos.y + Math.sin(enemy.angle) * enemy.width / 2);
        ctx.stroke();
    }
}

if (typeof window !== 'undefined') {
    window.EnemyRenderService = EnemyRenderService;
}
