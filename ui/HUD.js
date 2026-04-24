/**
 * GameHub HUD System - Manages in-game UI elements
 * Provides common HUD components for games
 */
class HUD {
    constructor() {
        this.elements = new Map();
        this.container = null;
        this.visible = true;
        
        console.log('HUD initialized');
    }
    
    init() {
        this.container = document.getElementById('game-hud');
        if (!this.container) {
            console.warn('HUD container not found');
        }
        
        console.log('? HUD ready');
    }
    
    // Create common HUD elements
    createScoreDisplay(initialScore = 0, position = { x: 20, y: 20 }) {
        const element = this.createElement('score-display', 'text', {
            text: `Score: ${initialScore}`,
            x: position.x,
            y: position.y,
            style: {
                fontSize: '18px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }
        });
        
        element.updateScore = (score) => {
            element.text = `Score: ${score}`;
            this.updateElement('score-display', element);
        };
        
        return element;
    }
    
    createHealthBar(maxHealth = 100, position = { x: 20, y: 50 }, size = { width: 200, height: 20 }) {
        const element = this.createElement('health-bar', 'bar', {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            maxValue: maxHealth,
            currentValue: maxHealth,
            backgroundColor: '#333333',
            fillColor: '#ff0000',
            borderColor: '#ffffff',
            borderWidth: 2,
            showText: true,
            textColor: '#ffffff'
        });
        
        element.setHealth = (health) => {
            element.currentValue = Math.max(0, Math.min(maxHealth, health));
            
            // Change color based on health percentage
            const percentage = element.currentValue / element.maxValue;
            if (percentage > 0.6) {
                element.fillColor = '#00ff00'; // Green
            } else if (percentage > 0.3) {
                element.fillColor = '#ffff00'; // Yellow
            } else {
                element.fillColor = '#ff0000'; // Red
            }
            
            this.updateElement('health-bar', element);
        };
        
        return element;
    }
    
    createTimer(initialTime = 0, position = { x: 20, y: 80 }) {
        const element = this.createElement('timer', 'text', {
            text: this.formatTime(initialTime),
            x: position.x,
            y: position.y,
            style: {
                fontSize: '16px',
                fontFamily: 'Arial, sans-serif',
                color: '#ffffff',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
            }
        });
        
        element.updateTime = (time) => {
            element.text = `Time: ${this.formatTime(time)}`;
            this.updateElement('timer', element);
        };
        
        return element;
    }
    
    createMinimap(position = { x: window.innerWidth - 220, y: 20 }, size = { width: 200, height: 150 }) {
        const element = this.createElement('minimap', 'panel', {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            borderColor: '#ffffff',
            borderWidth: 2
        });
        
        element.markers = [];
        
        element.addMarker = (id, x, y, color = '#ff0000', size = 4) => {
            element.markers.push({ id, x, y, color, size });
        };
        
        element.removeMarker = (id) => {
            element.markers = element.markers.filter(marker => marker.id !== id);
        };
        
        element.updateMarker = (id, x, y) => {
            const marker = element.markers.find(m => m.id === id);
            if (marker) {
                marker.x = x;
                marker.y = y;
            }
        };
        
        return element;
    }
    
    createInventorySlots(slotCount = 6, position = { x: 20, y: window.innerHeight - 80 }) {
        const slotSize = 50;
        const spacing = 10;
        
        const element = this.createElement('inventory', 'custom', {
            x: position.x,
            y: position.y,
            slots: [],
            selectedSlot: 0
        });
        
        // Create individual slots
        for (let i = 0; i < slotCount; i++) {
            const slot = {
                x: position.x + i * (slotSize + spacing),
                y: position.y,
                width: slotSize,
                height: slotSize,
                item: null,
                isEmpty: true,
                isSelected: i === 0
            };
            element.slots.push(slot);
        }
        
        element.setItem = (slotIndex, item) => {
            if (slotIndex >= 0 && slotIndex < element.slots.length) {
                element.slots[slotIndex].item = item;
                element.slots[slotIndex].isEmpty = !item;
            }
        };
        
        element.selectSlot = (slotIndex) => {
            element.slots.forEach(slot => slot.isSelected = false);
            if (slotIndex >= 0 && slotIndex < element.slots.length) {
                element.slots[slotIndex].isSelected = true;
                element.selectedSlot = slotIndex;
            }
        };
        
        return element;
    }
    
    createNotificationArea(position = { x: window.innerWidth / 2, y: 100 }) {
        const element = this.createElement('notifications', 'custom', {
            x: position.x,
            y: position.y,
            messages: [],
            maxMessages: 5
        });
        
        element.addNotification = (message, duration = 3000, type = 'info') => {
            const notification = {
                id: Date.now(),
                message,
                type,
                startTime: performance.now(),
                duration,
                alpha: 1
            };
            
            element.messages.unshift(notification);
            
            // Remove old messages if exceeding max
            if (element.messages.length > element.maxMessages) {
                element.messages = element.messages.slice(0, element.maxMessages);
            }
            
            // Auto-remove after duration
            setTimeout(() => {
                element.messages = element.messages.filter(msg => msg.id !== notification.id);
            }, duration);
        };
        
        return element;
    }
    
    // Generic element creation
    createElement(id, type, properties) {
        const element = {
            id,
            type,
            visible: true,
            ...properties
        };
        
        this.elements.set(id, element);
        this.renderElement(element);
        
        return element;
    }
    
    updateElement(id, properties) {
        const element = this.elements.get(id);
        if (element) {
            Object.assign(element, properties);
            this.renderElement(element);
        }
    }
    
    removeElement(id) {
        this.elements.delete(id);
        // Remove from DOM if it exists
        const domElement = document.querySelector(`[data-hud-id="${id}"]`);
        if (domElement) {
            domElement.remove();
        }
    }
    
    showElement(id) {
        const element = this.elements.get(id);
        if (element) {
            element.visible = true;
            this.renderElement(element);
        }
    }
    
    hideElement(id) {
        const element = this.elements.get(id);
        if (element) {
            element.visible = false;
            this.renderElement(element);
        }
    }
    
    // Rendering methods (these integrate with the SceneManager)
    renderElement(element) {
        if (!element.visible) return;
        
        // This method is called by the SceneManager during rendering
        // The actual rendering is handled by the engine's rendering system
    }
    
    render(ctx) {
        if (!this.visible) return;
        
        // Render all HUD elements
        this.elements.forEach(element => {
            if (element.visible) {
                this.renderElementToCanvas(ctx, element);
            }
        });
    }
    
    renderElementToCanvas(ctx, element) {
        ctx.save();
        ctx.translate(element.x, element.y);
        
        switch (element.type) {
            case 'text':
                this.renderText(ctx, element);
                break;
            case 'bar':
                this.renderBar(ctx, element);
                break;
            case 'panel':
                this.renderPanel(ctx, element);
                break;
            case 'custom':
                this.renderCustomElement(ctx, element);
                break;
        }
        
        ctx.restore();
    }
    
    renderText(ctx, element) {
        if (element.style) {
            ctx.font = `${element.style.fontSize || '16px'} ${element.style.fontFamily || 'Arial'}`;
            ctx.fillStyle = element.style.color || '#ffffff';
            
            if (element.style.textShadow) {
                const shadowParts = element.style.textShadow.split(' ');
                ctx.shadowOffsetX = parseInt(shadowParts[0]) || 0;
                ctx.shadowOffsetY = parseInt(shadowParts[1]) || 0;
                ctx.shadowBlur = parseInt(shadowParts[2]) || 0;
                ctx.shadowColor = shadowParts[3] || '#000000';
            }
        }
        
        ctx.fillText(element.text || '', 0, 0);
    }
    
    renderBar(ctx, element) {
        const progress = element.currentValue / element.maxValue;
        
        // Background
        ctx.fillStyle = element.backgroundColor || '#333333';
        ctx.fillRect(0, 0, element.width, element.height);
        
        // Fill
        ctx.fillStyle = element.fillColor || '#00ff00';
        ctx.fillRect(0, 0, element.width * progress, element.height);
        
        // Border
        if (element.borderColor) {
            ctx.strokeStyle = element.borderColor;
            ctx.lineWidth = element.borderWidth || 1;
            ctx.strokeRect(0, 0, element.width, element.height);
        }
        
        // Text
        if (element.showText) {
            ctx.fillStyle = element.textColor || '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                `${Math.round(element.currentValue)}/${element.maxValue}`,
                element.width / 2,
                element.height / 2
            );
        }
    }
    
    renderPanel(ctx, element) {
        // Background
        if (element.backgroundColor) {
            ctx.fillStyle = element.backgroundColor;
            ctx.fillRect(0, 0, element.width, element.height);
        }
        
        // Border
        if (element.borderColor) {
            ctx.strokeStyle = element.borderColor;
            ctx.lineWidth = element.borderWidth || 1;
            ctx.strokeRect(0, 0, element.width, element.height);
        }
        
        // Render minimap markers if it's a minimap
        if (element.id === 'minimap' && element.markers) {
            element.markers.forEach(marker => {
                ctx.fillStyle = marker.color;
                ctx.beginPath();
                ctx.arc(marker.x, marker.y, marker.size, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }
    
    renderCustomElement(ctx, element) {
        switch (element.id) {
            case 'inventory':
                this.renderInventory(ctx, element);
                break;
            case 'notifications':
                this.renderNotifications(ctx, element);
                break;
        }
    }
    
    renderInventory(ctx, element) {
        element.slots.forEach(slot => {
            // Slot background
            ctx.fillStyle = slot.isSelected ? '#444444' : '#222222';
            ctx.fillRect(slot.x - element.x, slot.y - element.y, slot.width, slot.height);
            
            // Slot border
            ctx.strokeStyle = slot.isSelected ? '#ffffff' : '#666666';
            ctx.lineWidth = 2;
            ctx.strokeRect(slot.x - element.x, slot.y - element.y, slot.width, slot.height);
            
            // Item (simplified representation)
            if (!slot.isEmpty && slot.item) {
                ctx.fillStyle = slot.item.color || '#ffffff';
                ctx.fillRect(
                    slot.x - element.x + 5,
                    slot.y - element.y + 5,
                    slot.width - 10,
                    slot.height - 10
                );
            }
        });
    }
    
    renderNotifications(ctx, element) {
        element.messages.forEach((notification, index) => {
            const y = index * 30;
            const currentTime = performance.now();
            const elapsed = currentTime - notification.startTime;
            
            // Fade out near end of duration
            let alpha = 1;
            if (elapsed > notification.duration - 1000) {
                alpha = (notification.duration - elapsed) / 1000;
            }
            
            ctx.save();
            ctx.globalAlpha = alpha;
            
            // Background
            let bgColor = '#333333';
            if (notification.type === 'success') bgColor = '#00aa00';
            if (notification.type === 'warning') bgColor = '#aa5500';
            if (notification.type === 'error') bgColor = '#aa0000';
            
            ctx.fillStyle = bgColor;
            ctx.fillRect(-100, y, 200, 25);
            
            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(notification.message, 0, y + 17);
            
            ctx.restore();
        });
    }
    
    // Utility methods
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    show() {
        this.visible = true;
        if (this.container) {
            this.container.style.display = 'block';
        }
    }
    
    hide() {
        this.visible = false;
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
    
    clear() {
        this.elements.clear();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
    
    cleanup() {
        this.clear();
        console.log('HUD cleaned up');
    }
}

// Make HUD available globally
window.HUD = HUD;