class DungeonServiceObject extends Entity {
    constructor(x, y, options = {}) {
        const size = options.size || 128;
        super(x, y, size, size, 1);
        this.kind = options.kind || 'service';
        this.label = options.label || 'Service';
        this.hintText = options.hintText || 'Press [F] to Use';
        this.primaryColor = options.primaryColor || '#a335ee';
        this.secondaryColor = options.secondaryColor || '#2d164d';
        this.glyph = options.glyph || '?';
        this.interactionRadius = options.interactionRadius || 96;
        this.spriteVariants = Math.max(1, options.spriteVariants || 1);
        this.variant = DungeonServiceObject.normalizeVariant(
            options.variant,
            this.spriteVariants,
            this.kind,
            x,
            y
        );
        this.pulse = 0;
    }

    update(dt) {
        this.pulse += dt * 2;
    }

    canInteract() {
        return true;
    }

    interact(player, gameEngine) {
        if (!window.gloomvaultApp) return;
        if (this.kind === 'blacksmith' && window.gloomvaultApp.openDungeonBlacksmith) {
            window.gloomvaultApp.openDungeonBlacksmith(gameEngine);
        } else if (this.kind === 'bank' && window.gloomvaultApp.openDungeonBank) {
            window.gloomvaultApp.openDungeonBank(gameEngine);
        }
    }

    render(ctx, renderer) {
        if (!renderer || !renderer.camera) return;
        const screenPos = renderer.camera.worldToScreen(this.x, this.y);
        const width = this.width;
        const height = this.height;
        const left = screenPos.x - width / 2;
        const top = screenPos.y - height / 2;
        const pulseAlpha = 0.45 + Math.sin(this.pulse) * 0.2;
        const spriteKey = this.getSpriteKey();
        const drewSprite = Boolean(
            spriteKey &&
            renderer.drawAsset &&
            renderer.drawAsset(spriteKey, this.x, this.y, width, height)
        );

        ctx.save();
        if (!drewSprite) {
            ctx.shadowColor = this.primaryColor;
            ctx.shadowBlur = 16;
            ctx.fillStyle = this.secondaryColor;
            ctx.fillRect(left, top, width, height);

            ctx.shadowBlur = 0;
            ctx.strokeStyle = this.primaryColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(left + 4, top + 4, width - 8, height - 8);

            ctx.fillStyle = this.primaryColor;
            ctx.globalAlpha = 0.22;
            ctx.fillRect(left + 14, top + 14, width - 28, height - 28);
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#f8f1ff';
            ctx.font = 'bold 44px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.glyph, screenPos.x, screenPos.y - 8);
        }

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.label, screenPos.x, screenPos.y + 34);

        if (this.canInteract()) {
            ctx.strokeStyle = this.hexToRgba(this.primaryColor, pulseAlpha);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, this.interactionRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    hexToRgba(hex, alpha) {
        const normalized = hex.replace('#', '');
        const value = parseInt(normalized.length === 3
            ? normalized.split('').map(ch => ch + ch).join('')
            : normalized, 16);
        const r = (value >> 16) & 255;
        const g = (value >> 8) & 255;
        const b = value & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getSpriteKey() {
        if (!this.kind || !this.variant) return null;
        const stateSuffix = this.closed ? '.closed' : '';
        return `sprites.service.${this.kind}.${this.variant}${stateSuffix}`;
    }

    static normalizeVariant(variant, maxVariants, kind, x, y) {
        const parsed = Number.parseInt(variant, 10);
        if (Number.isFinite(parsed) && parsed >= 1 && parsed <= maxVariants) {
            return parsed;
        }

        const seed = `${kind}:${Math.round(x)}:${Math.round(y)}`;
        const hash = DungeonServiceObject.hashString(seed);
        return (hash % maxVariants) + 1;
    }

    static hashString(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }
}

class BlacksmithObject extends DungeonServiceObject {
    constructor(x, y, options = {}) {
        super(x, y, {
            ...options,
            kind: 'blacksmith',
            label: 'Blacksmith',
            hintText: 'Press [F] to Use Blacksmith',
            primaryColor: '#ff9f43',
            secondaryColor: '#3a2114',
            glyph: 'Anv',
            spriteVariants: 3
        });
    }
}

class VoidBankObject extends DungeonServiceObject {
    constructor(x, y, options = {}) {
        super(x, y, {
            ...options,
            kind: 'bank',
            label: 'Void Bank',
            hintText: 'Press [F] to Open Void Bank',
            primaryColor: '#66d9ff',
            secondaryColor: '#11163d',
            glyph: 'Void',
            spriteVariants: 3
        });
    }
}

class HealingWellObject extends DungeonServiceObject {
    constructor(x, y, options = {}) {
        super(x, y, {
            ...options,
            kind: 'healingWell',
            label: 'Healing Well',
            hintText: 'Press [F] to Drink',
            primaryColor: '#2ecc71',
            secondaryColor: '#123521',
            glyph: 'Heal',
            spriteVariants: 2
        });
        this.closed = Boolean(options.closed);
    }

    canInteract() {
        return !this.closed;
    }

    interact(player, gameEngine) {
        if (this.closed || !player) return false;

        this.closed = true;
        if (player.applyHealingWellBuff) {
            player.applyHealingWellBuff();
        } else {
            player.hp = player.maxHp;
        }

        if (gameEngine && gameEngine.particleSystem) {
            gameEngine.particleSystem.emitImpact(this.x, this.y, this.primaryColor, 28);
            gameEngine.particleSystem.emitDashTrail(this.x, this.y, this.primaryColor);
        }
        if (gameEngine && gameEngine.combatFeedback) {
            gameEngine.combatFeedback.addText('Well Restored', this.x, this.y - 28, this.primaryColor, 16, 1.4);
        }
        return true;
    }
}
