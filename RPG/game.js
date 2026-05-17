const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TILE = 24;
const MAP_SIZE = 108;
const SAVE_KEY = "xiuxian-rpg-save-v1";
const MAP_VERSION = 5;
const DAY_NIGHT_SECONDS = 120;
const TRANSITION_SECONDS = 24;
const realms = ["炼气", "筑基", "金丹", "元婴", "化神"];
const realmSuccess = [0.9, 0.72, 0.55, 0.42, 0.3];
const rarityColors = {
  凡品: "#d8d0b2",
  灵品: "#80d893",
  仙品: "#d8b45a",
};

const areas = [
  {
    name: "凡尘大陆",
    seed: 1107,
    palette: { grass: "#233642", forest: "#13363b", mountain: "#364074", water: "#253b83", town: "#6f6f9e", road: "#7779a8", roof: "#273052", wood: "#8f5e38" },
    towns: [{ x: 50, y: 62, name: "青柳镇" }, { x: 20, y: 82, name: "南槐驿" }, { x: 82, y: 38, name: "望月坊" }],
    portals: [{ x: 88, y: 86, to: 1, cost: 80 }, { x: 12, y: 24, to: 2, cost: 140 }],
  },
  {
    name: "灵域仙山",
    seed: 2213,
    palette: { grass: "#263f43", forest: "#164045", mountain: "#49558d", water: "#314b9a", town: "#7b78aa", road: "#8584b6", roof: "#2f3b68", wood: "#9b6840" },
    towns: [{ x: 52, y: 50, name: "云台坊" }, { x: 24, y: 78, name: "听泉镇" }, { x: 84, y: 28, name: "紫霞集" }],
    portals: [{ x: 14, y: 88, to: 0, cost: 80 }, { x: 92, y: 18, to: 2, cost: 140 }, { x: 91, y: 86, to: 0, cost: 110 }],
  },
  {
    name: "幽冥秘境",
    seed: 3349,
    palette: { grass: "#2b3343", forest: "#172f3b", mountain: "#51477a", water: "#2b3775", town: "#6c649a", road: "#7770a6", roof: "#322a59", wood: "#86543d" },
    towns: [{ x: 58, y: 62, name: "玄阴集" }, { x: 24, y: 32, name: "忘川驿" }, { x: 84, y: 82, name: "烛影市" }],
    portals: [{ x: 13, y: 16, to: 1, cost: 140 }, { x: 94, y: 88, to: 0, cost: 160 }],
  },
];

const itemTemplates = [
  { name: "青木诀", type: "功法", rarity: "凡品", price: 70, effect: { skill: "青木剑气" } },
  { name: "离火真诀", type: "功法", rarity: "灵品", price: 180, effect: { skill: "离火咒" } },
  { name: "太虚剑典残卷", type: "功法", rarity: "仙品", price: 520, effect: { skill: "太虚剑芒" } },
  { name: "回春丹", type: "丹药", rarity: "凡品", price: 36, effect: { hp: 60 } },
  { name: "聚灵丹", type: "丹药", rarity: "灵品", price: 90, effect: { cultivation: 28 } },
  { name: "突破丹", type: "丹药", rarity: "灵品", price: 150, effect: { breakthrough: 0.18 } },
  { name: "天雷符", type: "符咒", rarity: "灵品", price: 110, effect: { damage: 42 } },
  { name: "护身符", type: "符咒", rarity: "凡品", price: 55, effect: { shield: 25 } },
  { name: "寒铁剑", type: "装备", rarity: "凡品", price: 95, slot: "武器", effect: { attack: 8 } },
  { name: "流云袍", type: "装备", rarity: "灵品", price: 170, slot: "防具", effect: { defense: 8 } },
  { name: "凝神玉佩", type: "装备", rarity: "仙品", price: 460, slot: "饰品", effect: { mp: 45, speed: 4 } },
  { name: "妖兽内丹", type: "材料", rarity: "灵品", price: 120, effect: { cultivation: 18 } },
];

const npcNames = ["陆青", "沈微澜", "韩照", "叶听雨", "顾玄", "林照夜", "楚云岫", "秦无咎", "白若尘"];
const beastNames = ["山魈", "赤尾狐", "铁背狼", "幽林豹", "碧眼猿", "夜行妖鹿"];
const keys = new Set();
let state;
let maps;
let activeFilter = "all";
let modalContext = null;
let lastTick = performance.now();
let worldTime = 0;

function mulberry32(seed) {
  return function rand() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(seed, x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 0.137) * 43758.5453;
  return n - Math.floor(n);
}

function choice(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function makeItem(template, qty = 1) {
  return { ...template, id: `${template.name}-${Date.now()}-${Math.random()}`, qty };
}

function generateMaps() {
  return areas.map((area, areaIndex) => {
    const rand = mulberry32(area.seed);
    const scene = createNightTownScene(area, areaIndex, rand);
    const { tiles, objects, blocked } = scene;

    area.portals.forEach((portal) => {
      if (inBounds(portal.x, portal.y)) {
        fillRectTiles(tiles, blocked, portal.x - 2, portal.y - 2, 5, 5, "road", false);
        tiles[portal.y][portal.x] = "portal";
        blocked[portal.y][portal.x] = false;
        objects.push({ type: "portalRing", x: portal.x - 1, y: portal.y - 1, w: 3, h: 3, layer: 4 });
      }
    });
    for (let i = 1; i < area.towns.length; i += 1) {
      carveRoad(tiles, area.towns[i - 1].x, area.towns[i - 1].y, area.towns[i].x, area.towns[i].y);
    }
    area.towns.forEach((town) => {
      area.portals.forEach((portal) => carveRoad(tiles, town.x, town.y, portal.x, portal.y));
    });

    const caves = [];
    while (caves.length < 4) {
      const x = 8 + Math.floor(rand() * (MAP_SIZE - 16));
      const y = 8 + Math.floor(rand() * (MAP_SIZE - 16));
      if (!isBlockedAt({ tiles, blocked }, x, y) && !["town", "portal", "plaza"].includes(tiles[y][x])) {
        caves.push({ x, y, found: false, looted: false, name: choice(rand, ["无名洞府", "古修遗府", "丹霞石窟", "玄门旧址"]) });
      }
    }

    const npcs = [];
    for (let i = 0; i < 12; i += 1) {
      let x = 10 + Math.floor(rand() * (MAP_SIZE - 20));
      let y = 10 + Math.floor(rand() * (MAP_SIZE - 20));
      while (isBlockedAt({ tiles, blocked }, x, y)) {
        x = 10 + Math.floor(rand() * (MAP_SIZE - 20));
        y = 10 + Math.floor(rand() * (MAP_SIZE - 20));
      }
      const realm = Math.min(4, Math.floor(rand() * (areaIndex + 2)));
      npcs.push({
        id: `npc-${areaIndex}-${i}`,
        name: choice(rand, npcNames),
        x,
        y,
        dirTimer: 0,
        dx: 0,
        dy: 0,
        facing: choice(rand, ["down", "up", "left", "right"]),
        walkTime: 0,
        realm,
        favor: Math.floor(rand() * 20),
        hp: 70 + realm * 45,
        maxHp: 70 + realm * 45,
        attack: 12 + realm * 12,
        defense: 4 + realm * 6,
        speed: 2 + realm,
        items: Array.from({ length: 2 }, () => makeItem(weightedItem(rand))),
      });
    }

    const beasts = [];
    for (let i = 0; i < 18; i += 1) {
      let x = 6 + Math.floor(rand() * (MAP_SIZE - 12));
      let y = 24 + Math.floor(rand() * (MAP_SIZE - 30));
      while (isBlockedAt({ tiles, blocked }, x, y) || isNearTown(areaIndex, x, y, 18) || ["portal", "plaza", "road", "bridge"].includes(tiles[y][x])) {
        x = 6 + Math.floor(rand() * (MAP_SIZE - 12));
        y = 24 + Math.floor(rand() * (MAP_SIZE - 30));
      }
      const realm = Math.min(4, Math.max(0, areaIndex + Math.floor(rand() * 2) - 1));
      beasts.push({
        id: `beast-${areaIndex}-${i}`,
        name: choice(rand, beastNames),
        x,
        y,
        dirTimer: 0,
        dx: 0,
        dy: 0,
        facing: choice(rand, ["down", "up", "left", "right"]),
        walkTime: 0,
        realm,
        hp: 58 + realm * 42,
        maxHp: 58 + realm * 42,
        attack: 14 + realm * 13,
        defense: 3 + realm * 5,
        speed: 3 + realm,
        items: [makeItem(itemTemplates.find((item) => item.name === "妖兽内丹"))],
      });
    }

    return { version: MAP_VERSION, tiles, objects, blocked, caves, npcs, beasts, market: restockMarket(rand) };
  });
}

function isNearTown(areaIndex, x, y, radius) {
  return areas[areaIndex].towns.some((town) => distance(town.x, town.y, x, y) <= radius);
}

function createNightTownScene(area, areaIndex, rand) {
  const tiles = [];
  const blocked = [];
  const objects = [];
  for (let y = 0; y < MAP_SIZE; y += 1) {
    const row = [];
    const blockedRow = [];
    for (let x = 0; x < MAP_SIZE; x += 1) {
      const n = noise(area.seed, Math.floor(x / 5), Math.floor(y / 5));
      let type = n > 0.5 ? "forest" : "grass";
      if (y < 18) type = "mountain";
      if (y >= 18 && y < 23 && noise(area.seed + 9, x, y) > 0.35) type = "farMountain";
      row.push(type);
      blockedRow.push(type === "mountain");
    }
    tiles.push(row);
    blocked.push(blockedRow);
  }

  area.towns.forEach((town, index) => addTownScene(tiles, blocked, objects, town, index === 0, rand));
  objects.push({ type: "stars", x: 0, y: 0, w: MAP_SIZE, h: 18, layer: 0, seed: area.seed + areaIndex });
  return { tiles, objects, blocked };
}

function addTownScene(tiles, blocked, objects, town, major, rand) {
  const rx = major ? 29 : 13;
  const ry = major ? 22 : 10;
  fillRectTiles(tiles, blocked, town.x - rx + 4, town.y - ry + 2, rx * 2 - 8, ry * 2 - 4, "plaza", false);
  fillEllipseTiles(tiles, blocked, town.x, town.y + 2, rx, ry, "plaza", false);
  fillRectTiles(tiles, blocked, town.x - 2, town.y - ry - 4, 5, ry * 2 + 10, "road", false);
  fillRectTiles(tiles, blocked, town.x - rx - 2, town.y - 2, rx * 2 + 5, 5, "road", false);
  if (major) {
    fillRectTiles(tiles, blocked, town.x + 13, town.y - 18, 7, 42, "water", true);
    fillRectTiles(tiles, blocked, town.x + 12, town.y - 3, 9, 4, "bridge", false);
    fillRectTiles(tiles, blocked, town.x - 18, town.y + 18, 45, 3, "wall", true);
    fillRectTiles(tiles, blocked, town.x - 29, town.y - 21, 3, 34, "wall", true);
    fillRectTiles(tiles, blocked, town.x + 28, town.y - 21, 3, 34, "wall", true);
    openGate(tiles, blocked, town.x - 2, town.y + 18, 5, 3);
  }
  const buildings = major ? [
    { x: town.x - 22, y: town.y - 16, w: 9, h: 8, kind: "hall" },
    { x: town.x - 8, y: town.y - 18, w: 11, h: 9, kind: "inn" },
    { x: town.x + 19, y: town.y - 13, w: 10, h: 11, kind: "tower" },
    { x: town.x - 24, y: town.y + 5, w: 8, h: 7, kind: "house" },
    { x: town.x - 8, y: town.y + 9, w: 10, h: 8, kind: "shop" },
    { x: town.x + 5, y: town.y + 11, w: 11, h: 8, kind: "market" },
    { x: town.x + 21, y: town.y + 4, w: 9, h: 7, kind: "house" },
    { x: town.x - 30, y: town.y + 17, w: 9, h: 8, kind: "house" },
    { x: town.x + 17, y: town.y + 20, w: 11, h: 8, kind: "shop" },
  ] : [
    { x: town.x - 10, y: town.y - 8, w: 8, h: 7, kind: "inn" },
    { x: town.x + 3, y: town.y - 7, w: 8, h: 7, kind: "shop" },
    { x: town.x - 4, y: town.y + 5, w: 8, h: 7, kind: "house" },
  ];
  buildings.forEach((building) => addBuilding(tiles, blocked, objects, building));
  [
    { x: town.x - Math.min(rx - 5, 10), y: town.y - 5 },
    { x: town.x + Math.min(rx - 7, 8), y: town.y + 2 },
  ].forEach((spot) => {
    if (!isBlockedAt({ tiles, blocked }, spot.x, spot.y)) objects.push({ type: "stall", x: spot.x, y: spot.y, w: 2, h: 2, layer: 4, service: "market" });
  });
  [
    { x: town.x + (major ? -15 : -7), y: town.y + (major ? 12 : 7) },
    { x: town.x + (major ? 14 : 5), y: town.y + (major ? -14 : -8) },
  ].forEach((spot) => {
    if (!isBlockedAt({ tiles, blocked }, spot.x, spot.y)) objects.push({ type: "restaurant", x: spot.x, y: spot.y, w: 4, h: 3, layer: 4, service: "rest", town: town.name });
  });
  const lanternCount = major ? 34 : 10;
  for (let i = 0; i < lanternCount; i += 1) {
    const x = town.x - rx + Math.floor(rand() * (rx * 2));
    const y = town.y - ry + Math.floor(rand() * (ry * 2 + 7));
    if (!isBlockedAt({ tiles, blocked }, x, y) && ["plaza", "road"].includes(tiles[y][x])) {
      objects.push({ type: "lantern", x, y, w: 1, h: 1, layer: 3 });
    }
  }
  if (major) {
    for (let i = 0; i < 15; i += 1) {
      const x = town.x - 32 + Math.floor(rand() * 65);
      const y = town.y - 25 + Math.floor(rand() * 58);
      if (!isBlockedAt({ tiles, blocked }, x, y) && rand() > 0.5) objects.push({ type: "pine", x, y, w: 2, h: 3, layer: 4 });
    }
    objects.push({ type: "gate", x: town.x - 3, y: town.y + 18, w: 7, h: 5, layer: 5 });
  }
}

function fillRectTiles(tiles, blocked, x, y, w, h, type, blocks) {
  for (let ty = y; ty < y + h; ty += 1) {
    for (let tx = x; tx < x + w; tx += 1) {
      if (!inBounds(tx, ty)) continue;
      tiles[ty][tx] = type;
      blocked[ty][tx] = blocks;
    }
  }
}

function fillEllipseTiles(tiles, blocked, cx, cy, rx, ry, type, blocks) {
  for (let y = cy - ry; y <= cy + ry; y += 1) {
    for (let x = cx - rx; x <= cx + rx; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1 && inBounds(x, y)) {
        tiles[y][x] = type;
        blocked[y][x] = blocks;
      }
    }
  }
}

function openGate(tiles, blocked, x, y, w, h) {
  fillRectTiles(tiles, blocked, x, y, w, h, "road", false);
}

function addBuilding(tiles, blocked, objects, building) {
  fillRectTiles(tiles, blocked, building.x, building.y, building.w, building.h, "plaza", true);
  const doorX = building.x + Math.floor(building.w / 2);
  const doorY = building.y + building.h - 1;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (inBounds(doorX + dx, doorY + dy)) blocked[doorY + dy][doorX + dx] = false;
    }
  }
  objects.push({ ...building, type: "building", layer: 5 });
}

function weightedItem(rand) {
  const roll = rand();
  const pool = itemTemplates.filter((item) => {
    if (roll > 0.92) return item.rarity === "仙品";
    if (roll > 0.58) return item.rarity !== "仙品";
    return item.rarity === "凡品" || item.type === "材料";
  });
  return choice(rand, pool);
}

function restockMarket(rand = Math.random) {
  const goods = [];
  for (let i = 0; i < 8; i += 1) {
    const item = makeItem(weightedItem(rand));
    item.price = Math.round(item.price * (0.85 + rand() * 0.5));
    goods.push(item);
  }
  return goods;
}

function carveRoad(tiles, fromX, fromY, toX, toY) {
  let x = fromX;
  let y = fromY;
  while (x !== toX) {
    x += x < toX ? 1 : -1;
    paintRoad(tiles, x, y);
    if (noise(77, x, y) > 0.72) paintRoad(tiles, x, y + (noise(78, x, y) > 0.5 ? 1 : -1));
  }
  while (y !== toY) {
    y += y < toY ? 1 : -1;
    paintRoad(tiles, x, y);
    if (noise(79, x, y) > 0.72) paintRoad(tiles, x + (noise(80, x, y) > 0.5 ? 1 : -1), y);
  }
}

function paintRoad(tiles, x, y) {
  if (!inBounds(x, y)) return;
  if (["town", "portal"].includes(tiles[y][x])) return;
  if (tiles[y][x] === "water") tiles[y][x] = "bridge";
  else if (tiles[y][x] === "mountain") tiles[y][x] = "pass";
  else tiles[y][x] = "road";
}

function newGame() {
  maps = generateMaps();
  state = {
    area: 0,
    player: {
      x: 20,
      y: 24,
      px: 20 * TILE,
      py: 24 * TILE,
      level: 1,
      exp: 0,
      expMax: 100,
      realm: 0,
      cultivation: 0,
      cultivationMax: 100,
      hp: 120,
      maxHp: 120,
      mp: 80,
      maxMp: 80,
      attack: 18,
      defense: 8,
      speed: 9,
      facing: "down",
      walkTime: 0,
      spiritStones: 120,
      skills: ["基础剑诀"],
      equipment: { 武器: null, 防具: null, 饰品: null },
      inventory: [
        makeItem(itemTemplates.find((item) => item.name === "回春丹"), 2),
        makeItem(itemTemplates.find((item) => item.name === "天雷符"), 1),
        makeItem(itemTemplates.find((item) => item.name === "突破丹"), 1),
      ],
    },
    inBattle: null,
    discoveredCaves: [],
    logs: ["你在青柳镇外醒来，随身只有几瓶丹药和一枚旧剑穗。"],
    marketDay: 1,
    dayNightTimer: 0,
  };
  syncPlayerTile();
  updateUi();
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE;
}

function isBlocked(tile) {
  return tile === "water" || tile === "mountain" || tile === "wall";
}

function isBlockedAt(map, x, y) {
  if (!inBounds(x, y)) return true;
  return Boolean(map.blocked?.[y]?.[x]) || isBlocked(map.tiles[y][x]);
}

function getMap() {
  return maps[state.area];
}

function currentTile() {
  return getMap().tiles[state.player.y][state.player.x];
}

function syncPlayerTile() {
  state.player.x = Math.round(state.player.px / TILE);
  state.player.y = Math.round(state.player.py / TILE);
}

function addLog(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 40);
  updateLog();
}

function showToast(text) {
  const toast = document.getElementById("toast");
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function draw() {
  const map = getMap();
  const scaleX = canvas.clientWidth / canvas.width;
  const scaleY = canvas.clientHeight / canvas.height;
  const viewW = canvas.width;
  const viewH = canvas.height;
  const camX = clamp(state.player.px - viewW / 2, 0, MAP_SIZE * TILE - viewW);
  const camY = clamp(state.player.py - viewH / 2, 0, MAP_SIZE * TILE - viewH);
  ctx.clearRect(0, 0, viewW, viewH);

  const startX = Math.floor(camX / TILE);
  const startY = Math.floor(camY / TILE);
  const endX = Math.ceil((camX + viewW) / TILE);
  const endY = Math.ceil((camY + viewH) / TILE);

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      if (!inBounds(x, y)) continue;
      drawTile(map.tiles[y][x], x * TILE - camX, y * TILE - camY, areas[state.area].palette, x, y);
    }
  }
  drawMapObjects(map, camX, camY, startX, startY, endX, endY, 0, 3);

  map.caves.forEach((cave) => {
    const dist = distance(cave.x, cave.y, state.player.x, state.player.y);
    if (cave.found || dist <= 3) {
      cave.found = true;
      drawCave(cave.x * TILE - camX, cave.y * TILE - camY);
    }
  });

  map.npcs.forEach((npc) => {
    drawCharacter(npc.x * TILE - camX, npc.y * TILE - camY, {
      tunic: "#5f447a",
      hair: "#2a1e32",
      skin: "#f2dfaa",
      facing: npc.facing || "down",
      walking: npc.dx || npc.dy,
      walkTime: npc.walkTime || 0,
      label: npc.name[0],
    });
  });

  (map.beasts || []).forEach((beast, index) => {
    if (beast.hp <= 0) return;
    if (isLowBeastActivity() && index % 5 !== 0) return;
    drawBeast(beast.x * TILE - camX, beast.y * TILE - camY, beast);
  });

  drawPlayerSprite(state.player.px - camX, state.player.py - camY, state.player);
  drawMapObjects(map, camX, camY, startX, startY, endX, endY, 4, 9);

  drawDayNightOverlay();
  drawMiniMap();
  if (state.inBattle) drawBattleOverlay();
  drawHudHints(scaleX, scaleY);
}

function drawMapObjects(map, camX, camY, startX, startY, endX, endY, minLayer, maxLayer) {
  (map.objects || []).forEach((object) => {
    const layer = object.layer || 0;
    if (layer < minLayer || layer > maxLayer) return;
    if (object.x + object.w < startX || object.x > endX || object.y + object.h < startY || object.y > endY) return;
    drawObject(object, object.x * TILE - camX, object.y * TILE - camY, areas[state.area].palette);
  });
}

function drawObject(object, sx, sy, palette) {
  if (object.type === "building") drawBuilding(sx, sy, object, palette);
  else if (object.type === "lantern") drawLantern(sx, sy);
  else if (object.type === "pine") drawPine(sx, sy);
  else if (object.type === "gate") drawGate(sx, sy, object, palette);
  else if (object.type === "portalRing") drawPortalRing(sx, sy);
  else if (object.type === "stall") drawStall(sx, sy);
  else if (object.type === "restaurant") drawRestaurantSign(sx, sy);
  else if (object.type === "stars") drawSky(object, sx, sy);
}

function drawTile(type, sx, sy, palette, x, y) {
  ctx.fillStyle = palette[type] || palette.grass;
  ctx.fillRect(sx, sy, TILE, TILE);
  const speck = noise(9001, x, y);
  const phase = getDayPhase();
  const night = phase.name === "night";
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  if (speck > 0.62) ctx.fillRect(sx + 3 + Math.floor(speck * 7), sy + 5, 2, 2);
  if (type === "grass") {
    ctx.fillStyle = night ? (speck > 0.5 ? "#31545b" : "#1c3d45") : (speck > 0.5 ? "#638866" : "#456f59");
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = night ? "#5d8990" : "#9bb875";
    if (speck > 0.28) ctx.fillRect(sx + 2, sy + 6, 3, 2);
    if (speck > 0.48) ctx.fillRect(sx + 15, sy + 12, 4, 2);
    ctx.fillStyle = night ? "#244c54" : "#547d55";
    ctx.fillRect(sx + 4, sy + 16, 3, 4);
    if (speck > 0.76) ctx.fillRect(sx + 16, sy + 8, 2, 5);
  }
  if (type === "forest") {
    ctx.fillStyle = night ? "#0e2630" : "#274f4c";
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = night ? "#16444b" : "#3c7562";
    ctx.fillRect(sx + 2, sy + 4, 20, 15);
    ctx.fillStyle = night ? "#1d5b5d" : "#59926e";
    ctx.fillRect(sx + 5, sy + 1, 12, 8);
    ctx.fillStyle = night ? "#6da2a0" : "#bed894";
    if (speck > 0.6) ctx.fillRect(sx + 7, sy + 5, 3, 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(sx + 3, sy + 17, 18, 4);
  } else if (type === "mountain") {
    ctx.fillStyle = "#1b2140";
    ctx.fillRect(sx + 3, sy + 18, 18, 3);
    ctx.fillStyle = palette.mountain;
    ctx.beginPath();
    ctx.moveTo(sx + 12, sy + 4);
    ctx.lineTo(sx + 22, sy + 20);
    ctx.lineTo(sx + 2, sy + 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7c86cf";
    ctx.fillRect(sx + 11, sy + 7, 3, 4);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(sx + 13, sy + 12, 6, 7);
  } else if (type === "water") {
    ctx.fillStyle = night ? "#2f4ea8" : "#4f90c8";
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = night ? "#5c73d6" : "#9bd0e7";
    ctx.fillRect(sx + ((x + y) % 3) * 4, sy + 7, 8, 2);
    ctx.fillRect(sx + 12, sy + 17, 8, 2);
  } else if (type === "road") {
    ctx.fillStyle = night ? palette.road : "#a6a387";
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = night ? "#9da0cf" : "#c9c3a0";
    ctx.fillRect(sx + 2, sy + 6, 5, 2);
    ctx.fillRect(sx + 9, sy + 18, 7, 1);
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(sx, sy + 22, TILE, 2);
    if (speck > 0.5) ctx.fillRect(sx + 14, sy + 15, 4, 2);
  } else if (type === "plaza") {
    ctx.fillStyle = night ? palette.town : "#a7a2ba";
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = night ? (speck > 0.5 ? "#8e90c0" : "#666999") : (speck > 0.5 ? "#c5c0d1" : "#918da9");
    ctx.fillRect(sx + 2, sy + 3, 6, 2);
    ctx.fillRect(sx + 12, sy + 15, 8, 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(sx, sy, TILE, 1);
  } else if (type === "wall") {
    ctx.fillStyle = "#242a47";
    ctx.fillRect(sx, sy + 6, TILE, 15);
    ctx.fillStyle = "#7478a8";
    ctx.fillRect(sx, sy + 3, TILE, 5);
  } else if (type === "bridge") {
    ctx.fillStyle = palette.water;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = "#7b583a";
    ctx.fillRect(sx, sy + 8, TILE, 9);
    ctx.fillStyle = "#c09254";
    for (let bx = 2; bx < TILE; bx += 6) ctx.fillRect(sx + bx, sy + 7, 3, 11);
  } else if (type === "pass") {
    ctx.fillStyle = palette.mountain;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = "#a18255";
    ctx.fillRect(sx, sy + 9, TILE, 7);
    ctx.fillStyle = "#d5bd83";
    ctx.fillRect(sx + 5, sy + 11, 4, 2);
    ctx.fillRect(sx + 15, sy + 13, 3, 2);
  } else if (type === "town") {
    ctx.fillStyle = "#9f7742";
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = "#62382c";
    ctx.fillRect(sx + 4, sy + 9, 16, 10);
    ctx.fillStyle = "#d29b54";
    ctx.fillRect(sx + 2, sy + 6, 20, 5);
    ctx.fillStyle = "#261b18";
    ctx.fillRect(sx + 10, sy + 14, 4, 5);
  } else if (type === "portal") {
    ctx.fillStyle = "#536064";
    ctx.fillRect(sx + 3, sy + 17, 18, 4);
    ctx.fillStyle = worldTime % 1 > 0.5 ? "#75c7d8" : "#b7f4ee";
    ctx.fillRect(sx + 5, sy + 5, 14, 12);
    ctx.fillStyle = "#f5e6a5";
    ctx.fillRect(sx + 9, sy + 9, 6, 6);
  }
}

function drawCave(x, y) {
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(Math.round(x + 3), Math.round(y + 18), 18, 4);
  ctx.fillStyle = "#53423a";
  ctx.fillRect(Math.round(x + 4), Math.round(y + 9), 16, 12);
  ctx.fillStyle = "#171414";
  ctx.fillRect(Math.round(x + 8), Math.round(y + 12), 8, 9);
  ctx.fillStyle = "#d8b45a";
  ctx.fillRect(Math.round(x + 11), Math.round(y + 10), 2, 2);
}

function drawBuilding(sx, sy, building, palette) {
  const w = building.w * TILE;
  const h = building.h * TILE;
  const roof = palette.roof;
  const wood = palette.wood;
  const phase = getDayPhase();
  const night = phase.name === "night";
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(sx + 6, sy + h - 8, w - 8, 10);
  ctx.fillStyle = "#1c2038";
  ctx.fillRect(sx + 8, sy + 32, w - 16, h - 38);
  ctx.fillStyle = night ? wood : phase.name === "dusk" ? "#a35e49" : phase.name === "dawn" ? "#b9855b" : "#b37447";
  ctx.fillRect(sx + 12, sy + 39, w - 24, h - 48);
  ctx.fillStyle = "rgba(255,230,170,0.1)";
  ctx.fillRect(sx + 14, sy + 41, w - 30, 4);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(sx + 12, sy + h - 18, w - 24, 10);
  ctx.fillStyle = "#2b3155";
  ctx.fillRect(sx + 4, sy + 24, w - 8, 18);
  ctx.fillStyle = night ? roof : phase.name === "dusk" ? "#5b3e62" : "#4b4b70";
  ctx.beginPath();
  ctx.moveTo(sx + w / 2, sy + 4);
  ctx.lineTo(sx + w - 2, sy + 30);
  ctx.lineTo(sx + 2, sy + 30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(sx + w / 2 - 12, sy + 13, 24, 3);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.fillRect(sx + w - 26, sy + 24, 18, 7);
  ctx.fillStyle = "#9aa6dc";
  ctx.fillRect(sx + 10, sy + 28, w - 20, 3);
  ctx.fillStyle = "#e7b45f";
  for (let x = sx + 18; x < sx + w - 18; x += 34) {
    ctx.fillRect(x, sy + 52, 8, 8);
    if (night) {
      ctx.fillStyle = "rgba(231,180,95,0.35)";
      ctx.fillRect(x - 4, sy + 49, 16, 14);
    }
    ctx.fillStyle = "#e7b45f";
  }
  const doorX = sx + w / 2 - 10;
  ctx.fillStyle = "#21181d";
  ctx.fillRect(doorX, sy + h - 36, 20, 32);
  ctx.fillStyle = "#f2c16d";
  ctx.fillRect(doorX + 8, sy + h - 23, 4, 4);
  ctx.fillStyle = "#c7a36f";
  ctx.fillRect(doorX - 10, sy + h - 5, 40, 5);
  if (building.kind === "tower") {
    ctx.fillStyle = roof;
    for (let i = 0; i < 3; i += 1) {
      const py = sy + 8 + i * 42;
      ctx.fillRect(sx + 4, py + 16, w - 8, 7);
      ctx.beginPath();
      ctx.moveTo(sx + w / 2, py);
      ctx.lineTo(sx + w - 1, py + 17);
      ctx.lineTo(sx + 1, py + 17);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawLantern(sx, sy) {
  const phase = getDayPhase().name;
  const baseGlow = phase === "night" ? 0.35 : phase === "dusk" || phase === "dawn" ? 0.26 : 0.12;
  const glow = baseGlow + Math.sin(worldTime * 5 + sx * 0.1) * 0.08;
  ctx.fillStyle = `rgba(255,180,72,${glow})`;
  ctx.fillRect(sx - 4, sy + 2, 32, 28);
  ctx.fillStyle = "#2a2430";
  ctx.fillRect(sx + 10, sy + 4, 3, 16);
  ctx.fillStyle = "#f2bd61";
  ctx.fillRect(sx + 7, sy + 9, 9, 9);
  ctx.fillStyle = "#fff0a8";
  ctx.fillRect(sx + 10, sy + 11, 3, 4);
}

function drawPine(sx, sy) {
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(sx + 5, sy + 59, 28, 5);
  ctx.fillStyle = "#102c34";
  ctx.fillRect(sx + 17, sy + 27, 6, 34);
  ctx.fillStyle = "#18505a";
  ctx.fillRect(sx + 6, sy + 24, 28, 19);
  ctx.fillStyle = "#0d3942";
  ctx.fillRect(sx + 2, sy + 37, 36, 17);
  ctx.fillStyle = "#72a7a5";
  ctx.fillRect(sx + 10, sy + 27, 5, 2);
  ctx.fillRect(sx + 24, sy + 39, 5, 2);
}

function drawGate(sx, sy, gate, palette) {
  const w = gate.w * TILE;
  ctx.fillStyle = "#202640";
  ctx.fillRect(sx + 8, sy + 36, w - 16, 28);
  ctx.fillStyle = palette.roof;
  ctx.beginPath();
  ctx.moveTo(sx + w / 2, sy + 4);
  ctx.lineTo(sx + w - 3, sy + 34);
  ctx.lineTo(sx + 3, sy + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#9aa6dc";
  ctx.fillRect(sx + 16, sy + 31, w - 32, 4);
  ctx.fillStyle = "#18151b";
  ctx.fillRect(sx + w / 2 - 22, sy + 40, 44, 31);
}

function drawPortalRing(sx, sy) {
  const pulse = Math.sin(worldTime * 4) * 2;
  ctx.fillStyle = "rgba(100,220,240,0.22)";
  ctx.fillRect(sx + 10 - pulse, sy + 10 - pulse, 52 + pulse * 2, 52 + pulse * 2);
  ctx.strokeStyle = "#b7f4ee";
  ctx.lineWidth = 3;
  ctx.strokeRect(sx + 13, sy + 13, 46, 46);
  ctx.strokeStyle = "#75c7d8";
  ctx.strokeRect(sx + 22, sy + 22, 28, 28);
  ctx.lineWidth = 1;
}

function drawStall(sx, sy) {
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(sx + 3, sy + 33, 42, 5);
  ctx.fillStyle = "#64372f";
  ctx.fillRect(sx + 6, sy + 19, 36, 17);
  ctx.fillStyle = "#8c503c";
  ctx.fillRect(sx + 8, sy + 21, 32, 4);
  ctx.fillStyle = "#d9a158";
  ctx.fillRect(sx + 3, sy + 12, 42, 8);
  ctx.fillStyle = "#f2d07a";
  for (let x = 5; x < 44; x += 10) ctx.fillRect(sx + x, sy + 12, 5, 8);
  ctx.fillStyle = "#8fd27d";
  ctx.fillRect(sx + 11, sy + 25, 6, 4);
  ctx.fillStyle = "#d86b5e";
  ctx.fillRect(sx + 23, sy + 24, 5, 5);
  ctx.fillStyle = "#70a8d8";
  ctx.fillRect(sx + 33, sy + 24, 5, 5);
  if (getDayPhase().name !== "day") {
    ctx.fillStyle = "rgba(255,188,92,0.25)";
    ctx.fillRect(sx + 2, sy + 18, 44, 22);
  }
}

function drawRestaurantSign(sx, sy) {
  ctx.fillStyle = "rgba(0,0,0,0.34)";
  ctx.fillRect(sx + 4, sy + 45, 72, 5);
  ctx.fillStyle = "#36233a";
  ctx.fillRect(sx + 12, sy + 18, 56, 30);
  ctx.fillStyle = "#5d3d45";
  ctx.fillRect(sx + 15, sy + 21, 50, 6);
  ctx.fillStyle = "#9a633b";
  ctx.fillRect(sx + 8, sy + 13, 64, 8);
  ctx.fillStyle = "#f0c36b";
  ctx.fillRect(sx + 24, sy + 23, 32, 13);
  ctx.fillStyle = "#2b2118";
  ctx.fillRect(sx + 30, sy + 27, 20, 5);
  ctx.fillStyle = "#f6df91";
  ctx.fillRect(sx + 17, sy + 34, 8, 8);
  ctx.fillRect(sx + 58, sy + 34, 8, 8);
  if (getDayPhase().name !== "day") {
    ctx.fillStyle = "rgba(246,196,104,0.24)";
    ctx.fillRect(sx + 8, sy + 20, 64, 30);
  }
}

function drawBeast(x, y, beast) {
  const px = Math.round(x + 3);
  const py = Math.round(y + 8);
  const step = Math.floor((beast.walkTime || worldTime) * 7) % 2;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(px + 1, py + 15, 20, 4);
  ctx.fillStyle = "#151219";
  ctx.fillRect(px + 3, py + 7, 17, 10);
  ctx.fillStyle = "#2b2630";
  ctx.fillRect(px + 4, py + 6, 15, 10);
  ctx.fillStyle = getDayPhase().name === "night" ? "#4e4455" : "#6a5968";
  ctx.fillRect(px + 7, py + 2, 9, 7);
  ctx.fillStyle = "#746477";
  ctx.fillRect(px + 9, py + 3, 5, 2);
  ctx.fillStyle = "#1a171e";
  ctx.fillRect(px + 2, py + 8, 5, 5);
  ctx.fillRect(px + 16, py + 7, 6, 4);
  ctx.fillStyle = "#d8b45a";
  ctx.fillRect(px + 8, py + 5, 2, 2);
  ctx.fillRect(px + 14, py + 5, 2, 2);
  ctx.fillStyle = "#b76b56";
  ctx.fillRect(px + 18, py + 10, 5, 2);
  ctx.fillStyle = "#151217";
  ctx.fillRect(px + 5, py + 15, 4, 3 + step);
  ctx.fillRect(px + 14, py + 15, 4, 4 - step);
  ctx.fillStyle = "#b7b39f";
  ctx.font = "9px sans-serif";
  ctx.fillText(beast.name[0], px + 8, py + 14);
}

function drawSky(object) {
  const seed = object.seed || 1;
  const phase = getDayPhase();
  const night = phase.name === "night";
  ctx.fillStyle = night ? "#12131c" : "#89a7c6";
  ctx.fillRect(0, 0, canvas.width, Math.max(48, canvas.height * 0.18));
  if (night) {
    for (let i = 0; i < 80; i += 1) {
      const x = Math.floor(noise(seed + i, i, 3) * canvas.width);
      const y = Math.floor(noise(seed + i, 7, i) * 120);
      const bright = noise(seed + i, 11, 13) > 0.75;
      ctx.fillStyle = bright ? "#d7dcff" : "#5e68cb";
      ctx.fillRect(x, y, bright ? 2 : 1, bright ? 2 : 1);
    }
  } else if (phase.name === "day") {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(70, 34, 54, 10);
    ctx.fillRect(95, 26, 42, 10);
    ctx.fillStyle = "rgba(255,228,144,0.38)";
    ctx.fillRect(canvas.width - 118, 34, 34, 34);
  } else {
    ctx.fillStyle = phase.name === "dusk" ? "rgba(255,138,76,0.35)" : "rgba(255,210,146,0.28)";
    ctx.fillRect(55, 38, 78, 9);
    ctx.fillRect(100, 28, 48, 8);
  }
  ctx.fillStyle = night ? "#314080" : phase.name === "dusk" ? "#7a587e" : "#6b7fa6";
  for (let x = -40; x < canvas.width + 80; x += 70) {
    const base = 132 + Math.sin((x + object.seed) * 0.04) * 12;
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.lineTo(x + 34, base - 42);
    ctx.lineTo(x + 78, base);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCharacter(x, y, sprite) {
  const px = Math.round(x + 4);
  const py = Math.round(y + 2);
  const step = sprite.walking ? (Math.floor((sprite.walkTime || worldTime) * 8) % 2 === 0 ? -1 : 1) : 0;
  const facing = sprite.facing || "down";
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(px + 1, py + 19, 14, 3);

  ctx.fillStyle = sprite.skin;
  ctx.fillRect(px + 5, py + 4, 7, 7);
  ctx.fillStyle = sprite.hair;
  if (facing === "up") {
    ctx.fillRect(px + 4, py + 2, 9, 8);
  } else {
    ctx.fillRect(px + 4, py + 2, 9, 4);
    ctx.fillRect(px + 3, py + 5, 3, 4);
    ctx.fillRect(px + 11, py + 5, 3, 4);
  }
  if (facing === "down") {
    ctx.fillStyle = "#1d1a16";
    ctx.fillRect(px + 6, py + 7, 2, 2);
    ctx.fillRect(px + 10, py + 7, 2, 2);
  } else if (facing === "left") {
    ctx.fillStyle = "#1d1a16";
    ctx.fillRect(px + 5, py + 7, 2, 2);
  } else if (facing === "right") {
    ctx.fillStyle = "#1d1a16";
    ctx.fillRect(px + 11, py + 7, 2, 2);
  }

  ctx.fillStyle = sprite.tunic;
  ctx.fillRect(px + 4, py + 11, 10, 7);
  ctx.fillStyle = "#2f3d55";
  if (facing === "left") {
    ctx.fillRect(px + 4, py + 18, 4, 4 + Math.max(0, step));
    ctx.fillRect(px + 10, py + 18, 4, 3 - Math.min(0, step));
  } else if (facing === "right") {
    ctx.fillRect(px + 4, py + 18, 4, 3 - Math.min(0, step));
    ctx.fillRect(px + 10, py + 18, 4, 4 + Math.max(0, step));
  } else {
    ctx.fillRect(px + 4, py + 18, 4, 4 + Math.max(0, step));
    ctx.fillRect(px + 10, py + 18, 4, 4 - Math.max(0, step));
  }
  ctx.fillStyle = "#151515";
  ctx.fillRect(px + 3, py + 21, 5, 2);
  ctx.fillRect(px + 10, py + 21, 5, 2);
  if (sprite.label) {
    ctx.fillStyle = "#101010";
    ctx.font = "10px sans-serif";
    ctx.fillText(sprite.label, px + 5, py + 16);
  }
}

function drawPlayerSprite(x, y, player, options = {}) {
  const scale = options.scale || 1;
  const px = Math.round(x + (options.offsetX ?? 1));
  const py = Math.round(y - (options.large ? 6 : 3));
  const facing = player.facing || "down";
  const walking = Boolean(player.walking);
  const step = walking ? (Math.floor((player.walkTime || worldTime) * 9) % 2 === 0 ? -1 : 1) : 0;
  ctx.save();
  ctx.translate(px, py);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(3, 27, 18, 4);

  ctx.fillStyle = "#080607";
  ctx.fillRect(3, 6, 18, 24);
  ctx.fillRect(0, 12, 6, 16);
  ctx.fillRect(18, 12, 6, 16);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(2, 21, 20, 7);
  ctx.fillStyle = "#1d1615";
  ctx.fillRect(5, 1, 14, 10);
  ctx.fillRect(3, 7, 19, 10);
  ctx.fillStyle = "#342622";
  ctx.fillRect(7, 3, 10, 3);
  ctx.fillRect(15, 8, 5, 3);
  ctx.fillStyle = "#604d46";
  ctx.fillRect(8, 2, 5, 1);
  ctx.fillRect(18, 13, 2, 8);
  ctx.fillRect(4, 15, 2, 8);
  ctx.fillStyle = "#d6c5aa";
  ctx.fillRect(2, 12, 3, 14);
  ctx.fillRect(19, 12, 3, 14);
  ctx.fillStyle = "#f6e6e8";
  ctx.fillRect(8, 9, 8, 9);
  ctx.fillRect(7, 13, 10, 5);
  ctx.fillStyle = "#f9f1f1";
  ctx.fillRect(10, 10, 5, 5);
  ctx.fillStyle = "#e8cdd0";
  ctx.fillRect(8, 17, 8, 2);
  ctx.fillStyle = "#d6aeb7";
  ctx.fillRect(7, 14, 2, 3);
  ctx.fillRect(16, 14, 2, 3);

  if (facing === "up") {
    ctx.fillStyle = "#120f10";
    ctx.fillRect(5, 6, 15, 16);
    ctx.fillStyle = "#312523";
    ctx.fillRect(7, 7, 10, 5);
    ctx.fillStyle = "#ead8c8";
    ctx.fillRect(3, 11, 2, 12);
    ctx.fillRect(19, 11, 2, 12);
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(7, 12, 5, 4);
    ctx.fillRect(14, 12, 5, 4);
    ctx.fillStyle = "#6aa5bd";
    ctx.fillRect(facing === "right" ? 15 : 8, 13, 3, 2);
    ctx.fillRect(facing === "left" ? 8 : 15, 13, 3, 2);
    ctx.fillStyle = "#bfe4ee";
    ctx.fillRect(facing === "right" ? 16 : 9, 13, 1, 1);
    ctx.fillRect(facing === "left" ? 9 : 16, 13, 1, 1);
    ctx.fillStyle = "#ffdce2";
    ctx.fillRect(6, 15, 3, 2);
    ctx.fillRect(17, 15, 3, 2);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(9, 11, 2, 1);
    ctx.fillRect(16, 11, 2, 1);
  }

  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(5, 18, 15, 11);
  ctx.fillStyle = "#202024";
  ctx.fillRect(7, 19, 11, 2);
  ctx.fillRect(8, 23, 9, 2);
  ctx.fillStyle = "#383844";
  ctx.fillRect(7, 18, 5, 1);
  ctx.fillRect(16, 19, 2, 8);
  ctx.fillStyle = "#050506";
  ctx.fillRect(5, 25, 15, 4);
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(8, 18, 3, 3);
  ctx.fillRect(15, 18, 3, 3);
  ctx.fillRect(11, 21, 4, 2);
  ctx.fillRect(6, 24, 3, 2);
  ctx.fillRect(17, 24, 3, 2);
  ctx.fillStyle = "#d7a75b";
  ctx.fillRect(18, 22, 2, 6);
  ctx.fillStyle = "#f1c977";
  ctx.fillRect(18, 22, 1, 3);
  ctx.fillStyle = "#d2b98c";
  ctx.fillRect(3, 12, 2, 13);
  ctx.fillRect(20, 12, 2, 13);

  ctx.fillStyle = "#161616";
  if (facing === "left") {
    ctx.fillRect(7, 27, 5, 5 + Math.max(0, step));
    ctx.fillRect(14, 27, 5, 4 - Math.min(0, step));
  } else if (facing === "right") {
    ctx.fillRect(7, 27, 5, 4 - Math.min(0, step));
    ctx.fillRect(14, 27, 5, 5 + Math.max(0, step));
  } else {
    ctx.fillRect(7, 27, 5, 5 + Math.max(0, step));
    ctx.fillRect(14, 27, 5, 5 - Math.max(0, step));
  }
  ctx.fillStyle = "#f2f0ea";
  ctx.fillRect(12, 26, 2, 6);
  ctx.fillStyle = "#4b3d39";
  ctx.fillRect(15, 26, 2, 6);
  ctx.fillStyle = "#070707";
  ctx.fillRect(6, 31, 7, 2);
  ctx.fillRect(13, 31, 7, 2);

  ctx.fillStyle = "#f5f0e6";
  ctx.fillRect(7, 0, 12, 3);
  ctx.fillStyle = "#cfc9c0";
  ctx.fillRect(10, 1, 3, 2);
  ctx.fillStyle = "#2b211e";
  ctx.fillRect(10, -1, 8, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(6, 5, 3, 3);
  ctx.fillRect(18, 9, 3, 4);
  ctx.fillRect(3, 16, 2, 3);
  ctx.fillRect(20, 18, 2, 3);
  ctx.fillStyle = "#c9b8a0";
  ctx.fillRect(2, 24, 2, 3);
  ctx.fillRect(20, 24, 2, 3);
  ctx.restore();
}

function drawBattleOverlay() {
  const battle = state.inBattle;
  const enemy = battle.enemy;
  ctx.fillStyle = "rgba(10, 12, 10, 0.84)";
  ctx.fillRect(16, canvas.height - 170, canvas.width - 32, 154);
  ctx.strokeStyle = "#d8b45a";
  ctx.strokeRect(18, canvas.height - 168, canvas.width - 36, 150);

  drawPlayerBattlePortrait(60, canvas.height - 136);
  drawBattlePortrait(canvas.width - 112, canvas.height - 132, {
    tunic: "#5f447a",
    hair: "#2a1e32",
    skin: "#f2dfaa",
    facing: "left",
  });

  ctx.fillStyle = "#f0ead7";
  ctx.font = "16px Microsoft YaHei, sans-serif";
  ctx.fillText(`第 ${battle.round} 回合 · ${battle.spar ? "切磋" : "生死战"}`, 34, canvas.height - 142);
  ctx.fillText(`你  气血 ${Math.max(0, Math.round(state.player.hp))}/${state.player.maxHp}  灵力 ${Math.round(state.player.mp)}/${state.player.maxMp}`, 118, canvas.height - 112);
  ctx.fillText(`${enemy.name}（${realms[enemy.realm]}） 气血 ${Math.max(0, Math.round(battle.enemyHp))}/${enemy.maxHp}`, 118, canvas.height - 86);
  drawMiniBar(118, canvas.height - 104, 260, 8, state.player.hp / state.player.maxHp, "#6fc17b");
  drawMiniBar(118, canvas.height - 78, 260, 8, battle.enemyHp / enemy.maxHp, "#d96b5f");

  ctx.fillStyle = "#d8b45a";
  ctx.fillText(`敌方意图：${intentText(battle.intent)}`, 420, canvas.height - 112);
  ctx.fillStyle = "#f0ead7";
  ctx.fillText("J 普攻  K 功法  L 符咒  H 丹药", 420, canvas.height - 84);
  ctx.fillStyle = "#b7b39f";
  ctx.font = "13px Microsoft YaHei, sans-serif";
  ctx.fillText(battle.message, 34, canvas.height - 42);
}

function drawHudHints() {
  ctx.fillStyle = "rgba(12,14,12,0.72)";
  ctx.fillRect(14, 14, state.inBattle ? 470 : 560, 34);
  ctx.fillStyle = "#f0ead7";
  ctx.font = "14px Microsoft YaHei, sans-serif";
  const phase = getDayPhase();
  ctx.fillText(state.inBattle ? "类回合制战斗：J普攻 K功法 L符咒 H丹药" : `WASD/方向键移动  E交互  B背包  C角色  M集市  ${phase.label} ${phase.remaining}s`, 28, 36);
}

function drawDayNightOverlay() {
  const phase = getDayPhase();
  ctx.fillStyle = phase.tint;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (phase.name === "night") {
    ctx.fillStyle = "rgba(78, 92, 170, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (phase.name === "dusk") {
    ctx.fillStyle = "rgba(112, 54, 90, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (phase.name === "dawn") {
    ctx.fillStyle = "rgba(255, 236, 190, 0.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawMiniMap() {
  const map = getMap();
  const size = 164;
  const x0 = canvas.width - size - 16;
  const y0 = 16;
  const scale = size / MAP_SIZE;
  ctx.fillStyle = "rgba(12, 14, 18, 0.78)";
  ctx.fillRect(x0 - 6, y0 - 6, size + 12, size + 28);
  ctx.strokeStyle = "#d8b45a";
  ctx.strokeRect(x0 - 6, y0 - 6, size + 12, size + 28);
  for (let y = 0; y < MAP_SIZE; y += 3) {
    for (let x = 0; x < MAP_SIZE; x += 3) {
      ctx.fillStyle = miniTileColor(map.tiles[y][x]);
      ctx.fillRect(x0 + Math.floor(x * scale), y0 + Math.floor(y * scale), Math.ceil(3 * scale), Math.ceil(3 * scale));
    }
  }
  areas[state.area].portals.forEach((portal) => drawMiniPoint(x0, y0, scale, portal.x, portal.y, "#76f0ff", 3));
  (map.objects || []).forEach((object) => {
    if (object.type === "stall") drawMiniPoint(x0, y0, scale, object.x + 1, object.y + 1, "#f0c75d", 2);
    if (object.type === "restaurant") drawMiniPoint(x0, y0, scale, object.x + 2, object.y + 1, "#ff8b5f", 2);
  });
  (map.npcs || []).forEach((npc) => drawMiniPoint(x0, y0, scale, npc.x, npc.y, "#8fd7ff", 2));
  (map.beasts || []).forEach((beast) => {
    if (beast.hp > 0 && isBeastActive(beast)) drawMiniPoint(x0, y0, scale, beast.x, beast.y, "#ff5555", 2);
  });
  drawMiniPoint(x0, y0, scale, state.player.x, state.player.y, "#ffffff", 3);
  ctx.fillStyle = "#f0ead7";
  ctx.font = "12px Microsoft YaHei, sans-serif";
  ctx.fillText("小地图  敌:红  NPC:蓝  市:黄  酒:橙", x0, y0 + size + 16);
}

function miniTileColor(tile) {
  if (tile === "water") return "#2f68b8";
  if (tile === "forest") return "#1f6b53";
  if (tile === "mountain" || tile === "farMountain") return "#4f5f89";
  if (tile === "plaza" || tile === "town") return "#9d96bc";
  if (tile === "road" || tile === "bridge" || tile === "pass") return "#b7a577";
  if (tile === "portal") return "#6ee9ff";
  if (tile === "wall") return "#5c5f7d";
  return "#486b58";
}

function drawMiniPoint(x0, y0, scale, x, y, color, radius) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x0 + x * scale) - radius, Math.round(y0 + y * scale) - radius, radius * 2, radius * 2);
}

function drawMiniBar(x, y, w, h, ratio, color) {
  ctx.fillStyle = "#161916";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, Math.min(w, w * ratio)), h);
}

function drawBattlePortrait(x, y, sprite) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(2, 2);
  drawCharacter(0, 0, { ...sprite, walking: false, walkTime: 0, label: "" });
  ctx.restore();
}

function drawPlayerBattlePortrait(x, y) {
  drawPlayerSprite(x, y, { facing: "right", walking: false, walkTime: 0 }, { scale: 2, large: true, offsetX: 0 });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function update(dt) {
  if (state.inBattle) return;
  state.dayNightTimer = (state.dayNightTimer || 0) + dt;
  const p = state.player;
  let vx = 0;
  let vy = 0;
  if (keys.has("arrowup") || keys.has("w")) vy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) vy += 1;
  if (keys.has("arrowleft") || keys.has("a")) vx -= 1;
  if (keys.has("arrowright") || keys.has("d")) vx += 1;
  if (vx && vy) {
    vx *= 0.707;
    vy *= 0.707;
  }
  if (Math.abs(vx) > Math.abs(vy) && vx !== 0) p.facing = vx > 0 ? "right" : "left";
  else if (vy !== 0) p.facing = vy > 0 ? "down" : "up";
  p.walking = Boolean(vx || vy);
  if (p.walking) p.walkTime += dt;
  const speed = (p.speed + 68) * dt;
  movePlayer(vx * speed, vy * speed);
  updateNpcs(dt);
}

function movePlayer(dx, dy) {
  if (!dx && !dy) return;
  const p = state.player;
  const nextX = clamp(p.px + dx, 0, MAP_SIZE * TILE - TILE);
  const nextY = clamp(p.py + dy, 0, MAP_SIZE * TILE - TILE);
  const tx = Math.round(nextX / TILE);
  const ty = Math.round(nextY / TILE);
  if (inBounds(tx, ty) && !isBlockedAt(getMap(), tx, ty)) {
    p.px = nextX;
    p.py = nextY;
    syncPlayerTile();
    maybeDiscoverCave();
    updateAreaUi();
  }
}

function updateNpcs(dt) {
  const rand = Math.random;
  const map = getMap();
  map.npcs.forEach((npc) => {
    npc.dirTimer -= dt;
    if (npc.dirTimer <= 0) {
      npc.dirTimer = 0.8 + rand() * 2.4;
      const dirs = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
      const dir = choice(rand, dirs);
      npc.dx = dir[0];
      npc.dy = dir[1];
      if (npc.dx > 0) npc.facing = "right";
      else if (npc.dx < 0) npc.facing = "left";
      else if (npc.dy > 0) npc.facing = "down";
      else if (npc.dy < 0) npc.facing = "up";
    }
    if (rand() < 0.02 && distance(npc.x, npc.y, state.player.x, state.player.y) < 7 && npc.realm > state.player.realm) {
      startBattle(npc, false);
    }
    const nx = npc.x + npc.dx;
    const ny = npc.y + npc.dy;
    if (inBounds(nx, ny) && !isBlockedAt(map, nx, ny) && rand() < dt * 0.7) {
      npc.x = nx;
      npc.y = ny;
      npc.walkTime += dt;
    }
  });
  updateBeasts(dt);
}

function updateBeasts(dt) {
  const rand = Math.random;
  const map = getMap();
  const lowActivity = isLowBeastActivity();
  (map.beasts || []).forEach((beast, index) => {
    if (beast.hp <= 0) return;
    if (lowActivity && index % 5 !== 0) return;
    beast.dirTimer -= dt;
    if (beast.dirTimer <= 0) {
      beast.dirTimer = 0.5 + rand() * 1.4;
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]];
      const dir = choice(rand, dirs);
      beast.dx = dir[0];
      beast.dy = dir[1];
      if (beast.dx > 0) beast.facing = "right";
      else if (beast.dx < 0) beast.facing = "left";
      else if (beast.dy > 0) beast.facing = "down";
      else if (beast.dy < 0) beast.facing = "up";
    }
    if (distance(beast.x, beast.y, state.player.x, state.player.y) <= (lowActivity ? 0 : 1)) {
      startBattle(beast, false);
      return;
    }
    const nx = beast.x + beast.dx;
    const ny = beast.y + beast.dy;
    if (inBounds(nx, ny) && !isBlockedAt(map, nx, ny) && !isInAnyTown(state.area, nx, ny) && rand() < dt * 1.15) {
      beast.x = nx;
      beast.y = ny;
      beast.walkTime += dt;
    }
  });
}

function isNight() {
  return getDayPhase().name === "night";
}

function getDayPhase() {
  const cycle = DAY_NIGHT_SECONDS * 2;
  const t = ((state?.dayNightTimer || 0) % cycle + cycle) % cycle;
  if (t < DAY_NIGHT_SECONDS - TRANSITION_SECONDS) {
    return { name: "day", label: "白天", tint: "rgba(255, 224, 156, 0.12)", light: 1, remaining: Math.ceil(DAY_NIGHT_SECONDS - TRANSITION_SECONDS - t) };
  }
  if (t < DAY_NIGHT_SECONDS) {
    const p = (t - (DAY_NIGHT_SECONDS - TRANSITION_SECONDS)) / TRANSITION_SECONDS;
    return { name: "dusk", label: "黄昏", tint: `rgba(255, 132, 78, ${0.12 + p * 0.14})`, light: 1 - p * 0.35, remaining: Math.ceil(DAY_NIGHT_SECONDS - t) };
  }
  if (t < DAY_NIGHT_SECONDS * 2 - TRANSITION_SECONDS) {
    return { name: "night", label: "夜晚", tint: "rgba(7, 10, 28, 0.28)", light: 0.55, remaining: Math.ceil(DAY_NIGHT_SECONDS * 2 - TRANSITION_SECONDS - t) };
  }
  const p = (t - (DAY_NIGHT_SECONDS * 2 - TRANSITION_SECONDS)) / TRANSITION_SECONDS;
  return { name: "dawn", label: "黎明", tint: `rgba(255, 188, 126, ${0.22 - p * 0.1})`, light: 0.62 + p * 0.38, remaining: Math.ceil(DAY_NIGHT_SECONDS * 2 - t) };
}

function isLowBeastActivity() {
  const phase = getDayPhase().name;
  return phase === "day" || phase === "dawn";
}

function isInAnyTown(areaIndex, x, y) {
  return areas[areaIndex].towns.some((town) => distance(town.x, town.y, x, y) <= 15);
}

function isBeastActive(beast) {
  if (!isLowBeastActivity()) return true;
  const index = Number(String(beast.id || "0").split("-").pop()) || 0;
  return index % 5 === 0;
}

function maybeDiscoverCave() {
  getMap().caves.forEach((cave) => {
    if (!cave.found && distance(cave.x, cave.y, state.player.x, state.player.y) <= 2) {
      cave.found = true;
      showToast(`发现${cave.name}`);
      addLog(`你拨开藤蔓，发现了${cave.name}的入口。`);
    }
  });
}

function interact() {
  if (state.inBattle) return;
  const service = nearbyServiceObject();
  if (service) {
    if (service.type === "stall") {
      activatePanel("market");
      showToast("摊位已打开");
      updateMarket();
    } else if (service.type === "restaurant") {
      openRestaurantModal(service);
    }
    return;
  }
  const beast = (getMap().beasts || []).find((item) => item.hp > 0 && isBeastActive(item) && distance(item.x, item.y, state.player.x, state.player.y) <= 1);
  if (beast) {
    startBattle(beast, false);
    return;
  }
  const npc = getMap().npcs.find((person) => distance(person.x, person.y, state.player.x, state.player.y) <= 1);
  if (npc) {
    openNpcModal(npc);
    return;
  }
  const portal = areas[state.area].portals.find((item) => distance(item.x, item.y, state.player.x, state.player.y) <= 1);
  if (portal) {
    openPortalModal(portal);
    return;
  }
  const cave = getMap().caves.find((item) => item.found && distance(item.x, item.y, state.player.x, state.player.y) <= 1);
  if (cave) {
    openCaveModal(cave);
    return;
  }
  const town = currentTown();
  if (town) {
    openTownModal(town);
    return;
  }
  showToast("附近没有可交互对象");
}

function openModal(title, bodyHtml, actions) {
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalBody").innerHTML = bodyHtml;
  const actionBox = document.getElementById("modalActions");
  actionBox.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.textContent = action.label;
    if (action.primary) button.classList.add("primary");
    button.onclick = action.run;
    actionBox.appendChild(button);
  });
  document.getElementById("interactionModal").hidden = false;
}

function closeModal() {
  document.getElementById("interactionModal").hidden = true;
  modalContext = null;
}

function openNpcModal(npc) {
  modalContext = npc;
  const goods = npc.items.map((item) => `${item.name} ${item.rarity}`).join("、") || "无";
  openModal(
    `${npc.name} · ${realms[npc.realm]}`,
    `<div class="npc-line">好感：${npc.favor}<br>气血：${npc.hp}/${npc.maxHp}<br>携带：${goods}</div>`,
    [
      { label: "对话", run: () => talkNpc(npc) },
      { label: "交易", run: () => tradeNpc(npc) },
      { label: "切磋", run: () => { closeModal(); startBattle(npc, true); } },
      { label: "战斗夺物", run: () => { closeModal(); startBattle(npc, false); } },
      { label: "赠送物品", run: () => giftNpc(npc) },
    ],
  );
}

function talkNpc(npc) {
  const lines = [
    "大道无情，修行也讲人情。你若常行善缘，机缘自会近身。",
    "近来洞府禁制松动，山林间多有异光。",
    "集市上偶尔会有仙品残卷，不过价格不低。",
  ];
  npc.favor += 3;
  addLog(`${npc.name}与你攀谈片刻，好感提升至 ${npc.favor}。`);
  document.getElementById("modalBody").innerHTML = `<div class="npc-line">${choice(Math.random, lines)}</div>`;
}

function tradeNpc(npc) {
  const body = npc.items.map((item, index) => (
    `<div class="loot-line"><strong>${item.name}</strong>${item.type} · ${item.rarity}<br>要价 ${Math.max(1, Math.round(item.price * 0.85))} 灵石 <button data-buy-npc="${index}">购买</button></div>`
  )).join("") || "<div class='muted'>对方没有可交易物品。</div>";
  document.getElementById("modalBody").innerHTML = body;
  document.querySelectorAll("[data-buy-npc]").forEach((button) => {
    button.onclick = () => buyFromNpc(npc, Number(button.dataset.buyNpc));
  });
}

function buyFromNpc(npc, index) {
  const item = npc.items[index];
  if (!item) return;
  const price = Math.max(1, Math.round(item.price * 0.85));
  if (state.player.spiritStones < price) {
    showToast("灵石不足");
    return;
  }
  state.player.spiritStones -= price;
  state.player.inventory.push(item);
  npc.items.splice(index, 1);
  addLog(`你从${npc.name}处买下${item.name}。`);
  updateUi();
  tradeNpc(npc);
}

function giftNpc(npc) {
  const giftable = state.player.inventory.filter((item) => item.type !== "功法");
  const body = giftable.map((item) => (
    `<div class="loot-line"><strong>${item.name}</strong>${item.type} · ${item.rarity}<button data-gift="${item.id}">赠送</button></div>`
  )).join("") || "<div class='muted'>没有适合赠送的物品。</div>";
  document.getElementById("modalBody").innerHTML = body;
  document.querySelectorAll("[data-gift]").forEach((button) => {
    button.onclick = () => {
      const item = removeInventoryItem(button.dataset.gift);
      if (item) {
        npc.favor += item.rarity === "仙品" ? 20 : item.rarity === "灵品" ? 10 : 5;
        addLog(`你将${item.name}赠予${npc.name}，好感提升至 ${npc.favor}。`);
        updateUi();
        openNpcModal(npc);
      }
    };
  });
}

function openPortalModal(portal) {
  const target = areas[portal.to];
  openModal(
    "传送阵",
    `<div class="npc-line">前往${target.name}需缴纳 ${portal.cost} 灵石。</div>`,
    [
      { label: "传送", primary: true, run: () => teleport(portal) },
      { label: "离开", run: closeModal },
    ],
  );
}

function openTownModal(town) {
  openModal(
    town.name,
    `<div class="npc-line">${town.name}灯火通明，坊市与客栈仍在营业。<br>交易可买卖物品，休息可恢复气血与灵力。</div>`,
    [
      { label: "交易", primary: true, run: () => { closeModal(); activatePanel("market"); updateMarket(); } },
      { label: "休息 30 灵石", run: () => restAtTown(town) },
      { label: "离开", run: closeModal },
    ],
  );
}

function nearbyServiceObject() {
  return (getMap().objects || []).find((object) => {
    if (!["stall", "restaurant"].includes(object.type)) return false;
    const cx = object.x + Math.floor(object.w / 2);
    const cy = object.y + Math.floor(object.h / 2);
    return distance(cx, cy, state.player.x, state.player.y) <= 2;
  });
}

function openRestaurantModal(service) {
  const town = currentTown();
  const name = town ? `${town.name}酒楼` : "山路酒楼";
  openModal(
    name,
    `<div class="npc-line">酒楼灯火温暖，灵米酒与药膳可助你恢复状态。</div>`,
    [
      { label: "休息 30 灵石", primary: true, run: () => restAtTown({ name }) },
      { label: "药膳 55 灵石", run: () => feastAtRestaurant(name) },
      { label: "离开", run: closeModal },
    ],
  );
}

function feastAtRestaurant(name) {
  const cost = 55;
  if (state.player.spiritStones < cost) {
    showToast("灵石不足");
    return;
  }
  state.player.spiritStones -= cost;
  state.player.hp = state.player.maxHp;
  state.player.mp = state.player.maxMp;
  addCultivation(18 + state.player.realm * 5, false);
  addLog(`你在${name}享用药膳，气血灵力恢复，修炼进度提升。`);
  closeModal();
  updateUi();
}

function restAtTown(town) {
  const cost = 30;
  if (state.player.spiritStones < cost) {
    showToast("灵石不足");
    return;
  }
  state.player.spiritStones -= cost;
  state.player.hp = state.player.maxHp;
  state.player.mp = state.player.maxMp;
  addCultivation(8 + state.player.realm * 3, false);
  addLog(`你在${town.name}休息一晚，气血与灵力完全恢复。`);
  closeModal();
  updateUi();
}

function teleport(portal) {
  if (state.player.spiritStones < portal.cost) {
    showToast("灵石不足");
    return;
  }
  state.player.spiritStones -= portal.cost;
  state.area = portal.to;
  const back = areas[state.area].portals.find((item) => item.to !== portal.to) || areas[state.area].portals[0];
  const landing = findWalkableNear(back.x, back.y);
  state.player.px = landing.x * TILE;
  state.player.py = landing.y * TILE;
  syncPlayerTile();
  closeModal();
  addLog(`你踏入传送阵，抵达${areas[state.area].name}。`);
  updateUi();
}

function openCaveModal(cave) {
  if (cave.looted) {
    openModal(cave.name, "<div class='muted'>此处已被搜寻一空。</div>", [{ label: "离开", run: closeModal }]);
    return;
  }
  openModal(
    cave.name,
    "<div class='npc-line'>洞府内残留禁制微光，石案上有尘封宝匣。</div>",
    [
      { label: "探索洞府", primary: true, run: () => lootCave(cave) },
      { label: "离开", run: closeModal },
    ],
  );
}

function lootCave(cave) {
  const rand = Math.random;
  cave.looted = true;
  const loot = [makeItem(weightedItem(rand)), makeItem(weightedItem(rand))];
  if (rand() > 0.45) loot.push(makeItem(itemTemplates.find((item) => item.name === "聚灵丹")));
  state.player.inventory.push(...loot);
  const stones = 60 + Math.floor(rand() * 120);
  state.player.spiritStones += stones;
  addCultivation(18 + Math.floor(rand() * 20), false);
  addLog(`你搜寻${cave.name}，获得 ${loot.map((item) => item.name).join("、")} 与 ${stones} 灵石。`);
  closeModal();
  updateUi();
}

function startBattle(npc, spar) {
  if (state.inBattle) return;
  if (npc.hp <= 0) {
    showToast("对方已无力再战");
    return;
  }
  state.inBattle = {
    enemy: npc,
    enemyHp: npc.hp,
    spar,
    round: 1,
    intent: chooseEnemyIntent(npc),
    shield: 0,
    message: "敌我对峙，观察对方气机后选择行动。",
  };
  addLog(`${spar ? "切磋" : "战斗"}开始：${npc.name}。`);
  showToast("类回合制：先看敌方意图，再选择行动");
}

function battleAction(type) {
  const battle = state.inBattle;
  if (!battle) return;
  const p = state.player;
  let playerDamage = 0;
  let playerGuard = 0;
  let message = "";
  if (type === "attack") {
    playerDamage = Math.max(4, p.attack - battle.enemy.defense * 0.45 + randInt(-3, 6));
    p.mp = clamp(p.mp + 6, 0, p.maxMp);
    message = `你以剑诀试探，造成 ${Math.round(playerDamage)} 点伤害，回气 6 点。`;
  } else if (type === "skill") {
    if (p.mp < 18) {
      showToast("灵力不足");
      return;
    }
    p.mp -= 18;
    playerDamage = Math.max(8, p.attack * 1.75 - battle.enemy.defense * 0.35 + randInt(0, 14));
    if (battle.intent.type === "charge") playerDamage *= 1.25;
    message = `你催动功法，造成 ${Math.round(playerDamage)} 点伤害。`;
  } else if (type === "talisman") {
    const talisman = p.inventory.find((item) => item.type === "符咒");
    if (!talisman) {
      showToast("没有可用符咒");
      return;
    }
    removeInventoryItem(talisman.id);
    if (talisman.effect.damage) playerDamage = talisman.effect.damage + p.realm * 12;
    if (talisman.effect.shield) playerGuard += talisman.effect.shield;
    message = `你掷出${talisman.name}${playerDamage ? `，造成 ${Math.round(playerDamage)} 点伤害` : ""}${playerGuard ? `，护盾增加 ${playerGuard}` : ""}。`;
  } else if (type === "pill") {
    const pill = p.inventory.find((item) => item.type === "丹药" && item.effect.hp);
    if (!pill) {
      showToast("没有回血丹药");
      return;
    }
    useItem(pill.id, true);
    playerGuard = 8 + p.realm * 4;
    message = `你服下丹药，并稳住气机，护盾增加 ${playerGuard}。`;
  }
  if (playerDamage > 0) {
    playerDamage = absorbEnemyShield(playerDamage);
    battle.enemyHp -= playerDamage;
  }
  battle.shield += playerGuard;
  if (battle.enemyHp <= 0) finishBattle(true);
  else resolveEnemyTurn(message);
  updateUi();
}

function resolveEnemyTurn(playerMessage) {
  const battle = state.inBattle;
  if (!battle) return;
  const enemy = battle.enemy;
  const intent = battle.intent;
  let enemyMessage = "";
  if (intent.type === "attack") {
    let damage = Math.max(3, enemy.attack * intent.power - state.player.defense * 0.45 + randInt(-4, 7));
    damage = absorbShield(damage);
    state.player.hp -= damage;
    enemyMessage = `${enemy.name}${intent.name}，造成 ${Math.round(damage)} 点伤害。`;
  } else if (intent.type === "skill") {
    let damage = Math.max(6, enemy.attack * intent.power - state.player.defense * 0.3 + randInt(0, 12));
    damage = absorbShield(damage);
    state.player.hp -= damage;
    enemyMessage = `${enemy.name}${intent.name}，灵压袭来，造成 ${Math.round(damage)} 点伤害。`;
  } else if (intent.type === "guard") {
    battle.enemyHp = clamp(battle.enemyHp + intent.heal, 0, enemy.maxHp);
    battle.enemyShield = (battle.enemyShield || 0) + intent.shield;
    enemyMessage = `${enemy.name}${intent.name}，回复 ${intent.heal} 气血并凝出护身罡气。`;
  } else if (intent.type === "charge") {
    battle.enemyCharged = true;
    enemyMessage = `${enemy.name}${intent.name}，下一击会更凶。`;
  }
  if (battle.enemyCharged && intent.type !== "charge") battle.enemyCharged = false;
  if (state.player.hp <= 0) {
    finishBattle(false);
    return;
  }
  battle.round += 1;
  battle.intent = chooseEnemyIntent(enemy, battle);
  battle.message = `${playerMessage} ${enemyMessage}`;
  addLog(`第 ${battle.round - 1} 回合：${playerMessage} ${enemyMessage}`);
}

function absorbShield(damage) {
  const battle = state.inBattle;
  let result = damage;
  if (battle.shield > 0) {
    const blocked = Math.min(battle.shield, result);
    battle.shield -= blocked;
    result -= blocked;
  }
  return Math.max(0, result);
}

function absorbEnemyShield(damage) {
  const battle = state.inBattle;
  let result = damage;
  if (battle.enemyShield > 0) {
    const blocked = Math.min(battle.enemyShield, result);
    battle.enemyShield -= blocked;
    result -= blocked;
  }
  return Math.max(0, result);
}

function updateBattle() {
  return;
}

function chooseEnemyIntent(enemy, battle = null) {
  if (battle?.enemyCharged) return { type: "skill", name: "爆发神通", power: 1.85 };
  const roll = Math.random();
  const pressure = enemy.realm * 0.05;
  const hpNow = battle ? battle.enemyHp : enemy.hp;
  if (roll < 0.16 && hpNow < enemy.maxHp * 0.55) return { type: "guard", name: "运功调息", heal: 12 + enemy.realm * 10, shield: 10 + enemy.realm * 8 };
  if (roll < 0.28 + pressure) return { type: "charge", name: "蓄势结印", power: 0 };
  if (roll < 0.54 + pressure) return { type: "skill", name: "施展神通", power: 1.35 + enemy.realm * 0.08 };
  return { type: "attack", name: "近身突袭", power: 0.95 + enemy.realm * 0.05 };
}

function intentText(intent) {
  if (intent.type === "attack") return "近身攻击";
  if (intent.type === "skill") return "功法爆发";
  if (intent.type === "guard") return "调息防守";
  if (intent.type === "charge") return "蓄势结印";
  return "试探";
}

function finishBattle(win) {
  const battle = state.inBattle;
  const enemy = battle.enemy;
  if (win) {
    enemy.hp = battle.spar ? Math.max(1, Math.round(enemy.maxHp * 0.35)) : 0;
    const exp = 35 + enemy.realm * 35;
    const stones = 30 + enemy.realm * 28 + randInt(0, 32);
    gainExp(exp);
    addCultivation(16 + enemy.realm * 12, false);
    state.player.spiritStones += stones;
    if (!battle.spar && enemy.items.length) {
      const loot = enemy.items.splice(0, 1)[0];
      state.player.inventory.push(loot);
      addLog(`战胜${enemy.name}，获得 ${exp} 经验、${stones} 灵石和${loot.name}。`);
    } else {
      if (typeof enemy.favor === "number") enemy.favor += battle.spar ? 4 : -15;
      addLog(`${battle.spar ? "切磋胜出" : "战斗胜利"}，获得 ${exp} 经验与 ${stones} 灵石。`);
    }
  } else {
    state.player.hp = Math.max(1, Math.round(state.player.maxHp * 0.35));
    state.player.cultivation = Math.max(0, state.player.cultivation - 18);
    addLog(`你败于${enemy.name}，调息后保住性命，修炼进度受损。`);
  }
  state.inBattle = null;
  updateUi();
}

function findWalkableNear(x, y) {
  const map = getMap();
  for (let radius = 1; radius <= 5; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (inBounds(nx, ny) && !isBlockedAt(map, nx, ny)) return { x: nx, y: ny };
      }
    }
  }
  return { x, y };
}

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function gainExp(amount) {
  const p = state.player;
  p.exp += amount;
  while (p.exp >= p.expMax) {
    p.exp -= p.expMax;
    p.level += 1;
    p.expMax = Math.round(p.expMax * 1.24);
    p.maxHp += 12;
    p.maxMp += 8;
    p.attack += 3;
    p.defense += 2;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    addLog(`等级提升至 ${p.level}。`);
  }
}

function addCultivation(amount, paid = true) {
  const p = state.player;
  p.cultivation = clamp(p.cultivation + amount, 0, p.cultivationMax);
  if (paid) addLog(`修炼进度提升 ${amount}。`);
}

function tryBreakthrough() {
  const p = state.player;
  if (p.realm >= realms.length - 1) {
    showToast("已至化神巅峰");
    return;
  }
  if (p.cultivation < p.cultivationMax) {
    showToast("修炼进度未满");
    return;
  }
  const pill = p.inventory.find((item) => item.name === "突破丹");
  const bonus = pill ? pill.effect.breakthrough : 0;
  const chance = Math.min(0.98, realmSuccess[p.realm] + bonus);
  if (pill) removeInventoryItem(pill.id);
  if (Math.random() < chance) {
    p.realm += 1;
    p.cultivation = 0;
    p.cultivationMax = Math.round(p.cultivationMax * 1.42);
    p.maxHp += 55 + p.realm * 20;
    p.maxMp += 35 + p.realm * 16;
    p.attack += 12 + p.realm * 4;
    p.defense += 9 + p.realm * 3;
    p.speed += 1;
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    if (p.realm >= 1 && !p.skills.includes("御气斩")) p.skills.push("御气斩");
    if (p.realm >= 2 && !p.skills.includes("金丹护体")) p.skills.push("金丹护体");
    addLog(`突破成功，晋入${realms[p.realm]}。`);
  } else {
    p.cultivation = Math.round(p.cultivationMax * (Math.random() < 0.5 ? 0.55 : 0.75));
    p.hp = Math.max(1, Math.round(p.hp * 0.55));
    addLog(`突破失败，经脉受创，修炼进度跌落。`);
  }
  updateUi();
}

function cultivateByStones() {
  if (state.player.spiritStones < 20) {
    showToast("灵石不足");
    return;
  }
  state.player.spiritStones -= 20;
  addCultivation(12 + state.player.realm * 4);
  updateUi();
}

function useItem(id, quiet = false) {
  const item = removeInventoryItem(id);
  if (!item) return;
  const p = state.player;
  if (item.type === "丹药" || item.type === "材料") {
    if (item.effect.hp) p.hp = clamp(p.hp + item.effect.hp, 0, p.maxHp);
    if (item.effect.cultivation) addCultivation(item.effect.cultivation, false);
    if (item.effect.breakthrough) {
      p.inventory.push(item);
      showToast("突破丹会在突破时自动使用");
      updateUi();
      return;
    }
    if (!quiet) addLog(`使用${item.name}。`);
  } else if (item.type === "功法") {
    if (!p.skills.includes(item.effect.skill)) p.skills.push(item.effect.skill);
    addLog(`参悟${item.name}，习得${item.effect.skill}。`);
  } else if (item.type === "装备") {
    equipItem(item);
  } else {
    p.inventory.push(item);
    showToast("该物品只能在战斗中使用");
  }
  updateUi();
}

function equipItem(item) {
  const p = state.player;
  const old = p.equipment[item.slot];
  if (old) {
    applyEquipment(old, -1);
    p.inventory.push(old);
  }
  p.equipment[item.slot] = item;
  applyEquipment(item, 1);
  addLog(`装备${item.name}。`);
}

function applyEquipment(item, sign) {
  const p = state.player;
  Object.entries(item.effect || {}).forEach(([key, value]) => {
    if (key === "attack") p.attack += value * sign;
    if (key === "defense") p.defense += value * sign;
    if (key === "mp") {
      p.maxMp += value * sign;
      p.mp = clamp(p.mp, 0, p.maxMp);
    }
    if (key === "speed") p.speed += value * sign;
  });
}

function removeInventoryItem(id) {
  const index = state.player.inventory.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const item = state.player.inventory[index];
  if (item.qty && item.qty > 1) {
    item.qty -= 1;
    return { ...item, qty: 1 };
  }
  return state.player.inventory.splice(index, 1)[0];
}

function buyMarketItem(index) {
  const goods = getMap().market;
  const item = goods[index];
  if (!item) return;
  if (state.player.spiritStones < item.price) {
    showToast("灵石不足");
    return;
  }
  state.player.spiritStones -= item.price;
  state.player.inventory.push(item);
  goods.splice(index, 1);
  addLog(`在集市买下${item.name}。`);
  updateUi();
}

function sellItem(id) {
  const item = removeInventoryItem(id);
  if (!item) return;
  const price = Math.max(1, Math.round(item.price * 0.48));
  state.player.spiritStones += price;
  addLog(`卖出${item.name}，获得 ${price} 灵石。`);
  updateUi();
}

function isInTown() {
  return Boolean(currentTown());
}

function currentTown() {
  return areas[state.area].towns.find((town) => distance(town.x, town.y, state.player.x, state.player.y) <= 15);
}

function activatePanel(name) {
  document.querySelectorAll(".tab").forEach((button) => button.classList.toggle("active", button.dataset.panel === name));
  document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`${name}Panel`).classList.add("active");
  if (name === "inventory") updateInventory();
  if (name === "character") updateCharacter();
  if (name === "market") updateMarket();
}

function updateUi() {
  updateAreaUi();
  updateStats();
  updateLog();
  updateCharacter();
  updateInventory();
  updateMarket();
}

function updateAreaUi() {
  const town = currentTown();
  document.getElementById("areaName").textContent = `${areas[state.area].name} · ${getDayPhase().label} · ${town ? town.name : terrainName(currentTile())}`;
}

function terrainName(tile) {
  return { grass: "夜野", forest: "幽林", mountain: "远山", farMountain: "远山", water: "水道", road: "石板路", bridge: "木桥", pass: "山道", plaza: "城镇广场", wall: "城墙", town: "城镇", portal: "传送阵" }[tile] || "荒野";
}

function updateStats() {
  const p = state.player;
  document.getElementById("realmText").textContent = realms[p.realm];
  document.getElementById("levelText").textContent = p.level;
  document.getElementById("spiritStoneText").textContent = p.spiritStones;
  document.getElementById("hpText").textContent = `${Math.round(p.hp)}/${p.maxHp}`;
  document.getElementById("mpText").textContent = `${Math.round(p.mp)}/${p.maxMp}`;
  document.getElementById("cultivationText").textContent = `${p.cultivation}/${p.cultivationMax}`;
  document.getElementById("hpBar").max = p.maxHp;
  document.getElementById("hpBar").value = p.hp;
  document.getElementById("mpBar").max = p.maxMp;
  document.getElementById("mpBar").value = p.mp;
  document.getElementById("cultivationBar").max = p.cultivationMax;
  document.getElementById("cultivationBar").value = p.cultivation;
}

function updateLog() {
  document.getElementById("log").innerHTML = state.logs.map((entry) => `<div class="log-entry">${entry}</div>`).join("");
}

function updateCharacter() {
  const p = state.player;
  const equip = Object.entries(p.equipment).map(([slot, item]) => `${slot}: ${item ? item.name : "空"}`).join("<br>");
  document.getElementById("characterInfo").innerHTML = [
    ["位阶", realms[p.realm]],
    ["等级", `${p.level}（${p.exp}/${p.expMax}）`],
    ["气血", `${Math.round(p.hp)}/${p.maxHp}`],
    ["灵力", `${Math.round(p.mp)}/${p.maxMp}`],
    ["攻击", p.attack],
    ["防御", p.defense],
    ["速度", p.speed],
    ["装备", equip],
    ["功法", p.skills.join("、")],
  ].map(([label, value]) => `<div class="info-row"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function updateInventory() {
  const grid = document.getElementById("inventoryGrid");
  const items = state.player.inventory.filter((item) => activeFilter === "all" || item.type === activeFilter);
  const slots = [...items];
  while (slots.length < 24) slots.push(null);
  grid.innerHTML = slots.slice(0, Math.max(24, slots.length)).map((item) => {
    if (!item) return `<div class="slot"></div>`;
    const color = rarityColors[item.rarity] || "#ddd";
    const useLabel = item.type === "装备" ? "装备" : item.type === "符咒" ? "战斗用" : "使用";
    return `<div class="slot">
      <strong style="color:${color}">${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}</strong>
      <span>${item.type} · ${item.rarity}</span>
      <button data-use="${item.id}">${useLabel}</button>
      <button data-sell="${item.id}">卖出</button>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-use]").forEach((button) => {
    button.onclick = () => useItem(button.dataset.use);
  });
  document.querySelectorAll("[data-sell]").forEach((button) => {
    button.onclick = () => sellItem(button.dataset.sell);
  });
}

function updateMarket() {
  const hint = document.getElementById("marketHint");
  const grid = document.getElementById("marketGrid");
  if (!isInTown()) {
    hint.textContent = "进入主城集市后可交易。";
    grid.innerHTML = "";
    return;
  }
  hint.textContent = "集市商品随机刷新，仙品最少见。";
  grid.innerHTML = getMap().market.map((item, index) => {
    const color = rarityColors[item.rarity] || "#ddd";
    return `<div class="market-item">
      <strong style="color:${color}">${item.name}</strong>
      <span>${item.type} · ${item.rarity}</span>
      <span>${item.price} 灵石</span>
      <button data-buy-market="${index}">买入</button>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-buy-market]").forEach((button) => {
    button.onclick = () => buyMarketItem(Number(button.dataset.buyMarket));
  });
}

function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ state, maps }));
  showToast("已存档");
  addLog("本地存档完成。");
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    showToast("没有存档");
    return;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    showToast("存档损坏");
    return;
  }
  if (!data.state || !data.maps) {
    showToast("存档格式无效");
    return;
  }
  state = data.state;
  maps = data.maps;
  normalizeLoadedGame();
  closeModal();
  updateUi();
  showToast("读档完成");
}

function normalizeLoadedGame() {
  state.player.facing ||= "down";
  state.player.walkTime ||= 0;
  state.player.walking = false;
  state.player.speed = Math.max(state.player.speed || 0, 9);
  state.dayNightTimer ||= 0;
  if (!maps?.[0]?.objects || !maps?.[0]?.blocked || maps?.[0]?.version !== MAP_VERSION) {
    const oldState = state;
    maps = generateMaps();
    state = oldState;
    state.area = clamp(state.area || 0, 0, areas.length - 1);
    const town = areas[state.area].towns[0];
    state.player.px = town.x * TILE;
    state.player.py = (town.y + 3) * TILE;
    syncPlayerTile();
    addLog("地图已升级为夜色仙镇新版场景。");
  }
  maps.forEach((map) => {
    map.version ||= MAP_VERSION;
    map.objects ||= [];
    map.blocked ||= map.tiles.map((row) => row.map((tile) => isBlocked(tile)));
    map.beasts ||= [];
    map.npcs.forEach((npc) => {
      npc.facing ||= "down";
      npc.walkTime ||= 0;
    });
  });
}

function bindEvents() {
  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    keys.add(key);
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    if (key === "e") interact();
    if (key === "b") activatePanel("inventory");
    if (key === "c") activatePanel("character");
    if (key === "m") activatePanel("market");
    if (key === "j") battleAction("attack");
    if (key === "k") battleAction("skill");
    if (key === "l") battleAction("talisman");
    if (key === "h") battleAction("pill");
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  document.querySelectorAll(".tab").forEach((button) => {
    button.onclick = () => activatePanel(button.dataset.panel);
  });
  document.querySelectorAll(".filter").forEach((button) => {
    button.onclick = () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button));
      updateInventory();
    };
  });
  document.getElementById("closeModal").onclick = closeModal;
  document.getElementById("breakthroughBtn").onclick = tryBreakthrough;
  document.getElementById("cultivateBtn").onclick = cultivateByStones;
  document.getElementById("saveBtn").onclick = saveGame;
  document.getElementById("loadBtn").onclick = loadGame;
  document.getElementById("newBtn").onclick = () => {
    if (confirm("开始新局会覆盖当前进度，确定吗？")) newGame();
  };
}

function loop(now) {
  const dt = Math.min(0.05, (now - lastTick) / 1000);
  lastTick = now;
  worldTime += dt;
  update(dt);
  updateBattle(dt);
  draw();
  requestAnimationFrame(loop);
}

bindEvents();
newGame();
requestAnimationFrame(loop);
