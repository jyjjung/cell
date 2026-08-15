'use client';

import { parseChordChart, splitChartBodyColumns, transposeBlocks, type ChartBlock } from '@/lib/chord-chart';
import { cn } from '@/lib/utils';
import type { ChordChartStroke, ChordKey, SongChordSheet } from '@/types';
import { useEffect, useMemo, useRef, useState } from 'react';

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

function ChartBlockView({ block }: { block: ChartBlock }) {
  if (block.type === 'title') {
    return (
      <h1 className="max-w-full text-[28px] font-bold leading-tight tracking-tight text-white [overflow-wrap:anywhere]">
        {block.text}
      </h1>
    );
  }
  if (block.type === 'credit') {
    return (
      <p className="max-w-full text-[13px] leading-snug text-white/75 [overflow-wrap:anywhere]">
        {block.text}
      </p>
    );
  }
  if (block.type === 'meta') {
    return (
      <p className="max-w-full text-[13px] font-semibold text-white [overflow-wrap:anywhere]">
        {block.text}
      </p>
    );
  }
  if (block.type === 'section') {
    return (
      <p className="pt-2 text-[16px] font-bold uppercase tracking-wide text-white">
        {block.text}
      </p>
    );
  }
  if (block.type === 'measure') {
    return (
      <p className="max-w-full text-[16px] font-bold text-white [overflow-wrap:anywhere]">
        <span className="inline">{block.text}</span>
        {block.cue && (
          <span className="ml-2 text-[13px] font-normal italic text-white/70">{block.cue}</span>
        )}
      </p>
    );
  }
  if (block.type === 'note') {
    return (
      <p className="text-[13px] italic text-white/70">
        {block.text}
      </p>
    );
  }
  return (
    <p className="flex max-w-full flex-wrap items-end gap-y-1 leading-none">
      <span className="min-w-0">
        {block.parts.map((part, pi) => (
          <span key={pi} className="inline-flex max-w-full flex-col items-start align-bottom">
            <span className="min-h-[1.15em] pr-1.5 text-[15px] font-bold leading-none text-white">
              {part.chord || '\u00a0'}
            </span>
            <span className="pr-1.5 text-[18px] leading-snug text-white [overflow-wrap:anywhere]">
              {part.text || '\u00a0'}
            </span>
          </span>
        ))}
      </span>
      {block.cue && (
        <span className="mb-auto ml-2 shrink-0 pt-px text-[13px] italic text-white/70">
          {block.cue}
        </span>
      )}
    </p>
  );
}

function ChartColumn({ blocks }: { blocks: ChartBlock[] }) {
  return (
    <div className="min-w-0 max-w-full space-y-1.5 overflow-hidden">
      {blocks.map((block, i) => (
        <ChartBlockView key={i} block={block} />
      ))}
    </div>
  );
}

function ChartBlocks({ blocks }: { blocks: ChartBlock[] }) {
  const firstBody = blocks.findIndex((b) =>
    b.type === 'section' || b.type === 'measure' || b.type === 'lyric' || b.type === 'note',
  );
  const header = firstBody === -1 ? blocks : blocks.slice(0, firstBody);
  const body = firstBody === -1 ? [] : blocks.slice(firstBody);
  const [left, right] = splitChartBodyColumns(body);

  return (
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
  );
}

export function TextChordChartCanvas({
  sheet,
  originalKey,
  displayKey,
  strokes,
  drawing,
  inkColor,
  onStrokesChange,
  zoom = 1,
}: {
  sheet: SongChordSheet;
  originalKey: ChordKey;
  displayKey: ChordKey;
  strokes: ChordChartStroke[];
  drawing?: boolean;
  inkColor?: string;
  onStrokesChange?: (strokes: ChordChartStroke[]) => void;
  zoom?: number;
}) {
  const source = sheet.sourceText || '';
  const blocks = useMemo(
    () => transposeBlocks(parseChordChart(source), originalKey, displayKey),
    [source, originalKey, displayKey],
  );
  const { outerRef, innerRef, scale, innerHeight } = useScaledChart(zoom);
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
      width: INK_WIDTH,
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

  return (
    <div ref={outerRef} className="w-full">
      <div
        className="relative"
        style={{
          height: innerHeight * scale || undefined,
          width: CHART_LOGICAL_WIDTH * scale || undefined,
        }}
      >
        <div
          ref={innerRef}
          className="relative origin-top-left bg-[#1f1f1f] px-7 py-6"
          style={{
            width: CHART_LOGICAL_WIDTH,
            transform: `scale(${scale})`,
            fontFamily: 'var(--font-geist-sans), var(--app-font-family), system-ui, sans-serif',
          }}
        >
          <ChartBlocks blocks={blocks} />
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
      </div>
    </div>
  );
}
