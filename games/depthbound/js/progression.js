(function(D) {
  with (D) {
  const TALENTS = [
    { branch: "Gunner", name: "Trigger Choir", desc: "+18% fire rate.", apply: () => multStat("fireRate", 1.18) },
    { branch: "Gunner", name: "Heavy Glyph Rounds", desc: "+22% bullet damage, slightly larger bullets.", apply: () => { multStat("damage", 1.22); multStat("bulletSize", 1.08); } },
    { branch: "Gunner", name: "Needle Doctrine", desc: "Bullets pierce one additional enemy.", apply: () => game.player.stats.pierce++ },
    { branch: "Gunner", name: "Critical Anatomy", desc: "+8% crit chance and +25% crit damage.", apply: () => { game.player.stats.crit += .08; game.player.stats.critDamage += .25; } },
    { branch: "Gunner", name: "Ricochet Psalms", desc: "Bullets bounce off one wall.", apply: () => game.player.stats.ricochet++ },
    { branch: "Gunner", name: "Shotgun Hex", desc: "+1 projectile and wider spread.", apply: () => { game.player.stats.projectiles++; game.player.stats.spread += .12; } },
    { branch: "Gunner", name: "Backwards Ghost Shot", desc: "Every shot also fires a weaker bullet behind you.", apply: () => game.player.stats.backShot = true },
    { branch: "Gunner", name: "Wall-Split Rounds", desc: "First wall impact can split a bullet into two side shots.", apply: () => game.player.stats.wallSplit = true },
    { branch: "Gunner", name: "Warhead Lottery", desc: "Shots gain a chance to explode on hit.", apply: () => game.player.stats.explosive += .16 },
    { branch: "Gunner", name: "Magnetic Barrel", desc: "Bullets softly home toward nearby enemies.", apply: () => game.player.stats.homing += .35 },

    { branch: "Phantom", name: "Fleet Bone", desc: "+14% movement speed.", apply: () => multStat("moveSpeed", 1.14) },
    { branch: "Phantom", name: "Second Breath", desc: "+1 dash charge.", apply: () => game.player.dashCharges++ },
    { branch: "Phantom", name: "Afterimage Cut", desc: "Dashing damages enemies you pass through.", apply: () => game.player.stats.dashDamage += 1.25 },
    { branch: "Phantom", name: "Reload Step", desc: "Dashing instantly primes your next shot.", apply: () => game.player.stats.dashReload = true },
    { branch: "Phantom", name: "Longer Ghost", desc: "Dash invulnerability lasts longer.", apply: () => game.player.stats.dashIFrames += .10 },
    { branch: "Phantom", name: "Near-Miss Witchcraft", desc: "Enemy bullets narrowly missing you create a brief slow field.", apply: () => game.player.stats.nearMissSlow = true },
    { branch: "Phantom", name: "Grave Magnet", desc: "XP, coins, and hearts fly to you from farther away.", apply: () => game.player.stats.magnet += 120 },
    { branch: "Phantom", name: "Blink Sigil", desc: "Unlock E: Blink teleport through danger.", apply: () => game.player.abilities.e = "Blink" },

    { branch: "Occult", name: "Blood Price", desc: "Lose 1 max HP. Gain +42% damage.", apply: () => { game.player.maxHp = Math.max(1, game.player.maxHp - 1); game.player.hp = Math.min(game.player.hp, game.player.maxHp); multStat("damage", 1.42); } },
    { branch: "Occult", name: "Vampire Arithmetic", desc: "Small chance to heal after kills.", apply: () => game.player.stats.vampire += .07 },
    { branch: "Occult", name: "Thorn Halo", desc: "Taking damage releases a shockwave.", apply: () => game.player.stats.thorns += 1 },
    { branch: "Occult", name: "Curse Broker", desc: "Cursed bargains are stronger and boss relic chance increases.", apply: () => { game.player.stats.cursePower += .25; game.player.stats.bossRelicBonus += .18; } },
    { branch: "Occult", name: "Glass Crown", desc: "Half max HP, but massive damage and crit gains.", apply: () => { game.player.stats.glass = true; game.player.maxHp = Math.max(1, Math.ceil(game.player.maxHp / 2)); game.player.hp = Math.min(game.player.hp, game.player.maxHp); multStat("damage", 1.85); game.player.stats.crit += .12; } },
    { branch: "Occult", name: "Black Hole Ritual", desc: "Unlock E: Black Hole. Pull and crush enemies.", apply: () => game.player.abilities.e = "Black Hole" },
    { branch: "Occult", name: "Shadow Twin", desc: "Every 12 kills briefly summons a shadow shooter.", apply: () => { game.player.stats.drones++; notify("A shadow twin begins orbiting you.", "#c084fc"); } },

    { branch: "Engineer", name: "Pocket Turret", desc: "Start combat rooms with one deployed turret.", apply: () => { game.player.stats.turrets++; deployRoomTech(); } },
    { branch: "Engineer", name: "Drone License", desc: "Gain an orbiting drone that shoots nearby enemies.", apply: () => { game.player.stats.drones++; rebuildDrones(); } },
    { branch: "Engineer", name: "Serrated Orbitals", desc: "Gain an orbiting blade that damages enemies on contact.", apply: () => game.player.stats.orbitals++ },
    { branch: "Engineer", name: "Mine Trail", desc: "Dashing drops unstable mines.", apply: () => game.player.stats.mines = true },
    { branch: "Engineer", name: "Better Springs", desc: "+20% bullet speed and +10% fire rate.", apply: () => { multStat("bulletSpeed", 1.20); multStat("fireRate", 1.10); } },
    { branch: "Engineer", name: "Shared Ammunition", desc: "Turrets and drones inherit more bullet effects.", apply: () => { multStat("damage", 1.10); game.player.stats.lightning += .05; } },
    { branch: "Engineer", name: "Grenadier Keybind", desc: "Upgrade Q into a stronger grenade with faster cooldown.", apply: () => game.player.abilities.q = "Cluster Grenade" },

    { branch: "Alchemist", name: "Kindling Lead", desc: "Shots can burn enemies.", apply: () => game.player.stats.burn += .24 },
    { branch: "Alchemist", name: "Venom Ink", desc: "Shots can poison enemies over time.", apply: () => game.player.stats.poison += .24 },
    { branch: "Alchemist", name: "Cold Geometry", desc: "Shots can slow and freeze enemies.", apply: () => game.player.stats.freeze += .20 },
    { branch: "Alchemist", name: "Lightning Solvent", desc: "Shots can chain lightning to nearby enemies.", apply: () => game.player.stats.lightning += .18 },
    { branch: "Alchemist", name: "Reaction Engine", desc: "Elemental effects combine into bonus bursts.", apply: () => game.player.stats.elementalReaction = true },
    { branch: "Alchemist", name: "Bigger Bottles", desc: "+1 max HP and stronger status damage.", apply: () => { game.player.maxHp++; game.player.hp++; game.player.stats.burn += .05; game.player.stats.poison += .05; } },
    { branch: "Alchemist", name: "Ice Nova", desc: "Unlock E: Ice Nova. Freeze enemies around you.", apply: () => game.player.abilities.e = "Ice Nova" },
  ];

  function multStat(stat, amount) { game.player.stats[stat] *= amount; }

  const RELICS = [
    { name: "Rat King's Tooth", desc: "Kills sometimes spawn friendly rats as temporary drones.", apply: () => { game.player.stats.drones++; rebuildDrones(); } },
    { name: "Broken Compass", desc: "Adjacent room types are revealed with stronger certainty on the minimap.", apply: () => notify("The minimap sharpens around you.", "#7df9ff") },
    { name: "Bullet Halo", desc: "Gain two orbiting blades.", apply: () => game.player.stats.orbitals += 2 },
    { name: "Hungry Coin", desc: "Coins magnetize strongly and deal tiny damage while flying.", apply: () => { game.player.stats.magnet += 180; game.player.stats.coinGain *= 1.2; } },
    { name: "Lantern Heart", desc: "Heal after each boss and each rest room heals more.", apply: () => { game.player.stats.healingOnClear += 0.35; game.player.stats.restBoost += 1; } },
    { name: "Cursed Dice", desc: "Rewards become swingier, with higher rare odds.", apply: () => { game.player.stats.chestLuck += .22; game.player.stats.cursePower += .12; } },
    { name: "Ammunition Saint", desc: "+1 projectile, -8% fire rate.", apply: () => { game.player.stats.projectiles++; game.player.stats.fireRate *= .92; } },
    { name: "Owl-Shaped Gear", desc: "Turrets shoot faster and you gain one turret.", apply: () => { game.player.stats.turrets++; game.player.stats.fireRate *= 1.08; deployRoomTech(); } },
    { name: "Red Receipt", desc: "Shop prices are lower. Bosses drop extra coins.", apply: () => { game.player.stats.shopDiscount += .18; game.player.stats.coinGain *= 1.18; } },
    { name: "Mirror Bullet", desc: "Ricochet and wall-split effects improve.", apply: () => { game.player.stats.ricochet++; game.player.stats.wallSplit = true; } },
    { name: "Witch Battery", desc: "Q and E cooldowns recover faster.", apply: () => { game.player.qCd = 0; game.player.eCd = 0; game.player.stats.lightning += .08; } },
    { name: "Soft Crown", desc: "+2 max HP, but enemies become slightly faster.", apply: () => { game.player.maxHp += 2; game.player.hp += 2; addCurse("Restless Halls", "Enemies move 7% faster.", p => p.enemySpeed = (p.enemySpeed || 1) * 1.07); } },
  ];

  function addRelic(relic) {
    if (!relic) return;
    game.player.relics.push(relic.name);
    game.statistics.relics++;
    relic.apply();
    notify(`Relic: ${relic.name}`, "#ffd166", 3.2);
    tone(520, .08, "triangle", .04);
    tone(780, .12, "triangle", .025);
  }

  function addCurse(name, desc, apply) {
    game.player.curses.push({ name, desc });
    if (apply) apply(game.player);
    notify(`Curse: ${name}`, "#c084fc", 3.2);
  }

  const CURSE_BARGAINS = [
    {
      name: "Bosses Bleed Treasure",
      desc: "Gain +35% boss relic chance. Curse: bosses have +25% HP.",
      apply: () => { game.player.stats.bossRelicBonus += .35 + game.player.stats.cursePower; addCurse("Titan Doors", "Bosses have more HP.", p => p.bossHpMult = (p.bossHpMult || 1) * 1.25); }
    },
    {
      name: "Three Dark Lessons",
      desc: "Immediately choose two talents. Curse: lose 1 max HP.",
      apply: () => { game.player.maxHp = Math.max(1, game.player.maxHp - 1); game.player.hp = Math.min(game.player.hp, game.player.maxHp); offerTalents(2, "Cursed Lessons"); addCurse("Shorter Candle", "Reduced max HP."); }
    },
    {
      name: "Hungry Trigger",
      desc: "+35% fire rate. Curse: healing pickups are rarer.",
      apply: () => { game.player.stats.fireRate *= 1.35 + game.player.stats.cursePower * .25; addCurse("Dry Blood", "Fewer hearts drop.", p => p.heartDropMult = (p.heartDropMult || 1) * .55); }
    },
    {
      name: "Gold Fever",
      desc: "+75 coins. Curse: shops cost more unless you have discounts.",
      apply: () => { game.player.coins += 75; addCurse("Merchant's Grin", "Shop prices rise.", p => p.shopTax = (p.shopTax || 1) * 1.22); }
    },
    {
      name: "Explosive Theology",
      desc: "Bullets explode more often. Curse: explosions can nick you.",
      apply: () => { game.player.stats.explosive += .28 + game.player.stats.cursePower * .18; addCurse("Unstable Doctrine", "Your explosions are dangerous if too close.", p => p.selfExplosion = true); }
    },
    {
      name: "Open the Teeth",
      desc: "Gain 2 keys and +20% damage. Curse: more bombers spawn.",
      apply: () => { game.player.keys += 2; game.player.stats.damage *= 1.20 + game.player.stats.cursePower * .12; addCurse("Bomber Debt", "Bomber enemies appear more often.", p => p.moreBombers = true); }
    },
  ];

  function offerTalents(count = 1, title = "Level Up") {
    const p = game.player;
    const options = randomTalents(3).map(t => ({
      branch: t.branch,
      name: t.name,
      desc: t.desc,
      apply: () => {
        p.branch[t.branch]++;
        p.talents.push(t.name);
        game.statistics.talents++;
        t.apply();
        notify(`${t.branch}: ${t.name}`, branchColor(t.branch), 3);
        tone(420, .07, "triangle", .035);
        if (count > 1) setTimeout(() => offerTalents(count - 1, title), 0);
      }
    }));
    showChoices(title, "Choose one path. Talents are run-based and stack into branch identity.", options);
  }

  function branchColor(branch) {
    return { Gunner: "#ffd166", Phantom: "#7df9ff", Occult: "#c084fc", Engineer: "#ff9f1c", Alchemist: "#63ff9d" }[branch] || "#ffffff";
  }

  function randomTalents(n) {
    const pool = TALENTS.slice();
    const result = [];
    const bias = game.personality.bias;
    while (result.length < n && pool.length) {
      const weights = pool.map(t => 1 + (t.branch === bias ? 0.9 : 0) + game.player.branch[t.branch] * 0.08);
      const idx = weightedIndex(game.rng, weights);
      result.push(pool.splice(idx, 1)[0]);
    }
    return result;
  }

  function weightedIndex(rng, weights) {
    const sum = weights.reduce((a, b) => a + b, 0);
    let roll = rng() * sum;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return weights.length - 1;
  }

  function interactWith(obj) {
    if (obj.used && obj.type !== "lore" && obj.type !== "gate") return;
    if (obj.type === "gate") {
      const k = roomKey(1, 0);
      if (!game.rooms.has(k)) makeRoom(1, 0, "combat");
      notify("The gate throws you into the first fight.", "#63ff9d", 2.4);
      enterRoom(1, 0, "W");
      return;
    }
    if (obj.type === "lore") {
      showCodex();
      return;
    }
    if (obj.type === "chest") {
      if (obj.locked && game.player.keys <= 0) {
        notify("Locked chest requires a key.", "#ffd166");
        return;
      }
      if (obj.locked) game.player.keys--;
      obj.used = true;
      const rare = obj.rarity === "rare" || game.rng() < 0.25 + game.player.stats.chestLuck;
      openChest(rare);
    } else if (obj.type === "shrine") {
      obj.used = true;
      offerTalents(1, "Talent Shrine");
    } else if (obj.type === "shop") {
      showShop(obj);
    } else if (obj.type === "curse") {
      obj.used = true;
      showCurseBargain();
    } else if (obj.type === "forge") {
      showForge(obj);
    } else if (obj.type === "rest") {
      showRest(obj);
    } else if (obj.type === "secret") {
      obj.used = true;
      game.statistics.secrets++;
      showChoices("Secret Vault", "The vault contains impossible loot. Choose one.", [
        { branch: "Vault", name: "Ancient Relic", desc: "Gain a random relic.", apply: () => addRelic(pick(game.rng, RELICS)) },
        { branch: "Vault", name: "Forbidden Lesson", desc: "Choose two talents and accept a random curse.", apply: () => { offerTalents(2, "Forbidden Vault Lessons"); addCurse("Vault Echo", "A random old debt follows you."); } },
        { branch: "Vault", name: "Keys and Gold", desc: "+3 keys and +90 coins.", apply: () => { game.player.keys += 3; game.player.coins += 90; } },
      ]);
    }
  }

  function openChest(rare = false) {
    const p = game.player;
    const rolls = rare ? 2 : 1;
    for (let i = 0; i < rolls; i++) {
      const r = game.rng();
      if (r < .38 || rare) addRelic(pick(game.rng, RELICS));
      else if (r < .63) offerTalents(1, "Chest Talent");
      else if (r < .83) { p.coins += Math.floor((35 + game.depth * 2) * p.stats.coinGain); notify("A pile of coins spills out.", "#ffd166"); }
      else { p.keys += 1 + Math.floor(game.rng() * 2); notify("Keys clatter from the chest.", "#ffd166"); }
    }
    spawnPickupBurst(ROOM_W / 2, ROOM_H / 2, rare ? 18 : 9, "coin");
    tone(680, .08, "square", .025);
  }

  function showShop(obj) {
    const p = game.player;
    const tax = p.shopTax || 1;
    const discount = 1 - clamp(p.stats.shopDiscount, 0, .65);
    const price = base => Math.ceil(base * tax * discount);
    const relic = pick(game.rng, RELICS);
    const options = [
      { branch: `${price(45)} coins`, name: `Buy Relic: ${relic.name}`, desc: relic.desc, apply: () => buy(price(45), () => addRelic(relic)) },
      { branch: `${price(30)} coins`, name: "Buy Talent Lesson", desc: "Choose one of three talents.", apply: () => buy(price(30), () => offerTalents(1, "Purchased Lesson")) },
      { branch: `${price(18)} coins`, name: "Buy Heart", desc: "Restore 2 HP.", apply: () => buy(price(18), () => { p.hp = Math.min(p.maxHp, p.hp + 2); notify("Healed.", "#63ff9d"); }) },
      { branch: `${price(20)} coins`, name: "Buy Key", desc: "Gain one key.", apply: () => buy(price(20), () => { p.keys++; notify("Bought a key.", "#ffd166"); }) },
      { branch: `${price(25)} coins`, name: "Reroll Fate", desc: "Remove one random curse if you have any. Otherwise gain coins back.", apply: () => buy(price(25), () => { if (p.curses.length) { const c = p.curses.splice(Math.floor(game.rng()*p.curses.length),1)[0]; notify(`Removed curse: ${c.name}`, "#7df9ff"); } else { p.coins += 15; notify("No curses. Merchant refunds some coins.", "#ffd166"); } }) },
    ];
    showChoices("Dungeon Shop", "Spend coins. Shop prices respond to relics, curses, and dungeon personality.", options, true);
  }

  function buy(cost, fn) {
    if (game.player.coins < cost) {
      notify("Not enough coins.", "#ff5577");
      return;
    }
    game.player.coins -= cost;
    fn();
    tone(450, .06, "triangle", .025);
  }

  function showCurseBargain() {
    const opts = sample(CURSE_BARGAINS, 3).map(b => ({ branch: "Cursed Bargain", name: b.name, desc: b.desc, apply: b.apply }));
    showChoices("Cursed Bargain", "Accept a powerful reward with a lasting consequence, or leave it untouched.", opts, true);
  }

  function showForge(obj) {
    const p = game.player;
    const options = [
      { branch: "Forge", name: "Sharpen Barrel", desc: "Pay 35 coins: +25% damage.", apply: () => buy(35, () => multStat("damage", 1.25)) },
      { branch: "Forge", name: "Oil the Trigger", desc: "Pay 35 coins: +20% fire rate.", apply: () => buy(35, () => multStat("fireRate", 1.20)) },
      { branch: "Forge", name: "Key Tempering", desc: "Pay 1 key: bullets gain pierce and ricochet.", apply: () => { if (p.keys < 1) notify("Need a key.", "#ff5577"); else { p.keys--; p.stats.pierce++; p.stats.ricochet++; notify("Weapon tempered.", "#ff9f1c"); } } },
      { branch: "Forge", name: "Overclock Abilities", desc: "Pay 45 coins: Q/E cooldowns improve and gain lightning chance.", apply: () => buy(45, () => { p.stats.lightning += .08; p.qCd = 0; p.eCd = 0; }) },
    ];
    showChoices("Forge Room", "Improve your weapons and devices.", options, true);
  }

  function showRest(obj) {
    const p = game.player;
    const options = [
      { branch: "Rest", name: "Drink From the Well", desc: `Heal ${3 + p.stats.restBoost} HP.`, apply: () => { obj.used = true; p.hp = Math.min(p.maxHp, p.hp + 3 + p.stats.restBoost); notify("The well remembers your shape.", "#8bd3ff"); } },
      { branch: "Sacrifice", name: "Trade Blood for Lesson", desc: "Lose 1 max HP and choose a talent.", apply: () => { obj.used = true; p.maxHp = Math.max(1, p.maxHp - 1); p.hp = Math.min(p.hp, p.maxHp); offerTalents(1, "Blood Lesson"); } },
      { branch: "Rest", name: "Meditate", desc: "Gain +10% XP and coin gain for the rest of the run.", apply: () => { obj.used = true; p.stats.xpGain *= 1.1; p.stats.coinGain *= 1.1; notify("Meditation becomes greed.", "#63ff9d"); } },
    ];
    showChoices("Rest Room", "Recover, sacrifice, or prepare for deeper rooms.", options, true);
  }

  function sample(arr, n) {
    const copy = arr.slice();
    const out = [];
    while (copy.length && out.length < n) out.push(copy.splice(Math.floor(game.rng() * copy.length), 1)[0]);
    return out;
  }

    Object.assign(D, {
      multStat,
      addRelic,
      addCurse,
      offerTalents,
      branchColor,
      randomTalents,
      weightedIndex,
      interactWith,
      openChest,
      showShop,
      buy,
      showCurseBargain,
      showForge,
      showRest,
      sample,
      TALENTS,
      RELICS,
      CURSE_BARGAINS
    });
  }
})(window.Depthbound = window.Depthbound || {});
