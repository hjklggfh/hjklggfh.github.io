import type { ItemCategory } from '../inventory/Inventory';

export type SectStyle = 'sword' | 'alchemy' | 'talisman' | 'frost';
export type DiscipleRank = '外门弟子' | '内门弟子' | '亲传弟子' | '真传弟子';
export type SectTaskType = 'gather' | 'hunt' | 'rival';

export interface SectMarketItem {
  itemId: string;
  name: string;
  category: ItemCategory;
  price: number;
  stock: number;
  description: string;
  minRank: DiscipleRank;
}

export interface Sect {
  id: number;
  name: string;
  style: SectStyle;
  x: number;
  y: number;
  radius: number;
  bounds: { x: number; y: number; w: number; h: number };
  gate: { x: number; y: number; nx: number; ny: number; width: number };
  shop: { x: number; y: number };
  spiritPool: { x: number; y: number };
  taskBoard: { x: number; y: number };
  teleport: { x: number; y: number };
  signatureSpellIds: string[];
  marketInventory: SectMarketItem[];
  relations: {
    friendly: number[];
    hostile: number[];
    friendlyNames?: string[];
    hostileNames?: string[];
  };
}

export interface SectMembership {
  sectId: number;
  sectName: string;
  rank: DiscipleRank;
  merit: number;
  lastResourceDay: number;
}

export interface SectTaskState {
  id: string;
  sectId: number;
  sectName: string;
  type: SectTaskType;
  title: string;
  description: string;
  targetName: string;
  targetX: number;
  targetY: number;
  targetId?: string;
  targetSectId?: number;
  required: number;
  progress: number;
  completed: boolean;
  rewardMerit: number;
  rewardStones: number;
  rewardItemId?: string;
}

export const DISCIPLE_RANKS: DiscipleRank[] = ['外门弟子', '内门弟子', '亲传弟子', '真传弟子'];

export function discipleRankIndex(rank: DiscipleRank | undefined): number {
  return Math.max(0, DISCIPLE_RANKS.indexOf(rank ?? '外门弟子'));
}

export function sectRankDiscount(rank: DiscipleRank | undefined): number {
  const discounts = [1, 0.88, 0.76, 0.64];
  return discounts[discipleRankIndex(rank)] ?? 1;
}

export function sectRankMeritThreshold(rank: DiscipleRank): number {
  const next = DISCIPLE_RANKS[discipleRankIndex(rank) + 1];
  if (!next) return Infinity;
  return next === '内门弟子' ? 80 : next === '亲传弟子' ? 190 : 360;
}
