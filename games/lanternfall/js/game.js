(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};
  const { CONFIG, TILE_TYPES } = Lanternfall;
  const { tileKey } = Lanternfall.math;

  function attemptMove(state, world, direction, audio) {
    if (!direction || state.player.moving) return false;

    const player = state.player;
    player.facing = direction.dy < 0 ? "up" : direction.dy > 0 ? "down" : direction.dx < 0 ? "left" : "right";
    const nx = player.gx + direction.dx;
    const ny = player.gy + direction.dy;
    const tile = world.getTile(nx, ny);

    if (tile.type === TILE_TYPES.WALL) {
      if (audio && audio.sfx) audio.sfx("bump");
      return false;
    }

    Lanternfall.effects.spendFuel(state, CONFIG.fuel.stepCost);

    state.particles.push({
      x: player.gx,
      y: player.gy,
      life: CONFIG.movement.particleLife,
      maxLife: CONFIG.movement.particleLife
    });
    player.fx = player.gx;
    player.fy = player.gy;
    player.tx = nx;
    player.ty = ny;
    player.t = 0;
    player.moving = true;
    if (audio && audio.sfx) audio.sfx("step");
    return true;
  }

  function updateMovement(state, world, dt, services) {
    if (state.player.moving) {
      state.player.t += dt / Lanternfall.effects.moveDuration(state);
      if (state.player.t >= 1) {
        state.player.t = 1;
        state.player.moving = false;
        state.player.gx = state.player.tx;
        state.player.gy = state.player.ty;
        Lanternfall.effects.resolveArrival(state, world, state.player.gx, state.player.gy, services);
      }
    }
  }

  function revealVisibleTiles(state) {
    const pos = Lanternfall.getPlayerPos(state);
    const radius = Math.ceil(state.visionRadius) + CONFIG.vision.revealPadding;
    const cx = Math.round(pos.x);
    const cy = Math.round(pos.y);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (Math.hypot(x - pos.x, y - pos.y) <= state.visionRadius) {
          state.explored.add(tileKey(x, y));
        }
      }
    }
  }

  function updateParticles(state, dt) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].life -= dt;
      if (state.particles[i].life <= 0) {
        state.particles.splice(i, 1);
      }
    }
  }

  class LanternfallGame {
    constructor(options = {}) {
      this.window = options.window || window;
      this.document = options.document || document;
      this.world = options.world || new Lanternfall.World(CONFIG.defaultSeed);
      this.state = options.state || Lanternfall.createInitialState(CONFIG.defaultSeed);
      this.audio = options.audio || new Lanternfall.SynthAudio(this.window);
      this.ui = options.ui || new Lanternfall.LanternfallUi(this.document);
      this.input = options.input || new Lanternfall.InputController({
        window: this.window,
        document: this.document,
        audio: this.audio,
        onEscape: () => this.handleEscape()
      });
      this.renderer = options.renderer || new Lanternfall.CanvasRenderer(this.document.getElementById("game"), this.window);
      this.minimap = options.minimap || new Lanternfall.MinimapRenderer(this.document.getElementById("minimap"));
      this.frameId = null;

      this.handleResize = this.handleResize.bind(this);
      this.loop = this.loop.bind(this);
    }

    init() {
      this.ui.bind({
        onBegin: (seedText) => this.handleBegin(seedText),
        onHelp: () => this.showHelp(),
        onMute: () => this.audio.toggleMute()
      });
      this.input.bind();
      this.window.addEventListener("resize", this.handleResize);
      this.minimap.resize();
      this.handleResize();
      this.frameId = this.window.requestAnimationFrame(this.loop);
    }

    destroy() {
      this.window.cancelAnimationFrame(this.frameId);
      this.window.removeEventListener("resize", this.handleResize);
      this.input.unbind();
      this.ui.unbind();
    }

    handleResize() {
      this.renderer.resize();
    }

    handleBegin(seedText) {
      if (this.state.started && this.state.status === "active") {
        this.resume();
        return;
      }

      const seed = seedText === "" ? Math.floor(Math.random() * 1000000) : Lanternfall.math.hashString(seedText) % 1000000;
      this.world.reset(seed);
      Lanternfall.resetRunState(this.state, seed);
      this.state.objective = this.world.getObjective();
      this.ui.hideOverlay();
      this.input.clear();
      this.audio.ensure();
    }

    showHelp() {
      if (!this.state.started) {
        this.ui.showStartPage();
        return;
      }

      this.pause();
      this.ui.showPausePage();
    }

    handleEscape() {
      if (!this.state.started) return;
      if (this.ui.isOverlayHidden()) {
        this.showHelp();
      } else {
        this.resume();
      }
    }

    pause() {
      if (this.state.started && this.state.status === "active") {
        this.state.paused = true;
      }
    }

    resume() {
      if (this.state.status !== "active") {
        this.handleBegin("");
        return;
      }
      this.state.paused = false;
      this.ui.hideOverlay();
      this.input.clear();
    }

    update(dt) {
      updateMovement(this.state, this.world, dt, { ui: this.ui, audio: this.audio });

      if (!this.state.player.moving) {
        attemptMove(this.state, this.world, this.input.desiredDir(), this.audio);
      }

      revealVisibleTiles(this.state);
      updateParticles(this.state, dt);
      Lanternfall.effects.updateTimedEffects(this.state, dt);

      if (this.state.status === "active" && this.state.fuel <= 0) {
        this.state.status = "lost";
        this.state.paused = true;
        if (this.ui.toast) this.ui.toast(CONFIG.ui.messages.lost);
        if (this.audio.sfx) this.audio.sfx("lost");
      }
    }

    render() {
      this.renderer.render(this.state, this.world);
      this.minimap.render(this.state, this.world);
      this.ui.updateHud(this.state);
      if (this.state.paused && this.state.status !== "active") {
        this.ui.showEndPage(this.state);
      }
    }

    loop(now) {
      if (!this.state.lastTime) {
        this.state.lastTime = now;
      }

      let dt = (now - this.state.lastTime) / 1000;
      this.state.lastTime = now;
      dt = Math.min(dt, 0.05);

      if (this.state.started && !this.state.paused) {
        this.update(dt);
        this.render();
      }

      this.frameId = this.window.requestAnimationFrame(this.loop);
    }
  }

  Lanternfall.attemptMove = attemptMove;
  Lanternfall.updateMovement = updateMovement;
  Lanternfall.revealVisibleTiles = revealVisibleTiles;
  Lanternfall.updateParticles = updateParticles;
  Lanternfall.LanternfallGame = LanternfallGame;
})();
