class Pathfinder {
    constructor() {}

    findPath(startX, startY, targetX, targetY, mapGen) {
        if (!mapGen) return [];

        const tileSize = mapGen.tileSize;
        
        const startNode = {
            x: Math.floor(startX / tileSize),
            y: Math.floor(startY / tileSize),
            g: 0,
            h: 0,
            f: 0,
            parent: null
        };

        const targetNode = {
            x: Math.floor(targetX / tileSize),
            y: Math.floor(targetY / tileSize)
        };

        // If target is out of bounds or a wall, return empty
        if (targetNode.x < 0 || targetNode.x >= mapGen.cols || 
            targetNode.y < 0 || targetNode.y >= mapGen.rows || 
            mapGen.getTile(targetNode.x, targetNode.y) === 0) {
            return [];
        }

        const openList = [startNode];
        const closedSet = new Set();

        const getDistance = (nodeA, nodeB) => {
            return Math.abs(nodeA.x - nodeB.x) + Math.abs(nodeA.y - nodeB.y);
        };

        const getNodeKey = (x, y) => `${x},${y}`;

        let iterations = 0;
        const maxIterations = 1000; // safety limit for large maps

        while (openList.length > 0 && iterations < maxIterations) {
            iterations++;

            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) {
                    currentIndex = i;
                }
            }

            const currentNode = openList[currentIndex];

            // Reached target
            if (currentNode.x === targetNode.x && currentNode.y === targetNode.y) {
                const path = [];
                let current = currentNode;
                while (current) {
                    // Convert back to world coordinates (center of tile)
                    path.push({
                        x: current.x * tileSize + tileSize / 2,
                        y: current.y * tileSize + tileSize / 2
                    });
                    current = current.parent;
                }
                return path.reverse();
            }

            openList.splice(currentIndex, 1);
            closedSet.add(getNodeKey(currentNode.x, currentNode.y));

            const neighbors = [
                { x: 0, y: -1 }, { x: 0, y: 1 },
                { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            for (let offset of neighbors) {
                const nx = currentNode.x + offset.x;
                const ny = currentNode.y + offset.y;

                if (nx < 0 || nx >= mapGen.cols || ny < 0 || ny >= mapGen.rows) continue;
                if (mapGen.getTile(nx, ny) === 0) continue;

                const nKey = getNodeKey(nx, ny);
                if (closedSet.has(nKey)) continue;

                const gScore = currentNode.g + 1;
                let neighborNode = openList.find(n => n.x === nx && n.y === ny);

                if (!neighborNode) {
                    neighborNode = {
                        x: nx,
                        y: ny,
                        g: gScore,
                        h: getDistance({x: nx, y: ny}, targetNode),
                        parent: currentNode
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openList.push(neighborNode);
                } else if (gScore < neighborNode.g) {
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = currentNode;
                }
            }
        }

        return [];
    }
}
