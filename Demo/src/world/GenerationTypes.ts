import type { Random } from '../core/Random';
import type { WorldMap } from './WorldMap';

export interface WorldGenerationOptions {
  seed: string;
  width: number;
  height: number;
}

export interface GenerationContext {
  map: WorldMap;
  seed: string;
  rng: Random;
}

export interface StampOptions {
  radius: number;
  hardness?: number;
  value?: number;
}
