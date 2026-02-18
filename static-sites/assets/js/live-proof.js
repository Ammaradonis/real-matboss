import { initCore, initCountySelectors } from './common.js';
import { calculateRoi, formatUsd } from './calculations.js';
import { loadCountyData } from './counties.js';
import { renderCountyCluster } from './map.js';

const kpiRows = [
  { label: 'Owner response lag (legacy)', value: '37m 05s', cls: 'loss' },
  { label: 'MatBoss first reply median', value: '2m 11s', cls: 'win' },
  { label: 'Leads rescued this week', value: '129', cls: 'win' },
  { label: 'Potential MRR still leaking', value: '$18,740', cls: 'loss' },
];

export function calculateLiveProofRoiFromDom() {
  const num = (name) => Number(document.querySelector(`[name="${name}"]`)?.value || 0);
  return calculateRoi({
    monthlyLeads: num('leads'),
    showRate: num('showRate'),
    closeRate: num('closeRate'),
    avgValue: num('avgValue'),
    delayLoss: num('delayLoss'),
  });
}

export async function initLiveProofPage(options = {}) {
  const { skipVisuals = false } = options;

  initCore('Live Proof Dashboard');

  const kpiNode = document.querySelector('[data-live-kpi]');
  const tickerNode = document.querySelector('[data-results-ticker]');
  const roiOutput = document.querySelector('[data-roi-output]');
  const roiBreakdown = document.querySelector('[data-roi-breakdown]');
  const splitRange = document.querySelector('[data-split-range]');
  const splitFill = document.querySelector('[data-split-fill]');
  const liveFilter = document.querySelector('[data-live-filter]');
  const liveFilterResult = document.querySelector('[data-live-filter-result]');

  if (kpiNode) {
    kpiNode.innerHTML = kpiRows
      .map((row) => `<article class="metric-card ${row.cls}"><h3>${row.label}</h3><p>${row.value}</p></article>`)
      .join('');
  }

  if (tickerNode) {
    tickerNode.textContent = 'Conversion feed: 19 schools moved from "considering" to "booked" in 48 hours | Legacy backlog reports still above 400 unread inquiries | Vienna relay kept overnight response under 3 minutes | County-by-county coverage now tracking 3,143 local markets';
  }

  const calcROI = () => {
    const roi = calculateLiveProofRoiFromDom();
    if (roiOutput) {
      roiOutput.textContent = formatUsd(Math.max(0, roi.projectedRevenue));
    }
    if (roiBreakdown) {
      roiBreakdown.innerHTML = `
        Baseline monthly revenue: <strong>${formatUsd(roi.legacyRevenue)}</strong><br>
        Lead opportunities recovered: <strong>${Math.round(roi.rescued)}</strong><br>
        Estimated monthly lift with MatBoss: <strong style="color: var(--win)">${formatUsd(roi.lift)}</strong>
      `;
    }
  };

  document.querySelectorAll('[data-roi-input]').forEach((input) => {
    input.addEventListener('input', () => {
      const row = input.previousElementSibling;
      const output = row?.querySelector('output');
      if (output) output.textContent = String(input.value);
      calcROI();
    });
  });
  calcROI();

  splitRange?.addEventListener('input', () => {
    const pct = Number(splitRange.value || 50);
    if (splitFill) splitFill.style.width = `${pct}%`;
  });

  liveFilter?.addEventListener('change', () => {
    const fd = new FormData(liveFilter);
    const type = String(fd.get('type') || '').trim();
    const size = String(fd.get('size') || '').trim();
    const state = String(fd.get('state') || '').trim();
    const county = String(fd.get('county') || '').trim();
    const filterSummary = [
      type ? `type=${type}` : null,
      size ? `size=${size}` : null,
      state ? `state=${state}` : null,
      county ? `county=${county}` : null,
    ].filter(Boolean).join(', ');
    if (liveFilterResult) {
      liveFilterResult.textContent = filterSummary
        ? `Filter active: ${filterSummary}.`
        : 'Filters inactive. Showing full county model.';
    }
  });

  const ctaForm = document.querySelector('[data-live-cta]');
  const ctaResult = document.querySelector('[data-live-result]');

  ctaForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(ctaForm);
    const phone = String(fd.get('phone') || '').trim();
    const slot = String(fd.get('preferred') || '').trim();
    if (!phone || !slot) {
      if (ctaResult) ctaResult.textContent = 'Add phone and preferred slot to activate response routing.';
      return;
    }
    if (ctaResult) ctaResult.textContent = `Live callback queued for ${slot}. Response dispatch starts now.`;
    ctaForm.reset();
  });

  await initCountySelectors();
  const countyData = await loadCountyData();
  if (!skipVisuals) {
    await renderCountyCluster('#live-proof-map', countyData.pointCloud);
  }
}

if (!globalThis.__STATIC_TEST__) {
  void initLiveProofPage();
}
