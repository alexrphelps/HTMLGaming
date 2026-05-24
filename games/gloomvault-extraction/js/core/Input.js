class Input {
    constructor() {
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, rightDown: false };
        this.canvas = null;
        this._boundMouseMove = this._onMouseMove.bind(this);
        this._boundMouseDown = this._onMouseDown.bind(this);
        this._boundMouseUp = this._onMouseUp.bind(this);
        this._boundContextMenu = (e) => e.preventDefault();

        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    attach(canvas) {
        if (this.canvas === canvas) return;
        this.detach();
        this.canvas = canvas;

        canvas.addEventListener('mousemove', this._boundMouseMove);
        canvas.addEventListener('mousedown', this._boundMouseDown);
        canvas.addEventListener('mouseup', this._boundMouseUp);

        // Prevent context menu on right click in the game
        canvas.addEventListener('contextmenu', this._boundContextMenu);
    }

    detach() {
        if (!this.canvas || !this.canvas.removeEventListener) {
            this.canvas = null;
            return;
        }

        this.canvas.removeEventListener('mousemove', this._boundMouseMove);
        this.canvas.removeEventListener('mousedown', this._boundMouseDown);
        this.canvas.removeEventListener('mouseup', this._boundMouseUp);
        this.canvas.removeEventListener('contextmenu', this._boundContextMenu);
        this.mouse.down = false;
        this.mouse.rightDown = false;
        this.canvas = null;
    }

    _onMouseMove(e) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.mouse.x = (e.clientX - rect.left) * scaleX;
        this.mouse.y = (e.clientY - rect.top) * scaleY;
    }

    _onMouseDown(e) {
        if (e.button === 0) this.mouse.down = true;
        if (e.button === 2) this.mouse.rightDown = true;
    }

    _onMouseUp(e) {
        if (e.button === 0) this.mouse.down = false;
        if (e.button === 2) this.mouse.rightDown = false;
    }

    isKeyDown(code) {
        return !!this.keys[code];
    }
}
