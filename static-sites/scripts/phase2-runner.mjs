import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { runLoadTest } from './load-test.mjs';

globalThis.__STATIC_TEST__ = true;

const SAMPLE_COUNTIES = `
The counties in Arizona are: Maricopa, Pima, and Yavapai.
The counties in Texas are: Harris County, Travis County, and Bexar County.
`;

const originalFetch = globalThis.fetch;
const nativeSetInterval = globalThis.setInterval;
const nativeClearInterval = globalThis.clearInterval;
const nativeSetTimeout = globalThis.setTimeout;
const nativeClearTimeout = globalThis.clearTimeout;

function installDom(html, url = 'http://localhost/') {
  const dom = new JSDOM(html, { url });
  Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
  Object.defineProperty(globalThis, 'FormData', { value: dom.window.FormData, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'Event', { value: dom.window.Event, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'KeyboardEvent', { value: dom.window.KeyboardEvent, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'CustomEvent', { value: dom.window.CustomEvent, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'HTMLElement', { value: dom.window.HTMLElement, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'SVGElement', { value: dom.window.SVGElement, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'Node', { value: dom.window.Node, configurable: true, writable: true });
  const intervals = new Set();
  const timeouts = new Set();
  Object.defineProperty(globalThis, 'setInterval', {
    value: (...args) => {
      const id = nativeSetInterval(...args);
      intervals.add(id);
      return id;
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'clearInterval', {
    value: (id) => {
      intervals.delete(id);
      nativeClearInterval(id);
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'setTimeout', {
    value: (...args) => {
      const id = nativeSetTimeout(...args);
      timeouts.add(id);
      return id;
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'clearTimeout', {
    value: (id) => {
      timeouts.delete(id);
      nativeClearTimeout(id);
    },
    configurable: true,
    writable: true,
  });
  globalThis.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }

    observe(target) {
      this.callback([{ isIntersecting: true, target }]);
    }

    disconnect() {}
  };
  Object.defineProperty(dom, '__intervals', { value: intervals });
  Object.defineProperty(dom, '__timeouts', { value: timeouts });
  return dom;
}

function closeDom(dom) {
  for (const id of dom.__intervals ?? []) {
    nativeClearInterval(id);
  }
  for (const id of dom.__timeouts ?? []) {
    nativeClearTimeout(id);
  }
  Object.defineProperty(globalThis, 'setInterval', { value: nativeSetInterval, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'clearInterval', { value: nativeClearInterval, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'setTimeout', { value: nativeSetTimeout, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'clearTimeout', { value: nativeClearTimeout, configurable: true, writable: true });
  dom.window.close();
}

function mockCountyFetch() {
  globalThis.fetch = async (url) => {
    if (String(url).includes('all-us-counties.txt')) {
      return {
        text: async () => SAMPLE_COUNTIES,
      };
    }
    throw new Error(`Unexpected fetch in test runner: ${url}`);
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function contrastRatio(hexA, hexB) {
  const toRgb = (hex) => {
    const value = hex.replace('#', '');
    const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
    const parsed = Number.parseInt(full, 16);
    return {
      r: (parsed >> 16) & 255,
      g: (parsed >> 8) & 255,
      b: parsed & 255,
    };
  };
  const luminance = ({ r, g, b }) => {
    const linear = [r, g, b].map((n) => {
      const srgb = n / 255;
      return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    });
    return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  };
  const l1 = luminance(toRgb(hexA));
  const l2 = luminance(toRgb(hexB));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function run() {
  const results = [];
  const runCheck = async (name, fn) => {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const { calculateGhostLoss, calculateRoi } = await import('../assets/js/calculations.js');
  const { countiesForState, countyToCoord, parseCounties } = await import('../assets/js/counties.js');
  const { scoreByState } = await import('../assets/js/map-core.js');
  const { latLonToCartesian, nextRotation } = await import('../assets/js/globe-core.js');
  const { initTimeParadox } = await import('../assets/js/common.js');
  const { initLandingPage, setHeroMode } = await import('../assets/js/landing.js');
  const { initLiveProofPage } = await import('../assets/js/live-proof.js');
  const { initGhostsPage } = await import('../assets/js/the-ghosts.js');
  const { initSystemPage } = await import('../assets/js/the-system.js');
  const { initViennaPage } = await import('../assets/js/vienna.js');

  await runCheck('unit: roi calculation', () => {
    const roi = calculateRoi({
      monthlyLeads: 120,
      showRate: 58,
      closeRate: 31,
      avgValue: 790,
      delayLoss: 35,
    });
    assert(Math.abs(roi.projectedRevenue - 23422.236) < 0.1);
  });

  await runCheck('unit: ghost loss calculation', () => {
    const loss = calculateGhostLoss({ leads: 120, response: 44, avgValue: 790 });
    assert.equal(loss.missed, 42);
    assert.equal(loss.monthlyLoss, 33180);
  });

  await runCheck('unit: county parsing and lookup', () => {
    const parsed = parseCounties(SAMPLE_COUNTIES);
    assert.equal(parsed.length, 2);
    assert.deepEqual(countiesForState({ states: parsed }, 'Arizona'), ['Maricopa County', 'Pima County', 'Yavapai County']);
    const coord = countyToCoord('Arizona', 'Maricopa County');
    assert(coord.lat >= -72 && coord.lat <= 72);
    assert(coord.lon >= -179 && coord.lon <= 179);
  });

  await runCheck('unit: map and globe core math', () => {
    const map = scoreByState([{ state: 'Arizona', count: 15 }]);
    assert.equal(map.get('Arizona'), 15);
    const point = latLonToCartesian(0, 0, 2.25);
    assert(Math.abs(point.x - 2.25) < 0.01);
    assert(Math.abs(nextRotation(1, 0.01) - 1.01) < 0.0001);
  });

  await runCheck('integration: landing interactions', async () => {
    mockCountyFetch();
    const dom = installDom(`
      <div class="scroll-meter"></div>
      <header data-site-header></header>
      <section data-swipe-nav>
        <h2 data-hero-mode></h2>
        <p data-mode-detail></p>
        <p data-chaos-pill></p>
        <article data-parallax-card></article>
      </section>
      <form data-lead-form>
        <input name="owner" value="Ammar" />
        <input name="email" value="owner@school.com" />
        <select name="state" data-county-state data-county-target="landing"><option value="">Select state</option></select>
        <select name="county" data-county="landing"><option value="">Select county</option></select>
      </form>
      <p data-lead-result></p>
      <button data-open-lead-modal type="button"></button>
      <div class="modal-backdrop" data-lead-modal>
        <form data-lead-modal-form>
          <input name="owner" value="Ammar" />
          <input name="email" value="owner@school.com" />
          <input name="phone" value="+1 602 555 0101" />
          <select name="state" data-county-state data-county-target="landingmodal"><option value="">Select state</option></select>
          <select name="county" data-county="landingmodal"><option value="">Select county</option></select>
        </form>
        <button data-close-lead-modal type="button"></button>
        <p data-lead-modal-result></p>
      </div>
      <canvas id="landing-globe"></canvas>
    `);
    await initLandingPage({ skipVisuals: true });
    setHeroMode(document.querySelector('[data-hero-mode]'), document.querySelector('[data-mode-detail]'), 10);
    assert(document.querySelector('[data-hero-mode]').textContent.includes('Day Shift'));

    const stateSelect = document.querySelector('form[data-lead-form] [name="state"]');
    const countySelect = document.querySelector('form[data-lead-form] [name="county"]');
    stateSelect.value = 'Arizona';
    stateSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    countySelect.value = 'Maricopa County';
    document.querySelector('[data-lead-form]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert(document.querySelector('[data-lead-result]').textContent.includes('Signal accepted'));

    document.querySelector('[data-open-lead-modal]').click();
    assert(document.querySelector('[data-lead-modal]').classList.contains('open'));

    const modalState = document.querySelector('form[data-lead-modal-form] [name="state"]');
    const modalCounty = document.querySelector('form[data-lead-modal-form] [name="county"]');
    modalState.value = 'Arizona';
    modalState.dispatchEvent(new window.Event('change', { bubbles: true }));
    modalCounty.value = 'Maricopa County';
    document.querySelector('[data-lead-modal-form]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert(document.querySelector('[data-lead-modal-result]').textContent.includes('County claim confirmed'));

    closeDom(dom);
    restoreFetch();
  });

  await runCheck('integration: live proof ROI/filter/cta', async () => {
    mockCountyFetch();
    const dom = installDom(`
      <div class="scroll-meter"></div>
      <header data-site-header></header>
      <div data-live-kpi></div>
      <p data-results-ticker></p>
      <div data-split-fill></div>
      <input data-split-range type="range" value="50" />
      <div class="range-row"><label>Leads</label><output>120</output></div><input data-roi-input name="leads" value="120" />
      <div class="range-row"><label>Show</label><output>58</output></div><input data-roi-input name="showRate" value="58" />
      <div class="range-row"><label>Close</label><output>31</output></div><input data-roi-input name="closeRate" value="31" />
      <div class="range-row"><label>Value</label><output>790</output></div><input data-roi-input name="avgValue" value="790" />
      <div class="range-row"><label>Loss</label><output>35</output></div><input data-roi-input name="delayLoss" value="35" />
      <h3 data-roi-output></h3>
      <p data-roi-breakdown></p>
      <form data-live-filter>
        <select name="type"><option value="">All</option><option value="kids">kids</option></select>
        <select name="size"><option value="">All</option><option value="small">small</option></select>
        <select name="state" data-county-state data-county-target="livefilter"><option value="">Select state</option></select>
        <select name="county" data-county="livefilter"><option value="">Select county</option></select>
      </form>
      <p data-live-filter-result></p>
      <form data-live-cta>
        <input name="phone" value="+1 602 555 0101" />
        <select name="preferred"><option value="">Select</option><option value="Today: 08:00-10:00">Today: 08:00-10:00</option></select>
      </form>
      <p data-live-result></p>
      <svg id="live-proof-map"></svg>
    `);
    await initLiveProofPage({ skipVisuals: true });
    assert.equal(document.querySelectorAll('[data-live-kpi] .metric-card').length, 4);
    const filter = document.querySelector('[data-live-filter]');
    filter.querySelector('[name="type"]').value = 'kids';
    const filterState = filter.querySelector('[name="state"]');
    filterState.value = 'Arizona';
    filterState.dispatchEvent(new window.Event('change', { bubbles: true }));
    filter.querySelector('[name="county"]').value = 'Maricopa County';
    filter.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert(document.querySelector('[data-live-filter-result]').textContent.includes('type=kids'));
    const cta = document.querySelector('[data-live-cta]');
    cta.querySelector('[name="preferred"]').value = 'Today: 08:00-10:00';
    cta.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert(document.querySelector('[data-live-result]').textContent.includes('Live callback queued'));
    closeDom(dom);
    restoreFetch();
  });

  await runCheck('integration: ghosts timeline/modal', async () => {
    mockCountyFetch();
    const dom = installDom(`
      <div class="scroll-meter"></div>
      <header data-site-header></header>
      <div data-loss-counter>$128,430</div>
      <input data-loss-input name="ghostLeads" value="120" />
      <input data-loss-input name="ghostResponse" value="44" />
      <input data-loss-input name="ghostValue" value="790" />
      <p data-loss-output></p>
      <button data-mode="legacy"></button>
      <button data-mode="competitor"></button>
      <button data-mode="matboss"></button>
      <ul data-week-timeline></ul>
      <ul data-inquiry-log></ul>
      <button data-ghost="backlog" type="button"></button>
      <div class="modal-backdrop" data-ghost-modal>
        <h3 data-modal-title></h3>
        <p data-modal-body></p>
        <button data-close-modal type="button"></button>
      </div>
      <div data-ghost-mask></div>
      <input data-ghost-split type="range" value="50" />
      <div data-accordion>
        <button type="button">Monday</button><div style="display:none">A</div>
      </div>
      <select data-county-state data-county-target="ghost"><option value="">Select state</option></select>
      <select data-county="ghost"><option value="">Select county</option></select>
    `);
    await initGhostsPage();
    document.querySelector('[data-mode="matboss"]').click();
    assert(document.querySelector('[data-week-timeline]').textContent.includes('AI triage'));
    document.querySelector('[data-ghost="backlog"]').click();
    assert(document.querySelector('[data-ghost-modal]').classList.contains('open'));
    closeDom(dom);
    restoreFetch();
  });

  await runCheck('integration: system mode/cta', async () => {
    mockCountyFetch();
    const dom = installDom(`
      <div class="scroll-meter"></div>
      <header data-site-header></header>
      <p data-system-copy></p>
      <button data-system-mode="plain"></button><button data-system-mode="technical"></button>
      <button data-school-type="kids"></button><button data-school-type="adult"></button><button data-school-type="mixed"></button><button data-school-type="traditional"></button>
      <ul data-journey-map></ul>
      <div data-op-status></div>
      <svg id="latency-chart"></svg>
      <input data-message-slider name="formality" value="55" />
      <input data-message-slider name="length" value="48" />
      <input data-message-slider name="friendly" value="62" />
      <p data-message-output></p>
      <div data-integration-badges></div>
      <div data-arch-diagram></div>
      <button data-arch-mode="visual"></button><button data-arch-mode="technical"></button>
      <input data-day-slider value="1" />
      <p data-day-output></p>
      <form data-system-cta>
        <input name="owner" value="Ammar" />
        <input name="email" value="owner@school.com" />
        <select name="state" data-county-state data-county-target="system"><option value="">Select state</option></select>
        <select name="county" data-county="system"><option value="">Select county</option></select>
      </form>
      <p data-system-cta-result></p>
      <svg id="system-county-map"></svg>
    `);
    await initSystemPage({ skipVisuals: true });
    document.querySelector('[data-system-mode="technical"]').click();
    assert(document.querySelector('[data-system-copy]').textContent.includes('Ingress events stream'));
    const state = document.querySelector('form[data-system-cta] [name="state"]');
    state.value = 'Arizona';
    state.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('form[data-system-cta] [name="county"]').value = 'Maricopa County';
    document.querySelector('[data-system-cta]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert(document.querySelector('[data-system-cta-result]').textContent.includes('System brief queued'));
    closeDom(dom);
    restoreFetch();
  });

  await runCheck('integration: vienna timeline/manifesto/cta', async () => {
    mockCountyFetch();
    const dom = installDom(`
      <div class="scroll-meter"></div>
      <header data-site-header></header>
      <div data-vienna-timeline></div>
      <article data-philosophy><p data-philosophy-body style="display:none">Body</p></article>
      <strong data-active-schools>286</strong>
      <ul data-manifesto></ul>
      <svg data-manifesto-network></svg>
      <form data-vienna-cta>
        <input name="owner" value="Ammar" />
        <input name="email" value="owner@school.com" />
        <select name="state" data-county-state data-county-target="vienna"><option value="">Select state</option></select>
        <select name="county" data-county="vienna"><option value="">Select county</option></select>
      </form>
      <p data-vienna-result></p>
      <canvas id="vienna-globe"></canvas>
    `);
    await initViennaPage({ skipVisuals: true });
    assert.equal(document.querySelectorAll('[data-vienna-timeline] .timeline-item').length, 6);
    const state = document.querySelector('form[data-vienna-cta] [name="state"]');
    state.value = 'Arizona';
    state.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.querySelector('[data-vienna-cta] [name="county"]').value = 'Maricopa County';
    document.querySelector('[data-vienna-cta]').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    assert(document.querySelector('[data-vienna-result]').textContent.includes('Signal received'));
    closeDom(dom);
    restoreFetch();
  });

  await runCheck('accessibility: semantic page checks', () => {
    const pages = [
      '../index.html',
      '../live-proof/index.html',
      '../the-ghosts/index.html',
      '../the-system/index.html',
      '../vienna-to-every-dojo/index.html',
    ];
    for (const relative of pages) {
      const raw = fs.readFileSync(new URL(relative, import.meta.url), 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '');
      const dom = installDom(raw, 'http://localhost/');
      assert.equal(document.documentElement.getAttribute('lang'), 'en');
      const unlabeled = [...document.querySelectorAll('input, select, textarea')]
        .filter((node) => !node.closest('label') && !node.getAttribute('aria-label'));
      assert.equal(unlabeled.length, 0);
      const unnamedButtons = [...document.querySelectorAll('button')]
        .filter((node) => !node.textContent?.trim() && !node.getAttribute('aria-label'));
      assert.equal(unnamedButtons.length, 0);
      closeDom(dom);
    }
  });

  await runCheck('accessibility: contrast thresholds', () => {
    const css = fs.readFileSync(new URL('../assets/css/main.css', import.meta.url), 'utf8');
    const vars = Object.fromEntries(
      [...css.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8});/g)].map((match) => [match[1], match[2]]),
    );
    const lossContrast = contrastRatio(vars.loss, vars['bg-0']);
    const winContrast = contrastRatio(vars.win, vars['bg-0']);
    assert(lossContrast > 4.5);
    assert(winContrast > 4.5);
  });

  await runCheck('timezone: vienna vs us offset check', () => {
    const now = new Date('2026-02-18T12:00:00Z');
    const vienna = now.toLocaleString('en-US', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit', hour12: false });
    const newYork = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', hour12: false });
    assert.notEqual(vienna, newYork);
    const dom = installDom('<p data-local-time></p><p data-vienna-time></p>');
    initTimeParadox();
    assert(document.querySelector('[data-vienna-time]').textContent.length > 0);
    closeDom(dom);
  });

  await runCheck('mobile: responsive breakpoints and touch swipe wiring', async () => {
    const css = fs.readFileSync(new URL('../assets/css/main.css', import.meta.url), 'utf8');
    assert(css.includes('@media (max-width: 980px)'));
    assert(css.includes('@media (max-width: 720px)'));

    mockCountyFetch();
    const dom = installDom(`
      <div class="scroll-meter"></div>
      <header data-site-header></header>
      <section data-swipe-nav>
        <h2 data-hero-mode></h2>
        <p data-mode-detail></p>
        <p data-chaos-pill></p>
      </section>
      <form data-lead-form>
        <input name="owner" value="A" /><input name="email" value="a@b.com" />
        <select name="state" data-county-state data-county-target="landing"><option value="">Select state</option></select>
        <select name="county" data-county="landing"><option value="">Select county</option></select>
      </form>
      <p data-lead-result></p>
      <button data-open-lead-modal type="button"></button>
      <div data-lead-modal class="modal-backdrop"><form data-lead-modal-form></form><button data-close-lead-modal type="button"></button><p data-lead-modal-result></p></div>
      <canvas id="landing-globe"></canvas>
    `);
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    await initLandingPage({ skipVisuals: true });

    const swipe = document.querySelector('[data-swipe-nav]');
    const start = new window.Event('touchstart', { bubbles: true });
    start.changedTouches = [{ clientX: 320 }];
    const end = new window.Event('touchend', { bubbles: true });
    end.changedTouches = [{ clientX: 285 }];
    swipe.dispatchEvent(start);
    swipe.dispatchEvent(end);

    closeDom(dom);
    restoreFetch();
  });

  restoreFetch();

  const loadSummary = await runLoadTest({ root: fileURLToPath(new URL('..', import.meta.url)), requests: 200 });
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  const summary = {
    checksPassed: passed,
    checksFailed: failed.length,
    failures: failed,
    load: loadSummary,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0 || loadSummary.failed > 0 || loadSummary.p95Ms >= 1000) {
    process.exitCode = 1;
  }
}

await run();
