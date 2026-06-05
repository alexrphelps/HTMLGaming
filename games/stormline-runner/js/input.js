(function() {
  "use strict";

  const ns = window.StormlineRunner;

  class InputController {
    constructor(target) {
      this.target = target || window;
      this.keys = new Set();
      this.pressed = new Set();
      this.cleanups = [];
      this.keyMap = {
        ArrowLeft: "left",
        KeyA: "left",
        ArrowRight: "right",
        KeyD: "right",
        Space: "jump",
        ArrowUp: "jump",
        KeyW: "jump",
        ShiftLeft: "dash",
        ShiftRight: "dash",
        KeyP: "pause",
        Escape: "pause",
        Digit1: "draft1",
        Digit2: "draft2",
        Digit3: "draft3",
        Enter: "confirm"
      };
    }

    attach() {
      const down = (event) => {
        const action = this.keyMap[event.code];
        if (!action) return;
        event.preventDefault();
        if (!event.repeat) {
          this.pressed.add(action);
        }
        this.keys.add(action);
      };
      const up = (event) => {
        const action = this.keyMap[event.code];
        if (!action) return;
        event.preventDefault();
        this.keys.delete(action);
      };
      const blur = () => {
        this.keys.clear();
        this.pressed.clear();
      };

      this.target.addEventListener("keydown", down);
      this.target.addEventListener("keyup", up);
      window.addEventListener("blur", blur);
      this.cleanups.push(() => this.target.removeEventListener("keydown", down));
      this.cleanups.push(() => this.target.removeEventListener("keyup", up));
      this.cleanups.push(() => window.removeEventListener("blur", blur));
    }

    getActions() {
      return {
        left: this.keys.has("left"),
        right: this.keys.has("right"),
        jumpHeld: this.keys.has("jump"),
        jumpPressed: this.pressed.has("jump"),
        dashHeld: this.keys.has("dash"),
        dashPressed: this.pressed.has("dash"),
        pausePressed: this.pressed.has("pause"),
        draft1Pressed: this.pressed.has("draft1"),
        draft2Pressed: this.pressed.has("draft2"),
        draft3Pressed: this.pressed.has("draft3"),
        confirmPressed: this.pressed.has("confirm")
      };
    }

    endFrame() {
      this.pressed.clear();
    }

    destroy() {
      this.cleanups.forEach((cleanup) => cleanup());
      this.cleanups = [];
      this.keys.clear();
      this.pressed.clear();
    }
  }

  ns.InputController = InputController;
})();
