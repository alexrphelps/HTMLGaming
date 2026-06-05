(function() {
  "use strict";

  const ns = window.StormlineRunner || {};

  ns.CONFIG = {
    world: {
      chunkWidth: 720,
      sectorWidth: 2600,
      startX: 160,
      startY: 560,
      floorY: 730,
      platformLayerStep: 92,
      maxGroundStep: 38,
      maxGapWidth: 154,
      gravity: 1850,
      maxFallSpeed: 1180,
      pruneDistance: 1400,
      generateAhead: 3400
    },
    player: {
      width: 34,
      height: 58,
      maxRunSpeed: 345,
      baseForwardSpeed: 0,
      speedRampPerMeter: 0.028,
      maxSpeedBonus: 95,
      inputAccel: 1480,
      airAccel: 960,
      friction: 1820,
      jumpSpeed: 650,
      wallJumpX: 430,
      wallJumpY: 610,
      coyoteTime: 0.12,
      jumpBuffer: 0.13,
      dashSpeed: 680,
      dashDuration: 0.15,
      dashCooldown: 0.66,
      dashBatteryCost: 8,
      wallSlideSpeed: 180,
      maxHealth: 100,
      maxBattery: 100,
      baseBatteryDrain: 1.85,
      invulnTime: 0.85
    },
    shrine: {
      firstChunk: 3,
      intervalChunks: 4,
      draftSize: 3
    }
  };

  ns.WEATHER_FRONTS = [
    {
      id: "magnetic-rain",
      name: "Magnetic Rain",
      shortName: "Magnetic",
      colors: {
        skyTop: "#051018",
        skyMid: "#0c2730",
        skyBottom: "#153c34",
        primary: "#40e8ff",
        secondary: "#78f5a8",
        hazard: "#f6e76d"
      },
      platformLift: -18,
      gapBias: -18,
      hazardBias: 0.9,
      gravityMultiplier: 1,
      batteryDrain: 0.1,
      note: "rails and wall circuits carry charge"
    },
    {
      id: "heat-bloom",
      name: "Heat Bloom",
      shortName: "Heat",
      colors: {
        skyTop: "#170707",
        skyMid: "#331012",
        skyBottom: "#432711",
        primary: "#ffcc5c",
        secondary: "#ff4f86",
        hazard: "#ff7b36"
      },
      platformLift: 14,
      gapBias: 18,
      hazardBias: 1.25,
      gravityMultiplier: 1.03,
      batteryDrain: 0.35,
      note: "heat lanes punish slow routes"
    },
    {
      id: "static-fog",
      name: "Static Fog",
      shortName: "Static",
      colors: {
        skyTop: "#080d18",
        skyMid: "#151d33",
        skyBottom: "#242844",
        primary: "#c66cff",
        secondary: "#40e8ff",
        hazard: "#b8f7ff"
      },
      platformLift: -6,
      gapBias: 26,
      hazardBias: 1.05,
      gravityMultiplier: 0.97,
      batteryDrain: 0.2,
      note: "long gaps reward clean dash timing"
    },
    {
      id: "prism-squall",
      name: "Prism Squall",
      shortName: "Prism",
      colors: {
        skyTop: "#0c0718",
        skyMid: "#211143",
        skyBottom: "#123d4a",
        primary: "#ff4f86",
        secondary: "#40e8ff",
        hazard: "#faff78"
      },
      platformLift: -4,
      gapBias: 8,
      hazardBias: 1.15,
      gravityMultiplier: 1,
      batteryDrain: 0.25,
      note: "charge cells split into better chains"
    },
    {
      id: "overcast-calm",
      name: "Overcast Calm",
      shortName: "Calm",
      colors: {
        skyTop: "#081014",
        skyMid: "#15262b",
        skyBottom: "#2e3d35",
        primary: "#dbe9ec",
        secondary: "#78f5a8",
        hazard: "#b9c4c8"
      },
      platformLift: 0,
      gapBias: -28,
      hazardBias: 0.65,
      gravityMultiplier: 1,
      batteryDrain: -0.25,
      note: "safe air lets recovery talents breathe"
    }
  ];

  ns.WEATHER_BY_ID = ns.WEATHER_FRONTS.reduce(function(map, front) {
    map[front.id] = front;
    return map;
  }, {});

  ns.TALENT_DEFINITIONS = [
    {
      id: "static-afterburner",
      name: "Static Afterburner",
      summary: "Dash duration rises in Static Fog and stays modest elsewhere.",
      affinity: ["static-fog"],
      awkward: ["magnetic-rain"],
      maxStacks: 2
    },
    {
      id: "magnetic-wall-coil",
      name: "Magnetic Wall Coil",
      summary: "Wall slides feed battery, especially during Magnetic Rain.",
      affinity: ["magnetic-rain"],
      awkward: ["heat-bloom"],
      maxStacks: 2
    },
    {
      id: "heat-sink-boots",
      name: "Heat Sink Boots",
      summary: "Heat hazards hit softer and dashes cost less in Heat Bloom.",
      affinity: ["heat-bloom"],
      awkward: ["overcast-calm"],
      maxStacks: 2
    },
    {
      id: "prism-capacitor",
      name: "Prism Capacitor",
      summary: "Charge cells pay out more when Prism Squall is active.",
      affinity: ["prism-squall"],
      awkward: ["static-fog"],
      maxStacks: 2
    },
    {
      id: "calm-restitch",
      name: "Calm Restitch",
      summary: "Overcast Calm slowly repairs health while battery is stable.",
      affinity: ["overcast-calm"],
      awkward: ["heat-bloom"],
      maxStacks: 2
    },
    {
      id: "rail-surge",
      name: "Rail Surge",
      summary: "Storm rails grant more speed and battery during charged weather.",
      affinity: ["magnetic-rain", "static-fog"],
      awkward: ["overcast-calm"],
      maxStacks: 2
    },
    {
      id: "squall-gambit",
      name: "Squall Gambit",
      summary: "Speed climbs faster in dangerous fronts, but battery pressure rises.",
      affinity: ["heat-bloom", "prism-squall"],
      awkward: ["overcast-calm"],
      maxStacks: 1
    },
    {
      id: "reserve-cell",
      name: "Reserve Cell",
      summary: "Maximum battery increases, strongest when the current front is awkward.",
      affinity: ["static-fog", "heat-bloom", "prism-squall"],
      awkward: [],
      maxStacks: 3
    }
  ];

  window.StormlineRunner = ns;
})();
