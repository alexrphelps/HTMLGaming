(function(ns) {
  class MissionAnalyzer {
    constructor(state) {
      this.state = state;
    }

    analyze(stats, params, context = {}) {
      const actions = { ...(context.actionCounts || {}) };

      return {
        ...stats,
        presetKey: context.presetKey || null,
        isCustom: Boolean(context.isCustom),
        model: params.model,
        sat: params.S,
        exp: params.n,
        feed: params.F,
        kill: params.K,
        gain: params.G,
        drift: params.driftMag,
        edgeActivity: stats.avgChange,
        activeComponents: 0,
        largestComponentRatio: 0,
        actions
      };
    }
  }

  ns.MissionAnalyzer = MissionAnalyzer;
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
