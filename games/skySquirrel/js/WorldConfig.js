/**
 * WorldConfig.js - Single tuning surface for the native WebGL wingsuit world.
 */
(function () {
    'use strict';

    const SkySquirrel = window.SkySquirrel = window.SkySquirrel || {};

    SkySquirrel.WorldConfig = {
        world: {
            seed: 84721,
            size: 8200,
            islandRadius: 3550,
            waterLevel: 0,
            terrainResolution: 168,
            smoothingPasses: 1,
            spawnHeading: Math.PI,
            startPadding: 24
        },

        caldera: {
            rimRadius: 1180,
            rimHeight: 1920,
            rimWidth: 360,
            rimBreakStrength: 0.26,
            launchPadHeight: 2840,
            launchPadRadius: 170,
            bowlRadius: 640,
            bowlFloorHeight: 470,
            bowlDepth: 1180,
            craterAsymmetry: 0.18,
            outerCliffHeight: 520,
            coastalShelfHeight: 120,
            coastlineSharpness: 4.8,
            smoothingPreserveSlope: 0.48
        },

        corridors: [
            {
                name: 'waterfall-gorge',
                label: 'Waterfall Gorge',
                angle: Math.PI,
                width: 280,
                rimNotchWidth: 210,
                carveDepth: 0.98,
                floorHeight: 54,
                launchOffset: -80,
                visualAccent: 'waterfall'
            },
            {
                name: 'lava-chute',
                label: 'Lava Chute',
                angle: Math.PI * 0.36,
                width: 260,
                rimNotchWidth: 170,
                carveDepth: 0.96,
                floorHeight: 96,
                launchOffset: 40,
                visualAccent: 'obsidian'
            },
            {
                name: 'forest-ridge',
                label: 'Forest Ridge',
                angle: Math.PI * 1.63,
                width: 380,
                rimNotchWidth: 230,
                carveDepth: 0.93,
                floorHeight: 130,
                launchOffset: 60,
                visualAccent: 'forest'
            }
        ],

        launchSites: {
            primary: {
                corridor: 'waterfall-gorge',
                rimOffset: 92,
                lateralOffset: -34
            },
            lava: {
                corridor: 'lava-chute',
                rimOffset: 70,
                lateralOffset: 26
            },
            forest: {
                corridor: 'forest-ridge',
                rimOffset: 76,
                lateralOffset: -18
            }
        },

        landmarks: {
            waterfall: {
                route: 'waterfall-gorge',
                startProgress: 0.22,
                endProgress: 0.78,
                width: 42,
                liftAboveTerrain: 5
            },
            cliffGates: [
                { route: 'waterfall-gorge', progress: 0.36, width: 210 },
                { route: 'lava-chute', progress: 0.48, width: 170 },
                { route: 'forest-ridge', progress: 0.55, width: 240 }
            ],
            forestBands: [
                { minHeight: 120, maxHeight: 760, minRadius: 1320, maxRadius: 3100 }
            ]
        },

        vegetation: {
            seed: 1937,
            treeCount: 980,
            minAltitude: 80,
            maxAltitude: 760,
            maxSlope: 0.42,
            minRadius: 1280,
            maxRadius: 3200,
            clusterStrength: 0.62,
            trunkHeight: 18,
            canopyHeight: 46,
            corridorClearance: 1.15,
            launchClearance: 240
        },

        physics: {
            gravity: 27,
            walkingSpeed: 72,
            walkingFriction: 0.82,
            launchImpulse: 52,
            initialFlightSpeed: 174,
            minFlightSpeed: 64,
            maxFlightSpeed: 390,
            lift: 0.023,
            drag: 0.0036,
            diveAcceleration: 32,
            stallSpeed: 58,
            pitchRate: 1.38,
            rollRate: 1.82,
            yawRate: 1.05,
            bankTurnInfluence: 0.68,
            crashSpeed: 42,
            bodyRadius: 3.6,
            launchCollisionGrace: 0.9,
            restartDelay: 0.35
        },

        camera: {
            walkingDistance: 62,
            walkingHeight: 30,
            flightDistance: 128,
            flightHeight: 46,
            highSpeedExtraDistance: 70,
            lookAheadDistance: 92,
            crashedDistance: 88,
            crashedHeight: 38,
            smoothness: 0.075,
            terrainClearance: 12
        },

        render: {
            skyColor: [0.54, 0.77, 0.96],
            horizonColor: [0.78, 0.9, 0.98],
            fogColor: [0.62, 0.78, 0.88],
            fogNear: 900,
            fogFar: 4800,
            sunDirection: [-0.42, 0.86, -0.28],
            waterColor: [0.03, 0.25, 0.46],
            waterHighlight: [0.26, 0.58, 0.78],
            sandColor: [0.66, 0.58, 0.39],
            grassColor: [0.16, 0.4, 0.2],
            rockColor: [0.18, 0.16, 0.15],
            lavaRockColor: [0.1, 0.08, 0.075],
            snowColor: [0.86, 0.9, 0.92],
            trunkColor: [0.29, 0.18, 0.1],
            leafColor: [0.05, 0.27, 0.11],
            deadTreeColor: [0.2, 0.17, 0.14],
            waterfallColor: [0.62, 0.86, 0.95],
            playerColor: [0.95, 0.18, 0.12],
            suitColor: [0.08, 0.09, 0.11]
        }
    };
}());
