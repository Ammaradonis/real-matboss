import { calculateQualificationScore } from './qualification-score';

describe('calculateQualificationScore', () => {
  it('scores high-intent and high-capacity leads near the top', () => {
    const score = calculateQualificationScore({
      activeStudents: 600,
      budgetRange: '$5,000 - $10,000',
      implementationTimeline: 'ASAP',
    });

    expect(score).toBe(80);
  });

  it('scores lower-intent leads significantly lower', () => {
    const score = calculateQualificationScore({
      activeStudents: 40,
      budgetRange: 'unknown',
      implementationTimeline: 'later this year',
    });

    expect(score).toBeLessThan(35);
  });
});
