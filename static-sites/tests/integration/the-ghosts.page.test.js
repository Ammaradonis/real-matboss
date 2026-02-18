import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function setGhostDom() {
  document.body.innerHTML = `
    <header data-site-header></header>
    <div data-loss-counter>$128,430</div>
    <input data-loss-input name="ghostLeads" value="120" />
    <input data-loss-input name="ghostResponse" value="44" />
    <input data-loss-input name="ghostValue" value="790" />
    <p data-loss-output></p>
    <button data-mode="legacy" class="active"></button>
    <button data-mode="competitor"></button>
    <button data-mode="matboss"></button>
    <ul data-week-timeline></ul>
    <ul data-inquiry-log></ul>
    <button data-ghost="backlog" type="button"></button>
    <div class="modal-backdrop" data-ghost-modal>
      <article class="modal">
        <h3 data-modal-title></h3>
        <p data-modal-body></p>
        <button data-close-modal type="button"></button>
      </article>
    </div>
    <div data-ghost-mask></div>
    <input data-ghost-split type="range" value="50" />
    <div data-accordion>
      <button type="button">Mon</button><div style="display:none">A</div>
      <button type="button">Tue</button><div style="display:none">B</div>
    </div>
  `;
}

describe('the ghosts page flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    setGhostDom();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('updates counters, timelines, modal, split mask, and accordion', async () => {
    vi.doMock('../../assets/js/common.js', () => ({
      initCore: vi.fn(),
      initCountySelectors: vi.fn().mockResolvedValue(null),
    }));

    await import('../../assets/js/the-ghosts.js');

    const before = document.querySelector('[data-loss-counter]').textContent;
    vi.advanceTimersByTime(2000);
    const after = document.querySelector('[data-loss-counter]').textContent;
    expect(after).not.toBe(before);

    const lossInput = document.querySelector('[name="ghostResponse"]');
    lossInput.value = '70';
    lossInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('[data-loss-output]').textContent).toContain('Projected monthly leak');

    const matbossMode = document.querySelector('[data-mode="matboss"]');
    matbossMode.click();
    expect(document.querySelector('[data-week-timeline]').textContent).toContain('AI triage');

    document.querySelector('[data-ghost="backlog"]').click();
    expect(document.querySelector('[data-ghost-modal]').classList.contains('open')).toBe(true);
    expect(document.querySelector('[data-modal-title]').textContent).toContain('Backlog');

    const split = document.querySelector('[data-ghost-split]');
    split.value = '70';
    split.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('[data-ghost-mask]').style.width).toBe('70%');

    const accordionBtn = document.querySelector('[data-accordion] button');
    accordionBtn.click();
    expect(accordionBtn.nextElementSibling.style.display).toBe('block');
  });
});
