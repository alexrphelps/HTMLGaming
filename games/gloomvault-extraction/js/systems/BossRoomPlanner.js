class BossRoomPlanner {
    constructor(mapGen) {
        this.mapGen = mapGen;
    }

    tryGenerate() {
        return this.mapGen.tryGenerateBossRoom();
    }

    buildCandidate(anchor, dir, roomSize, corridorLength) {
        return this.mapGen.buildBossRoomCandidate(anchor, dir, roomSize, corridorLength);
    }

    canPlace(room) {
        return this.mapGen.canPlaceBossRoom(room);
    }
}

if (typeof window !== 'undefined') {
    window.BossRoomPlanner = BossRoomPlanner;
}
