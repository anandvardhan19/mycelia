import { useMemo } from "react";
import type { FamilyBus } from "../utils/layout";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { seededOffset, taperedBranchPath } from "../utils/organicBranch";

const NODE_RADIUS = 42;
const TRUNK_WIDTH = 7;
const TWIG_WIDTH = 2.6;

export default function FamilyConnector({ family }: { family: FamilyBus }) {
  const reduced = useReducedMotion();

  const isAdoptive = family.types.length > 0 && family.types.every((t) => t === "adoptive-parent-child");
  const isStep = family.types.length > 0 && family.types.every((t) => t === "step-parent-child");
  const outline = isAdoptive
    ? { stroke: "var(--moss-bright)", dash: "1.5 4" }
    : isStep
      ? { stroke: "var(--blood)", dash: "5 4" }
      : undefined;

  const geometry = useMemo(() => {
    const parentMidX =
      family.parentPositions.reduce((s, p) => s + p.x, 0) / family.parentPositions.length;
    const parentY = family.parentPositions[0].y;
    const childY = family.childPositions[0]?.y ?? parentY + 220;
    const busY = parentY + (childY - parentY) * 0.55;

    const childXs = family.childPositions.map((c) => c.x);
    const busLeft = Math.min(parentMidX, ...childXs);
    const busRight = Math.max(parentMidX, ...childXs);

    const marriage =
      family.parentPositions.length === 2
        ? taperedBranchPath(
            family.parentPositions[0].x,
            parentY,
            family.parentPositions[1].x,
            parentY,
            4.5,
            4.5,
            (seededOffset(family.seed, 1) - 0.5) * 8
          )
        : "";

    const drop = taperedBranchPath(
      parentMidX,
      parentY + NODE_RADIUS * 0.55,
      parentMidX,
      busY,
      TRUNK_WIDTH,
      TWIG_WIDTH + 1,
      (seededOffset(family.seed, 2) - 0.5) * 10
    );

    const bus =
      family.childPositions.length > 1
        ? taperedBranchPath(
            busLeft,
            busY,
            busRight,
            busY,
            TWIG_WIDTH + 0.6,
            TWIG_WIDTH + 0.6,
            (seededOffset(family.seed, 3) - 0.5) * 6
          )
        : "";

    const childDrops = family.childPositions.map((c, i) =>
      taperedBranchPath(
        c.x,
        busY,
        c.x,
        c.y - NODE_RADIUS * 0.55,
        TWIG_WIDTH,
        1.8,
        (seededOffset(family.seed, 4 + i) - 0.5) * 8
      )
    );

    const joints = [
      { x: parentMidX, y: busY, r: 3.2 },
      ...(family.childPositions.length > 1
        ? family.childPositions.map((c) => ({ x: c.x, y: busY, r: 2.4 }))
        : []),
    ];

    return { marriage, drop, bus, childDrops, joints, dur: 5 + seededOffset(family.seed, 9) * 4 };
  }, [family]);

  const outlineProps = outline
    ? { stroke: outline.stroke, strokeWidth: 1, strokeDasharray: outline.dash }
    : {};

  return (
    <g className="family-connector">
      {geometry.marriage && <path d={geometry.marriage} fill="var(--gold)" opacity={0.85} />}
      <path d={geometry.drop} fill="var(--amber)" opacity={0.8} {...outlineProps} />
      {geometry.bus && <path d={geometry.bus} fill="var(--amber)" opacity={0.75} {...outlineProps} />}
      {geometry.childDrops.map((d, i) => (
        <path key={i} fill="var(--amber)" opacity={0.8} d={d} {...outlineProps} />
      ))}
      {geometry.joints.map((j, i) => (
        <circle key={i} cx={j.x} cy={j.y} r={j.r} fill="var(--gold)" opacity={0.9} />
      ))}
      {!reduced && (
        <g className="branch-pulse" style={{ animationDuration: `${geometry.dur}s` }}>
          <path d={geometry.drop} fill="var(--gold-bright)" />
          {geometry.bus && <path d={geometry.bus} fill="var(--gold-bright)" />}
        </g>
      )}
    </g>
  );
}
