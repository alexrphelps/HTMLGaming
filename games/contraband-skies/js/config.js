(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  ns.CONFIG = {
    storageKey: "contraband-skies-save-v1",
    seasonTargetDeliveries: 8,
    maxSeasonDay: 42,
    startingMoney: 120,
    startingDebt: 620,
    startingFuel: 72,
    startingHull: 86,
    startingSuspicion: 12,
    settlementCount: 8,
    activeContractCount: 3,
    logLimit: 8,
    map: {
      margin: 80
    }
  };

  ns.SETTLEMENT_TYPES = [
    { id: "freeport", name: "Freeport", tone: "warm lanterns", color: "#f5c66a" },
    { id: "relay", name: "Relay Tower", tone: "signal brass", color: "#69d8ca" },
    { id: "monastery", name: "Monastery Dock", tone: "quiet bells", color: "#c7d7ff" },
    { id: "scrap", name: "Scrap Aerie", tone: "iron wings", color: "#c99465" },
    { id: "black-market", name: "Black Market Mooring", tone: "veiled lamps", color: "#ef7564" }
  ];

  ns.HAZARDS = [
    {
      id: "pressure-bloom",
      name: "Pressure Bloom",
      text: "The clouds swell like lungs and punish rushed engines.",
      color: "#ef7564",
      riskBias: 10,
      fuelBias: 5
    },
    {
      id: "migration-shadow",
      name: "Migration Shadow",
      text: "A colossal shape crosses the sun, making high routes safer but slower.",
      color: "#586b8a",
      riskBias: 6,
      cargoBias: 8
    },
    {
      id: "static-veil",
      name: "Static Veil",
      text: "Compass needles chatter. Quiet engines matter more than speed.",
      color: "#69d8ca",
      suspicionBias: 10,
      hullBias: 3
    },
    {
      id: "hungry-updraft",
      name: "Hungry Updraft",
      text: "The wind eats altitude, fuel, and pride in that order.",
      color: "#92d783",
      fuelBias: 9,
      hullBias: 5
    },
    {
      id: "glass-rain",
      name: "Glass Rain",
      text: "Tiny crystal knives tick across canvas and cargo straps.",
      color: "#c7d7ff",
      cargoBias: 14,
      hullBias: 9
    },
    {
      id: "whisper-current",
      name: "Whisper Current",
      text: "The sky carries rumors faster than aircraft.",
      color: "#d9a64d",
      suspicionBias: 13,
      riskBias: 3
    }
  ];

  ns.CARGO_FAMILIES = [
    {
      id: "contraband",
      name: "Contraband",
      cargoNames: ["sealed court letters", "unlicensed lumen seeds", "black-market altimeters"],
      suspicion: 18,
      fragility: 18,
      urgency: 34,
      payout: 160
    },
    {
      id: "fragile",
      name: "Fragile",
      cargoNames: ["glass harmonics", "sleeping moth orchids", "saint-bone instruments"],
      suspicion: 6,
      fragility: 58,
      urgency: 22,
      payout: 125
    },
    {
      id: "urgent",
      name: "Urgent",
      cargoNames: ["fever medicine", "storm court summons", "relay ignition coils"],
      suspicion: 9,
      fragility: 25,
      urgency: 62,
      payout: 145
    }
  ];

  ns.UPGRADES = [
    {
      id: "larger-fuel-bladder",
      name: "Larger Fuel Bladder",
      cost: 180,
      text: "Adds 20 fuel capacity and makes long routes less desperate."
    },
    {
      id: "insulated-hold",
      name: "Insulated Hold",
      cost: 160,
      text: "Reduces cargo damage on fragile and storm-touched routes."
    },
    {
      id: "quiet-engine",
      name: "Quiet Engine",
      cost: 210,
      text: "Reduces suspicion when flying contraband through watched skies."
    },
    {
      id: "reinforced-keel",
      name: "Reinforced Keel",
      cost: 190,
      text: "Reduces hull stress from glass rain, blooms, and hard descents."
    }
  ];

  ns.INHERITED_PERKS = [
    { id: "weatherwise", name: "Weatherwise", text: "Start future seasons with lower route event risk." },
    { id: "trusted-fences", name: "Trusted Fences", text: "Contraband contracts pay a little more." },
    { id: "spare-rivets", name: "Spare Rivets", text: "Start future seasons with a stronger hull." }
  ];

  ns.VIGNETTES = [
    "The cargo hums when the barometer drops.",
    "A dockhand refuses to say who paid for the sealed crate.",
    "Cloud bells ring under the hull long after the route ends.",
    "Your forged papers smell faintly of lamp oil and panic.",
    "A town clerk counts your coins twice and your shadows three times."
  ];
})(typeof window !== "undefined" ? window : globalThis);
