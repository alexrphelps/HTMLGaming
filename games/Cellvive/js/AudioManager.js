class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = true;
        this.volume = 0.3;
        this.initialized = false;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
            console.log('🔊 AudioManager initialized');
        } catch (error) {
            console.warn('🔊 AudioManager init failed:', error);
            this.enabled = false;
        }
    }

    ensureResumed() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    _playTone(frequency, duration, type = 'sine', volume = 0.3, ramp = true) {
        if (!this.initialized || !this.enabled) return;
        this.ensureResumed();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        if (ramp) {
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        }
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    _playNoise(duration, volume = 0.1) {
        if (!this.initialized || !this.enabled) return;
        this.ensureResumed();
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.masterGain);
        source.start();
    }

    playEat() {
        this._playTone(300 + Math.random() * 200, 0.08, 'sine', 0.15);
        this._playNoise(0.05, 0.05);
    }

    playSporeCollect() {
        this._playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this._playTone(1200, 0.15, 'sine', 0.15), 60);
    }

    playEnemyEaten() {
        this._playTone(200, 0.15, 'sawtooth', 0.2);
        this._playNoise(0.1, 0.08);
        setTimeout(() => this._playTone(300, 0.1, 'square', 0.1), 80);
    }

    playDamage() {
        this._playTone(150, 0.2, 'sawtooth', 0.25);
        this._playNoise(0.15, 0.1);
    }

    playDeath() {
        if (!this.initialized || !this.enabled) return;
        this.ensureResumed();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.8);
        this._playNoise(0.5, 0.1);
    }

    playTalentUnlock() {
        this._playTone(523, 0.12, 'sine', 0.25);
        setTimeout(() => this._playTone(659, 0.12, 'sine', 0.2), 100);
        setTimeout(() => this._playTone(784, 0.2, 'sine', 0.2), 200);
    }

    playPowerUp() {
        this._playTone(600, 0.1, 'sine', 0.2);
        setTimeout(() => this._playTone(900, 0.1, 'sine', 0.18), 80);
        setTimeout(() => this._playTone(1200, 0.15, 'sine', 0.15), 160);
    }

    cleanup() {
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
        this.initialized = false;
        console.log('🔊 AudioManager cleaned up');
    }
}

window.AudioManager = AudioManager;
