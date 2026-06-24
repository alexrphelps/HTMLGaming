(function (ns) {
    const BASE_RANGE = 90;
    const DOCK_RANGE = 190;

    function rangeFor(state, target) {
        if (target?.kind === 'station' || target?.type === 'station') return DOCK_RANGE;
        const fitted = state ? ns.Progression.calculateShipStats(state).interactionRange : BASE_RANGE;
        return Math.max(BASE_RANGE, fitted || BASE_RANGE);
    }
    function inRange(state, target, position) { return Boolean(target && position && ns.MathUtil.distance(target, position) <= rangeFor(state, target)); }

    ns.Interactions = { BASE_RANGE, DOCK_RANGE, rangeFor, inRange };
})(window.FrontierWayfarer);
