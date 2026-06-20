(function (ns) {
  'use strict';

  const BRANCHES = [
    [
      { id: 'grasping-limbs', group: 'morphology', name: 'Grasping Limbs', icon: '⌁', description: 'Precise gathering, climbing architecture, and root-claw ark organs.', effects: { mobility: 1.2, gather: 1.2 } },
      { id: 'shellback', group: 'morphology', name: 'Shellback', icon: '⬢', description: 'Armored bodies, fortified nurseries, and a plated ark hull.', effects: { defense: 1.3, mobility: .9 } },
      { id: 'sailfin', group: 'morphology', name: 'Sailfin', icon: '⋔', description: 'Gliding movement, tall spires, and storm-catching ark sails.', effects: { mobility: 1.1, storm: 1.25 } }
    ],
    [
      { id: 'hearthbound', group: 'culture', name: 'Hearthbound', icon: '⌂', description: 'Close families share food and resist fear together.', effects: { cohesion: 1.3 } },
      { id: 'pathfinders', group: 'culture', name: 'Pathfinders', icon: '✧', description: 'Curious scouts reveal routes and distant resources.', effects: { explore: 1.3 } },
      { id: 'wardens', group: 'culture', name: 'Wardens', icon: '◇', description: 'Coordinated defenders protect nests and vulnerable kin.', effects: { defense: 1.2, cohesion: 1.1 } }
    ],
    [
      { id: 'symbiotic-gardens', group: 'civic', name: 'Symbiotic Gardens', icon: '♧', description: 'Food architecture heals nearby land and feeds ark stores.', effects: { ecology: 1.3, food: 1.2 } },
      { id: 'memory-chorus', group: 'civic', name: 'Memory Chorus', icon: '≋', description: 'Ancestral knowledge accelerates diplomacy and ark navigation.', effects: { diplomacy: 1.25, knowledge: 1.25 } },
      { id: 'brood-foundries', group: 'civic', name: 'Brood Foundries', icon: '◈', description: 'Fast-growing structures support dense cities and powerful organs.', effects: { build: 1.3, ecology: .9 } }
    ],
    [
      { id: 'restoration-pact', group: 'ecology', name: 'Restoration Pact', icon: '❉', description: 'Heal the island before departure and carry a diverse seedbank.', effects: { ecology: 1.35, seed: 1.2 } },
      { id: 'storm-harvest', group: 'ecology', name: 'Storm Harvest', icon: 'ϟ', description: 'Capture violent weather to power the migration.', effects: { storm: 1.35, ecology: .9 } },
      { id: 'wild-covenant', group: 'ecology', name: 'Wild Covenant', icon: '✺', description: 'Travel with rival species and untamed organisms as allies.', effects: { diplomacy: 1.2, seed: 1.15 } }
    ]
  ];

  function effectsFor(lineage) {
    const effects = { mobility: 1, gather: 1, defense: 1, storm: 1, cohesion: 1, explore: 1, ecology: 1, food: 1, diplomacy: 1, knowledge: 1, build: 1, seed: 1 };
    (lineage.branches || []).forEach(id => {
      BRANCHES.flat().filter(branch => branch.id === id).forEach(branch => {
        Object.keys(branch.effects).forEach(key => { effects[key] *= branch.effects[key]; });
      });
    });
    return effects;
  }

  function eligibleBranches(chapterIndex, campaign) {
    const choices = BRANCHES[chapterIndex] || [];
    return choices.map(choice => Object.assign({}, choice, {
      earned: true,
      reason: campaign.chapterState.actions && campaign.chapterState.actions[choice.id] ? 'Unlocked by repeated behavior' : 'Unlocked by completing the chapter'
    }));
  }

  function commitBranch(campaign, branchId) {
    const stage = BRANCHES[campaign.chapter];
    const branch = stage && stage.find(item => item.id === branchId);
    if (!branch) throw new Error('Branch is not eligible for this metamorphosis');
    const conflicting = BRANCHES.flat().filter(item => item.group === branch.group).map(item => item.id);
    if (campaign.lineage.branches.some(id => conflicting.includes(id))) throw new Error('This permanent branch group is already committed');
    campaign.lineage.branches.push(branch.id);
    campaign.lineage.portraits.push({ chapter: campaign.chapter, branch: branch.id, title: ns.CONFIG.chapters[campaign.chapter].title, appearance: Object.assign({}, campaign.lineage.founder), at: campaign.elapsed });
    campaign.history.unshift(`${branch.name} became part of every life that followed.`);
    return branch;
  }

  function createCampaign(egg, seed) {
    const appearance = ns.CreatureAppearance.fromGenes({ body: egg.body, palette: egg.palette }, seed);
    return {
      schemaVersion: ns.CONFIG.schemaVersion,
      seed,
      chapter: 0,
      elapsed: 0,
      score: 0,
      status: 'playing',
      lineage: {
        name: `Lineage ${String(seed).slice(-4)}`,
        egg: egg.id,
        founderName: 'Luma',
        founder: appearance,
        mate: null,
        branches: [],
        portraits: [],
        generations: 1,
        populationPeak: 1
      },
      ecology: { health: 72, diversity: 45, restored: 0, exploited: 0 },
      history: [`Luma hatched from the ${egg.name}.`],
      settings: { reducedMotion: false, glow: true, contrast: false, colorMode: 'default', uiScale: 1 },
      chapterState: {},
      checkpoint: null
    };
  }

  ns.BRANCHES = BRANCHES;
  ns.effectsFor = effectsFor;
  ns.eligibleBranches = eligibleBranches;
  ns.commitBranch = commitBranch;
  ns.createCampaign = createCampaign;
})(window.Lumenkin = window.Lumenkin || {});
