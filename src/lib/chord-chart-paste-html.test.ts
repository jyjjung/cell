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

  it('normalizes mashed plain text immediately for the editable paste field', () => {
    const pasted = prepareChordChartPaste(`Touch of HeavenSongSelect logo
VERSE 1
F2How I live for the moments
Am7Where I'm still in Your presence
C5All the noise dies down Gsus`, null);
    expect(pasted).toContain('Touch of Heaven\n');
    expect(pasted).toContain('F2\nHow I live for the moments');
    expect(pasted).toContain('Am7\nWhere I\'m still in Your presence');
    expect(pasted).toContain('C5\nAll the noise dies down');
    expect(pasted).toContain('Gsus');
  });

  it('places inline bold SongSelect chords above their lyric text', () => {
    const html = `<div>VERSE 1</div>
<div><b>F2</b>&nbsp; How I live for the moments</div>
<div><b>Am7</b>&nbsp; Where I'm still in Your presence</div>
<div><b>C5</b>&nbsp; All the noise dies down <b>Gsus</b></div>`;
    const formatted = prepareChordChartClipboard('', html).html;
    expect(formatted).toBeTruthy();
    expect(formatted).toMatch(/chart-line"><span class="chart-chord">F2<\/span>&nbsp; How I live/);
    expect(formatted).toMatch(/chart-line"><span class="chart-chord">Am7<\/span>&nbsp; Where I(?:&#39;|')m/);
    expect(formatted).toContain('<span class="chart-chord">C5</span>&nbsp; All the noise dies down <span class="chart-chord">Gsus</span>');
  });

  it('keeps inline chord positions within the matching lyric line', () => {
    const html = `<div>BRIDGE 1A</div>
<div>I open up my <b>F2</b>heart to You</div>
<div><b>G</b> I open up my <b>Am7</b>heart to You, now</div>
<div><b>C/E</b> So, do what only <b>F2</b>You can</div>`;
    const pasted = prepareChordChartPaste('', html);
    const blocks = parseChordChart(pasted);
    expect(blocks).toContainEqual({
      type: 'lyric',
      parts: [
        { text: 'I open up my ' },
        { chord: 'F2', text: 'heart to You' },
      ],
    });

    const secondLine = blocks.find((block) =>
      block.type === 'lyric' && block.parts.some((part) => part.chord === 'Am7'),
    );
    expect(secondLine).toMatchObject({
      type: 'lyric',
      parts: expect.arrayContaining([
        { chord: 'G', text: '' },
        { text: ' I open up my ' },
        { chord: 'Am7', text: 'heart to You, now' },
      ]),
    });
  });

  it('does not merge a chord marker with the first lyric letter', () => {
    const pasted = prepareChordChartPaste('', '<div>It&apos;s Your <b>D</b>breath in our <b>F#m7</b>lungs</div>');
    expect(pasted).toContain('[D]breath');
    expect(pasted).not.toContain('[Db]reath');
    expect(parseChordChart(pasted)).toContainEqual({
      type: 'lyric',
      parts: expect.arrayContaining([
        { chord: 'D', text: 'breath in our ' },
        { chord: 'F#m7', text: 'lungs' },
      ]),
    });
  });

  it('removes internal chord markers from measure lines', () => {
    const blocks = parseChordChart('INTRO\n||: [D] | [F#m7] | [Esus] | [Esus] :||');
    expect(blocks).toContainEqual({
      type: 'measure',
      text: '||: D | F#m7 | Esus | Esus :||',
    });
  });

  it('separates glued SongSelect credits from key metadata', () => {
    const blocks = parseChordChart('Touch Of HeavenHannah Hobbs | Aodhan King | Michael FatkinKey - A | Tempo - 68 | Time - 4/4\n\nINTRO');
    expect(blocks).toContainEqual({ type: 'title', text: 'Touch Of Heaven' });
    expect(blocks).toContainEqual({ type: 'credit', text: 'Hannah Hobbs | Aodhan King | Michael Fatkin' });
    expect(blocks).toContainEqual({ type: 'meta', text: 'Key - A | Tempo - 68 | Time - 4/4' });
  });

  it('separates inline bold Apple Notes chords from following lyrics', () => {
    const html = `<div>VERSE 1</div>
<div><b>Bm</b>&nbsp; You call me out up - </div>
<div><b>A/C#</b>&nbsp;on the waters</div>
<div>The great un</div>
<div><b>A</b>&nbsp;- known where feet may</div>
<div><b>G</b>&nbsp; fail</div>`;
    const pasted = prepareChordChartPaste('VERSE 1 Bm You call me out up - A/C# on the waters', html);
    expect(pasted).toContain('[Bm] You call me out up -');
    expect(pasted).toContain('[A/C#] on the waters');
    expect(pasted).toContain('[A] - known where feet may');
    expect(pasted).toContain('[G] fail');
    expect(pasted).not.toContain('BmYou');
    expect(pasted).not.toContain('A/C#on');
  });

  it('combines hanging Apple Notes lyric fragments into the chorded line', () => {
    const html = `<div>VERSE 1</div>
<div><b>Bm</b></div>
<div>You call me out up -</div>
<div><b>A/C#</b></div>
<div>&nbsp; on the waters</div>
<div><b>D</b></div>
<div>&nbsp; the great unknown</div>
<div><b>G</b></div>
<div>&nbsp; fail</div>
<div>CHORUS 1</div>`;
    const pasted = prepareChordChartPaste('', html);
    const lyrics = parseChordChart(pasted).filter((block) => block.type === 'lyric');
    expect(lyrics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        parts: expect.arrayContaining([{ chord: 'A/C#', text: 'on the waters' }]),
      }),
      expect.objectContaining({
        parts: expect.arrayContaining([{ chord: 'G', text: 'fail' }]),
      }),
    ]));
  });

  it('keeps C2 on one line when SongSelect only bolds the root letter', () => {
    const html = `<div>CHORUS 1A</div>
<div>You</div>
<div><span style="font-weight:bold">C</span>2</div>
<div>rescued me out of the mess I was in</div>`;
    const pasted = prepareChordChartPaste('You\nC\n2rescued me', html);
    expect(pasted).toContain('[C2]');
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
