import { useEffect, useMemo, useRef, useState } from "react";
import type { Person, Relationship } from "../types";
import { computeLayout } from "../utils/layout";
import { loadDemoFamily } from "../utils/demoFamily";
import Connector from "./Connector";
import PersonNode from "./PersonNode";
import BackgroundTexture from "./BackgroundTexture";
import GenerationBands from "./GenerationBands";

interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export default function TreeCanvas({
  people,
  relationships,
  selectedId,
  onSelect,
  highlightIds,
  newIds,
}: {
  people: Person[];
  relationships: Relationship[];
  selectedId?: string;
  onSelect: (id: string) => void;
  highlightIds?: Set<string>;
  newIds: Set<string>;
}) {
  const layout = useMemo(() => computeLayout(people, relationships), [people, relationships]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, scale: 1 });
  const dragState = useRef<{ startX: number; startY: number; vx: number; vy: number } | null>(null);
  const hasFitted = useRef(false);
  const [showGenerations, setShowGenerations] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoFamily();
    } finally {
      setLoadingDemo(false);
    }
  };

  useEffect(() => {
    if (hasFitted.current || !containerRef.current || layout.nodes.size === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of layout.nodes.values()) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y);
    }
    const padding = 140;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scale = Math.min(1, rect.width / contentW, rect.height / contentH, 1.1);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setViewport({
      x: rect.width / 2 - cx * scale,
      y: rect.height / 2 - cy * scale,
      scale,
    });
    hasFitted.current = true;
  }, [layout]);

  useEffect(() => {
    if (!hasFitted.current || !containerRef.current || newIds.size === 0) return;
    const id = [...newIds][0];
    const node = layout.nodes.get(id);
    if (!node) return;
    const rect = containerRef.current.getBoundingClientRect();
    setViewport((v) => ({
      ...v,
      x: rect.width / 2 - node.x * v.scale,
      y: rect.height / 2 - node.y * v.scale,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newIds]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, vx: viewport.x, vy: viewport.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setViewport((v) => ({ ...v, x: dragState.current!.vx + dx, y: dragState.current!.vy + dy }));
  };
  const onPointerUp = () => {
    dragState.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = -e.deltaY * 0.0015;
    setViewport((v) => {
      const newScale = Math.min(2.2, Math.max(0.25, v.scale * (1 + delta)));
      const worldX = (mx - v.x) / v.scale;
      const worldY = (my - v.y) / v.scale;
      return {
        scale: newScale,
        x: mx - worldX * newScale,
        y: my - worldY * newScale,
      };
    });
  };

  const zoomBy = (factor: number) => {
    const rect = containerRef.current!.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    setViewport((v) => {
      const newScale = Math.min(2.2, Math.max(0.25, v.scale * factor));
      const worldX = (mx - v.x) / v.scale;
      const worldY = (my - v.y) / v.scale;
      return { scale: newScale, x: mx - worldX * newScale, y: my - worldY * newScale };
    });
  };

  return (
    <div
      ref={containerRef}
      className="tree-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", touchAction: "none" }}
    >
      <BackgroundTexture />
      {layout.nodes.size === 0 ? (
        <div className="empty-canvas">
          <p>No one on the tree yet.</p>
          <p className="hint">Add your first person to start the network.</p>
          <button className="link-btn demo-link" onClick={handleLoadDemo} disabled={loadingDemo}>
            {loadingDemo ? "Growing a demo family…" : "or explore a demo family, six generations deep"}
          </button>
        </div>
      ) : (
        <svg width="100%" height="100%" style={{ position: "relative" }}>
          <g transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.scale})`}>
            {showGenerations && <GenerationBands layout={layout} people={people} />}
            {layout.edges.map((edge) => (
              <Connector key={edge.id} edge={edge} />
            ))}
            {people.map((p) => {
              const node = layout.nodes.get(p.id);
              if (!node) return null;
              const dimmed = !!highlightIds && highlightIds.size > 0 && !highlightIds.has(p.id);
              return (
                <PersonNode
                  key={p.id}
                  person={p}
                  x={node.x}
                  y={node.y}
                  selected={selectedId === p.id}
                  dimmed={dimmed}
                  isNew={newIds.has(p.id)}
                  showCohort={showGenerations}
                  onClick={() => onSelect(p.id)}
                />
              );
            })}
          </g>
        </svg>
      )}
      <div className="zoom-controls">
        <button onClick={() => zoomBy(1.2)} aria-label="Zoom in">+</button>
        <button onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">−</button>
        {layout.nodes.size > 0 && (
          <button
            className={`generations-toggle${showGenerations ? " active" : ""}`}
            onClick={() => setShowGenerations((v) => !v)}
            aria-pressed={showGenerations}
            aria-label="Toggle generational view"
            title="Toggle generational view"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4" y1="18" x2="20" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
