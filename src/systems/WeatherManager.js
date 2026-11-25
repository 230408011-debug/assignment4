class WeatherManager {
    constructor(scene) {
        this.scene = scene;
        this.isRaining = false;

        // UI Indicator removed to clean up screen as requested
        this.overlay = scene.add.rectangle(scene.width / 2, scene.height / 2, scene.width, scene.height, 0x000000, 0).setDepth(190);
    }

    setWeather(type) {
        if (this.weatherEmitter) {
            this.weatherEmitter.destroy();
            this.weatherEmitter = null;
        }

        if (type === 'Yağmurlu 🌧️' || type === 'Fırtınalı ⛈️') {
            const isStorm = type === 'Fırtınalı ⛈️';
            this.weatherEmitter = this.scene.add.particles(0, 0, 'particle', {
                x: { min: 0, max: this.scene.width },
                y: -50,
                quantity: isStorm ? 3 : 2,
                frequency: 50,
                maxParticles: isStorm ? 80 : 50,
                lifespan: 1500,
                gravityY: 1200,
                scale: { start: 1, end: 1 },
                alpha: 0.4,
                tint: 0x93c5fd
            });
            this.overlay.setFillStyle(0x000000, isStorm ? 0.6 : 0.4);
        } else if (type === 'Karlı ❄️') {
            this.weatherEmitter = this.scene.add.particles(0, 0, 'particle', {
                x: { min: 0, max: this.scene.width },
                y: -50,
                quantity: 1,
                lifespan: 4000,
                gravityY: 100,
                scale: { start: 1.5, end: 0.5 },
                alpha: 0.8,
                tint: 0xffffff
            });
            this.overlay.setFillStyle(0xffffff, 0.2);
        } else if (type === 'Gece🌙' || type === 'Gece 🌙') {
            this.overlay.setFillStyle(0x0f172a, 0.65);
        } else {
            // Sunny or default clear
            this.overlay.setFillStyle(0x000000, 0);
        }
    }

    update() {
        // Wind application logic removed completely. 
        // Ball and players move only based on gameplay physics.
        
        // Dynamic weather changing over time (visual only)
        if (!this.weatherTimerCreated && window.gameState.currentWeather === undefined) {
            this.weatherTimerCreated = true;
            this.scene.time.addEvent({
                delay: 20000,
                callback: () => {
                    const weathers = ['Güneşli ☀️', 'Yağmurlu 🌧️', 'Karlı ❄️', 'Gece 🌙'];
                    this.setWeather(Phaser.Utils.Array.GetRandom(weathers));
                },
                loop: true
            });
        }
    }
}
