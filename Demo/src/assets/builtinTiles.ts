import type { TileDefinition, TileRegistry } from '../world/tiles';

export type BuiltinSpriteId =
  | 'grass_a'
  | 'grass_b'
  | 'grass_flower'
  | 'grass_dark'
  | 'water_a'
  | 'water_b'
  | 'sand'
  | 'road'
  | 'road_edge'
  | 'forest_floor'
  | 'hill'
  | 'cave_floor'
  | 'cave_wall'
  | 'tree_oak'
  | 'tree_pine'
  | 'mountain'
  | 'mountain_snow'
  | 'cliff'
  | 'bridge'
  | 'bridge_h'
  | 'bridge_v'
  | 'house_wall'
  | 'house_roof'
  | 'house_door'
  | 'house_window'
  | 'house_eave'
  | 'fence'
  | 'fence_h'
  | 'fence_v'
  | 'fence_post'
  | 'gate_post'
  | 'market_stall'
  | 'market_sign'
  | 'inn'
  | 'cave_entrance'
  | 'treasure_chest'
  | 'herb_patch'
  | 'teleport_array'
  | 'cave_exit'
  | 'sect_ground'
  | 'sect_hall'
  | 'sect_pillar'
  | 'sect_shop'
  | 'spirit_pool'
  | 'task_board'
  | 'lantern'
  | 'mist'
  | 'player'
  | 'player_down_0'
  | 'player_down_1'
  | 'player_down_2'
  | 'player_up_0'
  | 'player_up_1'
  | 'player_up_2'
  | 'player_left_0'
  | 'player_left_1'
  | 'player_left_2'
  | 'player_right_0'
  | 'player_right_1'
  | 'player_right_2'
  | 'npc_robed'
  | 'npc_trader'
  | 'npc_guard'
  | 'beast_wolf'
  | 'beast_spirit'
  | 'beast_boar';

export const BUILTIN_TILE_SIZE = 32;

interface PixelPaintOptions {
  base: string;
  dark?: string;
  light?: string;
  accent?: string;
  kind: BuiltinSpriteId;
}

function setupCanvas(tileSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = tileSize;
  canvas.height = tileSize;
  return canvas;
}

function fillNoise(ctx: CanvasRenderingContext2D, tileSize: number, colors: string[], density: number, seed: number): void {
  let state = seed >>> 0;
  const rnd = () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    return ((state ^= state >>> 16) >>> 0) / 4294967296;
  };
  for (let i = 0; i < tileSize * density; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const x = Math.floor(rnd() * tileSize);
    const y = Math.floor(rnd() * tileSize);
    const w = 1 + Math.floor(rnd() * 3);
    const h = 1 + Math.floor(rnd() * 2);
    ctx.fillRect(x, y, w, h);
  }
}

function drawSprite(options: PixelPaintOptions, tileSize = BUILTIN_TILE_SIZE): HTMLCanvasElement {
  const canvas = setupCanvas(tileSize);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas2D is unavailable.');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = options.base;
  ctx.fillRect(0, 0, tileSize, tileSize);

  switch (options.kind) {
    case 'grass_a':
    case 'grass_b':
    case 'grass_dark':
    case 'grass_flower':
      fillNoise(
        ctx,
        tileSize,
        [options.dark ?? '#557c3d', options.light ?? '#8fb868', options.accent ?? '#bedb87'],
        options.kind === 'grass_flower' ? 23 : 18,
        options.kind.charCodeAt(6) * 977,
      );
      if (options.kind === 'grass_flower') {
        ctx.fillStyle = '#f1d981';
        for (let i = 0; i < 8; i++) ctx.fillRect((i * 9 + 5) % 30, (i * 13 + 8) % 28, 2, 2);
        ctx.fillStyle = '#e8a2ad';
        for (let i = 0; i < 5; i++) ctx.fillRect((i * 11 + 10) % 30, (i * 7 + 13) % 28, 2, 2);
      }
      break;
    case 'forest_floor':
      fillNoise(ctx, tileSize, ['#567a43', '#6c914f', '#405f34', '#7b6a3b'], 18, 4237);
      break;
    case 'hill':
      ctx.fillStyle = '#789d55';
      ctx.fillRect(0, 0, tileSize, tileSize);
      fillNoise(ctx, tileSize, ['#88b869', '#5f7f44', '#a6c579'], 16, 6421);
      ctx.fillStyle = 'rgba(65,85,45,0.28)';
      ctx.beginPath();
      ctx.ellipse(16, 18, 13, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,236,160,0.32)';
      ctx.fillRect(8, 12, 13, 2);
      break;
    case 'cave_floor':
      ctx.fillStyle = '#746b55';
      ctx.fillRect(0, 0, tileSize, tileSize);
      fillNoise(ctx, tileSize, ['#8a8064', '#5f5746', '#a4946a', '#6e654f'], 22, 9753);
      ctx.fillStyle = 'rgba(218,198,132,0.22)';
      ctx.fillRect(5, 10, 18, 2);
      ctx.fillRect(12, 21, 12, 2);
      break;
    case 'cave_wall':
      ctx.fillStyle = '#181a18';
      ctx.fillRect(0, 0, tileSize, tileSize);
      fillNoise(ctx, tileSize, ['#2a2d27', '#0e100e', '#3a372b'], 30, 11871);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(0, 22, 32, 10);
      ctx.fillStyle = '#3f4035';
      ctx.fillRect(3, 5, 10, 2);
      ctx.fillRect(16, 13, 12, 2);
      break;
    case 'water_a':
    case 'water_b':
      ctx.fillStyle = options.base;
      ctx.fillRect(0, 0, tileSize, tileSize);
      ctx.strokeStyle = options.light ?? '#6faed0';
      ctx.lineWidth = 2;
      for (let y = options.kind === 'water_a' ? 6 : 12; y < tileSize; y += 11) {
        ctx.beginPath();
        ctx.moveTo(2, y);
        ctx.quadraticCurveTo(8, y - 3, 15, y);
        ctx.quadraticCurveTo(22, y + 3, 30, y);
        ctx.stroke();
      }
      break;
    case 'sand':
      fillNoise(ctx, tileSize, ['#c9b36a', '#e0d087', '#aa9451'], 16, 9821);
      break;
    case 'road':
    case 'road_edge':
      fillNoise(ctx, tileSize, ['#7f6a47', '#a08355', '#5b4b36'], 24, 1973);
      if (options.kind === 'road_edge') {
        ctx.fillStyle = '#526f3d';
        ctx.fillRect(0, 0, 3, tileSize);
        ctx.fillRect(tileSize - 3, 0, 3, tileSize);
      }
      break;
    case 'mountain':
    case 'mountain_snow':
    case 'cliff':
      ctx.fillStyle = '#59604f';
      ctx.beginPath();
      ctx.moveTo(0, 31);
      ctx.lineTo(8, 11);
      ctx.lineTo(14, 16);
      ctx.lineTo(22, 4);
      ctx.lineTo(32, 31);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3e453d';
      ctx.beginPath();
      ctx.moveTo(8, 11);
      ctx.lineTo(14, 16);
      ctx.lineTo(12, 31);
      ctx.lineTo(0, 31);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = options.kind === 'mountain_snow' ? '#d9e0d8' : '#78806b';
      ctx.fillRect(20, 7, 4, 4);
      ctx.fillRect(7, 13, 3, 3);
      break;
    case 'tree_oak':
    case 'tree_pine':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = 'rgba(0,0,0,0.24)';
      ctx.fillRect(7, 24, 20, 4);
      ctx.fillStyle = '#4b2f1d';
      ctx.fillRect(13, 17, 7, 13);
      ctx.fillStyle = '#8a6339';
      ctx.fillRect(15, 18, 2, 10);
      if (options.kind === 'tree_oak') {
        ctx.fillStyle = '#15351d';
        ctx.fillRect(7, 10, 19, 12);
        ctx.fillRect(10, 4, 13, 22);
        ctx.fillStyle = '#2f6d36';
        ctx.fillRect(9, 6, 13, 5);
        ctx.fillRect(6, 14, 9, 5);
        ctx.fillStyle = '#0f2416';
        ctx.fillRect(10, 21, 14, 4);
      } else {
        ctx.fillStyle = '#10291d';
        ctx.beginPath();
        ctx.moveTo(16, 3);
        ctx.lineTo(5, 20);
        ctx.lineTo(27, 20);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2f6f3d';
        ctx.beginPath();
        ctx.moveTo(16, 8);
        ctx.lineTo(8, 25);
        ctx.lineTo(25, 25);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#0d1e16';
        ctx.fillRect(9, 22, 15, 3);
      }
      break;
    case 'bridge':
    case 'bridge_h':
    case 'bridge_v':
      ctx.fillStyle = '#2e7da6';
      ctx.fillRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#6f4a27';
      if (options.kind === 'bridge_v') {
        ctx.fillRect(8, 0, 16, tileSize);
        ctx.fillStyle = '#9b6b36';
        for (let y = 0; y < tileSize; y += 8) ctx.fillRect(9, y + 1, 14, 6);
        ctx.fillStyle = '#3f2918';
        for (let y = 7; y < tileSize; y += 8) ctx.fillRect(9, y, 14, 1);
        ctx.fillRect(7, 0, 2, tileSize);
        ctx.fillRect(23, 0, 2, tileSize);
        ctx.fillStyle = '#c08a49';
        for (let y = 2; y < tileSize; y += 8) ctx.fillRect(11, y, 3, 2);
      } else {
        ctx.fillRect(0, 8, tileSize, 16);
        ctx.fillStyle = '#9b6b36';
        for (let x = 0; x < tileSize; x += 8) ctx.fillRect(x + 1, 9, 6, 14);
        ctx.fillStyle = '#3f2918';
        for (let x = 7; x < tileSize; x += 8) ctx.fillRect(x, 9, 1, 14);
        ctx.fillRect(0, 7, tileSize, 2);
        ctx.fillRect(0, 23, tileSize, 2);
        ctx.fillStyle = '#c08a49';
        for (let x = 2; x < tileSize; x += 8) ctx.fillRect(x, 11, 2, 3);
      }
      break;
    case 'house_wall':
      ctx.fillStyle = '#b8915e';
      ctx.fillRect(2, 7, 28, 23);
      ctx.fillStyle = '#775134';
      ctx.fillRect(13, 18, 7, 12);
      ctx.fillStyle = '#ded0a3';
      ctx.fillRect(5, 12, 7, 6);
      ctx.fillRect(21, 12, 6, 6);
      break;
    case 'house_roof':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#6d2b2b';
      ctx.beginPath();
      ctx.moveTo(1, 17);
      ctx.lineTo(16, 2);
      ctx.lineTo(31, 17);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#983f35';
      ctx.fillRect(4, 15, 24, 6);
      break;
    case 'house_door':
      ctx.fillStyle = '#b8915e';
      ctx.fillRect(2, 4, 28, 26);
      ctx.fillStyle = '#8a6843';
      ctx.fillRect(0, 2, 32, 5);
      ctx.fillStyle = '#5f3b25';
      ctx.fillRect(11, 13, 10, 17);
      ctx.fillStyle = '#d4b76a';
      ctx.fillRect(18, 21, 2, 2);
      ctx.fillStyle = '#6f4a2d';
      ctx.fillRect(10, 12, 12, 2);
      break;
    case 'house_window':
      ctx.fillStyle = '#b8915e';
      ctx.fillRect(2, 4, 28, 26);
      ctx.fillStyle = '#8a6843';
      ctx.fillRect(0, 2, 32, 5);
      ctx.fillStyle = '#483828';
      ctx.fillRect(8, 12, 16, 11);
      ctx.fillStyle = '#e8d995';
      ctx.fillRect(10, 14, 5, 7);
      ctx.fillRect(17, 14, 5, 7);
      ctx.fillStyle = '#6e4a2c';
      ctx.fillRect(15, 13, 2, 10);
      break;
    case 'house_eave':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#5a2322';
      ctx.fillRect(0, 7, 32, 7);
      ctx.fillStyle = '#8f3a31';
      ctx.fillRect(2, 3, 28, 7);
      ctx.fillStyle = '#3e2921';
      ctx.fillRect(0, 14, 32, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(2, 17, 28, 4);
      break;
    case 'fence':
    case 'fence_h':
    case 'fence_v':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#5d3c22';
      if (options.kind === 'fence_v') {
        ctx.fillRect(14, 0, 4, tileSize);
        for (let y = 2; y < tileSize; y += 10) ctx.fillRect(8, y, 16, 4);
        ctx.fillStyle = '#9a7040';
        for (let y = 3; y < tileSize; y += 10) ctx.fillRect(8, y, 4, 2);
      } else {
        ctx.fillRect(0, 14, tileSize, 4);
        for (let x = 2; x < tileSize; x += 10) ctx.fillRect(x, 8, 4, 16);
        ctx.fillStyle = '#9a7040';
        for (let x = 3; x < tileSize; x += 10) ctx.fillRect(x, 8, 2, 4);
      }
      break;
    case 'fence_post':
    case 'gate_post':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#4d321f';
      ctx.fillRect(11, 7, 10, 22);
      ctx.fillStyle = '#8d6237';
      ctx.fillRect(13, 5, 6, 5);
      if (options.kind === 'gate_post') {
        ctx.fillStyle = '#d8b95f';
        ctx.fillRect(14, 12, 4, 4);
      }
      break;
    case 'market_stall':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#6d3c2d';
      ctx.fillRect(5, 15, 22, 13);
      ctx.fillStyle = '#d5be73';
      ctx.fillRect(7, 18, 18, 4);
      ctx.fillStyle = '#9c3131';
      ctx.fillRect(3, 8, 26, 7);
      ctx.fillStyle = '#f0d886';
      for (let x = 5; x < 29; x += 8) ctx.fillRect(x, 8, 4, 7);
      break;
    case 'market_sign':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#5a3a23';
      ctx.fillRect(15, 10, 3, 18);
      ctx.fillStyle = '#d2b56b';
      ctx.fillRect(7, 6, 18, 10);
      ctx.fillStyle = '#6d3c2d';
      ctx.fillRect(10, 9, 12, 2);
      break;
    case 'inn':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#5f2d24';
      ctx.fillRect(3, 8, 26, 7);
      ctx.fillStyle = '#8e3f31';
      ctx.fillRect(5, 5, 22, 6);
      ctx.fillStyle = '#b88a55';
      ctx.fillRect(5, 15, 22, 14);
      ctx.fillStyle = '#6b4429';
      ctx.fillRect(12, 19, 8, 10);
      ctx.fillStyle = '#e0c06e';
      ctx.fillRect(21, 17, 6, 5);
      ctx.fillStyle = '#4e3320';
      ctx.fillRect(3, 28, 26, 2);
      ctx.fillStyle = '#d9b95f';
      ctx.fillRect(6, 13, 8, 4);
      ctx.fillStyle = '#704021';
      ctx.fillRect(8, 15, 4, 1);
      break;
    case 'cave_entrance':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#3c4038';
      ctx.beginPath();
      ctx.moveTo(2, 29);
      ctx.lineTo(8, 9);
      ctx.lineTo(16, 3);
      ctx.lineTo(25, 9);
      ctx.lineTo(31, 29);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#10130f';
      ctx.beginPath();
      ctx.ellipse(16, 21, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#646a57';
      ctx.fillRect(8, 10, 5, 3);
      ctx.fillRect(21, 13, 4, 2);
      break;
    case 'treasure_chest':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#4d2f1d';
      ctx.fillRect(7, 15, 18, 11);
      ctx.fillStyle = '#9c6330';
      ctx.fillRect(6, 11, 20, 7);
      ctx.fillStyle = '#d6b35a';
      ctx.fillRect(15, 15, 3, 6);
      ctx.fillRect(7, 18, 18, 2);
      break;
    case 'herb_patch':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#285a35';
      ctx.fillRect(9, 20, 3, 7);
      ctx.fillRect(15, 16, 3, 11);
      ctx.fillRect(21, 19, 3, 8);
      ctx.fillStyle = '#80c66b';
      ctx.fillRect(7, 17, 6, 4);
      ctx.fillRect(13, 13, 7, 4);
      ctx.fillRect(20, 16, 6, 4);
      ctx.fillStyle = '#d8e98b';
      ctx.fillRect(16, 11, 2, 2);
      break;
    case 'teleport_array':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.strokeStyle = '#d5c16f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(16, 17, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, 7);
      ctx.lineTo(25, 22);
      ctx.lineTo(7, 22);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(119,177,145,0.55)';
      ctx.fillRect(14, 15, 4, 4);
      break;
    case 'cave_exit':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#1f241e';
      ctx.fillRect(6, 8, 20, 18);
      ctx.fillStyle = '#d4c685';
      ctx.fillRect(11, 13, 10, 3);
      ctx.fillRect(14, 10, 4, 12);
      break;
    case 'sect_ground':
      ctx.fillStyle = '#7f8f6a';
      ctx.fillRect(0, 0, tileSize, tileSize);
      fillNoise(ctx, tileSize, ['#93a67a', '#647a54', '#b6b783', '#6f7e62'], 18, 33197);
      ctx.fillStyle = 'rgba(234,222,158,0.2)';
      ctx.fillRect(0, 15, 32, 2);
      ctx.fillRect(15, 0, 2, 32);
      break;
    case 'sect_hall':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#2f3b41';
      ctx.fillRect(3, 9, 26, 7);
      ctx.fillStyle = '#50616a';
      ctx.fillRect(5, 5, 22, 6);
      ctx.fillStyle = '#c5b274';
      ctx.fillRect(6, 16, 20, 13);
      ctx.fillStyle = '#6a4a2b';
      ctx.fillRect(13, 20, 7, 9);
      ctx.fillStyle = '#d9c86f';
      ctx.fillRect(9, 18, 4, 4);
      ctx.fillRect(22, 18, 4, 4);
      break;
    case 'sect_pillar':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#3b3430';
      ctx.fillRect(10, 6, 12, 23);
      ctx.fillStyle = '#b99b5e';
      ctx.fillRect(8, 5, 16, 4);
      ctx.fillRect(8, 26, 16, 4);
      ctx.fillStyle = '#776143';
      ctx.fillRect(13, 10, 3, 15);
      break;
    case 'sect_shop':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#4a5b54';
      ctx.fillRect(5, 10, 22, 6);
      ctx.fillStyle = '#b88a55';
      ctx.fillRect(6, 16, 20, 12);
      ctx.fillStyle = '#d7bf6a';
      ctx.fillRect(9, 18, 14, 4);
      ctx.fillStyle = '#5a3824';
      ctx.fillRect(14, 22, 5, 6);
      break;
    case 'spirit_pool':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = 'rgba(25,46,45,0.28)';
      ctx.fillRect(5, 20, 22, 6);
      ctx.fillStyle = '#577f91';
      ctx.beginPath();
      ctx.ellipse(16, 18, 12, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9fe3c8';
      ctx.fillRect(9, 15, 14, 2);
      ctx.fillRect(12, 20, 9, 2);
      ctx.fillStyle = 'rgba(227,255,214,0.65)';
      ctx.fillRect(15, 9, 2, 5);
      ctx.fillRect(20, 12, 2, 4);
      break;
    case 'task_board':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#5a3a23';
      ctx.fillRect(8, 8, 3, 20);
      ctx.fillRect(22, 8, 3, 20);
      ctx.fillStyle = '#c4a060';
      ctx.fillRect(6, 7, 21, 13);
      ctx.fillStyle = '#6e4228';
      ctx.fillRect(9, 10, 15, 2);
      ctx.fillRect(9, 15, 11, 2);
      break;
    case 'lantern':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = '#4c3825';
      ctx.fillRect(15, 7, 2, 21);
      ctx.fillStyle = '#d64437';
      ctx.fillRect(11, 9, 10, 9);
      ctx.fillStyle = '#ffd16d';
      ctx.fillRect(14, 11, 4, 5);
      break;
    case 'mist':
      ctx.clearRect(0, 0, tileSize, tileSize);
      ctx.fillStyle = 'rgba(224,236,223,0.26)';
      ctx.fillRect(2, 9, 18, 3);
      ctx.fillRect(9, 17, 20, 3);
      break;
    case 'player':
    case 'player_down_0':
    case 'player_down_1':
    case 'player_down_2':
    case 'player_up_0':
    case 'player_up_1':
    case 'player_up_2':
    case 'player_left_0':
    case 'player_left_1':
    case 'player_left_2':
    case 'player_right_0':
    case 'player_right_1':
    case 'player_right_2':
    case 'npc_robed':
    case 'npc_trader':
    case 'npc_guard':
    case 'beast_wolf':
    case 'beast_spirit':
    case 'beast_boar':
      ctx.clearRect(0, 0, tileSize, tileSize);
      if (options.kind === 'beast_wolf' || options.kind === 'beast_spirit' || options.kind === 'beast_boar') {
        ctx.fillStyle = 'rgba(0,0,0,0.24)';
        ctx.fillRect(7, 25, 18, 4);
        if (options.kind === 'beast_spirit') {
          ctx.fillStyle = '#244f46';
          ctx.fillRect(10, 13, 13, 11);
          ctx.fillStyle = '#56a384';
          ctx.fillRect(8, 10, 17, 9);
          ctx.fillStyle = '#c6f0b9';
          ctx.fillRect(12, 13, 3, 2);
          ctx.fillRect(20, 13, 2, 2);
          ctx.fillStyle = 'rgba(176,230,183,0.42)';
          ctx.fillRect(6, 8, 4, 3);
          ctx.fillRect(23, 18, 4, 3);
        } else if (options.kind === 'beast_boar') {
          ctx.fillStyle = '#3d3427';
          ctx.fillRect(8, 15, 18, 10);
          ctx.fillStyle = '#6f5738';
          ctx.fillRect(6, 17, 6, 6);
          ctx.fillStyle = '#c9b783';
          ctx.fillRect(5, 22, 3, 2);
          ctx.fillRect(24, 22, 3, 2);
          ctx.fillStyle = '#d96d55';
          ctx.fillRect(9, 18, 2, 2);
        } else {
          ctx.fillStyle = '#263334';
          ctx.fillRect(8, 14, 17, 9);
          ctx.fillStyle = '#596b5b';
          ctx.fillRect(11, 10, 10, 8);
          ctx.fillStyle = '#1a2224';
          ctx.fillRect(8, 11, 4, 5);
          ctx.fillRect(21, 12, 4, 4);
          ctx.fillStyle = '#f0d96e';
          ctx.fillRect(13, 13, 2, 2);
          ctx.fillRect(18, 13, 2, 2);
        }
        break;
      }
      {
        const frame = options.kind.endsWith('_1') ? -1 : options.kind.endsWith('_2') ? 1 : 0;
        const leftFacing = options.kind.includes('_left');
        const rightFacing = options.kind.includes('_right');
        const backFacing = options.kind.includes('_up');
        const legA = frame < 0 ? 1 : 0;
        const legB = frame > 0 ? 1 : 0;
      ctx.fillStyle = '#1d1b18';
        ctx.fillRect(11, 26, 10, 3);
      ctx.fillStyle = '#c39a65';
        if (!backFacing) ctx.fillRect(12, 6, 8, 7);
      ctx.fillStyle = options.kind === 'player' || options.kind.startsWith('player_') ? '#416a84' : options.kind === 'npc_trader' ? '#86613d' : options.kind === 'npc_guard' ? '#675b7d' : '#47724b';
        ctx.fillRect(leftFacing ? 9 : rightFacing ? 11 : 10, 13, 12, 13);
      ctx.fillStyle = '#2c2522';
        ctx.fillRect(leftFacing ? 10 : rightFacing ? 12 : 11, 4, 10, 4);
        if (backFacing) {
          ctx.fillStyle = '#2b5269';
          ctx.fillRect(10, 8, 12, 8);
        }
        ctx.fillStyle = '#25323a';
        ctx.fillRect(11, 25, 4, 3 + legA);
        ctx.fillRect(17, 25, 4, 3 + legB);
        if (!backFacing) {
      ctx.fillStyle = '#f5df9b';
          ctx.fillRect(leftFacing ? 13 : rightFacing ? 18 : 14, 8, 2, 2);
          if (!leftFacing && !rightFacing) ctx.fillRect(18, 8, 2, 2);
        }
      }
      break;
  }

  return canvas;
}

export function createBuiltinTileRegistry(): TileRegistry {
  const sprites: Record<string, CanvasImageSource> = {
    grass_a: drawSprite({ kind: 'grass_a', base: '#6da34d', dark: '#4f7b38', light: '#8fc86d' }),
    grass_b: drawSprite({ kind: 'grass_b', base: '#75a957', dark: '#5d873e', light: '#a1ca73' }),
    grass_flower: drawSprite({ kind: 'grass_flower', base: '#6fa64f' }),
    grass_dark: drawSprite({ kind: 'grass_dark', base: '#4c743e', dark: '#35572d', light: '#69904f' }),
    water_a: drawSprite({ kind: 'water_a', base: '#327faa', light: '#75bdd4' }),
    water_b: drawSprite({ kind: 'water_b', base: '#2f739c', light: '#68aeca' }),
    sand: drawSprite({ kind: 'sand', base: '#d1be79' }),
    road: drawSprite({ kind: 'road', base: '#8b744f' }),
    road_edge: drawSprite({ kind: 'road_edge', base: '#806946' }),
    forest_floor: drawSprite({ kind: 'forest_floor', base: '#344c2b' }),
    hill: drawSprite({ kind: 'hill', base: '#789d55' }),
    cave_floor: drawSprite({ kind: 'cave_floor', base: '#4b493f' }),
    cave_wall: drawSprite({ kind: 'cave_wall', base: '#2f302d' }),
    tree_oak: drawSprite({ kind: 'tree_oak', base: '#00000000' }),
    tree_pine: drawSprite({ kind: 'tree_pine', base: '#00000000' }),
    mountain: drawSprite({ kind: 'mountain', base: '#536049' }),
    mountain_snow: drawSprite({ kind: 'mountain_snow', base: '#596350' }),
    cliff: drawSprite({ kind: 'cliff', base: '#505645' }),
    bridge: drawSprite({ kind: 'bridge', base: '#2f79a2' }),
    bridge_h: drawSprite({ kind: 'bridge_h', base: '#2f79a2' }),
    bridge_v: drawSprite({ kind: 'bridge_v', base: '#2f79a2' }),
    house_wall: drawSprite({ kind: 'house_wall', base: '#b8915e' }),
    house_roof: drawSprite({ kind: 'house_roof', base: '#00000000' }),
    house_door: drawSprite({ kind: 'house_door', base: '#b8915e' }),
    house_window: drawSprite({ kind: 'house_window', base: '#b8915e' }),
    house_eave: drawSprite({ kind: 'house_eave', base: '#00000000' }),
    fence: drawSprite({ kind: 'fence', base: '#00000000' }),
    fence_h: drawSprite({ kind: 'fence_h', base: '#00000000' }),
    fence_v: drawSprite({ kind: 'fence_v', base: '#00000000' }),
    fence_post: drawSprite({ kind: 'fence_post', base: '#00000000' }),
    gate_post: drawSprite({ kind: 'gate_post', base: '#00000000' }),
    market_stall: drawSprite({ kind: 'market_stall', base: '#00000000' }),
    market_sign: drawSprite({ kind: 'market_sign', base: '#00000000' }),
    inn: drawSprite({ kind: 'inn', base: '#00000000' }),
    cave_entrance: drawSprite({ kind: 'cave_entrance', base: '#00000000' }),
    treasure_chest: drawSprite({ kind: 'treasure_chest', base: '#00000000' }),
    herb_patch: drawSprite({ kind: 'herb_patch', base: '#00000000' }),
    teleport_array: drawSprite({ kind: 'teleport_array', base: '#00000000' }),
    cave_exit: drawSprite({ kind: 'cave_exit', base: '#00000000' }),
    sect_ground: drawSprite({ kind: 'sect_ground', base: '#7f8f6a' }),
    sect_hall: drawSprite({ kind: 'sect_hall', base: '#00000000' }),
    sect_pillar: drawSprite({ kind: 'sect_pillar', base: '#00000000' }),
    sect_shop: drawSprite({ kind: 'sect_shop', base: '#00000000' }),
    spirit_pool: drawSprite({ kind: 'spirit_pool', base: '#00000000' }),
    task_board: drawSprite({ kind: 'task_board', base: '#00000000' }),
    lantern: drawSprite({ kind: 'lantern', base: '#00000000' }),
    mist: drawSprite({ kind: 'mist', base: '#00000000' }),
    player: drawSprite({ kind: 'player', base: '#00000000' }),
    player_down_0: drawSprite({ kind: 'player_down_0', base: '#00000000' }),
    player_down_1: drawSprite({ kind: 'player_down_1', base: '#00000000' }),
    player_down_2: drawSprite({ kind: 'player_down_2', base: '#00000000' }),
    player_up_0: drawSprite({ kind: 'player_up_0', base: '#00000000' }),
    player_up_1: drawSprite({ kind: 'player_up_1', base: '#00000000' }),
    player_up_2: drawSprite({ kind: 'player_up_2', base: '#00000000' }),
    player_left_0: drawSprite({ kind: 'player_left_0', base: '#00000000' }),
    player_left_1: drawSprite({ kind: 'player_left_1', base: '#00000000' }),
    player_left_2: drawSprite({ kind: 'player_left_2', base: '#00000000' }),
    player_right_0: drawSprite({ kind: 'player_right_0', base: '#00000000' }),
    player_right_1: drawSprite({ kind: 'player_right_1', base: '#00000000' }),
    player_right_2: drawSprite({ kind: 'player_right_2', base: '#00000000' }),
    npc_robed: drawSprite({ kind: 'npc_robed', base: '#00000000' }),
    npc_trader: drawSprite({ kind: 'npc_trader', base: '#00000000' }),
    npc_guard: drawSprite({ kind: 'npc_guard', base: '#00000000' }),
    beast_wolf: drawSprite({ kind: 'beast_wolf', base: '#00000000' }),
    beast_spirit: drawSprite({ kind: 'beast_spirit', base: '#00000000' }),
    beast_boar: drawSprite({ kind: 'beast_boar', base: '#00000000' }),
  };

  const tiles: TileDefinition[] = [
    { id: 1, key: 'grass.a', layer: 'ground', spriteId: 'grass_a', walkable: true, tags: ['grass'] },
    { id: 2, key: 'grass.b', layer: 'ground', spriteId: 'grass_b', walkable: true, tags: ['grass'] },
    { id: 3, key: 'grass.flower', layer: 'ground', spriteId: 'grass_flower', walkable: true, tags: ['grass', 'flower'] },
    { id: 4, key: 'grass.dark', layer: 'ground', spriteId: 'grass_dark', walkable: true, tags: ['grass', 'forest'] },
    { id: 5, key: 'water.a', layer: 'ground', spriteId: 'water_a', walkable: false, animated: true, tags: ['water'] },
    { id: 6, key: 'water.b', layer: 'ground', spriteId: 'water_b', walkable: false, animated: true, tags: ['water'] },
    { id: 7, key: 'sand', layer: 'ground', spriteId: 'sand', walkable: true, tags: ['shore'] },
    { id: 8, key: 'road', layer: 'ground', spriteId: 'road', walkable: true, tags: ['road'] },
    { id: 9, key: 'forest.floor', layer: 'ground', spriteId: 'forest_floor', walkable: true, tags: ['forest'] },
    { id: 10, key: 'mountain', layer: 'ground', spriteId: 'mountain', walkable: false, tags: ['mountain'] },
    { id: 11, key: 'cliff', layer: 'ground', spriteId: 'cliff', walkable: false, tags: ['mountain', 'cliff'] },
    { id: 12, key: 'bridge', layer: 'ground', spriteId: 'bridge', walkable: true, tags: ['bridge', 'road'] },
    { id: 13, key: 'bridge.horizontal', layer: 'ground', spriteId: 'bridge_h', walkable: true, tags: ['bridge', 'road', 'horizontal'] },
    { id: 14, key: 'bridge.vertical', layer: 'ground', spriteId: 'bridge_v', walkable: true, tags: ['bridge', 'road', 'vertical'] },
    { id: 100, key: 'tree.oak', layer: 'object', spriteId: 'tree_oak', walkable: false, tags: ['tree'] },
    { id: 101, key: 'tree.pine', layer: 'object', spriteId: 'tree_pine', walkable: false, tags: ['tree'] },
    { id: 102, key: 'house.wall', layer: 'object', spriteId: 'house_wall', walkable: false, tags: ['house'] },
    { id: 103, key: 'house.roof', layer: 'object', spriteId: 'house_roof', walkable: false, tags: ['house'] },
    { id: 104, key: 'fence', layer: 'object', spriteId: 'fence', walkable: false, tags: ['fence'] },
    { id: 105, key: 'lantern', layer: 'object', spriteId: 'lantern', walkable: true, tags: ['lantern', 'light'] },
    { id: 106, key: 'mist', layer: 'overlay', spriteId: 'mist', walkable: true, tags: ['mist'] },
    { id: 107, key: 'house.door', layer: 'object', spriteId: 'house_door', walkable: false, tags: ['house', 'door'] },
    { id: 108, key: 'house.window', layer: 'object', spriteId: 'house_window', walkable: false, tags: ['house', 'window'] },
    { id: 109, key: 'house.eave', layer: 'object', spriteId: 'house_eave', walkable: false, tags: ['house', 'eave'] },
    { id: 110, key: 'fence.horizontal', layer: 'object', spriteId: 'fence_h', walkable: false, tags: ['fence', 'horizontal'] },
    { id: 111, key: 'fence.vertical', layer: 'object', spriteId: 'fence_v', walkable: false, tags: ['fence', 'vertical'] },
    { id: 112, key: 'fence.post', layer: 'object', spriteId: 'fence_post', walkable: false, tags: ['fence', 'post'] },
    { id: 113, key: 'gate.post', layer: 'object', spriteId: 'gate_post', walkable: false, tags: ['fence', 'gate'] },
    { id: 114, key: 'market.stall', layer: 'object', spriteId: 'market_stall', walkable: true, tags: ['market', 'stall'] },
    { id: 115, key: 'market.sign', layer: 'object', spriteId: 'market_sign', walkable: true, tags: ['market', 'sign'] },
    { id: 116, key: 'inn', layer: 'object', spriteId: 'inn', walkable: false, tags: ['inn', 'house'] },
    { id: 117, key: 'hill', layer: 'ground', spriteId: 'hill', walkable: true, tags: ['hill', 'grass'] },
    { id: 118, key: 'cave.floor', layer: 'ground', spriteId: 'cave_floor', walkable: true, tags: ['cave'] },
    { id: 119, key: 'cave.wall', layer: 'ground', spriteId: 'cave_wall', walkable: false, tags: ['cave', 'wall'] },
    { id: 120, key: 'cave.entrance', layer: 'object', spriteId: 'cave_entrance', walkable: true, tags: ['cave', 'entrance'] },
    { id: 121, key: 'treasure.chest', layer: 'object', spriteId: 'treasure_chest', walkable: true, tags: ['treasure'] },
    { id: 122, key: 'herb.patch', layer: 'object', spriteId: 'herb_patch', walkable: true, tags: ['herb'] },
    { id: 123, key: 'teleport.array', layer: 'object', spriteId: 'teleport_array', walkable: true, tags: ['teleport'] },
    { id: 124, key: 'cave.exit', layer: 'object', spriteId: 'cave_exit', walkable: true, tags: ['cave', 'exit'] },
    { id: 125, key: 'sect.ground', layer: 'ground', spriteId: 'sect_ground', walkable: true, tags: ['sect'] },
    { id: 126, key: 'sect.hall', layer: 'object', spriteId: 'sect_hall', walkable: false, tags: ['sect', 'hall'] },
    { id: 127, key: 'sect.pillar', layer: 'object', spriteId: 'sect_pillar', walkable: false, tags: ['sect', 'pillar'] },
    { id: 128, key: 'sect.shop', layer: 'object', spriteId: 'sect_shop', walkable: true, tags: ['sect', 'shop'] },
    { id: 129, key: 'spirit.pool', layer: 'object', spriteId: 'spirit_pool', walkable: true, tags: ['sect', 'pool'] },
    { id: 130, key: 'task.board', layer: 'object', spriteId: 'task_board', walkable: true, tags: ['sect', 'task'] },
  ];

  return {
    tileSize: BUILTIN_TILE_SIZE,
    sprites,
    tiles,
    byId: new Map(tiles.map((tile) => [tile.id, tile])),
    byKey: new Map(tiles.map((tile) => [tile.key, tile])),
    source: 'builtin',
  };
}
