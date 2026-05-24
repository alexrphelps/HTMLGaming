(function(ns) {
  ns.CONTROL_IDS = [
    'model', 'viewMode', 'feed', 'kill', 'diffU', 'diffV', 'gain', 'exp', 'sat', 'noise',
    'flowX', 'flowY', 'anisotropy', 'diag', 'dt', 'speed', 'seedDensity', 'seedRadius',
    'brushSize', 'palette'
  ];

  ns.VALUE_TARGETS = {
    feed: 'feedVal',
    kill: 'killVal',
    diffU: 'diffUVal',
    diffV: 'diffVVal',
    gain: 'gainVal',
    exp: 'expVal',
    sat: 'satVal',
    noise: 'noiseVal',
    flowX: 'flowXVal',
    flowY: 'flowYVal',
    anisotropy: 'anisotropyVal',
    diag: 'diagVal',
    dt: 'dtVal',
    speed: 'speedVal',
    seedDensity: 'seedDensityVal',
    seedRadius: 'seedRadiusVal',
    brushSize: 'brushSizeVal'
  };

  ns.formatControlValue = function(key, value) {
    const number = Number(value);
    if (key === 'speed') return `${value}x`;
    if (['seedDensity', 'seedRadius', 'brushSize'].includes(key)) return String(value);
    if (key === 'noise') return number.toFixed(4);
    if (['feed', 'kill'].includes(key)) return number.toFixed(3);
    if (key === 'diag') return number.toFixed(3);
    return number.toFixed(2);
  };
})(window.ReactionDiffusionSimulator = window.ReactionDiffusionSimulator || {});
