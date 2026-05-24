(function(ns) {
  ns.LEARNING_MISSIONS = [
    {
      id: 'learning-seed',
      title: 'Make the First Pattern',
      description: 'Press Generate or paint on the canvas to wake the field.',
      recommendedTab: 'brush',
      requirements: [
        { metric: 'actions.seeded', min: 1, label: 'Seed the field once' },
        { metric: 'coverage', min: 0.02, label: 'Grow visible pattern coverage' }
      ],
      holdMs: 400,
      rewardText: 'Brush tools unlocked'
    },
    {
      id: 'learning-time',
      title: 'Control Time',
      description: 'Pause the reaction, then step it forward by hand.',
      recommendedTab: 'brush',
      requirements: [
        { metric: 'actions.pause', min: 1, label: 'Pause or resume once' },
        { metric: 'actions.step', min: 1, label: 'Use Step x 20 once' },
        { metric: 'steps', min: 20, label: 'Advance the simulation' }
      ],
      holdMs: 300,
      rewardText: 'Core controls unlocked'
    },
    {
      id: 'learning-core',
      title: 'Tune One Ingredient',
      description: 'Move a core slider and watch the recipe change.',
      recommendedTab: 'core',
      requirements: [
        { metric: 'actions.coreTune', min: 1, label: 'Adjust Feed, Kill, or Diffusion' },
        { metric: 'steps', min: 60, label: 'Let the changed recipe run' }
      ],
      holdMs: 500,
      rewardText: 'Preset library unlocked'
    },
    {
      id: 'learning-paint',
      title: 'Paint the Chemistry',
      description: 'Use the canvas or brush tools to add a local disturbance.',
      recommendedTab: 'brush',
      requirements: [
        { metric: 'actions.paint', min: 1, label: 'Paint directly on the canvas' },
        { metric: 'coverage', min: 0.04, label: 'Keep the pattern alive' }
      ],
      holdMs: 600,
      rewardText: 'Analysis meters unlocked'
    },
    {
      id: 'learning-presets',
      title: 'Try a Preset',
      description: 'Load one preset and compare the new pattern language.',
      recommendedTab: 'analysis',
      requirements: [
        { metric: 'actions.preset', min: 1, label: 'Choose any preset' },
        { metric: 'steps', min: 120, label: 'Let the preset develop' }
      ],
      holdMs: 600,
      rewardText: 'Dynamics controls unlocked'
    },
    {
      id: 'learning-full-lab',
      title: 'Open the Whole Lab',
      description: 'Use an advanced control or jump straight into the full simulator.',
      recommendedTab: 'dynamics',
      requirements: [
        { metric: 'actions.advancedTune', min: 1, label: 'Adjust a dynamics control' },
        { metric: 'coverage', min: 0.04, label: 'Keep a readable specimen' }
      ],
      holdMs: 800,
      rewardText: 'Full lab unlocked'
    }
  ];
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
