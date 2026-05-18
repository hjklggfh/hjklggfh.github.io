import { distance, normalize, type Vec2 } from '../core/math';
import { Random } from '../core/Random';
import { TILE_SIZE } from '../world/constants';
import type { WorldMap } from '../world/WorldMap';
import type { ItemStack } from '../inventory/Inventory';
import type { Entity } from './Entity';
import type { DiscipleRank } from '../sect/SectTypes';

export interface CombatStats {
  hp: number;
  mana: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface DialogueNode {
  id: string;
  text: string;
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  label: string;
  next?: string;
  favorDelta?: number;
  action?: 'trade' | 'spar' | 'battle' | 'gift' | 'close';
}

export interface NPCProfile {
  name: string;
  rank: string;
  favor: number;
  identity: '散修' | '门派弟子';
  sectId?: number;
  sectName?: string;
  discipleRank?: DiscipleRank;
  inventory: ItemStack[];
  combat: CombatStats;
  dialogue: Record<string, DialogueNode>;
}

export class NPC implements Entity {
  radius = 10;
  wanderTarget: Vec2 | null = null;
  waitTimer = 0;
  sprite: 'npc_robed' | 'npc_trader' | 'npc_guard';

  constructor(
    public id: string,
    public position: Vec2,
    public profile: NPCProfile,
    private readonly map: WorldMap,
    private readonly rng: Random,
  ) {
    this.sprite = profile.rank.includes('筑基') ? 'npc_guard' : profile.name.includes('商') || profile.name.includes('坊') ? 'npc_trader' : 'npc_robed';
  }

  update(delta: number): void {
    this.waitTimer -= delta;
    if (!this.wanderTarget && this.waitTimer <= 0) {
      const angle = this.rng.range(0, Math.PI * 2);
      const dist = this.rng.range(36, 110);
      this.wanderTarget = {
        x: this.position.x + Math.cos(angle) * dist,
        y: this.position.y + Math.sin(angle) * dist,
      };
    }
    if (!this.wanderTarget) return;
    const dir = { x: this.wanderTarget.x - this.position.x, y: this.wanderTarget.y - this.position.y };
    if (Math.hypot(dir.x, dir.y) < 5) {
      this.wanderTarget = null;
      this.waitTimer = this.rng.range(1.5, 5);
      return;
    }
    const n = normalize(dir);
    const speed = this.profile.combat.speed * 0.28;
    this.tryMove(n.x * speed * delta, 0);
    this.tryMove(0, n.y * speed * delta);
  }

  isNearPlayer(playerPosition: Vec2): boolean {
    return distance(this.position, playerPosition) < 48;
  }

  private tryMove(dx: number, dy: number): void {
    if (dx === 0 && dy === 0) return;
    const next = { x: this.position.x + dx, y: this.position.y + dy };
    const tx = Math.floor(next.x / TILE_SIZE);
    const ty = Math.floor(next.y / TILE_SIZE);
    if (this.map.isBlockedTile(tx, ty)) {
      this.wanderTarget = null;
      this.waitTimer = this.rng.range(1, 3);
      return;
    }
    this.position = next;
  }
}

const surnames = ['陆', '沈', '顾', '叶', '林', '许', '温', '韩', '秦', '白'];
const given = ['清河', '归尘', '映雪', '长庚', '素问', '云舟', '知微', '明烛', '怀瑾', '听澜'];
const ranks = ['凡人', '炼气一层', '炼气三层', '炼气五层', '炼气七层', '筑基初期'];

export function createNPCs(map: WorldMap, count: number, seed: string): NPC[] {
  const rng = Random.fromString(`${seed}:npcs`);
  const npcs: NPC[] = [];
  const spawnTiles: Vec2[] = [];

  for (const settlement of map.settlements) {
    for (let i = 0; i < (settlement.kind === 'town' ? 8 : settlement.kind === 'market' ? 7 : 4); i++) {
      spawnTiles.push({
        x: settlement.x + rng.range(-settlement.radius * 0.6, settlement.radius * 0.6),
        y: settlement.y + rng.range(-settlement.radius * 0.6, settlement.radius * 0.6),
      });
    }
  }
  for (const sect of map.sects) {
    for (let i = 0; i < 7; i++) {
      spawnTiles.push({
        x: sect.x + rng.range(-sect.radius * 0.55, sect.radius * 0.55),
        y: sect.y + rng.range(-sect.radius * 0.55, sect.radius * 0.55),
      });
    }
  }
  for (let i = 0; i < count; i++) {
    let tile = spawnTiles[i % spawnTiles.length] ?? { x: rng.int(30, map.width - 30), y: rng.int(30, map.height - 30) };
    for (let attempts = 0; attempts < 40 && map.isBlockedTile(Math.floor(tile.x), Math.floor(tile.y)); attempts++) {
      tile = { x: rng.int(30, map.width - 30), y: rng.int(30, map.height - 30) };
    }
    const rank = rng.pick(ranks);
    const name = `${rng.pick(surnames)}${rng.pick(given)}`;
    const sect = map.sects.find((entry) => Math.hypot(entry.x - tile.x, entry.y - tile.y) < entry.radius + 6);
    const discipleRanks: DiscipleRank[] = ['外门弟子', '内门弟子', '亲传弟子', '真传弟子'];
    const discipleRank = sect ? rng.weighted([
      { value: '外门弟子' as const, weight: 6 },
      { value: '内门弟子' as const, weight: 3 },
      { value: '亲传弟子' as const, weight: 1.2 },
      { value: '真传弟子' as const, weight: 0.45 },
    ]) : undefined;
    const discipleRankIndex = discipleRank ? discipleRanks.indexOf(discipleRank) : 0;
    const sectPowerBonus = sect ? 1.22 + discipleRankIndex * 0.18 : 1;
    const profile: NPCProfile = {
      name,
      rank,
      favor: rng.int(-5, 18),
      identity: sect ? '门派弟子' : '散修',
      sectId: sect?.id,
      sectName: sect?.name,
      discipleRank,
      inventory: [
        { id: `npc-herb-${i}`, name: rng.pick(['灵谷', '凝露草', '黄芽丹', '符纸']), category: rng.pick(['材料', '丹药', '符咒'] as const), quantity: rng.int(1, 8), description: '可用于交易。', value: rng.int(3, 18) },
      ],
      combat: {
        hp: Math.round((rank.includes('筑基') ? 180 : 80 + i * 2) * sectPowerBonus),
        mana: Math.round((40 + i) * sectPowerBonus),
        attack: Math.round((rank.includes('筑基') ? 28 : 9 + rng.int(0, 8)) * sectPowerBonus),
        defense: Math.round((5 + rng.int(0, 8)) * sectPowerBonus),
        speed: Math.round((70 + rng.int(0, 20)) * (sect ? 1.06 : 1)),
      },
      dialogue: {
        root: {
          id: 'root',
          text: rng.pick([
            sect ? `在下${sect.name}${discipleRank}，宗门规矩森严，绝学不轻传外人。` : '道友从何处来？这几日山里雾重，最好沿主路行走。',
            '坊市今日有新到的丹药，也有几张不错的符箓。',
            '若想采药，可去林中空地，但别惊扰山脉边的妖兽。',
          ]),
          choices: [
            { label: '请教附近情况', next: 'rumor', favorDelta: 1 },
            { label: '交易', action: 'trade' },
            { label: '切磋', action: 'spar', favorDelta: -1 },
            { label: '战斗', action: 'battle', favorDelta: -8 },
            { label: '赠送物品', action: 'gift', favorDelta: 4 },
            { label: '告辞', action: 'close' },
          ],
        },
        rumor: {
          id: 'rumor',
          text: '河桥以北有旧阵台，夜里常有灵雾。若能找到阵眼，或许有机缘。',
          choices: [
            { label: '多谢指点', next: 'root', favorDelta: 1 },
            { label: '告辞', action: 'close' },
          ],
        },
      },
    };
    npcs.push(new NPC(`npc-${i}`, { x: tile.x * TILE_SIZE + 16, y: tile.y * TILE_SIZE + 16 }, profile, map, rng.clone(i * 8191)));
  }
  return npcs;
}
