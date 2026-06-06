(function() {
  "use strict";

  const ns = window.NeverSouth || {};

  function cloneCard(card, instanceId) {
    return {
      instanceId,
      id: card.id,
      name: card.name,
      summary: card.summary,
      cost: { scrap: card.cost.scrap || 0, glow: card.cost.glow || 0 },
      offsets: card.offsets.map(function(offset) {
        return { col: offset.col, row: offset.row };
      }),
      traits: card.traits.slice()
    };
  }

  function canAfford(card, resources) {
    return resources.scrap >= (card.cost.scrap || 0) && resources.glow >= (card.cost.glow || 0);
  }

  function payCost(card, resources) {
    resources.scrap -= card.cost.scrap || 0;
    resources.glow -= card.cost.glow || 0;
  }

  class Deck {
    constructor(cardIds, rng, handSize) {
      this.rng = rng || ns.createRng("deck");
      this.handSize = handSize || ns.CONFIG.run.handSize;
      this.nextInstanceId = 1;
      this.drawPile = [];
      this.discardPile = [];
      this.hand = [];
      this.destroyed = [];
      this.reset(cardIds || ns.STARTING_DECK);
    }

    reset(cardIds) {
      this.nextInstanceId = 1;
      this.drawPile = cardIds.map((id) => this.createCard(id));
      this.drawPile = this.rng.shuffle(this.drawPile);
      this.discardPile = [];
      this.hand = [];
      this.destroyed = [];
      this.drawToHand();
    }

    createCard(id) {
      const definition = ns.CARDS_BY_ID[id];
      if (!definition) throw new Error("Unknown card: " + id);
      return cloneCard(definition, "c" + this.nextInstanceId++);
    }

    draw(count) {
      const drawn = [];
      for (let i = 0; i < count; i++) {
        if (this.drawPile.length === 0) {
          this.shuffleDiscardIntoDeck();
        }
        if (this.drawPile.length === 0) break;
        const card = this.drawPile.shift();
        this.hand.push(card);
        drawn.push(card);
      }
      return drawn;
    }

    drawToHand() {
      return this.draw(Math.max(0, this.handSize - this.hand.length));
    }

    shuffleDiscardIntoDeck() {
      if (this.discardPile.length === 0) return false;
      this.drawPile = this.rng.shuffle(this.discardPile);
      this.discardPile = [];
      return true;
    }

    getHandCard(instanceId) {
      return this.hand.find((card) => card.instanceId === instanceId);
    }

    play(instanceId, resources, options) {
      const settings = options || {};
      const index = this.hand.findIndex((card) => card.instanceId === instanceId);
      if (index < 0) return { ok: false, reason: "Card is not in hand." };

      const card = this.hand[index];
      if (!canAfford(card, resources)) return { ok: false, reason: "Not enough resources." };

      this.hand.splice(index, 1);
      payCost(card, resources);

      if (card.traits.includes("destroy")) {
        this.destroyed.push(card);
      } else if (card.traits.includes("return") && this.rng.chance(0.5)) {
        this.hand.push(card);
      } else {
        this.discardPile.push(card);
      }

      if (settings.drawReplacement !== false) {
        this.drawToHand();
      }
      return { ok: true, card };
    }
  }

  ns.cloneCard = cloneCard;
  ns.canAffordCard = canAfford;
  ns.payCardCost = payCost;
  ns.Deck = Deck;
  window.NeverSouth = ns;
})();
