import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setViennaDom() {
  document.body.innerHTML = `
    <header data-site-header></header>
    <div data-vienna-timeline></div>
    <article data-philosophy>
      <p data-philosophy-body style="display:none">Body A</p>
    </article>
    <article data-philosophy>
      <p data-philosophy-body style="display:none">Body B</p>
    </article>
    <strong data-active-schools>286</strong>
    <ul data-manifesto></ul>
    <svg data-manifesto-network></svg>
    <form data-vienna-cta>
      <input name="owner" />
      <input name="email" />
      <select name="state"><option value="Arizona">Arizona</option></select>
      <select name="county"><option value="Maricopa County">Maricopa County</option></select>
      <button type="submit">Go</button>
    </form>
    <p data-vienna-result></p>
    <canvas id="vienna-globe"></canvas>
  `;
}

describe('vienna page flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setViennaDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders timeline/manifesto and handles philosophy and CTA interactions', async () => {
    vi.doMock('../../assets/js/common.js', () => ({
      initCore: vi.fn(),
      initCountySelectors: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('../../assets/js/counties.js', () => ({
      loadCountyData: vi.fn().mockResolvedValue({ pointCloud: [] }),
    }));
    vi.doMock('../../assets/js/globe.js', () => ({
      initGlobe: vi.fn(),
    }));

    await import('../../assets/js/vienna.js');
    await Promise.resolve();

    expect(document.querySelectorAll('[data-vienna-timeline] .timeline-item')).toHaveLength(6);
    expect(document.querySelectorAll('[data-manifesto] li')).toHaveLength(5);
    expect(document.querySelector('[data-manifesto-network]').innerHTML).toContain('<circle');

    const philosophy = document.querySelector('[data-philosophy]');
    philosophy.click();
    expect(philosophy.classList.contains('active')).toBe(true);
    expect(philosophy.querySelector('[data-philosophy-body]').style.display).toBe('block');

    const cta = document.querySelector('[data-vienna-cta]');
    cta.querySelector('[name="owner"]').value = 'Ammar';
    cta.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('[data-vienna-result]').textContent).toContain('Signal received');
  });
});
