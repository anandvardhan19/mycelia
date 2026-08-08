export default function BackgroundTexture() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: 0.5,
        mixBlendMode: "multiply",
      }}
    >
      <defs>
        <filter id="mycelia-mesh">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.018"
            numOctaves={3}
            seed={7}
            result="noise"
          />
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
