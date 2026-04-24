/**
 * Tutorial Manager - Handles tutorial popups for new game elements
 */
class TutorialManager {
    constructor(game) {
        this.game = game;
        this.discoveredElements = new Set(); // Track what the player has discovered
        this.currentTutorial = null;
        this.isPaused = false;
        this.enabled = true; // Tutorial system can be disabled for testing
        
        // Tutorial definitions for different game elements
        this.tutorials = {
            'food': {
                title: '🍎 Food Cells',
                description: 'These small circular cells are your primary food source. Move over them to eat and grow larger. The bigger you get, the more food you need to survive.',
                icon: '●',
                color: '#90EE90',
                priority: 1
            },
            'amoeba': {
                title: '🦠 Amoeba Enemy',
                description: 'Dangerous amoeba cells that can engulf smaller cells. They move slowly but unpredictably. Avoid them when you\'re small, but you can eat them when you\'re larger.',
                icon: '🦠',
                color: '#87CEEB',
                priority: 3
            },
            'virus': {
                title: '🦠 Virus Enemy',
                description: 'Aggressive virus cells with spiky edges. They can kill cells up to 20% larger than themselves and tend to cluster together. Stay away from virus clusters!',
                icon: '🦠',
                color: '#FF6B6B',
                priority: 4
            },
            'biome_nutrient': {
                title: '🌱 Nutrient-Rich Zone',
                description: 'This green area provides bonus health regeneration. Staying here helps you recover from damage and grow faster. Look for the subtle green glow!',
                icon: '🌱',
                color: '#90EE90',
                priority: 2
            },
            'biome_toxic': {
                title: '☠️ Toxic Zone',
                description: 'This dangerous red area slowly damages cells that enter it. Your health will decrease while inside. Avoid these areas unless you\'re desperate!',
                icon: '☠️',
                color: '#DC143C',
                priority: 3
            },
            'biome_slow': {
                title: '🐌 Slow Zone',
                description: 'This blue area reduces movement speed for all cells. It can be used strategically to escape faster enemies or catch slower prey.',
                icon: '🐌',
                color: '#4169E1',
                priority: 2
            },
            'biome_aggressive': {
                title: '⚡ Aggressive Zone',
                description: 'This orange area increases movement speed and aggression for all cells. Enemies become more dangerous here, but you also move faster!',
                icon: '⚡',
                color: '#FFA500',
                priority: 3
            },
            'obstacle': {
                title: '🌱 Spawner Anomalie',
                description: 'Mysterious organic spawners that continuously release food spores into the environment. These natural formations provide a steady source of nutrients and come in different varieties.',
                icon: '🌱',
                color: '#4A90E2',
                priority: 2
            },
            'hazard_toxin': {
                title: '💀 Toxin Pool',
                description: 'Deadly toxin pools that gradually shrink any cell that touches them. These irregular-shaped hazards are extremely dangerous - stay away!',
                icon: '💀',
                color: '#8B0000',
                priority: 4
            },
            'hazard_acid': {
                title: '🧪 Acid Lake',
                description: 'Corrosive acid that rapidly damages cells. Much more dangerous than toxin pools - avoid at all costs!',
                icon: '🧪',
                color: '#FF4500',
                priority: 5
            },
            'current': {
                title: '🌊 Flow Currents',
                description: 'These flowing streams will push you in their direction when you enter them. Use them to move faster or escape, but be careful not to get pulled into danger!',
                icon: '🌊',
                color: '#87CEEB',
                priority: 2
            },
            'powerup_speed': {
                title: '⚡ Speed Boost',
                description: 'Temporarily increases your movement speed. Great for escaping danger or chasing down prey!',
                icon: '⚡',
                color: '#FFD700',
                priority: 3
            },
            'powerup_health': {
                title: '❤️ Health Boost',
                description: 'Restores your health and gives you a temporary health buffer. Essential for survival!',
                icon: '❤️',
                color: '#FF69B4',
                priority: 4
            },
            'powerup_size': {
                title: '📈 Size Boost',
                description: 'Temporarily increases your size and eating range. Makes you more powerful but also a bigger target!',
                icon: '📈',
                color: '#9370DB',
                priority: 3
            },
            'powerup_invincible': {
                title: '🛡️ Invincibility',
                description: 'Makes you temporarily invulnerable to damage. Use this to escape dangerous situations or attack larger enemies!',
                icon: '🛡️',
                color: '#00CED1',
                priority: 5
            },
            'powerup_magnet': {
                title: '🧲 Magnet',
                description: 'Pulls nearby food cells toward you automatically. Great for gathering food quickly!',
                icon: '🧲',
                color: '#B0C4DE',
                priority: 2
            }
        };
        
        this.setupTutorialUI();
    }
    
    /**
     * Setup the tutorial popup UI
     */
    setupTutorialUI() {
        // Create tutorial popup container
        this.tutorialContainer = document.createElement('div');
        this.tutorialContainer.id = 'tutorial-popup';
        this.tutorialContainer.className = 'hidden';
        
        this.tutorialContainer.innerHTML = `
            <div class="tutorial-overlay">
                <div class="tutorial-content">
                    <div class="tutorial-header">
                        <div class="tutorial-icon"></div>
                        <h2 class="tutorial-title"></h2>
                    </div>
                    <div class="tutorial-visual">
                        <canvas id="tutorial-canvas" width="200" height="200"></canvas>
                    </div>
                    <div class="tutorial-description"></div>
                    <div class="tutorial-footer">
                        <button id="tutorial-continue" class="tutorial-btn">Continue</button>
                        <div class="tutorial-tip">Press SPACE or click Continue to proceed</div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to game container
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
            gameContainer.appendChild(this.tutorialContainer);
        }
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners for tutorial controls
     */
    setupEventListeners() {
        const continueBtn = document.getElementById('tutorial-continue');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => this.continueTutorial());
        }
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (this.isPaused && (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape')) {
                e.preventDefault();
                this.continueTutorial();
            }
        });
    }
    
    /**
     * Check for new discoveries and show tutorial if needed
     */
    checkDiscoveries() {
        // Skip discovery checks if tutorial system is disabled
        if (!this.enabled || this.isPaused || !this.game.player) return;
        
        const player = this.game.player;
        const nearbyElements = this.getNearbyElements(player);
        
        // Sort by priority (higher priority first)
        // Filter out elements that don't have tutorial definitions
        const validElements = nearbyElements.filter(element => {
            const hasTutorial = this.tutorials[element.type] && typeof this.tutorials[element.type].priority === 'number';
            if (!hasTutorial) {
                console.warn(`⚠️ Tutorial not found for element type: "${element.type}"`);
            }
            return hasTutorial;
        });
        
        const sortedElements = validElements.sort((a, b) => 
            this.tutorials[b.type].priority - this.tutorials[a.type].priority
        );
        
        // Show tutorial for highest priority undiscovered element
        for (const element of sortedElements) {
            if (!this.discoveredElements.has(element.type)) {
                this.showTutorial(element.type);
                break; // Only show one tutorial at a time
            }
        }
    }
    
    /**
     * Get nearby elements that the player can discover
     */
    getNearbyElements(player) {
        const discoveries = [];
        const discoveryRadius = 150; // How close player needs to be to discover
        
        // Check food cells
        this.game.cells.forEach(cell => {
            if (this.distanceTo(player, cell) < discoveryRadius) {
                discoveries.push({ type: 'food', element: cell });
            }
        });
        
        // Check enemies
        this.game.enemies.forEach(enemy => {
            if (this.distanceTo(player, enemy) < discoveryRadius) {
                if (enemy.enemyType === 'amoeba') {
                    discoveries.push({ type: 'amoeba', element: enemy });
                } else if (enemy.enemyType === 'virus') {
                    discoveries.push({ type: 'virus', element: enemy });
                }
            }
        });
        
        // Check environmental elements
        if (this.game.environmentManager) {
            const envElements = this.game.environmentManager.getRenderElements();
            
            // Check biomes
            envElements.biomes.forEach(biome => {
                if (this.distanceTo(player, biome) < discoveryRadius) {
                    discoveries.push({ type: `biome_${biome.type}`, element: biome });
                }
            });
            
            // Check obstacles
            envElements.obstacles.forEach(obstacle => {
                if (this.distanceTo(player, obstacle) < discoveryRadius) {
                    discoveries.push({ type: 'obstacle', element: obstacle });
                }
            });
            
            // Check hazards (only if enabled)
            if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
                envElements.hazards.forEach(hazard => {
                    if (this.distanceTo(player, hazard) < discoveryRadius) {
                        discoveries.push({ type: `hazard_${hazard.type}`, element: hazard });
                    }
                });
            }
            
            // Check currents
            envElements.currents.forEach(current => {
                if (this.distanceTo(player, current) < discoveryRadius) {
                    discoveries.push({ type: 'current', element: current });
                }
            });
        }
        
        // Check power-ups
        if (this.game.powerUpManager) {
            this.game.powerUpManager.powerUps.forEach(powerUp => {
                if (this.distanceTo(player, powerUp) < discoveryRadius) {
                    discoveries.push({ type: `powerup_${powerUp.type}`, element: powerUp });
                }
            });
        }
        
        return discoveries;
    }
    
    /**
     * Show tutorial popup
     */
    showTutorial(elementType) {
        const tutorial = this.tutorials[elementType];
        if (!tutorial) return;
        
        this.currentTutorial = elementType;
        this.discoveredElements.add(elementType);
        this.isPaused = true;
        
        // Update tutorial content
        const iconEl = this.tutorialContainer.querySelector('.tutorial-icon');
        const titleEl = this.tutorialContainer.querySelector('.tutorial-title');
        const descEl = this.tutorialContainer.querySelector('.tutorial-description');
        
        iconEl.textContent = tutorial.icon;
        iconEl.style.color = tutorial.color;
        titleEl.textContent = tutorial.title;
        descEl.textContent = tutorial.description;
        
        // Render visual representation
        this.renderTutorialVisual(elementType, tutorial);
        
        // Show tutorial
        this.tutorialContainer.classList.remove('hidden');
        
        // Pause the game
        this.game.pause();
        
        console.log(`📚 Tutorial shown: ${tutorial.title}`);
    }
    
    /**
     * Render visual representation of the tutorial element
     */
    renderTutorialVisual(elementType, tutorial) {
        const canvas = document.getElementById('tutorial-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Render based on element type
        switch (elementType) {
            case 'food':
                this.renderFoodVisual(ctx, centerX, centerY);
                break;
            case 'amoeba':
                this.renderAmoebaVisual(ctx, centerX, centerY);
                break;
            case 'virus':
                this.renderVirusVisual(ctx, centerX, centerY);
                break;
            case 'biome_nutrient':
                this.renderNutrientBiomeVisual(ctx, centerX, centerY);
                break;
            case 'biome_toxic':
                this.renderToxicBiomeVisual(ctx, centerX, centerY);
                break;
            case 'biome_slow':
                this.renderSlowBiomeVisual(ctx, centerX, centerY);
                break;
            case 'biome_aggressive':
                this.renderAggressiveBiomeVisual(ctx, centerX, centerY);
                break;
            case 'obstacle':
                this.renderObstacleVisual(ctx, centerX, centerY);
                break;
            case 'hazard_toxin':
                if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
                    this.renderToxinHazardVisual(ctx, centerX, centerY);
                }
                break;
            case 'hazard_acid':
                if (CELLVIVE_CONSTANTS.ENVIRONMENT.HAZARDS.ENABLED) {
                    this.renderAcidHazardVisual(ctx, centerX, centerY);
                }
                break;
            case 'current':
                this.renderCurrentVisual(ctx, centerX, centerY);
                break;
            case 'powerup_speed':
                this.renderSpeedPowerUpVisual(ctx, centerX, centerY);
                break;
            case 'powerup_health':
                this.renderHealthPowerUpVisual(ctx, centerX, centerY);
                break;
            case 'powerup_size':
                this.renderSizePowerUpVisual(ctx, centerX, centerY);
                break;
            case 'powerup_invincible':
                this.renderInvinciblePowerUpVisual(ctx, centerX, centerY);
                break;
            case 'powerup_magnet':
                this.renderMagnetPowerUpVisual(ctx, centerX, centerY);
                break;
            default:
                this.renderGenericVisual(ctx, centerX, centerY, tutorial.color);
        }
    }
    
    /**
     * Continue tutorial and resume game
     */
    continueTutorial() {
        if (!this.isPaused) return;
        
        this.tutorialContainer.classList.add('hidden');
        this.isPaused = false;
        this.currentTutorial = null;
        
        // Resume the game
        this.game.resume();
        
        console.log('📚 Tutorial dismissed, game resumed');
    }
    
    /**
     * Calculate distance between two objects
     */
    distanceTo(obj1, obj2) {
        const dx = obj1.x - obj2.x;
        const dy = obj1.y - obj2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Render food cell visual
     */
    renderFoodVisual(ctx, centerX, centerY) {
        const radius = 15;
        
        // Create gradient for food cell
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, '#90EE90');
        gradient.addColorStop(1, '#32CD32');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add subtle glow
        ctx.shadowColor = '#90EE90';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#90EE90';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render amoeba visual
     */
    renderAmoebaVisual(ctx, centerX, centerY) {
        const radius = 20;
        
        // Create flowing blob shape
        ctx.fillStyle = 'rgba(135, 206, 235, 0.7)';
        ctx.beginPath();
        
        const points = 8;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const variation = 0.8 + Math.sin(angle * 3) * 0.2;
            const x = centerX + Math.cos(angle) * radius * variation;
            const y = centerY + Math.sin(angle) * radius * variation;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        ctx.fill();
        
        // Add flowing border
        ctx.strokeStyle = '#87CEEB';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    /**
     * Render virus visual
     */
    renderVirusVisual(ctx, centerX, centerY) {
        const radius = 20;
        
        // Draw main body
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw spikes
        const spikeCount = 8;
        ctx.strokeStyle = '#DC143C';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            const spikeLength = 12;
            
            const startX = centerX + Math.cos(angle) * radius;
            const startY = centerY + Math.sin(angle) * radius;
            const endX = centerX + Math.cos(angle) * (radius + spikeLength);
            const endY = centerY + Math.sin(angle) * (radius + spikeLength);
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        // Add glow effect
        ctx.shadowColor = '#FF6B6B';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render nutrient biome visual
     */
    renderNutrientBiomeVisual(ctx, centerX, centerY) {
        const size = 60;
        
        // Draw biome area
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, 'rgba(144, 238, 144, 0.3)');
        gradient.addColorStop(1, 'rgba(50, 205, 50, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add nutrient particles
        ctx.fillStyle = '#90EE90';
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const distance = 25 + Math.random() * 15;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render toxic biome visual
     */
    renderToxicBiomeVisual(ctx, centerX, centerY) {
        const size = 60;
        
        // Draw toxic area with red gradient to match the new mycelium network
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, 'rgba(220, 20, 60, 0.4)'); // Crimson red center
        gradient.addColorStop(0.6, 'rgba(220, 20, 60, 0.2)'); // Medium red
        gradient.addColorStop(1, 'rgba(220, 20, 60, 0.1)'); // Faint red edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add mycelium-like network dots to match the new visual
        ctx.fillStyle = '#DC143C'; // Crimson red dots
        const numDots = 6;
        for (let i = 0; i < numDots; i++) {
            const angle = (i / numDots) * Math.PI * 2;
            const distance = 20 + Math.random() * 25;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add connecting lines between some dots to represent the network
        ctx.strokeStyle = '#DC143C';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < numDots - 1; i++) {
            if (Math.random() < 0.7) { // 70% chance to draw connection
                const angle1 = (i / numDots) * Math.PI * 2;
                const angle2 = ((i + 1) / numDots) * Math.PI * 2;
                const distance1 = 20 + Math.random() * 25;
                const distance2 = 20 + Math.random() * 25;
                
                const x1 = centerX + Math.cos(angle1) * distance1;
                const y1 = centerY + Math.sin(angle1) * distance1;
                const x2 = centerX + Math.cos(angle2) * distance2;
                const y2 = centerY + Math.sin(angle2) * distance2;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        
        ctx.globalAlpha = 1; // Reset alpha
    }
    
    /**
     * Render slow biome visual with large circle and geometric cutouts
     */
    renderSlowBiomeVisual(ctx, centerX, centerY) {
        const largeRadius = 80; // Much larger circle
        
        // Create the main slow zone shape using clipping
        ctx.save();
        
        // Start with a large circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, largeRadius, 0, Math.PI * 2);
        
        // Create oval cutouts (using ellipse)
        ctx.ellipse(centerX - 25, centerY - 20, 15, 8, Math.PI * 0.3, 0, Math.PI * 2);
        ctx.ellipse(centerX + 30, centerY + 15, 12, 6, Math.PI * -0.2, 0, Math.PI * 2);
        
        // Create polygon cutouts (triangular shapes)
        ctx.moveTo(centerX - 10, centerY + 25);
        ctx.lineTo(centerX + 5, centerY + 35);
        ctx.lineTo(centerX + 15, centerY + 20);
        ctx.closePath();
        
        ctx.moveTo(centerX + 20, centerY - 30);
        ctx.lineTo(centerX + 35, centerY - 25);
        ctx.lineTo(centerX + 25, centerY - 15);
        ctx.closePath();
        
        // Use even-odd fill rule to create cutouts
        ctx.clip('evenodd');
        
        // Draw the transparent blue gradient within the clipped area
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, largeRadius);
        gradient.addColorStop(0, 'rgba(65, 105, 225, 0.4)');
        gradient.addColorStop(0.7, 'rgba(65, 105, 225, 0.2)');
        gradient.addColorStop(1, 'rgba(25, 25, 112, 0.1)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - largeRadius, centerY - largeRadius, largeRadius * 2, largeRadius * 2);
        
        ctx.restore();
        
        // Add a subtle border to define the shape
        ctx.strokeStyle = 'rgba(65, 105, 225, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, largeRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    /**
     * Render aggressive biome visual
     */
    renderAggressiveBiomeVisual(ctx, centerX, centerY) {
        const size = 60;
        
        // Draw aggressive area with orange gradient to match the mycelium network style
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, 'rgba(255, 165, 0, 0.4)'); // Orange center
        gradient.addColorStop(0.6, 'rgba(255, 165, 0, 0.2)'); // Medium orange
        gradient.addColorStop(1, 'rgba(255, 165, 0, 0.1)'); // Faint orange edge
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add mycelium-like network dots to match the toxic zone visual
        ctx.fillStyle = '#FFA500'; // Orange dots
        const numDots = 6;
        for (let i = 0; i < numDots; i++) {
            const angle = (i / numDots) * Math.PI * 2;
            const distance = 20 + Math.random() * 25;
            const x = centerX + Math.cos(angle) * distance;
            const y = centerY + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Add connecting lines between some dots to represent the network
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.6;
        
        for (let i = 0; i < numDots - 1; i++) {
            if (Math.random() < 0.7) { // 70% chance to draw connection
                const angle1 = (i / numDots) * Math.PI * 2;
                const angle2 = ((i + 1) / numDots) * Math.PI * 2;
                const distance1 = 20 + Math.random() * 25;
                const distance2 = 20 + Math.random() * 25;
                
                const x1 = centerX + Math.cos(angle1) * distance1;
                const y1 = centerY + Math.sin(angle1) * distance1;
                const x2 = centerX + Math.cos(angle2) * distance2;
                const y2 = centerY + Math.sin(angle2) * distance2;
                
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
        
        ctx.globalAlpha = 1; // Reset alpha
    }
    
    /**
     * Render obstacle visual
     */
    renderObstacleVisual(ctx, centerX, centerY) {
        const size = 30;
        
        // Draw rocky obstacle
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(centerX - size, centerY - size * 0.6);
        ctx.lineTo(centerX - size * 0.6, centerY - size);
        ctx.lineTo(centerX + size * 0.6, centerY - size);
        ctx.lineTo(centerX + size, centerY - size * 0.6);
        ctx.lineTo(centerX + size, centerY + size * 0.6);
        ctx.lineTo(centerX + size * 0.6, centerY + size);
        ctx.lineTo(centerX - size * 0.6, centerY + size);
        ctx.lineTo(centerX - size, centerY + size * 0.6);
        ctx.closePath();
        ctx.fill();
        
        // Add rock texture
        ctx.fillStyle = '#A0522D';
        for (let i = 0; i < 3; i++) {
            const x = centerX + (Math.random() - 0.5) * size;
            const y = centerY + (Math.random() - 0.5) * size;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render toxin hazard visual
     */
    renderToxinHazardVisual(ctx, centerX, centerY) {
        const size = 40;
        
        // Draw irregular toxin pool
        ctx.fillStyle = 'rgba(139, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.moveTo(centerX - size, centerY - size * 0.5);
        ctx.bezierCurveTo(centerX - size * 0.5, centerY - size, centerX + size * 0.3, centerY - size * 0.8, centerX + size, centerY - size * 0.3);
        ctx.bezierCurveTo(centerX + size * 0.8, centerY + size * 0.2, centerX + size * 0.4, centerY + size, centerX - size * 0.2, centerY + size * 0.7);
        ctx.bezierCurveTo(centerX - size * 0.8, centerY + size * 0.3, centerX - size * 1.2, centerY - size * 0.1, centerX - size, centerY - size * 0.5);
        ctx.closePath();
        ctx.fill();
        
        // Add toxic bubbles
        ctx.fillStyle = '#8B0000';
        for (let i = 0; i < 6; i++) {
            const x = centerX + (Math.random() - 0.5) * size * 1.5;
            const y = centerY + (Math.random() - 0.5) * size * 1.5;
            const bubbleSize = 2 + Math.random() * 3;
            
            ctx.beginPath();
            ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render acid hazard visual
     */
    renderAcidHazardVisual(ctx, centerX, centerY) {
        const size = 35;
        
        // Draw acid pool
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0.4)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add acid bubbles
        ctx.fillStyle = '#FF4500';
        for (let i = 0; i < 8; i++) {
            const x = centerX + (Math.random() - 0.5) * size;
            const y = centerY + (Math.random() - 0.5) * size;
            const bubbleSize = 2 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, bubbleSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render current visual
     */
    renderCurrentVisual(ctx, centerX, centerY) {
        const length = 80;
        const width = 15;
        
        // Draw flowing stream
        ctx.strokeStyle = 'rgba(135, 206, 235, 0.5)';
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(centerX - length/2, centerY);
        
        // Create wavy stream
        for (let i = 0; i <= 10; i++) {
            const x = centerX - length/2 + (i / 10) * length;
            const y = centerY + Math.sin(i * 0.8) * 10;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Add flow particles
        ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
        for (let i = 0; i < 5; i++) {
            const x = centerX - length/2 + (i / 4) * length;
            const y = centerY + Math.sin(i * 0.8) * 10;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Render speed power-up visual (yellow cell-like)
     */
    renderSpeedPowerUpVisual(ctx, centerX, centerY) {
        const size = 20;
        
        // Draw cell-like gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, '#FFF8DC'); // Cornsilk
        gradient.addColorStop(0.7, '#FFD700'); // Gold
        gradient.addColorStop(1, '#DAA520'); // Goldenrod
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Subtle glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render health power-up visual (purple cell-like)
     */
    renderHealthPowerUpVisual(ctx, centerX, centerY) {
        const size = 20;
        
        // Draw cell-like gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, '#F0E6FF'); // Light lavender
        gradient.addColorStop(0.7, '#DDA0DD'); // Plum
        gradient.addColorStop(1, '#9370DB'); // Medium purple
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle border
        ctx.strokeStyle = '#DDA0DD';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Subtle glow
        ctx.shadowColor = '#DDA0DD';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render size power-up visual (yellow cell-like)
     */
    renderSizePowerUpVisual(ctx, centerX, centerY) {
        const size = 20;
        
        // Draw cell-like gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, '#FFF8DC'); // Cornsilk
        gradient.addColorStop(0.7, '#FFD700'); // Gold
        gradient.addColorStop(1, '#DAA520'); // Goldenrod
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Subtle glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render invincible power-up visual (purple cell-like)
     */
    renderInvinciblePowerUpVisual(ctx, centerX, centerY) {
        const size = 20;
        
        // Draw cell-like gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, '#F0E6FF'); // Light lavender
        gradient.addColorStop(0.7, '#DDA0DD'); // Plum
        gradient.addColorStop(1, '#9370DB'); // Medium purple
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle border
        ctx.strokeStyle = '#DDA0DD';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Subtle glow
        ctx.shadowColor = '#DDA0DD';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render magnet power-up visual (yellow cell-like)
     */
    renderMagnetPowerUpVisual(ctx, centerX, centerY) {
        const size = 20;
        
        // Draw cell-like gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
        gradient.addColorStop(0, '#FFF8DC'); // Cornsilk
        gradient.addColorStop(0.7, '#FFD700'); // Gold
        gradient.addColorStop(1, '#DAA520'); // Goldenrod
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle border
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Subtle glow
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 8;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
    
    /**
     * Render generic visual for unknown elements
     */
    renderGenericVisual(ctx, centerX, centerY, color) {
        const size = 20;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    /**
     * Reset discovered elements (for new game)
     */
    reset() {
        this.discoveredElements.clear();
        this.currentTutorial = null;
        this.isPaused = false;
        this.tutorialContainer.classList.add('hidden');
    }
    
    /**
     * Hide all tutorial messages and clear current tutorial
     */
    hideAllMessages() {
        this.clearCurrentTutorial();
        console.log('📚 All tutorial messages hidden');
    }
    
    /**
     * Clear current tutorial state but preserve discovered elements
     * Used during game restart to maintain player's learning progress
     */
    clearCurrentTutorial() {
        this.currentTutorial = null;
        this.isPaused = false;
        this.tutorialContainer.classList.add('hidden');
        // Note: discoveredElements is NOT cleared - preserves tutorial progress
    }
}
