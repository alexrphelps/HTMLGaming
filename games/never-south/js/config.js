(function() {
  "use strict";

  const ns = window.NeverSouth || {};

  ns.CONFIG = {
    grid: {
      cols: 9,
      rows: 17,
      startRow: 16,
      startCol: 4
    },
    run: {
      handSize: 5,
      maxHealth: 30,
      startingScrap: 2,
      startingGlow: 1,
      emergencyGlowCost: 1,
      emergencyHealthCost: 4
    },
    tiles: {
      ruleMode: "basic"
    },
    render: {
      bottomPanelRatio: 0.28,
      minBottomPanelHeight: 210,
      maxBottomPanelHeight: 280,
      panelGap: 10,
      panelPadding: 14,
      leftPanelRatio: 0.26,
      centerPanelRatio: 0.48,
      rightPanelRatio: 0.26,
      minTileSize: 42,
      maxTileSize: 68,
      targetVisibleTiles: 13,
      visibilityRadius: 6,
      cardMinWidth: 92,
      cardMaxWidth: 132,
      cardHeight: 116
    }
  };

  ns.TILE_TYPES = {
    SAFE: "safe",
    SCRAP: "scrap",
    GLOW: "glow",
    CRACKED: "cracked",
    GAP: "gap",
    RUBBLE: "rubble",
    FOG: "fog",
    THORNS: "thorns",
    SHOP: "shop",
    SHRINE: "shrine",
    CAMP: "camp"
  };

  ns.TILE_DATA = {
    safe: { name: "Dust Road", passable: true, color: "#5e6154", mark: "" },
    scrap: { name: "Scrap Heap", passable: true, color: "#94876a", mark: "S" },
    glow: { name: "Glow Bloom", passable: true, color: "#4e8d7c", mark: "G" },
    cracked: { name: "Cracked Road", passable: true, color: "#766d5d", mark: "!" },
    gap: { name: "Gap", passable: false, color: "#12191c", mark: "" },
    rubble: { name: "Rubble", passable: true, color: "#6c6964", mark: "R" },
    fog: { name: "Fog", passable: true, color: "#687880", mark: "?" },
    thorns: { name: "Thorns", passable: true, color: "#505b38", mark: "T" },
    shop: { name: "Rust Shop", passable: true, color: "#7d5d45", mark: "$" },
    shrine: { name: "Glow Shrine", passable: true, color: "#536096", mark: "*" },
    camp: { name: "Camp", passable: true, color: "#6f7b5a", mark: "C" }
  };

  ns.CARD_DEFINITIONS = [
    {
      id: "west",
      name: "West Step",
      summary: "Move one tile west.",
      cost: { scrap: 0, glow: 0 },
      offsets: [{ col: -1, row: 0 }],
      traits: ["steady"]
    },
    {
      id: "east",
      name: "East Step",
      summary: "Move one tile east.",
      cost: { scrap: 0, glow: 0 },
      offsets: [{ col: 1, row: 0 }],
      traits: ["steady"]
    },
    {
      id: "north",
      name: "North Step",
      summary: "Move one tile north.",
      cost: { scrap: 0, glow: 0 },
      offsets: [{ col: 0, row: -1 }],
      traits: ["steady"]
    },
    {
      id: "northwest",
      name: "Ash Diagonal",
      summary: "Move north-west carefully.",
      cost: { scrap: 1, glow: 0 },
      offsets: [{ col: -1, row: -1 }],
      traits: ["careful"]
    },
    {
      id: "northeast",
      name: "Rust Diagonal",
      summary: "Move north-east carefully.",
      cost: { scrap: 1, glow: 0 },
      offsets: [{ col: 1, row: -1 }],
      traits: ["careful"]
    },
    {
      id: "long-north",
      name: "Glow Leap",
      summary: "Leap two tiles north and reveal fog.",
      cost: { scrap: 0, glow: 1 },
      offsets: [{ col: 0, row: -2 }],
      traits: ["reveal", "leap"]
    },
    {
      id: "rubble-ram",
      name: "Rubble Ram",
      summary: "Move north and break rubble.",
      cost: { scrap: 1, glow: 0 },
      offsets: [{ col: 0, row: -1 }, { col: -1, row: 0 }, { col: 1, row: 0 }],
      traits: ["clearRubble"]
    },
    {
      id: "mist-step",
      name: "Mist Step",
      summary: "Slip through fog with a long diagonal.",
      cost: { scrap: 0, glow: 2 },
      offsets: [{ col: -2, row: -1 }, { col: 2, row: -1 }, { col: 0, row: -2 }],
      traits: ["passFog", "rare"]
    },
    {
      id: "scavenger",
      name: "Scavenger Pivot",
      summary: "Move sideways or north, then gain Scrap.",
      cost: { scrap: 1, glow: 0 },
      offsets: [{ col: -1, row: 0 }, { col: 1, row: 0 }, { col: 0, row: -1 }],
      traits: ["harvest"]
    }
  ];

  ns.STARTING_DECK = [
    "north",
    "north",
    "west",
    "east",
    "northwest",
    "northeast",
    "rubble-ram",
    "long-north",
    "scavenger"
  ];

  ns.CARDS_BY_ID = ns.CARD_DEFINITIONS.reduce(function(map, card) {
    map[card.id] = card;
    return map;
  }, {});

  window.NeverSouth = ns;
})();
