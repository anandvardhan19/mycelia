export interface CohortDef {
  name: string;
  short: string;
  start: number;
  end: number;
}

// Conventional Western birth-year cohort boundaries (Pew Research / common usage).
export const COHORTS: CohortDef[] = [
  { name: "Lost Generation", short: "Lost Gen", start: -Infinity, end: 1900 },
  { name: "Greatest Generation", short: "Greatest Gen", start: 1901, end: 1927 },
  { name: "Silent Generation", short: "Silent Gen", start: 1928, end: 1945 },
  { name: "Baby Boomer", short: "Boomer", start: 1946, end: 1964 },
  { name: "Generation X", short: "Gen X", start: 1965, end: 1980 },
  { name: "Millennial", short: "Millennial", start: 1981, end: 1996 },
  { name: "Generation Z", short: "Gen Z", start: 1997, end: 2012 },
  { name: "Generation Alpha", short: "Gen Alpha", start: 2013, end: 2029 },
  { name: "Generation Beta", short: "Gen Beta", start: 2030, end: Infinity },
];

export function birthYearOf(born?: string): number | undefined {
  if (!born) return undefined;
  const m = born.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : undefined;
}

export function cohortFor(born?: string): CohortDef | undefined {
  const year = birthYearOf(born);
  if (year === undefined) return undefined;
  return COHORTS.find((c) => year >= c.start && year <= c.end);
}

/** Relationship-generation label relative to the youngest (deepest) generation in a lineage. */
export function ancestralLabel(gensBack: number): string {
  if (gensBack <= 0) return "Current generation";
  if (gensBack === 1) return "Parents";
  if (gensBack === 2) return "Grandparents";
  const greats = gensBack - 2;
  const prefix = Array(greats).fill("Great").join("-");
  return `${prefix}-grandparents`;
}

export function ancestralLabelShort(gensBack: number): string {
  if (gensBack <= 0) return "You";
  if (gensBack === 1) return "Parents";
  if (gensBack === 2) return "Grandparents";
  const greats = gensBack - 2;
  if (greats >= 3) return `${greats}x-great-grandparents`;
  const prefix = Array(greats).fill("Great").join("-");
  return `${prefix}-grandparents`;
}
