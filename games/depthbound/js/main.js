(function(D) {
  D.canvas = document.getElementById("game");
  D.ctx = D.canvas.getContext("2d");
  D.startPanel = document.getElementById("startPanel");
  D.choicePanel = document.getElementById("choicePanel");
  D.choiceTitle = document.getElementById("choiceTitle");
  D.choiceText = document.getElementById("choiceText");
  D.choicesEl = document.getElementById("choices");
  D.gameOverPanel = document.getElementById("gameOverPanel");
  D.gameOverStats = document.getElementById("gameOverStats");
  D.codexPanel = document.getElementById("codexPanel");
  D.codexContent = document.getElementById("codexContent");
  D.keys = new Set();
  D.justPressed = new Set();
  D.mouse = { x: 0, y: 0, down: false, worldX: 0, worldY: 0 };

  let audioCtx = null;

  with (D) {
    function resize() {
      canvas.width = Math.floor(window.innerWidth * devicePixelRatio);
      canvas.height = Math.floor(window.innerHeight * devicePixelRatio);
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    }

    function tone(freq = 300, dur = 0.05, type = "sine", gain = 0.035) {
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.value = gain;
        osc.connect(g);
        g.connect(audioCtx.destination);
        const now = audioCtx.currentTime;
        g.gain.setValueAtTime(gain, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        osc.start(now);
        osc.stop(now + dur + 0.02);
      } catch (_) {}
    }

    function loop(ts) {
      if (!loop.last) loop.last = ts;
      const dt = Math.min(0.033, (ts - loop.last) / 1000);
      loop.last = ts;
      update(dt);
      draw();
      requestAnimationFrame(loop);
    }

    window.addEventListener("resize", resize);
    resize();

    window.addEventListener("keydown", e => {
      if (["Space", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
      if (e.code === "KeyF" && tryInteract()) {
        e.preventDefault();
        return;
      }
      if (!keys.has(e.code)) justPressed.add(e.code);
      keys.add(e.code);
    });
    window.addEventListener("keyup", e => keys.delete(e.code));
    canvas.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    canvas.addEventListener("mousedown", e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (game && !game.paused && !game.over) {
        updateMouseLocal();
        if (tryInteract()) {
          e.preventDefault();
          return;
        }
      }
      mouse.down = true;
      if (!audioCtx) tone(220, .01, "sine", .001);
    });
    window.addEventListener("mouseup", () => mouse.down = false);

    document.getElementById("startBtn").addEventListener("click", resetGame);
    document.getElementById("restartBtn").addEventListener("click", resetGame);
    document.getElementById("closeCodex").addEventListener("click", () => {
      codexPanel.style.display = "none";
      if (game) game.paused = false;
    });

    startPanel.style.display = "flex";
    requestAnimationFrame(loop);

    Object.assign(D, { resize, tone, loop });
  }
})(window.Depthbound = window.Depthbound || {});
