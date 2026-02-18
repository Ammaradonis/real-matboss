import { countiesForState, loadCountyData } from './counties.js';

export function initScrollMeter() {
  const meter = document.querySelector('.scroll-meter');
  if (!meter) return;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    meter.style.width = `${Math.min(100, Math.max(0, pct))}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

export function initReveal() {
  const nodes = document.querySelectorAll('.reveal');
  if (!nodes.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add('in');
      }
    },
    { threshold: 0.1 },
  );

  nodes.forEach((node) => io.observe(node));
}

export function setActiveNav() {
  const current = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.nav-links a').forEach((link) => {
    const href = link.getAttribute('href')?.replace(/\/$/, '') || '/';
    if (href === current) link.classList.add('active');
  });
}

export function initTimeParadox() {
  const localNode = document.querySelector('[data-local-time]');
  const viennaNode = document.querySelector('[data-vienna-time]');
  if (!localNode && !viennaNode) return;

  const update = () => {
    const now = new Date();
    const local = now.toLocaleString(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      month: 'short', day: '2-digit',
    });
    const vienna = now.toLocaleString(undefined, {
      timeZone: 'Europe/Vienna',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      month: 'short', day: '2-digit',
    });

    if (localNode) localNode.textContent = local;
    if (viennaNode) viennaNode.textContent = vienna;
  };

  update();
  setInterval(update, 1000);
}

export async function initCountySelectors() {
  const stateSelects = document.querySelectorAll('select[data-county-state]');
  if (!stateSelects.length) return null;

  const data = await loadCountyData();
  const countySelectMap = new Map();

  stateSelects.forEach((stateSelect) => {
    const target = stateSelect.getAttribute('data-county-target');
    const countySelect = target ? document.querySelector(`select[data-county="${target}"]`) : null;
    if (!countySelect) return;

    countySelectMap.set(stateSelect, countySelect);

    data.stateNames.forEach((state) => {
      const opt = document.createElement('option');
      opt.value = state;
      opt.textContent = state;
      stateSelect.append(opt);
    });

    const fillCounty = () => {
      countySelect.innerHTML = '<option value="">Select county</option>';
      const counties = countiesForState(data, stateSelect.value);
      counties.forEach((county) => {
        const opt = document.createElement('option');
        opt.value = county;
        opt.textContent = county;
        countySelect.append(opt);
      });
    };

    stateSelect.addEventListener('change', fillCounty);
    fillCounty();
  });

  return data;
}

export function initHeader(payload = { title: 'MatBoss Static' }) {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  header.innerHTML = `
    <div class="branding">
      <div class="kicker">Vienna to Every U.S. School</div>
      <h1>${payload.title}</h1>
    </div>
    <nav class="nav-links" aria-label="Primary navigation">
      <a href="/">Home</a>
      <a href="/live-proof/">Live Proof</a>
      <a href="/the-ghosts/">The Ghosts</a>
      <a href="/the-system/">The System</a>
      <a href="/vienna-to-every-dojo/">Vienna to Every Dojo</a>
    </nav>
  `;

  setActiveNav();
}

export function initCore(pageTitle) {
  initHeader({ title: pageTitle });
  initScrollMeter();
  initReveal();
  initTimeParadox();
}
