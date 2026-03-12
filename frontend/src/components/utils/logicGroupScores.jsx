/**
 * Normalize logic-group scores so integer values always total exactly 100.
 * Remainder points are assigned to the first groups deterministically.
 */
export function normalizeLogicGroupScores(groups = []) {
  const count = groups.length;
  if (count === 0) return [];

  const base = Math.floor(100 / count);
  const remainder = 100 % count;

  return groups.map((group, index) => ({
    ...group,
    score: base + (index < remainder ? 1 : 0),
  }));
}
