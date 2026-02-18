import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setLiveProofDom() {
  document.body.innerHTML = `
    <header data-site-header></header>
    <div data-live-kpi></div>
    <p data-results-ticker></p>
    <div id="split-fill" data-split-fill></div>
    <input data-split-range type="range" value="50" />
    <div class="range-row"><label>Leads/month</label><output>120</output></div>
    <input data-roi-input type="range" name="leads" value="120" />
    <div class="range-row"><label>Show rate %</label><output>58</output></div>
    <input data-roi-input type="range" name="showRate" value="58" />
    <div class="range-row"><label>Close rate %</label><output>31</output></div>
    <input data-roi-input type="range" name="closeRate" value="31" />
    <div class="range-row"><label>Average deal value</label><output>790</output></div>
    <input data-roi-input type="range" name="avgValue" value="790" />
    <div class="range-row"><label>Delay loss</label><output>35</output></div>
    <input data-roi-input type="range" name="delayLoss" value="35" />
    <h3 data-roi-output></h3>
    <p data-roi-breakdown></p>
    <form data-live-filter>
      <select name="type"><option value="">All</option><option value="kids">Kids</option></select>
      <select name="size"><option value="">All</option><option value="small">Small</option></select>
      <select name="state"><option value="">All</option><option value="Arizona">Arizona</option></select>
      <select name="county"><option value="">All</option><option value="Maricopa County">Maricopa County</option></select>
    </form>
    <p data-live-filter-result></p>
    <form data-live-cta>
      <input name="phone" />
      <select name="preferred"><option value="">Select</option><option value="Today: 08:00-10:00">Today: 08:00-10:00</option></select>
      <button type="submit">Submit</button>
    </form>
    <p data-live-result></p>
    <svg id="live-proof-map"></svg>
  `;
}

describe('live proof page flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setLiveProofDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders KPI/ROI and handles filter and callback forms', async () => {
    vi.doMock('../../assets/js/common.js', () => ({
      initCore: vi.fn(),
      initCountySelectors: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock('../../assets/js/counties.js', () => ({
      loadCountyData: vi.fn().mockResolvedValue({ pointCloud: [] }),
    }));
    vi.doMock('../../assets/js/map.js', () => ({
      renderCountyCluster: vi.fn().mockResolvedValue(undefined),
    }));

    await import('../../assets/js/live-proof.js');
    await Promise.resolve();

    expect(document.querySelectorAll('[data-live-kpi] .metric-card')).toHaveLength(4);
    expect(document.querySelector('[data-roi-output]').textContent).toMatch(/\$/);

    const leadsInput = document.querySelector('[name="leads"]');
    leadsInput.value = '300';
    leadsInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(leadsInput.previousElementSibling.querySelector('output').textContent).toBe('300');

    const filter = document.querySelector('[data-live-filter]');
    filter.querySelector('[name="type"]').value = 'kids';
    filter.querySelector('[name="state"]').value = 'Arizona';
    filter.dispatchEvent(new Event('change', { bubbles: true }));
    expect(document.querySelector('[data-live-filter-result]').textContent).toContain('type=kids');

    const cta = document.querySelector('[data-live-cta]');
    cta.querySelector('[name="phone"]').value = '+1 602 555 0101';
    cta.querySelector('[name="preferred"]').value = 'Today: 08:00-10:00';
    cta.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('[data-live-result]').textContent).toContain('Live callback queued');
  });
});
