import { describe, it, expect } from 'vitest';
import spec from '../../design/screens.json';
import tokens from '../../design/tokens.json';
describe('version two reference integrity', () => {
  it('has 130 unique ids and the published draft-review-receipt sequence', () => {
    expect(spec.screens).toHaveLength(130);
    expect(new Set(spec.screens.map((s) => s.id)).size).toBe(130);
    expect(spec.screens.find((s) => s.id === 'S17')?.notes).toContain('S09 -> S17 -> S10');
    expect(spec.designDirection.tablet).toContain('No side rail');
  });
  it('keeps independent icon size and touch target tokens', () => {
    expect(tokens.layout.navIcon).toBe(22);
    expect(tokens.layout.icon).toBe(20);
    expect(tokens.layout.touchTarget).toBeGreaterThanOrEqual(44);
    expect(tokens.light.primary).toBe('#5058d9');
  });
});
