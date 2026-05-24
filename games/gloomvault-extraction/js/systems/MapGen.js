class MapGen {
    constructor(config, tileSize) {
        this.config = config;
        this.cols = config.cols;
        this.rows = config.rows;
        this.tileSize = tileSize;
        this.grid = []; // 0 = wall, 1 = floor, 2 = door, 3 = hazard
        this.visitedGrid = []; // true if tile has been revealed by player
        this.rooms = [];
        this.bossRoom = null;
        this.mainReachableFloor = new Set();
    }

    getEdgePaddingTiles() {
        const configuredPadding = Number.isFinite(this.config.edgePaddingTiles)
            ? Math.max(1, Math.floor(this.config.edgePaddingTiles))
            : 3;
        const maxAllowed = Math.max(1, Math.floor((Math.min(this.cols, this.rows) - 2) / 2) - 1);
        return Math.min(configuredPadding, maxAllowed);
    }

    getAxisPadding(axisLength, span = 1) {
        const maxAllowed = Math.max(1, Math.floor((axisLength - span - 1) / 2));
        return Math.min(this.getEdgePaddingTiles(), maxAllowed);
    }

    getCenterRange(axisLength, maxRoomSize) {
        const padding = this.getAxisPadding(axisLength, maxRoomSize);
        const min = maxRoomSize + padding;
        const max = axisLength - maxRoomSize - padding - 1;

        if (min <= max) {
            return { min, max };
        }

        const fallbackMin = maxRoomSize + 1;
        const fallbackMax = axisLength - maxRoomSize - 2;
        return {
            min: Math.min(fallbackMin, fallbackMax),
            max: Math.max(fallbackMin, fallbackMax)
        };
    }

    getRectRange(width, height) {
        const paddingX = this.getAxisPadding(this.cols, width);
        const paddingY = this.getAxisPadding(this.rows, height);
        return {
            minX: paddingX,
            maxX: Math.max(paddingX, this.cols - width - paddingX),
            minY: paddingY,
            maxY: Math.max(paddingY, this.rows - height - paddingY)
        };
    }

    isInsidePlayableArea(x, y) {
        const padding = this.getEdgePaddingTiles();
        return x >= padding && x < this.cols - padding && y >= padding && y < this.rows - padding;
    }

    generate() {
        const retryLimit = Math.max(1, this.config.generationRetryLimit || 1);
        let bestState = null;

        for (let attempt = 0; attempt < retryLimit; attempt++) {
            this.runGenerationPass();
            const summary = this.getFinalRoomValidationSummary();

            if (summary.inRange) {
                return;
            }

            if (!bestState || summary.score < bestState.score || (summary.score === bestState.score && summary.roomCount > bestState.roomCount)) {
                bestState = this.cloneGenerationState(summary);
            }
        }

        if (bestState) {
            this.restoreGenerationState(bestState);
        }
    }

    cloneRoom(room) {
        if (!room) return room;
        return {
            ...room,
            center: room.center ? { ...room.center } : room.center,
            rects: room.rects ? room.rects.map(rect => ({ ...rect })) : room.rects
        };
    }

    cloneBossRoom(bossRoom) {
        if (!bossRoom) return null;
        return {
            ...bossRoom,
            room: this.cloneRoom(bossRoom.room),
            entranceTile: bossRoom.entranceTile ? { ...bossRoom.entranceTile } : bossRoom.entranceTile,
            entranceWorld: bossRoom.entranceWorld ? { ...bossRoom.entranceWorld } : bossRoom.entranceWorld,
            bossSpawn: bossRoom.bossSpawn ? { ...bossRoom.bossSpawn } : bossRoom.bossSpawn,
            chestSpawn: bossRoom.chestSpawn ? { ...bossRoom.chestSpawn } : bossRoom.chestSpawn,
            chestSpawns: bossRoom.chestSpawns ? bossRoom.chestSpawns.map(pos => ({ ...pos })) : bossRoom.chestSpawns,
            buttonPositions: bossRoom.buttonPositions ? bossRoom.buttonPositions.map(pos => ({ ...pos })) : bossRoom.buttonPositions
        };
    }

    cloneGenerationState(summary = {}) {
        return {
            score: summary.score || 0,
            roomCount: summary.roomCount || 0,
            grid: [...this.grid],
            visitedGrid: [...this.visitedGrid],
            rooms: this.rooms.map(room => this.cloneRoom(room)),
            bossRoom: this.cloneBossRoom(this.bossRoom),
            mainReachableFloor: new Set(this.mainReachableFloor)
        };
    }

    restoreGenerationState(state) {
        if (!state) return;
        this.grid = [...state.grid];
        this.visitedGrid = [...state.visitedGrid];
        this.rooms = state.rooms.map(room => this.cloneRoom(room));
        this.bossRoom = this.cloneBossRoom(state.bossRoom);
        this.mainReachableFloor = new Set(state.mainReachableFloor);
    }

    runGenerationPass() {
        this.grid = new Array(this.cols * this.rows).fill(0);
        this.visitedGrid = new Array(this.cols * this.rows).fill(false);
        this.rooms = [];
        this.bossRoom = null;
        this.mainReachableFloor = new Set();

        const layoutType = this.config.layoutType || 'sequential';
        const layoutGenerators = {
            hub: () => this.generateHubLayout(),
            linear: () => this.generateLinearLayout(),
            cluster: () => this.generateClusterLayout(),
            ring: () => this.generateRingLayout(),
            structured: () => this.generateStructuredLayout(),
            sequential: () => this.generateSequentialLayout()
        };
        (layoutGenerators[layoutType] || layoutGenerators.sequential)();

        // Apply a single pass of cellular automata to smooth out some sharp edges while keeping others
        if (this.config.smoothingPasses > 0) {
            this.applyCellularAutomata(this.config.smoothingPasses);
        }

        this.ensureMainRoomConnectivity();
        this.pruneUnreachableIslands();
        this.tryGenerateBossRoom();
    }

    getFinalRoomValidationSummary() {
        const minFinalRooms = Number.isFinite(this.config.minFinalRooms) ? this.config.minFinalRooms : null;
        const maxFinalRooms = Number.isFinite(this.config.maxFinalRooms) ? this.config.maxFinalRooms : null;
        const roomCount = this.rooms.filter(room => !room.isBossRoom).length;

        if (minFinalRooms === null && maxFinalRooms === null) {
            return { inRange: true, roomCount, score: 0 };
        }

        let score = 0;
        if (minFinalRooms !== null && roomCount < minFinalRooms) {
            score += minFinalRooms - roomCount;
        }
        if (maxFinalRooms !== null && roomCount > maxFinalRooms) {
            score += roomCount - maxFinalRooms;
        }

        return {
            inRange: score === 0,
            roomCount,
            score
        };
    }

    generateSequentialLayout() {
        const numRooms = this.config.numRooms;
        const minRoomSize = this.config.minRoomSize;
        const maxRoomSize = this.config.maxRoomSize;

        for (let i = 0; i < numRooms; i++) {
            // Determine if this is a rare perfect square room or an organic cluster
            const isPerfectSquare = Math.random() < this.config.perfectSquareChance;
            const numRects = isPerfectSquare ? 1 : Math.floor(Math.random() * (this.config.blobMaxRects - this.config.blobMinRects + 1)) + this.config.blobMinRects;
            
            let roomBounds = null;
            let rects = [];

            // Try to place the cluster around a center point
            const xRange = this.getCenterRange(this.cols, maxRoomSize);
            const yRange = this.getCenterRange(this.rows, maxRoomSize);
            let cx = Math.floor(Math.random() * Math.max(1, xRange.max - xRange.min + 1)) + xRange.min;
            let cy = Math.floor(Math.random() * Math.max(1, yRange.max - yRange.min + 1)) + yRange.min;

            for(let r = 0; r < numRects; r++) {
                let width = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
                let height = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
                
                // Offset subsequent rects slightly from the center to create organic blobs
                let rx = cx + Math.floor(Math.random() * (width / 2)) - Math.floor(width / 4);
                let ry = cy + Math.floor(Math.random() * (height / 2)) - Math.floor(height / 4);

                rects.push({x: rx, y: ry, width, height});

                if (!roomBounds) {
                    roomBounds = { x: rx, y: ry, right: rx + width, bottom: ry + height };
                } else {
                    roomBounds.x = Math.min(roomBounds.x, rx);
                    roomBounds.y = Math.min(roomBounds.y, ry);
                    roomBounds.right = Math.max(roomBounds.right, rx + width);
                    roomBounds.bottom = Math.max(roomBounds.bottom, ry + height);
                }
            }

            let newRoom = { 
                rects: rects,
                x: roomBounds.x, 
                y: roomBounds.y, 
                width: roomBounds.right - roomBounds.x, 
                height: roomBounds.bottom - roomBounds.y,
                center: { x: cx, y: cy } 
            };

            // Collision check against other room bounding boxes (with 2 tiles padding)
            let failed = false;
            for (let room of this.rooms) {
                if (newRoom.x <= room.x + room.width + 2 && newRoom.x + newRoom.width + 2 >= room.x &&
                    newRoom.y <= room.y + room.height + 2 && newRoom.y + newRoom.height + 2 >= room.y) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.carveRoom(newRoom);
                if (this.rooms.length > 0) {
                    // Connect to the previous room
                    this.carveWobblyCorridor(this.rooms[this.rooms.length - 1].center, newRoom.center);
                }
                this.rooms.push(newRoom);
            }
        }
    }

    generateHubLayout() {
        const centerX = Math.floor(this.cols / 2);
        const centerY = Math.floor(this.rows / 2);
        const hub = this.tryAddRoom(centerX, centerY, null, {
            width: this.config.maxRoomSize + 4,
            height: this.config.maxRoomSize + 4,
            forceSquare: true,
            padding: 0
        });

        const spokes = Math.max(1, this.config.numRooms - 1);
        const radius = Math.min(this.cols, this.rows) * 0.34;
        for (let i = 0; i < spokes; i++) {
            const angle = (Math.PI * 2 * i) / spokes;
            const wobble = (Math.random() - 0.5) * radius * 0.35;
            const x = Math.round(centerX + Math.cos(angle) * (radius + wobble));
            const y = Math.round(centerY + Math.sin(angle) * (radius + wobble));
            this.tryAddRoom(x, y, hub || this.rooms[0]);
        }
    }

    generateLinearLayout() {
        let previous = null;
        const count = this.config.numRooms;
        const yMid = Math.floor(this.rows / 2);
        const amplitude = Math.max(4, Math.floor(this.rows * 0.22));

        for (let i = 0; i < count; i++) {
            const progress = count <= 1 ? 0.5 : i / (count - 1);
        const xBounds = this.getCenterRange(this.cols, this.config.maxRoomSize);
        const yBounds = this.getCenterRange(this.rows, this.config.maxRoomSize);
        const x = Math.round(xBounds.min + progress * Math.max(0, xBounds.max - xBounds.min));
            const wave = Math.sin(progress * Math.PI * 2) * amplitude;
            const y = this.clamp(Math.round(yMid + wave + (Math.random() - 0.5) * 8), yBounds.min, yBounds.max);
            const room = this.tryAddRoom(x, y, previous, { padding: 1 });
            if (room) previous = room;
        }
    }

    generateClusterLayout() {
        const clusterCenters = [
            { x: Math.floor(this.cols * 0.25), y: Math.floor(this.rows * 0.30) },
            { x: Math.floor(this.cols * 0.72), y: Math.floor(this.rows * 0.35) },
            { x: Math.floor(this.cols * 0.48), y: Math.floor(this.rows * 0.72) }
        ];
        const roomsPerCluster = Math.ceil(this.config.numRooms / clusterCenters.length);
        const clusterAnchors = [];

        for (let c = 0; c < clusterCenters.length; c++) {
            let previous = null;
            for (let i = 0; i < roomsPerCluster && this.rooms.length < this.config.numRooms; i++) {
                const spread = i === 0 ? 0 : Math.min(this.cols, this.rows) * 0.12;
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
                this.carveWobblyCorridor(clusterAnchors[i - 1].center, clusterAnchors[i].center);
            }
        }
    }

    generateStructuredLayout() {
        const count = this.config.numRooms;
        const columns = Math.max(3, Math.ceil(Math.sqrt(count)));
        const rows = Math.ceil(count / columns);
        let previous = null;

        for (let i = 0; i < count; i++) {
            const col = i % columns;
            const row = Math.floor(i / columns);
            const x = Math.round(((col + 1) / (columns + 1)) * this.cols);
            const y = Math.round(((row + 1) / (rows + 1)) * this.rows);
            const room = this.tryAddRoom(x, y, previous, { forceSquare: true, padding: 1 });
            if (room) previous = room;
        }
    }

    generateRingLayout() {
        const variant = this.chooseRingLayoutVariant();
        this.lastRingLayoutVariant = variant;

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
        const weights = this.config.ringVariantWeights || { single: 1 };
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
        const centerX = Math.floor(this.cols / 2);
        const centerY = Math.floor(this.rows / 2);
        this.buildRingRoomCluster({
            centerX,
            centerY,
            ringRadius: this.config.ringRadiusTiles || Math.floor(Math.min(this.cols, this.rows) * 0.25),
            ringThickness: this.config.ringThicknessTiles || 8,
            outerRooms: this.config.outerBranchRooms || 4,
            innerRooms: this.config.innerBranchRooms || 3,
            outerConnectorWidth: Math.max(3, this.config.corridorWidth || 3),
            innerPathWidth: this.config.innerPathWidth || 2
        });
    }

    buildDoubleSideRingLayout() {
        const centerY = Math.floor(this.rows / 2);
        const primaryRadius = this.config.ringRadiusTiles || 28;
        const secondaryRadius = this.config.secondaryRingRadiusTiles || primaryRadius;
        const primaryThickness = this.config.ringThicknessTiles || 8;
        const secondaryThickness = this.config.secondaryRingThicknessTiles || primaryThickness;
        const separation = this.config.ringSeparationTiles || 8;
        const primaryOuter = primaryRadius + primaryThickness / 2;
        const secondaryOuter = secondaryRadius + secondaryThickness / 2;
        const centerDistance = primaryOuter + secondaryOuter + separation;
        const centerX = Math.floor(this.cols / 2);
        const leftCenterX = Math.round(centerX - centerDistance / 2);
        const rightCenterX = Math.round(centerX + centerDistance / 2);
        const bridgeWidth = Math.max(3, this.config.corridorWidth || 3);
        const innerPathWidth = this.config.innerPathWidth || 2;
        const totalOuterRooms = this.config.doubleRingOuterBranchRooms || ((this.config.outerBranchRooms || 4) + 2);
        const totalInnerRooms = this.config.doubleRingInnerBranchRooms || ((this.config.innerBranchRooms || 3) + 2);
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
            this.carveCorridorWithWidth(leftAnchor, rightAnchor, bridgeWidth, 0);
        }
    }

    buildOuterExpansionRingLayout() {
        const centerX = Math.floor(this.cols / 2);
        const centerY = Math.floor(this.rows / 2);
        const mainRadius = this.config.ringRadiusTiles || 28;
        const mainThickness = this.config.ringThicknessTiles || 8;
        const outerRadius = this.config.outerExpansionRadiusTiles || (mainRadius + 20);
        const outerThickness = this.config.outerExpansionThicknessTiles || mainThickness;
        const bridgeWidth = Math.max(3, this.config.corridorWidth || 3);
        const innerPathWidth = this.config.innerPathWidth || 2;
        const firstOuterRooms = this.config.outerExpansionOuterBranchRooms || this.config.outerBranchRooms || 4;
        const innerRooms = this.config.outerExpansionInnerBranchRooms || ((this.config.innerBranchRooms || 3) + 3);
        const extraOuterRooms = this.config.outerExpansionExtraOuterRooms || 3;

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
            this.carveCorridorWithWidth(innerAnchor, outerAnchor, bridgeWidth, 0);
        }

        const outerAngles = this.getSpacedAngles(extraOuterRooms, 0.05, Math.PI / Math.max(3, extraOuterRooms));
        for (const angle of outerAngles) {
            const room = this.tryAddRingBranchRoom(angle, 1, centerX, centerY, outerRadius, bridgeWidth);
            if (room) {
                this.rooms.push(room);
            }
        }
    }

    buildRingRoomCluster(options) {
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
                this.rooms.push(room);
            }
        }

        for (const angle of innerAngles) {
            const room = this.tryAddRingBranchRoom(angle, -1, centerX, centerY, ringRadius, innerPathWidth);
            if (room) {
                this.rooms.push(room);
                innerRoomRefs.push(room);
            }
        }

        this.connectRoomGroup(innerRoomRefs, innerPathWidth);
        return innerRoomRefs;
    }

    connectRoomGroup(rooms, corridorWidth) {
        for (let i = 1; i < rooms.length; i++) {
            const prev = rooms[i - 1];
            const curr = rooms[i];
            const prevAnchor = this.getRoomConnectionTile(prev, curr.center);
            const currAnchor = this.getRoomConnectionTile(curr, prev.center);
            this.carveCorridorWithWidth(prevAnchor, currAnchor, corridorWidth, 0);
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
        const maxRoomSize = this.config.maxRoomSize;
        const xBounds = this.getCenterRange(this.cols, maxRoomSize);
        const yBounds = this.getCenterRange(this.rows, maxRoomSize);

        return {
            x: Math.floor(Math.random() * Math.max(1, xBounds.max - xBounds.min + 1)) + xBounds.min,
            y: Math.floor(Math.random() * Math.max(1, yBounds.max - yBounds.min + 1)) + yBounds.min
        };
    }

    tryAddRoom(cx, cy, connectTo = null, options = {}) {
        const newRoom = this.createRoom(cx, cy, options);
        if (!newRoom || this.roomOverlaps(newRoom, options.padding ?? 2)) {
            return null;
        }

        this.carveRoom(newRoom);
        if (connectTo) {
            this.connectRooms(connectTo, newRoom);
        }
        this.rooms.push(newRoom);
        return newRoom;
    }

    createRoom(cx, cy, options = {}) {
        const minRoomSize = this.config.minRoomSize;
        const maxRoomSize = this.config.maxRoomSize;
        const forceSquare = options.forceSquare || Math.random() < this.config.perfectSquareChance;
        const minRects = this.config.blobMinRects || 1;
        const maxRects = this.config.blobMaxRects || minRects;
        const numRects = forceSquare ? 1 : Math.floor(Math.random() * (maxRects - minRects + 1)) + minRects;
        let roomBounds = null;
        let rects = [];

        const centerXRange = this.getCenterRange(this.cols, maxRoomSize);
        const centerYRange = this.getCenterRange(this.rows, maxRoomSize);
        cx = this.clamp(Math.round(cx), centerXRange.min, centerXRange.max);
        cy = this.clamp(Math.round(cy), centerYRange.min, centerYRange.max);

        for (let r = 0; r < numRects; r++) {
            let width = options.width || Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let height = options.height || (forceSquare ? width : Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize);

            if (forceSquare && !options.height) height = width;

            let rx = cx - Math.floor(width / 2);
            let ry = cy - Math.floor(height / 2);
            if (r > 0) {
                rx += Math.floor(Math.random() * (width / 2)) - Math.floor(width / 4);
                ry += Math.floor(Math.random() * (height / 2)) - Math.floor(height / 4);
            }

            const rectRange = this.getRectRange(width, height);
            rx = this.clamp(rx, rectRange.minX, rectRange.maxX);
            ry = this.clamp(ry, rectRange.minY, rectRange.maxY);

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

    roomOverlaps(newRoom, padding = 2) {
        for (let room of this.rooms) {
            if (newRoom.x <= room.x + room.width + padding &&
                newRoom.x + newRoom.width + padding >= room.x &&
                newRoom.y <= room.y + room.height + padding &&
                newRoom.y + newRoom.height + padding >= room.y) {
                return true;
            }
        }
        return false;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    carveRoom(room) {
        for (let rect of room.rects) {
            for (let y = rect.y; y < rect.y + rect.height; y++) {
                for (let x = rect.x; x < rect.x + rect.width; x++) {
                    // Leave a 1-tile border of walls around the map edge
                    if (this.isInsidePlayableArea(x, y)) {
                        this.grid[y * this.cols + x] = 1;
                    }
                }
            }
        }
    }

    carveCorridorWithWidth(start, end, width = 1, wobbleChance = this.config.wobbleChance) {
        let x = Math.round(start.x);
        let y = Math.round(start.y);
        const targetX = Math.round(end.x);
        const targetY = Math.round(end.y);
        let maxSteps = 1000;

        while ((x !== targetX || y !== targetY) && maxSteps > 0) {
            maxSteps--;

            for (let by = 0; by < width; by++) {
                for (let bx = 0; bx < width; bx++) {
                    const px = x + bx;
                    const py = y + by;
                    if (this.isInsidePlayableArea(px, py)) {
                        this.grid[py * this.cols + px] = 1;
                    }
                }
            }

            const dx = targetX - x;
            const dy = targetY - y;

            if (Math.random() < wobbleChance && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
                if (Math.random() < 0.5) {
                    x += (Math.random() < 0.5 ? 1 : -1);
                } else {
                    y += (Math.random() < 0.5 ? 1 : -1);
                }
            } else if (Math.abs(dx) > Math.abs(dy)) {
                x += Math.sign(dx);
            } else {
                y += Math.sign(dy);
            }
        }

        for (let by = 0; by < width; by++) {
            for (let bx = 0; bx < width; bx++) {
                const px = targetX + bx;
                const py = targetY + by;
                if (this.isInsidePlayableArea(px, py)) {
                    this.grid[py * this.cols + px] = 1;
                }
            }
        }
    }

    carveWobblyCorridor(start, end) {
        this.carveCorridorWithWidth(start, end, this.config.corridorWidth, this.config.wobbleChance);
    }

    carveRingBand(centerX, centerY, innerRadius, outerRadius) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (!this.isInsidePlayableArea(x, y)) continue;
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.hypot(dx, dy);
                if (distance >= innerRadius && distance <= outerRadius) {
                    this.grid[y * this.cols + x] = 1;
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

    createRectRoomAt(cx, cy, width, height) {
        const rectRange = this.getRectRange(width, height);
        const x = this.clamp(Math.round(cx - width / 2), rectRange.minX, rectRange.maxX);
        const y = this.clamp(Math.round(cy - height / 2), rectRange.minY, rectRange.maxY);

        return {
            rects: [{ x, y, width, height }],
            x,
            y,
            width,
            height,
            center: { x: x + Math.floor(width / 2), y: y + Math.floor(height / 2) }
        };
    }

    tryAddRingBranchRoom(angle, direction, centerX, centerY, ringRadius, connectorWidth) {
        const width = Math.floor(Math.random() * (this.config.maxRoomSize - this.config.minRoomSize + 1)) + this.config.minRoomSize;
        const height = Math.floor(Math.random() * (this.config.maxRoomSize - this.config.minRoomSize + 1)) + this.config.minRoomSize;
        const roomHalfSpan = Math.max(width, height) / 2;
        const connectorGap = direction > 0 ? 4 : 5;
        const targetRadius = direction > 0
            ? ringRadius + roomHalfSpan + connectorGap
            : ringRadius - roomHalfSpan - connectorGap;

        const cx = centerX + Math.cos(angle) * targetRadius;
        const cy = centerY + Math.sin(angle) * targetRadius;
        const room = this.createRectRoomAt(cx, cy, width, height);
        if (this.roomOverlaps(room, 2)) return null;

        this.carveRoom(room);
        const ringAnchor = {
            x: Math.round(centerX + Math.cos(angle) * ringRadius),
            y: Math.round(centerY + Math.sin(angle) * ringRadius)
        };
        const roomAnchor = this.getRoomConnectionTile(room, ringAnchor);
        this.carveCorridorWithWidth(roomAnchor, ringAnchor, connectorWidth, 0);
        return room;
    }

    getRoomFloorTiles(room) {
        const tiles = [];
        if (!room) return tiles;

        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (this.getTile(x, y) === 1) {
                    tiles.push({ x, y });
                }
            }
        }

        return tiles;
    }

    getRoomConnectionTile(room, target = null) {
        const tiles = this.getRoomFloorTiles(room);
        if (tiles.length === 0) {
            return room ? { x: Math.round(room.center.x), y: Math.round(room.center.y) } : { x: 0, y: 0 };
        }

        const targetPoint = target || room.center || tiles[0];
        let preferred = null;
        let preferredScore = Infinity;
        let fallback = tiles[0];
        let fallbackScore = Infinity;

        for (const tile of tiles) {
            const distance = Math.abs(tile.x - targetPoint.x) + Math.abs(tile.y - targetPoint.y);
            if (distance < fallbackScore) {
                fallback = tile;
                fallbackScore = distance;
            }

            if (!this.hasOutwardSpace(tile.x, tile.y, room)) continue;
            if (distance < preferredScore) {
                preferred = tile;
                preferredScore = distance;
            }
        }

        return preferred || fallback;
    }

    hasOutwardSpace(x, y, room) {
        for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
            const nx = x + dir.x;
            const ny = y + dir.y;
            if (this.isTileInsideRoom(nx, ny, room)) continue;
            if (this.isInsidePlayableArea(nx, ny)) {
                return true;
            }
        }

        return false;
    }

    roomHasOpening(room) {
        for (const tile of this.getRoomFloorTiles(room)) {
            for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
                const nx = tile.x + dir.x;
                const ny = tile.y + dir.y;
                if (this.isTileInsideRoom(nx, ny, room)) continue;
                if (this.getTile(nx, ny) === 1) {
                    return true;
                }
            }
        }

        return false;
    }

    roomHasReachableFloor(room, reachable) {
        if (!room || !reachable) return false;
        return this.getRoomFloorTiles(room).some(tile => reachable.has(`${tile.x},${tile.y}`));
    }

    refreshMainReachableFloor() {
        if (!this.rooms.length) {
            this.mainReachableFloor = new Set();
            return this.mainReachableFloor;
        }

        const startAnchor = this.getRoomConnectionTile(this.rooms[0], this.rooms[0].center);
        this.mainReachableFloor = this.getReachableFloorSet(startAnchor);
        return this.mainReachableFloor;
    }

    pruneUnreachableIslands() {
        const reachable = this.refreshMainReachableFloor();
        if (reachable.size === 0) return;

        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.cols; x++) {
                if (this.getTile(x, y) !== 1) continue;
                if (reachable.has(`${x},${y}`)) continue;
                if (this.bossRoom && this.isTileInsideRoom(x, y, this.bossRoom.room)) continue;
                this.grid[y * this.cols + x] = 0;
            }
        }

        this.rooms = this.rooms.filter(room => room.isBossRoom || this.getRoomFloorTiles(room).length > 0);
        this.refreshMainReachableFloor();
    }

    connectRooms(fromRoom, toRoom) {
        if (!fromRoom || !toRoom) return;

        const fromAnchor = this.getRoomConnectionTile(fromRoom, toRoom.center);
        const toAnchor = this.getRoomConnectionTile(toRoom, fromRoom.center);
        this.carveWobblyCorridor(fromAnchor, toAnchor);
    }

    getRoomReachableKey(room) {
        const anchor = this.getRoomConnectionTile(room, room && room.center);
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
        if (this.rooms.length < 2) return;

        for (let i = 0; i < this.rooms.length; i++) {
            const room = this.rooms[i];
            if (!this.roomHasOpening(room)) {
                const candidates = this.rooms.filter((candidate, index) => index !== i);
                const neighbor = this.findClosestConnectedRoom(room, candidates);
                this.connectRooms(neighbor, room);
            }
        }
    }

    canReachBossRoomCandidate(candidate, anchor) {
        const nextGrid = [...this.grid];
        for (const rect of candidate.room.rects) {
            for (let y = rect.y; y < rect.y + rect.height; y++) {
                for (let x = rect.x; x < rect.x + rect.width; x++) {
                    if (this.isInsidePlayableArea(x, y)) {
                        nextGrid[y * this.cols + x] = 1;
                    }
                }
            }
        }

        for (const tile of candidate.corridorTiles) {
            if (this.isInsidePlayableArea(tile.x, tile.y)) {
                nextGrid[tile.y * this.cols + tile.x] = 1;
            }
        }
        nextGrid[candidate.entrance.y * this.cols + candidate.entrance.x] = 1;

        const start = this.getRoomConnectionTile(anchor, candidate.entrance);
        const goal = this.getRoomConnectionTile(candidate.room, candidate.entrance);
        const queue = [{ x: start.x, y: start.y }];
        const visited = new Set([`${start.x},${start.y}`]);

        while (queue.length > 0) {
            const current = queue.shift();
            if (current.x === goal.x && current.y === goal.y) {
                return true;
            }

            for (const dir of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
                const nx = current.x + dir.x;
                const ny = current.y + dir.y;
                const key = `${nx},${ny}`;
                if (visited.has(key)) continue;
                if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
                if (nextGrid[ny * this.cols + nx] !== 1) continue;
                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        }

        return false;
    }

    tryGenerateBossRoom() {
        const chance = this.config.bossRoomChance ?? 0.25;
        if (this.rooms.length < 2 || Math.random() >= chance) return null;

        const anchors = this.rooms.slice(1);
        const directions = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 }
        ];
        const roomSize = Math.min(11, Math.max(7, this.config.maxRoomSize || 9));
        const corridorLength = 4;

        for (let attempt = 0; attempt < 80; attempt++) {
            const anchor = anchors[Math.floor(Math.random() * anchors.length)];
            const dir = directions[Math.floor(Math.random() * directions.length)];
            const candidate = this.buildBossRoomCandidate(anchor, dir, roomSize, corridorLength);

            if (!candidate || !this.canPlaceBossRoom(candidate.room) || !this.canReachBossRoomCandidate(candidate, anchor)) continue;
            const buttonPositions = this.getBossRoomButtonPositions(3, candidate.room);
            if (buttonPositions.length < 3) continue;

            this.carveRoom(candidate.room);
            for (const tile of candidate.corridorTiles) {
                this.grid[tile.y * this.cols + tile.x] = 1;
            }

            this.grid[candidate.entrance.y * this.cols + candidate.entrance.x] = 0;

            this.bossRoom = {
                room: candidate.room,
                entranceTile: candidate.entrance,
                entranceWorld: this.tileToWorld(candidate.entrance.x, candidate.entrance.y),
                unlocked: false,
                opened: false,
                bossSpawn: this.tileToWorld(candidate.room.center.x, candidate.room.center.y),
                chestSpawn: this.tileToWorld(candidate.chestTile.x, candidate.chestTile.y),
                chestSpawns: this.getBossRoomChestPositions(candidate.room, candidate.chestTile),
                buttonPositions
            };
            this.refreshMainReachableFloor();
            return this.bossRoom;
        }

        return null;
    }

    buildBossRoomCandidate(anchor, dir, roomSize, corridorLength) {
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
            x: this.clamp(room.center.x + (dir.x !== 0 ? 0 : 2), room.x + 2, room.x + room.width - 3),
            y: this.clamp(room.center.y + (dir.y !== 0 ? 0 : 2), room.y + 2, room.y + room.height - 3)
        };

        return { room, entrance, corridorTiles, chestTile };
    }

    canPlaceBossRoom(room) {
        const padding = this.getEdgePaddingTiles();
        if (room.x < padding || room.y < padding || room.x + room.width > this.cols - padding || room.y + room.height > this.rows - padding) {
            return false;
        }

        for (let y = room.y - padding; y <= room.y + room.height + padding - 1; y++) {
            for (let x = room.x - padding; x <= room.x + room.width + padding - 1; x++) {
                if (this.getTile(x, y) !== 0) {
                    return false;
                }
            }
        }

        return true;
    }

    unlockBossRoomEntrance() {
        if (!this.bossRoom || this.bossRoom.unlocked) return false;

        this.bossRoom.unlocked = true;
        return true;
    }

    openBossRoomEntrance() {
        if (!this.bossRoom || !this.bossRoom.unlocked || this.bossRoom.opened) return false;

        const tile = this.bossRoom.entranceTile;
        this.grid[tile.y * this.cols + tile.x] = 1;
        this.bossRoom.opened = true;
        this.refreshMainReachableFloor();
        return true;
    }

    getBossRoomButtonPositions(count, bossRoom) {
        const valid = [];
        const startRoom = this.rooms[0];
        const start = startRoom ? this.tileToWorld(startRoom.center.x, startRoom.center.y) : { x: 0, y: 0 };
        const safeRadius = Math.min(500, Math.max(this.cols, this.rows) * this.tileSize * 0.2);

        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                if (this.grid[y * this.cols + x] !== 1) continue;
                if (this.isTileInsideRoom(x, y, bossRoom)) continue;

                const world = this.tileToWorld(x, y);
                if (Math.hypot(world.x - start.x, world.y - start.y) < safeRadius) continue;
                valid.push({ x, y });
            }
        }

        return this.pickWithDistance(valid, count, [], 350);
    }

    getBossRoomChestPositions(bossRoom, fallbackTile, count = 3) {
        const valid = [];
        for (let y = bossRoom.y + 1; y < bossRoom.y + bossRoom.height - 1; y++) {
            for (let x = bossRoom.x + 1; x < bossRoom.x + bossRoom.width - 1; x++) {
                if (this.grid[y * this.cols + x] !== 1) continue;
                const distToBoss = Math.hypot(x - bossRoom.center.x, y - bossRoom.center.y);
                if (distToBoss < 2) continue;
                valid.push({ x, y });
            }
        }

        const picked = this.pickWithDistance(valid, count, [], this.tileSize * 1.8);
        if (picked.length > 0) return picked;
        return [this.tileToWorld(fallbackTile.x, fallbackTile.y)];
    }

    ensureMainRoomConnectivity() {
        if (this.rooms.length < 2) return;

        let connected = this.refreshMainReachableFloor();

        for (let pass = 0; pass < this.rooms.length; pass++) {
            let repairedAny = false;

            for (const room of this.rooms) {
                if (this.roomHasReachableFloor(room, connected)) continue;

                const connectedRooms = this.rooms.filter(candidate => candidate !== room && this.roomHasReachableFloor(candidate, connected));
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

        for (const room of this.rooms) {
            if (this.roomHasReachableFloor(room, connected)) continue;

            const connectedRooms = this.rooms.filter(candidate => candidate !== room && this.roomHasReachableFloor(candidate, connected));
            const targetRoom = this.findClosestConnectedRoom(room, connectedRooms);
            if (!targetRoom) continue;

            this.connectRooms(targetRoom, room);
            connected = this.refreshMainReachableFloor();
        }
    }

    getReachableFloorSet(startTile = null) {
        const start = startTile || (this.rooms[0] && this.rooms[0].center);
        const reachable = new Set();
        if (!start) return reachable;

        const startX = Math.round(start.x);
        const startY = Math.round(start.y);
        if (this.getTile(startX, startY) !== 1) return reachable;

        const queue = [{ x: startX, y: startY }];
        reachable.add(`${startX},${startY}`);
        const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

        while (queue.length > 0) {
            const curr = queue.shift();
            for (const dir of dirs) {
                const nx = curr.x + dir.x;
                const ny = curr.y + dir.y;
                const key = `${nx},${ny}`;
                if (reachable.has(key) || this.getTile(nx, ny) !== 1) continue;
                reachable.add(key);
                queue.push({ x: nx, y: ny });
            }
        }

        return reachable;
    }

    getDisconnectedMainRooms() {
        if (this.rooms.length === 0) return [];
        const reachable = this.mainReachableFloor.size > 0
            ? this.mainReachableFloor
            : this.refreshMainReachableFloor();
        return this.rooms.filter(room => {
            if (room.isBossRoom) return false;
            return !this.roomHasReachableFloor(room, reachable);
        });
    }

    isTileInsideRoom(x, y, room) {
        if (!room) return false;
        return x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height;
    }

    tileToWorld(x, y) {
        return {
            x: x * this.tileSize + this.tileSize / 2,
            y: y * this.tileSize + this.tileSize / 2
        };
    }

    applyCellularAutomata(passes) {
        for (let p = 0; p < passes; p++) {
            let newGrid = [...this.grid];
            for (let y = 1; y < this.rows - 1; y++) {
                for (let x = 1; x < this.cols - 1; x++) {
                    let walls = this.countAdjacentWalls(x, y);
                    
                    if (this.grid[y * this.cols + x] === 0) {
                        // Wall -> Floor if surrounded by mostly floors (smooths sharp outer corners)
                        if (walls < 3) newGrid[y * this.cols + x] = 1;
                    } else {
                        // Floor -> Wall if surrounded by mostly walls (fills in tight 1-tile gaps)
                        if (walls >= 5) newGrid[y * this.cols + x] = 0;
                    }
                }
            }
            this.grid = newGrid;
        }
    }

    countAdjacentWalls(x, y) {
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                // Treat out of bounds as walls
                if (x + dx < 0 || x + dx >= this.cols || y + dy < 0 || y + dy >= this.rows) {
                    count++;
                } else if (this.grid[(y + dy) * this.cols + (x + dx)] === 0) {
                    count++;
                }
            }
        }
        return count;
    }

    getTile(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return 0;
        return this.grid[y * this.cols + x];
    }

    getStartPos() {
        if (this.rooms.length === 0) return { x: 50, y: 50 }; // Fallback
        const startAnchor = this.getRoomConnectionTile(this.rooms[0], this.rooms[0].center);
        return this.getValidFloorPosNear(startAnchor.x, startAnchor.y);
    }

    getDoorPositions(count, excludePositions = [], minDistance = 0) {
        let valid = [];
        for (let y = 1; y < this.rows - 1; y++) {
            for (let x = 1; x < this.cols - 1; x++) {
                if (this.grid[y * this.cols + x] === 0) {
                    // Check if it's on outer edge
                    if (x <= 5 || x >= this.cols - 6 || y <= 5 || y >= this.rows - 6) {
                        // Check if adjacent to floor
                        let adjacentFloors = 0;
                        const dirs = [{dx:0,dy:-1}, {dx:0,dy:1}, {dx:-1,dy:0}, {dx:1,dy:0}];
                        for (let d of dirs) {
                            let nx = x + d.dx, ny = y + d.dy;
                            if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
                                if (this.grid[ny * this.cols + nx] === 1) adjacentFloors++;
                            }
                        }
                        if (adjacentFloors > 0) {
                            valid.push({x, y});
                        }
                    }
                }
            }
        }
        return this.pickWithDistance(valid, count, excludePositions, minDistance);
    }

    getHolePositions(count, excludePositions = [], minDistance = 0) {
        let valid = [];
        // Use rooms 1 to N (skip 0 to avoid spawning hole right where player starts)
        for (let i = 1; i < this.rooms.length; i++) {
            let r = this.rooms[i];
            for (let rect of r.rects) {
                for (let y = rect.y + 1; y < rect.y + rect.height - 1; y++) {
                    for (let x = rect.x + 1; x < rect.x + rect.width - 1; x++) {
                        if (this.grid[y * this.cols + x] === 1) {
                            valid.push({x, y});
                        }
                    }
                }
            }
        }
        return this.pickWithDistance(valid, count, excludePositions, minDistance);
    }

    canFitFloorRect(x, y, width = 2, height = 2) {
        for (let yy = y; yy < y + height; yy++) {
            for (let xx = x; xx < x + width; xx++) {
                if (this.getTile(xx, yy) !== 1) return false;
                if (this.mainReachableFloor.size > 0 && !this.mainReachableFloor.has(`${xx},${yy}`)) return false;
            }
        }
        return true;
    }

    getLargeObjectPositions(count, excludePositions = [], minDistance = 0, options = {}) {
        const width = options.width || 2;
        const height = options.height || 2;
        const valid = [];
        const rooms = this.rooms || [];
        const startRoom = rooms[0];
        const bossRoom = this.bossRoom && this.bossRoom.room;

        for (let i = 1; i < rooms.length; i++) {
            const room = rooms[i];
            if (!room || room.isBossRoom || room === bossRoom || room === startRoom) continue;

            const minX = room.x + 1;
            const maxX = room.x + room.width - width - 1;
            const minY = room.y + 1;
            const maxY = room.y + room.height - height - 1;
            if (minX > maxX || minY > maxY) continue;

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (!this.canFitFloorRect(x, y, width, height)) continue;
                    const world = {
                        x: (x + width / 2) * this.tileSize,
                        y: (y + height / 2) * this.tileSize
                    };
                    valid.push({ x, y, worldX: world.x, worldY: world.y });
                }
            }
        }

        return this.pickLargeObjectPositions(valid, count, excludePositions, minDistance);
    }

    pickLargeObjectPositions(validTiles, count, excludePositions, minDistance) {
        return this.pickPositionsByDistance(
            validTiles,
            count,
            excludePositions,
            minDistance,
            tile => ({ x: tile.worldX, y: tile.worldY, tileX: tile.x, tileY: tile.y })
        );
    }

    pickWithDistance(validTiles, count, excludePositions, minDistance) {
        return this.pickPositionsByDistance(
            validTiles,
            count,
            excludePositions,
            minDistance,
            tile => ({
                x: tile.x * this.tileSize + this.tileSize / 2,
                y: tile.y * this.tileSize + this.tileSize / 2
            })
        );
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

    getValidFloorPosNear(startX, startY) {
        const reachable = this.mainReachableFloor.size > 0 ? this.mainReachableFloor : null;
        // BFS to find nearest floor tile (value 1)
        let queue = [{x: startX, y: startY}];
        let visited = new Set();
        visited.add(`${startX},${startY}`);

        // Directions: up, down, left, right, diagonals
        const dirs = [
            {x: 0, y: -1}, {x: 0, y: 1}, {x: -1, y: 0}, {x: 1, y: 0},
            {x: -1, y: -1}, {x: 1, y: -1}, {x: -1, y: 1}, {x: 1, y: 1}
        ];

        while(queue.length > 0) {
            let curr = queue.shift();
            
            if (this.getTile(curr.x, curr.y) === 1 && (!reachable || reachable.has(`${curr.x},${curr.y}`))) {
                return {
                    x: curr.x * this.tileSize + this.tileSize / 2,
                    y: curr.y * this.tileSize + this.tileSize / 2
                };
            }

            for (let d of dirs) {
                let nx = curr.x + d.x;
                let ny = curr.y + d.y;
                let key = `${nx},${ny}`;
                
                if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows && !visited.has(key)) {
                    visited.add(key);
                    queue.push({x: nx, y: ny});
                }
            }
        }
        
        // Fallback
        return {
            x: startX * this.tileSize + this.tileSize / 2,
            y: startY * this.tileSize + this.tileSize / 2
        };
    }
}
