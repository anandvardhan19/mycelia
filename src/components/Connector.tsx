import { useMemo } from "react";
import type { LaidOutEdge } from "../utils/layout";
import { useReducedMotion } from "../hooks/useReducedMotion";

const TYPE_STYLE: Record<
  LaidOutEdge["type"],
  { color: string; width: number; dash?: string }
> = {
  "parent-child": { color: "var(--amber)", width: 2.4 },
  "adoptive-parent-child": { color: "var(--amber)", width: 2.4, dash: "1 7" },
  "step-parent-child": { color: "var(--amber)", width: 2, dash: "6 5" },
  spouse: { color: "var(--gold)", width: 2.6 },
  sibling: { color: "var(--moss-bright)", width: 1.8 },
};

function seededOffset(seed: number, salt: number) {
  const v = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function buildPath(x1: number, y1: number, x2: number, y2: number, seed: number, jitter: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bow = (seededOffset(seed, 1) - 0.5) * 40 + jitter;
  const c1x = x1 + dx * 0.33 + nx * bow;
  const c1y = y1 + dy * 0.33 + ny * bow;
  const c2x = x1 + dx * 0.67 + nx * bow * 0.6;
  const c2y = y1 + dy * 0.67 + ny * bow * 0.6;
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
}

export default function Connector({ edge }: { edge: LaidOutEdge }) {
  const style = TYPE_STYLE[edge.type];
  const reduced = useReducedMotion();

  const { path, pathAlt } = useMemo(() => {
    const p = buildPath(edge.a.x, edge.a.y, edge.b.x, edge.b.y, edge.seed, 0);
    const pAlt = buildPath(edge.a.x, edge.a.y, edge.b.x, edge.b.y, edge.seed, 6);
    return { path: p, pathAlt: pAlt };
  }, [edge.a.x, edge.a.y, edge.b.x, edge.b.y, edge.seed]);

  const dur = 5 + seededOffset(edge.seed, 3) * 4;

  return (
    <g className="connector">
      <path
        d={path}
        fill="none"
        stroke={style.color}
        strokeWidth={style.width}
        strokeDasharray={style.dash}
        strokeLinecap="round"
        opacity={0.75}
      >
        {!reduced && (
          <animate
            attributeName="d"
            values={`${path};${pathAlt};${path}`}
            dur={`${dur}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1"
          />
        )}
      </path>
      {!reduced && (
        <path
          d={path}
          fill="none"
          stroke={style.color}
          strokeWidth={style.width + 2.5}
          strokeLinecap="round"
          opacity={0.16}
          strokeDasharray="2 14"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-32"
            dur={`${dur * 1.4}s`}
            repeatCount="indefinite"
          />
        </path>
      )}
    </g>
  );
}
