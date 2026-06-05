(function() {
  "use strict";

  const ns = window.StormlineRunner;

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  class StormWorld {
    constructor(seed) {
      this.seed = seed;
      this.rng = ns.createRng(seed);
      this.weatherRng = ns.createRng(seed + ":weather");
      this.chunkWidth = ns.CONFIG.world.chunkWidth;
      this.generatedChunks = 0;
      this.platforms = [];
      this.hazards = [];
      this.pickups = [];
      this.shrines = [];
      this.weatherSequence = [];
      this.lastGroundY = ns.CONFIG.world.floorY;
      this.generateUntil(ns.CONFIG.world.generateAhead);
    }

    reset(seed) {
      this.seed = seed;
      this.rng = ns.createRng(seed);
      this.weatherRng = ns.createRng(seed + ":weather");
      this.generatedChunks = 0;
      this.platforms = [];
      this.hazards = [];
      this.pickups = [];
      this.shrines = [];
      this.weatherSequence = [];
      this.lastGroundY = ns.CONFIG.world.floorY;
      this.generateUntil(ns.CONFIG.world.generateAhead);
    }

    generateUntil(xLimit) {
      while (this.generatedChunks * this.chunkWidth < xLimit) {
        this.generateChunk(this.generatedChunks);
        this.generatedChunks++;
      }
    }

    pruneBefore(x) {
      const cutoff = x - ns.CONFIG.world.pruneDistance;
      this.platforms = this.platforms.filter((item) => item.x + item.w > cutoff);
      this.hazards = this.hazards.filter((item) => item.x + item.w > cutoff);
      this.pickups = this.pickups.filter((item) => item.x + item.w > cutoff && !item.collected);
      this.shrines = this.shrines.filter((item) => item.x + item.w > cutoff && !item.expired);
    }

    update(playerX) {
      this.generateUntil(playerX + ns.CONFIG.world.generateAhead);
      this.pruneBefore(playerX);
    }

    getWeatherAt(x) {
      const index = Math.max(0, Math.floor(x / ns.CONFIG.world.sectorWidth));
      return this.getWeatherForSector(index);
    }

    getNextWeatherAt(x) {
      const index = Math.max(0, Math.floor(x / ns.CONFIG.world.sectorWidth));
      return this.getWeatherForSector(index + 1);
    }

    getWeatherForSector(index) {
      while (this.weatherSequence.length <= index) {
        const previous = this.weatherSequence[this.weatherSequence.length - 1];
        let front = this.weatherRng.pick(ns.WEATHER_FRONTS);
        let guard = 0;
        while (previous && front.id === previous.id && guard < 6) {
          front = this.weatherRng.pick(ns.WEATHER_FRONTS);
          guard++;
        }
        this.weatherSequence.push(front);
      }
      return this.weatherSequence[index];
    }

    getSolids() {
      return this.platforms;
    }

    generateChunk(index) {
      const start = index * this.chunkWidth;
      const weather = this.getWeatherAt(start + this.chunkWidth * 0.5);
      const worldConfig = ns.CONFIG.world;
      const floor = worldConfig.floorY;
      const layer = worldConfig.platformLayerStep;
      const isStart = index === 0;
      const targetStep = isStart ? 0 : this.rng.int(-1, 1) * worldConfig.maxGroundStep;
      const targetY = isStart ? floor : this.lastGroundY + targetStep + weather.platformLift * 0.35;
      const groundY = Math.max(floor - layer * 2, Math.min(floor + 18, targetY));
      const topReachableY = floor - layer * 2;
      const gapWidth = isStart ? 0 : Math.max(74, Math.min(worldConfig.maxGapWidth, this.rng.range(104, 156) + weather.gapBias * 0.35));
      const gapX = start + this.rng.range(250, 470);
      const leftWidth = Math.max(190, gapX - start);
      const rightX = gapX + gapWidth;
      const rightWidth = Math.max(170, start + this.chunkWidth - rightX + 18);

      this.addPlatform(start - 16, groundY, leftWidth + 16, 34, weather, "ground");
      if (gapWidth > 0) {
        const landingStep = this.rng.int(-1, 1) * Math.round(worldConfig.maxGroundStep * 0.55);
        const landingY = Math.max(topReachableY, Math.min(floor + 18, groundY + landingStep));
        this.addPlatform(rightX, landingY, rightWidth, 34, weather, "ground");
      }

      const bridgeY = Math.max(topReachableY, groundY - layer);
      const bridgeX = gapX + gapWidth * 0.5 - 100;
      this.addPlatform(bridgeX, bridgeY, 220 + this.rng.range(-24, 38), 20, weather, "platform");

      if (this.rng.chance(0.72)) {
        const highY = Math.max(topReachableY, groundY - layer * 2);
        this.addPlatform(start + this.rng.range(95, 430), highY, this.rng.range(132, 210), 18, weather, "platform");
      }

      if (!isStart && this.rng.chance(0.45)) {
        const railLayer = this.rng.chance(0.65) ? layer : layer * 2;
        this.addPlatform(start + this.rng.range(90, 515), Math.max(topReachableY, groundY - railLayer), this.rng.range(132, 230), 12, weather, "rail", true);
      }

      if (!isStart && this.rng.chance(0.28)) {
        this.addWall(start + this.rng.range(250, 560), groundY - 46, 24, 46, weather);
      }

      this.addPickupsForChunk(start, groundY, bridgeY, weather);
      this.addHazardsForChunk(index, start, groundY, weather);
      this.addShrineForChunk(index, start, groundY, weather);
      this.lastGroundY = groundY;
    }

    addPlatform(x, y, w, h, weather, type, rail) {
      this.platforms.push({
        x,
        y,
        w,
        h,
        type,
        rail: Boolean(rail),
        weatherId: weather.id
      });
    }

    addWall(x, y, w, h, weather) {
      this.platforms.push({
        x,
        y,
        w,
        h,
        type: "wall",
        rail: false,
        weatherId: weather.id
      });
    }

    addPickupsForChunk(start, groundY, bridgeY, weather) {
      const amount = weather.id === "prism-squall" ? 5 : 4;
      for (let i = 0; i < amount; i++) {
        const arcX = start + 150 + i * this.rng.range(82, 120);
        const arcY = (i % 2 === 0 ? bridgeY - 8 : groundY - ns.CONFIG.world.platformLayerStep * 0.62) + this.rng.range(-10, 10);
        this.pickups.push({
          x: arcX,
          y: arcY,
          w: 22,
          h: 22,
          value: weather.id === "prism-squall" ? 9 : 7,
          collected: false,
          weatherId: weather.id
        });
      }
    }

    addHazardsForChunk(index, start, groundY, weather) {
      if (index === 0) return;
      const count = Math.max(1, Math.round(this.rng.range(1, 3) * weather.hazardBias));
      for (let i = 0; i < count; i++) {
        const x = start + this.rng.range(210, 650);
        const type = weather.id === "heat-bloom" ? "heat" : weather.id === "magnetic-rain" ? "spark" : "static";
        this.hazards.push({
          x,
          y: groundY - 28,
          w: this.rng.range(28, 48),
          h: 28,
          type,
          damage: type === "heat" ? 18 : 14,
          weatherId: weather.id
        });
      }
    }

    addShrineForChunk(index, start, groundY, weather) {
      if (index < ns.CONFIG.shrine.firstChunk) return;
      if ((index - ns.CONFIG.shrine.firstChunk) % ns.CONFIG.shrine.intervalChunks !== 0) return;
      const topReachableY = ns.CONFIG.world.floorY - ns.CONFIG.world.platformLayerStep * 2;
      this.shrines.push({
        x: start + this.rng.range(430, 590),
        y: Math.max(topReachableY, groundY - ns.CONFIG.world.platformLayerStep),
        w: 54,
        h: ns.CONFIG.world.platformLayerStep,
        used: false,
        expired: false,
        weatherId: weather.id
      });
    }

    collectPickups(player, talents, weather) {
      let collected = 0;
      const playerRect = player.getRect();
      this.pickups.forEach((pickup) => {
        if (pickup.collected || !rectsOverlap(playerRect, pickup)) return;
        pickup.collected = true;
        const value = pickup.value * talents.getPickupMultiplier(weather);
        player.addBattery(value);
        collected++;
      });
      return collected;
    }

    hitHazards(player, talents, weather) {
      const playerRect = player.getRect();
      let hit = false;
      this.hazards.forEach((hazard) => {
        if (!rectsOverlap(playerRect, hazard)) return;
        const damage = hazard.damage * talents.getHazardDamageMultiplier(weather, hazard.type);
        hit = player.damage(damage) || hit;
      });
      return hit;
    }

    findTouchedShrine(player) {
      const playerRect = player.getRect();
      return this.shrines.find((shrine) => !shrine.used && rectsOverlap(playerRect, shrine));
    }
  }

  ns.rectsOverlap = rectsOverlap;
  ns.StormWorld = StormWorld;
})();
