import { initCore, initCountySelectors } from './common.js';
import { loadCountyData } from './counties.js';
import { initGlobe } from './globe.js';

const milestones = [
  { year: 2015, text: 'Ammar begins rebuilding from displacement, focused on resilient systems.' },
  { year: 2017, text: 'Early automation experiments target response-time collapse in lead handling.' },
  { year: 2019, text: 'First cross-timezone operating model runs between Europe and U.S. contacts.' },
  { year: 2021, text: 'County-based market mapping becomes core to routing strategy.' },
  { year: 2023, text: 'Unified booking + CRM + email loop ships as a single command surface.' },
  { year: 2024, text: 'Vienna relay model scales across U.S. school categories and time zones.' },
];

const manifestoLines = [
  'Speed is not a slogan; it is the operating baseline.',
  'Context stays attached to every lead, every handoff, every response.',
  'Geography is a routing advantage, not an excuse for delay.',
  'Every county matters because every school has local realities.',
  'Systems win where improvisation fails.',
];

export async function initViennaPage(options = {}) {
  const { skipVisuals = false } = options;

  initCore('Vienna to Every Dojo');

  const timelineNode = document.querySelector('[data-vienna-timeline]');
  if (timelineNode) {
    timelineNode.innerHTML = milestones
      .map((item) => `<article class="timeline-item reveal"><strong>${item.year}</strong> — ${item.text}</article>`)
      .join('');
  }

  document.querySelectorAll('[data-philosophy]').forEach((card) => {
    card.addEventListener('click', () => {
      card.classList.toggle('active');
      const body = card.querySelector('[data-philosophy-body]');
      if (body) body.style.display = card.classList.contains('active') ? 'block' : 'none';
    });
  });

  const schoolsNode = document.querySelector('[data-active-schools]');
  let schools = 286;
  setInterval(() => {
    schools += Math.random() > 0.72 ? 1 : 0;
    if (schoolsNode) schoolsNode.textContent = schools.toString();
  }, 2400);

  const manifestoNode = document.querySelector('[data-manifesto]');
  if (manifestoNode) {
    manifestoNode.innerHTML = manifestoLines.map((line) => `<li>${line}</li>`).join('');
  }

  const manifestoNetwork = document.querySelector('[data-manifesto-network]');
  if (manifestoNetwork) {
    manifestoNetwork.innerHTML = `
      <line x1="80" y1="95" x2="210" y2="60" stroke="rgba(79,217,255,.48)" />
      <line x1="80" y1="95" x2="210" y2="130" stroke="rgba(79,217,255,.48)" />
      <line x1="210" y1="60" x2="350" y2="42" stroke="rgba(255,209,102,.48)" />
      <line x1="210" y1="130" x2="350" y2="148" stroke="rgba(255,209,102,.48)" />
      <line x1="350" y1="42" x2="490" y2="95" stroke="rgba(70,216,137,.48)" />
      <line x1="350" y1="148" x2="490" y2="95" stroke="rgba(70,216,137,.48)" />
      <circle cx="80" cy="95" r="20" fill="rgba(79,217,255,.22)" stroke="rgba(79,217,255,.6)" />
      <circle cx="210" cy="60" r="16" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)" />
      <circle cx="210" cy="130" r="16" fill="rgba(255,255,255,.08)" stroke="rgba(255,255,255,.35)" />
      <circle cx="350" cy="42" r="16" fill="rgba(255,209,102,.2)" stroke="rgba(255,209,102,.6)" />
      <circle cx="350" cy="148" r="16" fill="rgba(255,209,102,.2)" stroke="rgba(255,209,102,.6)" />
      <circle cx="490" cy="95" r="20" fill="rgba(70,216,137,.22)" stroke="rgba(70,216,137,.6)" />
      <text x="66" y="99" fill="#f8f0dd" font-size="11">Vienna</text>
      <text x="173" y="64" fill="#f8f0dd" font-size="10">Speed</text>
      <text x="159" y="134" fill="#f8f0dd" font-size="10">Context</text>
      <text x="315" y="46" fill="#f8f0dd" font-size="10">County</text>
      <text x="315" y="152" fill="#f8f0dd" font-size="10">System</text>
      <text x="457" y="99" fill="#f8f0dd" font-size="11">Dojo</text>
    `;
  }

  const cta = document.querySelector('[data-vienna-cta]');
  const ctaOut = document.querySelector('[data-vienna-result]');
  cta?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(cta);
    const owner = String(fd.get('owner') || '').trim();
    const state = String(fd.get('state') || '').trim();
    if (!owner || !state) {
      if (ctaOut) ctaOut.textContent = 'Add owner + state to start county readiness mapping.';
      return;
    }
    if (ctaOut) ctaOut.textContent = `Signal received, ${owner}. Vienna operations prepared a rollout brief for ${state}.`;
    cta.reset();
  });

  await initCountySelectors();
  const countyData = await loadCountyData();
  if (!skipVisuals) {
    await initGlobe('#vienna-globe', countyData.pointCloud, { speed: 0.0024, pointLimit: 940 });
  }
}

if (!globalThis.__STATIC_TEST__) {
  void initViennaPage();
}
