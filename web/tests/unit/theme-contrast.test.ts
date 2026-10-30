import { describe, expect, it } from 'vitest';
import tokens from '../../design/tokens.json';

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
describe('readable theme color combinations', () => {
  for (const mode of ['light', 'dark'] as const) {
    it(`${mode} keeps normal text, secondary text and action labels readable`, () => {
      const t = tokens[mode];
      const pairs: [string, string, string][] = [
        ...['bg', 'surface', 'soft', 'primary-soft', 'incoming-message'].map(
          (name) =>
            [t.text, t[name as keyof typeof t], `text on ${name}`] as [string, string, string],
        ),
        ...['bg', 'surface', 'soft'].map(
          (name) =>
            [t.muted, t[name as keyof typeof t], `secondary text on ${name}`] as [
              string,
              string,
              string,
            ],
        ),
        [t.primary, t['primary-soft'], 'selected navigation label'],
        [t['on-primary'], t['primary-button'], 'primary action'],
        [t['on-primary'], t['primary-hover'], 'hovered primary action'],
        [t['on-primary'], t['danger-button'], 'destructive action'],
        [t.success, t['success-soft'], 'success status'],
        [t.warning, t['warning-soft'], 'warning status'],
      ];
      for (const [foreground, background, name] of pairs)
        expect(contrast(foreground, background), `${mode}: ${name}`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
