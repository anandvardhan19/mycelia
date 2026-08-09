import { useMemo } from "react";
import type { LaidOutEdge } from "../utils/layout";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { seededOffset, taperedBranchPath } from "../utils/organicBranch";

const TYPE_STYLE: Record<LaidOutEdge["type"], { color: string; width: number }> = {
  "parent-child": { color: "var(--amber)", width: 5 },
  "adoptive-parent-child": { color: "var(--amber)", width: 5 },
  "step-parent-child": { color: "var(--amber)", width: 4.5 },
  spouse: { color: "var(--gold)", width: 4.5 },
  sibling: { color: "var(--moss-bright)", width: 3 },
};

export default function Connector({ edge }: { edge: LaidOutEdge }) {
  const style = TYPE_STYLE[edge.type];
  const reduced = useReducedMotion();

  const { path, dur } = useMemo(() => {
    const bow = (seededOffset(edge.seed, 1) - 0.5) * 22;
    return {
      path: taperedBranchPath(edge.a.x, edge.a.y, edge.b.x, edge.b.y, style.width, style.width, bow),
      dur: 5 + seededOffset(edge.seed, 3) * 4,
    };
  }, [edge.a.x, edge.a.y, edge.b.x, edge.b.y, edge.seed, style.width]);

  return (
    <g className="connector">
      <path d={path} fill={style.color} opacity={0.78} />
      {!reduced && (
        <g className="branch-pulse" style={{ animationDuration: `${dur}s` }}>
          <path d={path} fill="var(--gold-bright)" />
        </g>
      )}
    </g>
  );
}
