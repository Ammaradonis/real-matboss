import { initCore, initCountySelectors } from './common.js';
import { calculateGhostLoss, formatUsd } from './calculations.js';

const timelineModes = {
  legacy: ['Day 1: Inbox backlog', 'Day 2: Callback misses', 'Day 3: Prospect stops responding', 'Day 4: Lead switches to competitor'],
  competitor: ['Day 1: Auto-email only', 'Day 2: Late manual reply', 'Day 3: No follow-up context', 'Day 4: Lead marked cold'],
  matboss: ['Day 1: AI triage in under 3 minutes', 'Day 2: Multi-channel reminder', 'Day 3: Owner scheduled', 'Day 4: Discovery call confirmed'],
};

const ghostProfiles = {
  backlog: ['Backlog Phantom', 'Stacks up untouched inquiries until interest disappears.'],
  silent: ['Silent Follow-Up Ghost', 'Sends one generic email and never answers clarifying questions.'],
  schedule: ['Schedule Drift Specter', 'Fails to reconcile timezone differences and misses owner windows.'],
  data: ['Fragmented Data Wraith', 'Splits lead context across tools so no one sees complete intent.'],
};

const logs = [
  '08:12 AM | New inquiry submitted | No response for 41 minutes',
  '09:07 AM | Parent requested trial class | Follow-up missed',
  '11:34 AM | Adult prospect asked pricing | Routed to unattended inbox',
  '02:51 PM | Returning lead asked about schedule | Reply sent after 3h 22m',
  '07:18 PM | Late evening inquiry | Lead dropped before morning',
];

export function calculateLossFromDom() {
  const leads = Number(document.querySelector('[name="ghostLeads"]')?.value || 0);
  const response = Number(document.querySelector('[name="ghostResponse"]')?.value || 0);
  const avgValue = Number(document.querySelector('[name="ghostValue"]')?.value || 0);
  return calculateGhostLoss({ leads, response, avgValue });
}

export async function initGhostsPage() {
  initCore('The Ghosts of Missed Leads');

  const counterNode = document.querySelector('[data-loss-counter]');
  let loss = 128430;
  setInterval(() => {
    loss += Math.floor(Math.random() * 43) + 12;
    if (counterNode) counterNode.textContent = formatUsd(loss);
  }, 1350);

  const renderLoss = () => {
    const metrics = calculateLossFromDom();
    const out = document.querySelector('[data-loss-output]');
    if (out) {
      out.innerHTML = `Projected monthly leak: <strong style="color: var(--loss)">${formatUsd(metrics.monthlyLoss)}</strong><br>Missed inquiries likely to stall: <strong>${metrics.missed}</strong>`;
    }
  };

  document.querySelectorAll('[data-loss-input]').forEach((input) => {
    input.addEventListener('input', renderLoss);
  });
  renderLoss();

  const timelineNode = document.querySelector('[data-week-timeline]');
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.getAttribute('data-mode');
      if (!mode || !timelineNode) return;
      document.querySelectorAll('[data-mode]').forEach((btn) => btn.classList.remove('active'));
      button.classList.add('active');
      timelineNode.innerHTML = timelineModes[mode]
        .map((line) => `<li class="timeline-item">${line}</li>`)
        .join('');
    });
  });
  if (timelineNode) {
    timelineNode.innerHTML = timelineModes.legacy.map((line) => `<li class="timeline-item">${line}</li>`).join('');
  }

  const logList = document.querySelector('[data-inquiry-log]');
  if (logList) {
    logList.innerHTML = logs.map((line) => `<li>${line}</li>`).join('');
  }

  const modal = document.querySelector('[data-ghost-modal]');
  const modalTitle = modal?.querySelector('[data-modal-title]');
  const modalBody = modal?.querySelector('[data-modal-body]');

  const openGhostModal = (key) => {
    if (!modal || !modalTitle || !modalBody) return;
    const [title, text] = ghostProfiles[key] || ['Unknown', 'No details available'];
    modalTitle.textContent = title;
    modalBody.textContent = text;
    modal.classList.add('open');
  };

  document.querySelectorAll('[data-ghost]').forEach((button) => {
    button.addEventListener('click', () => openGhostModal(button.getAttribute('data-ghost')));
  });

  modal?.querySelector('[data-close-modal]')?.addEventListener('click', () => {
    modal.classList.remove('open');
  });
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) modal.classList.remove('open');
  });

  const split = document.querySelector('[data-ghost-split]');
  const splitMask = document.querySelector('[data-ghost-mask]');
  split?.addEventListener('input', () => {
    const pct = Number(split.value || 50);
    if (splitMask) splitMask.style.width = `${pct}%`;
  });

  document.querySelectorAll('[data-accordion] button').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = button.nextElementSibling;
      if (!panel) return;
      const open = panel.hasAttribute('data-open');
      panel.toggleAttribute('data-open', !open);
      panel.style.display = open ? 'none' : 'block';
    });
  });

  await initCountySelectors();
}

if (!globalThis.__STATIC_TEST__) {
  void initGhostsPage();
}
