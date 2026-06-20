(function(D) {
  with (D) {
  const ROOM_W = 1040;
  const ROOM_H = 680;
  const TILE = 40;
  const PLAYER_R = 14;
  const ROOM_COLS = Math.floor(ROOM_W / TILE);
  const ROOM_ROWS = Math.floor(ROOM_H / TILE);
  const DIRS = [
    { name: "N", dx: 0, dy: -1, ox: 0, oy: -1 },
    { name: "E", dx: 1, dy: 0, ox: 1, oy: 0 },
    { name: "S", dx: 0, dy: 1, ox: 0, oy: 1 },
    { name: "W", dx: -1, dy: 0, ox: -1, oy: 0 },
  ];
  const OPP = { N: "S", S: "N", E: "W", W: "E" };
  const TAU = Math.PI * 2;

  const PERSONALITIES = [
    {
      id: "hungry", name: "The Hungry Dungeon", color: "#ff5577",
      desc: "More enemies, more heart drops, bosses summon extra minions.",
      enemyMult: 1.25, rewardMult: 1.05, hazard: "teeth", bias: "Occult"
    },
    {
      id: "clockwork", name: "The Clockwork Dungeon", color: "#7df9ff",
      desc: "Traps and turret skulls are common. Engineer rewards appear more often.",
      enemyMult: 1.05, rewardMult: 1.0, hazard: "gear", bias: "Engineer"
    },
    {
      id: "fungal", name: "The Fungal Dungeon", color: "#63ff9d",
      desc: "Poison pods and spore hazards appear. Alchemy thrives here.",
      enemyMult: 1.08, rewardMult: 1.08, hazard: "spores", bias: "Alchemist"
    },
    {
      id: "mirror", name: "The Mirror Dungeon", color: "#c084fc",
      desc: "More wraiths, clone tricks, and ricochets. Phantom talents are favored.",
      enemyMult: 1.12, rewardMult: 1.04, hazard: "mirror", bias: "Phantom"
    },
    {
      id: "royal", name: "The Royal Dungeon", color: "#ffd166",
      desc: "More elites, better treasure, expensive shops, tougher bosses.",
      enemyMult: 1.15, rewardMult: 1.2, hazard: "banner", bias: "Gunner"
    },
    {
      id: "abyssal", name: "The Abyssal Dungeon", color: "#9a7bff",
      desc: "High danger, higher relic chance, curses offer stronger payouts.",
      enemyMult: 1.22, rewardMult: 1.18, hazard: "void", bias: "Occult"
    },
  ];

    Object.assign(D, {
      ROOM_W,
      ROOM_H,
      TILE,
      PLAYER_R,
      ROOM_COLS,
      ROOM_ROWS,
      DIRS,
      OPP,
      TAU,
      PERSONALITIES
    });
  }
})(window.Depthbound = window.Depthbound || {});
