// InputHandler class manages keyboard inputs for the game.
// It tracks which keys are currently pressed.

class InputHandler {
  constructor() {
    this.keys = {};
    this.handleKeyDown = (e) => {
      this.keys[e.key] = true;
    };
    this.handleKeyUp = (e) => {
      this.keys[e.key] = false;
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.keys = {};
  }
}


