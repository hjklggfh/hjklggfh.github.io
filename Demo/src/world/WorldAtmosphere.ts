import { lerp } from '../core/math';
import type { AtmosphereState } from '../render/CanvasRenderer';

export class WorldAtmosphere {
  timeOfDay = 0.32;
  dayLengthSeconds = 420;
  weather: AtmosphereState['weather'] = 'clear';
  weatherIntensity = 0;
  private weatherTimer = 28;
  private targetIntensity = 0;

  update(delta: number): void {
    this.timeOfDay = (this.timeOfDay + delta / this.dayLengthSeconds) % 1;
    this.weatherTimer -= delta;
    if (this.weatherTimer <= 0) {
      const phase = Math.sin(performance.now() * 0.00007) + Math.sin(performance.now() * 0.000013);
      if (phase > 1.05) {
        this.weather = 'rain';
        this.targetIntensity = 0.85;
        this.weatherTimer = 55;
      } else if (phase < -1.05) {
        this.weather = 'fog';
        this.targetIntensity = 0.8;
        this.weatherTimer = 64;
      } else if (phase > 0.35) {
        this.weather = 'wind';
        this.targetIntensity = 0.65;
        this.weatherTimer = 42;
      } else {
        this.weather = 'clear';
        this.targetIntensity = 0;
        this.weatherTimer = 38;
      }
    }
    this.weatherIntensity = lerp(this.weatherIntensity, this.targetIntensity, Math.min(1, delta * 0.25));
  }

  state(): AtmosphereState {
    const sun = Math.sin(this.timeOfDay * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    const night = 1 - sun;
    const dawnDusk = Math.max(0, 1 - Math.abs(this.timeOfDay - 0.25) * 14) + Math.max(0, 1 - Math.abs(this.timeOfDay - 0.75) * 14);
    const alpha = 0.1 + night * 0.42 + dawnDusk * 0.1;
    const tint = night > 0.55 ? 'rgba(22,34,62,1)' : dawnDusk > 0.1 ? 'rgba(137,91,54,1)' : 'rgba(246,236,190,1)';
    return {
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      weatherIntensity: this.weatherIntensity,
      dayNightTint: tint,
      globalAlpha: alpha,
    };
  }

  label(): string {
    const hour = Math.floor(this.timeOfDay * 24);
    const minute = Math.floor((this.timeOfDay * 24 - hour) * 60);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
}
