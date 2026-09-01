// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import {
  formatChartHtml,
  parseChordChart,
  prepareChordChartClipboard,
  prepareChordChartPaste,
  savePastedChartText,
  transposeChartHtml,
} from './chord-chart';

describe('prepareChordChartPaste HTML', () => {
  it('keeps chord and lyric lines from SongSelect HTML instead of mashed plain text', () => {
    const mashedPlain = `Verse 1a
Ab  Goodbye yesterday
I'm Abliving in the light of a new day
`;
    const html = `<div>Verse 1a</div>
<div><span style="font-weight:bold">Ab</span></div>
<div>Goodbye yesterday</div>
<div>I'm</div>
<div><span style="font-weight:bold">Ab</span></div>
<div>living in the light of a new day</div>`;
    const pasted = prepareChordChartPaste(mashedPlain, html);
    expect(pasted).toMatch(/Ab\nGoodbye yesterday/);
    expect(pasted).not.toMatch(/Abliving/);
    expect(pasted).toMatch(/Ab\n[\s\S]*living/);
  });

  it('keeps C2 on one line when SongSelect only bolds the root letter', () => {
    const html = `<div>CHORUS 1A</div>
<div>You</div>
<div><span style="font-weight:bold">C</span>2</div>
<div>rescued me out of the mess I was in</div>`;
    const pasted = prepareChordChartPaste('You\nC\n2rescued me', html);
    expect(pasted.split('\n').some((line) => line.trim() === 'C2')).toBe(true);
    const blocks = parseChordChart(pasted);
    const rescued = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('rescued')));
    expect(rescued?.type).toBe('lyric');
    if (rescued?.type === 'lyric') {
      expect(rescued.parts.some((p) => p.chord === 'C2')).toBe(true);
      expect(rescued.parts.some((p) => p.text.includes('2 rescued') || p.text.trim() === '2')).toBe(false);
    }
  });

  it('stores formatted HTML with chords on their own lines', () => {
    const mashedPlain = `Verse 1a
Ab  Goodbye yesterday
I'm Abliving in the light of a new day
`;
    const html = `<div>Verse 1a</div>
<div><span style="font-weight:bold">Ab</span></div>
<div>Goodbye yesterday</div>
<div>I'm</div>
<div><span style="font-weight:bold">Ab</span></div>
<div>living in the light of a new day</div>`;
    const { html: formatted } = prepareChordChartClipboard(mashedPlain, html);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('class="chart-chord"');
    expect(formatted).toMatch(/chart-chord">Ab</);
    expect(formatted).toContain('Goodbye yesterday');
    expect(formatted).toMatch(/I(?:'|&#39;)m/);
    expect(formatted).toContain('living in the light of a new day');
    expect(formatted).not.toContain('Abliving');
    expect(formatted).toMatch(/I(?:'|&#39;)m[\s\S]*chart-chord">Ab[\s\S]*living/);
  });

  it('does not re-split chords when saving an already-formatted paste', () => {
    const formatted = `Verse 1a
Ab
Goodbye yesterday
`;
    const saved = savePastedChartText(formatted);
    expect(saved.replace(/\n$/, '')).toBe(formatted.trimEnd());
    const blocks = parseChordChart(saved);
    const lyric = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('Goodbye')));
    expect(lyric?.type).toBe('lyric');
    if (lyric?.type === 'lyric') {
      expect(lyric.parts.some((p) => p.chord === 'Ab' && p.text.includes('Goodbye'))).toBe(true);
    }
  });
});

describe('formatChartHtml', () => {
  it('marks SongSelect bold spans as chords and keeps lyric fragments separate', () => {
    const html = formatChartHtml(`<div>VERSE 1A</div>
<div><span style="font-weight:bold">G</span></div>
<div>I'm</div>
<div><span style="font-weight:bold">G</span></div>
<div>living in the light of a new day</div>`);
    expect(html).toContain('chart-section');
    expect(html).toContain('chart-chord-line');
    expect(html).toMatch(/chart-chord">G</);
    expect(html).toMatch(/I(?:'|&#39;)m/);
    expect(html).toContain('living in the light of a new day');
    expect(html.search(/I(?:'|&#39;)m/)).toBeLessThan(html.lastIndexOf('chart-chord'));
  });

  it('strips the CCLI footer and SongSelect logo', () => {
    const html = formatChartHtml(`<div>CHORUS 1A</div>
<div>I'm free</div>
<img alt="SongSelect logo" src="x.png">
<div>CCLI Song # 7244930</div>
<div>For use solely with the SongSelect Terms of Use.</div>`);
    expect(html).toMatch(/I(?:'|&#39;)m free/);
    expect(html).not.toMatch(/CCLI Song/);
    expect(html).not.toMatch(/<img/i);
  });

  it('keeps two-column tables', () => {
    const html = formatChartHtml(`<table>
<tr>
<td><div>VERSE 1</div><div><span style="font-weight:bold">E</span></div><div>Hello</div></td>
<td><div>CHORUS</div><div><span style="font-weight:bold">A</span></div><div>World</div></td>
</tr>
</table>`);
    expect(html).toContain('chart-table');
    expect(html).toContain('chart-col');
    expect(html).toContain('Hello');
    expect(html).toContain('World');
  });
});

describe('transposeChartHtml', () => {
  it('transposes chord spans and the key line', () => {
    const html = formatChartHtml(`<div>Key - E</div>
<div><span style="font-weight:bold">E/G#</span></div>
<div>shaking</div>`);
    const next = transposeChartHtml(html, 'E', 'F');
    expect(next).toContain('Key - F');
    expect(next).toContain('F/A');
    expect(next).not.toContain('E/G#');
    expect(next).toContain('shaking');
  });
});
