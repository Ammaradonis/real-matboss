export function calculateRoi({ monthlyLeads, showRate, closeRate, avgValue, delayLoss }) {
  const legacyRevenue = monthlyLeads * (showRate / 100) * (closeRate / 100) * avgValue;
  const rescued = monthlyLeads * (delayLoss / 100) * 0.62;
  const projectedRevenue = legacyRevenue + rescued * (closeRate / 100) * avgValue;
  const lift = projectedRevenue - legacyRevenue;

  return {
    legacyRevenue,
    rescued,
    projectedRevenue,
    lift,
  };
}

export function calculateGhostLoss({ leads, response, avgValue }) {
  const legacyCapture = Math.max(0.08, 1 - response / 100);
  const missed = Math.round(leads * legacyCapture * 0.62);
  const monthlyLoss = Math.round(missed * avgValue);

  return {
    legacyCapture,
    missed,
    monthlyLoss,
  };
}

export function formatUsd(value) {
  return `$${Math.round(value).toLocaleString()}`;
}
