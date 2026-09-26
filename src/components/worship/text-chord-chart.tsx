'use client';

import { chartHtmlToMarkdown, detectKeyFromText, formatChartHtml, parseChordChart, splitChartBodyColumns, transposeBlocks, transposeChartHtml, type ChartBlock } from '@/lib/chord-chart';
import { sanitizeRichHtml } from '@/lib/sanitize-html';
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
const CHORD_LABEL_SAFE_GAP_EM = 0.35;

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

function updateRenderedKeyMetadata(block: ChartBlock, displayKey: ChordKey): ChartBlock {
  if (block.type !== 'meta' || !/^\s*key\s*[-–—:]/i.test(block.text)) return block;
  return {
    ...block,
    text: block.text.replace(
      /^(\s*key\s*[-–—:]\s*)[A-G](?:#|b)?/i,
      `$1${displayKey === 'numbers' ? '#' : displayKey}`,
    ),
  };
}

function ChartBlockView({ block, showChords = true }: { block: ChartBlock; showChords?: boolean }) {
  const surface = useChartSurface();
  if (block.type === 'title') {
    return (
      <h1 className={cn('max-w-full text-[24px] font-bold leading-tight tracking-tight [overflow-wrap:anywhere]', ink(surface))}>
        {block.text}
      </h1>
    );
  }
  if (block.type === 'credit') {
    return (
      <p className={cn('max-w-full text-[14px] leading-snug [overflow-wrap:anywhere]', ink(surface, 'muted'))}>
        {block.text}
      </p>
    );
  }
  if (block.type === 'meta') {
    return (
      <p className={cn('max-w-full text-[14px] font-semibold [overflow-wrap:anywhere]', ink(surface))}>
        {block.text}
      </p>
    );
  }
  if (block.type === 'section') {
    return (
      <p className={cn('mt-6 pt-2 text-[16px] font-bold uppercase tracking-wide first:mt-0 first:pt-0', ink(surface))}>
        {block.text}
      </p>
    );
  }
  if (block.type === 'measure') {
    if (!showChords) {
      const lyrics = block.text
        .split('|')
        .map((cell) => {
          let value = cell.trim();
          value = value.replace(/^\.\s*/, '');
          while (/^\(?[A-G](?:#|b)?[^\s|]*/i.test(value)) {
            value = value.replace(/^\(?[A-G](?:#|b)?[^\s|]*\s*/i, '');
          }
          return value.trim();
        })
        .filter(Boolean)
        .join(' ');
      if (!lyrics && !block.cue) return null;
      return (
        <p className={cn('max-w-full whitespace-pre-wrap break-words text-[16px] leading-snug', ink(surface))}>
          {[block.cue, lyrics].filter(Boolean).join(' ')}
        </p>
      );
    }
    return (
      <div className={cn('max-w-full', ink(surface))}>
        <MeasureChartView text={block.text} cue={block.cue} />
      </div>
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
    <LyricBlockView block={block} showChords={showChords} />
  );
}

function ChordLabel({ chord, className }: { chord: string; className?: string }) {
  const match = chord.match(/^(.*)\^(\d+)(.*)$/);
  if (!match) return <span className={className}>{chord}</span>;
  return (
    <span className={className}>
      {match[1]}
      <sup className="text-[0.72em]">{match[2]}</sup>
      {match[3]}
    </span>
  );
}

function isDirectionCue(text: string) {
  return /^\((?:to\b|\d+(?:st|nd|rd|th)\s+x\b|based on\b)/i.test(text.trim());
}

function CueLabel({ text, surface }: { text: string; surface: ChartSurface }) {
  const direction = isDirectionCue(text);
  return (
    <span
      className={cn(
        direction ? 'text-[13px] italic' : 'text-[16px]',
        ink(surface, direction ? 'soft' : 'primary'),
      )}
    >
      {text}
    </span>
  );
}

function MeasureChartView({ text, cue }: { text: string; cue?: string }) {
  const surface = useChartSurface();
  const trimmedText = text.trim();
  const openingRepeat = /^(?:\|\|:|\|:\|)\s*/.exec(trimmedText)?.[0].trim() ?? '';
  const closingRepeat = /\s*(?::\|\||\|:\|)$/.exec(trimmedText)?.[0].trim() ?? '';
  const measureText = trimmedText
    .replace(openingRepeat, '')
    .replace(closingRepeat, '');
  const rawCells = measureText.split('|');
  const hasLeadingBar = measureText.trimStart().startsWith('|');
  const hasTrailingBar = measureText.trimEnd().endsWith('|');
  const cells = rawCells
    .slice(hasLeadingBar ? 1 : 0, hasTrailingBar ? -1 : undefined)
    .map((cell) => {
    const tokens = cell.trim().split(/\s+/).filter(Boolean);
    const chords: string[] = [];
    const lyrics: string[] = [];
    for (const token of tokens) {
      if (
        token === ':'
        || token === '.'
        || /^N\.?C\.?$|^N\/C$/i.test(token)
        || /^\(?[A-G](?:#|b)?(?:\d|\/|m|sus|add|dim|aug|\+|-|\([^)]*\))/.test(token)
        || /^[A-G](?:#|b)?$/.test(token)
      ) {
        chords.push(token);
      } else {
        lyrics.push(token);
      }
    }
    return { chords, lyric: lyrics.join(' ') };
  });
  const hasLyrics = cells.some((cell) => cell.lyric.trim());

  return (
    <div className="max-w-full overflow-x-auto whitespace-nowrap text-[16px] font-bold leading-snug">
      {cue ? (
        <div className="mb-0.5 font-normal leading-tight">
          <CueLabel text={cue} surface={surface} />
        </div>
      ) : null}
      <div className="flex items-start">
        {openingRepeat ? <span className="shrink-0">{openingRepeat}</span> : null}
        {hasLeadingBar ? <span className="mr-1 shrink-0">|</span> : null}
        {cells.map((cell, index) => {
          const chordText = cell.chords.join(' ');
          const cellWidth = `${Math.max(chordText.length, cell.lyric.length, 1) * 0.5 + 0.8}em`;
          return (
            <div key={`${chordText}-${cell.lyric}-${index}`} className="flex shrink-0 items-start">
              <div className="flex flex-col items-center justify-start text-center" style={{ width: cellWidth }}>
                <div className={cn(hasLyrics ? 'min-h-[1.45em]' : 'min-h-0', 'leading-tight')}>
                  {cell.chords.map((chord, chordIndex) => (
                    <ChordLabel key={`${chord}-${chordIndex}`} chord={chord} className="mx-0.5 text-[14px]" />
                  ))}
                </div>
                {hasLyrics && (
                  <div className="min-h-[1.45em] text-[16px] font-normal leading-tight">
                    {cell.lyric}
                  </div>
                )}
              </div>
              {!(closingRepeat && index === cells.length - 1) && (
                <span className="shrink-0">|</span>
              )}
            </div>
          );
        })}
        {closingRepeat ? <span className="shrink-0">{closingRepeat}</span> : null}
      </div>
    </div>
  );
}

function LyricBlockView({
  block,
  showChords = true,
}: {
  block: Extract<ChartBlock, { type: 'lyric' }>;
  showChords?: boolean;
}) {
  const surface = useChartSurface();
  const parts = block.parts.filter((part) => part.chord || (part.text ?? '').trim());
  if (parts.length === 0) return null;

  if (!showChords) {
    const lyrics = parts
      .filter((part) => part.chord !== '.')
      .map((part) => part.text)
      .join('');
    if (!lyrics.trim()) return null;
    return (
      <p className={cn('max-w-full whitespace-pre-wrap break-words text-[16px] leading-snug', ink(surface))}>
        {lyrics}
        {block.cue && (
          <span className={cn('ml-2 text-[13px] italic', ink(surface, 'soft'))}>{block.cue}</span>
        )}
      </p>
    );
  }

  if (parts.length === 1 && parts[0].text.trim() && !parts[0].chord) {
    return (
      <p className={cn('max-w-full text-[20px] leading-snug [overflow-wrap:anywhere]', ink(surface))}>
        {parts[0].text}
        {block.cue && (
          <span className={cn('ml-2 text-[16px] italic', ink(surface, 'soft'))}>{block.cue}</span>
        )}
      </p>
    );
  }

  return (
    <div className="max-w-full">
      <div className="max-w-full whitespace-normal pb-1 text-[16px] leading-[1.3]">
        {parts.map((part, pi) => (
          <span
            key={pi}
            className="relative inline-block align-top pt-[1.1em]"
            style={{
              minWidth: part.chord
                ? `${Math.max(part.chord.length * 0.55 + CHORD_LABEL_SAFE_GAP_EM, 1.1)}em`
                : undefined,
              paddingRight: part.chord ? `${CHORD_LABEL_SAFE_GAP_EM}em` : undefined,
            }}
          >
            {part.chord && (
              <span className={cn('absolute left-0 top-0 whitespace-nowrap text-[14px] font-bold leading-none', ink(surface))}>
                <ChordLabel chord={part.chord} />
              </span>
            )}
            <span className={cn('whitespace-pre-wrap break-words', ink(surface))}>
              {part.text?.trim() ? part.text : '\u00a0'}
            </span>
          </span>
        ))}
      </div>
      {block.cue && (
        <p className="font-normal leading-tight">
          <CueLabel text={block.cue} surface={surface} />
        </p>
      )}
    </div>
  );
}

function ChartColumn({ blocks, showChords = true }: { blocks: ChartBlock[]; showChords?: boolean }) {
  return (
    <div className="min-w-0 max-w-full space-y-0 overflow-x-hidden overflow-y-visible">
      {blocks.map((block, i) => {
        const previous = blocks[i - 1];
        if (
          showChords
          && block.type === 'measure'
          && previous?.type === 'lyric'
          && previous.parts.length === 1
          && !previous.parts[0].chord
          && previous.parts[0].text.trim()
        ) {
          return (
            <ChartBlockView
              key={i}
              block={{ ...block, cue: previous.parts[0].text.trim() }}
              showChords
            />
          );
        }
        if (
          showChords
          && block.type === 'lyric'
          && block.parts.length === 1
          && !block.parts[0].chord
          && blocks[i + 1]?.type === 'measure'
        ) {
          return null;
        }
        return <ChartBlockView key={i} block={block} showChords={showChords} />;
      })}
    </div>
  );
}

export function ChordChartBody({
  blocks,
  showChords = true,
}: {
  blocks: ChartBlock[];
  showChords?: boolean;
}) {
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
            <ChartBlockView key={`h-${i}`} block={block} showChords={showChords} />
          ))}
        </div>
      )}
      {body.length > 0 && right.length === 0 && <ChartColumn blocks={left} showChords={showChords} />}
      {body.length > 0 && right.length > 0 && (
        <div className="grid max-w-full grid-cols-2 items-start gap-x-6">
          <ChartColumn blocks={left} showChords={showChords} />
          <ChartColumn blocks={right} showChords={showChords} />
        </div>
      )}
      </div>
    </ChartSurfaceContext.Provider>
  );
}

export function RichChordChartBody({ html, originalKey, displayKey }: {
  html: string;
  originalKey: ChordKey;
  displayKey: ChordKey;
}) {
  const rendered = transposeChartHtml(sanitizeRichHtml(formatChartHtml(html)), originalKey, displayKey);
  return (
    <>
      <style>{`
        .rich-chord-chart { color: white; }
        .rich-chord-chart .chart-title { font-size: 24px; font-weight: 700; line-height: 1.15; margin-bottom: 4px; }
        .rich-chord-chart .chart-credit, .rich-chord-chart .chart-meta { font-size: 13px; line-height: 1.35; color: rgba(255,255,255,.72); }
        .rich-chord-chart .chart-meta { font-weight: 600; color: white; }
        .rich-chord-chart .chart-section { margin-top: 10px; font-size: 14px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
        .rich-chord-chart .chart-line { font-size: 14px; line-height: 1.45; white-space: pre-wrap; }
        .rich-chord-chart .chart-chord { position: relative; top: -.72em; display: inline-block; min-width: .2em; margin-right: .08em; font-size: 14px; font-weight: 700; line-height: 1; }
        .rich-chord-chart .chart-chord-line { font-weight: 700; }
        .rich-chord-chart .chart-measure { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 14px; line-height: 1.45; font-weight: 700; }
        .rich-chord-chart .chart-line { overflow-wrap: anywhere; }
        .rich-chord-chart .chart-note { font-size: 13px; font-style: italic; color: rgba(255,255,255,.7); }
      `}</style>
      <div className="rich-chord-chart max-w-full space-y-2" dangerouslySetInnerHTML={{ __html: rendered }} />
    </>
  );
}

export function TextChordChartCanvas({
  sheet,
  sourceText,
  chartTitle,
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
  showChords = true,
}: {
  sheet: SongChordSheet;
  sourceText?: string;
  chartTitle?: string;
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
  showChords?: boolean;
}) {
  const surface = TEXT_CHART_SURFACE;
  const source = useMemo(() => {
    if (sourceText != null) return sourceText;
    if (sheet.sourceText?.trim()) return sheet.sourceText;
    const richSource = sheet.sourceHtml?.trim() || '';
    return richSource ? chartHtmlToMarkdown(richSource) || '' : '';
  }, [sheet.sourceHtml, sheet.sourceText, sourceText]);
  const sourceOriginalKey = useMemo(
    // Prefer the persisted plain text: rich clipboard extraction can contain
    // presentation-only metadata that should not redefine the chart's key.
    () => detectKeyFromText(sheet.sourceText || '') ?? detectKeyFromText(source) ?? originalKey,
    [sheet.sourceText, source, originalKey],
  );
  const blocks = useMemo(() => {
    const transposed = transposeBlocks(parseChordChart(source), sourceOriginalKey, displayKey);
    const keyMetadata = transposed
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => block.type === 'meta' && /^\s*key\s*[-–—:]/i.test(block.text));
    const preferredKeyMetadata = keyMetadata.find(({ block }) => (
      block.type === 'meta' && /\|/.test(block.text)
    ));
    const parsed = preferredKeyMetadata
      ? transposed.flatMap((block, index) => {
        if (block.type !== 'meta' || !/^\s*key\s*[-–—:]/i.test(block.text)) return [block];
        if (index !== preferredKeyMetadata.index) return [];
        return [updateRenderedKeyMetadata(block, displayKey)];
      })
      : transposed.filter((block) => !(
        block.type === 'meta' && /^\s*key\s*[-–—:]/i.test(block.text)
      ));
    const rendered = parsed.map((block) => updateRenderedKeyMetadata(block, displayKey));
    if (rendered.some((block) => block.type === 'title') || !chartTitle?.trim()) return rendered;
    return [
      { type: 'title' as const, text: chartTitle.trim() },
      ...rendered,
    ];
  }, [chartTitle, displayKey, source, sourceOriginalKey]);
  const { outerRef, innerRef, scale, innerHeight } = useScaledChart(exportMode ? 1 : zoom);
  const svgRef = useRef<SVGSVGElement>(null);
  const currentRef = useRef<ChordChartStroke | null>(null);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const commitStrokes = (next: ChordChartStroke[]) => {
    strokesRef.current = next;
    onStrokesChange?.(next);
  };

  useEffect(() => {
    if (!drawing || !onStrokesChange) return;
    const svg = svgRef.current;
    if (!svg) return;

    // iPad Safari can continue scrolling the parent after pointer events begin.
    // Keep the chart still for the duration of a touch gesture while drawing.
    const preventTouchScroll = (event: TouchEvent) => {
      event.preventDefault();
    };
    svg.addEventListener('touchmove', preventTouchScroll, { passive: false });
    return () => {
      svg.removeEventListener('touchmove', preventTouchScroll);
    };
  }, [drawing, onStrokesChange]);

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
        <ChordChartBody blocks={blocks} showChords={showChords} />
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
