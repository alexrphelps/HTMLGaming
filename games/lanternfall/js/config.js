(() => {
  "use strict";

  const Lanternfall = window.Lanternfall = window.Lanternfall || {};

  const TILE_TYPES = {
    WALL: 0,
    FLOOR: 1,
    TREASURE: 2,
    CAMP: 3,
    RELIC: 4
  };

  Lanternfall.TILE_TYPES = TILE_TYPES;
  Lanternfall.CONFIG = {
    tileSize: 40,
    defaultSeed: 1337,
    tileTypes: TILE_TYPES,
    vision: {
      min: 5,
      max: 9.5,
      step: 0.6,
      revealPadding: 1
    },
    run: {
      objectiveRadius: 34,
      objectiveVariance: 7,
      relicScore: 50,
      extractionScore: 150
    },
    fuel: {
      max: 100,
      stepCost: 1.15,
      idleCost: 0.55,
      lowThreshold: 26,
      oilRestore: 24,
      lanternRestore: 12
    },
    treasure: {
      cell: 18,
      radiusSq: 6.25,
      chance: 0.12
    },
    items: {
      score: 10,
      floorChance: 0.045,
      treasureChance: 0.32,
      icons: {
        gem: "\uD83D\uDC8E",
        speed: "\uD83D\uDC62",
        lantern: "\uD83C\uDFEE",
        compass: "\uD83E\uDDED",
        oil: "\u26FD"
      }
    },
    effects: {
      speedDuration: 6,
      compassDuration: 9,
      compassSearchRadius: 30
    },
    movement: {
      normalDuration: 0.16,
      speedDuration: 0.09,
      particleLife: 0.4
    },
    minimap: {
      size: 116,
      range: 22
    },
    colors: {
      void: "#0b0a10",
      wall: [42, 38, 50],
      floor: [70, 58, 44],
      treasure: [120, 98, 46]
    },
    ui: {
      muteIcon: "\uD83D\uDD07",
      soundIcon: "\u266A",
      empty: "\u2014",
      messages: {
        gem: "Found a glimmering gem (+10)",
        speed: "Light boots - your steps quicken",
        lantern: "Lantern oil - the dark recedes",
        oil: "Oil flask - the flame steadies",
        compassFound: "The needle settles on a direction...",
        compassLost: "The compass spins, finding nothing nearby",
        relic: "The ember is yours. Return to camp.",
        extracted: "The chart is sealed. Expedition complete.",
        lost: "The lantern guttered out in the dark."
      }
    }
  };
})();
