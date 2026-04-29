class MapGen {
    constructor(cols, rows, tileSize) {
        this.cols = cols;
        this.rows = rows;
        this.tileSize = tileSize;
        this.grid = []; // 0 = wall, 1 = floor, 2 = door, 3 = hazard
        this.rooms = [];
    }

    generate() {
        this.grid = new Array(this.cols * this.rows).fill(0);
        this.rooms = [];

        // Basic BSP or Random Room placement:
        const numRooms = 15;
        const minRoomSize = 5;
        const maxRoomSize = 12;

        for (let i = 0; i < numRooms; i++) {
            let width = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let height = Math.floor(Math.random() * (maxRoomSize - minRoomSize + 1)) + minRoomSize;
            let x = Math.floor(Math.random() * (this.cols - width - 2)) + 1;
            let y = Math.floor(Math.random() * (this.rows - height - 2)) + 1;

            let newRoom = { x, y, width, height, center: { x: Math.floor(x + width / 2), y: Math.floor(y + height / 2) } };

            let failed = false;
            for (let room of this.rooms) {
                if (this.intersects(newRoom, room)) {
                    failed = true;
                    break;
                }
            }

            if (!failed) {
                this.carveRoom(newRoom);
                if (this.rooms.length > 0) {
                    this.carveCorridor(this.rooms[this.rooms.length - 1].center, newRoom.center);
                }
                this.rooms.push(newRoom);
            }
        }
    }

    intersects(r1, r2) {
        return (r1.x <= r2.x + r2.width + 1 && r1.x + r1.width + 1 >= r2.x &&
            r1.y <= r2.y + r2.height + 1 && r1.y + r1.height + 1 >= r2.y);
    }

    carveRoom(room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                this.grid[y * this.cols + x] = 1;
            }
        }
    }

    carveCorridor(start, end) {
        let x = start.x;
        let y = start.y;

        while (x !== end.x || y !== end.y) {
            if (Math.random() > 0.5) {
                if (x < end.x) x++;
                else if (x > end.x) x--;
            } else {
                if (y < end.y) y++;
                else if (y > end.y) y--;
            }
            this.grid[y * this.cols + x] = 1;
        }
    }

    getTile(x, y) {
        if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return 0;
        return this.grid[y * this.cols + x];
    }

    getStartPos() {
        if (this.rooms.length === 0) return { x: 0, y: 0 };
        return {
            x: this.rooms[0].center.x * this.tileSize + this.tileSize / 2,
            y: this.rooms[0].center.y * this.tileSize + this.tileSize / 2
        };
    }
}