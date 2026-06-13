class BossRoomPlanner {
    constructor(mapGen) {
        this.mapGen = mapGen;
    }

    tryGenerate() {
        const mapGen = this.mapGen;
        const chance = mapGen.config.bossRoomChance ?? 0.25;
        if (mapGen.rooms.length < 2 || Math.random() >= chance) return null;

        const anchors = mapGen.rooms.slice(1);
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];
        const roomSize = Math.min(11, Math.max(7, mapGen.config.maxRoomSize || 9));
        const corridorLength = 4;

        for (let attempt = 0; attempt < 80; attempt++) {
            const anchor = anchors[Math.floor(Math.random() * anchors.length)];
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const candidate = this.buildCandidate(anchor, dir, roomSize, corridorLength);

            if (!candidate || !this.canPlace(candidate.room) || !mapGen.canReachBossRoomCandidate(candidate, anchor)) continue;
            const buttonPositions = mapGen.getBossRoomButtonPositions(3, candidate.room);
            if (buttonPositions.length < 3) continue;

            mapGen.carveRoom(candidate.room);
            for (const tile of candidate.corridorTiles) {
                mapGen.grid[tile.y * mapGen.cols + tile.x] = 1;
            }

            mapGen.grid[candidate.entrance.y * mapGen.cols + candidate.entrance.x] = 0;

            mapGen.bossRoom = {
                room: candidate.room,
                entranceTile: candidate.entrance,
                entranceWorld: mapGen.tileToWorld(candidate.entrance.x, candidate.entrance.y),
                unlocked: false,
                opened: false,
                bossSpawn: mapGen.tileToWorld(candidate.room.center.x, candidate.room.center.y),
                chestSpawn: mapGen.tileToWorld(candidate.chestTile.x, candidate.chestTile.y),
                chestSpawns: mapGen.getBossRoomChestPositions(candidate.room, candidate.chestTile),
                buttonPositions
            };
            mapGen.refreshMainReachableFloor();
            return mapGen.bossRoom;
        }

        return null;
    }

    buildCandidate(anchor, dir, roomSize, corridorLength) {
        const mapGen = this.mapGen;
        const anchorCenter = {
            x: Math.round(anchor.center.x),
            y: Math.round(anchor.center.y)
        };
        const half = Math.floor(roomSize / 2);
        let entrance;
        let roomX;
        let roomY;
        const corridorTiles = [];

        if (dir.x !== 0) {
            const anchorEdge = dir.x > 0 ? anchor.x + anchor.width - 1 : anchor.x;
            const entranceX = anchorEdge + dir.x * (corridorLength + 1);
            entrance = { x: entranceX, y: anchorCenter.y };
            roomX = dir.x > 0 ? entrance.x + 1 : entrance.x - roomSize;
            roomY = entrance.y - half;

            for (let step = 1; step <= corridorLength; step++) {
                corridorTiles.push({ x: anchorEdge + dir.x * step, y: entrance.y });
            }
        } else {
            const anchorEdge = dir.y > 0 ? anchor.y + anchor.height - 1 : anchor.y;
            const entranceY = anchorEdge + dir.y * (corridorLength + 1);
            entrance = { x: anchorCenter.x, y: entranceY };
            roomX = entrance.x - half;
            roomY = dir.y > 0 ? entrance.y + 1 : entrance.y - roomSize;

            for (let step = 1; step <= corridorLength; step++) {
                corridorTiles.push({ x: entrance.x, y: anchorEdge + dir.y * step });
            }
        }

        const room = {
            rects: [{ x: roomX, y: roomY, width: roomSize, height: roomSize }],
            x: roomX,
            y: roomY,
            width: roomSize,
            height: roomSize,
            center: { x: roomX + half, y: roomY + half },
            isBossRoom: true
        };

        const chestTile = {
            x: mapGen.clamp(room.center.x + (dir.x !== 0 ? 0 : 2), room.x + 2, room.x + room.width - 3),
            y: mapGen.clamp(room.center.y + (dir.y !== 0 ? 0 : 2), room.y + 2, room.y + room.height - 3)
        };

        return { room, entrance, corridorTiles, chestTile };
    }

    canPlace(room) {
        const mapGen = this.mapGen;
        const padding = mapGen.getEdgePaddingTiles();
        if (room.x < padding || room.y < padding || room.x + room.width > mapGen.cols - padding || room.y + room.height > mapGen.rows - padding) {
            return false;
        }

        for (let y = room.y - padding; y <= room.y + room.height + padding - 1; y++) {
            for (let x = room.x - padding; x <= room.x + room.width + padding - 1; x++) {
                if (mapGen.getTile(x, y) !== 0) return false;
            }
        }

        return true;
    }
}

if (typeof window !== 'undefined') {
    window.BossRoomPlanner = BossRoomPlanner;
}
