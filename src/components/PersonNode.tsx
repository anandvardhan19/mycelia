import { motion } from "framer-motion";
import { useMemo } from "react";
import type { Person } from "../types";
import { usePhotoUrl } from "../hooks/usePhotoUrl";
import { blobPath } from "../utils/blob";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { cohortFor } from "../utils/generations";

const RADIUS = 42;

export default function PersonNode({
  person,
  x,
  y,
  selected,
  dimmed,
  isNew,
  showCohort,
  onClick,
}: {
  person: Person;
  x: number;
  y: number;
  selected: boolean;
  dimmed: boolean;
  isNew: boolean;
  showCohort: boolean;
  onClick: () => void;
}) {
  const photoUrl = usePhotoUrl(person.photoBlob);
  const reduced = useReducedMotion();
  const clipId = `clip-${person.id}`;
  const path = useMemo(() => blobPath(0, 0, RADIUS, person.id), [person.id]);
  const living = !person.died;
  const cohort = showCohort ? cohortFor(person.born) : undefined;

  const initial = person.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: "pointer" }}>
    <motion.g
      initial={isNew && !reduced ? { opacity: 0, scale: 0.2 } : false}
      animate={{ opacity: dimmed ? 0.28 : 1, scale: 1 }}
      transition={isNew ? { type: "spring", stiffness: 260, damping: 16 } : { duration: 0.2 }}
    >
      {isNew && !reduced && (
        <motion.circle
          r={RADIUS}
          fill="var(--gold)"
          initial={{ opacity: 0.5, scale: 0.3 }}
          animate={{ opacity: 0, scale: 2.2 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
      <defs>
        <clipPath id={clipId}>
          <path d={path} />
        </clipPath>
        <radialGradient id={`nodeGrad-${person.id}`} cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor="var(--bone)" />
          <stop offset="100%" stopColor="var(--parchment-deep)" />
        </radialGradient>
      </defs>
      <path
        d={path}
        fill={`url(#nodeGrad-${person.id})`}
        stroke={selected ? "var(--blood)" : living ? "var(--moss)" : "var(--ink-soft)"}
        strokeWidth={selected ? 3 : 2}
      />
      {photoUrl ? (
        <image
          href={photoUrl}
          x={-RADIUS}
          y={-RADIUS}
          width={RADIUS * 2}
          height={RADIUS * 2}
          clipPath={`url(#${clipId})`}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-serif)"
          fontSize={30}
          fill="var(--moss-deep)"
        >
          {initial}
        </text>
      )}
      {!living && (
        <text textAnchor="middle" y={RADIUS + 18} fontSize={11} fill="var(--ink-soft)">
          {"†"} {person.died}
        </text>
      )}
      <text
        textAnchor="middle"
        y={RADIUS + (living ? 20 : 32)}
        fontFamily="var(--font-serif)"
        fontSize={14}
        fill="var(--ink)"
      >
        {person.name}
      </text>
      {person.born && (
        <text textAnchor="middle" y={RADIUS + (living ? 36 : 48)} fontSize={11} fill="var(--ink-soft)">
          b. {person.born}
        </text>
      )}
      {cohort && (
        <text
          textAnchor="middle"
          y={RADIUS + (living ? 51 : 63)}
          fontSize={10}
          fontStyle="italic"
          fontFamily="var(--font-serif)"
          fill="var(--moss-bright)"
        >
          {cohort.short}
        </text>
      )}
    </motion.g>
    </g>
  );
}
