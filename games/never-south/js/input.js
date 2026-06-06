(function() {
  "use strict";

  const ns = window.NeverSouth || {};

  function createInputController(canvas, getHitAreas, handlers) {
    const keys = new Set();

    function pointFromEvent(event) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }

    function hit(point, type) {
      return getHitAreas().find((area) => {
        return (!type || area.type === type) &&
          point.x >= area.x &&
          point.y >= area.y &&
          point.x <= area.x + area.w &&
          point.y <= area.y + area.h;
      });
    }

    function handlePointerMove(event) {
      const point = pointFromEvent(event);
      const area = hit(point);
      canvas.style.cursor = area ? "pointer" : "default";
      handlers.hover(area || null);
    }

    function handleClick(event) {
      const point = pointFromEvent(event);
      handlers.click(hit(point) || null);
    }

    function handleKeyDown(event) {
      keys.add(event.code);
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space", "Enter", "KeyQ", "KeyE", "KeyR"].includes(event.code)) {
        event.preventDefault();
      }
      handlers.key(event.code, true);
    }

    function handleKeyUp(event) {
      keys.delete(event.code);
      handlers.key(event.code, false);
    }

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return {
      isDown(code) {
        return keys.has(code);
      },
      cleanup() {
        canvas.removeEventListener("pointermove", handlePointerMove);
        canvas.removeEventListener("click", handleClick);
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      }
    };
  }

  ns.createInputController = createInputController;
  window.NeverSouth = ns;
})();
