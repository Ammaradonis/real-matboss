import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setSystemDom() {
  document.body.innerHTML = `
    <header data-site-header></header>
    <p data-system-copy></p>
    <button data-system-mode="plain" class="active"></button>
    <button data-system-mode="technical"></button>
    <button data-school-type="kids" class="active"></button>
    <button data-school-type="adult"></button>
    <button data-school-type="mixed"></button>
    <button data-school-type="traditional"></button>
    <ul data-journey-map></ul>
    <div data-op-status></div>
    <svg id="latency-chart"></svg>
    <input data-message-slider name="formality" value="55" />
    <input data-message-slider name="length" value="48" />
    <input data-message-slider name="friendly" value="62" />
    <p data-message-output></p>
    <div data-integration-badges></div>
    <div data-arch-diagram></div>
    <button data-arch-mode="visual" class="active"></button>
    <button data-arch-mode="technical"></button>
    <input data-day-slider type="range" min="1" max="5" value="1" />
    <p data-day-output></p>
    <form data-system-cta>
      <input name="owner" />
      <input name="email" />
      <select name="state"><option value="Arizona">Arizona</option></select>
      <select name="county"><option value="Maricopa County">Maricopa County</option></select>
      <button type="submit">Go</button>
    </form>
    <p data-system-cta-result></p>
    <svg id="system-county-map"></svg>
  `;
}

describe('the system page flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setSystemDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('handles mode switches, architecture toggle, day slider, and CTA', async () => {
    vi.doMock('../../assets/js/common.js', () => ({
      initCore: vi.fn(),
      initCountySelectors: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('../../assets/js/counties.js', () => ({
      loadCountyData: vi.fn().mockResolvedValue({ stateCoverage: [] }),
    }));
    vi.doMock('../../assets/js/map.js', () => ({
      renderUSCoverage: vi.fn().mockResolvedValue(undefined),
    }));

    await import('../../assets/js/the-system.js');
    await Promise.resolve();

    document.querySelector('[data-system-mode="technical"]').click();
    expect(document.querySelector('[data-system-copy]').textContent).toContain('Ingress events stream');

    expect(document.querySelector('[data-integration-badges]').children.length).toBe(6);

    document.querySelector('[data-arch-mode="technical"]').click();
    expect(document.querySelector('[data-arch-diagram]').textContent).toContain('Ingress -> Nginx');

    const day = document.querySelector('[data-day-slider]');
    day.value = '5';
    day.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('[data-day-output]').textContent).toContain('Evening leads');

    const cta = document.querySelector('[data-system-cta]');
    cta.querySelector('[name="owner"]').value = 'Ammar';
    cta.querySelector('[name="email"]').value = 'owner@school.com';
    cta.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('[data-system-cta-result]').textContent).toContain('System brief queued');
  });
});
