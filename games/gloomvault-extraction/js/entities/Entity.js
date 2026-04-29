class Entity {
    constructor(x, y, width, height, maxHp) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.maxHp = maxHp;
        this.hp = maxHp;
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
    }
}
