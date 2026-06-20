(function (ns) {
  'use strict';

  class InputManager {
    constructor(canvas) {
      this.canvas = canvas;
      this.keys = new Set();
      this.pressed = new Set();
      this.pointer = { x: 0, y: 0, down: false, clicked: false };
      this.onKeyDown = event => {
        const key = event.key.toLowerCase();
        if (!this.keys.has(key)) this.pressed.add(key);
        this.keys.add(key);
        if (['enter', 'escape', ' '].includes(key)) event.preventDefault();
      };
      this.onKeyUp = event => this.keys.delete(event.key.toLowerCase());
      this.onPointer = event => {
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = Math.max(0, Math.min(ns.CONFIG.width, (event.clientX - rect.left) * ns.CONFIG.width / rect.width));
        this.pointer.y = Math.max(0, Math.min(ns.CONFIG.height, (event.clientY - rect.top) * ns.CONFIG.height / rect.height));
      };
      this.onPointerDown = event => { this.onPointer(event); this.pointer.down = true; this.pointer.clicked = true; };
      this.onPointerUp = event => { this.onPointer(event); this.pointer.down = false; };
      window.addEventListener('keydown', this.onKeyDown, { passive: false });
      window.addEventListener('keyup', this.onKeyUp);
      canvas.addEventListener('pointermove', this.onPointer);
      canvas.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointerup', this.onPointerUp);
    }
    held(key) { return this.keys.has(key); }
    consume(key) { const value = this.pressed.has(key); this.pressed.delete(key); return value; }
    endFrame() { this.pressed.clear(); this.pointer.clicked = false; }
    destroy() {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      this.canvas.removeEventListener('pointermove', this.onPointer);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      window.removeEventListener('pointerup', this.onPointerUp);
      this.keys.clear(); this.pressed.clear();
    }
  }

  ns.InputManager = InputManager;
})(window.Lumenkin = window.Lumenkin || {});
