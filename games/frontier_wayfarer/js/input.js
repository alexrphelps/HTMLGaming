(function (ns) {
    class Input {
        constructor(target) {
            this.target = target || window; this.keys = new Set(); this.pressed = new Set(); this.mouse = { primary: false, secondary: false, x: 0, y: 0, hasPosition: false };
            this.onDown = this.onDown.bind(this); this.onUp = this.onUp.bind(this); this.onBlur = this.onBlur.bind(this); this.onVisibility = this.onVisibility.bind(this); this.onMouseDown = this.onMouseDown.bind(this); this.onMouseUp = this.onMouseUp.bind(this); this.onMouseMove = this.onMouseMove.bind(this);
            this.target.addEventListener('keydown', this.onDown); this.target.addEventListener('keyup', this.onUp); this.target.addEventListener('blur', this.onBlur);
            document.addEventListener('visibilitychange', this.onVisibility);
            window.addEventListener('mousedown', this.onMouseDown); window.addEventListener('mouseup', this.onMouseUp); window.addEventListener('mousemove', this.onMouseMove);
        }
        normalize(event) { return event.key.length === 1 ? event.key.toLowerCase() : event.key; }
        onDown(event) {
            const editable = event.target?.matches?.('input, textarea, select, [contenteditable="true"]');
            if (editable && event.key !== 'Escape') return;
            const key = this.normalize(event); if (!this.keys.has(key)) this.pressed.add(key); this.keys.add(key);
            if ([' ', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) event.preventDefault();
        }
        onUp(event) { this.keys.delete(this.normalize(event)); }
        onMouseDown(event) { if (event.target.closest && event.target.closest('.cockpit-panel, .start-screen, button, input')) return; this.onMouseMove(event); if (event.button === 0) this.mouse.primary = true; if (event.button === 2) this.mouse.secondary = true; }
        onMouseUp(event) { if (event.button === 0) this.mouse.primary = false; if (event.button === 2) this.mouse.secondary = false; }
        onMouseMove(event) { this.mouse.x = event.clientX; this.mouse.y = event.clientY; this.mouse.hasPosition = true; }
        onBlur() { this.keys.clear(); this.pressed.clear(); this.mouse.primary = false; this.mouse.secondary = false; }
        onVisibility() { if (document.hidden) this.onBlur(); }
        down(...keys) { return keys.some(k => this.keys.has(k)); }
        consume(key) { if (!this.pressed.has(key)) return false; this.pressed.delete(key); return true; }
        endFrame() { this.pressed.clear(); }
        destroy() {
            this.target.removeEventListener('keydown', this.onDown); this.target.removeEventListener('keyup', this.onUp); this.target.removeEventListener('blur', this.onBlur);
            document.removeEventListener('visibilitychange', this.onVisibility);
            window.removeEventListener('mousedown', this.onMouseDown); window.removeEventListener('mouseup', this.onMouseUp); window.removeEventListener('mousemove', this.onMouseMove);
        }
    }
    ns.Input = Input;
})(window.MiniInvadersV2);
