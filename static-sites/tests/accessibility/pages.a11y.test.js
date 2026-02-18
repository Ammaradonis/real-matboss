import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const PAGES = [
  'index.html',
  'live-proof/index.html',
  'the-ghosts/index.html',
  'the-system/index.html',
  'vienna-to-every-dojo/index.html',
];

function loadPage(pagePath) {
  const url = new URL(`../../${pagePath}`, import.meta.url);
  const html = fs.readFileSync(url, 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '');
  document.open();
  document.write(html);
  document.close();
}

describe('static page accessibility', () => {
  for (const page of PAGES) {
    it(`meets baseline semantic accessibility checks: ${page}`, async () => {
      loadPage(page);

      expect(document.documentElement.getAttribute('lang')).toBe('en');

      const controls = [...document.querySelectorAll('input, select, textarea')];
      const unlabeled = controls.filter((node) => !node.closest('label') && !node.getAttribute('aria-label'));
      expect(unlabeled, `Unlabeled controls in ${page}`).toEqual([]);

      const buttons = [...document.querySelectorAll('button')];
      const unnamedButtons = buttons.filter(
        (node) => !node.textContent?.trim() && !node.getAttribute('aria-label'),
      );
      expect(unnamedButtons, `Unnamed buttons in ${page}`).toEqual([]);

      const visuals = [...document.querySelectorAll('svg, canvas')];
      const unlabeledVisuals = visuals.filter((node) => {
        if (node.closest('[aria-hidden="true"]')) return false;
        return !node.getAttribute('aria-label') && node.getAttribute('role') !== 'img';
      });
      expect(unlabeledVisuals, `Unlabeled visual elements in ${page}`).toEqual([]);
    });
  }
});
