export type ItemCategory = '功法' | '丹药' | '符咒' | '装备' | '材料';
export type ItemType = 'manual' | 'spellbook' | 'consumable' | 'talisman' | 'equipment' | 'material' | 'currency';
export type EquipmentSlot = 'weapon' | 'armor' | 'talisman' | 'boots';

export interface EquipmentStats {
  hp?: number;
  mana?: number;
  attack?: number;
  defense?: number;
  speed?: number;
}

export interface ConsumableEffect {
  hp?: number;
  mana?: number;
  exp?: number;
}

export interface ItemStack {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  description: string;
  value: number;
  itemType?: ItemType;
  equipmentSlot?: EquipmentSlot;
  stats?: EquipmentStats;
  effect?: ConsumableEffect;
  spellId?: string;
}

export interface SpellDefinition {
  id: string;
  name: string;
  manaCost: number;
  power: number;
  rankRequired: number;
  description: string;
}

export interface ItemDefinition extends Omit<ItemStack, 'quantity'> {
  id: string;
}

export const SPELL_LIBRARY: SpellDefinition[] = [
  { id: 'breath-cut', name: '吐纳剑气', manaCost: 8, power: 16, rankRequired: 0, description: '凝气成刃，适合炼气初期。' },
  { id: 'fire-talisman-art', name: '离火诀', manaCost: 14, power: 28, rankRequired: 1, description: '以火行灵力灼伤敌人。' },
  { id: 'green-vine', name: '青藤缚', manaCost: 12, power: 20, rankRequired: 1, description: '木行法术，可迟滞妖兽。' },
  { id: 'thunder-spark', name: '掌心雷', manaCost: 22, power: 44, rankRequired: 2, description: '雷法入门，威力高但耗灵。' },
  { id: 'cloud-step', name: '云行术', manaCost: 10, power: 0, rankRequired: 0, description: '提高身法与闪避。' },
  { id: 'cold-moon', name: '寒月斩', manaCost: 28, power: 58, rankRequired: 3, description: '寒光凝刃，破甲效果显著。' },
  { id: 'sky-sword', name: '天衍剑诀', manaCost: 34, power: 72, rankRequired: 2, description: '太华剑宗真传剑诀，剑气纵横。' },
  { id: 'jade-cauldron-fire', name: '玉鼎丹火', manaCost: 26, power: 50, rankRequired: 1, description: '丹霞谷以丹火炼敌，亦可温养经脉。' },
  { id: 'nine-seal-thunder', name: '九箓雷符', manaCost: 38, power: 80, rankRequired: 3, description: '玄符观秘传雷箓，外人难窥全貌。' },
  { id: 'frost-mirror', name: '寒镜凝霜诀', manaCost: 32, power: 66, rankRequired: 2, description: '寒月宫绝学，霜镜一照可破敌势。' },
];

export const ITEM_LIBRARY: ItemDefinition[] = [
  { id: 'spirit-stone', name: '下品灵石', category: '材料', itemType: 'currency', description: '修士之间常用的交易媒介。', value: 1 },
  { id: 'bamboo-sword', name: '青竹剑', category: '装备', itemType: 'equipment', equipmentSlot: 'weapon', stats: { attack: 5, speed: 3 }, description: '适合炼气修士的轻剑。', value: 25 },
  { id: 'iron-sword', name: '寒铁短剑', category: '装备', itemType: 'equipment', equipmentSlot: 'weapon', stats: { attack: 11 }, description: '坊市常见的低阶武器。', value: 52 },
  { id: 'spirit-wood-staff', name: '灵木杖', category: '装备', itemType: 'equipment', equipmentSlot: 'weapon', stats: { mana: 18, attack: 6 }, description: '温润灵木制成，利于施法。', value: 68 },
  { id: 'copper-saber', name: '赤铜环首刀', category: '装备', itemType: 'equipment', equipmentSlot: 'weapon', stats: { attack: 15, defense: 2 }, description: '刀身厚重，适合近身斩妖。', value: 82 },
  { id: 'moon-sword', name: '寒月剑', category: '装备', itemType: 'equipment', equipmentSlot: 'weapon', stats: { attack: 22, mana: 10, speed: 4 }, description: '剑脊映寒光，需灵力温养。', value: 156 },
  { id: 'thunder-staff', name: '引雷木杖', category: '装备', itemType: 'equipment', equipmentSlot: 'weapon', stats: { attack: 10, mana: 32 }, description: '雷击木炼成的法杖。', value: 142 },
  { id: 'cloth-armor', name: '青布法衣', category: '装备', itemType: 'equipment', equipmentSlot: 'armor', stats: { defense: 8, hp: 20 }, description: '轻便的低阶护身法衣。', value: 28 },
  { id: 'cloud-robe', name: '行云法袍', category: '装备', itemType: 'equipment', equipmentSlot: 'armor', stats: { defense: 13, mana: 18 }, description: '内绣聚灵纹。', value: 74 },
  { id: 'stone-vest', name: '玄石护甲', category: '装备', itemType: 'equipment', equipmentSlot: 'armor', stats: { defense: 20, hp: 36, speed: -6 }, description: '沉重坚实的护甲。', value: 128 },
  { id: 'crane-robe', name: '白鹤羽衣', category: '装备', itemType: 'equipment', equipmentSlot: 'armor', stats: { defense: 16, mana: 28, speed: 8 }, description: '羽纹细密，适合法修游历。', value: 164 },
  { id: 'quiet-talisman', name: '清心符佩', category: '装备', itemType: 'equipment', equipmentSlot: 'talisman', stats: { mana: 12, defense: 3 }, description: '可安定心神。', value: 34 },
  { id: 'jade-pendant', name: '养灵玉佩', category: '装备', itemType: 'equipment', equipmentSlot: 'talisman', stats: { mana: 24, hp: 12 }, description: '温养丹田的小玉佩。', value: 86 },
  { id: 'beast-tooth-charm', name: '兽牙护符', category: '装备', itemType: 'equipment', equipmentSlot: 'talisman', stats: { attack: 6, defense: 5 }, description: '猎妖人常戴的护符。', value: 73 },
  { id: 'wind-boots', name: '踏风履', category: '装备', itemType: 'equipment', equipmentSlot: 'boots', stats: { speed: 18, defense: 2 }, description: '轻身赶路的短靴。', value: 45 },
  { id: 'stone-step-boots', name: '踏岩靴', category: '装备', itemType: 'equipment', equipmentSlot: 'boots', stats: { speed: 9, defense: 8 }, description: '鞋底嵌玄石，山路更稳。', value: 68 },
  { id: 'cloud-trace-boots', name: '流云履', category: '装备', itemType: 'equipment', equipmentSlot: 'boots', stats: { speed: 28, mana: 8 }, description: '步履轻若流云。', value: 118 },
  { id: 'qi-pill', name: '回气丹', category: '丹药', itemType: 'consumable', effect: { mana: 28 }, description: '回复少量灵力。', value: 8 },
  { id: 'blood-pill', name: '补血丹', category: '丹药', itemType: 'consumable', effect: { hp: 45 }, description: '恢复气血。', value: 10 },
  { id: 'cultivation-pill', name: '聚气丹', category: '丹药', itemType: 'consumable', effect: { exp: 35 }, description: '辅助打坐修炼。', value: 24 },
  { id: 'bone-pill', name: '淬骨丹', category: '丹药', itemType: 'consumable', effect: { exp: 52, hp: 16 }, description: '药性猛烈，可淬炼筋骨。', value: 42 },
  { id: 'spirit-return-pill', name: '回灵散', category: '丹药', itemType: 'consumable', effect: { mana: 60 }, description: '快速补充灵力的散剂。', value: 36 },
  { id: 'minor-breakthrough-pill', name: '破障丹', category: '丹药', itemType: 'consumable', effect: { exp: 90 }, description: '冲关前常用的低阶丹药。', value: 96 },
  { id: 'sect-qi-pill', name: '宗门凝气丹', category: '丹药', itemType: 'consumable', effect: { exp: 70, mana: 20 }, description: '宗门定例发放的修炼丹药，药性平稳。', value: 64 },
  { id: 'marrow-wash-pill', name: '洗髓小丹', category: '丹药', itemType: 'consumable', effect: { exp: 120, hp: 28 }, description: '内门弟子常用的筑基前丹药。', value: 138 },
  { id: 'paper-talisman', name: '镇风符', category: '符咒', itemType: 'talisman', description: '短时间稳定身法。', value: 13 },
  { id: 'fire-talisman', name: '烈火符', category: '符咒', itemType: 'talisman', description: '战斗中释放火行伤害。', value: 18 },
  { id: 'guard-talisman', name: '护身符', category: '符咒', itemType: 'talisman', description: '战斗中抵挡一次重击。', value: 22 },
  { id: 'thunder-talisman', name: '雷光符', category: '符咒', itemType: 'talisman', description: '引一线雷光击敌。', value: 48 },
  { id: 'earth-talisman', name: '厚土符', category: '符咒', itemType: 'talisman', description: '临战时加固护体灵光。', value: 32 },
  { id: 'breath-manual', name: '吐纳诀残页', category: '功法', itemType: 'manual', spellId: 'breath-cut', description: '基础功法残页，可领悟吐纳剑气。', value: 40 },
  { id: 'fire-manual', name: '离火诀抄本', category: '功法', itemType: 'spellbook', spellId: 'fire-talisman-art', description: '记录离火诀的坊市抄本。', value: 70 },
  { id: 'vine-manual', name: '青藤术玉简', category: '功法', itemType: 'spellbook', spellId: 'green-vine', description: '木行束缚法术。', value: 66 },
  { id: 'thunder-manual', name: '掌心雷残卷', category: '功法', itemType: 'spellbook', spellId: 'thunder-spark', description: '雷法入门残卷。', value: 120 },
  { id: 'cold-moon-manual', name: '寒月斩剑谱', category: '功法', itemType: 'spellbook', spellId: 'cold-moon', description: '寒月斩的残缺剑谱。', value: 168 },
  { id: 'sky-sword-manual', name: '天衍剑诀玉简', category: '功法', itemType: 'spellbook', spellId: 'sky-sword', description: '太华剑宗外传玉简，需门中身份兑换。', value: 260 },
  { id: 'jade-cauldron-manual', name: '玉鼎丹火诀', category: '功法', itemType: 'spellbook', spellId: 'jade-cauldron-fire', description: '丹霞谷丹火法门，非门人难得。', value: 230 },
  { id: 'nine-seal-manual', name: '九箓雷符秘本', category: '功法', itemType: 'spellbook', spellId: 'nine-seal-thunder', description: '玄符观雷符秘本，只授有功弟子。', value: 286 },
  { id: 'frost-mirror-manual', name: '寒镜凝霜卷', category: '功法', itemType: 'spellbook', spellId: 'frost-mirror', description: '寒月宫寒系法术卷轴，入门后方可参读。', value: 252 },
  { id: 'spirit-herb', name: '凝露草', category: '材料', itemType: 'material', description: '晨雾中常见的炼丹草药。', value: 4 },
  { id: 'yellow-root', name: '黄精根', category: '材料', itemType: 'material', description: '可入基础丹方。', value: 6 },
  { id: 'beast-bone', name: '妖兽骨', category: '材料', itemType: 'material', description: '炼器材料。', value: 14 },
  { id: 'spirit-jade', name: '碎灵玉', category: '材料', itemType: 'material', description: '洞窟中偶见的灵材。', value: 18 },
  { id: 'cinnabar', name: '朱砂', category: '材料', itemType: 'material', description: '绘符常用的灵砂。', value: 9 },
  { id: 'iron-ore', name: '寒铁矿', category: '材料', itemType: 'material', description: '可炼低阶兵刃。', value: 16 },
  { id: 'moss-flower', name: '阴苔花', category: '材料', itemType: 'material', description: '洞窟潮湿处生长的灵药。', value: 13 },
  { id: 'beast-core', name: '低阶妖丹', category: '材料', itemType: 'material', description: '妖兽体内凝结的灵气核心。', value: 38 },
];

export function itemDefinition(id: string): ItemDefinition | undefined {
  return ITEM_LIBRARY.find((item) => item.id === id);
}

export function createItem(id: string, quantity = 1): ItemStack {
  const definition = itemDefinition(id);
  if (!definition) {
    return { id, name: id, category: '材料', quantity, description: '未登记物品。', value: 1, itemType: 'material' };
  }
  return { ...definition, quantity };
}

export class Inventory {
  readonly items: ItemStack[] = [
    createItem('spirit-stone', 36),
    createItem('qi-pill', 5),
    createItem('paper-talisman', 3),
    createItem('bamboo-sword', 1),
    createItem('breath-manual', 1),
    createItem('spirit-herb', 7),
  ];

  add(item: ItemStack): void {
    const existing = this.items.find((entry) => entry.id === item.id);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      this.items.push({ ...item });
    }
  }

  remove(id: string, quantity: number): boolean {
    const item = this.items.find((entry) => entry.id === id);
    if (!item || item.quantity < quantity) return false;
    item.quantity -= quantity;
    if (item.quantity <= 0) this.items.splice(this.items.indexOf(item), 1);
    return true;
  }

  find(id: string): ItemStack | undefined {
    return this.items.find((entry) => entry.id === id);
  }

  normalize(): void {
    for (let i = 0; i < this.items.length; i++) {
      const stack = this.items[i];
      const definition = itemDefinition(stack.id);
      if (definition) {
        this.items[i] = { ...definition, quantity: stack.quantity };
      }
    }
  }
}
