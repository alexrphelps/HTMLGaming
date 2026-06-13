class MapTopologyService {
    constructor(mapGen) {
        this.mapGen = mapGen;
    }

    repairMainConnectivity() {
        return this.ensureMainRoomConnectivity();
    }

    roomHasOpening(room) {
        const map = this.mapGen;
        for (const tile of map.getRoomFloorTiles(room)) {
            for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
                const nx = tile.x + dir.x;
                const ny = tile.y + dir.y;
                if (map.isTileInsideRoom(nx, ny, room)) continue;
                if (map.getTile(nx, ny) === 1) {
                    return true;
                }
            }
        }
        return false;
    }

    roomHasReachableFloor(room, reachable) {
        const map = this.mapGen;
        if (!room || !reachable) return false;
        return map.getRoomFloorTiles(room).some(tile => reachable.has(`${tile.x},${tile.y}`));
    }

    refreshMainReachableFloor() {
        const map = this.mapGen;
        if (!map.rooms.length) {
            map.mainReachableFloor = new Set();
            return map.mainReachableFloor;
        }

        const startAnchor = map.getRoomConnectionTile(map.rooms[0], map.rooms[0].center);
        const reachable = this.getReachableFloorSet(startAnchor);
        map.mainReachableFloor = reachable;
        return reachable;
    }

    pruneUnreachableIslands() {
        const map = this.mapGen;
        const reachable = this.refreshMainReachableFloor();
        if (reachable.size === 0) return;

        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                if (map.getTile(x, y) !== 1) continue;
                if (reachable.has(`${x},${y}`)) continue;
                if (map.bossRoom && map.isTileInsideRoom(x, y, map.bossRoom.room)) continue;
                map.grid[y * map.cols + x] = 0;
            }
        }

        map.rooms = map.rooms.filter(room => room.isBossRoom || map.getRoomFloorTiles(room).length > 0);
        this.refreshMainReachableFloor();
    }

    connectRooms(fromRoom, toRoom) {
        const map = this.mapGen;
        if (!fromRoom || !toRoom) return;

        const fromAnchor = map.getRoomConnectionTile(fromRoom, toRoom.center);
        const toAnchor = map.getRoomConnectionTile(toRoom, fromRoom.center);
        map.carveWobblyCorridor(fromAnchor, toAnchor);
    }

    getRoomReachableKey(room) {
        const map = this.mapGen;
        const anchor = map.getRoomConnectionTile(room, room && room.center);
        return `${Math.round(anchor.x)},${Math.round(anchor.y)}`;
    }

    findClosestConnectedRoom(targetRoom, connectedRooms) {
        if (!targetRoom || connectedRooms.length === 0) return null;

        let closest = connectedRooms[0];
        let closestDistance = Infinity;

        for (const room of connectedRooms) {
            const dx = room.center.x - targetRoom.center.x;
            const dy = room.center.y - targetRoom.center.y;
            const distance = dx * dx + dy * dy;
            if (distance < closestDistance) {
                closest = room;
                closestDistance = distance;
            }
        }

        return closest;
    }

    ensureRoomOpenings() {
        const map = this.mapGen;
        if (map.rooms.length < 2) return;

        for (let i = 0; i < map.rooms.length; i++) {
            const room = map.rooms[i];
            if (!this.roomHasOpening(room)) {
                const candidates = map.rooms.filter((candidate, index) => index !== i);
                const neighbor = this.findClosestConnectedRoom(room, candidates);
                this.connectRooms(neighbor, room);
            }
        }
    }

    ensureMainRoomConnectivity() {
        const map = this.mapGen;
        if (map.rooms.length < 2) return;

        let connected = this.refreshMainReachableFloor();

        for (let pass = 0; pass < map.rooms.length; pass++) {
            let repairedAny = false;

            for (const room of map.rooms) {
                if (this.roomHasReachableFloor(room, connected)) continue;

                const connectedRooms = map.rooms.filter(candidate => candidate !== room && this.roomHasReachableFloor(candidate, connected));
                const targetRoom = this.findClosestConnectedRoom(room, connectedRooms);
                if (!targetRoom) continue;

                this.connectRooms(targetRoom, room);
                connected = this.refreshMainReachableFloor();
                repairedAny = true;
            }

            if (!repairedAny) break;
        }

        this.ensureRoomOpenings();
        connected = this.refreshMainReachableFloor();

        for (const room of map.rooms) {
            if (this.roomHasReachableFloor(room, connected)) continue;

            const connectedRooms = map.rooms.filter(candidate => candidate !== room && this.roomHasReachableFloor(candidate, connected));
            const targetRoom = this.findClosestConnectedRoom(room, connectedRooms);
            if (!targetRoom) continue;

            this.connectRooms(targetRoom, room);
            connected = this.refreshMainReachableFloor();
        }
    }

    getReachableFloorSet(startTile = null) {
        const map = this.mapGen;
        const start = startTile || (map.rooms[0] && map.rooms[0].center);
        const reachable = new Set();
        if (!start) return reachable;

        const startX = Math.round(start.x);
        const startY = Math.round(start.y);
        if (map.getTile(startX, startY) !== 1) return reachable;

        const queue = [{ x: startX, y: startY }];
        reachable.add(`${startX},${startY}`);
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

        while (queue.length > 0) {
            const curr = queue.shift();
            for (const dir of dirs) {
                const nx = curr.x + dir.x;
                const ny = curr.y + dir.y;
                const key = `${nx},${ny}`;
                if (reachable.has(key) || map.getTile(nx, ny) !== 1) continue;
                reachable.add(key);
                queue.push({ x: nx, y: ny });
            }
        }

        return reachable;
    }

    getDisconnectedMainRooms() {
        const map = this.mapGen;
        if (map.rooms.length === 0) return [];
        const reachable = map.mainReachableFloor.size > 0
            ? map.mainReachableFloor
            : this.refreshMainReachableFloor();
        return map.rooms.filter(room => {
            if (room.isBossRoom) return false;
            return !this.roomHasReachableFloor(room, reachable);
        });
    }
}

if (typeof window !== 'undefined') {
    window.MapTopologyService = MapTopologyService;
}
