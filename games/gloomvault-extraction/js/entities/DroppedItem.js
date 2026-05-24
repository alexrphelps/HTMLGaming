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
        const worldDropConfig = typeof AssetManifest !== 'undefined' && AssetManifest.worldDrops
            ? AssetManifest.worldDrops
            : null;
        const useLootIcons = Boolean(worldDropConfig && worldDropConfig.useLootIcons);
        const lootIcon = useLootIcons && renderer.assetManager && renderer.assetManager.getLootIcon
            ? renderer.assetManager.getLootIcon(this.itemData)
            : null;
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.itemData.color;

        // Draw rarity diamond behind the icon, or as the full fallback when no icon is available.
        ctx.fillStyle = this.itemData.color;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y - this.height/2);
        ctx.lineTo(screenPos.x + this.width/2, screenPos.y);
        ctx.lineTo(screenPos.x, screenPos.y + this.height/2);
        ctx.lineTo(screenPos.x - this.width/2, screenPos.y);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (lootIcon) {
            const iconSize = 26;
            ctx.save();
            ctx.shadowBlur = 8;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.drawImage(lootIcon, screenPos.x - iconSize / 2, screenPos.y - iconSize / 2, iconSize, iconSize);
            ctx.restore();
        }
    }
}
