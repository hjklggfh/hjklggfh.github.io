import type { Vec2 } from '../core/math';

export interface Entity {
  id: string;
  position: Vec2;
  radius: number;
  update(delta: number): void;
}
