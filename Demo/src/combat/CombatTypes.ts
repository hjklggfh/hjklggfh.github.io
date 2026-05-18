export type CombatMode = 'spar' | 'battle' | 'beast';

export type CombatAction =
  | { type: 'attack' }
  | { type: 'spell'; id: string }
  | { type: 'talisman'; id: string }
  | { type: 'item'; id: string }
  | { type: 'flee' }
  | { type: 'close' };

export interface CombatantView {
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  speed: number;
  power: number;
  rank?: string;
}

export interface CombatOption {
  id: string;
  name: string;
  description: string;
  quantity?: number;
  disabled?: boolean;
}

export interface CombatViewState {
  title: string;
  mode: CombatMode;
  phase: 'player' | 'ended';
  player: CombatantView;
  enemy: CombatantView;
  log: string[];
  spells: CombatOption[];
  talismans: CombatOption[];
  pills: CombatOption[];
  canFlee: boolean;
  result?: 'win' | 'lose' | 'escape';
}
