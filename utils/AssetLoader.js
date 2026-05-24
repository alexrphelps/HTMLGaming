/**
 * GameHub Asset Loader - Handles loading and caching of game assets
 * Supports images, audio, JSON data, and other resources
 */
class AssetLoader {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.totalLoaded = 0;
        this.totalToLoad = 0;
        this.onProgress = null;
        this.onComplete = null;
        
        // Supported file types
        this.imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
        this.audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
        this.dataExtensions = ['.json', '.xml', '.txt'];
        
        console.log('AssetLoader initialized');
    }
    
    // Main loading methods
    async load(assets, onProgress = null, onComplete = null) {
        this.onProgress = onProgress;
        this.onComplete = onComplete;
        
        if (Array.isArray(assets)) {
            return this.loadAssetList(assets);
        } else if (typeof assets === 'object') {
            return this.loadAssetObject(assets);
        } else {
            throw new Error('Assets must be an array or object');
        }
    }
    
    async loadAssetList(assetList) {
        this.totalToLoad = assetList.length;
        this.totalLoaded = 0;
        
        const promises = assetList.map(asset => {
            if (typeof asset === 'string') {
                return this.loadAsset(asset, asset);
            } else if (typeof asset === 'object' && asset.name && asset.url) {
                return this.loadAsset(asset.name, asset.url, asset.type);
            } else {
                throw new Error('Invalid asset format');
            }
        });
        
        const results = await Promise.allSettled(promises);
        
        if (this.onComplete) {
            this.onComplete();
        }
        
        return results;
    }
    
    async loadAssetObject(assetObj) {
        const entries = Object.entries(assetObj);
        this.totalToLoad = entries.length;
        this.totalLoaded = 0;
        
        const promises = entries.map(([name, url]) => this.loadAsset(name, url));
        const results = await Promise.allSettled(promises);
        
        if (this.onComplete) {
            this.onComplete();
        }
        
        return results;
    }
    
    async loadAsset(name, url, type = null) {
        // Check cache first
        if (this.cache.has(name)) {
            return this.cache.get(name);
        }
        
        // Check if already loading
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        // Determine asset type from extension if not specified
        if (!type) {
            type = this.getAssetType(url);
        }
        
        let loadPromise;
        
        switch (type) {
            case 'image':
                loadPromise = this.loadImage(name, url);
                break;
            case 'audio':
                loadPromise = this.loadAudio(name, url);
                break;
            case 'json':
                loadPromise = this.loadJSON(name, url);
                break;
            case 'text':
                loadPromise = this.loadText(name, url);
                break;
            default:
                throw new Error(`Unsupported asset type: ${type}`);
        }
        
        this.loadingPromises.set(name, loadPromise);
        
        try {
            const asset = await loadPromise;
            this.cache.set(name, asset);
            this.totalLoaded++;
            
            if (this.onProgress) {
                this.onProgress(this.totalLoaded, this.totalToLoad, name);
            }
            
            console.log(`Asset loaded: ${name}`);
            return asset;
            
        } catch (error) {
            console.error(`? Failed to load asset ${name}:`, error);
            throw error;
        } finally {
            this.loadingPromises.delete(name);
        }
    }
    
    getAssetType(url) {
        const extension = url.toLowerCase().substring(url.lastIndexOf('.'));
        
        if (this.imageExtensions.includes(extension)) {
            return 'image';
        } else if (this.audioExtensions.includes(extension)) {
            return 'audio';
        } else if (extension === '.json') {
            return 'json';
        } else if (this.dataExtensions.includes(extension)) {
            return 'text';
        } else {
            return 'unknown';
        }
    }
    
    // Specific asset type loaders
    async loadImage(name, url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                resolve({
                    type: 'image',
                    name,
                    url,
                    data: image,
                    width: image.width,
                    height: image.height
                });
            };
            
            image.onerror = () => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            // Handle cross-origin images
            image.crossOrigin = 'anonymous';
            image.src = url;
        });
    }
    
    async loadAudio(name, url) {
        if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('Web Audio API not supported');
        }
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            return {
                type: 'audio',
                name,
                url,
                data: arrayBuffer,
                size: arrayBuffer.byteLength
            };
            
        } catch (error) {
            throw new Error(`Failed to load audio: ${url} - ${error.message}`);
        }
    }
    
    async loadJSON(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            return {
                type: 'json',
                name,
                url,
                data
            };
            
        } catch (error) {
            throw new Error(`Failed to load JSON: ${url} - ${error.message}`);
        }
    }
    
    async loadText(name, url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            
            return {
                type: 'text',
                name,
                url,
                data: text,
                size: text.length
            };
            
        } catch (error) {
            throw new Error(`Failed to load text: ${url} - ${error.message}`);
        }
    }
    
    // Cache management
    get(name) {
        return this.cache.get(name);
    }
    
    has(name) {
        return this.cache.has(name);
    }
    
    remove(name) {
        const asset = this.cache.get(name);
        if (asset) {
            this.cache.delete(name);
            
            // Cleanup WebGL textures if applicable
            if (asset.type === 'image' && asset.webglTexture && window.engine) {
                const gl = window.engine.renderer?.contextGL;
                if (gl) {
                    gl.deleteTexture(asset.webglTexture);
                }
            }
            
            console.log(`Asset removed from cache: ${name}`);
        }
    }
    
    clear() {
        // Cleanup WebGL resources
        this.cache.forEach((asset, name) => {
            if (asset.type === 'image' && asset.webglTexture && window.engine) {
                const gl = window.engine.renderer?.contextGL;
                if (gl) {
                    gl.deleteTexture(asset.webglTexture);
                }
            }
        });
        
        this.cache.clear();
        console.log('Asset cache cleared');
    }
    
    // Utility methods
    getImage(name) {
        const asset = this.cache.get(name);
        return asset && asset.type === 'image' ? asset.data : null;
    }
    
    getAudio(name) {
        const asset = this.cache.get(name);
        return asset && asset.type === 'audio' ? asset.data : null;
    }
    
    getJSON(name) {
        const asset = this.cache.get(name);
        return asset && asset.type === 'json' ? asset.data : null;
    }
    
    getText(name) {
        const asset = this.cache.get(name);
        return asset && asset.type === 'text' ? asset.data : null;
    }
    
    // Batch operations
    async loadImages(imageMap) {
        const promises = Object.entries(imageMap).map(([name, url]) =>
            this.loadAsset(name, url, 'image')
        );
        return Promise.allSettled(promises);
    }
    
    async loadSounds(soundMap) {
        const promises = Object.entries(soundMap).map(([name, url]) =>
            this.loadAsset(name, url, 'audio')
        );
        return Promise.allSettled(promises);
    }
    
    // Progress tracking
    getProgress() {
        return {
            loaded: this.totalLoaded,
            total: this.totalToLoad,
            percentage: this.totalToLoad > 0 ? (this.totalLoaded / this.totalToLoad) * 100 : 0
        };
    }
    
    isLoading() {
        return this.loadingPromises.size > 0;
    }
    
    // Preloading utilities
    async preloadGame(gameAssets) {
        console.log(`Preloading game assets...`);
        
        const startTime = performance.now();
        const results = await this.load(gameAssets);
        const endTime = performance.now();
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Preloading complete: ${successful} loaded, ${failed} failed in ${(endTime - startTime).toFixed(2)}ms`);
        
        return {
            successful,
            failed,
            loadTime: endTime - startTime,
            results
        };
    }
    
    // Asset validation
    validateAsset(asset) {
        if (!asset || !asset.type || !asset.name || !asset.data) {
            return false;
        }
        
        switch (asset.type) {
            case 'image':
                return asset.data instanceof HTMLImageElement && 
                       asset.data.complete && 
                       asset.data.naturalWidth > 0;
            case 'audio':
                return asset.data instanceof ArrayBuffer && asset.data.byteLength > 0;
            case 'json':
                return typeof asset.data === 'object';
            case 'text':
                return typeof asset.data === 'string';
            default:
                return false;
        }
    }
    
    // Cache statistics
    getCacheStats() {
        const stats = {
            totalAssets: this.cache.size,
            imageCount: 0,
            audioCount: 0,
            jsonCount: 0,
            textCount: 0,
            totalSize: 0
        };
        
        this.cache.forEach(asset => {
            stats[asset.type + 'Count']++;
            
            if (asset.size) {
                stats.totalSize += asset.size;
            } else if (asset.type === 'image') {
                // Estimate image size
                stats.totalSize += asset.width * asset.height * 4; // RGBA
            }
        });
        
        return stats;
    }
    
    // Memory management
    cleanup() {
        this.clear();
        this.loadingPromises.clear();
        this.totalLoaded = 0;
        this.totalToLoad = 0;
        this.onProgress = null;
        this.onComplete = null;
        
        console.log('AssetLoader cleaned up');
    }
}

// Global asset loader instance
window.assetLoader = new AssetLoader();

// Make AssetLoader class available globally
window.AssetLoader = AssetLoader;