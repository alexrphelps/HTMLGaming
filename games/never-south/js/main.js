(function() {
  "use strict";

  const ns = window.NeverSouth || {};

  function createGame(canvas, statusElement) {
    const renderer = new ns.NeverSouthRenderer(canvas);
    const run = new ns.NeverSouthRun("never-south-" + Math.floor(Date.now() / 1000));
    let lastTime = performance.now();

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(320, Math.floor(rect.width || window.innerWidth || 1280));
      const height = Math.max(420, Math.floor(rect.height || window.innerHeight || 820));
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const backingWidth = Math.floor(width * dpr);
      const backingHeight = Math.floor(height * dpr);
      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth;
        canvas.height = backingHeight;
      }
      renderer.resize(width, height, dpr);
    }

    function announce() {
      if (statusElement) {
        statusElement.textContent = run.message;
      }
    }

    function chooseTarget(delta) {
      const targets = run.getValidTargets();
      if (targets.length === 0) return;
      run.selectedTargetIndex = (run.selectedTargetIndex + delta + targets.length) % targets.length;
    }

    const input = ns.createInputController(canvas, () => renderer.getHitAreas(), {
      hover(area) {
        renderer.setHover(area);
      },
      click(area) {
        if (!area) return;
        if (area.type === "start") {
          run.startNewRun("never-south-" + Math.floor(Date.now() / 1000));
          announce();
        } else if (area.type === "card") {
          run.selectCard(area.index);
        } else if (area.type === "target") {
          run.playSelectedTo({ col: area.col, row: area.row });
          announce();
        } else if (area.type === "action") {
          run.applyAction(area.actionId);
          announce();
        } else if (area.type === "emergency") {
          run.useEmergencyMove();
          announce();
        }
      },
      key(code, down) {
        if (code === "KeyQ") run.previewMode = down ? "deck" : null;
        if (code === "KeyE") run.previewMode = down ? "discard" : null;
        if (!down) return;

        if (code === "KeyR") {
          run.startNewRun("never-south-" + Math.floor(Date.now() / 1000));
          announce();
        } else if (code === "ArrowLeft" || code === "KeyA") {
          run.pendingActions.length ? null : run.cycleCard(-1);
        } else if (code === "ArrowRight" || code === "KeyD") {
          run.pendingActions.length ? null : run.cycleCard(1);
        } else if (code === "ArrowUp" || code === "KeyW") {
          chooseTarget(-1);
        } else if (code === "ArrowDown" || code === "KeyS") {
          chooseTarget(1);
        } else if (code === "Backspace") {
          run.useEmergencyMove();
          announce();
        } else if (code === "Space" || code === "Enter") {
          if (run.status !== "playing") {
            run.startNewRun("never-south-" + Math.floor(Date.now() / 1000));
          } else if (run.pendingActions.length > 0) {
            run.applyAction(run.pendingActions[0].id);
          } else {
            const targets = run.getValidTargets();
            if (targets.length > 0) run.playSelectedTo(targets[run.selectedTargetIndex % targets.length]);
          }
          announce();
        }
      }
    });

    function frame(now) {
      resizeCanvas();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      renderer.render(run, dt);
      requestAnimationFrame(frame);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    requestAnimationFrame(frame);
    announce();

    return {
      run,
      renderer,
      input,
      cleanup() {
        window.removeEventListener("resize", resizeCanvas);
        input.cleanup();
      }
    };
  }

  ns.createGame = createGame;

  window.addEventListener("load", function() {
    const canvas = document.getElementById("game");
    const status = document.getElementById("screen-reader-status");
    if (!canvas) return;
    canvas.setAttribute("tabindex", "0");
    canvas.focus();
    window.neverSouthGame = createGame(canvas, status);
    console.log("Never South initialized");
  });

  window.NeverSouth = ns;
})();
