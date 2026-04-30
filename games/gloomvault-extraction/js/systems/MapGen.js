class MapGen {
    constructor(config, tileSize) {
        this.config = config;
        this.cols = config.cols;
        this.rows = config.rows;
        this.tileSize = tileSize;
        this.grid = []; // 0 = wall, 1 = floor, 2 = door, 3 = hazard
        this.visitedGrid = []; // true if tile has been revealed by player
        this.rooms = [];
    }

    generate() {
        this.grid = new Array(this.cols * this.rows).fill(0);
        this.visitedGrid = new Array(this.cols * this.rows).fill(false);
        this.rooms = [];

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
            let cx = Math.floor(Math.random() * (this.cols - maxRoomSize * 2 - 4)) + maxRoomSize + 2;
            let cy = Math.floor(Math.random() * (this.rows - maxRoomSize * 2 - 4)) + maxRoomSize + 2;

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

        // Apply a single pass of cellular automata to smooth out some sharp edges while keeping others
        if (this.config.smoothingPasses > 0) {
            this.applyCellularAutomata(this.config.smoothingPasses);
        }
    }

    carveRoom(room) {
        for (let rect of room.rects) {
            for (let y = rect.y; y < rect.y + rect.height; y++) {
                for (let x = rect.x; x < rect.x + rect.width; x++) {
                    // Leave a 1-tile border of walls around the map edge
                    if (x > 0 && x < this.cols - 1 && y > 0 && y < this.rows - 1) {
                        this.grid[y * this.cols + x] = 1;
                    }
                }
            }
        }
    }

    carveWobblyCorridor(start, end) {
        let x = start.x;
        let y = start.y;

        // brush size from config
        const brushSize = this.config.corridorWidth;

        // Safety counter to prevent infinite loops
        let maxSteps = 1000; 

        while ((x !== end.x || y !== end.y) && maxSteps > 0) {
            maxSteps--;

            // Paint brush
            for (let by = 0; by < brushSize; by++) {
                for (let bx = 0; bx < brushSize; bx++) {
                    const px = x + bx;
                    const py = y + by;
                    if (px > 0 && px < this.cols - 1 && py > 0 && py < this.rows - 1) {
                        this.grid[py * this.cols + px] = 1;
                    }
                }
            }

            let dx = end.x - x;
            let dy = end.y - y;

            // Wobble chance - drift perpendicular or random
            if (Math.random() < this.config.wobbleChance && (Math.abs(dx) > 1 || Math.abs(dy) > 1)) {
                if (Math.random() < 0.5) {
                    x += (Math.random() < 0.5 ? 1 : -1);
                } else {
                    y += (Math.random() < 0.5 ? 1 : -1);
                }
            } else {
                // Move towards target
                if (Math.abs(dx) > Math.abs(dy)) {
                    x += Math.sign(dx);
                } else {
                    y += Math.sign(dy);
                }
            }
        }
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
        return this.getValidFloorPosNear(this.rooms[0].center.x, this.rooms[0].center.y);
    }

    getValidFloorPosNear(startX, startY) {
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
            
            if (this.getTile(curr.x, curr.y) === 1) {
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