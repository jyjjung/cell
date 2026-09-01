'use client';

import { parseChordChart, splitChartBodyColumns, transposeBlocks, type ChartBlock } from '@/lib/chord-chart';
import { cn } from '@/lib/utils';
import type { ChordChartStroke, ChordKey, SongChordSheet } from '@/types';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ChartSurface = 'dark' | 'light';

/** Text charts always render on a dark surface so ink annotations stay visible. */
export const TEXT_CHART_SURFACE: ChartSurface = 'dark';

const ChartSurfaceContext = createContext<ChartSurface>(TEXT_CHART_SURFACE);

function useChartSurface() {
  return useContext(ChartSurfaceContext);
}

const SURFACE_BG: Record<ChartSurface, string> = {
  dark: '#1f1f1f',
  light: '#f7f7f5',
};

export const CHART_LOGICAL_WIDTH = 1200;

const INK_WIDTH = 3.2;

type PointerPt = { x: number; y: number };

function useScaledChart(userZoom: number) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerHeight, setInnerHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const update = () => {
      const width = outer.clientWidth || CHART_LOGICAL_WIDTH;
      const fit = Math.min(1, width / CHART_LOGICAL_WIDTH) || 1;
      setScale(fit * userZoom);
      setInnerHeight(inner.scrollHeight);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [userZoom]);

  return { outerRef, innerRef, scale, innerHeight };
}

function clientToLogical(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
  height: number,
): PointerPt | null {
  if (height <= 0) return null;
  const rect = svg.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * CHART_LOGICAL_WIDTH,
    y: ((clientY - rect.top) / rect.height) * height,
  };
}

function ink(surface: ChartSurface, kind: 'primary' | 'muted' | 'soft' = 'primary') {
  if (surface === 'light') {
    if (kind === 'muted') return 'text-muted-foreground';
    if (kind === 'soft') return 'text-muted-foreground/80';
    return 'text-foreground';
  }
  if (kind === 'muted') return 'text-white/75';
  if (kind === 'soft') return 'text-white/70';
  return 'text-white';
}

function ChartBlockView({ block }: { block: ChartBlock }) {
  const surface = useChartSurface();
  if (block.type === 'title') {
    return (
      <h1 className={cn('max-w-full text-[28px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]', ink(surface))}>
        {block.text}
      </h1>
    );
  }
  if (block.type === 'credit') {
    return (
      <p className={cn('max-w-full text-[13px] leading-snug [overflow-wrap:anywhere]', ink(surface, 'muted'))}>
        {block.text}
      </p>
    );
  }
  if (block.type === 'meta') {
    return (
      <p className={cn('max-w-full text-[13px] font-semibold [overflow-wrap:anywhere]', ink(surface))}>
        {block.text}
      </p>
    );
  }
  if (block.type === 'section') {
    return (
      <p className={cn('pt-3 text-[15px] font-bold uppercase tracking-wide', ink(surface))}>
        {block.text}
      </p>
    );
  }
  if (block.type === 'measure') {
    return (
      <p className={cn('max-w-full overflow-x-auto whitespace-nowrap text-[16px] font-bold', ink(surface))}>
        <span className="inline">{block.text}</span>
        {block.cue && (
          <span className={cn('ml-2 text-[13px] font-normal italic', ink(surface, 'soft'))}>{block.cue}</span>
        )}
      </p>
    );
  }
  if (block.type === 'note') {
    return (
      <p className={cn('text-[13px] italic', ink(surface, 'soft'))}>
        {block.text}
      </p>
    );
  }
  return (
    <LyricBlockView block={block} />
  );
}

function LyricBlockView({ block }: { block: Extract<ChartBlock, { type: 'lyric' }> }) {
  const surface = useChartSurface();
  const parts = block.parts.filter((part) => part.chord || (part.text ?? '').trim());
  if (parts.length === 0) return null;

  if (parts.length === 1 && parts[0].text.trim() && !parts[0].chord) {
    return (
      <p className={cn('max-w-full text-[18px] leading-snug [overflow-wrap:anywhere]', ink(surface))}>
        {parts[0].text}
        {block.cue && (
          <span className={cn('ml-2 text-[13px] italic', ink(surface, 'soft'))}>{block.cue}</span>
        )}
      </p>
    );
  }

  return (
    <div className="max-w-full">
      <div className="flex w-max min-w-full flex-row flex-nowrap items-end">
        {parts.map((part, pi) => (
          <span key={pi} className="inline-flex flex-col items-start pr-3 last:pr-0">
            <span className={cn('min-h-[1.15em] whitespace-pre text-[15px] font-bold leading-none', ink(surface))}>
              {part.chord || '\u00a0'}
            </span>
            <span className={cn('whitespace-pre text-[18px] leading-snug', ink(surface))}>
              {part.text || '\u00a0'}
            </span>
          </span>
        ))}
      </div>
      {block.cue && (
        <p className={cn('text-[13px] italic', ink(surface, 'soft'))}>{block.cue}</p>
      )}
    </div>
  );
}

function ChartColumn({ blocks }: { blocks: ChartBlock[] }) {
  return (
    <div className="min-w-0 max-w-full space-y-2 overflow-x-auto overflow-y-visible">
      {blocks.map((block, i) => (
        <ChartBlockView key={i} block={block} />
      ))}
    </div>
  );
}

export function ChordChartBody({ blocks }: { blocks: ChartBlock[] }) {
  const firstBody = blocks.findIndex((b) =>
    b.type === 'section' || b.type === 'measure' || b.type === 'lyric' || b.type === 'note',
  );
  const header = firstBody === -1 ? blocks : blocks.slice(0, firstBody);
  const body = firstBody === -1 ? [] : blocks.slice(firstBody);
  const [left, right] = splitChartBodyColumns(body);

  return (
    <ChartSurfaceContext.Provider value={TEXT_CHART_SURFACE}>
      <div className="max-w-full space-y-2">
      {header.length > 0 && (
        <div className="max-w-full space-y-0.5 pb-2">
          {header.map((block, i) => (
            <ChartBlockView key={`h-${i}`} block={block} />
          ))}
        </div>
      )}
      {body.length > 0 && right.length === 0 && <ChartColumn blocks={left} />}
      {body.length > 0 && right.length > 0 && (
        <div className="grid max-w-full grid-cols-2 items-start gap-x-6">
          <ChartColumn blocks={left} />
          <ChartColumn blocks={right} />
        </div>
      )}
      </div>
    </ChartSurfaceContext.Provider>
  );
}

function ChartBlocks({ blocks }: { blocks: ChartBlock[] }) {
  return <ChordChartBody blocks={blocks} />;
}

export function TextChordChartCanvas({
  sheet,
  originalKey,
  displayKey,
  strokes,
  drawing,
  inkColor,
  inkWidth,
  onStrokesChange,
  zoom = 1,
  exportMode = false,
  theme: _theme = TEXT_CHART_SURFACE,
}: {
  sheet: SongChordSheet;
  originalKey: ChordKey;
  displayKey: ChordKey;
  strokes: ChordChartStroke[];
  drawing?: boolean;
  inkColor?: string;
  inkWidth?: number;
  onStrokesChange?: (strokes: ChordChartStroke[]) => void;
  zoom?: number;
  /** Fixed 1:1 layout for PNG export — no responsive scaling. */
  exportMode?: boolean;
  theme?: ChartSurface;
}) {
  const surface = TEXT_CHART_SURFACE;
  const source = sheet.sourceText || '';
  const blocks = useMemo(
    () => transposeBlocks(parseChordChart(source), originalKey, displayKey),
    [source, originalKey, displayKey],
  );
  const { outerRef, innerRef, scale, innerHeight } = useScaledChart(exportMode ? 1 : zoom);
  const svgRef = useRef<SVGSVGElement>(null);
  const currentRef = useRef<ChordChartStroke | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const commitStrokes = (next: ChordChartStroke[]) => {
    strokesRef.current = next;
    onStrokesChange?.(next);
  };

  const appendPoint = (pt: PointerPt) => {
    const cur = currentRef.current;
    if (!cur) return;
    const last = cur.points[cur.points.length - 1];
    if (last && Math.hypot(pt.x - last.x, pt.y - last.y) < 1.2) return;
    cur.points.push(pt);
    commitStrokes(strokesRef.current.map((s) => (s.id === cur.id ? { ...cur, points: [...cur.points] } : s)));
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing || !onStrokesChange) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = clientToLogical(svg, e.clientX, e.clientY, innerHeight);
    if (!pt) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    const stroke: ChordChartStroke = {
      id: crypto.randomUUID(),
      color: inkColor || '#f43f5e',
      width: inkWidth || INK_WIDTH,
      points: [pt],
    };
    currentRef.current = stroke;
    commitStrokes([...strokesRef.current, stroke]);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing || !currentRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const pt = clientToLogical(svg, e.clientX, e.clientY, innerHeight);
    if (!pt) return;
    e.preventDefault();
    appendPoint(pt);
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!currentRef.current) return;
    currentRef.current = null;
    try { svgRef.current?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };

  const chartBody = (
    <div
      ref={innerRef}
      className="relative px-8 py-7"
      style={{
        width: CHART_LOGICAL_WIDTH,
        background: SURFACE_BG[surface],
        transform: exportMode ? undefined : `scale(${scale})`,
        transformOrigin: exportMode ? undefined : 'top left',
        fontFamily: 'var(--font-geist-sans), var(--app-font-family), system-ui, sans-serif',
      }}
    >
      <ChartSurfaceContext.Provider value={surface}>
        <ChartBlocks blocks={blocks} />
      </ChartSurfaceContext.Provider>
      <svg
        ref={svgRef}
        className={cn('absolute inset-0 h-full w-full', drawing ? 'touch-none cursor-crosshair' : 'pointer-events-none')}
        viewBox={`0 0 ${CHART_LOGICAL_WIDTH} ${Math.max(innerHeight, 1)}`}
        preserveAspectRatio="none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {strokes.map((stroke) => (
          <polyline
            key={stroke.id}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')}
          />
        ))}
      </svg>
    </div>
  );

  if (exportMode) {
    return (
      <div ref={outerRef} style={{ width: CHART_LOGICAL_WIDTH }}>
        {chartBody}
      </div>
    );
  }

  return (
    <div ref={outerRef} className="w-full">
      <div
        className="relative"
        style={{
          height: innerHeight * scale || undefined,
          width: CHART_LOGICAL_WIDTH * scale || undefined,
        }}
      >
        {chartBody}
      </div>
    </div>
  );
}
