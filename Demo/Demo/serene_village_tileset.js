/**
 * Serene Village Tileset Metadata
 * Based on: Serene_Village_48x48.png
 * Tile Size: 48x48
 */

export const TILE_SIZE = 48;

export const Tileset = {
  image: "Serene_Village_48x48.png",

  categories: {

    // =========================
    // 地形 Terrain
    // =========================
    terrain: {
      grass: [
        { x: 0, y: 0, type: "grass_plain" },
        { x: 1, y: 0, type: "grass_path" },
        { x: 2, y: 0, type: "grass_corner" },
      ],

      path: [
        { x: 1, y: 0, walkable: true },
        { x: 2, y: 0, walkable: true },
      ],

      water: [
        { x: 3, y: 0, collision: true },
        { x: 4, y: 0, collision: true },
      ],

      bridge: [
        { x: 5, y: 0, walkable: true },
      ],

      cliff: [
        { x: 0, y: 1, collision: true },
      ]
    },

    // =========================
    // 树木 Trees
    // =========================
    trees: {
      green: [
        { x: 6, y: 2, collision: true },
        { x: 7, y: 2, collision: true },
      ],

      blue: [
        { x: 8, y: 2, collision: true },
        { x: 9, y: 2, collision: true },
      ],

      forest_row: [
        { x: 6, y: 1, collision: true },
      ]
    },

    // =========================
    // 石头 Rocks
    // =========================
    rocks: {
      small: [
        { x: 0, y: 4, collision: true },
        { x: 1, y: 4, collision: true },
      ],

      medium: [
        { x: 0, y: 5, collision: true },
      ],

      large: [
        { x: 0, y: 6, collision: true },
      ]
    },

    // =========================
    // 花草 Flowers
    // =========================
    flora: {
      flowers: [
        { x: 10, y: 5 },
        { x: 11, y: 5 },
      ],

      bushes: [
        { x: 2, y: 3, collision: true },
      ],

      crops: [
        { x: 3, y: 5 },
      ]
    },

    // =========================
    // 栅栏 Fence
    // =========================
    fence: {
      horizontal: [
        { x: 2, y: 4, collision: true },
      ],

      vertical: [
        { x: 3, y: 4, collision: true },
      ],

      gate: [
        { x: 4, y: 4, collision: false },
      ]
    },

    // =========================
    // 房屋 Houses
    // =========================
    houses: {

      red_roof: [
        {
          x: 0,
          y: 7,
          width: 2,
          height: 2,
          type: "house_red_small",
          collision: true,
          entrance: { x: 0, y: 1 }
        },

        {
          x: 2,
          y: 7,
          width: 3,
          height: 2,
          type: "house_red_large",
          collision: true,
          entrance: { x: 1, y: 1 }
        }
      ],

      green_roof: [
        {
          x: 0,
          y: 9,
          width: 2,
          height: 2,
          type: "house_green_small",
          collision: true
        }
      ],

      blue_roof: [
        {
          x: 0,
          y: 11,
          width: 2,
          height: 2,
          type: "house_blue_small",
          collision: true
        }
      ]
    },

    // =========================
    // 道具 Props
    // =========================
    props: {

      signs: [
        { x: 5, y: 4, interaction: true },
      ],

      mailbox: [
        { x: 6, y: 4, interaction: true },
      ],

      crates: [
        { x: 4, y: 5, collision: true },
      ]
    }
  }
};

/**
 * AI 使用说明：
 *
 * grass:
 *   可自由生成地图
 *
 * path:
 *   用于寻路主路
 *
 * water:
 *   不可行走
 *
 * bridge:
 *   可跨越水域
 *
 * trees / rocks / houses:
 *   属于障碍物
 *
 * flora:
 *   装饰物
 *
 * props:
 *   可交互对象
 *
 * houses:
 *   entrance 为门的位置
 */