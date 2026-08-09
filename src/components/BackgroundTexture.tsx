import { useReducedMotion } from "../hooks/useReducedMotion";

export default function BackgroundTexture() {
  const reduced = useReducedMotion();

  return (
    <svg
      aria-hidden="true"
      className="bg-texture"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <defs>
        <filter id="mycelia-mesh">
          <feTurbulence type="fractalNoise" baseFrequency="0.013 0.019" numOctaves={3} seed={7} result="noise">
            {!reduced && (
              <animate
                attributeName="baseFrequency"
                values="0.013 0.019;0.011 0.021;0.014 0.017;0.013 0.019"
                dur="46s"
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0.18
                    0 0 0 0 0.29
                    0 0 0 0 0.22
                    0 0 0 0.55 0"
          />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#mycelia-mesh)" />
    </svg>
  );
}
