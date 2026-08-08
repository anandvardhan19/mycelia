import { useMemo } from "react";
import type { Person } from "../types";
import type { TreeLayout } from "../utils/layout";
import { LEVEL_SPACING_Y } from "../utils/layout";
import { ancestralLabelShort, cohortFor } from "../utils/generations";

interface Band {
  level: number;
  y: number;
  label: string;
  cohort?: string;
}

export default function GenerationBands({
  layout,
  people,
}: {
  layout: TreeLayout;
  people: Person[];
}) {
  const bands = useMemo<Band[]>(() => {
    if (layout.nodes.size === 0) return [];
    const levels = new Set<number>();
    for (const n of layout.nodes.values()) levels.add(n.level);
    const peopleById = new Map(people.map((p) => [p.id, p]));

    return [...levels]
      .sort((a, b) => a - b)
      .map((level) => {
        const gensBack = layout.maxLevel - level;
        const cohortCounts = new Map<string, number>();
        for (const n of layout.nodes.values()) {
          if (n.level !== level) continue;
          const cohort = cohortFor(peopleById.get(n.id)?.born);
          if (cohort) cohortCounts.set(cohort.short, (cohortCounts.get(cohort.short) ?? 0) + 1);
        }
        let dominantCohort: string | undefined;
        let best = 0;
        for (const [name, count] of cohortCounts) {
          if (count > best) {
            best = count;
            dominantCohort = name;
          }
        }
        return {
          level,
          y: level * LEVEL_SPACING_Y,
          label: ancestralLabelShort(gensBack),
          cohort: dominantCohort,
        };
      });
  }, [layout, people]);

  if (bands.length === 0) return null;

  const left = layout.minX - 190;
  const lineRight = layout.maxX + 90;
  const pillWidth = 180;

  return (
    <g className="generation-bands" pointerEvents="none">
      {bands.map((b) => (
        <g key={b.level} transform={`translate(0, ${b.y})`}>
          <line
            x1={left}
            x2={lineRight}
            y1={0}
            y2={0}
            stroke="var(--moss)"
            strokeOpacity={0.2}
            strokeDasharray="1 9"
            strokeWidth={1.5}
          />
          <rect
            x={left}
            y={-19}
            width={pillWidth}
            height={b.cohort ? 36 : 22}
            rx={8}
            fill="var(--bone)"
            opacity={0.88}
          />
          <text
            x={left + 10}
            y={-4}
            fontFamily="var(--font-serif)"
            fontSize={b.label.length > 18 ? 11.5 : 13}
            fill="var(--moss-deep)"
          >
            {b.label}
          </text>
          {b.cohort && (
            <text x={left + 10} y={12} fontSize={10.5} fill="var(--ink-soft)">
              {b.cohort}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}
