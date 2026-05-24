class MapLayoutRegistry {
    constructor(mapGen) {
        this.mapGen = mapGen;
    }

    generate(layoutType) {
        const generators = {
            hub: () => this.mapGen.generateHubLayout(),
            linear: () => this.mapGen.generateLinearLayout(),
            cluster: () => this.mapGen.generateClusterLayout(),
            ring: () => this.mapGen.generateRingLayout(),
            structured: () => this.mapGen.generateStructuredLayout(),
            sequential: () => this.mapGen.generateSequentialLayout()
        };
        (generators[layoutType] || generators.sequential)();
    }
}

if (typeof window !== 'undefined') {
    window.MapLayoutRegistry = MapLayoutRegistry;
}
