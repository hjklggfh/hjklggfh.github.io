import type { Player } from '../entities/Player';
import type { Inventory } from '../inventory/Inventory';
import type { NPC } from '../entities/NPC';
import type { WorldAtmosphere } from '../world/WorldAtmosphere';
import { WORLD_GENERATION_VERSION } from '../world/constants';
import type { SectMembership, SectTaskState } from '../sect/SectTypes';

export interface SaveData {
  version: 1;
  generationVersion: number;
  seed: string;
  activeMap?: 'world' | 'cave';
  activeCaveId?: number | null;
  returnFromCave?: { x: number; y: number } | null;
  player: {
    x: number;
    y: number;
    stats: Player['stats'];
    equipment: Player['equipment'];
    learnedArts: string[];
    sectMembership?: SectMembership | null;
  };
  inventory: Inventory['items'];
  atmosphere: {
    timeOfDay: number;
    weather: WorldAtmosphere['weather'];
  };
  npcs: {
    id: string;
    x: number;
    y: number;
    favor: number;
  }[];
  discoveredTiles?: number[];
  markets?: {
    settlementId: number;
    stock: Record<string, number>;
  }[];
  unlockedTeleportIds?: number[];
  claimedCaveFeatureIds?: string[];
  sectTasks?: SectTaskState[];
  activeSectTaskId?: string | null;
  completedSectTaskIds?: string[];
  lastAutosaveAt?: number;
}

const KEY = 'xiuxian-open-world-save-v1';

export class SaveSystem {
  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (data.version !== 1) return null;
      if (data.generationVersion !== WORLD_GENERATION_VERSION) {
        this.clear();
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  save(
    seed: string,
    player: Player,
    inventory: Inventory,
    atmosphere: WorldAtmosphere,
    npcs: NPC[],
    world?: import('../world/WorldMap').WorldMap,
    options: {
      activeMap?: 'world' | 'cave';
      activeCaveId?: number | null;
      returnFromCave?: { x: number; y: number } | null;
      sectTasks?: SectTaskState[];
      activeSectTaskId?: string | null;
      completedSectTaskIds?: string[];
    } = {},
  ): void {
    const claimedCaveFeatureIds = world
      ? world.caves.flatMap((cave) => cave.map.caveFeatures.filter((feature) => feature.claimed).map((feature) => feature.id))
      : undefined;
    const data: SaveData = {
      version: 1,
      generationVersion: WORLD_GENERATION_VERSION,
      seed,
      activeMap: options.activeMap ?? 'world',
      activeCaveId: options.activeCaveId ?? null,
      returnFromCave: options.returnFromCave ?? null,
      player: {
        x: player.position.x,
        y: player.position.y,
        stats: player.stats,
        equipment: player.equipment,
        learnedArts: player.learnedArts,
        sectMembership: player.sectMembership,
      },
      inventory: inventory.items,
      atmosphere: {
        timeOfDay: atmosphere.timeOfDay,
        weather: atmosphere.weather,
      },
      npcs: npcs.map((npc) => ({
        id: npc.id,
        x: npc.position.x,
        y: npc.position.y,
        favor: npc.profile.favor,
      })),
      discoveredTiles: world
        ? world.cells.reduce<number[]>((acc, cell, index) => {
            if (cell.discovered) acc.push(index);
            return acc;
          }, [])
        : undefined,
      markets: world
        ? world.settlements.map((settlement) => ({
            settlementId: settlement.id,
            stock: Object.fromEntries(settlement.marketInventory.map((item) => [item.itemId, item.stock])),
          }))
        : undefined,
      unlockedTeleportIds: world ? world.teleportNodes.filter((node) => node.unlocked).map((node) => node.id) : undefined,
      claimedCaveFeatureIds,
      sectTasks: options.sectTasks ?? [],
      activeSectTaskId: options.activeSectTaskId ?? null,
      completedSectTaskIds: options.completedSectTaskIds ?? [],
      lastAutosaveAt: Date.now(),
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  clear(): void {
    localStorage.removeItem(KEY);
  }
}
