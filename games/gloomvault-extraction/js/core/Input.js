class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, rightDown: false };
        this.canvas = null;

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    attach(canvas) {
        this.canvas = canvas;
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.down = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.down = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });

        // Prevent context menu on right click in the game
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }
}