/** Builds a filled, tapered organic branch shape between two points — the same
 * visual language as the app icon's root/mycelium branches, rather than a
 * uniform-width stroked line. */
export function taperedBranchPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  bow = 0
): string {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const midx = (x0 + x1) / 2 + nx * bow;
  const midy = (y0 + y1) / 2 + ny * bow;
  const h0 = w0 / 2;
  const h1 = w1 / 2;
  const hMid = (h0 + h1) / 2;

  const a0x = x0 + nx * h0, a0y = y0 + ny * h0;
  const aMx = midx + nx * hMid, aMy = midy + ny * hMid;
  const a1x = x1 + nx * h1, a1y = y1 + ny * h1;
  const b1x = x1 - nx * h1, b1y = y1 - ny * h1;
  const bMx = midx - nx * hMid, bMy = midy - ny * hMid;
  const b0x = x0 - nx * h0, b0y = y0 - ny * h0;

  return `M ${a0x} ${a0y} Q ${aMx} ${aMy} ${a1x} ${a1y} L ${b1x} ${b1y} Q ${bMx} ${bMy} ${b0x} ${b0y} Z`;
}

export function seededOffset(seed: number, salt: number): number {
  const v = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}
