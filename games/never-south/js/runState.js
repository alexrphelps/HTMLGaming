(function() {
  "use strict";

  const ns = window.NeverSouth || {};
  const TILE = ns.TILE_TYPES;

  function copyPosition(position) {
    return { col: position.col, row: position.row };
  }

  class NeverSouthRun {
    constructor(seed) {
      this.seed = seed || ("run-" + Date.now());
      this.rng = ns.createRng(this.seed);
      this.status = "title";
      this.message = "Choose a card. Never move south.";
      this.log = [];
      this.selectedCardIndex = 0;
      this.selectedTargetIndex = 0;
      this.pendingActions = [];
      this.previewMode = null;
      this.startNewRun(this.seed);
      this.status = "title";
    }

    startNewRun(seed) {
      this.seed = seed || this.seed;
      this.rng = ns.createRng(this.seed);
      this.world = ns.generateZone(this.seed + ":world");
      this.deck = new ns.Deck(ns.STARTING_DECK, ns.createRng(this.seed + ":deck"), ns.CONFIG.run.handSize);
      this.player = {
        col: ns.CONFIG.grid.startCol,
        row: ns.CONFIG.grid.startRow,
        health: ns.CONFIG.run.maxHealth,
        scrap: ns.CONFIG.run.startingScrap,
        glow: ns.CONFIG.run.startingGlow
      };
      this.status = "playing";
      this.message = "A broken road points north.";
      this.log = ["Run seeded: " + this.seed];
      this.selectedCardIndex = 0;
      this.selectedTargetIndex = 0;
      this.pendingActions = [];
      ns.ensureNonSouthPath(this.world, this.player);
      this.revealAround(this.player.col, this.player.row, ns.CONFIG.render.visibilityRadius);
      this.updateEnemyIntent();
      this.checkSoftLock();
      return this;
    }

    addLog(text) {
      this.log.unshift(text);
      this.log = this.log.slice(0, 7);
      this.message = text;
    }

    get resources() {
      return { scrap: this.player.scrap, glow: this.player.glow };
    }

    getSelectedCard() {
      if (this.deck.hand.length === 0) return null;
      const index = Math.max(0, Math.min(this.selectedCardIndex, this.deck.hand.length - 1));
      this.selectedCardIndex = index;
      return this.deck.hand[index];
    }

    selectCard(index) {
      if (this.status !== "playing" || this.pendingActions.length > 0) return;
      const count = this.deck.hand.length;
      if (count === 0) return;
      this.selectedCardIndex = (index + count) % count;
      this.selectedTargetIndex = 0;
    }

    cycleCard(direction) {
      this.selectCard(this.selectedCardIndex + direction);
    }

    getValidTargets(card) {
      const selected = card || this.getSelectedCard();
      if (!selected) return [];

      return selected.offsets
        .map((offset) => ({
          col: this.player.col + offset.col,
          row: this.player.row + offset.row,
          offset
        }))
        .filter((target) => this.isValidMove(selected, target));
    }

    isValidMove(card, target) {
      if (!card || !target) return false;
      const rowDelta = target.row - this.player.row;
      if (rowDelta > 0) return false;
      if (!ns.inBounds(target.col, target.row)) return false;

      const matchesPattern = card.offsets.some((offset) => {
        return this.player.col + offset.col === target.col && this.player.row + offset.row === target.row;
      });
      if (!matchesPattern) return false;

      const tile = ns.getTile(this.world, target.col, target.row);
      if (!tile || tile.type === TILE.GAP) return false;
      if (tile.type === TILE.RUBBLE && !card.traits.includes("clearRubble")) return false;
      if (tile.type === TILE.FOG && !card.traits.includes("reveal") && !card.traits.includes("passFog")) return false;

      const enemy = this.getEnemyAt(target.col, target.row);
      if (enemy) return false;

      return ns.canAffordCard(card, this.player);
    }

    canUseEmergencyMove() {
      return this.player.glow >= ns.CONFIG.run.emergencyGlowCost ||
        this.player.health > ns.CONFIG.run.emergencyHealthCost;
    }

    useEmergencyMove() {
      if (this.status !== "playing" || this.pendingActions.length > 0) return false;
      if (!this.canUseEmergencyMove()) return false;

      const target = [
        { col: this.player.col, row: this.player.row - 1 },
        { col: this.player.col - 1, row: this.player.row - 1 },
        { col: this.player.col + 1, row: this.player.row - 1 }
      ].find((candidate) => {
        const tile = ns.getTile(this.world, candidate.col, candidate.row);
        return tile && tile.type !== TILE.GAP;
      });

      if (!target) return false;
      if (this.player.glow >= ns.CONFIG.run.emergencyGlowCost) {
        this.player.glow -= ns.CONFIG.run.emergencyGlowCost;
        this.addLog("Emergency flare burns 1 Glow.");
      } else {
        this.player.health -= ns.CONFIG.run.emergencyHealthCost;
        this.addLog("Emergency climb costs " + ns.CONFIG.run.emergencyHealthCost + " health.");
      }

      this.movePlayer(target, { traits: ["reveal"], name: "Emergency Climb" });
      this.afterLanding();
      return true;
    }

    playSelectedTo(target) {
      if (this.status !== "playing" || this.pendingActions.length > 0) return { ok: false, reason: "Choose a tile action first." };
      const card = this.getSelectedCard();
      if (!this.isValidMove(card, target)) return { ok: false, reason: "That card cannot reach there." };

      const result = this.deck.play(card.instanceId, this.player);
      if (!result.ok) {
        this.addLog(result.reason);
        return result;
      }

      this.movePlayer(target, result.card);
      if (result.card.traits.includes("harvest")) {
        this.player.scrap += 1;
        this.addLog(result.card.name + " shakes loose 1 Scrap.");
      } else {
        this.addLog("Played " + result.card.name + ".");
      }
      this.afterLanding();
      return { ok: true };
    }

    movePlayer(target, card) {
      const previous = ns.getTile(this.world, this.player.col, this.player.row);
      if (previous && previous.type === TILE.CRACKED && !card.traits.includes("careful")) {
        previous.type = TILE.GAP;
        previous.broken = true;
      }

      this.player.col = target.col;
      this.player.row = target.row;
      ns.ensureNonSouthPath(this.world, this.player);
      const revealRadius = ns.CONFIG.render.visibilityRadius + (card.traits.includes("reveal") ? 2 : 0);
      this.revealAround(target.col, target.row, revealRadius);

      const tile = ns.getTile(this.world, target.col, target.row);
      if (tile) tile.visited = true;
      if (tile && tile.type === TILE.RUBBLE && card.traits.includes("clearRubble")) {
        tile.type = TILE.SAFE;
        this.player.scrap += 1;
      }
    }

    afterLanding() {
      this.resolveLandingTile();
      if (this.pendingActions.length === 0 && this.status === "playing") {
        this.enemyTurn();
      }
      this.checkEndState();
    }

    resolveLandingTile() {
      const tile = ns.getTile(this.world, this.player.col, this.player.row);
      if (!tile) return;

      if (tile.type === TILE.SCRAP && !tile.collected) {
        this.player.scrap += 1;
        tile.collected = true;
        this.addLog("Collected 1 Scrap.");
      } else if (tile.type === TILE.GLOW && !tile.collected) {
        this.player.glow += 1;
        tile.collected = true;
        this.addLog("Gathered 1 Glow.");
      } else if (tile.type === TILE.THORNS) {
        this.player.health -= 3;
        this.addLog("Thorns bite for 3 health.");
      } else if (tile.type === TILE.CRACKED) {
        this.addLog("The road cracks underfoot.");
      }

      this.pendingActions = this.getTileActions(tile);
    }

    getTileActions(tile) {
      const current = tile || ns.getTile(this.world, this.player.col, this.player.row);
      if (!current) return [];

      if (current.type === TILE.SHOP) {
        return [
          { id: "buy-card", label: "Buy Card", detail: "Spend 2 Scrap for a new movement card." },
          { id: "repair", label: "Repair", detail: "Spend 1 Scrap to heal 6." },
          { id: "draw", label: "Draw", detail: "Draw 1 card before moving on." }
        ];
      }

      if (current.type === TILE.SHRINE) {
        return [
          { id: "bless-card", label: "Bless Card", detail: "Spend 1 Glow to add return to your leftmost card." },
          { id: "reveal", label: "Reveal", detail: "Spend 1 Glow to reveal nearby fog." },
          { id: "heal-glow", label: "Cleansing Glow", detail: "Spend 1 Glow to heal 5." }
        ];
      }

      if (current.type === TILE.CAMP) {
        return [
          { id: "camp-draw", label: "Draw", detail: "Draw 2 cards." },
          { id: "camp-shuffle", label: "Shuffle", detail: "Shuffle discard into deck." },
          { id: "camp-heal", label: "Rest", detail: "Heal 4." }
        ];
      }

      if (current.type === TILE.RUBBLE) {
        return [
          { id: "clear-rubble", label: "Clear Rubble", detail: "Spend 1 Scrap to clear this tile." },
          { id: "leave-rubble", label: "Move On", detail: "Leave the rubble intact." }
        ];
      }

      return [];
    }

    applyAction(actionId) {
      if (this.status !== "playing") return false;
      const action = this.pendingActions.find((candidate) => candidate.id === actionId);
      if (!action) return false;

      if (actionId === "buy-card") {
        if (this.player.scrap >= 2) {
          this.player.scrap -= 2;
          const reward = this.rng.pick(["mist-step", "scavenger", "rubble-ram", "long-north"]);
          this.deck.discardPile.push(this.deck.createCard(reward));
          this.addLog("Bought " + ns.CARDS_BY_ID[reward].name + ".");
        } else {
          this.addLog("Not enough Scrap.");
          return false;
        }
      } else if (actionId === "repair") {
        if (this.player.scrap < 1) return this.failAction("Need 1 Scrap.");
        this.player.scrap -= 1;
        this.heal(6);
        this.addLog("Repairs restore 6 health.");
      } else if (actionId === "draw") {
        this.deck.draw(1);
        this.addLog("Drew 1 card.");
      } else if (actionId === "bless-card") {
        if (this.player.glow < 1) return this.failAction("Need 1 Glow.");
        this.player.glow -= 1;
        const card = this.deck.hand[0];
        if (card && !card.traits.includes("return")) card.traits.push("return");
        this.addLog(card ? card.name + " may return after use." : "The shrine hums unanswered.");
      } else if (actionId === "reveal") {
        if (this.player.glow < 1) return this.failAction("Need 1 Glow.");
        this.player.glow -= 1;
        this.revealAround(this.player.col, this.player.row, ns.CONFIG.render.visibilityRadius + 2);
        this.addLog("Fog thins around the shrine.");
      } else if (actionId === "heal-glow") {
        if (this.player.glow < 1) return this.failAction("Need 1 Glow.");
        this.player.glow -= 1;
        this.heal(5);
        this.addLog("Glow closes old wounds.");
      } else if (actionId === "camp-draw") {
        this.deck.draw(2);
        this.addLog("Camp supplies add 2 cards.");
      } else if (actionId === "camp-shuffle") {
        const shuffled = this.deck.shuffleDiscardIntoDeck();
        this.addLog(shuffled ? "Discard shuffled into deck." : "Discard pile is empty.");
      } else if (actionId === "camp-heal") {
        this.heal(4);
        this.addLog("A quiet rest heals 4.");
      } else if (actionId === "clear-rubble") {
        if (this.player.scrap < 1) return this.failAction("Need 1 Scrap.");
        this.player.scrap -= 1;
        ns.setTile(this.world, this.player.col, this.player.row, ns.makeTile(TILE.SAFE, { visited: true }));
        this.addLog("Rubble cleared.");
      } else if (actionId === "leave-rubble") {
        this.addLog("You leave the rubble untouched.");
      }

      if (this.status === "playing") {
        this.pendingActions = [];
        this.enemyTurn();
        this.checkEndState();
      }
      return true;
    }

    failAction(message) {
      this.addLog(message);
      return false;
    }

    heal(amount) {
      this.player.health = Math.min(ns.CONFIG.run.maxHealth, this.player.health + amount);
    }

    revealAround(col, row, radius) {
      for (let r = row - radius; r <= row + radius; r++) {
        for (let c = col - radius; c <= col + radius; c++) {
          const tile = ns.getTile(this.world, c, r);
          if (tile) tile.revealed = true;
        }
      }
    }

    getEnemyAt(col, row) {
      return this.world.enemies.find((enemy) => enemy.hp > 0 && enemy.col === col && enemy.row === row);
    }

    updateEnemyIntent() {
      this.world.enemies.forEach((enemy) => {
        if (enemy.hp <= 0) {
          enemy.intent = null;
          return;
        }
        if (enemy.type === "pursuer") {
          const direction = Math.sign(this.player.col - enemy.col);
          enemy.intent = { col: enemy.col + direction, row: enemy.row };
        }
      });
    }

    enemyTurn() {
      this.world.enemies.forEach((enemy) => {
        if (enemy.hp <= 0) return;
        if (enemy.type === "pursuer") {
          const direction = Math.sign(this.player.col - enemy.col);
          const nextCol = enemy.col + direction;
          if (direction !== 0 && ns.inBounds(nextCol, enemy.row)) {
            const tile = ns.getTile(this.world, nextCol, enemy.row);
            if (tile && tile.type !== TILE.GAP) enemy.col = nextCol;
          }
        }

        if (enemy.col === this.player.col && enemy.row === this.player.row) {
          this.player.health -= 5;
          enemy.hp -= 1;
          this.addLog("Pursuer hits you.");
        }
      });
      this.updateEnemyIntent();
    }

    checkSoftLock() {
      if (this.status !== "playing") return;
      const hasCardMove = this.deck.hand.some((card) => this.getValidTargets(card).length > 0);
      if (!hasCardMove && !this.canUseEmergencyMove()) {
        this.status = "lost";
        this.addLog("No safe move remains.");
      }
    }

    checkEndState() {
      if (this.status !== "playing") return;
      if (this.player.health <= 0) {
        this.status = "lost";
        this.addLog("The road takes the last of your strength.");
        return;
      }
      if (this.deck.hand.length === 0 && this.deck.drawPile.length === 0 && this.deck.discardPile.length === 0) {
        this.status = "lost";
        this.addLog("Your deck is empty.");
        return;
      }
      this.checkSoftLock();
    }

    getStateSnapshot() {
      return {
        status: this.status,
        player: copyPosition(this.player),
        resources: this.resources,
        health: this.player.health,
        hand: this.deck.hand.slice(),
        validTargets: this.getValidTargets(),
        pendingActions: this.pendingActions.slice(),
        log: this.log.slice()
      };
    }
  }

  ns.NeverSouthRun = NeverSouthRun;
  window.NeverSouth = ns;
})();
