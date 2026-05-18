import { clamp, type Vec2 } from '../core/math';
import { TILE_SIZE } from '../world/constants';
import type { WorldMap } from '../world/WorldMap';
import type { Entity } from './Entity';
import type { EquipmentStats } from '../inventory/Inventory';
import { itemDefinition, SPELL_LIBRARY } from '../inventory/Inventory';
import type { SectMembership } from '../sect/SectTypes';

export type PlayerFacing = 'up' | 'down' | 'left' | 'right';

export interface PlayerStats {
  rank: string;
  rankIndex: number;
  level: number;
  exp: number;
  expToNext: number;
  talentPoints: number;
  breakthroughReady: boolean;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface EquipmentSlots {
  weapon: string | null;
  armor: string | null;
  talisman: string | null;
  boots: string | null;
}

export class Player implements Entity {
  id = 'player';
  position: Vec2;
  radius = 10;
  facing: Vec2 = { x: 0, y: 1 };
  facingDirection: PlayerFacing = 'down';
  walkFrame = 0;
  isMoving = false;
  private walkTimer = 0;
  velocity: Vec2 = { x: 0, y: 0 };
  stats: PlayerStats = {
    rank: '炼气一层',
    rankIndex: 0,
    level: 1,
    exp: 32,
    expToNext: 100,
    talentPoints: 0,
    breakthroughReady: false,
    hp: 92,
    maxHp: 100,
    mana: 48,
    maxMana: 60,
    attack: 12,
    defense: 8,
    speed: 96,
  };
  equipment: EquipmentSlots = {
    weapon: 'bamboo-sword',
    armor: null,
    talisman: 'quiet-talisman',
    boots: null,
  };
  learnedArts = ['breath-cut', 'cloud-step'];
  sectMembership: SectMembership | null = null;

  constructor(
    tileX: number,
    tileY: number,
    private map: WorldMap,
  ) {
    this.position = { x: tileX * TILE_SIZE + TILE_SIZE / 2, y: tileY * TILE_SIZE + TILE_SIZE / 2 };
  }

  update(delta: number): void {
    if (!this.isMoving) {
      this.walkFrame = 0;
      return;
    }
    this.walkTimer += delta * 9;
    this.walkFrame = Math.floor(this.walkTimer) % 3;
  }

  move(input: Vec2, delta: number): void {
    const speed = this.totalStats().speed;
    this.isMoving = Math.abs(input.x) > 0.01 || Math.abs(input.y) > 0.01;
    if (this.isMoving) {
      this.facing = { ...input };
      this.facingDirection = Math.abs(input.x) > Math.abs(input.y) ? (input.x < 0 ? 'left' : 'right') : input.y < 0 ? 'up' : 'down';
    }
    this.tryMove(input.x * speed * delta, 0);
    this.tryMove(0, input.y * speed * delta);
    this.velocity = { x: input.x * speed, y: input.y * speed };
    this.position.x = clamp(this.position.x, TILE_SIZE / 2, this.map.width * TILE_SIZE - TILE_SIZE / 2);
    this.position.y = clamp(this.position.y, TILE_SIZE / 2, this.map.height * TILE_SIZE - TILE_SIZE / 2);
  }

  currentTile(): Vec2 {
    return { x: Math.floor(this.position.x / TILE_SIZE), y: Math.floor(this.position.y / TILE_SIZE) };
  }

  setMap(map: WorldMap): void {
    this.map = map;
    this.position.x = clamp(this.position.x, TILE_SIZE / 2, map.width * TILE_SIZE - TILE_SIZE / 2);
    this.position.y = clamp(this.position.y, TILE_SIZE / 2, map.height * TILE_SIZE - TILE_SIZE / 2);
  }

  totalStats(): PlayerStats {
    const bonus = this.equipmentBonus();
    return {
      ...this.stats,
      maxHp: this.stats.maxHp + (bonus.hp ?? 0),
      maxMana: this.stats.maxMana + (bonus.mana ?? 0),
      attack: this.stats.attack + (bonus.attack ?? 0),
      defense: this.stats.defense + (bonus.defense ?? 0),
      speed: this.stats.speed + (bonus.speed ?? 0),
    };
  }

  combatPower(): number {
    const stats = this.totalStats();
    const spellPower = this.learnedArts.reduce((sum, spellId) => sum + ((SPELL_LIBRARY.find((spell) => spell.id === spellId)?.power ?? 0) * 0.22), 0);
    return Math.round(stats.attack * 3.4 + stats.defense * 2.6 + stats.maxHp * 0.45 + stats.maxMana * 0.62 + stats.speed * 0.38 + this.stats.level * 8 + this.stats.rankIndex * 28 + spellPower);
  }

  learnSpell(spellId: string): boolean {
    if (this.learnedArts.includes(spellId)) return false;
    this.learnedArts.push(spellId);
    return true;
  }

  gainExp(amount: number): void {
    this.stats.exp = Math.min(this.stats.expToNext, this.stats.exp + amount);
    this.stats.breakthroughReady = this.stats.exp >= this.stats.expToNext;
  }

  breakthrough(): boolean {
    if (!this.stats.breakthroughReady) return false;
    this.stats.rankIndex += 1;
    this.stats.level += 1;
    this.stats.rank = rankName(this.stats.rankIndex);
    this.stats.exp = 0;
    this.stats.expToNext = Math.round(this.stats.expToNext * 1.42 + 40);
    this.stats.talentPoints += 2;
    this.stats.maxHp += 18;
    this.stats.maxMana += 16;
    this.stats.attack += 3;
    this.stats.defense += 2;
    this.stats.hp = this.stats.maxHp;
    this.stats.mana = this.stats.maxMana;
    this.stats.breakthroughReady = false;
    return true;
  }

  addTalent(stat: 'attack' | 'defense' | 'mana' | 'hp'): boolean {
    if (this.stats.talentPoints <= 0) return false;
    this.stats.talentPoints -= 1;
    if (stat === 'attack') this.stats.attack += 1;
    if (stat === 'defense') this.stats.defense += 1;
    if (stat === 'mana') this.stats.maxMana += 8;
    if (stat === 'hp') this.stats.maxHp += 10;
    return true;
  }

  private equipmentBonus(): EquipmentStats {
    const total: EquipmentStats = {};
    for (const itemId of Object.values(this.equipment)) {
      if (!itemId) continue;
      const stats = itemDefinition(itemId)?.stats;
      if (!stats) continue;
      total.hp = (total.hp ?? 0) + (stats.hp ?? 0);
      total.mana = (total.mana ?? 0) + (stats.mana ?? 0);
      total.attack = (total.attack ?? 0) + (stats.attack ?? 0);
      total.defense = (total.defense ?? 0) + (stats.defense ?? 0);
      total.speed = (total.speed ?? 0) + (stats.speed ?? 0);
    }
    return total;
  }

  private tryMove(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const next = { x: this.position.x + dx, y: this.position.y + dy };
    const probes = [
      { x: next.x - this.radius, y: next.y - this.radius },
      { x: next.x + this.radius, y: next.y - this.radius },
      { x: next.x - this.radius, y: next.y + this.radius },
      { x: next.x + this.radius, y: next.y + this.radius },
    ];
    for (const probe of probes) {
      const tx = Math.floor(probe.x / TILE_SIZE);
      const ty = Math.floor(probe.y / TILE_SIZE);
      if (this.map.isBlockedTile(tx, ty)) return;
    }
    this.position = next;
  }
}

function rankName(index: number): string {
  const ranks = ['炼气一层', '炼气二层', '炼气三层', '炼气四层', '炼气五层', '炼气六层', '炼气七层', '炼气八层', '炼气九层', '筑基初期'];
  return ranks[Math.min(index, ranks.length - 1)] ?? '筑基初期';
}
