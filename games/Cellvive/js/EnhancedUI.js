/**
 * Enhanced UI System - Better HUD with more information and visual polish
 */
class EnhancedUI {
    constructor(game) {
        this.game = game;
        this.ctx = game.ctx;
        
        // UI elements
        this.showDebugInfo = false;
        this.showPowerUpStatus = true;
        this.showMinimap = true;
        
        // Animation properties
        this.sizeAnimation = { value: 0, target: 0, speed: 0.05 };
        
        // Power-up display
        this.powerUpDisplay = {
            active: [],
            fadeOut: []
        };
        
        // Damage indicators
        this.damageIndicators = [];
        
        // Notification system
        this.notifications = [];
        
        console.log('🎮 Enhanced UI initialized');
    }
    
    /**
     * Update UI animations and effects
     */
    update() {
        // Update size animation
        this.sizeAnimation.value += (this.sizeAnimation.target - this.sizeAnimation.value) * this.sizeAnimation.speed;
        
        // Update power-up display
        this.updatePowerUpDisplay();
        
        // Update damage indicators
        this.updateDamageIndicators();
        
        // Update notifications
        this.updateNotifications();
    }
    
    /**
     * Update power-up display
     */
    updatePowerUpDisplay() {
        // Clear active power-ups and rebuild from player
        if (this.game.player) {
            this.powerUpDisplay.active = [];
            
            const now = Date.now();
            
            // Check for active power-ups
            if (this.game.player.powerUpSpeed && this.game.player.powerUpSpeedEnd > now) {
                const timeLeft = Math.max(0, this.game.player.powerUpSpeedEnd - now);
                this.powerUpDisplay.active.push({
                    type: 'speed',
                    color: '#00ff00',
                    timeLeft: timeLeft,
                    icon: '⚡'
                });
            }
            
            if (this.game.player.powerUpSize && this.game.player.powerUpSizeEnd > now) {
                const timeLeft = Math.max(0, this.game.player.powerUpSizeEnd - now);
                this.powerUpDisplay.active.push({
                    type: 'size',
                    color: '#ffff00',
                    timeLeft: timeLeft,
                    icon: '🔍'
                });
            }
            
            if (this.game.player.powerUpInvincible && this.game.player.powerUpInvincibleEnd > now) {
                const timeLeft = Math.max(0, this.game.player.powerUpInvincibleEnd - now);
                this.powerUpDisplay.active.push({
                    type: 'invincible',
                    color: '#ffffff',
                    timeLeft: timeLeft,
                    icon: '🛡️'
                });
            }
            
            if (this.game.player.powerUpMagnet && this.game.player.powerUpMagnetEnd > now) {
                const timeLeft = Math.max(0, this.game.player.powerUpMagnetEnd - now);
                this.powerUpDisplay.active.push({
                    type: 'magnet',
                    color: '#00ffff',
                    timeLeft: timeLeft,
                    icon: '🧲'
                });
            }
        }
    }
    
    /**
     * Update damage indicators
     */
    updateDamageIndicators() {
        for (let i = this.damageIndicators.length - 1; i >= 0; i--) {
            const indicator = this.damageIndicators[i];
            indicator.y -= 2; // Float upward
            indicator.life--;
            indicator.alpha = indicator.life / indicator.maxLife;
            
            if (indicator.life <= 0) {
                this.damageIndicators.splice(i, 1);
            }
        }
    }
    
    /**
     * Update notifications
     */
    updateNotifications() {
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            notification.life--;
            notification.alpha = Math.min(1, notification.life / 30); // Fade in quickly
            
            if (notification.life <= 0) {
                this.notifications.splice(i, 1);
            }
        }
    }
    
    /**
     * Render all UI elements
     */
    render() {
        if (!this.game.player || this.game.gameState !== 'playing') return;
        
        this.renderHUD();
        this.renderPowerUpStatus();
        this.renderDamageIndicators();
        this.renderNotifications();
        
        if (this.showDebugInfo) {
            this.renderDebugInfo();
        }
    }
    
    /**
     * Render main HUD
     */
    renderHUD() {
        const ctx = this.ctx;
        const player = this.game.player;
        
        // Update animation targets
        this.sizeAnimation.target = player.radius;
        
        // Health bar background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(20, 20, 200, 20);
        
        // Health bar fill
        const healthPercent = player.health / player.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#00ff00' : 
                           healthPercent > 0.3 ? '#ffff00' : '#ff0000';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(20, 20, 200 * healthPercent, 20);
        
        // Health bar border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, 20, 200, 20);
        
        // Health text
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(`Health: ${Math.round(player.health)}/${player.maxHealth}`, 25, 35);
        
        // Score display removed - now shown in top-left HUD
        
        // Size display with animation
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`Size: ${Math.round(this.sizeAnimation.value)}`, 20, 85);
        
        // Speed display
        const speed = Math.hypot(player.velocityX, player.velocityY);
        ctx.fillStyle = '#00ffff';
        ctx.font = '14px Arial';
        ctx.fillText(`Speed: ${speed.toFixed(1)}`, 20, 110);
        
        // Survival time
        const survivalTime = Math.floor((Date.now() - this.game.gameStartTime) / 1000);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.fillText(`Time: ${survivalTime}s`, 20, 135);
    }
    
    /**
     * Render minimap
     */
    renderMinimap() {
        if (!this.showMinimap) return;
        
        const ctx = this.ctx;
        const player = this.game.player;
        const camera = this.game.camera;
        const mapSize = 150;
        const mapX = ctx.canvas.width - mapSize - 20;
        const mapY = 20;
        
        // Minimap background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(mapX, mapY, mapSize, mapSize);
        
        // Minimap border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, mapSize, mapSize);
        
        // Calculate scale
        const scaleX = mapSize / this.game.config.worldWidth;
        const scaleY = mapSize / this.game.config.worldHeight;
        
        // Draw player position
        const playerMapX = mapX + player.x * scaleX;
        const playerMapY = mapY + player.y * scaleY;
        
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(playerMapX, playerMapY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Calculate effective viewport size (what the camera can see in world coordinates)
        // This matches the calculation in updateCamera()
        const zoom = camera.zoom || 1.0;
        const effectiveViewWidth = ctx.canvas.width / zoom;
        const effectiveViewHeight = ctx.canvas.height / zoom;
        
        // Draw camera view area (adjusted for zoom)
        const viewWidth = effectiveViewWidth * scaleX;
        const viewHeight = effectiveViewHeight * scaleY;
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(
            mapX + camera.x * scaleX,
            mapY + camera.y * scaleY,
            viewWidth,
            viewHeight
        );
        
        // Add zoom level indicator
        if (zoom < 1.0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '10px Arial';
            ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, mapX + 5, mapY + 15);
        }
    }
    
    /**
     * Render power-up status
     */
    renderPowerUpStatus() {
        if (!this.showPowerUpStatus) return;
        
        const ctx = this.ctx;
        const startX = 20;
        const startY = 160;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(startX - 5, startY - 5, 250, this.powerUpDisplay.active.length * 25 + 10);
        
        for (let i = 0; i < this.powerUpDisplay.active.length; i++) {
            const powerUp = this.powerUpDisplay.active[i];
            const y = startY + i * 25;
            
            // Power-up icon and name
            ctx.fillStyle = powerUp.color;
            ctx.font = '16px Arial';
            ctx.fillText(powerUp.icon, startX, y);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.fillText(powerUp.type.toUpperCase(), startX + 25, y);
            
            // Time remaining bar
            const timePercent = powerUp.timeLeft / 10000; // Assuming 10s max duration
            const barWidth = 150;
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(startX + 80, y - 10, barWidth, 8);
            
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(startX + 80, y - 10, barWidth * Math.max(0, timePercent), 8);
            
            // Time text
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.fillText(`${(powerUp.timeLeft / 1000).toFixed(1)}s`, startX + 240, y - 3);
        }
    }
    
    /**
     * Render damage indicators
     */
    renderDamageIndicators() {
        const ctx = this.ctx;
        
        for (const indicator of this.damageIndicators) {
            ctx.save();
            ctx.globalAlpha = indicator.alpha;
            ctx.fillStyle = indicator.color;
            ctx.font = 'bold 16px Arial';
            ctx.fillText(indicator.text, indicator.x, indicator.y);
            ctx.restore();
        }
    }
    
    /**
     * Render notifications
     */
    renderNotifications() {
        const ctx = this.ctx;
        const startX = ctx.canvas.width / 2 - 100;
        const startY = 100;
        
        for (let i = 0; i < this.notifications.length; i++) {
            const notification = this.notifications[i];
            const y = startY + i * 30;
            
            ctx.save();
            ctx.globalAlpha = notification.alpha;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(startX - 10, y - 15, 200, 25);
            
            ctx.fillStyle = notification.color;
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(notification.text, startX + 90, y);
            ctx.restore();
        }
    }
    
    /**
     * Render debug information
     */
    renderDebugInfo() {
        const ctx = this.ctx;
        const player = this.game.player;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, ctx.canvas.height - 200, 300, 190);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        
        let y = ctx.canvas.height - 180;
        ctx.fillText(`FPS: ${Math.round(1000 / this.game.deltaTime)}`, 20, y);
        y += 15;
        ctx.fillText(`Cells: ${this.game.cells.length}`, 20, y);
        y += 15;
        ctx.fillText(`Enemies: ${this.game.enemies.length}`, 20, y);
        y += 15;
        ctx.fillText(`Power-ups: ${this.game.powerUpManager?.powerUps.length || 0}`, 20, y);
        y += 15;
        ctx.fillText(`Particles: ${this.game.particleSystem?.particles.length || 0}`, 20, y);
        y += 15;
        ctx.fillText(`Player Pos: (${Math.round(player.x)}, ${Math.round(player.y)})`, 20, y);
        y += 15;
        ctx.fillText(`Camera Pos: (${Math.round(this.game.camera.x)}, ${Math.round(this.game.camera.y)})`, 20, y);
        y += 15;
        ctx.fillText(`World Size: ${this.game.config.worldWidth}x${this.game.config.worldHeight}`, 20, y);
    }
    
    /**
     * Add damage indicator
     */
    addDamageIndicator(x, y, damage, color = '#ff0000') {
        this.damageIndicators.push({
            x: x,
            y: y,
            text: `-${damage}`,
            color: color,
            life: 60,
            maxLife: 60,
            alpha: 1.0
        });
    }
    
    /**
     * Add notification
     */
    addNotification(text, color = '#ffffff') {
        this.notifications.push({
            text: text,
            color: color,
            life: 180, // 3 seconds at 60fps
            alpha: 0
        });
    }
    
    /**
     * Toggle debug info
     */
    toggleDebugInfo() {
        this.showDebugInfo = !this.showDebugInfo;
    }
    
    /**
     * Toggle minimap
     */
    toggleMinimap() {
        this.showMinimap = !this.showMinimap;
    }
}

// Export for use in other modules
window.EnhancedUI = EnhancedUI;