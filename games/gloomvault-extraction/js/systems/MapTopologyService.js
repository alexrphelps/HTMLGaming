class MapTopologyService {
    constructor(mapGen) {
        this.mapGen = mapGen;
    }

    repairMainConnectivity() {
        return this.mapGen.ensureMainRoomConnectivity();
    }

    pruneUnreachableIslands() {
        return this.mapGen.pruneUnreachableIslands();
    }

    refreshMainReachableFloor() {
        return this.mapGen.refreshMainReachableFloor();
    }
}

if (typeof window !== 'undefined') {
    window.MapTopologyService = MapTopologyService;
}
