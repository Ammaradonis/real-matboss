import { initCore, initCountySelectors } from './common.js';
import { loadCountyData } from './counties.js';
import { renderUSCoverage } from './map.js';

const copyBlocks = {
  plain: 'MatBoss listens, qualifies intent, and routes owner-ready leads in under three minutes. Your team sees context instantly, not hours later.',
  technical: 'Ingress events stream into tenant-scoped queues, then policy engines score urgency and dispatch channel orchestration. Booking state syncs in PostgreSQL + WebSocket fanout.',
};

const journey = {
  kids: ['Parent message', 'Intent check', 'Trial booked', 'Reminder chain', 'Show-up'],
  adult: ['Inquiry captured', 'Goals tagged', 'Coach match', 'Consult call', 'Onboarding'],
  mixed: ['Lead scored', 'Program fit', 'Schedule sync', 'Follow-up wave', 'Offer decision'],
  traditional: ['Phone + web merge', 'Manual friction removed', 'Priority ranking', 'Owner handoff', 'Retention flow'],
};

const archModes = {
  visual: `
    <svg viewBox="0 0 820 220" role="img" aria-label="Visual architecture">
      <rect x="20" y="72" width="130" height="72" rx="14" fill="rgba(79,217,255,.22)" stroke="rgba(79,217,255,.6)" />
      <rect x="190" y="30" width="140" height="50" rx="12" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.22)" />
      <rect x="190" y="90" width="140" height="50" rx="12" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.22)" />
      <rect x="190" y="150" width="140" height="50" rx="12" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.22)" />
      <rect x="370" y="72" width="130" height="72" rx="14" fill="rgba(255,209,102,.2)" stroke="rgba(255,209,102,.6)" />
      <rect x="540" y="72" width="130" height="72" rx="14" fill="rgba(70,216,137,.22)" stroke="rgba(70,216,137,.6)" />
      <rect x="690" y="72" width="110" height="72" rx="14" fill="rgba(255,92,112,.18)" stroke="rgba(255,92,112,.55)" />
      <text x="38" y="112" fill="#f8f0dd">Lead Sources</text>
      <text x="208" y="61" fill="#f8f0dd">Booking UI</text>
      <text x="208" y="121" fill="#f8f0dd">Admin UI</text>
      <text x="208" y="181" fill="#f8f0dd">Static Pages</text>
      <text x="392" y="112" fill="#f8f0dd">Nginx Proxy</text>
      <text x="565" y="112" fill="#f8f0dd">API Core</text>
      <text x="714" y="112" fill="#f8f0dd">PostgreSQL</text>
      <path d="M150 108 L190 55 M150 108 L190 115 M150 108 L190 175 M330 108 L370 108 M500 108 L540 108 M670 108 L690 108" stroke="rgba(255,255,255,.45)" fill="none" />
    </svg>
  `,
  technical: `
    <pre style="margin:0;padding:.8rem;border:1px solid var(--line);border-radius:.8rem;background:rgba(255,255,255,.02);color:var(--ink-1);overflow:auto">Ingress -> Nginx -> /book /admin /api /ws
API modules: auth | availability | booking | admin | email
Database: PostgreSQL 15+, exclusion constraints, audit events
Realtime: Socket.IO updates on booking + availability writes</pre>
  `,
};

const daySteps = [
  '06:00 - Overnight leads are triaged and tagged before local teams open.',
  '09:00 - Priority callbacks route by county and intent score.',
  '12:30 - Reminder wave fires for high-intent prospects.',
  '16:00 - Admin dashboard surfaces conversion and queue anomalies.',
  '20:00 - Evening leads enter Vienna-assisted relay for next-day handoff.',
];

function renderJourney(type) {
  const journeyNode = document.querySelector('[data-journey-map]');
  if (!journeyNode) return;
  journeyNode.innerHTML = journey[type].map((step) => `<li class="timeline-item">${step}</li>`).join('');
}

function updateStatus() {
  const statusNode = document.querySelector('[data-op-status]');
  if (!statusNode) return;
  const p95 = (320 + Math.random() * 70).toFixed(0);
  const errors = (0.1 + Math.random() * 0.3).toFixed(2);
  const uptime = (99.8 + Math.random() * 0.18).toFixed(3);
  statusNode.innerHTML = `
    <article class="metric-card win"><h3>Uptime</h3><p>${uptime}%</p></article>
    <article class="metric-card"><h3>P95 API</h3><p>${p95}ms</p></article>
    <article class="metric-card loss"><h3>Error Rate</h3><p>${errors}%</p></article>
    <article class="metric-card win"><h3>Incident Queue</h3><p>0 critical</p></article>
  `;
}

export async function initSystemPage(options = {}) {
  const { skipVisuals = false } = options;

  initCore('The MatBoss System');

  const copyNode = document.querySelector('[data-system-copy]');
  document.querySelectorAll('[data-system-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.getAttribute('data-system-mode');
      if (!mode || !copyNode) return;
      document.querySelectorAll('[data-system-mode]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      copyNode.textContent = copyBlocks[mode] || copyBlocks.plain;
    });
  });

  renderJourney('kids');
  document.querySelectorAll('[data-school-type]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.getAttribute('data-school-type');
      if (!type || !(type in journey)) return;
      renderJourney(type);
      document.querySelectorAll('[data-school-type]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });

  updateStatus();
  setInterval(updateStatus, 4000);

  const latencySvg = document.querySelector('#latency-chart');
  if (latencySvg) {
    const width = 900;
    const height = 200;
    latencySvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const points = Array.from({ length: 24 }, (_, i) => ({
      x: i,
      p50: 110 + Math.sin(i / 2.4) * 15 + Math.random() * 8,
      p95: 260 + Math.cos(i / 2.8) * 40 + Math.random() * 20,
    }));
    const x = (v) => 20 + (v / 23) * 860;
    const y = (v) => 180 - (v / 380) * 150;
    const path = (key) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x)},${y(p[key])}`).join(' ');
    latencySvg.innerHTML = `
      <path d="${path('p95')}" stroke="#ff5c70" fill="none" stroke-width="2" />
      <path d="${path('p50')}" stroke="#46d889" fill="none" stroke-width="2" />
      <text x="26" y="24" fill="#9da8bb" font-size="12">Latency profile (P50/P95)</text>
    `;
  }

  const buildMessage = () => {
    const formality = Number(document.querySelector('[name="formality"]')?.value || 50);
    const length = Number(document.querySelector('[name="length"]')?.value || 50);
    const friendly = Number(document.querySelector('[name="friendly"]')?.value || 50);
    const tone = formality > 60 ? 'Executive and direct' : 'Conversational and crisp';
    const size = length > 60 ? 'expanded response with context' : 'compact response';
    const warmth = friendly > 60 ? 'high-empathy close' : 'task-focused close';
    const out = document.querySelector('[data-message-output]');
    if (out) out.textContent = `${tone}; ${size}; ${warmth}. Suggested reply cadence: under 3 minutes.`;
  };

  document.querySelectorAll('[data-message-slider]').forEach((input) => {
    input.addEventListener('input', buildMessage);
  });
  buildMessage();

  const integrationNode = document.querySelector('[data-integration-badges]');
  if (integrationNode) {
    const rows = [
      ['Google Ads', 'Verified', 'win'],
      ['Meta Lead Ads', 'Verified', 'win'],
      ['SMS Relay', 'Healthy', 'win'],
      ['Email Queue', 'Healthy', 'win'],
      ['Mindbody Import', 'Watch', 'loss'],
      ['Zen Planner Import', 'Watch', 'loss'],
    ];
    integrationNode.innerHTML = rows
      .map(([name, status, cls]) => `<span class="badge ${cls}">${name}: ${status}</span>`)
      .join('');
  }

  const archNode = document.querySelector('[data-arch-diagram]');
  const renderArch = (mode = 'visual') => {
    if (!archNode) return;
    archNode.innerHTML = archModes[mode] || archModes.visual;
  };
  renderArch('visual');

  document.querySelectorAll('[data-arch-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.getAttribute('data-arch-mode');
      if (!mode) return;
      document.querySelectorAll('[data-arch-mode]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      renderArch(mode);
    });
  });

  const daySlider = document.querySelector('[data-day-slider]');
  const dayOutput = document.querySelector('[data-day-output]');
  const renderDayStep = () => {
    const idx = Math.max(1, Number(daySlider?.value || 1)) - 1;
    if (dayOutput) dayOutput.textContent = daySteps[idx] || daySteps[0];
  };
  daySlider?.addEventListener('input', renderDayStep);
  renderDayStep();

  const ctaForm = document.querySelector('[data-system-cta]');
  const ctaResult = document.querySelector('[data-system-cta-result]');
  ctaForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(ctaForm);
    const owner = String(fd.get('owner') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const state = String(fd.get('state') || '').trim();
    const county = String(fd.get('county') || '').trim();
    if (!owner || !email || !state || !county) {
      if (ctaResult) ctaResult.textContent = 'Complete owner, email, state, and county to generate the brief.';
      return;
    }
    if (ctaResult) ctaResult.textContent = `System brief queued for ${owner} (${email}) in ${county}, ${state}.`;
    ctaForm.reset();
  });

  await initCountySelectors();
  const countyData = await loadCountyData();
  if (!skipVisuals) {
    await renderUSCoverage('#system-county-map', countyData.stateCoverage);
  }
}

if (!globalThis.__STATIC_TEST__) {
  void initSystemPage();
}
