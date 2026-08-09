import { computeLayout } from "./layout";
import { blobPath } from "./blob";
import { blobToDataUrl } from "./blobData";
import { taperedBranchPath } from "./organicBranch";
import type { Person, Relationship } from "../types";

const RADIUS = 42;
const PADDING = 110;
const HEADER_H = 130;
const FOOTER_H = 60;

function readVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface TreeCardResult {
  svg: string;
  width: number;
  height: number;
}

export async function renderTreeCardSvg(
  people: Person[],
  relationships: Relationship[],
  title?: string
): Promise<TreeCardResult> {
  const layout = computeLayout(people, relationships);

  const colors = {
    ink: readVar("--ink", "#23281f"),
    inkSoft: readVar("--ink-soft", "#4a5142"),
    parchment: readVar("--parchment", "#f3ecd9"),
    parchmentDeep: readVar("--parchment-deep", "#e7dcbf"),
    bone: readVar("--bone", "#faf6ea"),
    moss: readVar("--moss", "#2f4a37"),
    mossDeep: readVar("--moss-deep", "#1c3126"),
    mossBright: readVar("--moss-bright", "#4c7a5c"),
    gold: readVar("--gold", "#b8912f"),
    amber: readVar("--amber", "#c1652c"),
    blood: readVar("--blood", "#8a2f2b"),
  };

  const nodeXs = [...layout.nodes.values()].map((n) => n.x);
  const minX = nodeXs.length ? Math.min(...nodeXs) : 0;
  const maxX = nodeXs.length ? Math.max(...nodeXs) : 0;
  const contentW = Math.max(1, maxX - minX);
  const width = contentW + PADDING * 2;
  const height = layout.height + PADDING + HEADER_H + FOOTER_H;
  const offsetX = -minX + PADDING;
  const offsetY = HEADER_H + PADDING / 2;

  const photoDataUrls = new Map<string, string>();
  for (const p of people) {
    if (p.photoBlob) {
      try {
        photoDataUrls.set(p.id, await blobToDataUrl(p.photoBlob));
      } catch {
        // photo unreadable — fall back to initials for this person
      }
    }
  }

  let defs = "";
  let connectors = "";
  let nodesXml = "";

  let joints = "";
  const TRUNK_W = 7;
  const TWIG_W = 2.6;

  for (const fam of layout.families) {
    const parentMidX = fam.parentPositions.reduce((s, p) => s + p.x, 0) / fam.parentPositions.length + offsetX;
    const parentY = fam.parentPositions[0].y + offsetY;
    const childY = (fam.childPositions[0]?.y ?? parentY + 220) + offsetY;
    const busY = parentY + (childY - parentY) * 0.55;
    const childXs = fam.childPositions.map((c) => c.x + offsetX);
    const left = Math.min(parentMidX, ...childXs);
    const right = Math.max(parentMidX, ...childXs);
    const isAdoptive = fam.types.length > 0 && fam.types.every((t) => t === "adoptive-parent-child");
    const isStep = fam.types.length > 0 && fam.types.every((t) => t === "step-parent-child");
    const outline = isAdoptive
      ? ` stroke="${colors.mossBright}" stroke-width="1" stroke-dasharray="1.5 4"`
      : isStep
        ? ` stroke="${colors.blood}" stroke-width="1" stroke-dasharray="5 4"`
        : "";

    if (fam.parentPositions.length === 2) {
      const [p1, p2] = fam.parentPositions;
      const marriage = taperedBranchPath(p1.x + offsetX, parentY, p2.x + offsetX, parentY, 4.5, 4.5, 0);
      connectors += `<path d="${marriage}" fill="${colors.gold}" opacity="0.85"/>`;
    }
    const drop = taperedBranchPath(parentMidX, parentY + RADIUS * 0.55, parentMidX, busY, TRUNK_W, TWIG_W + 1, 0);
    connectors += `<path d="${drop}" fill="${colors.amber}" opacity="0.8"${outline}/>`;
    if (fam.childPositions.length > 1) {
      const bus = taperedBranchPath(left, busY, right, busY, TWIG_W + 0.6, TWIG_W + 0.6, 0);
      connectors += `<path d="${bus}" fill="${colors.amber}" opacity="0.75"${outline}/>`;
    }
    for (const c of fam.childPositions) {
      const cx = c.x + offsetX;
      const cy = c.y + offsetY;
      const childDrop = taperedBranchPath(cx, busY, cx, cy - RADIUS * 0.55, TWIG_W, 1.8, 0);
      connectors += `<path d="${childDrop}" fill="${colors.amber}" opacity="0.8"${outline}/>`;
    }
    joints += `<circle cx="${parentMidX}" cy="${busY}" r="3.2" fill="${colors.gold}" opacity="0.9"/>`;
    if (fam.childPositions.length > 1) {
      for (const c of fam.childPositions) {
        joints += `<circle cx="${c.x + offsetX}" cy="${busY}" r="2.4" fill="${colors.gold}" opacity="0.9"/>`;
      }
    }
  }

  for (const edge of layout.edges) {
    const color = edge.type === "spouse" ? colors.gold : colors.mossBright;
    const width = edge.type === "spouse" ? 4.5 : 3;
    const p = taperedBranchPath(edge.a.x + offsetX, edge.a.y + offsetY, edge.b.x + offsetX, edge.b.y + offsetY, width, width, 0);
    connectors += `<path d="${p}" fill="${color}" opacity="0.78"/>`;
  }

  for (const p of people) {
    const node = layout.nodes.get(p.id);
    if (!node) continue;
    const cx = node.x + offsetX;
    const cy = node.y + offsetY;
    const path = blobPath(cx, cy, RADIUS, p.id);
    const clipId = `clip-${p.id}`;
    const gradId = `grad-${p.id}`;
    const photo = photoDataUrls.get(p.id);
    defs += `<clipPath id="${clipId}"><path d="${path}"/></clipPath>`;
    defs += `<radialGradient id="${gradId}" cx="32%" cy="28%" r="80%"><stop offset="0%" stop-color="${colors.bone}"/><stop offset="100%" stop-color="${colors.parchmentDeep}"/></radialGradient>`;
    nodesXml += `<path d="${path}" fill="url(#${gradId})" stroke="${p.died ? colors.inkSoft : colors.moss}" stroke-width="2"/>`;
    if (photo) {
      nodesXml += `<image href="${photo}" x="${cx - RADIUS}" y="${cy - RADIUS}" width="${RADIUS * 2}" height="${RADIUS * 2}" clip-path="url(#${clipId})" preserveAspectRatio="xMidYMid slice"/>`;
    } else {
      const initial = esc(p.name.trim().charAt(0).toUpperCase() || "?");
      nodesXml += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" font-size="28" fill="${colors.mossDeep}">${initial}</text>`;
    }
    nodesXml += `<text x="${cx}" y="${cy + RADIUS + 20}" text-anchor="middle" font-family="Georgia, serif" font-size="14" fill="${colors.ink}">${esc(p.name)}</text>`;
    if (p.born) {
      nodesXml += `<text x="${cx}" y="${cy + RADIUS + 36}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="${colors.inkSoft}">b. ${esc(p.born)}</text>`;
    }
  }

  const heading = esc(title ?? "Family tree");
  const generated = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="${width}" height="${height}" fill="${colors.parchment}"/>
<rect x="0" y="0" width="${width}" height="${HEADER_H}" fill="${colors.parchmentDeep}" opacity="0.5"/>
<text x="${width / 2}" y="58" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="32" letter-spacing="7" fill="${colors.mossDeep}">MYCELIA</text>
<text x="${width / 2}" y="90" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="14" fill="${colors.inkSoft}">${heading} &#183; ${people.length} people &#183; ${relationships.length} relationships</text>
<defs>${defs}</defs>
<g>${connectors}</g>
<g>${joints}</g>
<g>${nodesXml}</g>
<text x="${width / 2}" y="${height - 24}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="12" fill="${colors.moss}">grown on-device with MYCELIA &#183; ${generated}</text>
</svg>`;

  return { svg, width, height };
}

export function svgToPngBlob(svg: string, width: number, height: number, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas unavailable"));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encode failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Card image failed to render"));
    };
    img.src = url;
  });
}
