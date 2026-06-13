class MapLayoutRegistry {
    constructor(mapGen) {
        this.mapGen = mapGen;
    }

    generate(layoutType) {
        const generators = {
            hub: () => this.generateHubLayout(),
            linear: () => this.generateLinearLayout(),
            cluster: () => this.generateClusterLayout(),
            ring: () => this.generateRingLayout(),
            structured: () => this.generateStructuredLayout(),
            sequential: () => this.generateSequentialLayout()
        };
        (generators[layoutType] || generators.sequential)();
    }

    generateSequentialLayout() {
        const map = this.mapGen;
        const numRooms = map.config.numRooms;
        const minRoomSize = map.config.minRoomSize;
        const maxRoomSize = map.config.maxRoomSize;

        for (let i = 0; i < numRooms; i++) {
            const isPerfectSquare = Math.random() < map.config.perfectSquareChance;
            const numRects = isPerfectSquare ? 1 : Math.floor(Math.random() * (map.config.blobMaxRects - map.config.blobMinRects + 1)) + map.config.blobMinRects;
            let roomBounds = null;
            const rects = [];

            const xRange = map.getCenterRange(map.cols, maxRoomSize);
            const yRange = map.getCenterRange(map.rows, maxRoomSize);
            const cx = Math.floor(Math.random() * Math.max(1, xRange.max - xRange.min + 1)) + xRange.min;
            const cy = Math.floor(Math.random() * Math.max(1, yRange.max - yRange.min + 1)) + yRange.min;

            for (let r = 0; r < numRects; r++) {
                const width = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
                const height = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
                const rx = cx + Math.floor(Math.random() * (width / 2)) - Math.floor(width / 4);
                const ry = cy + Math.floor(Math.random() * (height / 2)) - Math.floor(height / 4);

                rects.push({ x: rx, y: ry, width, height });

                if (!roomBounds) {
                    roomBounds = { x: rx, y: ry, right: rx + width, bottom: ry + height };
                } else {
                    roomBounds.x = Math.min(roomBounds.x, rx);
                    roomBounds.y = Math.min(roomBounds.y, ry);
                    roomBounds.right = Math.max(roomBounds.right, rx + width);
                    roomBounds.bottom = Math.max(roomBounds.bottom, ry + height);
                }
            }

            const newRoom = {
                rects,
                x: roomBounds.x,
                y: roomBounds.y,
                width: roomBounds.right - roomBounds.x,
                height: roomBounds.bottom - roomBounds.y,
                center: { x: cx, y: cy }
            };

            let failed = false;
            for (const room of map.rooms) {
                if (newRoom.x <= room.x + room.width + 2 && newRoom.x + newRoom.width + 2 >= room.x &&
                    newRoom.y <= room.y + room.height + 2 && newRoom.y + newRoom.height + 2 >= room.y) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                map.carveRoom(newRoom);
                if (map.rooms.length > 0) {
                    map.carveWobblyCorridor(map.rooms[map.rooms.length - 1].center, newRoom.center);
                }
                map.rooms.push(newRoom);
            }
        }
    }

    generateHubLayout() {
        const map = this.mapGen;
        const centerX = Math.floor(map.cols / 2);
        const centerY = Math.floor(map.rows / 2);
        const hub = this.tryAddRoom(centerX, centerY, null, {
            width: map.config.maxRoomSize + 4,
            height: map.config.maxRoomSize + 4,
            forceSquare: true,
            padding: 0
        });

        const spokes = Math.max(1, map.config.numRooms - 1);
        const radius = Math.min(map.cols, map.rows) * 0.34;
        for (let i = 0; i < spokes; i++) {
            const angle = (Math.PI * 2 * i) / spokes;
            const wobble = (Math.random() - 0.5) * radius * 0.35;
            const x = Math.round(centerX + Math.cos(angle) * (radius + wobble));
            const y = Math.round(centerY + Math.sin(angle) * (radius + wobble));
            this.tryAddRoom(x, y, hub || map.rooms[0]);
        }
    }

    generateLinearLayout() {
        const map = this.mapGen;
        let previous = null;
        const count = map.config.numRooms;
        const yMid = Math.floor(map.rows / 2);
        const amplitude = Math.max(4, Math.floor(map.rows * 0.22));

        for (let i = 0; i < count; i++) {
            const progress = count <= 1 ? 0.5 : i / (count - 1);
            const xBounds = map.getCenterRange(map.cols, map.config.maxRoomSize);
            const yBounds = map.getCenterRange(map.rows, map.config.maxRoomSize);
            const x = Math.round(xBounds.min + progress * Math.max(0, xBounds.max - xBounds.min));
            const wave = Math.sin(progress * Math.PI * 2) * amplitude;
            const y = map.clamp(Math.round(yMid + wave + (Math.random() - 0.5) * 8), yBounds.min, yBounds.max);
            const room = this.tryAddRoom(x, y, previous, { padding: 1 });
            if (room) previous = room;
        }
    }

    generateClusterLayout() {
        const map = this.mapGen;
        const clusterCenters = [
            { x: Math.floor(map.cols * 0.25), y: Math.floor(map.rows * 0.30) },
            { x: Math.floor(map.cols * 0.72), y: Math.floor(map.rows * 0.35) },
            { x: Math.floor(map.cols * 0.48), y: Math.floor(map.rows * 0.72) }
        ];
        const roomsPerCluster = Math.ceil(map.config.numRooms / clusterCenters.length);
        const clusterAnchors = [];

        for (let c = 0; c < clusterCenters.length; c++) {
            let previous = null;
            for (let i = 0; i < roomsPerCluster && map.rooms.length < map.config.numRooms; i++) {
                const spread = i === 0 ? 0 : Math.min(map.cols, map.rows) * 0.12;
                const x = Math.round(clusterCenters[c].x + (Math.random() - 0.5) * spread * 2);
                const y = Math.round(clusterCenters[c].y + (Math.random() - 0.5) * spread * 2);
                const room = this.tryAddRoom(x, y, previous, { padding: 1 });
                if (room) {
                    previous = room;
                    if (!clusterAnchors[c]) clusterAnchors[c] = room;
                }
            }
        }

        for (let i = 1; i < clusterAnchors.length; i++) {
            if (clusterAnchors[i - 1] && clusterAnchors[i]) {
                map.carveWobblyCorridor(clusterAnchors[i - 1].center, clusterAnchors[i].center);
            }
        }
    }

    generateStructuredLayout() {
        const map = this.mapGen;
        const count = map.config.numRooms;
        const columns = Math.max(3, Math.ceil(Math.sqrt(count)));
        const rows = Math.ceil(count / columns);
        let previous = null;

        for (let i = 0; i < count; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = Math.round(((col + 1) / (columns + 1)) * map.cols);
            const y = Math.round(((row + 1) / (rows + 1)) * map.rows);
            const room = this.tryAddRoom(x, y, previous, { forceSquare: true, padding: 1 });
            if (room) previous = room;
        }
    }

    generateRingLayout() {
        const variant = this.mapGen.chooseRingLayoutVariant
            ? this.mapGen.chooseRingLayoutVariant()
            : this.chooseRingLayoutVariant();
        this.mapGen.lastRingLayoutVariant = variant;

        if (variant === 'double_side') {
            this.buildDoubleSideRingLayout();
            return;
        }

        if (variant === 'outer_expansion') {
            this.buildOuterExpansionRingLayout();
            return;
        }

        this.buildSingleRingLayout();
    }

    chooseRingLayoutVariant() {
        const weights = this.mapGen.config.ringVariantWeights || { single: 1 };
        const entries = Object.entries(weights).filter(([, weight]) => Number.isFinite(weight) && weight > 0);

        if (entries.length === 0) {
            return 'single';
        }

        const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let roll = Math.random() * totalWeight;

        for (const [variant, weight] of entries) {
            if (roll < weight) {
                return variant;
            }
            roll -= weight;
        }

        return entries[entries.length - 1][0];
    }

    buildSingleRingLayout() {
        const map = this.mapGen;
        const centerX = Math.floor(map.cols / 2);
        const centerY = Math.floor(map.rows / 2);
        this.buildRingRoomCluster({
            centerX,
            centerY,
            ringRadius: map.config.ringRadiusTiles || Math.floor(Math.min(map.cols, map.rows) * 0.25),
            ringThickness: map.config.ringThicknessTiles || 8,
            outerRooms: map.config.outerBranchRooms || 4,
            innerRooms: map.config.innerBranchRooms || 3,
            outerConnectorWidth: Math.max(3, map.config.corridorWidth || 3),
            innerPathWidth: map.config.innerPathWidth || 2
        });
    }

    buildDoubleSideRingLayout() {
        const map = this.mapGen;
        const centerY = Math.floor(map.rows / 2);
        const primaryRadius = map.config.ringRadiusTiles || 28;
        const secondaryRadius = map.config.secondaryRingRadiusTiles || primaryRadius;
        const primaryThickness = map.config.ringThicknessTiles || 8;
        const secondaryThickness = map.config.secondaryRingThicknessTiles || primaryThickness;
        const separation = map.config.ringSeparationTiles || 8;
        const primaryOuter = primaryRadius + primaryThickness / 2;
        const secondaryOuter = secondaryRadius + secondaryThickness / 2;
        const centerDistance = primaryOuter + secondaryOuter + separation;
        const centerX = Math.floor(map.cols / 2);
        const leftCenterX = Math.round(centerX - centerDistance / 2);
        const rightCenterX = Math.round(centerX + centerDistance / 2);
        const bridgeWidth = Math.max(3, map.config.corridorWidth || 3);
        const innerPathWidth = map.config.innerPathWidth || 2;
        const totalOuterRooms = map.config.doubleRingOuterBranchRooms || ((map.config.outerBranchRooms || 4) + 2);
        const totalInnerRooms = map.config.doubleRingInnerBranchRooms || ((map.config.innerBranchRooms || 3) + 2);
        const leftOuterRooms = Math.ceil(totalOuterRooms / 2);
        const rightOuterRooms = Math.floor(totalOuterRooms / 2);
        const leftInnerRooms = Math.ceil(totalInnerRooms / 2);
        const rightInnerRooms = Math.floor(totalInnerRooms / 2);

        this.buildRingRoomCluster({
            centerX: leftCenterX,
            centerY,
            ringRadius: primaryRadius,
            ringThickness: primaryThickness,
            outerRooms: leftOuterRooms,
            innerRooms: leftInnerRooms,
            outerConnectorWidth: bridgeWidth,
            innerPathWidth,
            outerAngles: this.getArcAngles(leftOuterRooms, Math.PI, 2.4),
            innerAngles: this.getArcAngles(leftInnerRooms, 0, 1.8)
        });

        this.buildRingRoomCluster({
            centerX: rightCenterX,
            centerY,
            ringRadius: secondaryRadius,
            ringThickness: secondaryThickness,
            outerRooms: rightOuterRooms,
            innerRooms: rightInnerRooms,
            outerConnectorWidth: bridgeWidth,
            innerPathWidth,
            outerAngles: this.getArcAngles(rightOuterRooms, 0, 2.4),
            innerAngles: this.getArcAngles(rightInnerRooms, Math.PI, 1.8)
        });

        const bridgeYOffset = Math.max(3, Math.floor(Math.min(primaryThickness, secondaryThickness) / 2));
        const bridgeAngles = [
            Math.atan2(-bridgeYOffset, primaryRadius),
            Math.atan2(bridgeYOffset, primaryRadius)
        ];

        for (const angle of bridgeAngles) {
            const leftAnchor = {
                x: Math.round(leftCenterX + Math.cos(angle) * primaryRadius),
                y: Math.round(centerY + Math.sin(angle) * primaryRadius)
            };
            const rightAnchor = {
                x: Math.round(rightCenterX - Math.cos(angle) * secondaryRadius),
                y: Math.round(centerY + Math.sin(angle) * secondaryRadius)
            };
            map.carveCorridorWithWidth(leftAnchor, rightAnchor, bridgeWidth, 0);
        }
    }

    buildOuterExpansionRingLayout() {
        const map = this.mapGen;
        const centerX = Math.floor(map.cols / 2);
        const centerY = Math.floor(map.rows / 2);
        const mainRadius = map.config.ringRadiusTiles || 28;
        const mainThickness = map.config.ringThicknessTiles || 8;
        const outerRadius = map.config.outerExpansionRadiusTiles || (mainRadius + 20);
        const outerThickness = map.config.outerExpansionThicknessTiles || mainThickness;
        const bridgeWidth = Math.max(3, map.config.corridorWidth || 3);
        const innerPathWidth = map.config.innerPathWidth || 2;
        const firstOuterRooms = map.config.outerExpansionOuterBranchRooms || map.config.outerBranchRooms || 4;
        const innerRooms = map.config.outerExpansionInnerBranchRooms || ((map.config.innerBranchRooms || 3) + 3);
        const extraOuterRooms = map.config.outerExpansionExtraOuterRooms || 3;

        this.buildRingRoomCluster({
            centerX,
            centerY,
            ringRadius: mainRadius,
            ringThickness: mainThickness,
            outerRooms: firstOuterRooms,
            innerRooms,
            outerConnectorWidth: bridgeWidth,
            innerPathWidth
        });

        this.carveRingBand(centerX, centerY, Math.max(3, outerRadius - outerThickness / 2), outerRadius + outerThickness / 2);

        for (const angle of this.getSpacedAngles(4, 0.04, Math.PI / 4)) {
            const innerAnchor = {
                x: Math.round(centerX + Math.cos(angle) * mainRadius),
                y: Math.round(centerY + Math.sin(angle) * mainRadius)
            };
            const outerAnchor = {
                x: Math.round(centerX + Math.cos(angle) * outerRadius),
                y: Math.round(centerY + Math.sin(angle) * outerRadius)
            };
            map.carveCorridorWithWidth(innerAnchor, outerAnchor, bridgeWidth, 0);
        }

        const outerAngles = this.getSpacedAngles(extraOuterRooms, 0.05, Math.PI / Math.max(3, extraOuterRooms));
        for (const angle of outerAngles) {
            const room = this.tryAddRingBranchRoom(angle, 1, centerX, centerY, outerRadius, bridgeWidth);
            if (room) {
                map.rooms.push(room);
            }
        }
    }

    buildRingRoomCluster(options) {
        const map = this.mapGen;
        const {
            centerX,
            centerY,
            ringRadius,
            ringThickness,
            outerRooms,
            innerRooms,
            outerConnectorWidth,
            innerPathWidth,
            outerAngles = this.getSpacedAngles(outerRooms, 0.08),
            innerAngles = this.getSpacedAngles(innerRooms, 0.12, Math.PI / Math.max(3, innerRooms))
        } = options;
        const ringInner = Math.max(3, ringRadius - ringThickness / 2);
        const ringOuter = ringRadius + ringThickness / 2;
        const innerRoomRefs = [];

        this.carveRingBand(centerX, centerY, ringInner, ringOuter);

        for (const angle of outerAngles) {
            const room = this.tryAddRingBranchRoom(angle, 1, centerX, centerY, ringRadius, outerConnectorWidth);
            if (room) {
                map.rooms.push(room);
            }
        }

        for (const angle of innerAngles) {
            const room = this.tryAddRingBranchRoom(angle, -1, centerX, centerY, ringRadius, innerPathWidth);
            if (room) {
                map.rooms.push(room);
                innerRoomRefs.push(room);
            }
        }

        this.connectRoomGroup(innerRoomRefs, innerPathWidth);
        return innerRoomRefs;
    }

    connectRoomGroup(rooms, corridorWidth) {
        const map = this.mapGen;
        for (let i = 1; i < rooms.length; i++) {
            const prev = rooms[i - 1];
            const curr = rooms[i];
            const prevAnchor = map.getRoomConnectionTile(prev, curr.center);
            const currAnchor = map.getRoomConnectionTile(curr, prev.center);
            map.carveCorridorWithWidth(prevAnchor, currAnchor, corridorWidth, 0);
        }
    }

    getArcAngles(count, centerAngle, spread, jitter = 0.05) {
        if (count <= 0) {
            return [];
        }
        if (count === 1) {
            return [centerAngle];
        }

        const start = centerAngle - spread / 2;
        const step = spread / (count - 1);
        return Array.from({ length: count }, (_, index) => {
            const base = start + index * step;
            return base + (Math.random() - 0.5) * spread * jitter;
        });
    }

    getRandomRoomCenter() {
        const map = this.mapGen;
        const maxRoomSize = map.config.maxRoomSize;
        const xBounds = map.getCenterRange(map.cols, maxRoomSize);
        const yBounds = map.getCenterRange(map.rows, maxRoomSize);

        return {
            x: Math.floor(Math.random() * Math.max(1, xBounds.max - xBounds.min + 1)) + xBounds.min,
            y: Math.floor(Math.random() * Math.max(1, yBounds.max - yBounds.min + 1)) + yBounds.min
        };
    }

    tryAddRoom(cx, cy, connectTo = null, options = {}) {
        const map = this.mapGen;
        const newRoom = this.createRoom(cx, cy, options);
        if (!newRoom || map.roomOverlaps(newRoom, options.padding ?? 2)) {
            return null;
        }

        map.carveRoom(newRoom);
        if (connectTo) {
            map.connectRooms(connectTo, newRoom);
        }
        map.rooms.push(newRoom);
        return newRoom;
    }

    createRoom(cx, cy, options = {}) {
        const map = this.mapGen;
        const minRoomSize = map.config.minRoomSize;
        const maxRoomSize = map.config.maxRoomSize;
        const forceSquare = options.forceSquare || Math.random() < map.config.perfectSquareChance;
        const minRects = map.config.blobMinRects || 1;
        const maxRects = map.config.blobMaxRects || minRects;
        const numRects = forceSquare ? 1 : Math.floor(Math.random() * (maxRects - minRects + 1)) + minRects;
        let roomBounds = null;
        const rects = [];

        const centerXRange = map.getCenterRange(map.cols, maxRoomSize);
        const centerYRange = map.getCenterRange(map.rows, maxRoomSize);
        cx = map.clamp(Math.round(cx), centerXRange.min, centerXRange.max);
        cy = map.clamp(Math.round(cy), centerYRange.min, centerYRange.max);

        for (let r = 0; r < numRects; r++) {
            const width = options.width || Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let height = options.height || (forceSquare ? width : Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize);

            if (forceSquare && !options.height) height = width;

            let rx = cx - Math.floor(width / 2);
            let ry = cy - Math.floor(height / 2);
            if (r > 0) {
                rx += Math.floor(Math.random() * (width / 2)) - Math.floor(width / 4);
                ry += Math.floor(Math.random() * (height / 2)) - Math.floor(height / 4);
            }

            const rectRange = map.getRectRange(width, height);
            rx = map.clamp(rx, rectRange.minX, rectRange.maxX);
            ry = map.clamp(ry, rectRange.minY, rectRange.maxY);

            rects.push({ x: rx, y: ry, width, height });

            if (!roomBounds) {
                roomBounds = { x: rx, y: ry, right: rx + width, bottom: ry + height };
            } else {
                roomBounds.x = Math.min(roomBounds.x, rx);
                roomBounds.y = Math.min(roomBounds.y, ry);
                roomBounds.right = Math.max(roomBounds.right, rx + width);
                roomBounds.bottom = Math.max(roomBounds.bottom, ry + height);
            }
        }

        if (!roomBounds) return null;

        return {
            rects,
            x: roomBounds.x,
            y: roomBounds.y,
            width: roomBounds.right - roomBounds.x,
            height: roomBounds.bottom - roomBounds.y,
            center: { x: cx, y: cy }
        };
    }

    carveRingBand(centerX, centerY, innerRadius, outerRadius) {
        const map = this.mapGen;
        for (let y = 0; y < map.rows; y++) {
            for (let x = 0; x < map.cols; x++) {
                if (!map.isInsidePlayableArea(x, y)) continue;
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.hypot(dx, dy);
                if (distance >= innerRadius && distance <= outerRadius) {
                    map.grid[y * map.cols + x] = 1;
                }
            }
        }
    }

    getSpacedAngles(count, jitter = 0, offset = 0) {
        const angles = [];
        for (let i = 0; i < count; i++) {
            const base = offset + (Math.PI * 2 * i) / count;
            angles.push(base + (Math.random() - 0.5) * Math.PI * 2 * jitter);
        }
        return angles;
    }

    tryAddRingBranchRoom(angle, direction, centerX, centerY, ringRadius, connectorWidth) {
        const map = this.mapGen;
        const width = Math.floor(Math.random() * (map.config.maxRoomSize - map.config.minRoomSize + 1)) + map.config.minRoomSize;
        const height = Math.floor(Math.random() * (map.config.maxRoomSize - map.config.minRoomSize + 1)) + map.config.minRoomSize;
        const roomHalfSpan = Math.max(width, height) / 2;
        const connectorGap = direction > 0 ? 4 : 5;
        const targetRadius = direction > 0
            ? ringRadius + roomHalfSpan + connectorGap
            : ringRadius - roomHalfSpan - connectorGap;

        const cx = centerX + Math.cos(angle) * targetRadius;
        const cy = centerY + Math.sin(angle) * targetRadius;
        const room = map.createRectRoomAt(cx, cy, width, height);
        if (map.roomOverlaps(room, 2)) return null;

        map.carveRoom(room);
        const ringAnchor = {
            x: Math.round(centerX + Math.cos(angle) * ringRadius),
            y: Math.round(centerY + Math.sin(angle) * ringRadius)
        };
        const roomAnchor = map.getRoomConnectionTile(room, ringAnchor);
        map.carveCorridorWithWidth(roomAnchor, ringAnchor, connectorWidth, 0);
        return room;
    }
}

if (typeof window !== 'undefined') {
    window.MapLayoutRegistry = MapLayoutRegistry;
}
