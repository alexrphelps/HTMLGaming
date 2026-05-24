(function(ns) {
  function bootstrap() {
    const view = new ns.SimulatorView(document);
    const state = new ns.ReactionDiffusionState(view.canvas.width, view.canvas.height);
    const simulation = new ns.ReactionDiffusionSimulation(state);
    const renderer = new ns.CanvasRenderer(view.canvas, state, simulation);
    const analyzer = new ns.MissionAnalyzer(state);
    let storage = null;
    try {
      storage = window.localStorage;
    } catch (error) {
      console.warn('Mission progress storage is unavailable:', error);
    }
    const missionManager = new ns.MissionManager(ns.MISSIONS, storage);
    const learningMissionManager = new ns.MissionManager(ns.LEARNING_MISSIONS, storage, {
      storageKey: 'reaction-diffusion-learning-v1'
    });
    const experienceManager = new ns.ExperienceManager({
      documentRef: document,
      storage,
      learningManager: learningMissionManager,
      missionManager
    });
    const controller = new ns.SimulatorController({
      state,
      simulation,
      renderer,
      view,
      presets: ns.PRESETS,
      analyzer,
      missionManager,
      learningMissionManager,
      experienceManager
    });

    ns.app = { state, simulation, renderer, analyzer, missionManager, learningMissionManager, experienceManager, view, controller };
    controller.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
