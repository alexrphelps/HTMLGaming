/**
 * Game.js - Core game loop and scene management
 * Manages the Three.js scene, renderer, and coordinates all game systems
 */

class SkySquirrelGame {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.clock = new THREE.Clock();
        
        // Game systems
        this.player = null;
        this.inputHandler = null;
        this.cameraController = null;
        this.terrain = null;
        this.physics = null;
        
        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // UI elements
        this.speedElement = document.getElementById('speed');
        this.altitudeElement = document.getElementById('altitude');
        this.modeElement = document.getElementById('mode');
    }

    async init() {
        // Initialize Three.js scene
        this.initScene();
        this.initRenderer();
        this.initCamera();
        this.initLighting();
        
        // Initialize game systems
        await this.initSystems();
        
        // Start render loop
        this.animate();
    }

    initScene() {
        this.scene = new THREE.Scene();
        // Simple light blue/white sky gradient
        this.scene.background = new THREE.Color(0xB0E0E6); // Light blue
        this.scene.fog = new THREE.Fog(0xB0E0E6, 200, 3000);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // Note: sRGBEncoding and ACESFilmicToneMapping not available in Three.js r128
        // this.renderer.outputEncoding = THREE.sRGBEncoding;
        // this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        // this.renderer.toneMappingExposure = 1.0;
        
        this.container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75, // FOV
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near plane
            2000 // Far plane
        );
    }

    initLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -200;
        directionalLight.shadow.camera.right = 200;
        directionalLight.shadow.camera.top = 200;
        directionalLight.shadow.camera.bottom = -200;
        this.scene.add(directionalLight);
    }

    async initSystems() {
        // Initialize terrain first (needed for player positioning)
        this.terrain = new SkySquirrelTerrain();
        await this.terrain.init();
        
        // Add both terrain and water meshes to scene
        const meshes = this.terrain.getMeshes();
        meshes.forEach(mesh => {
            if (mesh) {
                this.scene.add(mesh);
            }
        });

        // Initialize physics
        this.physics = new SkySquirrelPhysics();
        this.physics.init();
        this.physics.setTerrain(this.terrain);

        // Initialize player
        this.player = new SkySquirrelPlayer(this.physics);
        await this.player.init();
        this.scene.add(this.player.mesh);

        // Position player at the highest point
        const highestPoint = this.terrain.getHighestPoint();
        this.player.setPosition(highestPoint.x, highestPoint.y, highestPoint.z);

        // Initialize input handler
        this.inputHandler = new SkySquirrelInputHandler();
        this.inputHandler.init();
        this.inputHandler.onInput = (input) => this.player.handleInput(input);
        
        // Set up mouse input for camera
        this.inputHandler.onMouseMoveCallback = (mouseX, mouseY) => {
            this.cameraController.updateMouseInput(mouseX, mouseY);
        };
        
        // Set up scroll input for camera zoom
        this.inputHandler.onScrollCallback = (deltaY) => {
            this.cameraController.handleScroll(deltaY);
        };

        // Initialize camera controller
        this.cameraController = new SkySquirrelCameraController(this.camera, this.player);
        this.cameraController.init();
    }

    start() {
        this.isRunning = true;
        console.log('Game started!');
    }

    stop() {
        this.isRunning = false;
        console.log('Game stopped!');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isRunning) return;

        // Calculate delta time
        this.deltaTime = this.clock.getDelta();
        this.lastTime = this.clock.getElapsedTime();

        // Update game systems
        this.update(this.deltaTime);

        // Render the scene
        this.render();
    }

    update(deltaTime) {
        // Update physics
        this.physics.update(deltaTime);

        // Update player
        this.player.update(deltaTime);

        // Update camera
        this.cameraController.update(deltaTime);

        // Update UI
        this.updateUI();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    updateUI() {
        if (this.speedElement) {
            const speed = this.player.getSpeed();
            this.speedElement.textContent = Math.round(speed * 3.6); // Convert m/s to km/h
        }

        if (this.altitudeElement) {
            const altitude = this.player.getAltitude();
            this.altitudeElement.textContent = Math.round(altitude);
        }

        if (this.modeElement) {
            const mode = this.player.getMode();
            this.modeElement.textContent = mode;
        }
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    destroy() {
        this.stop();
        
        // Clean up systems
        if (this.inputHandler) {
            this.inputHandler.destroy();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Remove canvas from DOM
        if (this.renderer && this.renderer.domElement) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
