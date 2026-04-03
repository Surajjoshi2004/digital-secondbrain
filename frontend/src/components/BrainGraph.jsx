import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

const CLUSTER_COLORS = [
  "#38bdf8",
  "#22d3ee",
  "#8b5cf6",
  "#c084fc",
  "#06b6d4",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#f472b6",
];

const getPrimaryTag = (note) => note.tags?.[0] || "untagged";

const getCategoryColor = (category) => {
  const normalized = (category || "untagged").toLowerCase();
  const hash = [...normalized].reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  return CLUSTER_COLORS[hash % CLUSTER_COLORS.length];
};

const buildBrainGraph = (notes, minScore, focusMode, selectedNoteId) => {
  const noteMap = new Map(notes.map((note) => [note._id, note]));
  const allLinks = [];
  const seenLinks = new Set();

  const nodes = notes.map((note, index) => {
    const primaryTag = getPrimaryTag(note);
    const color = getCategoryColor(primaryTag);
    const side = index % 2 === 0 ? -1 : 1;
    const theta = (index / Math.max(notes.length, 1)) * Math.PI;
    const lobeRadiusX = 180 + (primaryTag.length % 3) * 18;
    const lobeRadiusY = 260 + (primaryTag.length % 2) * 12;

    return {
      id: note._id,
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      group: primaryTag,
      category: primaryTag,
      color,
      x: side * (80 + Math.cos(theta) * lobeRadiusX),
      y: Math.sin(theta * 2.2) * lobeRadiusY * 0.55,
    };
  });

  notes.forEach((note) => {
    (note.relatedNotes || []).forEach((entry) => {
      if (!entry.note?._id || !noteMap.has(entry.note._id) || entry.score < minScore) {
        return;
      }

      const source = note._id;
      const target = entry.note._id;
      const linkKey = [source, target].sort().join(":");

      if (seenLinks.has(linkKey)) {
        return;
      }

      seenLinks.add(linkKey);
      allLinks.push({
        source,
        target,
        score: entry.score || 0.2,
        sharedKeywords: entry.sharedKeywords || [],
        isManual: !!entry.isManual,
      });
    });
  });

  if (!focusMode || !selectedNoteId) {
    return { nodes, links: allLinks };
  }

  const connectedIds = new Set([selectedNoteId]);
  const links = allLinks.filter((link) => {
    const sourceId = typeof link.source === "object" ? link.source.id : link.source;
    const targetId = typeof link.target === "object" ? link.target.id : link.target;
    const keep = sourceId === selectedNoteId || targetId === selectedNoteId;

    if (keep) {
      connectedIds.add(sourceId);
      connectedIds.add(targetId);
    }

    return keep;
  });

  return {
    nodes: nodes.filter((node) => connectedIds.has(node.id)),
    links,
  };
};

function BrainGraph({
  notes,
  selectedNoteId,
  hoveredNodeId,
  pulseOriginId,
  onNodeSelect,
  onNodeHover,
  minimal = false,
}) {
  const graphRef = useRef(null);
  const containerRef = useRef(null);
  const pulseStartRef = useRef(0);
  const lastPulseOriginRef = useRef(null);
  const [graphSize, setGraphSize] = useState({ width: 1100, height: 720 });
  const [minScore, setMinScore] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const graphData = useMemo(
    () => buildBrainGraph(notes, minScore, focusMode, selectedNoteId),
    [focusMode, minScore, notes, selectedNoteId]
  );
  const selectedNode = graphData.nodes.find((node) => node.id === selectedNoteId);
  const hoveredNode = graphData.nodes.find((node) => node.id === hoveredNodeId);

  const connectedNodeIds = useMemo(() => {
    const ids = new Set();

    graphData.links.forEach((link) => {
      const sourceId = typeof link.source === "object" ? link.source.id : link.source;
      const targetId = typeof link.target === "object" ? link.target.id : link.target;

      if (sourceId === selectedNoteId || targetId === selectedNoteId) {
        ids.add(sourceId);
        ids.add(targetId);
      }
    });

    return ids;
  }, [graphData.links, selectedNoteId]);

  const categoryLegend = useMemo(
    () =>
      [...new Set(graphData.nodes.map((node) => node.category))]
        .sort((left, right) => left.localeCompare(right))
        .map((category) => ({
          category,
          color: getCategoryColor(category),
        })),
    [graphData.nodes]
  );

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }

    graph.d3Force("charge").strength(-120);
    graph.d3Force("center").strength(0.08);
    graph.d3Force("link").distance((link) => 90 + (1 - (link.score || 0.2)) * 110);
    graph.d3ReheatSimulation();

    window.setTimeout(() => {
      graph.zoomToFit(600, 80);
    }, 80);
  }, [graphData]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updateSize = () => {
      setGraphSize({
        width: Math.max(container.clientWidth, 320),
        height: Math.max(container.clientHeight, 620),
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (pulseOriginId && pulseOriginId !== lastPulseOriginRef.current) {
      pulseStartRef.current = Date.now();
      lastPulseOriginRef.current = pulseOriginId;
    }
  }, [pulseOriginId]);

  useEffect(() => {
    let animationFrameId = 0;

    const tick = () => {
      graphRef.current?.refresh();
      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  const pulseAge = pulseOriginId ? Date.now() - pulseStartRef.current : Infinity;
  const pulseActive = pulseOriginId && pulseAge < 2800;

  const pulseLinks = new Set(
    graphData.links
      .filter((link) => {
        const sourceId = typeof link.source === "object" ? link.source.id : link.source;
        const targetId = typeof link.target === "object" ? link.target.id : link.target;
        return sourceId === pulseOriginId || targetId === pulseOriginId;
      })
      .map(
        (link) =>
          `${typeof link.source === "object" ? link.source.id : link.source}:${
            typeof link.target === "object" ? link.target.id : link.target
          }`
      )
  );

  const handleResetView = () => {
    const graph = graphRef.current;

    if (!graph) {
      return;
    }

    graph.centerAt(0, 0, 500);
    graph.zoom(1.2, 500);

    window.setTimeout(() => {
      graph.zoomToFit(600, 80);
    }, 120);
  };

  const handleToggleFullscreen = async () => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }

    await container.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-[620px] overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_bottom,rgba(139,92,246,0.12),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(3,7,18,0.92))]"
      style={{ touchAction: "none", overscrollBehavior: "contain" }}
      onWheel={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-[-10%] h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/8 blur-3xl" />
        <div className="absolute bottom-[-8%] right-[10%] h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="brain-grid absolute inset-0" />
      </div>

      {minimal ? (
        <div className="absolute right-6 top-6 z-10 flex gap-3">
          <button
            type="button"
            onClick={handleResetView}
            className="rounded-full border border-white/10 bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-100 backdrop-blur-md transition hover:bg-slate-900/80"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 backdrop-blur-md transition hover:bg-cyan-400/18"
          >
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      ) : (
        <>
          <div className="absolute left-6 top-6 z-10 max-w-xs rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 backdrop-blur-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/70">
              Neural View
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200/80">
              Filter weaker links, focus on the selected neighborhood, and inspect pinned
              synapses inside the graph itself.
            </p>
          </div>

          <div className="absolute inset-x-4 top-4 z-10 rounded-[1.5rem] border border-white/10 bg-slate-950/65 p-4 backdrop-blur-md sm:left-auto sm:right-6 sm:top-6 sm:w-72 sm:inset-x-auto">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-300/70">
              Graph Controls
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {graphData.links.length} visible connections
            </p>
            <div className="mt-4 grid gap-3 grid-cols-2">
              <button
                type="button"
                onClick={handleResetView}
                className="w-full rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
              >
                Reset View
              </button>
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="w-full rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-4 py-3 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-400/18"
              >
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
            </div>
            <label className="mt-4 block">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Minimum Link Strength: {minScore.toFixed(2)}
              </span>
              <input
                className="mt-2 w-full"
                type="range"
                min="0"
                max="0.99"
                step="0.01"
                value={minScore}
                onChange={(event) => setMinScore(Number(event.target.value))}
              />
            </label>
            <label className="mt-4 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={focusMode}
                onChange={(event) => setFocusMode(event.target.checked)}
              />
              Focus selected note neighborhood
            </label>
            <label className="mt-3 flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(event) => setShowLabels(event.target.checked)}
              />
              Always show labels for active nodes
            </label>
            {!!categoryLegend.length && (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Category Colors
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {categoryLegend.map((item) => (
                    <span
                      key={item.category}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.category}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!graphData.links.length && (
        <div className="absolute inset-x-6 bottom-6 z-10 rounded-[1.4rem] border border-dashed border-white/10 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300/80 backdrop-blur-md">
          No visible connections right now. Try lowering the minimum strength, clearing
          filters, or using the rebuild links button.
        </div>
      )}

      {!minimal && (hoveredNode || selectedNode) && (
        <div className="absolute bottom-6 left-6 z-10 max-w-sm rounded-[1.6rem] border border-white/10 bg-slate-950/70 p-4 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-300/70">
            {hoveredNode ? "Hover Signal" : "Focused Thought"}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {(hoveredNode || selectedNode)?.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300/80">
            {(hoveredNode || selectedNode)?.content}
          </p>
        </div>
      )}

      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="transparent"
        cooldownTicks={120}
        enableNodeDrag
        nodeRelSize={6}
        width={graphSize.width}
        height={graphSize.height}
        d3VelocityDecay={0.2}
        linkWidth={(link) => {
          if (selectedNoteId) {
            const sourceId = typeof link.source === "object" ? link.source.id : link.source;
            const targetId = typeof link.target === "object" ? link.target.id : link.target;
            const connected = sourceId === selectedNoteId || targetId === selectedNoteId;
            return connected ? 2 + link.score * 5 : 0.8 + link.score * 2.2;
          }

          return 1 + link.score * 3.5;
        }}
        linkColor={(link) => {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;
          const isHovered =
            sourceId === hoveredNodeId ||
            targetId === hoveredNodeId ||
            sourceId === selectedNoteId ||
            targetId === selectedNoteId;

          if (link.isManual) {
            return isHovered ? "rgba(244, 114, 182, 0.95)" : "rgba(244, 114, 182, 0.48)";
          }

          return isHovered
            ? "rgba(56, 189, 248, 0.95)"
            : "rgba(94, 234, 212, 0.18)";
        }}
        linkDirectionalParticles={(link) => {
          const sourceId = typeof link.source === "object" ? link.source.id : link.source;
          const targetId = typeof link.target === "object" ? link.target.id : link.target;
          const pulseKey = `${sourceId}:${targetId}`;

          if (pulseActive && pulseLinks.has(pulseKey)) {
            return 5;
          }

          if (link.isManual) {
            return 3;
          }

          if (sourceId === selectedNoteId || targetId === selectedNoteId) {
            return 2;
          }

          if (sourceId === hoveredNodeId || targetId === hoveredNodeId) {
            return 1;
          }

          return 0;
        }}
        linkDirectionalParticleWidth={(link) => 2 + link.score * 3}
        linkDirectionalParticleSpeed={() => 0.009}
        onNodeClick={(node) => onNodeSelect(node.id)}
        onNodeHover={(node) => onNodeHover(node?.id || null)}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const isSelected = node.id === selectedNoteId;
          const isHovered = node.id === hoveredNodeId;
          const isConnected = connectedNodeIds.has(node.id);
          const time = Date.now() * 0.004;
          const pulse = 1 + Math.sin(time + node.x * 0.02 + node.y * 0.02) * 0.12;
          const radius = isSelected ? 11 : isHovered ? 9 : isConnected ? 7.5 : 6;
          const glowRadius = radius * pulse * 3.8;

          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, glowRadius, 0, 2 * Math.PI, false);
          ctx.fillStyle = `${node.color}22`;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * pulse, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color;
          ctx.shadowColor = node.color;
          ctx.shadowBlur = isSelected ? 24 : isHovered ? 18 : 12;
          ctx.fill();

          if (showLabels && (isSelected || isHovered || isConnected)) {
            const fontSize = 13 / globalScale;
            ctx.font = `600 ${fontSize}px Sans-Serif`;
            ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
            ctx.textAlign = "center";
            ctx.fillText(node.title, node.x, node.y - 16 / globalScale);
          }
          ctx.restore();
        }}
        nodePointerAreaPaint={(node, color, ctx) => {
          const isSelected = node.id === selectedNoteId;
          const isHovered = node.id === hoveredNodeId;
          const isConnected = connectedNodeIds.has(node.id);
          const hitRadius = isSelected ? 24 : isHovered ? 22 : isConnected ? 20 : 18;

          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x, node.y, hitRadius, 0, 2 * Math.PI, false);
          ctx.fill();
        }}
      />
    </div>
  );
}

export default BrainGraph;
