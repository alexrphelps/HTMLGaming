(function() {
  "use strict";

  const ns = window.StormlineRunner;
  const canvas = document.getElementById("game");
  const renderer = new ns.StormRenderer(canvas);
  const input = new ns.InputController(window);
  const hud = {
    distance: document.getElementById("distanceText"),
    speed: document.getElementById("speedText"),
    weather: document.getElementById("weatherText"),
    healthFill: document.getElementById("healthFill"),
    healthText: document.getElementById("healthText"),
    batteryFill: document.getElementById("batteryFill"),
    batteryText: document.getElementById("batteryText"),
    talentList: document.getElementById("talentList")
  };
  const overlay = {
    root: document.getElementById("overlay"),
    title: document.getElementById("overlayTitle"),
    body: document.getElementById("overlayBody"),
    action: document.getElementById("primaryAction")
  };
  const draftPanel = {
    root: document.getElementById("draftPanel"),
    storm: document.getElementById("draftStorm"),
    cards: document.getElementById("draftCards")
  };

  let state = "title";
  let world = null;
  let player = null;
  let talents = null;
  let seed = "";
  let lastFrame = performance.now();
  let cameraX = 0;
  let activeDraft = null;
  let activeShrine = null;
  let time = 0;
  let bestDistance = 0;

  function configureWorldForViewport() {
    const worldConfig = ns.CONFIG.world;
    const floorY = Math.max(520, Math.min(760, renderer.height - 86));
    worldConfig.floorY = floorY;
    worldConfig.startY = floorY - ns.CONFIG.player.height - 26;
  }

  function startRun() {
    seed = "stormline-" + Date.now();
    renderer.resize();
    configureWorldForViewport();
    world = new ns.StormWorld(seed);
    player = new ns.RunnerPlayer();
    talents = new ns.TalentSystem(ns.createRng(seed + ":talents"));
    cameraX = 0;
    time = 0;
    activeDraft = null;
    activeShrine = null;
    state = "playing";
    overlay.root.classList.add("hidden");
    draftPanel.root.classList.add("hidden");
    lastFrame = performance.now();
  }

  function setOverlay(title, body, actionText) {
    overlay.title.textContent = title;
    overlay.body.textContent = body;
    overlay.action.textContent = actionText;
    overlay.root.classList.remove("hidden");
  }

  function pauseRun() {
    if (state !== "playing") return;
    state = "paused";
    setOverlay("Paused", "Stormline suspended.", "Resume");
  }

  function resumeRun() {
    if (state !== "paused") return;
    state = "playing";
    overlay.root.classList.add("hidden");
    lastFrame = performance.now();
  }

  function endRun() {
    const distance = getDistance();
    bestDistance = Math.max(bestDistance, distance);
    state = "gameover";
    setOverlay("Run Ended", "Distance " + Math.floor(distance) + "m  Best " + Math.floor(bestDistance) + "m", "Restart");
  }

  function getDistance() {
    return Math.max(0, (player.x - ns.CONFIG.world.startX) / 10);
  }

  function openDraft(shrine, weather, nextWeather) {
    activeShrine = shrine;
    activeShrine.used = true;
    activeDraft = talents.createDraft(weather, nextWeather);
    state = "draft";
    renderDraft(weather, nextWeather);
    draftPanel.root.classList.remove("hidden");
  }

  function chooseDraft(index) {
    if (!activeDraft || !activeDraft[index]) return;
    talents.add(activeDraft[index].talent.id);
    activeDraft = null;
    activeShrine = null;
    draftPanel.root.classList.add("hidden");
    state = "playing";
    lastFrame = performance.now();
  }

  function renderDraft(weather, nextWeather) {
    draftPanel.storm.textContent = weather.name + " now  /  " + nextWeather.name + " next";
    while (draftPanel.cards.firstChild) {
      draftPanel.cards.removeChild(draftPanel.cards.firstChild);
    }
    activeDraft.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "draft-card";
      button.dataset.draftIndex = String(index);

      const title = document.createElement("h3");
      title.textContent = option.talent.name;
      const summary = document.createElement("p");
      summary.textContent = option.talent.summary;
      const rating = document.createElement("span");
      rating.className = "draft-rating";
      rating.textContent = option.rating + (option.stacks ? "  Stack " + (option.stacks + 1) : "");

      button.appendChild(title);
      button.appendChild(summary);
      button.appendChild(rating);
      button.addEventListener("click", () => chooseDraft(index));
      draftPanel.cards.appendChild(button);
    });
  }

  function update(dt) {
    const actions = input.getActions();
    if (actions.pausePressed) {
      if (state === "playing") pauseRun();
      else if (state === "paused") resumeRun();
    }

    if (state === "draft") {
      if (actions.draft1Pressed) chooseDraft(0);
      if (actions.draft2Pressed) chooseDraft(1);
      if (actions.draft3Pressed) chooseDraft(2);
      input.endFrame();
      return;
    }

    if (state !== "playing") {
      input.endFrame();
      return;
    }

    time += dt;
    const weather = world.getWeatherAt(player.x);
    const nextWeather = world.getNextWeatherAt(player.x);
    player.update(dt, actions, world, talents, weather);
    world.update(player.x);
    world.collectPickups(player, talents, weather);
    world.hitHazards(player, talents, weather);

    const shrine = world.findTouchedShrine(player);
    if (shrine) {
      openDraft(shrine, weather, nextWeather);
    }

    cameraX = Math.max(0, player.x - Math.min(420, renderer.width * 0.38));
    updateHud(weather, nextWeather);

    if (player.isDead()) {
      endRun();
    }

    input.endFrame();
  }

  function updateHud(weather, nextWeather) {
    const distance = getDistance();
    hud.distance.textContent = Math.floor(distance) + "m";
    hud.speed.textContent = Math.max(0, Math.round(player.vx));
    hud.weather.textContent = weather.shortName + " -> " + nextWeather.shortName;
    hud.healthText.textContent = Math.ceil(player.health);
    hud.batteryText.textContent = Math.ceil(player.battery);
    hud.healthFill.style.transform = "scaleX(" + Math.max(0, player.health / ns.CONFIG.player.maxHealth) + ")";
    hud.batteryFill.style.transform = "scaleX(" + Math.max(0, player.battery / player.maxBattery) + ")";
    hud.weather.style.color = weather.colors.primary;

    while (hud.talentList.firstChild) {
      hud.talentList.removeChild(hud.talentList.firstChild);
    }
    const owned = talents.getOwnedList();
    if (!owned.length) {
      const empty = document.createElement("span");
      empty.className = "talent-chip";
      empty.textContent = "No circuits";
      hud.talentList.appendChild(empty);
    } else {
      owned.forEach((talent) => {
        const chip = document.createElement("span");
        chip.className = "talent-chip";
        chip.textContent = talent.name + (talent.stacks > 1 ? " x" + talent.stacks : "");
        hud.talentList.appendChild(chip);
      });
    }
  }

  function draw() {
    if (!world || !player || !talents) {
      const titleWeather = ns.WEATHER_BY_ID["magnetic-rain"];
      renderer.render({
        world: { platforms: [], hazards: [], pickups: [], shrines: [] },
        player: { x: 180, y: 440, w: 34, h: 58, vx: 0, dashTimer: 0, invulnTimer: 0, grounded: true, facing: 1 },
        weather: titleWeather,
        cameraX: 0,
        time
      });
      return;
    }

    renderer.render({
      world,
      player,
      weather: world.getWeatherAt(player.x),
      cameraX,
      time
    });
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastFrame) / 1000 || 0);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  overlay.action.addEventListener("click", () => {
    if (state === "paused") resumeRun();
    else startRun();
  });

  window.addEventListener("resize", () => renderer.resize());
  input.attach();
  setOverlay("Stormline Runner", "Run signal acquired.", "Start Run");
  requestAnimationFrame(loop);
})();
