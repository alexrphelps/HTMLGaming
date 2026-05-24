window.GravityLocksmith = window.GravityLocksmith || {};

(function(ns) {
  "use strict";

  ns.createInputController = function(target) {
    const host = target || window;
    const keys = new Set();
    const pressed = new Set();
    const preventDefaultCodes = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

    function onKeyDown(event) {
      if (preventDefaultCodes.has(event.code)) event.preventDefault();
      if (!keys.has(event.code)) pressed.add(event.code);
      keys.add(event.code);
    }

    function onKeyUp(event) {
      keys.delete(event.code);
    }

    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("keyup", onKeyUp);

    function down() {
      const codes = Array.prototype.slice.call(arguments);
      return codes.some(function(code) {
        return keys.has(code);
      });
    }

    function tap() {
      const codes = Array.prototype.slice.call(arguments);
      return codes.some(function(code) {
        return pressed.has(code);
      });
    }

    return {
      getActions: function() {
        return {
          moveLeft: down("KeyA", "ArrowLeft"),
          moveRight: down("KeyD", "ArrowRight"),
          jumpPressed: tap("KeyW", "ArrowUp", "Space"),
          flipPressed: tap("ShiftLeft", "ShiftRight"),
          restartPressed: tap("KeyR"),
          confirmPressed: tap("Enter", "Space")
        };
      },
      endFrame: function() {
        pressed.clear();
      },
      cleanup: function() {
        host.removeEventListener("keydown", onKeyDown);
        host.removeEventListener("keyup", onKeyUp);
        keys.clear();
        pressed.clear();
      }
    };
  };
})(window.GravityLocksmith);
