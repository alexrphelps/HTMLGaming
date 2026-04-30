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
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }

    updateAnimation(dt) {
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        }
    }
}
