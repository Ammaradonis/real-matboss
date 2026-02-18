import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setLandingDom() {
  document.body.innerHTML = `
    <header data-site-header></header>
    <section data-swipe-nav>
      <h2 data-hero-mode></h2>
      <p data-mode-detail></p>
      <p data-chaos-pill></p>
      <article data-parallax-card></article>
      <article data-parallax-card></article>
      <article data-parallax-card></article>
    </section>
    <form data-lead-form>
      <input name="owner" />
      <input name="email" />
      <select name="state"><option value="Arizona">Arizona</option></select>
      <select name="county"><option value="Maricopa County">Maricopa County</option></select>
      <button type="submit">Send</button>
    </form>
    <p data-lead-result></p>
    <button data-open-lead-modal>Open</button>
    <div class="modal-backdrop" data-lead-modal>
      <article class="modal">
        <form data-lead-modal-form>
          <input name="owner" />
          <input name="email" />
          <input name="phone" />
          <select name="state"><option value="Arizona">Arizona</option></select>
          <select name="county"><option value="Maricopa County">Maricopa County</option></select>
          <button type="submit">Submit</button>
        </form>
        <button data-close-lead-modal type="button">Close</button>
        <p data-lead-modal-result></p>
      </article>
    </div>
    <canvas id="landing-globe"></canvas>
  `;
}

describe('landing page flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setLandingDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('binds modal and lead forms with validation and success states', async () => {
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

    await import('../../assets/js/landing.js');
    await Promise.resolve();

    const leadForm = document.querySelector('[data-lead-form]');
    const leadResult = document.querySelector('[data-lead-result]');
    leadForm.querySelector('[name="owner"]').value = 'Ammar';
    leadForm.querySelector('[name="email"]').value = 'owner@school.com';
    leadForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(leadResult.textContent).toContain('Signal accepted');

    const open = document.querySelector('[data-open-lead-modal]');
    const modal = document.querySelector('[data-lead-modal]');
    open.click();
    expect(modal.classList.contains('open')).toBe(true);

    const modalForm = document.querySelector('[data-lead-modal-form]');
    modalForm.querySelector('[name="owner"]').value = 'Ammar';
    modalForm.querySelector('[name="email"]').value = 'owner@school.com';
    modalForm.querySelector('[name="phone"]').value = '+1 602 555 0101';
    modalForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('[data-lead-modal-result]').textContent).toContain('County claim confirmed');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.classList.contains('open')).toBe(false);
  });
});
