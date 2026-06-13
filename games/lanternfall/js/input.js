(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};

  class InputController {
    constructor(options = {}) {
      this.window = options.window || window;
      this.document = options.document || document;
      this.audio = options.audio || null;
      this.onEscape = options.onEscape || (() => {});
      this.keys = new Set();
      this.touchDir = null;
      this.bound = false;
      this.touchBindings = [];

      this.handleKeyDown = this.handleKeyDown.bind(this);
      this.handleKeyUp = this.handleKeyUp.bind(this);
      this.clear = this.clear.bind(this);
      this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    }

    bind() {
      if (this.bound) return;
      this.bound = true;
      this.window.addEventListener("keydown", this.handleKeyDown);
      this.window.addEventListener("keyup", this.handleKeyUp);
      this.window.addEventListener("blur", this.clear);
      this.document.addEventListener("visibilitychange", this.handleVisibilityChange);
      this.bindTouch("btnUp", 0, -1);
      this.bindTouch("btnDown", 0, 1);
      this.bindTouch("btnLeft", -1, 0);
      this.bindTouch("btnRight", 1, 0);
    }

    unbind() {
      if (!this.bound) return;
      this.bound = false;
      this.window.removeEventListener("keydown", this.handleKeyDown);
      this.window.removeEventListener("keyup", this.handleKeyUp);
      this.window.removeEventListener("blur", this.clear);
      this.document.removeEventListener("visibilitychange", this.handleVisibilityChange);

      this.touchBindings.forEach(({ element, type, handler, options }) => {
        element.removeEventListener(type, handler, options);
      });
      this.touchBindings.length = 0;
      this.clear();
    }

    handleKeyDown(event) {
      const key = event.key.toLowerCase();
      this.keys.add(key);
      if (this.isMovementKey(key) && event.preventDefault) event.preventDefault();
      if (event.key === "Escape") {
        this.onEscape();
      }
    }

    handleKeyUp(event) {
      this.keys.delete(event.key.toLowerCase());
    }

    handleVisibilityChange() {
      if (this.document.visibilityState === "hidden") {
        this.clear();
      }
    }

    clear() {
      this.keys.clear();
      this.touchDir = null;
    }

    desiredDir() {
      if (this.keys.has("w") || this.keys.has("arrowup")) return { dx: 0, dy: -1 };
      if (this.keys.has("s") || this.keys.has("arrowdown")) return { dx: 0, dy: 1 };
      if (this.keys.has("a") || this.keys.has("arrowleft")) return { dx: -1, dy: 0 };
      if (this.keys.has("d") || this.keys.has("arrowright")) return { dx: 1, dy: 0 };
      if (this.touchDir) return this.touchDir;
      return null;
    }

    isMovementKey(key) {
      return key === "w" || key === "a" || key === "s" || key === "d" || key.startsWith("arrow");
    }

    bindTouch(id, dx, dy) {
      const element = this.document.getElementById(id);
      if (!element) return;

      const setDirection = (event) => {
        if (event.preventDefault) event.preventDefault();
        this.touchDir = { dx, dy };
        if (this.audio && this.audio.ensure) this.audio.ensure();
      };
      const clearDirection = (event) => {
        if (event && event.preventDefault) event.preventDefault();
        if (this.touchDir && this.touchDir.dx === dx && this.touchDir.dy === dy) {
          this.touchDir = null;
        }
      };

      this.addTouchBinding(element, "touchstart", setDirection, { passive: false });
      this.addTouchBinding(element, "touchend", clearDirection, { passive: false });
      this.addTouchBinding(element, "mousedown", setDirection);
      this.addTouchBinding(element, "mouseup", clearDirection);
      this.addTouchBinding(element, "mouseleave", clearDirection);
    }

    addTouchBinding(element, type, handler, options) {
      element.addEventListener(type, handler, options);
      this.touchBindings.push({ element, type, handler, options });
    }
  }

  Lanternfall.InputController = InputController;
})();
