/**
 * gear-types-reference.md ↔ gear-types.json 对账测试
 * 重新解析 markdown（§3 继承树/护甲倍率、§5.1 必填槽、§5.2 可附加槽、§5.3 主部件绑定）
 * 逐项核对构建脚本转录的 JSON，防转录失真。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const md = readFileSync('data/gear-types-reference.md', 'utf8');
const json = JSON.parse(readFileSync('src/data/gear-types.json', 'utf8')) as {
  gearTypes: Record<string, { parent: string | null; mainPart?: string | null; requiredParts?: string[]; addableSlots?: string[]; armorDurabilityMultiplier?: number | null }>;
};

/** 截取某个 ## 小节 */
function section(title: string): string {
  const start = md.indexOf(`## ${title}`);
  const end = md.indexOf('\n## ', start + 2);
  return end === -1 ? md.slice(start) : md.slice(start, end);
}

/** 解析 §5.3 主部件绑定表（"sword→sword_blade, ..."） */
function parseMainPartBindings(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of section('5.3').split('\n')) {
    for (const m of line.matchAll(/([a-z_]+)→([a-z_]+)/g)) {
      out[m[1]!] = m[2]!;
    }
  }
  return out;
}

/** 解析 §3 继承树里的护甲倍率注释：`helmet      （倍率 11）` / `shield ... 倍率=337/15` */
function parseArmorMultipliers(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of section('3').split('\n')) {
    const m = line.match(/[├└]──\s*([a-z_]+)\s*.*（倍率\s*(\d+)）/);
    if (m) out[m[1]!] = Number(m[2]!);
    const shield = line.match(/shield\s+.*倍率=(\d+)\/(\d+)/);
    if (shield) out.shield = Number(shield[1]!) / Number(shield[2]!); // 337/15
  }
  return out;
}

/** 解析 §5.1 必填槽位表 → 类别 → part_type 裸名列表 */
function parseRequiredPartsTable(): Array<{ name: string; parts: string[] }> {
  const rows: Array<{ name: string; parts: string[] }> = [];
  for (const line of section('5.1').split('\n')) {
    const cols = line.split('|').map((c) => c.trim());
    if (cols.length >= 3 && cols[1] && cols[2]?.startsWith('**')) {
      // 去 ** 与「（默认）」等后缀注释，再按 + 拆
      const parts = cols[2].replace(/\*\*/g, '').replace(/（[^）]*）.*$/, '').split(/\+/).map((s) => s.trim());
      rows.push({ name: cols[1], parts });
    }
  }
  return rows;
}

describe('gear-types.json ↔ markdown 对账', () => {
  it('§5.3：每个具体 gear type 的主部件绑定与 markdown 一致', () => {
    const bindings = parseMainPartBindings();
    expect(Object.keys(bindings).length).toBe(34);
    for (const [gear, mainPart] of Object.entries(bindings)) {
      expect(json.gearTypes[gear]?.mainPart, `${gear} 的主部件`).toBe(mainPart);
    }
  });

  it('§3：护甲耐久倍率与 markdown 一致（helmet 11 / chestplate 16 / leggings 15 / boots 13 / elytra 25 / shield 337/15）', () => {
    const mults = parseArmorMultipliers();
    expect(mults.helmet).toBe(11);
    expect(mults.chestplate).toBe(16);
    expect(mults.leggings).toBe(15);
    expect(mults.boots).toBe(13);
    expect(mults.elytra).toBe(25);
    expect(mults.shield).toBeCloseTo(337 / 15, 5);
    for (const [gear, mult] of Object.entries(mults)) {
      expect(json.gearTypes[gear]?.armorDurabilityMultiplier, `${gear} 的护甲倍率`).toBeCloseTo(mult, 5);
    }
  });

  it('§5.1：必填槽位与 markdown 类别表一致', () => {
    const required = new Map<string, string[]>([
      ['普通工具 / 近战武器', ['main', 'rod']],
      ['远程武器（bow/crossbow/slingshot）', ['main', 'rod', 'cord']],
      ['shield', ['main', 'rod']],
      ['fishing_rod', ['main', 'rod', 'cord']],
      ['arrow', ['main', 'rod', 'fletching']],
      ['elytra', ['main', 'binding']],
      ['curio（ring/bracelet/necklace）', ['main', 'setting']],
      ['护甲（helmet 等）', ['main']],
    ]);
    // 与 markdown 表文本逐行核对（防止我把类别写错）
    const tableRows = parseRequiredPartsTable();
    expect(tableRows).toHaveLength(required.size);
    for (const row of tableRows) {
      expect(required.get(row.name), `表类别「${row.name}」`).toEqual(row.parts);
    }

    // gear type → 类别 的归属（依据继承树，均可在 markdown §3 找到出处）
    const categoryOf = (g: string): string[] => {
      const cat = new Set<string>();
      if (['sword', 'katana', 'machete', 'knife', 'dagger', 'spear', 'mace'].includes(g)) cat.add('普通工具 / 近战武器');
      if (['pickaxe', 'shovel', 'axe', 'hoe', 'hammer', 'excavator', 'saw', 'sickle', 'mattock', 'paxel', 'prospector_hammer', 'shears'].includes(g)) cat.add('普通工具 / 近战武器');
      if (['trident'].includes(g)) cat.add('普通工具 / 近战武器'); // §5.1 未单列，按 GearTool 归类
      if (['bow', 'crossbow', 'slingshot'].includes(g)) cat.add('远程武器（bow/crossbow/slingshot）');
      if (['shield'].includes(g)) cat.add('shield');
      if (['fishing_rod'].includes(g)) cat.add('fishing_rod');
      if (['arrow'].includes(g)) cat.add('arrow');
      if (['elytra'].includes(g)) cat.add('elytra');
      if (['ring', 'bracelet', 'necklace'].includes(g)) cat.add('curio（ring/bracelet/necklace）');
      if (['helmet', 'chestplate', 'leggings', 'boots'].includes(g)) cat.add('护甲（helmet 等）');
      return [...cat];
    };

    for (const [gear, entry] of Object.entries(json.gearTypes)) {
      const cats = categoryOf(gear);
      if (cats.length === 0) continue; // 抽象类型
      const expectedParts = cats.flatMap((c) => required.get(c)!);
      expect(entry.requiredParts, `${gear} 的必填槽`).toEqual(expectedParts);
    }
  });

  it('§5.2：可附加槽位与 markdown 规则一致（含 elytra/fishing_rod 特例）', () => {
    // 依据 §5.2 表：槽位 → 适用 scope
    // tip/binding=all, grip=tool, coating=all(除 elytra), cord=ranged_weapon(+fishing_rod), lining=armor(+elytra), fletching=projectile
    const scope: Record<string, { scope: string; special?: string[] }> = {
      tip: { scope: 'all' },
      binding: { scope: 'all' },
      grip: { scope: 'tool' },
      coating: { scope: 'all', special: [] },
      cord: { scope: 'ranged_weapon', special: ['fishing_rod'] },
      lining: { scope: 'armor', special: ['elytra'] },
      fletching: { scope: 'projectile' },
    };
    const ancestors = (g: string): string[] => {
      const chain: string[] = [g];
      let cur = json.gearTypes[g]?.parent;
      while (cur) {
        chain.push(cur);
        cur = json.gearTypes[cur]?.parent ?? null;
      }
      return chain;
    };
    for (const [gear, entry] of Object.entries(json.gearTypes)) {
      if (!entry.mainPart) continue; // 只查具体类型
      const chain = ancestors(gear);
      const expected = Object.entries(scope)
        .filter(([, { scope: s, special }]) => {
          const match = chain.includes(s);
          if (special) {
            if (s === 'all' && gear === 'elytra') return false; // coating 黑名单
            return match || special.includes(gear); // cord/lining 特例
          }
          return match;
        })
        .map(([slot]) => slot);
      expect([...entry.addableSlots!].sort(), `${gear} 的可附加槽`).toEqual([...expected].sort());
    }
  });
});
