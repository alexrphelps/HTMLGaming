class MapPositionService {
    tileToWorld(mapGen, x, y) {
        return {
            x: x * mapGen.tileSize + mapGen.tileSize / 2,
            y: y * mapGen.tileSize + mapGen.tileSize / 2
        };
    }

    pickPositionsByDistance(validTiles, count, excludePositions, minDistance, toPosition) {
        const res = [];
        const copy = [...validTiles];
        const allExclusions = [...excludePositions];
        const minDistanceSq = minDistance * minDistance;

        while (res.length < count && copy.length > 0) {
            const idx = Math.floor(Math.random() * copy.length);
            const candidateTile = copy.splice(idx, 1)[0];
            const pos = toPosition(candidateTile);
            let tooClose = false;
            for (const ep of allExclusions) {
                const dx = ep.x - pos.x;
                const dy = ep.y - pos.y;
                if (dx * dx + dy * dy < minDistanceSq) {
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose) {
                res.push(pos);
                allExclusions.push(pos);
            }
        }
        return res;
    }
}

if (typeof window !== 'undefined') {
    window.MapPositionService = MapPositionService;
}
