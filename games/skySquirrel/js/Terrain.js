/**
 * Terrain.js - Procedural mountain terrain with plateau
 * Generates a large mountain with a flat area at the peak for takeoff
 */

class SkySquirrelTerrain {
    constructor() {
        this.mesh = null;
        this.geometry = null;
        this.material = null;
        this.waterMesh = null;
        
        // Terrain parameters
        this.width = 3000;
        this.height = 3000;
        this.segments = 300;
        this.waterLevel = 0;
        this.maxHeight = 1200;
        this.plateauRadius = 80;
        this.plateauHeight = 800;
        this.mountainBaseRadius = 800;
        
        // Noise parameters
        this.noiseScale = 0.008;
        this.noiseOctaves = 5;
        this.noisePersistence = 0.6;
        this.noiseLacunarity = 2.2;
        
        // Height data for collision detection
        this.heightData = null;
    }

    async init() {
        this.generateHeightData();
        this.createTerrainMesh();
        this.createWaterMesh();
        console.log('Terrain initialized');
    }

    generateHeightData() {
        const size = this.segments + 1;
        this.heightData = new Array(size).fill(null).map(() => new Array(size).fill(this.waterLevel));
        
        const centerX = size / 2;
        const centerZ = size / 2;
        const plateauRadiusInSegments = (this.plateauRadius / this.width) * this.segments;
        const mountainBaseRadiusInSegments = (this.mountainBaseRadius / this.width) * this.segments;
        
        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                const worldX = (x / this.segments) * this.width - this.width / 2;
                const worldZ = (z / this.segments) * this.height - this.height / 2;
                
                // Calculate distance from center
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(z - centerZ, 2)
                );
                
                let height = this.waterLevel; // Start at water level
                
                // Only generate land within the mountain base radius
                if (distanceFromCenter < mountainBaseRadiusInSegments) {
                    // Create plateau at the center (highest point)
                    if (distanceFromCenter < plateauRadiusInSegments) {
                        height = this.plateauHeight;
                    } else {
                        // Generate mountain terrain with smooth falloff to water
                        height = this.generateMountainHeight(worldX, worldZ, distanceFromCenter, mountainBaseRadiusInSegments);
                    }
                }
                // Everything outside mountain base radius stays at water level
                
                this.heightData[x][z] = height;
            }
        }
    }

    generateMountainHeight(x, z, distanceFromCenter, mountainBaseRadius) {
        let height = 0;
        let amplitude = 1;
        let frequency = this.noiseScale;
        
        // Generate multiple noise octaves
        for (let i = 0; i < this.noiseOctaves; i++) {
            height += this.simplexNoise(x * frequency, z * frequency) * amplitude;
            amplitude *= this.noisePersistence;
            frequency *= this.noiseLacunarity;
        }
        
        // Scale and offset the height
        height = (height + 1) * 0.5; // Normalize to 0-1
        height *= this.maxHeight;
        
        // Create smooth falloff from plateau to water level
        const plateauRadiusInSegments = (this.plateauRadius / this.width) * this.segments;
        const falloffDistance = mountainBaseRadius - plateauRadiusInSegments;
        const falloff = Math.max(0, 1 - (distanceFromCenter - plateauRadiusInSegments) / falloffDistance);
        
        // Blend between plateau height and water level
        height = height * falloff + this.plateauHeight * (1 - falloff);
        
        // Apply final falloff to ensure smooth transition to water
        const edgeFalloff = Math.max(0, 1 - (distanceFromCenter / mountainBaseRadius));
        height = this.waterLevel + (height - this.waterLevel) * edgeFalloff;
        
        // Ensure height is at least water level
        return Math.max(this.waterLevel, height);
    }

    // Enhanced noise implementation for more realistic terrain
    simplexNoise(x, z) {
        // Multiple noise layers for more realistic terrain
        const n1 = Math.sin(x * 0.1) * Math.cos(z * 0.1);
        const n2 = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.5;
        const n3 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 0.25;
        const n4 = Math.sin(x * 0.08) * Math.cos(z * 0.12) * 0.3;
        const n5 = Math.sin(x * 0.15) * Math.cos(z * 0.08) * 0.2;
        
        // Add some ridge-like features
        const ridge = Math.abs(Math.sin(x * 0.03 + z * 0.02)) * 0.1;
        
        return n1 + n2 + n3 + n4 + n5 + ridge;
    }

    createTerrainMesh() {
        // Create geometry
        this.geometry = new THREE.PlaneGeometry(
            this.width,
            this.height,
            this.segments,
            this.segments
        );
        
        // Rotate to be horizontal
        this.geometry.rotateX(-Math.PI / 2);
        
        // Apply height data to vertices
        const vertices = this.geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i];
            const z = vertices[i + 2];
            
            // Convert world coordinates to height data indices
            const dataX = Math.round(((x + this.width / 2) / this.width) * this.segments);
            const dataZ = Math.round(((z + this.height / 2) / this.height) * this.segments);
            
            // Clamp indices
            const clampedX = Math.max(0, Math.min(this.segments, dataX));
            const clampedZ = Math.max(0, Math.min(this.segments, dataZ));
            
            // Set vertex height
            vertices[i + 1] = this.heightData[clampedX][clampedZ];
        }
        
        // Update normals for proper lighting
        this.geometry.computeVertexNormals();
        
        // Create material with better colors
        this.material = new THREE.MeshLambertMaterial({
            color: 0x8B7355, // Better brown color for mountain
            side: THREE.DoubleSide
        });
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        
        // Add texture variation
        this.addTerrainTextureVariation();
    }

    createWaterMesh() {
        // Create water geometry (flat plane at water level, much larger than terrain)
        const waterGeometry = new THREE.PlaneGeometry(this.width * 2, this.height * 2, 1, 1);
        waterGeometry.rotateX(-Math.PI / 2);
        
        // Position water at water level
        waterGeometry.translate(0, this.waterLevel, 0);
        
        // Create water material
        const waterMaterial = new THREE.MeshLambertMaterial({
            color: 0x1e3a8a, // Dark blue water
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        // Create water mesh
        this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        this.waterMesh.receiveShadow = true;
        this.waterMesh.name = 'water';
    }

    addTerrainTextureVariation() {
        // Create a simple texture variation based on height
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Create gradient based on height - better colors for mountain
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#F8F8FF'); // Snow at top
        gradient.addColorStop(0.2, '#E6E6FA'); // Light gray rock
        gradient.addColorStop(0.4, '#8B7355'); // Brown rock
        gradient.addColorStop(0.6, '#6B8E23'); // Olive green
        gradient.addColorStop(0.8, '#228B22'); // Forest green
        gradient.addColorStop(1, '#654321'); // Dark brown base
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        
        // Add some noise for texture
        const imageData = ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 15;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));     // Red
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // Green
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(6, 6);
        
        this.material.map = texture;
        this.material.needsUpdate = true;
    }

    // Get both terrain and water meshes
    getMeshes() {
        return [this.mesh, this.waterMesh];
    }

    getHeightAt(x, z) {
        // Convert world coordinates to height data indices
        const dataX = Math.round(((x + this.width / 2) / this.width) * this.segments);
        const dataZ = Math.round(((z + this.height / 2) / this.height) * this.segments);
        
        // Clamp indices
        const clampedX = Math.max(0, Math.min(this.segments, dataX));
        const clampedZ = Math.max(0, Math.min(this.segments, dataZ));
        
        return this.heightData[clampedX][clampedZ];
    }

    getPlateauPosition() {
        return {
            x: 0,
            y: this.plateauHeight + 2, // Start slightly above the plateau
            z: 0
        };
    }

    getHighestPoint() {
        return {
            x: 0,
            y: this.plateauHeight + 2, // Highest point is the plateau
            z: 0
        };
    }

    getPlateauRadius() {
        return this.plateauRadius;
    }

    getPlateauHeight() {
        return this.plateauHeight;
    }

    // Check if position is within terrain bounds
    isWithinBounds(x, z) {
        return x >= -this.width / 2 && x <= this.width / 2 &&
               z >= -this.height / 2 && z <= this.height / 2;
    }

    // Get terrain bounds
    getBounds() {
        return {
            minX: -this.width / 2,
            maxX: this.width / 2,
            minZ: -this.height / 2,
            maxZ: this.height / 2,
            minY: 0,
            maxY: this.maxHeight
        };
    }

    // Dispose of resources
    dispose() {
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
    }
}
