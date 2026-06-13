# Sky Squirrel - Obsidian Crown Caldera

Sky Squirrel is a standalone native WebGL wingsuit game for GameHub. The world is built around a tall volcanic caldera island: the player starts on a broken crater rim, drops into a deep collapsed bowl, then follows natural descent lines through a waterfall gorge, lava-rock chute, or forested ridge.

## Controls

- WASD - walk on the launch rim, then pitch and roll in flight
- Space - jump from the rim
- Q/E - yaw while flying
- R - restart after impact
- Click canvas - request pointer lock for future mouse camera/input extensions

## Engine Shape

The game uses plain browser scripts and no external dependencies or build step.

- `WorldConfig.js` - primary authoring surface for caldera, corridors, launch sites, landmarks, vegetation, physics, camera, and render colors
- `Math3D.js` - small vector, matrix, and deterministic random helpers
- `TerrainSystem.js` - caldera heightmap, corridor carving, surface classification, launch points, and collision height queries
- `EnvironmentSystem.js` - water plane, waterfall/route landmarks, and procedural low-poly trees
- `FlightPhysics.js` - walking, launch, wingsuit flight, terrain/water impact, and restart
- `CameraController.js` - terrain-aware chase camera with velocity lookahead
- `WebGLRenderer.js` - native WebGL shaders, buffers, and draw calls
- `Game.js` / `main.js` - game orchestration and standalone startup

## World Editing

Start in `js/WorldConfig.js`. Most useful knobs:

- `caldera.rimRadius`, `caldera.rimHeight`, `caldera.bowlFloorHeight`
- `corridors[].angle`, `corridors[].width`, `corridors[].carveDepth`, `corridors[].floorHeight`
- `launchSites.primary`, `launchSites.lava`, `launchSites.forest`
- `landmarks.waterfall`, `landmarks.forestBands`
- `vegetation.treeCount`, `vegetation.corridorClearance`
- `physics.lift`, `physics.drag`, `physics.initialFlightSpeed`
- `camera.flightDistance`, `camera.lookAheadDistance`, `camera.highSpeedExtraDistance`

## Testing

Run the focused logic suite:

```bash
npx jest --coverage=false tests/coverage/SkySquirrel.logic.test.js
```

The tests cover caldera verticality, downhill corridor profiles, corridor carving, tree clearance, landmark geometry, launch/glide behavior, camera orientation, and GameHub integration metadata.
