(function(ns) {
  ns.MISSIONS = [
    {
      id: 'first-culture',
      title: 'First Culture',
      description: 'Seed the field and grow visible chemistry.',
      preset: null,
      recommendedTab: 'brush',
      requirements: [
        { metric: 'coverage', min: 0.05, label: 'Grow pattern coverage to 5%' },
        { metric: 'steps', min: 40, label: 'Let the culture evolve for 40 steps' },
        { metric: 'actions.seeded', min: 1, label: 'Paint, burst, pulse, or generate seeds' }
      ],
      holdMs: 800,
      rewardText: 'Pattern missions unlocked'
    },
    {
      id: 'leopard-bloom',
      title: 'Leopard Bloom',
      description: 'Use the classic spots preset to form a balanced island field.',
      preset: 'spots',
      recommendedTab: 'analysis',
      requirements: [
        { metric: 'presetKey', equals: 'spots', label: 'Start from Leopard Spots' },
        { metric: 'coverage', min: 0.12, max: 0.30, label: 'Hold 12-30% pattern coverage' },
        { metric: 'contrast', min: 0.12, label: 'Build clear spot contrast' },
        { metric: 'steps', min: 260, label: 'Let spots mature past 260 steps' }
      ],
      holdMs: 1600,
      rewardText: 'Stable island tuning unlocked'
    },
    {
      id: 'quiet-attractor',
      title: 'Quiet Attractor',
      description: 'Let the chemistry settle into a calm, readable state.',
      preset: null,
      recommendedTab: 'core',
      requirements: [
        { metric: 'steps', min: 800, label: 'Evolve beyond 800 steps' },
        { metric: 'avgChange', max: 0.0014, label: 'Reduce average change below 0.0014' },
        { metric: 'coverage', min: 0.04, label: 'Keep visible structure alive' }
      ],
      holdMs: 2200,
      rewardText: 'Attractor reading unlocked'
    },
    {
      id: 'wake-the-field',
      title: 'Wake the Field',
      description: 'Kick a calm field back into active reaction.',
      preset: null,
      recommendedTab: 'dynamics',
      requirements: [
        { metric: 'actions.clear', min: 1, label: 'Clear the dish at least once' },
        { metric: 'actions.seeded', min: 1, label: 'Re-seed with a pulse, burst, paint, or generate' },
        { metric: 'avgReaction', min: 0.0025, label: 'Raise reaction activity' },
        { metric: 'avgChange', min: 0.0012, label: 'Show the field is moving again' }
      ],
      holdMs: 1200,
      rewardText: 'Recovery experiments unlocked'
    },
    {
      id: 'zebra-lab',
      title: 'Zebra Lab',
      description: 'Coax the maze preset into broad striped networks.',
      preset: 'maze',
      recommendedTab: 'analysis',
      requirements: [
        { metric: 'presetKey', equals: 'maze', label: 'Start from Zebra Maze' },
        { metric: 'coverage', min: 0.22, label: 'Reach broad network coverage' },
        { metric: 'contrast', min: 0.15, label: 'Keep stripes legible' },
        { metric: 'steps', min: 300, label: 'Let networks connect' }
      ],
      holdMs: 1600,
      rewardText: 'Maze tuning unlocked'
    },
    {
      id: 'coral-garden',
      title: 'Coral Garden',
      description: 'Grow an energetic branchy bloom before it calms down.',
      preset: 'coral',
      recommendedTab: 'dynamics',
      requirements: [
        { metric: 'presetKey', equals: 'coral', label: 'Start from Coral Bloom' },
        { metric: 'avgReaction', min: 0.003, label: 'Reach strong reaction activity' },
        { metric: 'avgChange', min: 0.0015, label: 'Keep the bloom actively changing' },
        { metric: 'coverage', min: 0.10, label: 'Grow visible branches' }
      ],
      holdMs: 1300,
      rewardText: 'Branchy growth unlocked'
    },
    {
      id: 'bubble-chamber',
      title: 'Bubble Chamber',
      description: 'Use saturation to tame growth into rounded chambers.',
      preset: 'bubble',
      recommendedTab: 'dynamics',
      requirements: [
        { metric: 'model', equals: 'saturating', label: 'Use the Saturating Reactor' },
        { metric: 'sat', min: 1.0, label: 'Set saturation above 1.0' },
        { metric: 'coverage', min: 0.10, max: 0.34, label: 'Hold medium coverage' },
        { metric: 'contrast', min: 0.13, label: 'Keep chamber edges visible' }
      ],
      holdMs: 1700,
      rewardText: 'Saturation control unlocked'
    },
    {
      id: 'crystal-lines',
      title: 'Crystal Lines',
      description: 'Sharpen the chemistry into hard bright veins.',
      preset: 'crystal',
      recommendedTab: 'dynamics',
      requirements: [
        { metric: 'model', equals: 'cubic', label: 'Use the Cubic Reactor' },
        { metric: 'exp', min: 2.8, label: 'Raise exponent above 2.8' },
        { metric: 'contrast', min: 0.16, label: 'Build crisp high contrast' },
        { metric: 'coverage', min: 0.08, label: 'Keep visible vein structure' }
      ],
      holdMs: 1700,
      rewardText: 'Threshold growth unlocked'
    },
    {
      id: 'drift-storm',
      title: 'Drift Storm',
      description: 'Bend living patterns with directional flow.',
      preset: 'storm',
      recommendedTab: 'dynamics',
      requirements: [
        { metric: 'drift', min: 0.12, label: 'Push drift magnitude above 0.12' },
        { metric: 'avgChange', min: 0.001, label: 'Keep the storm moving' },
        { metric: 'coverage', min: 0.08, label: 'Maintain visible pattern mass' },
        { metric: 'steps', min: 240, label: 'Let drift reshape the field' }
      ],
      holdMs: 1500,
      rewardText: 'Flow sculpting unlocked'
    },
    {
      id: 'custom-specimen',
      title: 'Custom Specimen',
      description: 'Create a viable culture from your own changes.',
      preset: null,
      recommendedTab: 'core',
      requirements: [
        { metric: 'isCustom', equals: true, label: 'Use custom settings or Morph current' },
        { metric: 'actions.morph', min: 1, label: 'Morph or manually tune the current recipe' },
        { metric: 'coverage', min: 0.08, max: 0.36, label: 'Hold a viable culture' },
        { metric: 'contrast', min: 0.12, label: 'Make the specimen readable' }
      ],
      holdMs: 2000,
      rewardText: 'Campaign complete'
    }
  ];
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
