(function(global) {
  "use strict";

  const ns = global.ContrabandSkies || (global.ContrabandSkies = {});

  const STEPS = [
    {
      id: "map",
      title: "Read the map",
      body: "Each dot is a sky port. Route lines show where your courier can fly from the current port."
    },
    {
      id: "status",
      title: "Watch the company",
      body: "Day, money, debt, fuel, hull, and heat decide whether the season survives."
    },
    {
      id: "contracts",
      title: "Choose the job",
      body: "Contracts show destination, cargo, deadline, payout, distance, and the living-sky hazard."
    },
    {
      id: "dials",
      title: "Plan the route",
      body: "Route dials trade speed, fuel, hull stress, cargo condition, and heat before you commit."
    },
    {
      id: "fly",
      title: "Fly the route",
      body: "This first route is tuned for learning. Press Fly Route to resolve it and unlock the full cockpit."
    }
  ];

  const DEFAULT_DIALS = {
    pace: 48,
    altitude: 58,
    engine: 38,
    stealth: 68,
    care: 72
  };

  const GATE_STEP_INDEX = {
    status: 1,
    contracts: 2,
    route: 3,
    fly: 4,
    advanced: 99,
    "season-controls": 99
  };

  function createTutorialState(firstRun) {
    return {
      status: "active",
      stepId: STEPS[0].id,
      firstRun: firstRun !== false
    };
  }

  function normalizeTutorialState(campaign) {
    if (!campaign) return null;
    if (!campaign.tutorial) {
      campaign.tutorial = campaign.deliveries > 0 || campaign.status === "ended"
        ? { status: "complete", stepId: "complete", firstRun: false }
        : createTutorialState(false);
    }

    const tutorial = campaign.tutorial;
    if (["active", "complete", "skipped"].indexOf(tutorial.status) === -1) {
      tutorial.status = campaign.deliveries > 0 ? "complete" : "active";
    }
    if (tutorial.status === "active" && !getStep(tutorial.stepId)) {
      tutorial.stepId = STEPS[0].id;
    }
    if (campaign.completedContracts && campaign.completedContracts.length > 0 && tutorial.status === "active") {
      completeTutorial(campaign);
    }
    if (tutorial.status !== "active") {
      tutorial.firstRun = false;
      if (tutorial.stepId !== "skipped") tutorial.stepId = "complete";
    }
    return campaign.tutorial;
  }

  function applyTutorialFirstRun(campaign) {
    const tutorial = normalizeTutorialState(campaign);
    if (!tutorial || tutorial.status !== "active" || !tutorial.firstRun || campaign.deliveries > 0) return campaign;

    const route = getNearestRoute(campaign);
    if (!route) return campaign;

    route.hazardId = "migration-shadow";
    const destinationId = route.fromId === campaign.currentSettlementId ? route.toId : route.fromId;
    const destination = ns.getSettlement(campaign, destinationId);
    campaign.contracts = [{
      id: "tutorial-first-route",
      routeId: route.id,
      originId: campaign.currentSettlementId,
      destinationId,
      destinationName: destination.name,
      title: `sealed court letters to ${destination.name}`,
      cargo: {
        familyId: "contraband",
        familyName: "Contraband",
        name: "sealed court letters",
        suspicion: 10,
        fragility: 10,
        urgency: 20
      },
      payout: Math.max(190, Math.round(route.distance * 0.55) + 130),
      deadline: Math.max(6, Math.round(route.distance / 125) + 4),
      note: "Tutorial route: a mild migration shadow, low-fragility contraband, and enough time to learn the dials."
    }];
    campaign.selectedContractId = campaign.contracts[0].id;
    return campaign;
  }

  function getNearestRoute(campaign) {
    const candidates = campaign.routes.filter(route => route.fromId === campaign.currentSettlementId || route.toId === campaign.currentSettlementId);
    return candidates.sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function getStep(stepId) {
    return STEPS.find(step => step.id === stepId) || null;
  }

  function getStepIndex(campaign) {
    const tutorial = normalizeTutorialState(campaign);
    if (!tutorial || tutorial.status !== "active") return STEPS.length;
    return Math.max(0, STEPS.findIndex(step => step.id === tutorial.stepId));
  }

  function getTutorialCopy(campaign) {
    const tutorial = normalizeTutorialState(campaign);
    if (!tutorial || tutorial.status !== "active") return null;
    const index = getStepIndex(campaign);
    return {
      ...STEPS[index],
      index,
      total: STEPS.length,
      nextEnabled: STEPS[index].id !== "fly"
    };
  }

  function advanceTutorial(campaign) {
    const tutorial = normalizeTutorialState(campaign);
    if (!tutorial || tutorial.status !== "active") return tutorial;
    const index = getStepIndex(campaign);
    if (index < STEPS.length - 1) {
      tutorial.stepId = STEPS[index + 1].id;
    }
    return tutorial;
  }

  function skipTutorial(campaign) {
    if (!campaign) return null;
    campaign.tutorial = { status: "skipped", stepId: "skipped", firstRun: false };
    return campaign.tutorial;
  }

  function replayTutorial(campaign) {
    if (!campaign) return null;
    campaign.tutorial = { status: "active", stepId: STEPS[0].id, firstRun: false };
    return campaign.tutorial;
  }

  function completeTutorial(campaign) {
    if (!campaign) return null;
    campaign.tutorial = { status: "complete", stepId: "complete", firstRun: false };
    return campaign.tutorial;
  }

  function completeTutorialAfterFirstDelivery(campaign) {
    const tutorial = normalizeTutorialState(campaign);
    if (tutorial && tutorial.status === "active" && campaign.completedContracts && campaign.completedContracts.length > 0) {
      return completeTutorial(campaign);
    }
    return tutorial;
  }

  function isTutorialGateVisible(campaign, gate) {
    const tutorial = normalizeTutorialState(campaign);
    if (!tutorial || tutorial.status !== "active") return true;
    const requiredIndex = GATE_STEP_INDEX[gate];
    if (requiredIndex === undefined) return true;
    if (gate === "advanced" || gate === "season-controls") return false;
    return getStepIndex(campaign) >= requiredIndex;
  }

  function canFlyInTutorial(campaign) {
    const tutorial = normalizeTutorialState(campaign);
    if (!tutorial || tutorial.status !== "active") return true;
    return getStepIndex(campaign) >= GATE_STEP_INDEX.fly;
  }

  ns.TUTORIAL_STEPS = STEPS;
  ns.TUTORIAL_DEFAULT_DIALS = DEFAULT_DIALS;
  ns.createTutorialState = createTutorialState;
  ns.normalizeTutorialState = normalizeTutorialState;
  ns.applyTutorialFirstRun = applyTutorialFirstRun;
  ns.getTutorialCopy = getTutorialCopy;
  ns.advanceTutorial = advanceTutorial;
  ns.skipTutorial = skipTutorial;
  ns.replayTutorial = replayTutorial;
  ns.completeTutorial = completeTutorial;
  ns.completeTutorialAfterFirstDelivery = completeTutorialAfterFirstDelivery;
  ns.isTutorialGateVisible = isTutorialGateVisible;
  ns.canFlyInTutorial = canFlyInTutorial;
})(typeof window !== "undefined" ? window : globalThis);
