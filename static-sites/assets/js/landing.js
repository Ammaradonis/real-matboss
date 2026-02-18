import { initCore, initCountySelectors } from './common.js';
import { loadCountyData } from './counties.js';
import { initGlobe } from './globe.js';

const alerts = [
  'Live pulse: 14 inbound leads triaged while legacy inboxes stalled.',
  'County watch: Maricopa, Harris, and Miami-Dade showing strongest conversion momentum.',
  'Response monitor: MatBoss median reply 2m 11s; legacy stack benchmark 37m 05s.',
  'Pipeline alert: 9 owners moved from inquiry to booked call before first coffee.',
  'Coverage stream: 3,143 county records synced with Vienna routing graph.',
];

export function setHeroMode(modeNode, modeDetailNode, hour = new Date().getHours()) {
  const day = hour >= 7 && hour < 18;
  if (modeNode) {
    modeNode.textContent = day ? 'Day Shift: U.S. Lead Surge' : 'Night Shift: Vienna Relay On';
  }
  if (modeDetailNode) {
    modeDetailNode.textContent = day
      ? 'Local school owners are active. MatBoss routes first-contact in under three minutes.'
      : 'When U.S. teams sleep, Vienna operations hold the line and pre-qualify every inbound lead.';
  }
}

export async function initLandingPage(options = {}) {
  const { skipVisuals = false } = options;

  initCore('MatBoss Frontline');

  const modeNode = document.querySelector('[data-hero-mode]');
  const modeDetailNode = document.querySelector('[data-mode-detail]');
  const pillNode = document.querySelector('[data-chaos-pill]');
  setHeroMode(modeNode, modeDetailNode);

  let idx = 0;
  setInterval(() => {
    if (!pillNode) return;
    pillNode.textContent = alerts[idx % alerts.length];
    idx += 1;
  }, 2800);

  const cards = document.querySelectorAll('[data-parallax-card]');
  window.addEventListener('scroll', () => {
    const top = window.scrollY;
    cards.forEach((card, i) => {
      const factor = 0.04 + i * 0.012;
      card.style.transform = `translateY(${top * factor}px)`;
    });
  }, { passive: true });

  const leadForm = document.querySelector('[data-lead-form]');
  const leadResult = document.querySelector('[data-lead-result]');
  const leadModal = document.querySelector('[data-lead-modal]');
  const openLeadModal = document.querySelector('[data-open-lead-modal]');
  const closeLeadModal = document.querySelector('[data-close-lead-modal]');
  const leadModalForm = document.querySelector('[data-lead-modal-form]');
  const leadModalResult = document.querySelector('[data-lead-modal-result]');

  const openModal = () => leadModal?.classList.add('open');
  const closeModal = () => leadModal?.classList.remove('open');

  openLeadModal?.addEventListener('click', openModal);
  closeLeadModal?.addEventListener('click', closeModal);

  leadModal?.addEventListener('click', (event) => {
    if (event.target === leadModal) closeModal();
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  leadForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(leadForm);
    const owner = String(fd.get('owner') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const state = String(fd.get('state') || '').trim();
    const county = String(fd.get('county') || '').trim();

    if (!owner || !email || !state || !county) {
      if (leadResult) leadResult.textContent = 'Complete all fields to claim county coverage.';
      return;
    }

    if (leadResult) {
      leadResult.textContent = `Signal accepted: ${owner} in ${county}, ${state}. Vienna response cell is primed.`;
    }

    leadForm.reset();
  });

  leadModalForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const fd = new FormData(leadModalForm);
    const owner = String(fd.get('owner') || '').trim();
    const email = String(fd.get('email') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const state = String(fd.get('state') || '').trim();
    const county = String(fd.get('county') || '').trim();

    if (!owner || !email || !phone || !state || !county) {
      if (leadModalResult) leadModalResult.textContent = 'Add owner, email, phone, state, and county to activate routing.';
      return;
    }

    if (leadModalResult) {
      leadModalResult.textContent = `County claim confirmed for ${county}, ${state}. Primary callback for ${owner} (${phone}) is queued.`;
    }

    leadModalForm.reset();
  });

  const swipeArea = document.querySelector('[data-swipe-nav]');
  const routes = ['/', '/live-proof/', '/the-ghosts/', '/the-system/', '/vienna-to-every-dojo/'];
  let touchStart = null;

  swipeArea?.addEventListener('touchstart', (event) => {
    touchStart = event.changedTouches[0].clientX;
  });

  swipeArea?.addEventListener('touchend', (event) => {
    if (touchStart === null) return;
    const end = event.changedTouches[0].clientX;
    const delta = end - touchStart;
    const current = window.location.pathname;
    const i = routes.findIndex((route) => route === current);
    if (Math.abs(delta) > 55 && i >= 0) {
      if (delta < 0 && i < routes.length - 1) window.location.href = routes[i + 1];
      if (delta > 0 && i > 0) window.location.href = routes[i - 1];
    }
    touchStart = null;
  });

  await initCountySelectors();
  const countyData = await loadCountyData();
  if (!skipVisuals) {
    await initGlobe('#landing-globe', countyData.pointCloud, { speed: 0.0027, pointLimit: 820 });
  }
}

if (!globalThis.__STATIC_TEST__) {
  void initLandingPage();
}
