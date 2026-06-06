(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  function createNewCampaign(seed, inheritedPerks) {
    const campaignSeed = seed || `season-${Date.now()}`;
    const perks = Array.isArray(inheritedPerks) ? inheritedPerks.slice(0, 3) : [];
    const rng = ns.createRng(campaignSeed);
    const settlements = createSettlements(rng);
    const routes = createRoutes(rng, settlements);
    const start = settlements[0];
    const campaign = {
      version: 1,
      seed: campaignSeed,
      day: 1,
      money: ns.CONFIG.startingMoney,
      debt: ns.CONFIG.startingDebt,
      fuel: ns.CONFIG.startingFuel,
      maxFuel: ns.CONFIG.startingFuel,
      hull: perks.indexOf("spare-rivets") !== -1 ? 96 : ns.CONFIG.startingHull,
      suspicion: ns.CONFIG.startingSuspicion,
      reputation: 50,
      deliveries: 0,
      status: "active",
      outcome: null,
      currentSettlementId: start.id,
      selectedContractId: null,
      inheritedPerks: perks,
      upgrades: perks.slice(),
      settlements,
      routes,
      contracts: [],
      completedContracts: [],
      log: [],
      tutorial: typeof ns.createTutorialState === "function"
        ? ns.createTutorialState(true)
        : { status: "active", stepId: "map", firstRun: true }
    };

    campaign.contracts = generateContracts(campaign, rng);
    if (typeof ns.applyTutorialFirstRun === "function") ns.applyTutorialFirstRun(campaign);
    addLog(campaign, `Season opens at ${start.name}. Debt collectors expect ${campaign.debt}c before the sky quiets.`);
    return campaign;
  }

  function createSettlements(rng) {
    const names = ["Amberhook", "Larkspur Chain", "Vesper Coil", "Mothlight Quay", "Saint Orra", "Copperwake", "Low Halo", "Needlemarket"];
    return names.slice(0, ns.CONFIG.settlementCount).map((name, index) => {
      const type = ns.SETTLEMENT_TYPES[index % ns.SETTLEMENT_TYPES.length];
      const ring = index / ns.CONFIG.settlementCount;
      return {
        id: `settlement-${index}`,
        name,
        typeId: type.id,
        typeName: type.name,
        color: type.color,
        x: ns.clamp(0.14 + ring * 0.76 + ns.rngRange(rng, -0.045, 0.045), 0.1, 0.92),
        y: ns.clamp(0.2 + Math.sin(index * 1.7) * 0.28 + ns.rngRange(rng, -0.05, 0.05), 0.14, 0.86)
      };
    });
  }

  function createRoutes(rng, settlements) {
    const routes = [];
    for (let i = 0; i < settlements.length; i++) {
      const next = settlements[(i + 1) % settlements.length];
      routes.push(createRoute(rng, settlements[i], next, routes.length));
      if (i + 2 < settlements.length && rng() > 0.35) {
        routes.push(createRoute(rng, settlements[i], settlements[i + 2], routes.length));
      }
    }
    return routes;
  }

  function createRoute(rng, from, to, index) {
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    const distance = Math.round(80 + Math.sqrt(dx * dx + dy * dy) * 620);
    const hazard = ns.rngChoice(rng, ns.HAZARDS);
    return {
      id: `route-${index}`,
      fromId: from.id,
      toId: to.id,
      distance,
      hazardId: hazard.id
    };
  }

  function routesFrom(campaign, settlementId) {
    return campaign.routes.filter(route => route.fromId === settlementId || route.toId === settlementId);
  }

  function getOtherSettlementId(route, settlementId) {
    return route.fromId === settlementId ? route.toId : route.fromId;
  }

  function generateContracts(campaign, rng) {
    const routeOptions = routesFrom(campaign, campaign.currentSettlementId);
    const contracts = [];
    for (let i = 0; i < ns.CONFIG.activeContractCount; i++) {
      const route = routeOptions[i % routeOptions.length];
      const destination = campaign.settlements.find(item => item.id === getOtherSettlementId(route, campaign.currentSettlementId));
      const family = ns.rngChoice(rng, ns.CARGO_FAMILIES);
      const cargoName = ns.rngChoice(rng, family.cargoNames);
      const inheritedBonus = campaign.inheritedPerks.indexOf("trusted-fences") !== -1 && family.id === "contraband" ? 25 : 0;
      contracts.push({
        id: `contract-${campaign.day}-${campaign.deliveries}-${i}-${Math.floor(rng() * 10000)}`,
        routeId: route.id,
        originId: campaign.currentSettlementId,
        destinationId: destination.id,
        title: `${cargoName} to ${destination.name}`,
        destinationName: destination.name,
        cargo: {
          familyId: family.id,
          familyName: family.name,
          name: cargoName,
          suspicion: family.suspicion,
          fragility: family.fragility,
          urgency: family.urgency
        },
        payout: family.payout + Math.round(route.distance * 0.52) + inheritedBonus + ns.rngInt(rng, -14, 26),
        deadline: Math.max(2, Math.round(7 - family.urgency / 22 + route.distance / 165)),
        note: ns.rngChoice(rng, ns.VIGNETTES)
      });
    }
    return contracts;
  }

  function selectContract(campaign, contractId) {
    if (!campaign || campaign.status !== "active") return null;
    const contract = campaign.contracts.find(item => item.id === contractId);
    campaign.selectedContractId = contract ? contract.id : null;
    return contract || null;
  }

  function previewRoute(campaign, dials) {
    const contract = getSelectedContract(campaign);
    if (!contract) return null;
    const route = getRoute(campaign, contract.routeId);
    const hazard = getHazard(route.hazardId);
    return ns.resolveRouteLeg(contract, route, hazard, dials, campaign.upgrades, `${campaign.seed}:preview:${contract.id}`);
  }

  function flySelectedRoute(campaign, dials) {
    const contract = getSelectedContract(campaign);
    if (!contract || campaign.status !== "active") return null;
    const route = getRoute(campaign, contract.routeId);
    const hazard = getHazard(route.hazardId);
    const result = ns.resolveRouteLeg(contract, route, hazard, dials, campaign.upgrades, `${campaign.seed}:fly:${contract.id}:${campaign.day}`);

    campaign.day += result.timeCost;
    campaign.money += result.payout;
    campaign.fuel = ns.clamp(campaign.fuel - result.fuelCost, 0, campaign.maxFuel);
    campaign.hull = ns.clamp(campaign.hull - result.hullStress, 0, 100);
    campaign.suspicion = ns.clamp(campaign.suspicion + result.suspicion - (result.success ? 3 : 0), 0, 100);
    campaign.reputation = ns.clamp(campaign.reputation + (result.success ? 4 : -7), 0, 100);
    campaign.deliveries += result.success ? 1 : 0;
    campaign.currentSettlementId = contract.destinationId;
    campaign.completedContracts.push({ id: contract.id, title: contract.title, result });
    addLog(campaign, `${contract.title}: ${result.summary} Earned ${result.payout}c.`);
    if (typeof ns.completeTutorialAfterFirstDelivery === "function") ns.completeTutorialAfterFirstDelivery(campaign);

    campaign.contracts = campaign.contracts.filter(item => item.id !== contract.id);
    campaign.selectedContractId = null;
    refuelAtPort(campaign);
    updateSeasonStatus(campaign);
    if (campaign.status === "active") {
      campaign.contracts = generateContracts(campaign, ns.createRng(`${campaign.seed}:contracts:${campaign.day}:${campaign.deliveries}`));
    }
    return result;
  }

  function refuelAtPort(campaign) {
    const needed = campaign.maxFuel - campaign.fuel;
    if (needed <= 0 || campaign.money <= 0) return;
    const bought = Math.min(needed, Math.floor(campaign.money / 2));
    campaign.fuel += bought;
    campaign.money -= bought * 2;
  }

  function buyUpgrade(campaign, upgradeId) {
    if (!campaign || campaign.status !== "active") return false;
    const upgrade = ns.UPGRADES.find(item => item.id === upgradeId);
    if (!upgrade || campaign.upgrades.indexOf(upgrade.id) !== -1 || campaign.money < upgrade.cost) return false;
    campaign.money -= upgrade.cost;
    campaign.upgrades.push(upgrade.id);
    if (upgrade.id === "larger-fuel-bladder") {
      campaign.maxFuel += 20;
      campaign.fuel += 20;
    }
    addLog(campaign, `Installed ${upgrade.name}.`);
    return true;
  }

  function updateSeasonStatus(campaign) {
    if (campaign.hull <= 0 || campaign.fuel <= 0 || campaign.suspicion >= 100) {
      campaign.status = "ended";
      campaign.outcome = createOutcome(campaign, "collapse");
      return;
    }
    if (campaign.deliveries >= ns.CONFIG.seasonTargetDeliveries) {
      campaign.status = "ended";
      campaign.outcome = createOutcome(campaign, campaign.money >= campaign.debt ? "solvent" : "barely");
      return;
    }
    if (campaign.day > ns.CONFIG.maxSeasonDay) {
      campaign.status = "ended";
      campaign.outcome = createOutcome(campaign, campaign.money >= campaign.debt ? "barely" : "collapse");
    }
  }

  function createOutcome(campaign, kind) {
    const inherited = pickInheritedPerk(campaign);
    const textByKind = {
      solvent: `You pay the debt and vanish into clean weather with ${campaign.money - campaign.debt}c to spare.`,
      barely: "The company survives, but every bolt in the hull knows what it cost.",
      collapse: "The company folds under debt, damage, or heat. One lesson survives the wreck."
    };
    addLog(campaign, textByKind[kind]);
    return { kind, text: textByKind[kind], inheritedPerk: inherited };
  }

  function pickInheritedPerk(campaign) {
    const owned = new Set(campaign.inheritedPerks);
    return ns.INHERITED_PERKS.find(perk => !owned.has(perk.id)) || ns.INHERITED_PERKS[0];
  }

  function addLog(campaign, text) {
    campaign.log.unshift({ day: campaign.day, text });
    campaign.log = campaign.log.slice(0, ns.CONFIG.logLimit);
  }

  function getSelectedContract(campaign) {
    return campaign && campaign.contracts.find(item => item.id === campaign.selectedContractId) || null;
  }

  function getRoute(campaign, routeId) {
    return campaign.routes.find(route => route.id === routeId);
  }

  function getHazard(hazardId) {
    return ns.HAZARDS.find(hazard => hazard.id === hazardId) || ns.HAZARDS[0];
  }

  function getSettlement(campaign, settlementId) {
    return campaign.settlements.find(settlement => settlement.id === settlementId);
  }

  ns.createNewCampaign = createNewCampaign;
  ns.generateContracts = generateContracts;
  ns.selectContract = selectContract;
  ns.previewRoute = previewRoute;
  ns.flySelectedRoute = flySelectedRoute;
  ns.buyUpgrade = buyUpgrade;
  ns.getSelectedContract = getSelectedContract;
  ns.getRoute = getRoute;
  ns.getHazard = getHazard;
  ns.getSettlement = getSettlement;
})(typeof window !== "undefined" ? window : globalThis);
