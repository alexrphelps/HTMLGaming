(function() {
  "use strict";

  const ELEMENTS = ["Air", "Fire", "Water", "Earth"];
  const ELEMENT_COLORS = {
    Air: "#d8fbff",
    Fire: "#ff7342",
    Water: "#32d7ff",
    Earth: "#d0a15f"
  };

  // Future skill tree improvement point: move these definitions to save-aware data once progression persists.
  const SKILL_TREE = {
    Air: [
      { level: 1, id: "air_gale_push", name: "Gale Push" },
      { level: 2, id: "air_double_jump", name: "Double Jump" },
      { level: 3, id: "air_slow_fall", name: "Slow Fall" },
      { level: 4, id: "air_dash", name: "Air Dash" },
      { level: 5, id: "air_cyclone_guard", name: "Cyclone Guard" }
    ],
    Water: [
      { level: 1, id: "water_grip", name: "Water Grip" },
      { level: 2, id: "water_throw", name: "Water Throw" },
      { level: 3, id: "water_freeze", name: "Freeze Water" },
      { level: 4, id: "water_shield", name: "Water Shield" },
      { level: 5, id: "water_whirlpool", name: "Whirlpool" }
    ],
    Earth: [
      { level: 1, id: "earth_raise_rock", name: "Raise Rock" },
      { level: 2, id: "earth_stone_launch", name: "Stone Launch" },
      { level: 3, id: "earth_wall", name: "Earth Wall" },
      { level: 4, id: "earth_boulder_grip", name: "Boulder Grip" },
      { level: 5, id: "earth_shatter_line", name: "Shatter Line" }
    ],
    Fire: [
      { level: 1, id: "fire_fireball", name: "Fireball" },
      { level: 2, id: "fire_flame_kick", name: "Flame Kick" },
      { level: 3, id: "fire_flame_slam", name: "Flame Slam" },
      { level: 4, id: "fire_flame_wheel", name: "Flame Wheel" },
      { level: 5, id: "fire_fire_dash", name: "Fire Dash" }
    ]
  };

  const WORLD = {
    width: 18000,
    groundY: 620,
    gravity: 1850,
    friction: 0.83
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function norm(x, y) {
    const len = Math.hypot(x, y) || 1;
    return { x: x / len, y: y / len, len };
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleRectOverlap(circle, rect) {
    const nx = clamp(circle.x, rect.x, rect.x + rect.w);
    const ny = clamp(circle.y, rect.y, rect.y + rect.h);
    return Math.hypot(circle.x - nx, circle.y - ny) <= circle.r;
  }

  class Camera {
    constructor(canvas) {
      this.canvas = canvas;
      this.x = 0;
      this.y = 0;
    }

    update(player, dt) {
      const targetX = clamp(player.x + player.w * 0.5 - this.canvas.width * 0.46, 0, WORLD.width - this.canvas.width);
      const targetY = WORLD.groundY - this.canvas.height * 0.72;
      this.x = lerp(this.x, targetX, 1 - Math.pow(0.001, dt));
      this.y = lerp(this.y, targetY, 1 - Math.pow(0.002, dt));
    }

    screenToWorld(point) {
      return { x: point.x + this.x, y: point.y + this.y };
    }

    worldToScreen(point) {
      return { x: point.x - this.x, y: point.y - this.y };
    }
  }

  class InputManager {
    constructor(canvas) {
      this.canvas = canvas;
      this.keys = new Set();
      this.pressed = new Set();
      this.mouse = { x: 0, y: 0, worldX: 0, worldY: 0, left: false, right: false };
      this.radialOpen = false;
      this.radialHover = "Air";
      this.secondaryQuickRequest = null;
      this.debugPressed = false;
      this.listeners = [];
      this.bind();
    }

    bind() {
      this.on(window, "keydown", (event) => {
        const code = event.code;
        if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "KeyQ", "KeyE", "KeyF", "Digit1", "Digit2", "Digit3", "Backquote"].includes(code)) {
          event.preventDefault();
        }
        if (!event.repeat) {
          this.pressed.add(code);
          if (code === "Digit1" || code === "Digit2" || code === "Digit3") {
            this.secondaryQuickRequest = Number(code.slice(-1));
          }
          if (code === "Backquote") this.debugPressed = true;
        }
        this.keys.add(code);
        if (code === "KeyF") this.radialOpen = true;
      });

      this.on(window, "keyup", (event) => {
        const code = event.code;
        if (code === "KeyF") {
          this.radialOpen = false;
        }
        this.keys.delete(code);
      });

      this.on(this.canvas, "mousemove", (event) => this.syncMouse(event));
      this.on(this.canvas, "mousedown", (event) => {
        this.syncMouse(event);
        if (event.button === 0) this.mouse.left = true;
        if (event.button === 2) this.mouse.right = true;
      });
      this.on(window, "mouseup", (event) => {
        this.syncMouse(event);
        if (event.button === 0) this.mouse.left = false;
        if (event.button === 2) this.mouse.right = false;
      });
      this.on(this.canvas, "contextmenu", (event) => event.preventDefault());
    }

    on(target, type, handler) {
      target.addEventListener(type, handler);
      this.listeners.push(() => target.removeEventListener(type, handler));
    }

    syncMouse(event) {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.canvas.width / Math.max(1, rect.width);
      const sy = this.canvas.height / Math.max(1, rect.height);
      this.mouse.x = (event.clientX - rect.left) * sx;
      this.mouse.y = (event.clientY - rect.top) * sy;
    }

    updateWorldMouse(camera) {
      const world = camera.screenToWorld({ x: this.mouse.x, y: this.mouse.y });
      this.mouse.worldX = world.x;
      this.mouse.worldY = world.y;
      if (this.radialOpen) {
        const dx = this.mouse.x - this.canvas.width * 0.5;
        const dy = this.mouse.y - this.canvas.height * 0.5;
        if (Math.hypot(dx, dy) > 22) {
          this.radialHover = Math.abs(dx) > Math.abs(dy)
            ? (dx > 0 ? "Fire" : "Earth")
            : (dy > 0 ? "Water" : "Air");
        }
      }
    }

    action() {
      return {
        left: this.keys.has("KeyA"),
        right: this.keys.has("KeyD"),
        down: this.keys.has("KeyS"),
        jumpPressed: this.pressed.has("KeyW"),
        spacePressed: this.pressed.has("Space"),
        spaceHeld: this.keys.has("Space"),
        shiftPressed: this.pressed.has("ShiftLeft") || this.pressed.has("ShiftRight"),
        shiftHeld: this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"),
        qPressed: this.pressed.has("KeyQ"),
        ePressed: this.pressed.has("KeyE")
      };
    }

    endFrame() {
      this.pressed.clear();
      this.secondaryQuickRequest = null;
      this.debugPressed = false;
    }

    cleanup() {
      this.listeners.forEach((cleanup) => cleanup());
      this.listeners = [];
    }
  }

  class GestureEngine {
    constructor(camera, getPlayer) {
      this.camera = camera;
      this.getPlayer = getPlayer;
      this.active = null;
      this.lastGesture = null;
    }

    start(button, mouse, now) {
      this.active = {
        button,
        points: [this.makePoint(mouse, now)]
      };
    }

    add(mouse, now) {
      if (!this.active) return;
      const last = this.active.points[this.active.points.length - 1];
      if (!last || Math.hypot(last.x - mouse.x, last.y - mouse.y) > 2) {
        this.active.points.push(this.makePoint(mouse, now));
      }
    }

    finish(mouse, now) {
      if (!this.active) return null;
      this.add(mouse, now);
      const player = this.getPlayer();
      const gesture = GestureEngine.classifyPath(this.active.points, {
        x: player.x + player.w * 0.5,
        y: player.y + player.h * 0.5
      });
      gesture.button = this.active.button;
      this.lastGesture = gesture;
      this.active = null;
      return gesture;
    }

    makePoint(mouse, now) {
      const world = this.camera.screenToWorld({ x: mouse.x, y: mouse.y });
      return { x: mouse.x, y: mouse.y, worldX: world.x, worldY: world.y, t: now };
    }

    getTrail() {
      return this.active ? this.active.points : [];
    }

    getPreviewGesture() {
      if (!this.active || this.active.points.length < 2) return null;
      const player = this.getPlayer();
      return GestureEngine.classifyPath(this.active.points, {
        x: player.x + player.w * 0.5,
        y: player.y + player.h * 0.5
      });
    }

    static classifyPath(points, playerWorld) {
      const safe = points && points.length ? points : [{ x: 0, y: 0, worldX: 0, worldY: 0, t: 0 }];
      const features = GestureEngine.computeFeatures(safe, playerWorld || { x: 0, y: 0 });
      const first = features.first;
      const last = features.last;
      const worldStart = { x: first.worldX !== undefined ? first.worldX : first.x, y: first.worldY !== undefined ? first.worldY : first.y };
      const worldEnd = { x: last.worldX !== undefined ? last.worldX : last.x, y: last.worldY !== undefined ? last.worldY : last.y };
      const releaseVelocity = GestureEngine.releaseVelocity(features.smoothed);
      const direction = GestureEngine.cardinal(features.dx, features.dy);
      const relativeToPlayer = GestureEngine.relative(worldStart, worldEnd, playerWorld || { x: 0, y: 0 });

      let type = "drag";
      let confidence = 0.55;
      // Future gesture feature/classifier additions should use computeFeatures() first so all callers get confidence.
      if (features.directDistance < 14 && features.duration < 0.24 && features.length < 22) {
        type = "tap";
        confidence = clamp(1 - features.directDistance / 22, 0.72, 0.98);
      } else if (GestureEngine.isCircle(features)) {
        type = "circle";
        confidence = clamp((features.angleTravel / (Math.PI * 2)) * 0.72 + (1 - features.closure) * 0.28, 0.58, 0.96);
      } else if (GestureEngine.isZigzag(features)) {
        type = "zigzag";
        confidence = clamp(0.48 + features.turnCount * 0.12 + Math.min(features.length / 420, 0.24), 0.58, 0.95);
      } else if (features.directDistance < 22 && features.duration >= 0.42 && features.length < 42) {
        type = "hold";
        confidence = clamp(0.7 + Math.min(features.duration / 1.2, 0.22), 0.7, 0.97);
      } else if (features.speed > 1100 && features.directDistance < 95) {
        type = "flick";
        confidence = clamp(features.speed / 1800, 0.62, 0.94);
      } else if (direction === "up") {
        type = "swipe_up";
        confidence = GestureEngine.swipeConfidence(features);
      } else if (direction === "down") {
        type = "swipe_down";
        confidence = GestureEngine.swipeConfidence(features);
      } else if (direction === "left") {
        type = relativeToPlayer.horizontal === "toward" ? "swipe_toward_player" : "swipe_left";
        confidence = GestureEngine.swipeConfidence(features);
      } else if (direction === "right") {
        type = relativeToPlayer.horizontal === "away" ? "swipe_away_from_player" : "swipe_right";
        confidence = GestureEngine.swipeConfidence(features);
      }

      if ((type === "swipe_left" || type === "swipe_right") && relativeToPlayer.horizontal === "toward") {
        type = "swipe_toward_player";
      }
      if ((type === "swipe_left" || type === "swipe_right") && relativeToPlayer.horizontal === "away") {
        type = "swipe_away_from_player";
      }

      return {
        type,
        direction,
        worldStart,
        worldEnd,
        screenStart: { x: first.x, y: first.y },
        screenEnd: { x: last.x, y: last.y },
        distance: features.length,
        duration: features.duration,
        speed: features.speed,
        confidence,
        releaseVelocity,
        features: {
          directness: features.directness,
          closure: features.closure,
          angleTravel: features.angleTravel,
          turnCount: features.turnCount,
          dominantAxis: features.dominantAxis,
          velocitySamples: features.velocitySamples.length
        },
        relativeToPlayer: Object.assign(relativeToPlayer, { worldDx: features.worldDx, worldDy: features.worldDy })
      };
    }

    static computeFeatures(points, playerWorld) {
      const smoothed = GestureEngine.smoothPoints(points);
      const first = smoothed[0];
      const last = smoothed[smoothed.length - 1];
      let length = 0;
      let angleTravel = 0;
      let turnCount = 0;
      let lastTurnSign = 0;
      const velocitySamples = [];

      for (let i = 1; i < smoothed.length; i++) {
        const prev = smoothed[i - 1];
        const current = smoothed[i];
        const segment = Math.hypot(current.x - prev.x, current.y - prev.y);
        length += segment;
        const dt = Math.max(0.016, (current.t || 0) - (prev.t || 0));
        velocitySamples.push(segment / dt);
        if (i >= 2) {
          const a = smoothed[i - 2];
          const b = prev;
          const c = current;
          const ab = Math.atan2(b.y - a.y, b.x - a.x);
          const bc = Math.atan2(c.y - b.y, c.x - b.x);
          let delta = bc - ab;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          angleTravel += Math.abs(delta);
          const turnSign = Math.abs(delta) > 0.45 ? Math.sign(delta) : 0;
          if (turnSign && lastTurnSign && turnSign !== lastTurnSign) turnCount++;
          if (turnSign) lastTurnSign = turnSign;
        }
      }

      const duration = Math.max(0.016, (last.t || 0) - (first.t || 0));
      const dx = last.x - first.x;
      const dy = last.y - first.y;
      const directDistance = Math.hypot(dx, dy);
      const worldStart = { x: first.worldX !== undefined ? first.worldX : first.x, y: first.worldY !== undefined ? first.worldY : first.y };
      const worldEnd = { x: last.worldX !== undefined ? last.worldX : last.x, y: last.worldY !== undefined ? last.worldY : last.y };
      const player = playerWorld || { x: 0, y: 0 };
      return {
        rawPoints: points,
        smoothed,
        first,
        last,
        length,
        duration,
        dx,
        dy,
        worldDx: worldEnd.x - worldStart.x,
        worldDy: worldEnd.y - worldStart.y,
        directDistance,
        directness: length > 0 ? directDistance / length : 0,
        closure: length > 0 ? directDistance / length : 1,
        angleTravel,
        turnCount,
        dominantAxis: Math.abs(dx) >= Math.abs(dy) ? "x" : "y",
        speed: length / duration,
        velocitySamples,
        playerSide: worldStart.x < player.x ? "left" : "right"
      };
    }

    static smoothPoints(points) {
      if (points.length < 3) return points.slice();
      return points.map((point, index) => {
        if (index === 0 || index === points.length - 1) return Object.assign({}, point);
        const prev = points[index - 1];
        const next = points[index + 1];
        return Object.assign({}, point, {
          x: point.x * 0.5 + prev.x * 0.25 + next.x * 0.25,
          y: point.y * 0.5 + prev.y * 0.25 + next.y * 0.25,
          worldX: point.worldX !== undefined ? point.worldX * 0.5 + (prev.worldX || prev.x) * 0.25 + (next.worldX || next.x) * 0.25 : point.worldX,
          worldY: point.worldY !== undefined ? point.worldY * 0.5 + (prev.worldY || prev.y) * 0.25 + (next.worldY || next.y) * 0.25 : point.worldY
        });
      });
    }

    static swipeConfidence(features) {
      const axisStrength = features.dominantAxis === "x"
        ? Math.abs(features.dx) / Math.max(1, Math.abs(features.dy) + Math.abs(features.dx))
        : Math.abs(features.dy) / Math.max(1, Math.abs(features.dx) + Math.abs(features.dy));
      return clamp(0.34 + features.directness * 0.42 + axisStrength * 0.28, 0.48, 0.96);
    }

    static releaseVelocity(points) {
      if (points.length < 2) return { x: 0, y: 0, speed: 0 };
      const last = points[points.length - 1];
      let prev = points[points.length - 2];
      for (let i = points.length - 2; i >= 0; i--) {
        if ((last.t || 0) - (points[i].t || 0) > 0.03) {
          prev = points[i];
          break;
        }
      }
      const dt = Math.max(0.016, (last.t || 0) - (prev.t || 0));
      const vx = (last.x - prev.x) / dt;
      const vy = (last.y - prev.y) / dt;
      return { x: vx, y: vy, speed: Math.hypot(vx, vy) };
    }

    static cardinal(dx, dy) {
      if (Math.hypot(dx, dy) < 22) return "none";
      if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
      return dy > 0 ? "down" : "up";
    }

    static relative(start, end, player) {
      const startDist = Math.abs(start.x - player.x);
      const endDist = Math.abs(end.x - player.x);
      const horizontal = endDist > startDist + 18 ? "away" : (endDist < startDist - 18 ? "toward" : "neutral");
      const side = start.x < player.x ? "left" : "right";
      return { horizontal, side };
    }

    static isCircle(features) {
      const points = features.smoothed;
      if (points.length < 9 || features.length < 120 || features.directDistance > features.length * 0.42) return false;
      const cx = points.reduce((sum, point) => sum + point.x, 0) / points.length;
      const cy = points.reduce((sum, point) => sum + point.y, 0) / points.length;
      let angleTravel = 0;
      let lastAngle = Math.atan2(points[0].y - cy, points[0].x - cx);
      for (let i = 1; i < points.length; i++) {
        const angle = Math.atan2(points[i].y - cy, points[i].x - cx);
        let delta = angle - lastAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        angleTravel += Math.abs(delta);
        lastAngle = angle;
      }
      return angleTravel > Math.PI * 1.45;
    }

    static isZigzag(features) {
      const points = features.rawPoints || features.smoothed;
      if (points.length < 6 || features.length < 115) return false;
      let changes = 0;
      let lastSign = 0;
      for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const sign = Math.abs(dx) > 6 ? Math.sign(dx) : 0;
        if (sign && lastSign && sign !== lastSign) changes++;
        if (sign) lastSign = sign;
      }
      return changes >= 2 || (features.turnCount >= 2 && features.directness < 0.78);
    }
  }

  class ElementState {
    constructor(debugUnlocked) {
      this.debugUnlocked = Boolean(debugUnlocked);
      this.primary = "Air";
      this.secondary = "Fire";
      this.elements = {};
      ELEMENTS.forEach((element) => {
        this.elements[element] = { level: 1, xp: 0, xpToNext: 80 };
      });
      if (this.debugUnlocked) {
        ELEMENTS.forEach((element) => {
          this.elements[element].level = 5;
          this.elements[element].xpToNext = 9999;
        });
      }
    }

    setPrimary(element) {
      if (!ELEMENTS.includes(element)) return;
      this.primary = element;
      if (this.secondary === element) {
        this.secondary = ELEMENTS.find((candidate) => candidate !== element) || "Fire";
      }
    }

    setSecondaryByIndex(index) {
      const options = ELEMENTS.filter((element) => element !== this.primary);
      this.secondary = options[index - 1] || this.secondary;
    }

    hasSkill(element, skillId) {
      if (this.debugUnlocked) return true;
      const data = this.elements[element];
      return SKILL_TREE[element].some((skill) => skill.id === skillId && data.level >= skill.level);
    }

    addXp(element, amount) {
      if (!this.elements[element] || amount <= 0) return;
      const data = this.elements[element];
      data.xp += amount;
      while (!this.debugUnlocked && data.level < 5 && data.xp >= data.xpToNext) {
        data.xp -= data.xpToNext;
        data.level += 1;
        data.xpToNext = Math.round(data.xpToNext * 1.42);
      }
    }

    unlockedNames(element) {
      const level = this.elements[element].level;
      return SKILL_TREE[element].filter((skill) => this.debugUnlocked || skill.level <= level).map((skill) => skill.name);
    }
  }

  class AbilityRegistry {
    constructor() {
      this.abilities = [];
      this.registerDefaults();
    }

    register(ability) {
      this.abilities.push(ability);
      return ability;
    }

    all() {
      return this.abilities.slice();
    }

    byElement(element) {
      return this.abilities.filter((ability) => ability.element === element);
    }

    findMatches(element, gesture, elementState, cooldowns) {
      return this.byElement(element).filter((ability) => {
        if (!this.isUnlocked(ability, elementState)) return false;
        if ((cooldowns[ability.id] || 0) > 0) return false;
        if (gesture.confidence < (ability.minConfidence || 0)) return false;
        return AbilityRegistry.gestureMatches(ability.gesture, gesture, ability);
      });
    }

    isUnlocked(ability, elementState) {
      if (elementState.debugUnlocked) return true;
      return elementState.elements[ability.element].level >= (ability.levelRequirement || 1);
    }

    static gestureMatches(requirement, gesture, ability) {
      if (typeof requirement === "function") return requirement(gesture, ability);
      if (Array.isArray(requirement)) return requirement.includes(gesture.type) || requirement.includes(gesture.direction);
      return requirement === gesture.type || requirement === gesture.direction;
    }

    registerDefaults() {
      // Future ability extension point: add new configs here without touching mouse handlers.
      this.register({ id: "fire_lance", element: "Fire", gesture: (g) => g.type === "flick" || (g.distance > 170 && g.speed > 900 && (g.direction === "left" || g.direction === "right")), levelRequirement: 4, cooldown: 0.55, minConfidence: 0.55, animationPose: "fireThrust", description: "Fast fire lance", cast: (game, g) => game.castFireLance(g) });
      this.register({ id: "fire_wheel", element: "Fire", gesture: "circle", levelRequirement: 4, cooldown: 1.0, minConfidence: 0.5, animationPose: "fireWheel", description: "Short-range flame wheel", cast: (game, g) => game.castFireWheel(g) });
      this.register({ id: "fire_ember_barrage", element: "Fire", gesture: "zigzag", levelRequirement: 5, cooldown: 0.9, minConfidence: 0.5, animationPose: "fireHands", description: "Ember barrage", cast: (game, g) => game.castEmberBarrage(g) });
      this.register({ id: "fire_flame_kick", element: "Fire", gesture: "swipe_up", levelRequirement: 2, cooldown: 0.45, minConfidence: 0.48, animationPose: "fireKick", description: "Rising flame kick", cast: (game, g) => game.castFireKick(g) });
      this.register({ id: "fire_flame_slam", element: "Fire", gesture: "swipe_down", levelRequirement: 3, cooldown: 0.55, minConfidence: 0.48, animationPose: "fireSlam", description: "Close flame slam", cast: (game, g) => game.castFireSlam(g) });
      this.register({ id: "fire_fireball", element: "Fire", gesture: ["swipe_left", "swipe_right", "swipe_away_from_player", "swipe_toward_player"], levelRequirement: 1, cooldown: 0.32, minConfidence: 0.44, animationPose: "fireHands", description: "Body-origin fireball", cast: (game, g) => game.castFireball(g) });

      this.register({ id: "air_gale_up", element: "Air", gesture: "swipe_up", levelRequirement: 1, cooldown: 0.45, minConfidence: 0.46, animationPose: "airSweep", description: "Upward gale", cast: (game, g) => game.castAirGaleUp(g) });
      this.register({ id: "air_slam", element: "Air", gesture: "swipe_down", levelRequirement: 1, cooldown: 0.52, minConfidence: 0.46, animationPose: "airSlam", description: "Air fist slam", cast: (game, g) => game.castAirSlam(g) });
      this.register({ id: "air_push", element: "Air", gesture: "swipe_away_from_player", levelRequirement: 1, cooldown: 0.35, minConfidence: 0.44, animationPose: "airSweep", description: "Push loose objects", cast: (game, g) => game.castAirForce(g, 1) });
      this.register({ id: "air_pull", element: "Air", gesture: "swipe_toward_player", levelRequirement: 1, cooldown: 0.35, minConfidence: 0.44, animationPose: "airSweep", description: "Pull loose objects", cast: (game, g) => game.castAirForce(g, -1) });

      this.register({ id: "earth_wall", element: "Earth", gesture: "circle", levelRequirement: 3, cooldown: 1.1, minConfidence: 0.5, animationPose: "earthGrounded", description: "Defensive earth wall", cast: (game, g) => game.earth.createWall(g) });
      this.register({ id: "earth_spike_line", element: "Earth", gesture: "zigzag", levelRequirement: 5, cooldown: 1.2, minConfidence: 0.5, animationPose: "earthGrounded", description: "Jagged spike line", cast: (game, g) => game.earth.createSpikeLine(g) });
      this.register({ id: "earth_raise_rock", element: "Earth", gesture: "swipe_up", levelRequirement: 1, cooldown: 0.65, minConfidence: 0.46, animationPose: "earthGrounded", description: "Raise a rock pillar", cast: (game, g) => game.earth.raiseRock(g) });
      this.register({ id: "earth_launch", element: "Earth", gesture: ["swipe_left", "swipe_right", "swipe_away_from_player", "swipe_toward_player"], levelRequirement: 2, cooldown: 0.72, minConfidence: 0.44, animationPose: "earthGrounded", description: "Launch a stone", cast: (game, g) => game.earth.launchStone(g) });
      this.register({ id: "earth_shockwave", element: "Earth", gesture: "swipe_down", levelRequirement: 1, cooldown: 0.9, minConfidence: 0.46, animationPose: "earthGrounded", description: "Ground shockwave", cast: (game, g) => game.earth.shockwave(g) });

      this.register({ id: "water_grip", element: "Water", gesture: ["hold", "drag", "tap"], levelRequirement: 1, cooldown: 0.08, minConfidence: 0.38, animationPose: "waterGuide", description: "Select nearby water", cast: (game, g) => game.water.grip(g) });
      this.register({ id: "water_throw", element: "Water", gesture: ["swipe_left", "swipe_right", "swipe_up", "swipe_down", "swipe_away_from_player", "swipe_toward_player", "flick"], levelRequirement: 2, cooldown: 0.35, minConfidence: 0.42, animationPose: "waterGuide", description: "Throw controlled water", cast: (game, g) => game.water.throw(g) });
    }
  }

  class AbilitySystem {
    constructor(registry, elementState) {
      this.registry = registry;
      this.elementState = elementState;
      this.cooldowns = {};
      this.lastCast = null;
    }

    update(dt) {
      Object.keys(this.cooldowns).forEach((id) => {
        this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
      });
    }

    cast(game, element, gesture) {
      const matches = this.registry.findMatches(element, gesture, this.elementState, this.cooldowns);
      if (!matches.length) {
        game.ui.toast(element + " has no unlocked response for " + gesture.type);
        return false;
      }
      const ability = matches[0];
      const success = ability.cast(game, gesture, this.elementState) !== false;
      if (success) {
        this.cooldowns[ability.id] = ability.cooldown || 0;
        this.lastCast = ability;
        this.elementState.addXp(element, 12);
        game.player.beginCast(element, ability.animationPose);
      }
      return success;
    }
  }

  class Entity {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.mass = 1;
      this.onGround = false;
      this.dead = false;
    }

    center() {
      return { x: this.x + this.w * 0.5, y: this.y + this.h * 0.5 };
    }

    bounds() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
  }

  class Player extends Entity {
    constructor() {
      super(260, WORLD.groundY - 86, 36, 86);
      this.health = 100;
      this.facing = 1;
      this.castElement = null;
      this.castPose = "neutral";
      this.castTimer = 0;
      this.castWindupTimer = 0;
      this.castReleaseTimer = 0;
      this.recoilTimer = 0;
      this.recoilDirection = 0;
      this.landTimer = 0;
      this.lastGrounded = false;
      this.attackPulse = 0;
      this.hitTimer = 0;
      this.doubleJumpUsed = false;
      this.airDashTimer = 0;
      this.airDashCooldown = 0;
      this.airDashDirection = 1;
      this.slideTimer = 0;
    }

    update(dt, action, elementState) {
      const wasGrounded = this.onGround;
      const accel = this.onGround ? 2100 : 1320;
      const max = action.down && this.onGround ? 260 : 430;
      if (action.left) {
        this.vx -= accel * dt;
        this.facing = -1;
      }
      if (action.right) {
        this.vx += accel * dt;
        this.facing = 1;
      }
      if (!action.left && !action.right && this.onGround) {
        this.vx *= Math.pow(0.0008, dt);
      }
      if (action.down && this.onGround && Math.abs(this.vx) > 90) {
        this.slideTimer = 0.18;
        this.vx += this.facing * 260 * dt;
      }
      this.vx = clamp(this.vx, -max, max);

      if (action.jumpPressed) {
        if (this.onGround) {
          this.vy = -710;
          this.onGround = false;
          this.doubleJumpUsed = false;
        } else if (elementState.primary === "Air" && elementState.hasSkill("Air", "air_double_jump") && !this.doubleJumpUsed) {
          this.vy = -640;
          this.doubleJumpUsed = true;
        }
      }

      if (elementState.primary === "Air" && elementState.hasSkill("Air", "air_dash") && action.shiftPressed && this.airDashCooldown <= 0) {
        this.airDashTimer = 0.18;
        this.airDashCooldown = 0.72;
        this.airDashDirection = this.facing;
      }
      if (this.airDashTimer > 0) {
        this.vx = lerp(this.vx, this.airDashDirection * 780, 1 - Math.pow(0.008, dt));
        this.vy *= Math.pow(0.18, dt);
      }

      if (elementState.primary === "Air" && elementState.hasSkill("Air", "air_slow_fall") && action.spaceHeld && this.vy > 60) {
        this.vy = lerp(this.vy, 90, 1 - Math.pow(0.025, dt));
      } else if (elementState.primary === "Air" && action.spacePressed) {
        this.vy = lerp(this.vy, -240, elementState.hasSkill("Air", "air_slow_fall") ? 0.34 : 0.18);
      }

      this.vy += WORLD.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.x = clamp(this.x, 20, WORLD.width - 80);
      if (this.y + this.h >= WORLD.groundY) {
        this.y = WORLD.groundY - this.h;
        this.vy = 0;
        this.onGround = true;
        if (!wasGrounded) this.landTimer = 0.16;
        this.doubleJumpUsed = false;
      } else {
        this.onGround = false;
      }

      this.castTimer = Math.max(0, this.castTimer - dt);
      this.castWindupTimer = Math.max(0, this.castWindupTimer - dt);
      this.castReleaseTimer = Math.max(0, this.castReleaseTimer - dt);
      this.recoilTimer = Math.max(0, this.recoilTimer - dt);
      this.landTimer = Math.max(0, this.landTimer - dt);
      this.attackPulse = Math.max(0, this.attackPulse - dt);
      this.hitTimer = Math.max(0, this.hitTimer - dt);
      this.airDashTimer = Math.max(0, this.airDashTimer - dt);
      this.airDashCooldown = Math.max(0, this.airDashCooldown - dt);
      this.slideTimer = Math.max(0, this.slideTimer - dt);
      this.lastGrounded = this.onGround;
    }

    beginCast(element, pose) {
      this.castElement = element;
      this.castPose = pose || "neutral";
      this.castTimer = 0.34;
      this.castWindupTimer = 0.1;
      this.castReleaseTimer = 0.2;
      this.attackPulse = 0.12;
    }

    addRecoil(direction, amount) {
      this.vx -= direction * amount;
      this.recoilDirection = -direction;
      this.recoilTimer = 0.18;
    }

    takeDamage(amount, impulseX) {
      this.health = Math.max(0, this.health - amount);
      this.vx += impulseX;
      this.hitTimer = 0.25;
    }
  }

  class Enemy extends Entity {
    constructor(x) {
      super(x, WORLD.groundY - 76, 42, 76);
      this.health = 100;
      this.maxHealth = 100;
      this.noticeRange = 560;
      this.hitTimer = 0;
      this.kind = "training_dummy";
    }

    update(dt, player) {
      this.hitTimer = Math.max(0, this.hitTimer - dt);
      if (this.dead) return;
      const dx = player.x - this.x;
      if (Math.abs(dx) < this.noticeRange) {
        this.vx += Math.sign(dx) * 520 * dt;
      }
      this.vx *= Math.pow(0.05, dt);
      this.vx = clamp(this.vx, -130, 130);
      this.vy += WORLD.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y + this.h >= WORLD.groundY) {
        this.y = WORLD.groundY - this.h;
        this.vy = 0;
        this.onGround = true;
      }
    }

    damage(amount, forceX, forceY) {
      this.health -= amount;
      this.vx += forceX;
      this.vy += forceY;
      this.hitTimer = 0.18;
      if (this.health <= 0) {
        this.dead = true;
      }
    }
  }

  class PhysicsObject extends Entity {
    constructor(x, y, w, h, type, options) {
      super(x, y, w, h);
      options = options || {};
      this.type = type;
      this.tags = new Set();
      this.setTags(options.tag || type);
      this.addTag(type);
      this.mass = options.mass || 1;
      this.static = Boolean(options.static);
      this.controlled = false;
      this.frozen = Boolean(options.frozen);
      this.attached = Boolean(options.attached);
      this.color = options.color || "#ccc";
      this.life = options.life ? options.life : Infinity;
      this.damage = options.damage ? options.damage : 0;
      this.radius = options.radius ? options.radius : Math.max(w, h) * 0.5;
      this.restitution = options.restitution !== undefined ? options.restitution : 0.18;
      this.groundFriction = options.groundFriction !== undefined ? options.groundFriction : 0.09;
      this.spawnProgress = options.spawnProgress !== undefined ? options.spawnProgress : 1;
      this.emergeDuration = options.emergeDuration || 0.32;
      this.crumbleTimer = options.crumbleTimer || 0;
      this.detachAt = options.detachAt !== undefined ? options.detachAt : 1.3;
      this.justImpactedGround = false;
      this.impactSpeed = 0;
      this.squash = 0;
      if (!this.static && !this.attached && this.type !== "projectile") this.addTag("air-affectable");
      if (this.frozen) this.addTag("ice");
    }

    setTags(tags) {
      this.tags.clear();
      String(Array.isArray(tags) ? tags.join(",") : tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => this.tags.add(tag));
      this.syncTagString();
    }

    syncTagString() {
      this.tag = Array.from(this.tags).join(",");
    }

    hasTag(tag) {
      return this.tags.has(tag);
    }

    addTag(tag) {
      this.tags.add(tag);
      this.syncTagString();
    }

    removeTag(tag) {
      this.tags.delete(tag);
      this.syncTagString();
    }

    isLoose() {
      return !this.static && !this.attached && !this.controlled;
    }

    canBeMovedByAir() {
      return this.isLoose() && this.hasTag("air-affectable");
    }

    update(dt, particles) {
      this.justImpactedGround = false;
      this.impactSpeed = 0;
      this.life -= dt;
      this.spawnProgress = Math.min(1, this.spawnProgress + dt / this.emergeDuration);
      this.squash = Math.max(0, this.squash - dt * 5);
      if (this.life <= 0) {
        this.dead = true;
        return;
      }
      if (this.static) {
        if (this.crumbleTimer > 0 && this.life < this.crumbleTimer && particles && Math.random() < 0.5) {
          particles.earthCrumble(this.x + Math.random() * this.w, this.y + Math.random() * this.h);
        }
        return;
      }
      if (this.controlled) return;
      if (this.attached) {
        if (this.life < this.detachAt) {
          this.attached = false;
          this.removeTag("earth-attached");
          this.addTag("earth-detached");
          this.addTag("air-affectable");
        }
        return;
      }
      const oldBottom = this.y + this.h;
      const oldVy = this.vy;
      this.vy += WORLD.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      if (this.y + this.h >= WORLD.groundY) {
        this.y = WORLD.groundY - this.h;
        this.impactSpeed = Math.abs(oldVy);
        this.justImpactedGround = oldBottom < WORLD.groundY - 2 && this.impactSpeed > 180;
        this.vy *= -this.restitution;
        this.vx *= Math.pow(this.groundFriction, dt);
        this.squash = Math.min(1, this.impactSpeed / 720);
        if (Math.abs(this.vy) < 60) this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }
    }

    applyForce(fx, fy) {
      if (this.static || this.attached) return;
      this.vx += fx / this.mass;
      this.vy += fy / this.mass;
    }
  }

  class WaterBlob extends PhysicsObject {
    constructor(x, y, radius) {
      super(x - radius, y - radius, radius * 2, radius * 2, "water", { tag: "water,air-affectable", mass: 1.45, color: ELEMENT_COLORS.Water, radius, restitution: 0.05, groundFriction: 0.025 });
      this.pulse = Math.random() * 10;
      this.target = null;
      this.targetLag = { x, y };
      this.stretch = 0;
      this.impactSplashCooldown = 0;
      this.wasThrown = false;
    }

    center() {
      if (this.type === "ice") return { x: this.x + this.w * 0.5, y: this.y + this.h * 0.5 };
      return { x: this.x + this.radius, y: this.y + this.radius };
    }

    update(dt, particles) {
      this.pulse += dt * 5;
      this.impactSplashCooldown = Math.max(0, this.impactSplashCooldown - dt);
      this.stretch = lerp(this.stretch, clamp(Math.hypot(this.vx, this.vy) / 620, 0, 1), 1 - Math.pow(0.03, dt));
      // Future water simulation improvement point: replace this spring blob with particles or constraints.
      if (this.controlled && this.target) {
        const c = this.center();
        this.targetLag.x = lerp(this.targetLag.x, this.target.x, 1 - Math.pow(0.08, dt));
        this.targetLag.y = lerp(this.targetLag.y, this.target.y, 1 - Math.pow(0.08, dt));
        this.vx += (this.targetLag.x - c.x) * 8.5 * dt;
        this.vy += (this.targetLag.y - c.y) * 8.5 * dt;
        this.vx *= Math.pow(0.045, dt);
        this.vy *= Math.pow(0.045, dt);
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        return;
      }
      super.update(dt, particles);
      if (this.justImpactedGround && this.impactSplashCooldown <= 0 && particles) {
        particles.waterSplash(this.center().x, WORLD.groundY - 8, this.impactSpeed);
        this.impactSplashCooldown = 0.18;
        this.wasThrown = false;
        this.vx *= 0.55;
      }
    }
  }

  class PhysicsWorld {
    constructor() {
      this.objects = [];
      this.enemies = [];
      this.projectiles = [];
      this.earthZones = [];
      this.waterPools = [];
    }

    populate() {
      // Future level/world loading improvement point: replace this generated test strip with authored chunks.
      for (let x = 850; x < WORLD.width - 400; x += 1250) {
        this.objects.push(new PhysicsObject(x, WORLD.groundY - 42, 46, 42, "crate", { tag: "crate,air-affectable", mass: 0.9, color: "#b78751", groundFriction: 0.05 }));
        this.objects.push(new PhysicsObject(x + 270, WORLD.groundY - 58, 58, 58, "boulder", { tag: "boulder,air-affectable", mass: 2.4, color: "#9a8f82", restitution: 0.08, groundFriction: 0.035 }));
        this.waterPools.push({ x: x + 510, y: WORLD.groundY - 12, w: 220, h: 20 });
        this.objects.push(new WaterBlob(x + 610, WORLD.groundY - 56, 32));
        this.earthZones.push({ x: x + 790, y: WORLD.groundY - 8, w: 280, h: 16 });
        this.enemies.push(new Enemy(x + 1080));
      }
    }

    update(dt, player, particles, elementState) {
      this.objects.forEach((object) => object.update(dt, particles));
      this.projectiles.forEach((projectile) => projectile.update(dt));
      this.enemies.forEach((enemy) => enemy.update(dt, player));

      this.resolveObjectStacking();
      this.resolveProjectileHits(particles, elementState);
      this.resolveThrownObjectHits(particles, elementState);

      this.objects = this.objects.filter((object) => !object.dead);
      this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
      this.enemies = this.enemies.filter((enemy) => !enemy.dead || enemy.hitTimer > 0);
    }

    resolveObjectStacking() {
      for (let i = 0; i < this.objects.length; i++) {
        const a = this.objects[i];
        if (a.static || a.attached) continue;
        for (let j = i + 1; j < this.objects.length; j++) {
          const b = this.objects[j];
          if (!rectsOverlap(a.bounds(), b.bounds())) continue;
          const push = (a.x + a.w * 0.5) < (b.x + b.w * 0.5) ? -1 : 1;
          a.x += push * 1.2;
          b.x -= push * 1.2;
          const av = a.vx;
          a.vx = b.vx * 0.45;
          b.vx = av * 0.45;
        }
      }
    }

    resolveProjectileHits(particles, elementState) {
      this.projectiles.forEach((projectile) => {
        this.enemies.forEach((enemy) => {
          if (enemy.dead || projectile.dead) return;
          if (circleRectOverlap({ x: projectile.x + projectile.w * 0.5, y: projectile.y + projectile.h * 0.5, r: projectile.radius }, enemy.bounds())) {
            enemy.damage(projectile.damage, Math.sign(projectile.vx || 1) * 360, -120);
            elementState.addXp(projectile.element, 18);
            if (projectile.element === "Fire") particles.fireImpact(enemy.center().x, enemy.center().y, 210);
            else particles.burst(enemy.center().x, enemy.center().y, projectile.color, 18);
            projectile.dead = true;
          }
        });
      });
    }

    resolveThrownObjectHits(particles, elementState) {
      this.objects.forEach((object) => {
        if (Math.hypot(object.vx, object.vy) < 360) return;
        this.enemies.forEach((enemy) => {
          if (enemy.dead || !rectsOverlap(object.bounds(), enemy.bounds())) return;
          const element = object.type === "water" || object.type === "ice" ? "Water" : (object.type === "earth" ? "Earth" : null);
          enemy.damage(object.damage || 16, Math.sign(object.vx || 1) * 260, -160);
          if (element) elementState.addXp(element, 16);
          if (object.type === "water") {
            particles.waterSplash(enemy.center().x, enemy.center().y, Math.hypot(object.vx, object.vy) * 0.45);
            object.vx *= 0.45;
            object.vy *= 0.25;
          }
          particles.burst(enemy.center().x, enemy.center().y, object.color, 12);
        });
      });
    }

    queryEnemies(center, radius) {
      return this.enemies.filter((enemy) => !enemy.dead && dist(enemy.center(), center) <= radius);
    }

    queryObjects(center, radius, predicate) {
      return this.objects.filter((object) => {
        if (predicate && !predicate(object)) return false;
        return dist(object.center(), center) <= radius;
      });
    }

    addProjectile(projectile) {
      this.projectiles.push(projectile);
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
    }

    add(x, y, vx, vy, color, life, size) {
      this.particles.push({ x, y, vx, vy, color, life, maxLife: life, size });
    }

    burst(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 260;
        this.add(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, color, 0.25 + Math.random() * 0.5, 2 + Math.random() * 4);
      }
    }

    // Future element-specific visuals should be added as named helpers here, not inline in ability code.
    airArc(x, y, dirX, dirY, color, count) {
      const base = norm(dirX, dirY || -0.2);
      for (let i = 0; i < count; i++) {
        const spread = (i / Math.max(1, count - 1) - 0.5) * 1.2;
        const px = x - base.x * i * 10 + Math.sin(i) * 18;
        const py = y - base.y * i * 8 + Math.cos(i * 0.7) * 14;
        this.add(px, py, base.x * (190 + i * 8) - base.y * spread * 90, base.y * 180 + base.x * spread * 90, color, 0.28 + i * 0.008, 1.4 + (i % 3));
      }
    }

    fireTrail(x, y, dirX, dirY) {
      for (let i = 0; i < 3; i++) {
        this.add(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8, -dirX * (120 + Math.random() * 80), -dirY * 80 + (Math.random() - 0.5) * 60, i % 2 ? "#ff3d24" : "#ffb33c", 0.22 + Math.random() * 0.18, 3 + Math.random() * 3);
      }
    }

    fireImpact(x, y, strength) {
      this.burst(x, y, ELEMENT_COLORS.Fire, Math.round(clamp(strength / 40, 10, 28)));
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        this.add(x, y, Math.cos(angle) * strength, Math.sin(angle) * strength, i % 2 ? "#ff3d24" : "#ffb33c", 0.22, 2.4);
      }
    }

    waterSplash(x, y, strength) {
      const count = Math.round(clamp(strength / 45, 6, 22));
      for (let i = 0; i < count; i++) {
        const dir = -1 + (2 * i) / Math.max(1, count - 1);
        this.add(x, y, dir * (90 + Math.random() * strength), -70 - Math.random() * strength * 0.8, ELEMENT_COLORS.Water, 0.32 + Math.random() * 0.35, 2 + Math.random() * 3);
      }
    }

    earthCrumble(x, y) {
      this.add(x, y, (Math.random() - 0.5) * 90, 80 + Math.random() * 120, ELEMENT_COLORS.Earth, 0.45 + Math.random() * 0.35, 3 + Math.random() * 3);
    }

    gestureTrailPoint(x, y, color, age) {
      this.add(x, y, 0, 0, color, Math.max(0.12, 0.24 - age * 0.04), 2);
    }

    update(dt) {
      this.particles.forEach((particle) => {
        particle.life -= dt;
        particle.vy += 200 * dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      });
      this.particles = this.particles.filter((particle) => particle.life > 0);
    }

    render(ctx, camera) {
      this.particles.forEach((particle) => {
        const alpha = clamp(particle.life / particle.maxLife, 0, 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x - camera.x, particle.y - camera.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  }

  class WaterSystem {
    constructor(game) {
      this.game = game;
      this.controlled = null;
      this.shieldTimer = 0;
    }

    update(dt) {
      if (this.controlled) {
        this.controlled.target = { x: this.game.input.mouse.worldX, y: this.game.input.mouse.worldY };
      }
      this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    }

    grip(gesture) {
      const water = this.findWaterNear(gesture.worldStart, 130) || this.findWaterNear(gesture.worldEnd, 160);
      if (!water) {
        this.game.ui.toast("Water requires an existing pool or blob.");
        return false;
      }
      water.controlled = true;
      water.attached = false;
      water.frozen = false;
      water.type = "water";
      water.color = ELEMENT_COLORS.Water;
      water.addTag("water");
      water.addTag("air-affectable");
      water.removeTag("ice");
      this.controlled = water;
      this.game.elementState.addXp("Water", 8);
      this.game.particles.burst(water.center().x, water.center().y, ELEMENT_COLORS.Water, 8);
      return true;
    }

    throw(gesture) {
      if (!this.controlled) {
        if (!this.grip(gesture)) return false;
      }
      const velocity = gesture.releaseVelocity.speed > 140
        ? norm(gesture.releaseVelocity.x, gesture.releaseVelocity.y)
        : norm(gesture.relativeToPlayer.worldDx || this.game.player.facing, gesture.relativeToPlayer.worldDy || -0.15);
      this.controlled.controlled = false;
      this.controlled.target = null;
      this.controlled.vx = velocity.x * 760;
      this.controlled.vy = velocity.y * 760;
      this.controlled.damage = 22;
      this.controlled.wasThrown = true;
      this.controlled = null;
      this.game.elementState.addXp("Water", 14);
      return true;
    }

    freezeControlled() {
      if (!this.controlled || !this.game.elementState.hasSkill("Water", "water_freeze")) return false;
      this.controlled.controlled = false;
      this.controlled.frozen = true;
      this.controlled.type = "ice";
      this.controlled.w = this.controlled.radius * 1.75;
      this.controlled.h = this.controlled.radius * 1.45;
      this.controlled.mass = 2.0;
      this.controlled.restitution = 0.04;
      this.controlled.groundFriction = 0.025;
      this.controlled.color = "#b8f3ff";
      this.controlled.damage = 28;
      this.controlled.addTag("ice");
      this.controlled.addTag("solid");
      this.controlled.addTag("air-affectable");
      this.controlled = null;
      this.game.elementState.addXp("Water", 12);
      return true;
    }

    pullShield(dt) {
      if (!this.game.elementState.hasSkill("Water", "water_shield")) return;
      const playerCenter = this.game.player.center();
      const nearby = this.game.world.queryObjects(playerCenter, 420, (object) => object.type === "water");
      nearby.forEach((water) => {
        water.controlled = false;
        const c = water.center();
        const n = norm(playerCenter.x - c.x, playerCenter.y - 28 - c.y);
        water.vx += n.x * 1600 * dt;
        water.vy += n.y * 1600 * dt;
      });
      if (nearby.length) {
        this.shieldTimer = 0.15;
        this.game.elementState.addXp("Water", 3 * dt);
      }
    }

    findWaterNear(point, radius) {
      const blobs = this.game.world.queryObjects(point, radius, (object) => object.type === "water" || object.type === "ice");
      if (blobs.length) return blobs[0];
      const pool = this.game.world.waterPools.find((candidate) => {
        return point.x >= candidate.x - radius && point.x <= candidate.x + candidate.w + radius && Math.abs(point.y - candidate.y) < radius;
      });
      if (!pool) return null;
      const blob = new WaterBlob(clamp(point.x, pool.x + 24, pool.x + pool.w - 24), WORLD.groundY - 48, 30);
      this.game.world.objects.push(blob);
      return blob;
    }
  }

  class EarthSystem {
    constructor(game) {
      this.game = game;
    }

    nearGround(gesture, range) {
      const yOk = Math.abs(gesture.worldStart.y - WORLD.groundY) < range || Math.abs(gesture.worldEnd.y - WORLD.groundY) < range;
      const inZone = this.game.world.earthZones.some((zone) => gesture.worldStart.x >= zone.x - 120 && gesture.worldStart.x <= zone.x + zone.w + 120);
      return yOk || inZone || this.game.player.onGround;
    }

    raiseRock(gesture) {
      if (!this.nearGround(gesture, 170)) {
        this.game.ui.toast("Earth requires ground or an earth zone.");
        return false;
      }
      const side = gesture.worldStart.x < this.game.player.center().x ? -1 : 1;
      const x = this.game.player.center().x + side * 82;
      const rock = new PhysicsObject(x - 24, WORLD.groundY - 108, 48, 108, "earth", { tag: "earth,earth-attached", mass: 3.2, color: ELEMENT_COLORS.Earth, attached: true, damage: 24, spawnProgress: 0, emergeDuration: 0.34, detachAt: 1.15, restitution: 0.04, groundFriction: 0.025 });
      rock.life = 2.4;
      this.game.world.objects.push(rock);
      this.game.particles.burst(x, WORLD.groundY - 40, ELEMENT_COLORS.Earth, 18);
      this.game.elementState.addXp("Earth", 14);
      return true;
    }

    launchStone(gesture) {
      if (!this.nearGround(gesture, 150)) {
        this.game.ui.toast("Earth launch needs nearby ground.");
        return false;
      }
      const dir = gesture.worldEnd.x >= this.game.player.center().x ? 1 : -1;
      const stone = new PhysicsObject(this.game.player.center().x + dir * 56, WORLD.groundY - 52, 50, 50, "earth", { tag: "earth,earth-detached,air-affectable", mass: 2.8, color: ELEMENT_COLORS.Earth, damage: 26, restitution: 0.04, groundFriction: 0.025 });
      stone.vx = dir * 650;
      stone.vy = -280;
      this.game.world.objects.push(stone);
      this.game.particles.burst(stone.x, stone.y, ELEMENT_COLORS.Earth, 16);
      this.game.elementState.addXp("Earth", 16);
      return true;
    }

    shockwave() {
      if (!this.game.player.onGround) return false;
      const center = this.game.player.center();
      this.game.world.queryEnemies(center, 300).forEach((enemy) => {
        const dir = Math.sign(enemy.center().x - center.x) || this.game.player.facing;
        enemy.damage(18, dir * 430, -180);
        this.game.elementState.addXp("Earth", 10);
      });
      this.game.world.queryObjects(center, 330, (object) => !object.static).forEach((object) => {
        const dir = Math.sign(object.center().x - center.x) || this.game.player.facing;
        object.applyForce(dir * 540, -220);
      });
      for (let i = -5; i <= 5; i++) {
        this.game.particles.add(center.x + i * 35, WORLD.groundY - 12, i * 30, -120 - Math.random() * 180, ELEMENT_COLORS.Earth, 0.5, 4);
      }
      return true;
    }

    createWall(gesture) {
      if (!this.nearGround(gesture, 180)) return false;
      const x = clamp(gesture.worldEnd.x, this.game.player.x - 260, this.game.player.x + 300);
      const wall = new PhysicsObject(x - 18, WORLD.groundY - 150, 36, 150, "earth", { tag: "earth,earth-wall,solid", static: true, color: ELEMENT_COLORS.Earth, damage: 10, spawnProgress: 0, emergeDuration: 0.42, crumbleTimer: 1.0 });
      wall.life = 4.4;
      this.game.world.objects.push(wall);
      this.game.particles.burst(x, WORLD.groundY - 70, ELEMENT_COLORS.Earth, 18);
      this.game.elementState.addXp("Earth", 18);
      return true;
    }

    createSpikeLine(gesture) {
      if (!this.nearGround(gesture, 180)) return false;
      const dir = gesture.worldEnd.x >= this.game.player.center().x ? 1 : -1;
      for (let i = 0; i < 6; i++) {
        const spike = new PhysicsObject(this.game.player.center().x + dir * (70 + i * 45), WORLD.groundY - 42, 28, 42, "earth", { tag: "earth,earth-spike,solid", static: true, color: "#d8b276", damage: 18, spawnProgress: 0, emergeDuration: 0.22, crumbleTimer: 0.6 });
        spike.life = 2.5;
        this.game.world.objects.push(spike);
        this.game.world.queryEnemies(spike.center(), 45).forEach((enemy) => enemy.damage(12, dir * 140, -220));
      }
      this.game.elementState.addXp("Earth", 20);
      return true;
    }
  }

  class StickmanRenderer {
    constructor() {
      this.poseHistory = [];
      this.lastSampleTime = -1;
    }

    render(ctx, player, camera, time) {
      const pose = this.buildPose(player, camera, time);
      this.samplePose(pose, time);

      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      this.drawAfterimages(ctx, pose, time);
      this.drawElementAccents(ctx, pose, time, "back");
      this.drawGroundContact(ctx, pose, time);
      this.drawBody(ctx, pose);
      this.drawElementAccents(ctx, pose, time, "front");
      ctx.restore();
    }

    buildPose(player, camera, time) {
      const sx = player.x - camera.x;
      const sy = player.y - camera.y;
      const centerX = sx + player.w * 0.5;
      const groundY = sy + player.h;
      const facing = player.facing || 1;
      const speed = Math.abs(player.vx);
      const runPower = clamp(speed / 430, 0, 1);
      const rawSlide = clamp(player.slideTimer / 0.18, 0, 1);
      const slide = rawSlide * rawSlide * (3 - rawSlide * 2);
      const dash = clamp(player.airDashTimer / 0.18, 0, 1);
      const casting = player.castTimer > 0;
      const release = clamp(player.castReleaseTimer / 0.2, 0, 1);
      const windup = clamp(player.castWindupTimer / 0.1, 0, 1);
      const recoil = clamp(player.recoilTimer / 0.18, 0, 1);
      const land = clamp(player.landTimer / 0.16, 0, 1);
      const hit = clamp(player.hitTimer / 0.25, 0, 1);
      const airborne = player.onGround ? 0 : 1;
      const lift = player.onGround ? 0 : clamp(player.vy / 620, -1, 1);
      const run = speed > 35 && player.onGround ? time * (6.2 + runPower * 3.8) : time * 2.2;
      const stridePower = runPower * (1 - slide * 0.85);
      const stride = Math.sin(run) * stridePower;
      const counter = Math.cos(run) * stridePower;
      const breath = Math.sin(time * 2.6) * (1 - runPower) * (1 - slide);
      const castColor = ELEMENT_COLORS[player.castElement] || "#ffffff";
      const element = casting ? player.castElement : null;
      const auraColor = element ? castColor : (dash > 0 ? ELEMENT_COLORS.Air : "rgba(255,255,255,0.2)");
      const recoilOffset = recoil * player.recoilDirection * 8;
      const castPull = casting ? windup * 10 - release * 5 : 0;
      const lean = facing * (runPower * 3.5 + dash * 12 - recoil * 7 + slide * 9) - lift * 4;
      const squash = land * 4 + slide * 4;
      const headBob = Math.abs(counter) * 1.5 + breath;
      const neck = { x: centerX + lean * 0.42 + recoilOffset, y: groundY - 65 + squash + breath };
      const hips = { x: centerX - facing * 2 + lean * 0.12 + recoilOffset * 0.32, y: groundY - 39 + land * 4 + slide * 4 };
      const head = { x: neck.x + lean * 0.28, y: neck.y - 14 - headBob + land * 1.5 };
      const shoulderTilt = stride * 2.2 - lift * 1.6;
      const shoulderSpread = 14.5 + dash * 1.5 - slide * 1.2;
      const shoulderL = { x: neck.x - shoulderSpread + facing * castPull * 0.15, y: neck.y + 7 + shoulderTilt };
      const shoulderR = { x: neck.x + shoulderSpread + facing * castPull * 0.15, y: neck.y + 7 - shoulderTilt };

      let handL = {
        x: shoulderL.x - 13 - stride * 8 - facing * dash * 12,
        y: shoulderL.y + 19 + counter * 4 + airborne * (6 + lift * 5)
      };
      let handR = {
        x: shoulderR.x + 13 + stride * 8 - facing * dash * 12,
        y: shoulderR.y + 19 - counter * 4 + airborne * (6 - lift * 5)
      };

      let footL = { x: hips.x - 12 - stride * 24 - facing * slide * 18, y: groundY - Math.max(0, counter) * 4 };
      let footR = { x: hips.x + 12 + stride * 24 + facing * slide * 24, y: groundY - Math.max(0, -counter) * 4 };
      let kneeL = { x: (hips.x + footL.x) * 0.5 - 7 - facing * slide * 3, y: hips.y + 26 - lift * 10 - Math.max(0, counter) * 8 };
      let kneeR = { x: (hips.x + footR.x) * 0.5 + 7 + facing * slide * 3, y: hips.y + 26 + lift * 10 - Math.max(0, -counter) * 8 };

      if (slide > 0.08 && player.onGround) {
        footL = { x: hips.x - facing * 28, y: groundY };
        footR = { x: hips.x + facing * 38, y: groundY - 1 };
        kneeL = { x: hips.x - facing * 18, y: hips.y + 29 };
        kneeR = { x: hips.x + facing * 24, y: hips.y + 25 };
      }

      if (!player.onGround) {
        footL.x = hips.x - facing * (14 + lift * 8) - 19;
        footR.x = hips.x - facing * (8 + lift * 10) + 20;
        footL.y = groundY - 5 + Math.max(0, lift) * 12;
        footR.y = groundY + 2 - Math.min(0, lift) * 9;
        kneeL = { x: hips.x - 24 - facing * lift * 7, y: hips.y + 27 + lift * 11 };
        kneeR = { x: hips.x + 22 - facing * lift * 5, y: hips.y + 30 - lift * 8 };
      }

      if (casting) {
        const wind = windup * 24;
        if (player.castPose === "fireKick") {
          const frontRight = facing > 0;
          const frontFoot = { x: hips.x + facing * (58 + release * 42) - facing * wind * 0.45, y: groundY - 9 - release * 24 };
          const frontKnee = { x: hips.x + facing * (32 + release * 14), y: hips.y + 22 - release * 24 };
          if (frontRight) {
            footR = frontFoot;
            kneeR = frontKnee;
          } else {
            footL = frontFoot;
            kneeL = frontKnee;
          }
          handL = { x: shoulderL.x - facing * (17 + wind * 0.6), y: shoulderL.y + 16 };
          handR = { x: shoulderR.x - facing * (12 + wind * 0.5), y: shoulderR.y + 18 };
        } else if (player.castElement === "Fire") {
          handR = { x: shoulderR.x + facing * (25 + release * 22) - facing * wind * 0.7, y: shoulderR.y + 3 - release * 5 };
          handL = { x: shoulderL.x - facing * (9 + wind * 0.35), y: shoulderL.y + 18 };
        } else if (player.castElement === "Air") {
          handL = { x: shoulderL.x - facing * (24 + release * 16), y: shoulderL.y - 11 - release * 8 };
          handR = { x: shoulderR.x + facing * (27 + release * 18), y: shoulderR.y - 8 - release * 8 };
        } else if (player.castElement === "Earth") {
          handL = { x: shoulderL.x - 14 - facing * 4, y: shoulderL.y + 25 + release * 8 };
          handR = { x: shoulderR.x + 14 - facing * 4, y: shoulderR.y + 25 + release * 8 };
          hips.y += 4 * release;
          footL.x -= 10;
          footR.x += 10;
        } else if (player.castElement === "Water") {
          handR = { x: shoulderR.x + facing * (21 + release * 16), y: shoulderR.y + 12 - release * 8 };
          handL = { x: shoulderL.x + facing * 8, y: shoulderL.y + 20 + Math.sin(time * 6) * 1.2 };
        }
      }

      const elbowL = this.bendPoint(shoulderL, handL, -5 - runPower * 1.5, -1 + counter);
      const elbowR = this.bendPoint(shoulderR, handR, 5 + runPower * 1.5, -1 - counter);
      kneeL = this.bendPoint(hips, footL, kneeL.x - (hips.x + footL.x) * 0.5, kneeL.y - (hips.y + footL.y) * 0.5);
      kneeR = this.bendPoint(hips, footR, kneeR.x - (hips.x + footR.x) * 0.5, kneeR.y - (hips.y + footR.y) * 0.5);

      return {
        player,
        time,
        centerX,
        groundY,
        facing,
        speed,
        runPower,
        stride,
        counter,
        casting,
        element,
        castColor,
        auraColor,
        release,
        windup,
        recoil,
        land,
        hit,
        slide,
        dash,
        airborne,
        lift,
        color: hit > 0 ? "#fff0f2" : "#f7fbff",
        coreColor: hit > 0 ? "#ffccd2" : "#ffffff",
        shadowColor: auraColor,
        head,
        neck,
        hips,
        shoulderL,
        shoulderR,
        elbowL,
        elbowR,
        handL,
        handR,
        kneeL,
        kneeR,
        footL,
        footR
      };
    }

    bendPoint(a, c, offsetX, offsetY) {
      return {
        x: (a.x + c.x) * 0.5 + offsetX,
        y: (a.y + c.y) * 0.5 + offsetY
      };
    }

    samplePose(pose, time) {
      if (this.lastSampleTime >= 0 && time - this.lastSampleTime < 0.028) return;
      this.lastSampleTime = time;
      if (!pose.casting && pose.dash <= 0 && pose.recoil <= 0 && pose.speed < 320) return;
      this.poseHistory.unshift({
        time,
        element: pose.element,
        auraColor: pose.auraColor,
        color: pose.coreColor,
        head: this.clonePoint(pose.head),
        neck: this.clonePoint(pose.neck),
        hips: this.clonePoint(pose.hips),
        shoulderL: this.clonePoint(pose.shoulderL),
        shoulderR: this.clonePoint(pose.shoulderR),
        elbowL: this.clonePoint(pose.elbowL),
        elbowR: this.clonePoint(pose.elbowR),
        handL: this.clonePoint(pose.handL),
        handR: this.clonePoint(pose.handR),
        kneeL: this.clonePoint(pose.kneeL),
        kneeR: this.clonePoint(pose.kneeR),
        footL: this.clonePoint(pose.footL),
        footR: this.clonePoint(pose.footR)
      });
      this.poseHistory = this.poseHistory.filter((sample) => time - sample.time <= 0.22).slice(0, 7);
    }

    clonePoint(point) {
      return { x: point.x, y: point.y };
    }

    drawAfterimages(ctx, pose, time) {
      this.poseHistory.forEach((sample, index) => {
        const age = time - sample.time;
        if (age <= 0.02) return;
        const alpha = clamp((0.22 - age) / 0.22, 0, 1) * (pose.dash > 0 ? 0.28 : 0.1) * (1 - index * 0.08);
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = sample.auraColor;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = sample.auraColor;
        ctx.lineWidth = 7;
        this.drawPoseLines(ctx, sample, false);
        ctx.fillStyle = sample.auraColor;
        this.dot(ctx, sample.head, 9);
        ctx.restore();
      });
    }

    drawGroundContact(ctx, pose, time) {
      if (!pose.player.onGround && pose.land <= 0 && pose.slide <= 0) return;
      const width = 34 + pose.runPower * 26 + pose.slide * 34 + pose.land * 28;
      const alpha = 0.12 + pose.land * 0.24 + pose.slide * 0.16;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = pose.element === "Earth" ? ELEMENT_COLORS.Earth : "rgba(255,255,255,0.42)";
      ctx.lineWidth = 2 + pose.land * 3;
      ctx.beginPath();
      ctx.ellipse(pose.centerX + pose.facing * pose.slide * 12, pose.groundY + 2, width, 6 + pose.land * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (pose.slide > 0 || pose.land > 0) {
        for (let i = 0; i < 4; i++) {
          const kick = (i - 1.5) * 11 - pose.facing * (20 + Math.sin(time * 8 + i) * 5);
          this.line(ctx, { x: pose.centerX + kick, y: pose.groundY + 1 }, { x: pose.centerX + kick - pose.facing * (10 + pose.slide * 10), y: pose.groundY + 5 + i % 2 });
        }
      }
      ctx.restore();
    }

    drawBody(ctx, pose) {
      ctx.save();
      ctx.shadowColor = pose.shadowColor;
      ctx.shadowBlur = pose.casting ? 22 + pose.player.attackPulse * 70 : 9 + pose.dash * 20;
      ctx.strokeStyle = this.withAlpha(pose.auraColor, pose.casting ? 0.62 : 0.34);
      ctx.lineWidth = 12;
      this.drawPoseLines(ctx, pose, true);

      ctx.shadowBlur = 3;
      ctx.strokeStyle = this.withAlpha("#0b1018", 0.72);
      ctx.lineWidth = 7;
      this.drawPoseLines(ctx, pose, true);

      ctx.strokeStyle = pose.coreColor;
      ctx.lineWidth = 4.2;
      this.drawPoseLines(ctx, pose, true);
      this.drawJoints(ctx, pose);
      this.drawHead(ctx, pose);
      ctx.restore();
    }

    drawPoseLines(ctx, pose, includeTorso) {
      if (includeTorso) {
        this.curve(ctx, pose.neck, this.bendPoint(pose.neck, pose.hips, pose.facing * 5, 2), pose.hips);
        this.curve(ctx, pose.shoulderL, pose.neck, pose.shoulderR);
      }
      this.curve(ctx, pose.shoulderL, pose.elbowL, pose.handL);
      this.curve(ctx, pose.shoulderR, pose.elbowR, pose.handR);
      this.curve(ctx, pose.hips, pose.kneeL, pose.footL);
      this.curve(ctx, pose.hips, pose.kneeR, pose.footR);
    }

    drawJoints(ctx, pose) {
      ctx.fillStyle = this.withAlpha(pose.auraColor, 0.72);
      [pose.handL, pose.handR, pose.footL, pose.footR].forEach((point) => this.dot(ctx, point, 5.4));
      ctx.fillStyle = pose.coreColor;
      [pose.handL, pose.handR].forEach((point) => this.dot(ctx, point, 3.2));
      [pose.footL, pose.footR].forEach((point) => this.foot(ctx, point, pose.facing, 7, 3.4));
    }

    drawHead(ctx, pose) {
      ctx.save();
      ctx.fillStyle = this.withAlpha(pose.auraColor, pose.casting ? 0.28 : 0.14);
      ctx.beginPath();
      ctx.arc(pose.head.x, pose.head.y, 16 + pose.casting * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pose.color;
      ctx.beginPath();
      ctx.ellipse(pose.head.x + pose.facing * 1.5, pose.head.y, 11.5, 12.6, pose.facing * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.withAlpha("#0b1018", 0.78);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#101722";
      ctx.beginPath();
      ctx.arc(pose.head.x + pose.facing * 4.5, pose.head.y - 2.5, 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = this.withAlpha(pose.auraColor, 0.55);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pose.head.x, pose.head.y, 16.5, -0.85 + pose.facing * 0.2, 0.95 + pose.facing * 0.2);
      ctx.stroke();
      ctx.restore();
    }

    drawElementAccents(ctx, pose, time, layer) {
      if (!pose.element && pose.dash <= 0) {
        if (layer === "back" && pose.runPower > 0.3) this.drawNeutralFlow(ctx, pose, time);
        return;
      }
      const element = pose.element || "Air";
      if (element === "Air") this.drawAirAccents(ctx, pose, time, layer);
      if (element === "Fire") this.drawFireAccents(ctx, pose, time, layer);
      if (element === "Water") this.drawWaterAccents(ctx, pose, time, layer);
      if (element === "Earth") this.drawEarthAccents(ctx, pose, time, layer);
    }

    drawNeutralFlow(ctx, pose, time) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      const tail = 20 + pose.runPower * 22;
      this.curve(ctx, { x: pose.neck.x - pose.facing * 5, y: pose.neck.y - 4 }, { x: pose.neck.x - pose.facing * tail, y: pose.neck.y + Math.sin(time * 6) * 5 }, { x: pose.hips.x - pose.facing * (tail + 10), y: pose.hips.y + 8 });
      ctx.restore();
    }

    drawAirAccents(ctx, pose, time, layer) {
      if (layer !== "back") return;
      ctx.save();
      ctx.strokeStyle = this.withAlpha(ELEMENT_COLORS.Air, 0.62);
      ctx.lineWidth = 2.1;
      ctx.shadowColor = ELEMENT_COLORS.Air;
      ctx.shadowBlur = 12;
      for (let i = 0; i < 3; i++) {
        const phase = time * 5 + i * 1.8;
        const lift = Math.sin(phase) * 8;
        const reach = 28 + i * 10 + pose.dash * 24;
        this.curve(
          ctx,
          { x: pose.neck.x - pose.facing * 8, y: pose.neck.y - 4 + i * 7 },
          { x: pose.centerX - pose.facing * reach, y: pose.neck.y - 22 + lift },
          { x: pose.handR.x - pose.facing * (18 + i * 7), y: pose.handR.y - 5 + lift * 0.35 }
        );
      }
      ctx.restore();
    }

    drawFireAccents(ctx, pose, time, layer) {
      if (layer === "back") {
        ctx.save();
        ctx.strokeStyle = this.withAlpha(ELEMENT_COLORS.Fire, 0.48);
        ctx.lineWidth = 6;
        ctx.shadowColor = ELEMENT_COLORS.Fire;
        ctx.shadowBlur = 18;
        const hotFoot = pose.player.castPose === "fireKick" ? (pose.facing > 0 ? pose.footR : pose.footL) : pose.handR;
        this.curve(ctx, { x: hotFoot.x - pose.facing * 42, y: hotFoot.y + 8 }, { x: hotFoot.x - pose.facing * 18, y: hotFoot.y - 20 - Math.sin(time * 9) * 5 }, hotFoot);
        ctx.restore();
        return;
      }
      ctx.save();
      ctx.fillStyle = ELEMENT_COLORS.Fire;
      ctx.shadowColor = ELEMENT_COLORS.Fire;
      ctx.shadowBlur = 16;
      [pose.handR, pose.player.castPose === "fireKick" ? (pose.facing > 0 ? pose.footR : pose.footL) : pose.handL].forEach((point, index) => {
        ctx.beginPath();
        ctx.moveTo(point.x + pose.facing * (5 + index * 2), point.y - 12);
        ctx.quadraticCurveTo(point.x + pose.facing * 18, point.y - 2, point.x + pose.facing * 4, point.y + 10);
        ctx.quadraticCurveTo(point.x - pose.facing * 7, point.y, point.x + pose.facing * (5 + index * 2), point.y - 12);
        ctx.fill();
      });
      ctx.restore();
    }

    drawWaterAccents(ctx, pose, time, layer) {
      if (layer !== "front") return;
      ctx.save();
      ctx.strokeStyle = this.withAlpha(ELEMENT_COLORS.Water, 0.72);
      ctx.lineWidth = 3;
      ctx.shadowColor = ELEMENT_COLORS.Water;
      ctx.shadowBlur = 13;
      const radius = 23 + pose.release * 12;
      ctx.beginPath();
      ctx.arc(pose.handR.x, pose.handR.y, radius, -0.35 + time * 0.5, Math.PI * 1.15 + time * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pose.handL.x, pose.handL.y, radius * 0.72, Math.PI * 0.1 - time * 0.35, Math.PI * 1.25 - time * 0.35);
      ctx.stroke();
      ctx.fillStyle = ELEMENT_COLORS.Water;
      for (let i = 0; i < 4; i++) {
        const angle = time * 4 + i * Math.PI * 0.5;
        this.dot(ctx, { x: pose.handR.x + Math.cos(angle) * radius, y: pose.handR.y + Math.sin(angle) * radius * 0.58 }, 2.4);
      }
      ctx.restore();
    }

    drawEarthAccents(ctx, pose, time, layer) {
      if (layer !== "back") return;
      ctx.save();
      ctx.strokeStyle = this.withAlpha(ELEMENT_COLORS.Earth, 0.58);
      ctx.fillStyle = this.withAlpha(ELEMENT_COLORS.Earth, 0.38);
      ctx.shadowColor = ELEMENT_COLORS.Earth;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3 + pose.release * 3;
      ctx.beginPath();
      ctx.ellipse(pose.centerX, pose.groundY + 3, 42 + pose.release * 24 + pose.land * 18, 7 + pose.release * 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const x = pose.centerX + (i - 2) * 14 + Math.sin(time * 4 + i) * 2;
        const y = pose.groundY - 2 - Math.abs(i - 2) * 2;
        this.rockShard(ctx, x, y, 4 + (i % 2) * 2);
      }
      ctx.restore();
    }

    line(ctx, a, b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    curve(ctx, a, b, c) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(b.x, b.y, c.x, c.y);
      ctx.stroke();
    }

    segment(ctx, a, b, c) {
      this.curve(ctx, a, b, c);
    }

    dot(ctx, point, radius) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    foot(ctx, point, facing, width, height) {
      ctx.beginPath();
      ctx.ellipse(point.x + facing * width * 0.25, point.y, width, height, facing * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    rockShard(ctx, x, y, size) {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.85, y - size * 0.15);
      ctx.lineTo(x + size * 0.45, y + size);
      ctx.lineTo(x - size * 0.8, y + size * 0.45);
      ctx.closePath();
      ctx.fill();
    }

    withAlpha(color, alpha) {
      if (!color) return "rgba(255,255,255," + alpha + ")";
      if (color.startsWith("rgba")) return color.replace(/[\d.]+\)$/g, alpha + ")");
      if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", "," + alpha + ")");
      if (color[0] !== "#" || color.length !== 7) return color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
    }
  }

  class UI {
    constructor(game) {
      this.game = game;
      this.debug = false;
      this.toastTimer = 0;
      this.toastMessage = "";
      this.nodes = {
        healthFill: document.getElementById("healthFill"),
        healthText: document.getElementById("healthText"),
        primaryElement: document.getElementById("primaryElement"),
        secondaryElement: document.getElementById("secondaryElement"),
        xpList: document.getElementById("xpList"),
        cooldownList: document.getElementById("cooldownList"),
        gestureText: document.getElementById("gestureText"),
        debugToggle: document.getElementById("debugToggle"),
        debugPanel: document.getElementById("debugPanel"),
        radialMenu: document.getElementById("radialMenu")
      };
      this.nodes.debugToggle.addEventListener("click", () => this.toggleDebug());
    }

    toggleDebug() {
      this.debug = !this.debug;
      this.nodes.debugPanel.classList.toggle("visible", this.debug);
    }

    toast(message) {
      this.toastMessage = message;
      this.toastTimer = 2.2;
    }

    update(dt) {
      if (this.game.input.debugPressed) this.toggleDebug();
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      const player = this.game.player;
      const state = this.game.elementState;
      this.nodes.healthFill.style.width = clamp(player.health, 0, 100) + "%";
      this.nodes.healthText.textContent = Math.round(player.health);
      this.nodes.primaryElement.textContent = state.primary;
      this.nodes.primaryElement.style.color = ELEMENT_COLORS[state.primary];
      this.nodes.secondaryElement.textContent = state.secondary;
      this.nodes.secondaryElement.style.color = ELEMENT_COLORS[state.secondary];
      const preview = this.game.gesture.getPreviewGesture();
      const gesture = preview || this.game.gesture.lastGesture;
      this.nodes.gestureText.textContent = gesture
        ? (preview ? "~ " : "") + gesture.type + " / " + gesture.direction + " / " + Math.round(gesture.confidence * 100) + "%"
        : "none";

      this.renderXp();
      this.renderCooldowns();
      this.renderRadial();
      if (this.debug) this.renderDebug();
    }

    renderXp() {
      const state = this.game.elementState;
      this.nodes.xpList.innerHTML = "";
      ELEMENTS.forEach((element) => {
        const data = state.elements[element];
        const row = document.createElement("div");
        row.className = "xp-row";
        const name = document.createElement("b");
        name.textContent = element;
        name.style.color = ELEMENT_COLORS[element];
        const level = document.createElement("span");
        level.textContent = "Lv " + data.level;
        const meter = document.createElement("div");
        meter.className = "xp-meter";
        const fill = document.createElement("div");
        fill.className = "xp-fill";
        fill.style.width = state.debugUnlocked ? "100%" : clamp((data.xp / data.xpToNext) * 100, 0, 100) + "%";
        fill.style.background = ELEMENT_COLORS[element];
        meter.appendChild(fill);
        row.appendChild(name);
        row.appendChild(level);
        row.appendChild(meter);
        this.nodes.xpList.appendChild(row);
      });
      const abilities = document.createElement("div");
      abilities.className = "ability-list";
      abilities.textContent = "Unlocked: " + state.unlockedNames(state.primary).join(", ");
      this.nodes.xpList.appendChild(abilities);
    }

    renderCooldowns() {
      this.nodes.cooldownList.innerHTML = "";
      const active = Object.entries(this.game.abilitySystem.cooldowns).filter((entry) => entry[1] > 0.03).slice(0, 4);
      active.forEach(([id, time]) => {
        const row = document.createElement("div");
        row.className = "cooldown-pill";
        row.innerHTML = "<span>" + id.replace(/_/g, " ") + "</span><b>" + time.toFixed(1) + "s</b>";
        this.nodes.cooldownList.appendChild(row);
      });
      if (this.game.elementState.primary === "Air" && this.game.player.airDashCooldown > 0) {
        const row = document.createElement("div");
        row.className = "cooldown-pill";
        row.innerHTML = "<span>air dash</span><b>" + this.game.player.airDashCooldown.toFixed(1) + "s</b>";
        this.nodes.cooldownList.appendChild(row);
      }
      if (this.toastTimer > 0) {
        const row = document.createElement("div");
        row.className = "cooldown-pill";
        row.textContent = this.toastMessage;
        this.nodes.cooldownList.appendChild(row);
      }
    }

    renderRadial() {
      const menu = this.nodes.radialMenu;
      menu.classList.toggle("visible", this.game.input.radialOpen);
      menu.setAttribute("aria-hidden", this.game.input.radialOpen ? "false" : "true");
      menu.querySelectorAll(".radial-option").forEach((node) => {
        node.classList.toggle("active", node.dataset.element === this.game.input.radialHover);
      });
    }

    renderDebug() {
      const g = this.game.gesture.lastGesture;
      this.nodes.debugPanel.textContent = [
        "fps: " + Math.round(this.game.fps),
        "player: " + Math.round(this.game.player.x) + ", " + Math.round(this.game.player.y),
        "camera: " + Math.round(this.game.camera.x) + ", " + Math.round(this.game.camera.y),
        "objects: " + this.game.world.objects.length,
        "enemies: " + this.game.world.enemies.length,
        "projectiles: " + this.game.world.projectiles.length,
        "water controlled: " + Boolean(this.game.water.controlled),
        "debug unlocked: " + this.game.elementState.debugUnlocked,
        "gesture: " + (g ? JSON.stringify({
          type: g.type,
          direction: g.direction,
          distance: Math.round(g.distance),
          speed: Math.round(g.speed),
          relative: g.relativeToPlayer.horizontal
        }) : "none")
      ].join("\n");
    }
  }

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.debugUnlocked = typeof URLSearchParams !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1";
      this.camera = new Camera(canvas);
      this.input = new InputManager(canvas);
      this.player = new Player();
      this.stickman = new StickmanRenderer();
      this.world = new PhysicsWorld();
      this.particles = new ParticleSystem();
      this.elementState = new ElementState(this.debugUnlocked);
      this.registry = new AbilityRegistry();
      this.abilitySystem = new AbilitySystem(this.registry, this.elementState);
      this.water = new WaterSystem(this);
      this.earth = new EarthSystem(this);
      this.gesture = new GestureEngine(this.camera, () => this.player);
      this.ui = new UI(this);
      this.last = performance.now();
      this.time = 0;
      this.fps = 60;
      this.lastRadialOpen = false;
      this.resize();
      this.world.populate();
      window.addEventListener("resize", () => this.resize());
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    start() {
      requestAnimationFrame((now) => this.loop(now));
    }

    loop(now) {
      const dt = Math.min(0.033, (now - this.last) / 1000 || 0.016);
      this.last = now;
      this.time += dt;
      this.fps = lerp(this.fps, 1 / dt, 0.08);
      this.update(dt, now / 1000);
      this.render();
      this.input.endFrame();
      requestAnimationFrame((next) => this.loop(next));
    }

    update(dt, now) {
      this.camera.update(this.player, dt);
      this.input.updateWorldMouse(this.camera);
      this.handleRadialSelection();
      this.handleMouseGestures(now);
      this.handleQuickSecondary();
      this.handleElementMovement(dt);

      this.player.update(dt, this.input.action(), this.elementState);
      this.water.update(dt);
      this.abilitySystem.update(dt);
      this.world.update(dt, this.player, this.particles, this.elementState);
      this.particles.update(dt);
      this.ui.update(dt);
    }

    handleRadialSelection() {
      if (this.lastRadialOpen && !this.input.radialOpen) {
        this.elementState.setPrimary(this.input.radialHover);
      }
      this.lastRadialOpen = this.input.radialOpen;
    }

    handleQuickSecondary() {
      if (this.input.secondaryQuickRequest) {
        this.elementState.setSecondaryByIndex(this.input.secondaryQuickRequest);
      }
    }

    handleMouseGestures(now) {
      const mouse = this.input.mouse;
      if (mouse.left && (!this.gesture.active || this.gesture.active.button !== 0)) {
        this.gesture.start(0, mouse, now);
      } else if (mouse.right && (!this.gesture.active || this.gesture.active.button !== 2)) {
        this.gesture.start(2, mouse, now);
      } else if ((mouse.left || mouse.right) && this.gesture.active) {
        this.gesture.add(mouse, now);
        if (this.gesture.active.button === 2 || this.elementState.primary === "Water" || this.elementState.secondary === "Water") {
          const activeElement = this.gesture.active.button === 0 ? this.elementState.primary : this.elementState.secondary;
          if (activeElement === "Water" && this.gesture.active.points.length > 5) {
            const liveGesture = GestureEngine.classifyPath(this.gesture.active.points, this.player.center());
            if (!this.water.controlled) this.water.grip(liveGesture);
          }
        }
      }

      if (this.gesture.active && this.gesture.active.button === 0 && !mouse.left) {
        const gesture = this.gesture.finish(mouse, now);
        if (gesture) this.abilitySystem.cast(this, this.elementState.primary, gesture);
      }
      if (this.gesture.active && this.gesture.active.button === 2 && !mouse.right) {
        const gesture = this.gesture.finish(mouse, now);
        if (gesture) this.abilitySystem.cast(this, this.elementState.secondary, gesture);
      }
    }

    handleElementMovement(dt) {
      const action = this.input.action();
      if (this.elementState.primary === "Water") {
        if (action.spacePressed) this.water.freezeControlled();
        if (action.shiftHeld) this.water.pullShield(dt);
      }
    }

    castFireball(gesture) {
      const dir = gesture.direction === "left" ? -1 : (gesture.direction === "right" ? 1 : this.player.facing);
      const particles = this.particles;
      const projectile = new PhysicsObject(this.player.center().x + dir * 30, this.player.center().y - 18, 18, 18, "projectile", {
        tag: "projectile,fire",
        mass: 0.2,
        color: ELEMENT_COLORS.Fire,
        radius: 12,
        life: 1.35,
        damage: 22
      });
      projectile.element = "Fire";
      projectile.vx = dir * 980;
      projectile.vy = -40;
      projectile.update = function(dt) {
        this.life -= dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        particles.fireTrail(this.x + this.w * 0.5, this.y + this.h * 0.5, Math.sign(this.vx || 1), 0);
        if (this.life <= 0) this.dead = true;
      };
      this.world.addProjectile(projectile);
      this.particles.burst(projectile.x, projectile.y, ELEMENT_COLORS.Fire, 8);
      this.player.addRecoil(dir, 80);
      return true;
    }

    castFireKick() {
      const legOrigin = { x: this.player.center().x + this.player.facing * 46, y: this.player.y + this.player.h - 18 };
      this.applyDamageArc(legOrigin, 145, 28, this.player.facing * 440, -390, "Fire");
      this.player.vy = Math.min(this.player.vy, -220);
      this.player.addRecoil(this.player.facing, 110);
      this.particles.fireImpact(legOrigin.x + this.player.facing * 28, legOrigin.y - 8, 180);
      return true;
    }

    castFireSlam() {
      const center = this.player.center();
      this.applyDamageArc({ x: center.x + this.player.facing * 28, y: center.y + 24 }, 118, 26, this.player.facing * 280, 120, "Fire");
      this.player.addRecoil(this.player.facing, 70);
      this.particles.fireImpact(center.x + this.player.facing * 35, WORLD.groundY - 18, 190);
      return true;
    }

    castFireLance(gesture) {
      const dir = gesture.direction === "left" ? -1 : (gesture.direction === "right" ? 1 : this.player.facing);
      const particles = this.particles;
      const projectile = new PhysicsObject(this.player.center().x + dir * 34, this.player.center().y - 22, 32, 10, "projectile", {
        tag: "projectile,fire",
        mass: 0.2,
        color: "#ffb36a",
        radius: 18,
        life: 0.85,
        damage: 36
      });
      projectile.element = "Fire";
      projectile.vx = dir * 1450;
      projectile.vy = 0;
      projectile.update = function(dt) {
        this.life -= dt;
        this.x += this.vx * dt;
        particles.fireTrail(this.x + this.w * 0.5, this.y + this.h * 0.5, Math.sign(this.vx || 1), 0);
        if (this.life <= 0) this.dead = true;
      };
      this.world.addProjectile(projectile);
      this.player.addRecoil(dir, 95);
      return true;
    }

    castFireWheel() {
      const center = this.player.center();
      this.applyDamageArc(center, 190, 30, this.player.facing * 220, -120, "Fire");
      this.player.addRecoil(this.player.facing, 55);
      for (let i = 0; i < 42; i++) {
        const a = (i / 42) * Math.PI * 2;
        this.particles.add(center.x + Math.cos(a) * 68, center.y + Math.sin(a) * 68, Math.cos(a) * 160, Math.sin(a) * 160, ELEMENT_COLORS.Fire, 0.45, 4);
      }
      return true;
    }

    castEmberBarrage(gesture) {
      const particles = this.particles;
      for (let i = 0; i < 6; i++) {
        const dir = i % 2 ? -1 : 1;
        const projectile = new PhysicsObject(this.player.center().x, this.player.center().y - 30, 12, 12, "projectile", {
          tag: "projectile,fire",
          color: "#ffd45c",
          radius: 10,
          life: 1.0,
          damage: 12
        });
        projectile.element = "Fire";
        projectile.vx = this.player.facing * (600 + i * 50);
        projectile.vy = -260 + dir * i * 28;
        projectile.update = function(dt) {
          this.life -= dt;
          this.vy += 220 * dt;
          this.x += this.vx * dt;
          this.y += this.vy * dt;
          particles.fireTrail(this.x + this.w * 0.5, this.y + this.h * 0.5, Math.sign(this.vx || 1), 0.25);
          if (this.life <= 0) this.dead = true;
        };
        this.world.addProjectile(projectile);
      }
      this.particles.burst(gesture.worldEnd.x, gesture.worldEnd.y, ELEMENT_COLORS.Fire, 14);
      this.player.addRecoil(this.player.facing, 65);
      return true;
    }

    castAirGaleUp() {
      const center = this.player.center();
      this.world.queryEnemies(center, 280).forEach((enemy) => {
        enemy.damage(8, (enemy.center().x - center.x) * 1.1, -620);
        this.elementState.addXp("Air", 10);
      });
      this.world.queryObjects(center, 320, (object) => object.canBeMovedByAir()).forEach((object) => object.applyForce((object.center().x - center.x) * 2.2, -860));
      this.particles.airArc(center.x, center.y + 70, 0, -1, ELEMENT_COLORS.Air, 28);
      return true;
    }

    castAirSlam() {
      const center = this.player.center();
      this.applyDamageArc({ x: center.x, y: WORLD.groundY - 36 }, 150, 18, this.player.facing * 150, -240, "Air");
      this.player.vy = -230;
      this.particles.burst(center.x, WORLD.groundY - 20, ELEMENT_COLORS.Air, 18);
      return true;
    }

    castAirForce(gesture, polarity) {
      const center = this.player.center();
      const targets = this.world.queryEnemies(center, 430).concat(this.world.queryObjects(center, 450, (object) => object.canBeMovedByAir()));
      targets.forEach((target) => {
        const c = target.center();
        const dir = norm(c.x - center.x, c.y - center.y);
        const fx = dir.x * 520 * polarity;
        const fy = dir.y * 260 * polarity - 80;
        if (typeof target.damage === "function") {
          target.damage(6, fx, fy);
        } else {
          target.applyForce(fx, fy);
        }
        this.elementState.addXp("Air", 5);
      });
      this.particles.airArc(center.x + this.player.facing * 45, center.y, this.player.facing * polarity, polarity < 0 ? 0.2 : -0.1, ELEMENT_COLORS.Air, 32);
      return targets.length > 0;
    }

    applyDamageArc(center, radius, damage, forceX, forceY, element) {
      let hit = false;
      this.world.queryEnemies(center, radius).forEach((enemy) => {
        enemy.damage(damage, forceX, forceY);
        this.elementState.addXp(element, 14);
        hit = true;
      });
      return hit;
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.renderBackground(ctx);
      ctx.save();
      this.renderWorld(ctx);
      this.particles.render(ctx, this.camera);
      this.stickman.render(ctx, this.player, this.camera, this.time);
      this.renderGestureTrail(ctx);
      ctx.restore();
    }

    renderBackground(ctx) {
      const sky = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
      sky.addColorStop(0, "#080b10");
      sky.addColorStop(1, "#121821");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    renderWorld(ctx) {
      const groundScreenY = WORLD.groundY - this.camera.y;
      ctx.fillStyle = "#17202a";
      ctx.fillRect(0, groundScreenY, this.canvas.width, this.canvas.height - groundScreenY);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundScreenY);
      ctx.lineTo(this.canvas.width, groundScreenY);
      ctx.stroke();

      for (let x = Math.floor(this.camera.x / 240) * 240; x < this.camera.x + this.canvas.width + 240; x += 240) {
        const sx = x - this.camera.x;
        ctx.fillStyle = x % 720 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.1)";
        ctx.fillRect(sx, groundScreenY - 36, 3, 36);
        ctx.fillText(String(Math.round(x)), sx + 8, groundScreenY - 12);
      }

      this.world.earthZones.forEach((zone) => {
        ctx.fillStyle = "rgba(208,161,95,0.28)";
        ctx.fillRect(zone.x - this.camera.x, zone.y - this.camera.y, zone.w, zone.h);
      });
      this.world.waterPools.forEach((pool) => {
        ctx.fillStyle = "rgba(50,215,255,0.38)";
        ctx.beginPath();
        ctx.ellipse(pool.x + pool.w * 0.5 - this.camera.x, pool.y - this.camera.y, pool.w * 0.5, 14, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      this.world.objects.forEach((object) => this.renderObject(ctx, object));
      this.world.projectiles.forEach((projectile) => this.renderObject(ctx, projectile));
      this.world.enemies.forEach((enemy) => this.renderEnemy(ctx, enemy));
      if (this.water.shieldTimer > 0) {
        const c = this.player.center();
        ctx.strokeStyle = "rgba(50,215,255,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c.x - this.camera.x, c.y - this.camera.y, 68, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    renderObject(ctx, object) {
      const sx = object.x - this.camera.x;
      const emergeOffset = object.spawnProgress < 1 ? (1 - object.spawnProgress) * object.h : 0;
      const sy = object.y - this.camera.y + emergeOffset;
      const squash = object.squash || 0;
      const drawW = object.w * (1 + squash * 0.18);
      const drawH = object.h * (1 - squash * 0.12);
      const drawX = sx - (drawW - object.w) * 0.5;
      const drawY = sy + (object.h - drawH);
      ctx.save();
      if (object.crumbleTimer > 0 && object.life < object.crumbleTimer) {
        ctx.globalAlpha = clamp(object.life / object.crumbleTimer, 0.25, 0.9);
      }
      ctx.fillStyle = object.color;
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.lineWidth = 2;
      if (object.type === "water") {
        const wobble = Math.sin(object.pulse) * 5;
        const stretch = object.stretch || 0;
        ctx.globalAlpha = 0.86;
        ctx.beginPath();
        ctx.ellipse(sx + object.radius, sy + object.radius, object.radius + wobble + stretch * 11, object.radius - wobble * 0.4 - stretch * 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (object.type === "ice") {
        ctx.fillStyle = "#b8f3ff";
        ctx.shadowColor = "#7ce8ff";
        ctx.shadowBlur = 10;
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.strokeRect(drawX, drawY, drawW, drawH);
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.fillRect(drawX + 6, drawY + 6, drawW * 0.45, 4);
      } else if (object.type === "projectile") {
        ctx.shadowColor = object.color;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(sx + object.w * 0.5, sy + object.h * 0.5, object.radius || object.w, 0, Math.PI * 2);
        ctx.fill();
      } else if (object.type === "earth") {
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.strokeRect(drawX, drawY, drawW, drawH);
        ctx.strokeStyle = "rgba(62,38,22,0.35)";
        ctx.beginPath();
        ctx.moveTo(drawX + drawW * 0.22, drawY + drawH * 0.25);
        ctx.lineTo(drawX + drawW * 0.55, drawY + drawH * 0.5);
        ctx.lineTo(drawX + drawW * 0.36, drawY + drawH * 0.78);
        ctx.stroke();
      } else {
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.strokeRect(drawX, drawY, drawW, drawH);
      }
      ctx.restore();
    }

    renderEnemy(ctx, enemy) {
      const sx = enemy.x - this.camera.x;
      const sy = enemy.y - this.camera.y;
      ctx.save();
      ctx.strokeStyle = enemy.hitTimer > 0 ? "#ff7484" : "#cbd3df";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sx + 21, sy + 13, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + 21, sy + 24);
      ctx.lineTo(sx + 21, sy + 54);
      ctx.moveTo(sx + 6, sy + 34);
      ctx.lineTo(sx + 36, sy + 34);
      ctx.moveTo(sx + 21, sy + 54);
      ctx.lineTo(sx + 8, sy + 74);
      ctx.moveTo(sx + 21, sy + 54);
      ctx.lineTo(sx + 34, sy + 74);
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(sx - 4, sy - 14, 50, 6);
      ctx.fillStyle = "#ff6477";
      ctx.fillRect(sx - 4, sy - 14, 50 * clamp(enemy.health / enemy.maxHealth, 0, 1), 6);
      ctx.restore();
    }

    renderGestureTrail(ctx) {
      const trail = this.gesture.getTrail();
      if (trail.length < 2) return;
      const preview = this.gesture.getPreviewGesture();
      const color = preview
        ? (preview.type === "circle" ? ELEMENT_COLORS.Water : (preview.type === "zigzag" ? ELEMENT_COLORS.Earth : (preview.type.indexOf("swipe") === 0 ? ELEMENT_COLORS.Air : "#ffffff")))
        : "#ffffff";
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const alpha = 0.18 + (i / trail.length) * 0.72;
        ctx.strokeStyle = color.replace(")", ", " + alpha + ")").replace("rgb(", "rgba(");
        if (color[0] === "#") ctx.strokeStyle = color + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 2 + (i / trail.length) * 4;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      const end = trail[trail.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(end.x, end.y, 6, 0, Math.PI * 2);
      ctx.fill();
      if (preview) {
        ctx.fillStyle = "rgba(8,11,16,0.8)";
        ctx.fillRect(end.x + 10, end.y - 28, 118, 22);
        ctx.fillStyle = color;
        ctx.font = "12px Segoe UI, Arial";
        ctx.fillText(preview.type + " " + Math.round(preview.confidence * 100) + "%", end.x + 16, end.y - 12);
      }
      ctx.restore();
    }
  }

  const namespace = {
    ELEMENTS,
    ELEMENT_COLORS,
    SKILL_TREE,
    WORLD,
    Game,
    InputManager,
    GestureEngine,
    PhysicsWorld,
    Entity,
    PhysicsObject,
    Player,
    Enemy,
    StickmanRenderer,
    AbilitySystem,
    AbilityRegistry,
    ElementState,
    WaterSystem,
    EarthSystem,
    ParticleSystem,
    Camera,
    UI
  };

  window.ElementalStickman = namespace;

  function boot() {
    const canvas = document.getElementById("game");
    if (!canvas) return;
    const game = new Game(canvas);
    window.elementalStickmanGame = game;
    game.start();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
