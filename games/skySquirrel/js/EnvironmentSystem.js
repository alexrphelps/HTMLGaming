/**
 * EnvironmentSystem.js - Water and procedural vegetation for the island.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};
    const M = SkySquirrel.Math3D;

    class EnvironmentSystem {
        constructor(config = SkySquirrel.WorldConfig, terrain) {
            this.config = config;
            this.terrain = terrain;
            this.trees = [];
            this.waterMesh = null;
            this.treeMesh = null;
            this.landmarkMesh = null;
            this.generate();
        }

        generate() {
            this.trees = this.generateTrees();
            this.waterMesh = this.buildWaterMesh();
            this.treeMesh = this.buildTreeMesh();
            this.landmarkMesh = this.buildLandmarkMesh();
        }

        generateTrees() {
            const trees = [];
            const veg = this.config.vegetation;
            const random = M.createRandom(veg.seed);
            let attempts = 0;
            const maxAttempts = veg.treeCount * 9;

            while (trees.length < veg.treeCount && attempts < maxAttempts) {
                attempts++;
                const angle = random() * Math.PI * 2;
                const radiusBias = Math.pow(random(), 0.74);
                const cluster = 1 + Math.sin(angle * 5 + random() * 0.8) * veg.clusterStrength * 0.2;
                const radius = M.lerp(veg.minRadius, veg.maxRadius, radiusBias) * cluster;
                const x = Math.cos(angle) * radius + (random() - 0.5) * 110;
                const z = Math.sin(angle) * radius + (random() - 0.5) * 110;
                const y = this.terrain.getHeightAt(x, z);
                const normal = this.terrain.getNormalAt(x, z);
                const slope = 1 - normal.y;
                const corridor = this.terrain.getCorridorInfluence(x, z);
                const launch = this.terrain.getLaunchPoint();
                const launchDistance = Math.hypot(x - launch.x, z - launch.z);
                const insideForestBand = (this.config.landmarks.forestBands || []).some(band => (
                    y >= band.minHeight &&
                    y <= band.maxHeight &&
                    radius >= band.minRadius &&
                    radius <= band.maxRadius
                ));

                if (y < veg.minAltitude || y > veg.maxAltitude) continue;
                if (slope > veg.maxSlope) continue;
                if (!this.terrain.isInsideIsland(x, z)) continue;
                if (!insideForestBand) continue;
                if (corridor.influence > 0.18 || corridor.lateral < (corridor.route ? corridor.route.width * veg.corridorClearance : 0)) continue;
                if (launchDistance < veg.launchClearance) continue;

                const scale = M.lerp(0.65, 1.42, random());
                const dead = y > veg.maxAltitude * 0.78 || this.terrain.getSurfaceType(x, z) === 'lavaRock';
                trees.push({ x, y, z, scale, dead, sway: random() * Math.PI * 2 });
            }

            return trees;
        }

        buildWaterMesh() {
            const size = this.config.world.size * 1.7;
            const y = this.config.world.waterLevel - 1.5;
            const color = this.config.render.waterColor;
            const vertices = [
                -size, y, -size,
                -size, y, size,
                size, y, -size,
                size, y, -size,
                -size, y, size,
                size, y, size
            ];
            const normals = [];
            const colors = [];
            for (let i = 0; i < 6; i++) {
                normals.push(0, 1, 0);
                colors.push(color[0], color[1], color[2]);
            }
            return {
                vertices: new Float32Array(vertices),
                normals: new Float32Array(normals),
                colors: new Float32Array(colors),
                count: 6
            };
        }

        buildTreeMesh() {
            const vertices = [];
            const normals = [];
            const colors = [];
            const trunk = this.config.render.trunkColor;
            const leaf = this.config.render.leafColor;
            const deadTree = this.config.render.deadTreeColor || trunk;
            const veg = this.config.vegetation;

            const pushTri = (a, b, c, color) => {
                const normal = M.normalize(M.cross(M.sub(b, a), M.sub(c, a)));
                [a, b, c].forEach(point => {
                    vertices.push(point.x, point.y, point.z);
                    normals.push(normal.x, normal.y, normal.z);
                    colors.push(color[0], color[1], color[2]);
                });
            };

            this.trees.forEach(tree => {
                const trunkHeight = veg.trunkHeight * tree.scale * (tree.dead ? 1.35 : 1);
                const canopyHeight = veg.canopyHeight * tree.scale;
                const trunkRadius = 3.2 * tree.scale;
                const canopyRadius = 16 * tree.scale;
                const base = M.vec3(tree.x, tree.y, tree.z);
                const top = M.vec3(tree.x, tree.y + trunkHeight, tree.z);
                const dirs = [
                    M.vec3(1, 0, 0),
                    M.vec3(0, 0, 1),
                    M.vec3(-1, 0, 0),
                    M.vec3(0, 0, -1)
                ];

                for (let i = 0; i < dirs.length; i++) {
                    const d0 = dirs[i];
                    const d1 = dirs[(i + 1) % dirs.length];
                    const b0 = M.add(base, M.scale(d0, trunkRadius));
                    const b1 = M.add(base, M.scale(d1, trunkRadius));
                    const t0 = M.add(top, M.scale(d0, trunkRadius * 0.62));
                    const t1 = M.add(top, M.scale(d1, trunkRadius * 0.62));
                    pushTri(b0, t0, b1, tree.dead ? deadTree : trunk);
                    pushTri(b1, t0, t1, tree.dead ? deadTree : trunk);
                }

                if (tree.dead) return;
                const canopyTop = M.vec3(tree.x, tree.y + trunkHeight + canopyHeight, tree.z);
                const canopyBase = M.vec3(tree.x, tree.y + trunkHeight + canopyHeight * 0.18, tree.z);
                for (let i = 0; i < dirs.length; i++) {
                    const d0 = dirs[i];
                    const d1 = dirs[(i + 1) % dirs.length];
                    const p0 = M.add(canopyBase, M.scale(d0, canopyRadius));
                    const p1 = M.add(canopyBase, M.scale(d1, canopyRadius));
                    pushTri(p0, canopyTop, p1, leaf);
                }
            });

            return {
                vertices: new Float32Array(vertices),
                normals: new Float32Array(normals),
                colors: new Float32Array(colors),
                count: vertices.length / 3
            };
        }

        buildLandmarkMesh() {
            const vertices = [];
            const normals = [];
            const colors = [];
            const waterfall = this.config.landmarks.waterfall;
            const waterColor = this.config.render.waterfallColor || this.config.render.waterHighlight;
            const lavaColor = this.config.render.lavaRockColor || this.config.render.rockColor;

            const pushQuad = (a, b, c, d, color) => {
                const pushTri = (p0, p1, p2) => {
                    const normal = M.normalize(M.cross(M.sub(p1, p0), M.sub(p2, p0)));
                    [p0, p1, p2].forEach(point => {
                        vertices.push(point.x, point.y, point.z);
                        normals.push(normal.x, normal.y || 0.2, normal.z);
                        colors.push(color[0], color[1], color[2]);
                    });
                };
                pushTri(a, b, c);
                pushTri(c, b, d);
            };

            if (waterfall) {
                this.buildRouteRibbon(waterfall.route, waterfall.startProgress, waterfall.endProgress, waterfall.width, waterfall.liftAboveTerrain, waterColor, pushQuad);
            }

            this.terrain.getFlightCorridors()
                .filter(route => route.visualAccent === 'obsidian')
                .forEach(route => {
                    this.buildRouteRibbon(route.name, 0.32, 0.86, route.width * 0.18, 3, lavaColor, pushQuad);
                });

            return {
                vertices: new Float32Array(vertices),
                normals: new Float32Array(normals),
                colors: new Float32Array(colors),
                count: vertices.length / 3
            };
        }

        buildRouteRibbon(routeName, startProgress, endProgress, width, lift, color, pushQuad) {
            const route = this.terrain.getFlightCorridors().find(item => item.name === routeName);
            if (!route) return;
            const frame = this.terrain.getCorridorFrame(route);
            const steps = 34;
            let previousLeft = null;
            let previousRight = null;
            for (let i = 0; i <= steps; i++) {
                const progress = M.lerp(startProgress, endProgress, i / steps);
                const t = M.lerp(-this.config.caldera.rimRadius, this.config.world.islandRadius * 0.92, progress);
                const center = M.scale(frame.dir, t);
                const left = M.add(center, M.scale(frame.right, -width));
                const right = M.add(center, M.scale(frame.right, width));
                left.y = this.terrain.getHeightAt(left.x, left.z) + lift;
                right.y = this.terrain.getHeightAt(right.x, right.z) + lift;

                if (previousLeft && previousRight) {
                    pushQuad(previousLeft, left, previousRight, right, color);
                }
                previousLeft = left;
                previousRight = right;
            }
        }
    }

    SkySquirrel.EnvironmentSystem = EnvironmentSystem;
}());
