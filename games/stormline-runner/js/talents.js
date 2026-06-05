(function() {
  "use strict";

  const ns = window.StormlineRunner;

  function includesWeather(list, weatherId) {
    return Array.isArray(list) && list.indexOf(weatherId) >= 0;
  }

  class TalentSystem {
    constructor(rng) {
      this.rng = rng;
      this.owned = new Map();
    }

    reset() {
      this.owned.clear();
    }

    getStacks(id) {
      return this.owned.get(id) || 0;
    }

    has(id) {
      return this.getStacks(id) > 0;
    }

    add(id) {
      const talent = this.getDefinition(id);
      if (!talent) return;
      const current = this.getStacks(id);
      this.owned.set(id, Math.min(talent.maxStacks || 1, current + 1));
    }

    getDefinition(id) {
      return ns.TALENT_DEFINITIONS.find((talent) => talent.id === id);
    }

    getOwnedList() {
      return Array.from(this.owned.entries()).map(([id, stacks]) => {
        const talent = this.getDefinition(id);
        return {
          id,
          stacks,
          name: talent ? talent.name : id
        };
      });
    }

    createDraft(currentWeather, nextWeather) {
      const currentId = currentWeather.id;
      const nextId = nextWeather.id;
      const candidates = ns.TALENT_DEFINITIONS.filter((talent) => {
        return this.getStacks(talent.id) < (talent.maxStacks || 1);
      });

      candidates.sort((a, b) => {
        const scoreA = this.scoreDefinition(a, currentId, nextId) + this.rng.next() * 0.35;
        const scoreB = this.scoreDefinition(b, currentId, nextId) + this.rng.next() * 0.35;
        return scoreB - scoreA;
      });

      return candidates.slice(0, ns.CONFIG.shrine.draftSize).map((talent) => {
        return {
          talent,
          rating: this.getDraftRating(talent, currentId, nextId),
          stacks: this.getStacks(talent.id)
        };
      });
    }

    scoreDefinition(talent, currentId, nextId) {
      let score = 1;
      if (includesWeather(talent.affinity, currentId)) score += 2.6;
      if (includesWeather(talent.affinity, nextId)) score += 1.1;
      if (includesWeather(talent.awkward, currentId)) score -= 1.4;
      return score;
    }

    getDraftRating(talent, currentId, nextId) {
      if (includesWeather(talent.affinity, currentId)) return "Surging now";
      if (includesWeather(talent.affinity, nextId)) return "Rising next";
      if (includesWeather(talent.awkward, currentId)) return "Awkward now";
      return "Stable";
    }

    getDashDurationBonus(weather) {
      const stacks = this.getStacks("static-afterburner");
      if (!stacks) return 0;
      return stacks * (weather.id === "static-fog" ? 0.09 : 0.035);
    }

    getDashCostMultiplier(weather) {
      let multiplier = 1;
      const heatStacks = this.getStacks("heat-sink-boots");
      if (heatStacks && weather.id === "heat-bloom") multiplier -= 0.18 * heatStacks;
      if (this.has("static-afterburner") && weather.id === "magnetic-rain") multiplier += 0.18;
      return Math.max(0.45, multiplier);
    }

    getHazardDamageMultiplier(weather, hazardType) {
      let multiplier = 1;
      const heatStacks = this.getStacks("heat-sink-boots");
      if (heatStacks && weather.id === "heat-bloom" && hazardType === "heat") {
        multiplier -= 0.28 * heatStacks;
      }
      if (this.has("magnetic-wall-coil") && weather.id === "heat-bloom") {
        multiplier += 0.08;
      }
      return Math.max(0.35, multiplier);
    }

    getPickupMultiplier(weather) {
      let multiplier = 1;
      const stacks = this.getStacks("prism-capacitor");
      if (stacks) {
        multiplier += weather.id === "prism-squall" ? stacks * 0.65 : stacks * 0.18;
        if (weather.id === "static-fog") multiplier -= 0.14;
      }
      return Math.max(0.6, multiplier);
    }

    getWallBatteryGain(weather) {
      const stacks = this.getStacks("magnetic-wall-coil");
      if (!stacks) return 0;
      return stacks * (weather.id === "magnetic-rain" ? 12 : 4);
    }

    getRailBatteryGain(weather) {
      const stacks = this.getStacks("rail-surge");
      if (!stacks) return 0;
      if (weather.id === "magnetic-rain" || weather.id === "static-fog") {
        return stacks * 10;
      }
      return stacks * 3;
    }

    getRailSpeedBonus(weather) {
      const stacks = this.getStacks("rail-surge");
      if (!stacks) return 0;
      return stacks * (weather.id === "overcast-calm" ? 18 : 54);
    }

    getBatteryDrainMultiplier(weather) {
      let multiplier = 1;
      const reserve = this.getStacks("reserve-cell");
      if (reserve && (weather.id === "heat-bloom" || weather.id === "static-fog" || weather.id === "prism-squall")) {
        multiplier -= 0.06 * reserve;
      }
      if (this.has("squall-gambit")) {
        multiplier += weather.id === "heat-bloom" || weather.id === "prism-squall" ? 0.24 : 0.08;
      }
      return Math.max(0.65, multiplier);
    }

    getMaxBatteryBonus() {
      return this.getStacks("reserve-cell") * 18;
    }

    getSpeedBonus(weather) {
      if (!this.has("squall-gambit")) return 0;
      return weather.id === "heat-bloom" || weather.id === "prism-squall" ? 62 : 22;
    }

    getCalmHealPerSecond(weather) {
      const stacks = this.getStacks("calm-restitch");
      if (!stacks || weather.id !== "overcast-calm") return 0;
      return stacks * 3.2;
    }
  }

  ns.TalentSystem = TalentSystem;
})();
