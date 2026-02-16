export interface QualificationInput {
  activeStudents: number;
  budgetRange?: string | null;
  implementationTimeline?: string | null;
}

export function calculateQualificationScore(input: QualificationInput): number {
  let score = 0;

  if (input.activeStudents >= 500) score += 50;
  else if (input.activeStudents >= 250) score += 35;
  else if (input.activeStudents >= 100) score += 20;
  else score += 10;

  const budget = (input.budgetRange ?? '').toLowerCase();
  if (budget.includes('5000') || budget.includes('10000') || budget.includes('high')) {
    score += 30;
  } else if (budget.includes('1000') || budget.includes('2500') || budget.includes('medium')) {
    score += 20;
  } else if (budget) {
    score += 10;
  }

  const timeline = (input.implementationTimeline ?? '').toLowerCase();
  if (timeline.includes('asap') || timeline.includes('immediate') || timeline.includes('30')) {
    score += 20;
  } else if (timeline.includes('60') || timeline.includes('90')) {
    score += 15;
  } else if (timeline) {
    score += 8;
  }

  return Math.min(100, score);
}
