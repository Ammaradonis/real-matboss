import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const value = clean.length === 3
    ? clean.split('').map((ch) => ch + ch).join('')
    : clean;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function luminance({ r, g, b }) {
  const linear = [r, g, b].map((n) => {
    const srgb = n / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(a, b) {
  const l1 = luminance(hexToRgb(a));
  const l2 = luminance(hexToRgb(b));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme contrast', () => {
  it('keeps alert and success colors readable on dark background', () => {
    const css = fs.readFileSync(new URL('../../assets/css/main.css', import.meta.url), 'utf8');
    const vars = Object.fromEntries(
      [...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)].map((match) => [match[1], match[2]]),
    );

    const lossContrast = contrastRatio(vars.loss, vars['bg-0']);
    const winContrast = contrastRatio(vars.win, vars['bg-0']);

    expect(lossContrast).toBeGreaterThan(4.5);
    expect(winContrast).toBeGreaterThan(4.5);
  });
});
