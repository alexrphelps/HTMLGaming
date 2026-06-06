(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  function normalizeDials(dials) {
    const source = dials || {};
    return {
      pace: ns.clamp(Number(source.pace) || 55, 20, 90),
      altitude: ns.clamp(Number(source.altitude) || 50, 10, 90),
      engine: ns.clamp(Number(source.engine) || 45, 15, 85),
      stealth: ns.clamp(Number(source.stealth) || 55, 10, 95),
      care: ns.clamp(Number(source.care) || 60, 15, 95)
    };
  }

  function hasUpgrade(upgrades, id) {
    return Array.isArray(upgrades) && upgrades.indexOf(id) !== -1;
  }

  function resolveRouteLeg(contract, route, hazard, dials, upgrades, seed) {
    const plan = normalizeDials(dials);
    const rng = ns.createRng(seed || `${contract.id}:${route.id}:route`);
    const hazardData = hazard || {};
    const cargo = contract.cargo || {};
    const randomPulse = Math.round(ns.rngRange(rng, -8, 13));
    const distanceFactor = Math.max(1, route.distance / 160);

    let eventRisk = 28 + (hazardData.riskBias || 0) + randomPulse;
    eventRisk += (plan.pace - 50) * 0.34;
    eventRisk += (plan.engine - 45) * 0.22;
    eventRisk -= (plan.altitude - 45) * 0.1;
    if (hasUpgrade(upgrades, "weatherwise")) eventRisk -= 8;

    let fuelCost = Math.round(10 * distanceFactor + (plan.engine * 0.18) + (plan.altitude * 0.06) + (hazardData.fuelBias || 0));
    let timeCost = Math.max(1, Math.round((route.distance / 110) + 5 - (plan.pace / 24) + (plan.care / 70)));
    let hullStress = Math.round(4 + (hazardData.hullBias || 0) + (plan.pace - 45) * 0.09 + (plan.engine - 45) * 0.08);
    let cargoDamage = Math.round((cargo.fragility || 0) * 0.14 + (hazardData.cargoBias || 0) + (65 - plan.care) * 0.22);
    let suspicion = Math.round((cargo.suspicion || 0) * 0.16 + (hazardData.suspicionBias || 0) + (55 - plan.stealth) * 0.32 + (plan.engine - 45) * 0.11);

    if (hasUpgrade(upgrades, "larger-fuel-bladder")) fuelCost = Math.max(4, fuelCost - 4);
    if (hasUpgrade(upgrades, "insulated-hold")) cargoDamage = Math.max(0, cargoDamage - 10);
    if (hasUpgrade(upgrades, "quiet-engine")) suspicion = Math.max(0, suspicion - 9);
    if (hasUpgrade(upgrades, "reinforced-keel")) hullStress = Math.max(0, hullStress - 8);

    eventRisk = Math.round(ns.clamp(eventRisk, 5, 92));
    const eventHit = rng() * 100 < eventRisk;
    if (eventHit) {
      const eventRoll = rng();
      if (eventRoll < 0.34) hullStress += 8;
      else if (eventRoll < 0.67) cargoDamage += 10;
      else suspicion += 9;
    }

    cargoDamage = Math.max(0, cargoDamage);
    hullStress = Math.max(0, hullStress);
    suspicion = Math.max(0, suspicion);

    const cargoCondition = ns.clamp(100 - cargoDamage, 0, 100);
    const payoutMultiplier = ns.clamp(0.45 + cargoCondition / 120 - Math.max(0, timeCost - contract.deadline) * 0.08, 0.2, 1.15);
    const payout = Math.max(20, Math.round(contract.payout * payoutMultiplier));
    const success = cargoCondition >= 30 && timeCost <= contract.deadline + 3;

    return {
      dials: plan,
      eventRisk,
      eventHit,
      fuelCost,
      timeCost,
      hullStress,
      cargoDamage,
      cargoCondition,
      suspicion,
      payout,
      success,
      summary: buildSummary(hazardData, eventHit, success, cargoCondition)
    };
  }

  function buildSummary(hazard, eventHit, success, cargoCondition) {
    if (!success) return `${hazard.name} breaks the schedule. The delivery limps in compromised.`;
    if (eventHit) return `${hazard.name} stirs mid-route, but the courier holds together. Cargo condition: ${cargoCondition}%.`;
    return `A clean reading through ${hazard.name}. Cargo condition: ${cargoCondition}%.`;
  }

  ns.normalizeDials = normalizeDials;
  ns.resolveRouteLeg = resolveRouteLeg;
})(typeof window !== "undefined" ? window : globalThis);
