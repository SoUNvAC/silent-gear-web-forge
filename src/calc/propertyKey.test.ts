import { describe, expect, it } from 'vitest';
import { parsePropertyKey, mostSpecificStatKey } from './propertyKey.js';

describe('propertyKey', () => {
  it('无后缀键 → gearType null', () => {
    expect(parsePropertyKey('attack_speed')).toEqual({ property: 'attack_speed', gearType: null });
  });

  it('/axe 后缀拆分为 property + gearType', () => {
    expect(parsePropertyKey('attack_speed/axe')).toEqual({ property: 'attack_speed', gearType: 'axe' });
  });

  it('最具体键解析：有精确键时用它（不用无后缀）', () => {
    const props = { attack_speed: 0, 'attack_speed/axe': -0.1 };
    // axe 祖先链含 axe → 命中 attack_speed/axe
    expect(mostSpecificStatKey(props, 'attack_speed', ['axe', 'melee_weapon', 'weapon', 'tool', 'all'])).toBe('attack_speed/axe');
  });

  it('父链兜底：pickaxe 链上无 /axe → 回退无后缀', () => {
    const props = { attack_speed: 0, 'attack_speed/axe': -0.1 };
    // pickaxe 祖先链：pickaxe→harvest_tool→tool→all
    expect(mostSpecificStatKey(props, 'attack_speed', ['pickaxe', 'harvest_tool', 'tool', 'all'])).toBe('attack_speed');
  });

  it('只有无关 gear 后缀键 → null（对 pickaxe 不适用）', () => {
    const props = { 'attack_speed/axe': -0.1 };
    expect(mostSpecificStatKey(props, 'attack_speed', ['pickaxe', 'harvest_tool', 'tool', 'all'])).toBeNull();
  });
});
