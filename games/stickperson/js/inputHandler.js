// InputHandler class manages keyboard inputs for the game.
// It tracks which keys are currently pressed.

class InputHandler {
  constructor() {
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
  }
}


