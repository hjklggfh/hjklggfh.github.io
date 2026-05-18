import { distance, lerp, normalize, smoothstep } from '../core/math';
import { ValueNoise2D } from '../core/Noise';
import { Random } from '../core/Random';
import { createItem, itemDefinition } from '../inventory/Inventory';
import type { DiscipleRank, Sect, SectMarketItem, SectStyle } from '../sect/SectTypes';
import { CHUNK_SIZE, ObjectKind, TerrainKind, WORLD_TILES } from './constants';
import { WorldMap, type BeastSpawn, type CaveFeature, type InterestPoint, type River, type Road, type Settlement } from './WorldMap';

interface PathPoint {
  x: number;
  y: number;
  width?: number;
}

interface DistanceResult {
  distance: number;
  t: number;
  nearest: { x: number; y: number };
}

interface SettlementGate {
  x: number;
  y: number;
  nx: number;
  ny: number;
  width: number;
}

interface HouseSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

const settlementNames = [
  '青岚村',
  '云渡镇',
  '玄溪坊市',
  '白石坞',
  '灵桃里',
  '南麓集',
  '竹影村',
  '落霞镇',
  '丹河坊',
  '鹤鸣居',
  '松风里',
  '赤霞坞',
  '玉泉集',
  '北竹镇',
  '晴川村',
  '暮雪坊',
  '兰若渡',
  '金粟里',
  '望月镇',
  '清虚集',
  '石桥村',
  '栖霞坊',
];

const interestNames = ['藏经残阁', '灵药坡', '雾隐洞', '古松祠', '断碑谷', '星砂滩', '灵泉眼', '旧阵台'];

const beastNames = ['青背狼', '雾林妖', '山魈幼兽', '赤牙豕', '幽藤灵'];
const innNames = ['松风客栈', '归云驿', '青石酒家', '望川小栈', '竹泉驿舍', '云脚客舍'];

const sectBlueprints: { name: string; style: SectStyle; signatureSpellIds: string[]; manualIds: string[] }[] = [
  { name: '太华剑宗', style: 'sword', signatureSpellIds: ['sky-sword', 'cold-moon'], manualIds: ['sky-sword-manual', 'cold-moon-manual'] },
  { name: '丹霞谷', style: 'alchemy', signatureSpellIds: ['jade-cauldron-fire', 'green-vine'], manualIds: ['jade-cauldron-manual', 'vine-manual'] },
  { name: '玄符观', style: 'talisman', signatureSpellIds: ['nine-seal-thunder', 'thunder-spark'], manualIds: ['nine-seal-manual', 'thunder-manual'] },
  { name: '寒月宫', style: 'frost', signatureSpellIds: ['frost-mirror', 'cloud-step'], manualIds: ['frost-mirror-manual', 'fire-manual'] },
];

function pointToSegmentDistance(px: number, py: number, ax: number, ay: number, bx: number, by: number): DistanceResult {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lenSq));
  const nx = ax + abx * t;
  const ny = ay + aby * t;
  return { distance: Math.hypot(px - nx, py - ny), t, nearest: { x: nx, y: ny } };
}

function pathDistance(x: number, y: number, points: PathPoint[]): DistanceResult {
  let best: DistanceResult = { distance: Infinity, t: 0, nearest: { x: 0, y: 0 } };
  for (let i = 0; i < points.length - 1; i++) {
    const result = pointToSegmentDistance(x, y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    if (result.distance < best.distance) {
      const globalT = (i + result.t) / Math.max(1, points.length - 1);
      best = { distance: result.distance, t: globalT, nearest: result.nearest };
    }
  }
  return best;
}

function sampleWidth(points: PathPoint[], t: number): number {
  if (points.length === 0) return 1;
  const scaled = t * (points.length - 1);
  const index = Math.min(points.length - 2, Math.max(0, Math.floor(scaled)));
  const local = scaled - index;
  return lerp(points[index].width ?? 1, points[index + 1].width ?? points[index].width ?? 1, local);
}

function catmullRom(points: PathPoint[], samplesPerSegment: number): PathPoint[] {
  const result: PathPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        ((2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        ((2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      const width = lerp(p1.width ?? 1, p2.width ?? p1.width ?? 1, t);
      result.push({ x, y, width });
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function makeCurve(rng: Random, start: PathPoint, end: PathPoint, bends: number, maxOffset: number): PathPoint[] {
  const dir = normalize({ x: end.x - start.x, y: end.y - start.y });
  const normal = { x: -dir.y, y: dir.x };
  const controls: PathPoint[] = [{ ...start }];
  for (let i = 1; i <= bends; i++) {
    const t = i / (bends + 1);
    const baseX = lerp(start.x, end.x, t);
    const baseY = lerp(start.y, end.y, t);
    const wave = Math.sin(t * Math.PI * 2 + rng.range(-1, 1)) * maxOffset * 0.4;
    const offset = rng.range(-maxOffset, maxOffset) + wave;
    controls.push({
      x: Math.max(10, Math.min(WORLD_TILES - 10, baseX + normal.x * offset + rng.range(-18, 18))),
      y: Math.max(10, Math.min(WORLD_TILES - 10, baseY + normal.y * offset + rng.range(-18, 18))),
      width: lerp(start.width ?? 3, end.width ?? 5, t) + rng.range(-1.3, 1.8),
    });
  }
  controls.push({ ...end });
  return catmullRom(controls, 10);
}

export class WorldGenerator {
  generate(seed: string): WorldMap {
    const map = new WorldMap();
    const rng = Random.fromString(seed);
    const broadNoise = new ValueNoise2D(rng.int(1, 999999));
    const detailNoise = new ValueNoise2D(rng.int(1, 999999));
    const forestNoise = new ValueNoise2D(rng.int(1, 999999));
    const mountainNoise = new ValueNoise2D(rng.int(1, 999999));

    this.generateBaseTerrain(map, broadNoise, detailNoise, forestNoise, mountainNoise);
    this.generateRivers(map, rng);
    this.generateLakes(map, rng, detailNoise);
    this.generateMountains(map, rng, mountainNoise);
    this.generateRoadNetwork(map, rng);
    this.generateSettlements(map, rng);
    this.generateRoadsideInns(map, rng);
    this.generateForests(map, rng, forestNoise);
    this.generateHills(map, rng, detailNoise);
    this.generateWildernessDetails(map, rng, forestNoise);
    this.generateCaves(map, rng);
    this.generateSects(map, rng);
    this.generateTeleportNodes(map);
    this.generateHiddenAreas(map, rng);
    this.generateBeasts(map, rng);
    this.resolveTransitionsAndCollisions(map);
    this.chooseSpawn(map);
    return map;
  }

  private generateBaseTerrain(
    map: WorldMap,
    broadNoise: ValueNoise2D,
    detailNoise: ValueNoise2D,
    forestNoise: ValueNoise2D,
    mountainNoise: ValueNoise2D,
  ): void {
    const center = { x: map.width / 2, y: map.height / 2 };
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const nx = x / map.width;
        const ny = y / map.height;
        const edge = Math.min(x, y, map.width - 1 - x, map.height - 1 - y) / 64;
        const centerBias = 1 - smoothstep(0.2, 0.78, distance({ x, y }, center) / 360);
        const elevation =
          broadNoise.fbm(nx * 3.2, ny * 3.2, 5) * 0.52 +
          detailNoise.fbm(nx * 10.5 + 14, ny * 10.5 - 7, 4) * 0.22 +
          mountainNoise.ridged(nx * 4.8 - 1, ny * 4.8 + 3, 5) * 0.36 +
          centerBias * 0.08 -
          smoothstep(0, 1, 1 - edge) * 0.08;
        const moisture = broadNoise.fbm(nx * 4.4 + 101, ny * 4.4 - 58, 5) * 0.6 + forestNoise.fbm(nx * 12, ny * 12, 3) * 0.4;
        const cell = map.get(x, y);
        cell.elevation = elevation;
        cell.moisture = moisture;
        cell.forest = forestNoise.fbm(nx * 7.7 - 33, ny * 7.7 + 21, 5);
        cell.terrain = elevation > 0.76 ? TerrainKind.Mountain : moisture > 0.67 ? TerrainKind.Meadow : TerrainKind.Grass;
      }
    }
  }

  private generateRivers(map: WorldMap, rng: Random): void {
    const rivers: River[] = [];
    const riverSpecs = [
      {
        start: { x: rng.range(40, 120), y: rng.range(20, 90), width: 4.5 },
        end: { x: rng.range(390, 480), y: rng.range(390, 480), width: 7.5 },
      },
      {
        start: { x: rng.range(380, 470), y: rng.range(35, 105), width: 3.4 },
        end: { x: rng.range(30, 120), y: rng.range(380, 475), width: 5.8 },
      },
      {
        start: { x: rng.range(150, 230), y: rng.range(20, 70), width: 2.8 },
        end: { x: rng.range(260, 340), y: rng.range(430, 488), width: 5.2 },
      },
    ];

    riverSpecs.forEach((spec, id) => {
      const points = makeCurve(rng, spec.start, spec.end, 7, id === 0 ? 75 : 52);
      rivers.push({ id, points: points.map((p) => ({ x: p.x, y: p.y, width: Math.max(2.5, p.width ?? 4) })) });
    });

    for (const river of rivers) {
      map.rivers.push(river);
      const minX = Math.max(0, Math.floor(Math.min(...river.points.map((p) => p.x - (p.width ?? 6) - 4))));
      const maxX = Math.min(map.width - 1, Math.ceil(Math.max(...river.points.map((p) => p.x + (p.width ?? 6) + 4))));
      const minY = Math.max(0, Math.floor(Math.min(...river.points.map((p) => p.y - (p.width ?? 6) - 4))));
      const maxY = Math.min(map.height - 1, Math.ceil(Math.max(...river.points.map((p) => p.y + (p.width ?? 6) + 4))));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const d = pathDistance(x + 0.5, y + 0.5, river.points);
          const width = sampleWidth(river.points, d.t);
          if (d.distance < width) {
            const cell = map.get(x, y);
            cell.terrain = TerrainKind.Water;
            cell.waterDepth = 1 - d.distance / width;
            cell.moisture = Math.max(cell.moisture, 0.95);
            cell.elevation = Math.min(cell.elevation, 0.44);
            cell.object = ObjectKind.None;
          } else if (d.distance < width + 2.4) {
            const cell = map.get(x, y);
            if (cell.terrain !== TerrainKind.Water) {
              cell.terrain = TerrainKind.Shore;
              cell.moisture = Math.max(cell.moisture, 0.8);
            }
          }
        }
      }
    }
  }

  private generateLakes(map: WorldMap, rng: Random, noise: ValueNoise2D): void {
    for (let i = 0; i < 7; i++) {
      const cx = rng.range(60, map.width - 60);
      const cy = rng.range(60, map.height - 60);
      const rx = rng.range(8, 22);
      const ry = rng.range(7, 19);
      for (let y = Math.floor(cy - ry - 4); y <= Math.ceil(cy + ry + 4); y++) {
        for (let x = Math.floor(cx - rx - 4); x <= Math.ceil(cx + rx + 4); x++) {
          if (!map.inBounds(x, y)) continue;
          const n = noise.fbm(x / 18 + i * 10, y / 18 - i * 7, 3);
          const ellipse = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
          if (ellipse < 0.88 + n * 0.28) {
            const cell = map.get(x, y);
            cell.terrain = TerrainKind.Water;
            cell.waterDepth = Math.max(cell.waterDepth, 1 - ellipse);
            cell.object = ObjectKind.None;
          } else if (ellipse < 1.18 + n * 0.35 && map.get(x, y).terrain !== TerrainKind.Water) {
            map.get(x, y).terrain = TerrainKind.Shore;
          }
        }
      }
    }
  }

  private generateMountains(map: WorldMap, rng: Random, noise: ValueNoise2D): void {
    const ranges = [
      makeCurve(rng, { x: 35, y: 155, width: 15 }, { x: 460, y: 95, width: 23 }, 8, 62),
      makeCurve(rng, { x: 92, y: 450, width: 20 }, { x: 470, y: 298, width: 18 }, 7, 52),
    ];

    for (const range of ranges) {
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          const d = pathDistance(x, y, range);
          const width = sampleWidth(range, d.t);
          const ridge = noise.ridged(x / 22 + d.t * 7, y / 22 - d.t * 3, 4);
          if (d.distance < width * (0.62 + ridge * 0.72) && map.get(x, y).terrain !== TerrainKind.Water) {
            const cell = map.get(x, y);
            cell.terrain = TerrainKind.Mountain;
            cell.elevation = Math.max(cell.elevation, 0.78 + ridge * 0.18);
            cell.object = ObjectKind.None;
          }
        }
      }
    }
  }

  private generateRoadNetwork(map: WorldMap, rng: Random): void {
    const mainA = makeCurve(rng, { x: 30, y: 270, width: 2.2 }, { x: 468, y: 238, width: 2.4 }, 8, 48);
    const mainB = makeCurve(rng, { x: 260, y: 28, width: 2.1 }, { x: 235, y: 470, width: 2.4 }, 8, 58);
    const ring = makeCurve(rng, { x: 95, y: 365, width: 1.7 }, { x: 410, y: 115, width: 1.8 }, 9, 90);
    const roads: Road[] = [
      { id: 0, points: mainA, kind: 'main' },
      { id: 1, points: mainB, kind: 'main' },
      { id: 2, points: ring, kind: 'forest' },
    ];
    for (const road of roads) {
      map.roads.push(road);
      this.paintRoad(map, road);
    }

    const bridgeCandidates: { x: number; y: number }[] = [];
    for (const road of map.roads) {
      for (const point of road.points) {
        const x = Math.round(point.x);
        const y = Math.round(point.y);
        if (map.inBounds(x, y) && map.get(x, y).terrain === TerrainKind.Water) {
          bridgeCandidates.push({ x, y });
        }
      }
    }
    for (const candidate of bridgeCandidates) {
      this.paintBridge(map, candidate.x, candidate.y);
    }
  }

  private paintRoad(map: WorldMap, road: Road): void {
    const margin = road.kind === 'main' ? 5 : 4;
    const minX = Math.max(0, Math.floor(Math.min(...road.points.map((p) => p.x)) - margin));
    const maxX = Math.min(map.width - 1, Math.ceil(Math.max(...road.points.map((p) => p.x)) + margin));
    const minY = Math.max(0, Math.floor(Math.min(...road.points.map((p) => p.y)) - margin));
    const maxY = Math.min(map.height - 1, Math.ceil(Math.max(...road.points.map((p) => p.y)) + margin));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = pathDistance(x + 0.5, y + 0.5, road.points);
        const width = road.kind === 'main' ? 2.1 : 1.45;
        if (d.distance < width) {
          const cell = map.get(x, y);
          cell.road = Math.max(cell.road, 1 - d.distance / width);
          if (cell.terrain === TerrainKind.Water) {
            cell.terrain = TerrainKind.Bridge;
            cell.bridgeAxis = this.bridgeAxisForRoadAt(road, x + 0.5, y + 0.5);
          } else if (cell.terrain !== TerrainKind.Mountain || road.kind === 'main') {
            cell.terrain = TerrainKind.Road;
            cell.object = ObjectKind.None;
            cell.bridgeAxis = null;
          }
        } else if (d.distance < width + 1.2 && map.get(x, y).terrain !== TerrainKind.Water && map.get(x, y).terrain !== TerrainKind.Mountain) {
          map.get(x, y).road = Math.max(map.get(x, y).road, 0.35);
        }
      }
    }
  }

  private paintBridge(map: WorldMap, x: number, y: number): void {
    const verticalWater =
      (map.inBounds(x, y - 1) && map.get(x, y - 1).terrain === TerrainKind.Water) ||
      (map.inBounds(x, y + 1) && map.get(x, y + 1).terrain === TerrainKind.Water);
    const axis: 'horizontal' | 'vertical' = verticalWater ? 'horizontal' : 'vertical';
    const rx = axis === 'horizontal' ? 3 : 1;
    const ry = axis === 'horizontal' ? 1 : 3;
    for (let yy = y - ry; yy <= y + ry; yy++) {
      for (let xx = x - rx; xx <= x + rx; xx++) {
        if (map.inBounds(xx, yy) && map.get(xx, yy).terrain === TerrainKind.Water) {
          const cell = map.get(xx, yy);
          cell.terrain = TerrainKind.Bridge;
          cell.bridgeAxis = axis;
        }
      }
    }
  }

  private bridgeAxisForRoadAt(road: Road, x: number, y: number): 'horizontal' | 'vertical' {
    let best: { distance: number; dx: number; dy: number } | null = null;
    for (let i = 0; i < road.points.length - 1; i++) {
      const a = road.points[i];
      const b = road.points[i + 1];
      const result = pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
      if (!best || result.distance < best.distance) {
        best = { distance: result.distance, dx: b.x - a.x, dy: b.y - a.y };
      }
    }
    if (!best) return 'horizontal';
    return Math.abs(best.dx) >= Math.abs(best.dy) ? 'horizontal' : 'vertical';
  }

  private generateSettlements(map: WorldMap, rng: Random): void {
    const candidates = this.findSettlementCandidates(map);
    const picked: Settlement[] = [];
    const desired = 18 + rng.int(0, 5);
    for (const candidate of candidates) {
      if (picked.length >= desired) break;
      if (picked.some((s) => distance(s, candidate) < 31)) continue;
      const settlementKindWeights: { value: Settlement['kind']; weight: number }[] = [
        { value: 'village', weight: 5 },
        { value: 'house', weight: 2 },
        { value: 'market', weight: 2 },
      ];
      const kind: Settlement['kind'] =
        picked.length === 0 ? 'town' : picked.length === 1 ? 'market' : rng.weighted(settlementKindWeights);
      const radius = kind === 'town' ? 14 : kind === 'market' ? 12 : kind === 'house' ? 6 : 9;
      picked.push({
        id: picked.length,
        name: settlementNames[picked.length % settlementNames.length],
        kind,
        x: candidate.x,
        y: candidate.y,
        radius,
        bounds: { x: candidate.x - radius, y: candidate.y - radius, w: radius * 2, h: radius * 2 },
        connectedSettlementIds: [],
        marketInventory: this.createMarketInventory(kind, picked.length, rng),
      });
    }

    for (const settlement of picked) {
      map.settlements.push(settlement);
      this.paintSettlement(map, rng, settlement);
    }

    this.connectSettlements(map, rng);

    for (const settlement of map.settlements) {
      const nearestRoadPoint = this.nearestRoadPoint(map, settlement.x, settlement.y);
      if (nearestRoadPoint) {
        const road: Road = {
          id: map.roads.length,
          kind: 'town',
          points: catmullRom(
            [
              { x: settlement.x, y: settlement.y, width: 1.4 },
              { x: (settlement.x + nearestRoadPoint.x) / 2 + rng.range(-8, 8), y: (settlement.y + nearestRoadPoint.y) / 2 + rng.range(-8, 8), width: 1.2 },
              { x: nearestRoadPoint.x, y: nearestRoadPoint.y, width: 1.2 },
            ],
            8,
          ),
        };
        map.roads.push(road);
        this.paintRoad(map, road);
        this.paintGateRoad(map, settlement, settlement.gate ?? this.computeSettlementGate(map, settlement));
      }
    }
  }

  private createMarketInventory(kind: Settlement['kind'], id: number, rng: Random): Settlement['marketInventory'] {
    const make = (itemId: string, stock: number, priceMultiplier = 1) => {
      const item = itemDefinition(itemId);
      if (!item) {
        return { itemId, name: itemId, category: '材料' as const, price: 1, stock, description: '未登记货物。' };
      }
      return {
        itemId,
        name: item.name,
        category: item.category,
        price: Math.max(1, Math.round(item.value * priceMultiplier)),
        stock,
        description: item.description,
      };
    };
    const common = [make('spirit-herb', rng.int(4, 10), 1.05), make('cinnabar', rng.int(3, 8), 1.1)];
    const byKind: Record<Settlement['kind'], Settlement['marketInventory']> = {
      village: [
        make('yellow-root', rng.int(4, 9), 1.05),
        make('qi-pill', rng.int(3, 7), 1.12),
        make('blood-pill', rng.int(2, 6), 1.08),
        make('paper-talisman', rng.int(2, 5), 1.05),
      ],
      town: [
        make('qi-pill', rng.int(4, 9), 1.1),
        make('spirit-return-pill', rng.int(2, 5), 1.12),
        make('cloth-armor', rng.int(1, 3), 1),
        make('wind-boots', rng.int(1, 2), 1.04),
        make(id % 2 === 0 ? 'iron-sword' : 'spirit-wood-staff', rng.int(1, 2), 1.08),
      ],
      house: [
        make('blood-pill', rng.int(1, 4), 1.05),
        make('cultivation-pill', rng.int(1, 3), 1.15),
        make('spirit-herb', rng.int(3, 6), 1),
      ],
      market: [
        make('fire-talisman', rng.int(3, 7), 1.08),
        make('guard-talisman', rng.int(2, 5), 1.08),
        make('fire-manual', rng.int(1, 2), 1.05),
        make(id % 2 === 0 ? 'vine-manual' : 'thunder-manual', rng.int(1, 2), 1.08),
        make(id % 3 === 0 ? 'cloud-robe' : 'jade-pendant', rng.int(1, 2), 1.08),
        make(id % 3 === 1 ? 'copper-saber' : 'thunder-staff', rng.int(1, 2), 1.1),
      ],
    };
    return [...common, ...byKind[kind]];
  }

  private connectSettlements(map: WorldMap, rng: Random): void {
    const settlements = [...map.settlements].sort((a, b) => a.id - b.id);
    for (let i = 0; i < settlements.length; i++) {
      const current = settlements[i];
      const candidates = settlements
        .filter((other) => other.id !== current.id)
        .sort((a, b) => distance(current, a) - distance(current, b));
      const target = candidates[0];
      if (!target || current.connectedSettlementIds.includes(target.id)) continue;
      current.connectedSettlementIds.push(target.id);
      target.connectedSettlementIds.push(current.id);
      const road: Road = {
        id: map.roads.length,
        kind: i % 3 === 0 ? 'main' : 'town',
        points: makeCurve(
          rng,
          { x: current.x, y: current.y, width: 1.4 },
          { x: target.x, y: target.y, width: 1.4 },
          3,
          18,
        ),
      };
      map.roads.push(road);
      this.paintRoad(map, road);
    }
  }

  private generateRoadsideInns(map: WorldMap, rng: Random): void {
    const roads = map.roads.filter((road) => road.kind === 'main' || road.kind === 'town');
    const targetCount = Math.min(10, Math.max(5, Math.floor(map.settlements.length * 0.42)));
    for (const road of roads) {
      if (map.inns.length >= targetCount) break;
      if (road.points.length < 10 || rng.chance(road.kind === 'main' ? 0.28 : 0.14) === false) continue;
      const start = rng.int(3, Math.max(4, road.points.length - 12));
      const step = rng.int(12, 24);
      for (let i = start; i < road.points.length - 4 && map.inns.length < targetCount; i += step) {
        if (!rng.chance(0.5)) continue;
        const point = road.points[i];
        const next = road.points[Math.min(road.points.length - 1, i + 1)];
        const normal = normalize({ x: -(next.y - point.y), y: next.x - point.x });
        const side = rng.chance(0.5) ? 1 : -1;
        const x = Math.round(point.x + normal.x * side * 4);
        const y = Math.round(point.y + normal.y * side * 4);
        if (!this.canPlaceInn(map, x, y)) continue;
        this.paintInn(map, x, y, Math.round(point.x), Math.round(point.y));
        map.inns.push({
          id: map.inns.length,
          name: innNames[map.inns.length % innNames.length],
          x,
          y,
          price: rng.int(3, 6),
        });
      }
    }
  }

  private generateSects(map: WorldMap, rng: Random): void {
    const candidates = this.findSectCandidates(map, rng);
    for (const blueprint of sectBlueprints) {
      const candidate = candidates.find((point) => !map.sects.some((sect) => Math.hypot(sect.x - point.x, sect.y - point.y) < 78));
      if (!candidate) continue;
      const id = map.sects.length;
      const radius = 15;
      const gateDir = normalize(this.nearestRoadPoint(map, candidate.x, candidate.y) ? { x: (this.nearestRoadPoint(map, candidate.x, candidate.y)?.x ?? candidate.x) - candidate.x, y: (this.nearestRoadPoint(map, candidate.x, candidate.y)?.y ?? candidate.y) - candidate.y } : { x: 1, y: 0 });
      const nx = Math.abs(gateDir.x) + Math.abs(gateDir.y) < 0.01 ? 1 : gateDir.x;
      const ny = Math.abs(gateDir.x) + Math.abs(gateDir.y) < 0.01 ? 0 : gateDir.y;
      const side = normalize({ x: -ny, y: nx });
      const sect: Sect = {
        id,
        name: blueprint.name,
        style: blueprint.style,
        x: candidate.x,
        y: candidate.y,
        radius,
        bounds: { x: candidate.x - radius, y: candidate.y - radius, w: radius * 2, h: radius * 2 },
        gate: {
          x: Math.round(candidate.x + nx * radius),
          y: Math.round(candidate.y + ny * radius),
          nx,
          ny,
          width: 4,
        },
        shop: { x: Math.round(candidate.x + side.x * 5 - nx * 2), y: Math.round(candidate.y + side.y * 5 - ny * 2) },
        spiritPool: { x: Math.round(candidate.x - side.x * 6), y: Math.round(candidate.y - side.y * 6) },
        taskBoard: { x: Math.round(candidate.x - side.x * 4 + nx * 5), y: Math.round(candidate.y - side.y * 4 + ny * 5) },
        teleport: { x: Math.round(candidate.x + side.x * 6 + nx * 3), y: Math.round(candidate.y + side.y * 6 + ny * 3) },
        signatureSpellIds: [...blueprint.signatureSpellIds],
        marketInventory: this.createSectMarketInventory(blueprint.style, blueprint.manualIds, rng),
        relations: { friendly: [], hostile: [] },
      };
      map.sects.push(sect);
      this.paintSect(map, sect, rng);
      const nearest = this.nearestRoadPoint(map, sect.gate.x, sect.gate.y);
      if (nearest) {
        const road: Road = {
          id: map.roads.length,
          kind: 'town',
          points: makeCurve(
            rng,
            { x: sect.gate.x, y: sect.gate.y, width: 1.4 },
            { x: nearest.x, y: nearest.y, width: 1.3 },
            2,
            13,
          ),
        };
        map.roads.push(road);
        this.paintRoad(map, road);
      }
    }
    this.assignSectRelations(map);
  }

  private findSectCandidates(map: WorldMap, rng: Random): { x: number; y: number; score: number }[] {
    const candidates: { x: number; y: number; score: number }[] = [];
    for (let y = 36; y < map.height - 36; y += 8) {
      for (let x = 36; x < map.width - 36; x += 8) {
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Shore || cell.terrain === TerrainKind.Bridge) continue;
        if (map.settlements.some((settlement) => Math.hypot(settlement.x - x, settlement.y - y) < settlement.radius + 48)) continue;
        if (map.inns.some((inn) => Math.hypot(inn.x - x, inn.y - y) < 28)) continue;
        if (this.hasNearbyTerrain(map, x, y, 6, TerrainKind.Water, TerrainKind.Shore)) continue;
        const roadPoint = this.nearestRoadPoint(map, x, y);
        const roadDistance = roadPoint ? Math.hypot(roadPoint.x - x, roadPoint.y - y) : 999;
        if (roadDistance < 32 || roadDistance > 120) continue;
        const terrainScore = cell.terrain === TerrainKind.Mountain ? 1.1 : cell.terrain === TerrainKind.Forest ? 1 : cell.terrain === TerrainKind.Hill ? 0.9 : 0.55;
        const remoteScore = Math.min(2.4, roadDistance / 42);
        const centerPenalty = 1 - Math.min(1, Math.hypot(x - map.width / 2, y - map.height / 2) / 260);
        candidates.push({ x, y, score: terrainScore + remoteScore - centerPenalty * 0.65 + rng.range(0, 0.8) });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  private createSectMarketInventory(style: SectStyle, manualIds: string[], rng: Random): SectMarketItem[] {
    const make = (itemId: string, stock: number, priceMultiplier: number, minRank: DiscipleRank): SectMarketItem => {
      const item = itemDefinition(itemId);
      return {
        itemId,
        name: item?.name ?? itemId,
        category: item?.category ?? '材料',
        price: Math.max(1, Math.round((item?.value ?? 1) * priceMultiplier)),
        stock,
        description: item?.description ?? '宗门货物。',
        minRank,
      };
    };
    const styleGoods: Record<SectStyle, SectMarketItem[]> = {
      sword: [make('iron-sword', 2, 0.95, '外门弟子'), make('moon-sword', 1, 0.92, '内门弟子')],
      alchemy: [make('sect-qi-pill', rng.int(4, 8), 0.9, '外门弟子'), make('marrow-wash-pill', rng.int(1, 3), 0.9, '内门弟子')],
      talisman: [make('fire-talisman', rng.int(4, 8), 0.92, '外门弟子'), make('thunder-talisman', rng.int(2, 4), 0.9, '内门弟子')],
      frost: [make('cloud-robe', 1, 0.95, '外门弟子'), make('crane-robe', 1, 0.9, '内门弟子')],
    };
    return [
      make('qi-pill', rng.int(5, 10), 0.95, '外门弟子'),
      make('cultivation-pill', rng.int(3, 6), 0.94, '外门弟子'),
      ...styleGoods[style],
      make(manualIds[0], 1, 0.88, '内门弟子'),
      make(manualIds[1], 1, 0.82, '亲传弟子'),
    ];
  }

  private assignSectRelations(map: WorldMap): void {
    for (const sect of map.sects) {
      const hostile = map.sects.find((entry) => entry.id !== sect.id && (entry.id + sect.id) % 3 === 1);
      const friendly = map.sects.find((entry) => entry.id !== sect.id && entry.id !== hostile?.id);
      sect.relations.hostile = hostile ? [hostile.id] : [];
      sect.relations.friendly = friendly ? [friendly.id] : [];
      sect.relations.hostileNames = hostile ? [hostile.name] : [];
      sect.relations.friendlyNames = friendly ? [friendly.name] : [];
    }
  }

  private paintSect(map: WorldMap, sect: Sect, rng: Random): void {
    const minX = Math.max(2, Math.floor(sect.x - sect.radius - 2));
    const maxX = Math.min(map.width - 3, Math.ceil(sect.x + sect.radius + 2));
    const minY = Math.max(2, Math.floor(sect.y - sect.radius - 2));
    const maxY = Math.min(map.height - 3, Math.ceil(sect.y + sect.radius + 2));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = Math.hypot(x - sect.x, y - sect.y);
        if (d > sect.radius * 1.05) continue;
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Shore || cell.terrain === TerrainKind.Bridge) {
          cell.terrain = TerrainKind.Grass;
          cell.waterDepth = 0;
        }
        if (d < sect.radius * 0.92) {
          cell.terrain = TerrainKind.SectGround;
          cell.object = ObjectKind.None;
        }
        const onEdge = Math.abs(d - sect.radius) < 0.75;
        const inGate = Math.hypot(x - sect.gate.x, y - sect.gate.y) <= sect.gate.width;
        if (onEdge && !inGate) {
          cell.object = (Math.abs(x - sect.x) > Math.abs(y - sect.y)) ? ObjectKind.FenceVertical : ObjectKind.FenceHorizontal;
        }
      }
    }
    this.paintSectHall(map, sect);
    this.paintSectObject(map, sect.shop.x, sect.shop.y, ObjectKind.SectShop);
    this.paintSectObject(map, sect.spiritPool.x, sect.spiritPool.y, ObjectKind.SpiritPool);
    this.paintSectObject(map, sect.taskBoard.x, sect.taskBoard.y, ObjectKind.TaskBoard);
    this.paintSectObject(map, sect.teleport.x, sect.teleport.y, ObjectKind.TeleportArray);
    this.paintSectGateRoad(map, sect);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + rng.range(-0.15, 0.15);
      const x = Math.round(sect.x + Math.cos(angle) * sect.radius * 0.68);
      const y = Math.round(sect.y + Math.sin(angle) * sect.radius * 0.68);
      if (map.inBounds(x, y) && map.get(x, y).object === ObjectKind.None) map.get(x, y).object = rng.chance(0.5) ? ObjectKind.SectPillar : ObjectKind.Lantern;
    }
  }

  private paintSectHall(map: WorldMap, sect: Sect): void {
    for (let yy = -2; yy <= 2; yy++) {
      for (let xx = -3; xx <= 3; xx++) {
        const x = sect.x + xx;
        const y = sect.y + yy;
        if (!map.inBounds(x, y)) continue;
        const cell = map.get(x, y);
        cell.terrain = TerrainKind.SectGround;
        cell.object = Math.abs(xx) === 3 && yy <= 1 ? ObjectKind.SectPillar : ObjectKind.SectHall;
      }
    }
    const door = map.get(sect.x, sect.y + 2);
    door.object = ObjectKind.HouseDoor;
  }

  private paintSectObject(map: WorldMap, x: number, y: number, object: ObjectKind): void {
    if (!map.inBounds(x, y)) return;
    const cell = map.get(x, y);
    cell.terrain = TerrainKind.SectGround;
    cell.object = object;
  }

  private paintSectGateRoad(map: WorldMap, sect: Sect): void {
    for (let i = -3; i <= sect.radius + 7; i++) {
      const cx = Math.round(sect.gate.x - sect.gate.nx * i);
      const cy = Math.round(sect.gate.y - sect.gate.ny * i);
      for (let offset = -2; offset <= 2; offset++) {
        const x = Math.round(cx - sect.gate.ny * offset);
        const y = Math.round(cy + sect.gate.nx * offset);
        if (!map.inBounds(x, y)) continue;
        const cell = map.get(x, y);
        if (cell.terrain !== TerrainKind.Water && cell.terrain !== TerrainKind.Bridge) cell.terrain = i <= sect.radius ? TerrainKind.SectGround : TerrainKind.Road;
        if (cell.object !== ObjectKind.SectShop && cell.object !== ObjectKind.SpiritPool && cell.object !== ObjectKind.TaskBoard && cell.object !== ObjectKind.TeleportArray) cell.object = ObjectKind.None;
        cell.collision = false;
      }
    }
  }

  private canPlaceInn(map: WorldMap, x: number, y: number): boolean {
    if (map.settlements.some((settlement) => distance(settlement, { x, y }) < settlement.radius + 9)) return false;
    if (map.inns.some((inn) => Math.hypot(inn.x - x, inn.y - y) < 34)) return false;
    for (let yy = y - 2; yy <= y + 2; yy++) {
      for (let xx = x - 2; xx <= x + 2; xx++) {
        if (!map.inBounds(xx, yy)) return false;
        const cell = map.get(xx, yy);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Bridge || cell.terrain === TerrainKind.Mountain) return false;
        if (cell.object !== ObjectKind.None) return false;
      }
    }
    return true;
  }

  private paintInn(map: WorldMap, x: number, y: number, roadX: number, roadY: number): void {
    for (let yy = y - 1; yy <= y + 1; yy++) {
      for (let xx = x - 1; xx <= x + 1; xx++) {
        if (!map.inBounds(xx, yy)) continue;
        const cell = map.get(xx, yy);
        cell.terrain = TerrainKind.Town;
        cell.object = xx === x && yy === y + 1 ? ObjectKind.HouseDoor : ObjectKind.Inn;
      }
    }
    const door = map.get(x, y + 1);
    door.object = ObjectKind.HouseDoor;
    const steps = Math.max(1, Math.ceil(Math.hypot(roadX - x, roadY - y)));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps;
      const px = Math.round(lerp(x, roadX, t));
      const py = Math.round(lerp(y + 2, roadY, t));
      if (!map.inBounds(px, py)) continue;
      const path = map.get(px, py);
      if (path.terrain !== TerrainKind.Water && path.terrain !== TerrainKind.Bridge && path.object === ObjectKind.None) {
        path.terrain = TerrainKind.Road;
        path.object = ObjectKind.None;
      }
    }
    for (const offset of [-2, 2]) {
      if (!map.inBounds(x + offset, y + 2)) continue;
      const lantern = map.get(x + offset, y + 2);
      if (lantern.object === ObjectKind.None) lantern.object = ObjectKind.Lantern;
    }
  }

  private findSettlementCandidates(map: WorldMap): { x: number; y: number; score: number }[] {
    const candidates: { x: number; y: number; score: number }[] = [];
    for (let y = 30; y < map.height - 30; y += 5) {
      for (let x = 30; x < map.width - 30; x += 5) {
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Mountain) continue;
        const roadScore = Math.max(0, 1 - this.distanceToRoad(map, x, y) / 32);
        const waterScore = Math.max(0, 1 - this.distanceToWater(map, x, y, 44) / 44);
        const flatScore = 1 - Math.abs(cell.elevation - 0.48);
        const forestPenalty = cell.forest > 0.68 ? 0.35 : 0;
        const score = roadScore * 0.42 + waterScore * 0.28 + flatScore * 0.25 - forestPenalty;
        if (score > 0.48) candidates.push({ x, y, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  private distanceToRoad(map: WorldMap, x: number, y: number): number {
    let best = Infinity;
    for (const road of map.roads) best = Math.min(best, pathDistance(x, y, road.points).distance);
    return best;
  }

  private distanceToWater(map: WorldMap, x: number, y: number, maxDistance: number): number {
    let best = maxDistance;
    for (let yy = Math.max(0, y - maxDistance); yy <= Math.min(map.height - 1, y + maxDistance); yy += 3) {
      for (let xx = Math.max(0, x - maxDistance); xx <= Math.min(map.width - 1, x + maxDistance); xx += 3) {
        if (map.get(xx, yy).terrain === TerrainKind.Water) best = Math.min(best, Math.hypot(xx - x, yy - y));
      }
    }
    return best;
  }

  private nearestRoadPoint(map: WorldMap, x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number; d: number } | null = null;
    for (const road of map.roads) {
      const result = pathDistance(x, y, road.points);
      if (!best || result.distance < best.d) best = { ...result.nearest, d: result.distance };
    }
    return best ? { x: best.x, y: best.y } : null;
  }

  private paintSettlement(map: WorldMap, rng: Random, settlement: Settlement): void {
    const minX = Math.max(2, Math.floor(settlement.x - settlement.radius - 5));
    const maxX = Math.min(map.width - 3, Math.ceil(settlement.x + settlement.radius + 5));
    const minY = Math.max(2, Math.floor(settlement.y - settlement.radius - 5));
    const maxY = Math.min(map.height - 3, Math.ceil(settlement.y + settlement.radius + 5));
    const gate = this.computeSettlementGate(map, settlement);
    settlement.gate = gate;
    void rng;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = Math.hypot(x - settlement.x, y - settlement.y);
        if (d < settlement.radius * 1.05) {
          const cell = map.get(x, y);
          if (d < settlement.radius * 0.95) {
            cell.terrain = d < settlement.radius * 0.78 ? TerrainKind.Town : TerrainKind.Grass;
            cell.object = ObjectKind.None;
            cell.elevation = Math.min(cell.elevation, 0.6);
            cell.waterDepth = 0;
            cell.bridgeAxis = null;
          }
        }
      }
    }

    this.clearSettlementWater(map, settlement);

    const roads: Road[] = [
      {
        id: -1,
        kind: 'town',
        points: [
          { x: settlement.x - settlement.radius + 3, y: settlement.y },
          { x: settlement.x + settlement.radius - 3, y: settlement.y },
        ],
      },
      {
        id: -2,
        kind: 'town',
        points: [
          { x: settlement.x, y: settlement.y - settlement.radius + 3 },
          { x: settlement.x, y: settlement.y + settlement.radius - 3 },
        ],
      },
    ];
    roads.forEach((road) => this.paintRoad(map, road));
    this.paintGateRoad(map, settlement, gate);

    const houseCount = settlement.kind === 'town' ? 12 : settlement.kind === 'market' ? 9 : settlement.kind === 'house' ? 2 : 7;
    const houseSlots = this.createHouseSlots(map, settlement, houseCount, gate, rng);
    for (const slot of houseSlots) {
      this.paintHouse(map, Math.round(slot.x), Math.round(slot.y), slot.w, slot.h);
    }

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const onEdge = Math.abs(Math.hypot(x - settlement.x, y - settlement.y) - settlement.radius) < 0.75;
        const dx = x - gate.x;
        const dy = y - gate.y;
        const inGate = Math.hypot(dx, dy) <= gate.width;
        if (onEdge && !inGate && map.get(x, y).terrain !== TerrainKind.Water) {
          map.get(x, y).object = this.fenceKindForPoint(settlement, x, y);
        }
      }
    }
    this.decorateGate(map, gate);
    this.paintMarket(map, settlement);
    this.paintSettlementInn(map, settlement, gate, rng);

    for (let i = 0; i < Math.max(4, houseCount - 2); i++) {
      const angle = (i / Math.max(4, houseCount - 2)) * Math.PI * 2;
      const x = Math.round(settlement.x + Math.cos(angle) * settlement.radius * 0.48);
      const y = Math.round(settlement.y + Math.sin(angle) * settlement.radius * 0.48);
      if (map.inBounds(x, y) && map.get(x, y).object === ObjectKind.None) map.get(x, y).object = ObjectKind.Lantern;
    }
  }

  private computeSettlementGate(map: WorldMap, settlement: Settlement): SettlementGate {
    const nearest = this.nearestRoadPoint(map, settlement.x, settlement.y);
    const dx = (nearest?.x ?? settlement.x + settlement.radius) - settlement.x;
    const dy = (nearest?.y ?? settlement.y) - settlement.y;
    const dir = normalize({ x: dx, y: dy });
    const fallback = Math.abs(dir.x) + Math.abs(dir.y) < 0.01;
    const nx = fallback ? 1 : dir.x;
    const ny = fallback ? 0 : dir.y;
    const width = settlement.kind === 'house' ? 2 : settlement.kind === 'village' ? 3 : 5;
    return {
      x: Math.round(settlement.x + nx * settlement.radius),
      y: Math.round(settlement.y + ny * settlement.radius),
      nx,
      ny,
      width,
    };
  }

  private clearSettlementWater(map: WorldMap, settlement: Settlement): void {
    const minX = Math.max(1, Math.floor(settlement.x - settlement.radius - 1));
    const maxX = Math.min(map.width - 2, Math.ceil(settlement.x + settlement.radius + 1));
    const minY = Math.max(1, Math.floor(settlement.y - settlement.radius - 1));
    const maxY = Math.min(map.height - 2, Math.ceil(settlement.y + settlement.radius + 1));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d = Math.hypot(x - settlement.x, y - settlement.y);
        if (d > settlement.radius * 0.98) continue;
        if (map.get(x, y).terrain === TerrainKind.Water || map.get(x, y).terrain === TerrainKind.Shore || map.get(x, y).terrain === TerrainKind.Bridge) {
          const cell = map.get(x, y);
          cell.terrain = d < settlement.radius * 0.72 ? TerrainKind.Town : TerrainKind.Grass;
          cell.waterDepth = 0;
          cell.object = ObjectKind.None;
          cell.bridgeAxis = null;
        }
      }
    }
  }

  private paintGateRoad(map: WorldMap, settlement: Settlement, gate: SettlementGate): void {
    const length = settlement.radius + 7;
    for (let i = -3; i <= length; i++) {
      const cx = Math.round(gate.x - gate.nx * i);
      const cy = Math.round(gate.y - gate.ny * i);
      for (let offset = -Math.floor(gate.width / 2); offset <= Math.floor(gate.width / 2); offset++) {
        const x = Math.round(cx + -gate.ny * offset);
        const y = Math.round(cy + gate.nx * offset);
        if (!map.inBounds(x, y)) continue;
        const cell = map.get(x, y);
        if (cell.terrain !== TerrainKind.Water) cell.terrain = TerrainKind.Road;
        if (cell.terrain === TerrainKind.Water) cell.terrain = TerrainKind.Bridge;
        cell.object = ObjectKind.None;
        cell.collision = false;
      }
    }
  }

  private decorateGate(map: WorldMap, gate: SettlementGate): void {
    const side = normalize({ x: -gate.ny, y: gate.nx });
    for (const sign of [-1, 1]) {
      const x = Math.round(gate.x + side.x * sign * (gate.width + 0.8));
      const y = Math.round(gate.y + side.y * sign * (gate.width + 0.8));
      if (!map.inBounds(x, y)) continue;
      const cell = map.get(x, y);
      if (cell.terrain !== TerrainKind.Water) {
        cell.object = ObjectKind.GatePost;
        cell.collision = true;
      }
    }
  }

  private fenceKindForPoint(settlement: Settlement, x: number, y: number): ObjectKind {
    const dx = x - settlement.x;
    const dy = y - settlement.y;
    if (Math.abs(Math.abs(dx) - Math.abs(dy)) < 1.4) return ObjectKind.FencePost;
    return Math.abs(dx) > Math.abs(dy) ? ObjectKind.FenceVertical : ObjectKind.FenceHorizontal;
  }

  private paintMarket(map: WorldMap, settlement: Settlement): void {
    if (settlement.marketInventory.length === 0) return;
    const gate = settlement.gate ?? this.computeSettlementGate(map, settlement);
    const side = normalize({ x: -gate.ny, y: gate.nx });
    const mx = Math.round(settlement.x + side.x * Math.max(2, settlement.radius * 0.28));
    const my = Math.round(settlement.y + side.y * Math.max(2, settlement.radius * 0.28));
    const cells = [
      { x: mx, y: my, object: ObjectKind.MarketStall },
      { x: mx + Math.round(side.x), y: my + Math.round(side.y), object: ObjectKind.MarketSign },
      { x: mx - Math.round(side.x), y: my - Math.round(side.y), object: ObjectKind.Lantern },
    ];
    for (const entry of cells) {
      if (!map.inBounds(entry.x, entry.y)) continue;
      const cell = map.get(entry.x, entry.y);
      if (cell.terrain === TerrainKind.Water) cell.terrain = TerrainKind.Town;
      cell.object = entry.object;
      cell.collision = false;
    }
  }

  private paintSettlementInn(map: WorldMap, settlement: Settlement, gate: SettlementGate, rng: Random): void {
    if (settlement.kind === 'house') return;
    const side = normalize({ x: gate.ny, y: -gate.nx });
    const candidates = [
      { x: Math.round(settlement.x - side.x * settlement.radius * 0.52), y: Math.round(settlement.y - side.y * settlement.radius * 0.52) },
      { x: Math.round(settlement.x - side.x * settlement.radius * 0.42 - gate.nx * 3), y: Math.round(settlement.y - side.y * settlement.radius * 0.42 - gate.ny * 3) },
      { x: Math.round(settlement.x - gate.nx * settlement.radius * 0.42), y: Math.round(settlement.y - gate.ny * settlement.radius * 0.42) },
    ];
    const picked = candidates.find((point) => this.canPlaceSettlementInn(map, settlement, point.x, point.y));
    if (!picked) return;
    const roadPoint = { x: Math.round(settlement.x), y: Math.round(settlement.y) };
    this.paintInn(map, picked.x, picked.y, roadPoint.x, roadPoint.y);
    map.inns.push({
      id: map.inns.length,
      name: `${settlement.name}客栈`,
      x: picked.x,
      y: picked.y,
      price: rng.int(2, 5),
    });
  }

  private canPlaceSettlementInn(map: WorldMap, settlement: Settlement, x: number, y: number): boolean {
    if (Math.hypot(x - settlement.x, y - settlement.y) > settlement.radius * 0.9) return false;
    if (map.inns.some((inn) => Math.hypot(inn.x - x, inn.y - y) < 8)) return false;
    for (let yy = y - 2; yy <= y + 2; yy++) {
      for (let xx = x - 2; xx <= x + 2; xx++) {
        if (!map.inBounds(xx, yy)) return false;
        const cell = map.get(xx, yy);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Bridge || cell.terrain === TerrainKind.Mountain) return false;
        if (
          cell.object !== ObjectKind.None &&
          cell.object !== ObjectKind.Lantern
        ) {
          return false;
        }
      }
    }
    return true;
  }

  private createHouseSlots(map: WorldMap, settlement: Settlement, count: number, gate: SettlementGate, rng: Random): HouseSlot[] {
    const slots: HouseSlot[] = [];
    const rings = settlement.kind === 'house' ? [0.28] : [0.38, 0.62];
    let attempts = 0;
    while (slots.length < count && attempts < count * 18) {
      attempts++;
      const i = slots.length + attempts * 0.37;
      const ring = rings[attempts % rings.length];
      const angle = (i / count) * Math.PI * 2 + rng.range(-0.28, 0.28);
      const slot: HouseSlot = {
        x: settlement.x + Math.cos(angle) * settlement.radius * ring + rng.range(-1.5, 1.5),
        y: settlement.y + Math.sin(angle) * settlement.radius * ring + rng.range(-1.5, 1.5),
        w: rng.int(3, settlement.kind === 'town' || settlement.kind === 'market' ? 5 : 4),
        h: rng.int(3, 4),
      };
      if (this.houseSlotBlocked(map, settlement, gate, slot, slots)) continue;
      slots.push(slot);
    }
    return slots;
  }

  private houseSlotBlocked(map: WorldMap, settlement: Settlement, gate: SettlementGate, slot: HouseSlot, slots: HouseSlot[]): boolean {
    const halfW = slot.w / 2;
    const halfH = slot.h / 2;
    if (Math.hypot(slot.x - gate.x, slot.y - gate.y) < gate.width + 6) return true;
    if (Math.abs(slot.x - settlement.x) < 2.8 || Math.abs(slot.y - settlement.y) < 2.8) return true;
    for (const other of slots) {
      if (Math.abs(slot.x - other.x) < (slot.w + other.w) / 2 + 2 && Math.abs(slot.y - other.y) < (slot.h + other.h) / 2 + 2) return true;
    }
    for (let y = Math.floor(slot.y - halfH - 1); y <= Math.ceil(slot.y + halfH + 1); y++) {
      for (let x = Math.floor(slot.x - halfW - 1); x <= Math.ceil(slot.x + halfW + 1); x++) {
        if (!map.inBounds(x, y)) return true;
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Bridge) return true;
      }
    }
    return false;
  }

  private paintHouse(map: WorldMap, x: number, y: number, w: number, h: number): void {
    const top = y - Math.floor(h / 2);
    const bottom = y + Math.ceil(h / 2) - 1;
    const left = x - Math.floor(w / 2);
    const right = x + Math.ceil(w / 2) - 1;
    const doorX = Math.max(left, Math.min(right, x));
    for (let yy = top; yy <= bottom; yy++) {
      for (let xx = left; xx <= right; xx++) {
        if (!map.inBounds(xx, yy)) continue;
        const cell = map.get(xx, yy);
        cell.terrain = TerrainKind.Town;
        if (yy === top) {
          cell.object = ObjectKind.HouseRoof;
        } else if (yy === top + 1) {
          cell.object = ObjectKind.HouseEave;
        } else if (yy === bottom && xx === doorX) {
          cell.object = ObjectKind.HouseDoor;
        } else if (yy > top + 1 && (xx === left + 1 || xx === right - 1) && w >= 4) {
          cell.object = ObjectKind.HouseWindow;
        } else {
          cell.object = ObjectKind.HouseWall;
        }
      }
    }
    for (let step = 1; step <= 2; step++) {
      const pathY = bottom + step;
      if (map.inBounds(doorX, pathY)) {
        const path = map.get(doorX, pathY);
        if (path.terrain !== TerrainKind.Water) path.terrain = TerrainKind.Road;
        path.object = ObjectKind.None;
        path.collision = false;
      }
    }
  }

  private generateForests(map: WorldMap, rng: Random, noise: ValueNoise2D): void {
    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Mountain || cell.terrain === TerrainKind.Road || cell.terrain === TerrainKind.Bridge || cell.terrain === TerrainKind.Town) {
          continue;
        }
        const n = noise.fbm(x / 34 + 99, y / 34 - 12, 5);
        const clearing = noise.fbm(x / 13 - 44, y / 13 + 81, 3);
        const nearRoad = cell.road;
        const density = n * 0.72 + cell.moisture * 0.32 - nearRoad * 0.35 - (clearing > 0.64 ? 0.24 : 0);
        cell.forest = Math.max(cell.forest, density);
        if (density > 0.62) {
          cell.terrain = TerrainKind.Forest;
          const edgeVariation = density < 0.74 ? 0.52 : 0.82;
          if (rng.chance(edgeVariation) && cell.object === ObjectKind.None) {
            cell.object = rng.chance(0.38) ? ObjectKind.TreePine : ObjectKind.TreeOak;
          }
        }
      }
    }

    for (let i = 0; i < 8; i++) {
      const start = { x: rng.range(45, 455), y: rng.range(45, 455), width: 1.1 };
      const end = { x: start.x + rng.range(-60, 60), y: start.y + rng.range(-60, 60), width: 1 };
      const road: Road = { id: map.roads.length, kind: 'secret', points: makeCurve(rng, start, end, 3, 18) };
      let forestHits = 0;
      for (const p of road.points) if (map.get(Math.round(p.x), Math.round(p.y)).terrain === TerrainKind.Forest) forestHits++;
      if (forestHits > road.points.length * 0.4) {
        map.roads.push(road);
        this.paintRoad(map, road);
      }
    }
  }

  private generateWildernessDetails(map: WorldMap, rng: Random, noise: ValueNoise2D): void {
    for (let y = 2; y < map.height - 2; y++) {
      for (let x = 2; x < map.width - 2; x++) {
        const cell = map.get(x, y);
        if (cell.object !== ObjectKind.None) continue;
        if (cell.terrain !== TerrainKind.Grass && cell.terrain !== TerrainKind.Meadow) continue;
        if (cell.road > 0.12 || this.hasNearbyTerrain(map, x, y, 5, TerrainKind.Road, TerrainKind.Bridge, TerrainKind.Town)) continue;
        if (this.hasNearbyTerrain(map, x, y, 5, TerrainKind.Water, TerrainKind.Shore)) continue;
        if (map.settlements.some((settlement) => distance(settlement, { x, y }) < settlement.radius + 12)) continue;

        const grove = noise.fbm(x / 28 + 131, y / 28 - 71, 4);
        const clearing = noise.fbm(x / 9 - 11, y / 9 + 37, 2);
        const chance = grove > 0.58 ? 0.026 : grove > 0.52 ? 0.011 : 0.0025;
        if (clearing > 0.74 || !rng.chance(chance)) continue;

        cell.object = rng.chance(0.45) ? ObjectKind.TreePine : ObjectKind.TreeOak;
        cell.forest = Math.max(cell.forest, 0.42 + grove * 0.2);
      }
    }
  }

  private generateHills(map: WorldMap, rng: Random, noise: ValueNoise2D): void {
    const hillCenters: { x: number; y: number; rx: number; ry: number; strength: number }[] = [];
    for (let i = 0; i < 46; i++) {
      const x = rng.int(24, map.width - 25);
      const y = rng.int(24, map.height - 25);
      const cell = map.get(x, y);
      if (cell.terrain !== TerrainKind.Grass && cell.terrain !== TerrainKind.Meadow) continue;
      if (cell.road > 0.08 || this.distanceToRoad(map, x, y) < 8) continue;
      if (this.hasNearbyTerrain(map, x, y, 6, TerrainKind.Water, TerrainKind.Shore, TerrainKind.Bridge, TerrainKind.Mountain, TerrainKind.Town)) continue;
      if (map.settlements.some((settlement) => distance(settlement, { x, y }) < settlement.radius + 14)) continue;
      hillCenters.push({ x, y, rx: rng.range(4, 9), ry: rng.range(3, 7), strength: rng.range(0.54, 0.78) });
    }

    for (const hill of hillCenters) {
      const minX = Math.max(1, Math.floor(hill.x - hill.rx - 2));
      const maxX = Math.min(map.width - 2, Math.ceil(hill.x + hill.rx + 2));
      const minY = Math.max(1, Math.floor(hill.y - hill.ry - 2));
      const maxY = Math.min(map.height - 2, Math.ceil(hill.y + hill.ry + 2));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const cell = map.get(x, y);
          if (cell.terrain !== TerrainKind.Grass && cell.terrain !== TerrainKind.Meadow) continue;
          if (cell.object !== ObjectKind.None || cell.road > 0.1) continue;
          const ellipse = ((x - hill.x) * (x - hill.x)) / (hill.rx * hill.rx) + ((y - hill.y) * (y - hill.y)) / (hill.ry * hill.ry);
          const n = noise.fbm(x / 8 + hill.x * 0.03, y / 8 - hill.y * 0.03, 3);
          if (ellipse < hill.strength + n * 0.22) {
            cell.terrain = TerrainKind.Hill;
            cell.elevation = Math.max(cell.elevation, 0.58 + (1 - ellipse) * 0.16);
            cell.collision = false;
          }
        }
      }
    }
  }

  private generateCaves(map: WorldMap, rng: Random): void {
    const candidates: { x: number; y: number; score: number }[] = [];
    for (let y = 8; y < map.height - 8; y += 2) {
      for (let x = 8; x < map.width - 8; x += 2) {
        const cell = map.get(x, y);
        if (cell.terrain !== TerrainKind.Mountain || cell.object !== ObjectKind.None) continue;
        if (map.settlements.some((settlement) => distance(settlement, { x, y }) < settlement.radius + 16)) continue;
        let openNeighbor = false;
        let mountainNeighbors = 0;
        for (let yy = y - 1; yy <= y + 1; yy++) {
          for (let xx = x - 1; xx <= x + 1; xx++) {
            if (xx === x && yy === y) continue;
            const terrain = map.get(xx, yy).terrain;
            if (terrain === TerrainKind.Mountain) mountainNeighbors++;
            if (terrain === TerrainKind.Grass || terrain === TerrainKind.Meadow || terrain === TerrainKind.Hill || terrain === TerrainKind.Forest) openNeighbor = true;
          }
        }
        if (!openNeighbor || mountainNeighbors < 3) continue;
        const roadDistance = this.distanceToRoad(map, x, y);
        const score = Math.max(0, 45 - roadDistance) * 0.05 + mountainNeighbors * 0.4 + rng.range(0, 2.4);
        candidates.push({ x, y, score });
      }
    }
    candidates.sort((a, b) => b.score - a.score);

    const caveTarget = Math.min(12, Math.max(7, Math.floor(map.settlements.length * 0.48)));
    for (const candidate of candidates) {
      if (map.caves.length >= caveTarget) break;
      if (map.caves.some((cave) => Math.hypot(cave.x - candidate.x, cave.y - candidate.y) < 34)) continue;
      const id = map.caves.length;
      const caveMap = this.createCaveMap(id, rng.clone(id * 4099 + 31));
      const cell = map.get(candidate.x, candidate.y);
      cell.object = ObjectKind.CaveEntrance;
      cell.collision = false;
      map.caves.push({
        id,
        name: `${interestNames[id % interestNames.length]}洞窟`,
        x: candidate.x,
        y: candidate.y,
        map: caveMap,
      });
    }
  }

  private createCaveMap(id: number, rng: Random): WorldMap {
    const width = rng.int(48, 64);
    const height = rng.int(34, 46);
    const cave = new WorldMap(width, height, 'cave');
    for (let y = 0; y < cave.height; y++) {
      for (let x = 0; x < cave.width; x++) {
        cave.set(x, y, {
          terrain: TerrainKind.CaveWall,
          object: ObjectKind.None,
          elevation: 0.8,
          moisture: 0.42,
          waterDepth: 0,
          collision: true,
          discovered: false,
          bridgeAxis: null,
        });
      }
    }

    const rooms: { x: number; y: number; rx: number; ry: number }[] = [];
    rooms.push({ x: Math.floor(width / 2), y: height - 5, rx: 4, ry: 3 });
    const roomCount = rng.int(5, 8);
    for (let i = 1; i < roomCount; i++) {
      rooms.push({
        x: rng.int(8, width - 9),
        y: rng.int(6, height - 10),
        rx: rng.int(4, 8),
        ry: rng.int(3, 6),
      });
    }
    rooms.sort((a, b) => b.y - a.y);

    for (const room of rooms) this.carveCaveRoom(cave, room.x, room.y, room.rx, room.ry);
    for (let i = 0; i < rooms.length - 1; i++) this.carveCaveTunnel(cave, rooms[i], rooms[i + 1], rng);

    const entrance = rooms[0];
    cave.spawn = { x: entrance.x, y: entrance.y };
    cave.get(entrance.x, entrance.y + 1).object = ObjectKind.CaveExit;
    cave.get(entrance.x, entrance.y + 1).collision = false;

    const featureRooms = rooms.slice(1);
    let featureId = 0;
    for (const room of featureRooms) {
      if (rng.chance(0.72)) {
        const x = Math.round(room.x + rng.range(-room.rx * 0.35, room.rx * 0.35));
        const y = Math.round(room.y + rng.range(-room.ry * 0.25, room.ry * 0.25));
        if (cave.inBounds(x, y) && cave.get(x, y).terrain === TerrainKind.CaveFloor && cave.get(x, y).object === ObjectKind.None) {
          const feature = this.makeCaveFeature(id, featureId++, x, y, rng, 'treasure');
          cave.caveFeatures.push(feature);
          cave.get(x, y).object = ObjectKind.TreasureChest;
        }
      }
      if (rng.chance(0.58)) {
        const x = Math.round(room.x + rng.range(-room.rx * 0.45, room.rx * 0.45));
        const y = Math.round(room.y + rng.range(-room.ry * 0.45, room.ry * 0.45));
        if (cave.inBounds(x, y) && cave.get(x, y).terrain === TerrainKind.CaveFloor && cave.get(x, y).object === ObjectKind.None) {
          const feature = this.makeCaveFeature(id, featureId++, x, y, rng, 'herb');
          cave.caveFeatures.push(feature);
          cave.get(x, y).object = ObjectKind.HerbPatch;
        }
      }
      if (rng.chance(0.62)) {
        const x = Math.round(room.x + rng.range(-room.rx * 0.4, room.rx * 0.4));
        const y = Math.round(room.y + rng.range(-room.ry * 0.4, room.ry * 0.4));
        if (cave.inBounds(x, y) && cave.get(x, y).terrain === TerrainKind.CaveFloor) {
          const feature = this.makeCaveFeature(id, featureId++, x, y, rng, 'beast');
          cave.caveFeatures.push(feature);
          if (feature.beast) cave.beasts.push(feature.beast);
        }
      }
    }
    cave.caveFeatures.push({ id: `cave-${id}-exit`, x: entrance.x, y: entrance.y + 1, kind: 'exit', claimed: false });
    this.resolveTransitionsAndCollisions(cave);
    cave.get(entrance.x, entrance.y + 1).object = ObjectKind.CaveExit;
    cave.get(entrance.x, entrance.y + 1).collision = false;
    return cave;
  }

  private carveCaveRoom(cave: WorldMap, cx: number, cy: number, rx: number, ry: number): void {
    for (let y = Math.max(1, cy - ry - 1); y <= Math.min(cave.height - 2, cy + ry + 1); y++) {
      for (let x = Math.max(1, cx - rx - 1); x <= Math.min(cave.width - 2, cx + rx + 1); x++) {
        const ellipse = ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry);
        if (ellipse <= 1.08) {
          cave.set(x, y, {
            terrain: TerrainKind.CaveFloor,
            object: ObjectKind.None,
            collision: false,
            elevation: 0.32,
            moisture: 0.58,
          });
        }
      }
    }
  }

  private carveCaveTunnel(cave: WorldMap, from: { x: number; y: number }, to: { x: number; y: number }, rng: Random): void {
    const mid = rng.chance(0.5) ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
    const points = [from, mid, to];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const x = Math.round(lerp(a.x, b.x, t));
        const y = Math.round(lerp(a.y, b.y, t));
        for (let yy = y - 1; yy <= y + 1; yy++) {
          for (let xx = x - 1; xx <= x + 1; xx++) {
            if (!cave.inBounds(xx, yy)) continue;
            cave.set(xx, yy, {
              terrain: TerrainKind.CaveFloor,
              object: ObjectKind.None,
              collision: false,
              elevation: 0.34,
              moisture: 0.55,
            });
          }
        }
      }
    }
  }

  private makeCaveFeature(caveId: number, featureId: number, x: number, y: number, rng: Random, kind: CaveFeature['kind']): CaveFeature {
    const id = `cave-${caveId}-${featureId}`;
    if (kind === 'treasure') {
      const lootIds = ['spirit-stone', 'spirit-jade', 'iron-ore', 'blood-pill', 'qi-pill', 'guard-talisman', 'jade-pendant', 'moon-sword', 'cold-moon-manual'];
      const loot = [
        createItem('spirit-stone', rng.int(8, 28)),
        createItem(rng.pick(lootIds.slice(1)), 1),
        ...(rng.chance(0.34) ? [createItem(rng.pick(lootIds.slice(3)), 1)] : []),
      ];
      return { id, x, y, kind: 'treasure', claimed: false, loot };
    }
    if (kind === 'herb') {
      return {
        id,
        x,
        y,
        kind: 'herb',
        claimed: false,
        loot: [createItem(rng.chance(0.5) ? 'moss-flower' : 'spirit-herb', rng.int(1, 3)), createItem('yellow-root', rng.int(0, 2))].filter((item) => item.quantity > 0),
      };
    }
    const name = rng.pick(['洞穴妖蝠', '石肤山魈', '阴藤精', '伏岩灵狼']);
    const spriteId: BeastSpawn['spriteId'] = name.includes('狼') ? 'beast_wolf' : name.includes('魈') ? 'beast_boar' : 'beast_spirit';
    return {
      id,
      x,
      y,
      kind: 'beast',
      claimed: false,
      beast: {
        id: `${id}-beast`,
        name,
        x,
        y,
        level: rng.int(2, 7),
        temperament: rng.weighted([
          { value: 'territorial' as const, weight: 4 },
          { value: 'aggressive' as const, weight: 3 },
          { value: 'passive' as const, weight: 1 },
        ]),
        radius: rng.range(3, 5),
        spriteId,
      },
    };
  }

  private generateTeleportNodes(map: WorldMap): void {
    for (const settlement of map.settlements) {
      if (settlement.kind === 'house') continue;
      const gate = settlement.gate ?? this.computeSettlementGate(map, settlement);
      const side = normalize({ x: gate.ny, y: -gate.nx });
      const inn = map.inns.find((entry) => Math.hypot(entry.x - settlement.x, entry.y - settlement.y) < settlement.radius + 6);
      const awayFromInn = inn ? normalize({ x: settlement.x - inn.x, y: settlement.y - inn.y }) : null;
      const candidates = [
        ...(awayFromInn
          ? [
              { x: Math.round(settlement.x + awayFromInn.x * Math.max(7, settlement.radius * 0.68)), y: Math.round(settlement.y + awayFromInn.y * Math.max(7, settlement.radius * 0.68)) },
              { x: Math.round(settlement.x + awayFromInn.x * Math.max(6, settlement.radius * 0.58) + gate.nx * 3), y: Math.round(settlement.y + awayFromInn.y * Math.max(6, settlement.radius * 0.58) + gate.ny * 3) },
            ]
          : []),
        { x: Math.round(settlement.x + side.x * Math.max(5, settlement.radius * 0.62)), y: Math.round(settlement.y + side.y * Math.max(5, settlement.radius * 0.62)) },
        { x: Math.round(settlement.x + side.x * Math.max(4, settlement.radius * 0.48) + gate.nx * 3), y: Math.round(settlement.y + side.y * Math.max(4, settlement.radius * 0.48) + gate.ny * 3) },
        { x: Math.round(settlement.x + gate.nx * Math.max(4, settlement.radius * 0.42)), y: Math.round(settlement.y + gate.ny * Math.max(4, settlement.radius * 0.42)) },
      ];
      const picked = candidates.find((point) => map.inBounds(point.x, point.y) && !map.inns.some((entry) => Math.hypot(entry.x - point.x, entry.y - point.y) < 12));
      if (!picked) continue;
      const { x, y } = picked;
      const cell = map.get(x, y);
      cell.terrain = TerrainKind.Town;
      cell.object = ObjectKind.TeleportArray;
      cell.collision = false;
      map.teleportNodes.push({
        id: map.teleportNodes.length,
        settlementId: settlement.id,
        kind: 'settlement',
        name: settlement.name,
        x,
        y,
        unlocked: false,
      });
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (!map.inBounds(xx, yy)) continue;
          const floor = map.get(xx, yy);
          if (floor.object === ObjectKind.None) floor.terrain = TerrainKind.Town;
        }
      }
    }
    for (const sect of map.sects) {
      const { x, y } = sect.teleport;
      if (!map.inBounds(x, y)) continue;
      const cell = map.get(x, y);
      cell.terrain = TerrainKind.SectGround;
      cell.object = ObjectKind.TeleportArray;
      cell.collision = false;
      map.teleportNodes.push({
        id: map.teleportNodes.length,
        settlementId: -1,
        sectId: sect.id,
        kind: 'sect',
        name: sect.name,
        x,
        y,
        unlocked: false,
      });
    }
  }

  private generateBeasts(map: WorldMap, rng: Random): void {
    const desired = 28;
    const candidates: { x: number; y: number; score: number }[] = [];
    for (let y = 8; y < map.height - 8; y += 2) {
      for (let x = 8; x < map.width - 8; x += 2) {
        const cell = map.get(x, y);
        if (cell.terrain !== TerrainKind.Grass && cell.terrain !== TerrainKind.Meadow && cell.terrain !== TerrainKind.Forest) continue;
        if (cell.object !== ObjectKind.None || cell.road > 0.08) continue;
        if (this.hasNearbyTerrain(map, x, y, 9, TerrainKind.Road, TerrainKind.Bridge, TerrainKind.Town)) continue;
        if (this.hasNearbyTerrain(map, x, y, 4, TerrainKind.Water, TerrainKind.Shore)) continue;
        if (map.settlements.some((settlement) => distance(settlement, { x, y }) < settlement.radius + 18)) continue;
        const nearbyTrees = this.countNearbyTrees(map, x, y, 4);
        if (nearbyTrees < 3 || this.countNearbyBeasts(map, x, y, 18) > 0) continue;
        candidates.push({ x, y, score: nearbyTrees + cell.forest * 3 + rng.range(0, 1.5) });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    for (const candidate of candidates) {
      if (map.beasts.length >= desired) break;
      if (this.countNearbyBeasts(map, candidate.x, candidate.y, 22) > 0) continue;
      const name = rng.pick(beastNames);
      const spriteId: BeastSpawn['spriteId'] = name.includes('狼') ? 'beast_wolf' : name.includes('豕') || name.includes('魈') ? 'beast_boar' : 'beast_spirit';
      map.beasts.push({
        id: `beast-${map.beasts.length}`,
        name,
        x: candidate.x,
        y: candidate.y,
        level: rng.int(1, 5),
        temperament: rng.weighted([
          { value: 'passive' as const, weight: 2 },
          { value: 'territorial' as const, weight: 5 },
          { value: 'aggressive' as const, weight: 1 },
        ]),
        radius: rng.range(3.5, 6),
        spriteId,
      });
    }
  }

  private countNearbyTrees(map: WorldMap, x: number, y: number, radius: number): number {
    let count = 0;
    for (let yy = y - radius; yy <= y + radius; yy++) {
      for (let xx = x - radius; xx <= x + radius; xx++) {
        if (!map.inBounds(xx, yy) || Math.hypot(xx - x, yy - y) > radius) continue;
        const object = map.get(xx, yy).object;
        if (object === ObjectKind.TreeOak || object === ObjectKind.TreePine) count++;
      }
    }
    return count;
  }

  private countNearbyBeasts(map: WorldMap, x: number, y: number, radius: number): number {
    return map.beasts.filter((beast) => Math.hypot(beast.x - x, beast.y - y) <= radius).length;
  }

  private hasNearbyTerrain(map: WorldMap, x: number, y: number, radius: number, ...terrains: TerrainKind[]): boolean {
    for (let yy = y - radius; yy <= y + radius; yy++) {
      for (let xx = x - radius; xx <= x + radius; xx++) {
        if (!map.inBounds(xx, yy) || Math.hypot(xx - x, yy - y) > radius) continue;
        if (terrains.includes(map.get(xx, yy).terrain)) return true;
      }
    }
    return false;
  }

  private generateHiddenAreas(map: WorldMap, rng: Random): void {
    for (let i = 0; i < 16; i++) {
      let best: InterestPoint | null = null;
      for (let attempts = 0; attempts < 140; attempts++) {
        const x = rng.int(25, map.width - 26);
        const y = rng.int(25, map.height - 26);
        const cell = map.get(x, y);
        if (cell.object !== ObjectKind.None) continue;
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Town || cell.collision) continue;
        const roadDistance = this.distanceToRoad(map, x, y);
        const settlementDistance = Math.min(...map.settlements.map((s) => distance(s, { x, y })));
        const score = roadDistance * 0.03 + settlementDistance * 0.012 + (cell.terrain === TerrainKind.Forest ? 1.6 : 0) + (cell.terrain === TerrainKind.Mountain ? 1.4 : 0);
        if (!best || score > (best as InterestPoint & { score?: number }).score!) {
          best = {
            id: i,
            name: interestNames[i % interestNames.length],
            kind: cell.terrain === TerrainKind.Mountain ? 'cave' : cell.terrain === TerrainKind.Forest ? 'herb' : rng.pick(['shrine', 'hidden'] as const),
            x,
            y,
            discovered: false,
          } as InterestPoint & { score: number };
          (best as InterestPoint & { score: number }).score = score;
        }
      }
      if (best) {
        map.interestPoints.push(best);
        if (map.inBounds(best.x, best.y) && map.get(best.x, best.y).object === ObjectKind.None) map.get(best.x, best.y).object = ObjectKind.HiddenCache;
      }
    }
  }

  private resolveTransitionsAndCollisions(map: WorldMap): void {
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Water || cell.terrain === TerrainKind.Mountain || cell.terrain === TerrainKind.CaveWall) {
          cell.collision = true;
        } else {
          cell.collision = false;
        }
        if (cell.terrain === TerrainKind.Bridge || cell.terrain === TerrainKind.Road || cell.terrain === TerrainKind.Town || cell.terrain === TerrainKind.Hill || cell.terrain === TerrainKind.CaveFloor || cell.terrain === TerrainKind.SectGround) {
          cell.collision = false;
        }
        if (
          cell.object === ObjectKind.TreeOak ||
          cell.object === ObjectKind.TreePine ||
          cell.object === ObjectKind.HouseWall ||
          cell.object === ObjectKind.HouseRoof ||
          cell.object === ObjectKind.HouseDoor ||
          cell.object === ObjectKind.HouseWindow ||
          cell.object === ObjectKind.HouseEave ||
          cell.object === ObjectKind.Inn ||
          cell.object === ObjectKind.Fence ||
          cell.object === ObjectKind.FenceHorizontal ||
          cell.object === ObjectKind.FenceVertical ||
          cell.object === ObjectKind.FencePost ||
          cell.object === ObjectKind.GatePost ||
          cell.object === ObjectKind.SectHall ||
          cell.object === ObjectKind.SectPillar
        ) {
          cell.collision = true;
        }
        if (
          cell.object === ObjectKind.CaveEntrance ||
          cell.object === ObjectKind.CaveExit ||
          cell.object === ObjectKind.TreasureChest ||
          cell.object === ObjectKind.HerbPatch ||
          cell.object === ObjectKind.TeleportArray ||
          cell.object === ObjectKind.SectShop ||
          cell.object === ObjectKind.SpiritPool ||
          cell.object === ObjectKind.TaskBoard
        ) {
          cell.collision = false;
        }
      }
    }

    for (let y = 1; y < map.height - 1; y++) {
      for (let x = 1; x < map.width - 1; x++) {
        const cell = map.get(x, y);
        if (cell.terrain === TerrainKind.Grass || cell.terrain === TerrainKind.Meadow || cell.terrain === TerrainKind.Forest) {
          let nearWater = false;
          for (let yy = y - 1; yy <= y + 1; yy++) {
            for (let xx = x - 1; xx <= x + 1; xx++) {
              if (map.get(xx, yy).terrain === TerrainKind.Water) nearWater = true;
            }
          }
          const insideSettlement = map.settlements.some((settlement) => Math.hypot(x - settlement.x, y - settlement.y) < settlement.radius * 0.98);
          const insideSect = map.sects.some((sect) => Math.hypot(x - sect.x, y - sect.y) < sect.radius * 0.98);
          if (nearWater && !insideSettlement && !insideSect && cell.object === ObjectKind.None) cell.terrain = TerrainKind.Shore;
        }
      }
    }

    for (let cy = 0; cy < map.chunksY; cy++) {
      for (let cx = 0; cx < map.chunksX; cx++) {
        const region = cy * map.chunksX + cx;
        const startX = cx * CHUNK_SIZE;
        const startY = cy * CHUNK_SIZE;
        for (let y = startY; y < Math.min(map.height, startY + CHUNK_SIZE); y++) {
          for (let x = startX; x < Math.min(map.width, startX + CHUNK_SIZE); x++) {
            map.get(x, y).regionId = region;
          }
        }
      }
    }
  }

  private chooseSpawn(map: WorldMap): void {
    const settlement = map.settlements[0];
    if (settlement) {
      const baseX = Math.round(settlement.x);
      const baseY = Math.round(settlement.y);
      for (let radius = 1; radius < 18; radius++) {
        for (let y = baseY - radius; y <= baseY + radius; y++) {
          for (let x = baseX - radius; x <= baseX + radius; x++) {
            if (Math.abs(x - baseX) !== radius && Math.abs(y - baseY) !== radius) continue;
            if (map.inBounds(x, y) && !map.isBlockedTile(x, y)) {
              map.spawn = { x, y };
              return;
            }
          }
        }
      }
      map.spawn = { x: baseX, y: baseY };
      return;
    }
    map.spawn = { x: 250, y: 250 };
  }
}
