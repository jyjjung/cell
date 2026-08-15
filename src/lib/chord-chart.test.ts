import { describe, expect, it } from 'vitest';
import {
  detectKeyFromText,
  expandInlineChords,
  parseChordChart,
  repairBrokenMeasureLines,
  splitChartBodyColumns,
  transposeBlocks,
  transposeChord,
} from './chord-chart';

const SAMPLE = `Thank God I'm Free
Joshua Holiday | Mitch Wong | Sydney James | Tiffany Hudson
(based on the recording by Elevation Rhythm & Lizzie Morgan)
Key - E | Tempo - 128 | Time - 4/4

INTRO
| E  | E  | E  | E  | 
| C#m  | A  E/G# | E  | E  | 

VERSE 1
I'm 
E/G#
shaking
 off the heaviness 
A
 
I'm 
E
dancing
 out of my regrets 
I'm 
C#m
throwing
 caution to the wind 
B
 
A
I
 am not ashamed to praise like this 

CHORUS 1A
E/G#
 
 Where are those 
A
chains
 that once 
E/G#
held
 me 
E
 
 I'm free I'm free I'm free I'm free 

(To Ch. 1a)

CCLI Song # 7244930
`;

describe('chord chart paste', () => {
  it('detects the original key from SongSelect metadata', () => {
    expect(detectKeyFromText(SAMPLE)).toBe('E');
  });

  it('parses title, intro bars, and verse chords above lyrics', () => {
    const blocks = parseChordChart(SAMPLE);
    expect(blocks[0]).toEqual({ type: 'title', text: "Thank God I'm Free" });
    expect(blocks.some((b) => b.type === 'section' && b.text === 'INTRO')).toBe(true);
    expect(blocks.some((b) => b.type === 'measure' && b.text.includes('C#m'))).toBe(true);

    const verse = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')));
    expect(verse?.type).toBe('lyric');
    if (verse?.type === 'lyric') {
      expect(verse.parts.some((p) => p.chord === 'E/G#' && p.text.includes('shaking'))).toBe(true);
      expect(verse.parts.some((p) => p.chord === 'A')).toBe(true);
    }
  });

  it('keeps jump notes and drops CCLI footer', () => {
    const blocks = parseChordChart(SAMPLE);
    expect(blocks.some((b) => (
      (b.type === 'note' && /To Ch/i.test(b.text))
      || (b.type === 'lyric' && b.cue && /To Ch/i.test(b.cue))
      || (b.type === 'measure' && b.cue && /To Ch/i.test(b.cue))
    ))).toBe(true);
    expect(blocks.some((b) => b.type === 'credit' && /CCLI/i.test(b.text))).toBe(false);
  });

  it('drops the full SongSelect copyright block including mashed publisher lines', () => {
    const blocks = parseChordChart(`CHORUS 1A
I'm free I'm free

CCLI Song # 7244930
* © 2026 Bell Music PublishingOriginal Wong PublishingElevation Worship Publishing2Music by Elevation Worship PublishingSydney James Designee
For use solely with the SongSelect® Terms of Use. All rights reserved. www.ccli.com
Note: Reproduction of this sheet music requires a CCLI Music Reproduction License. Please report all copies.
CCLI License # 620075
`);
    const texts = blocks.flatMap((b) => {
      if (b.type === 'lyric') return b.parts.map((p) => p.text);
      if ('text' in b) return [b.text];
      return [];
    }).join('\n');
    expect(texts).toMatch(/I'm free/);
    expect(texts).not.toMatch(/CCLI/i);
    expect(texts).not.toMatch(/Bell Music/i);
    expect(texts).not.toMatch(/All rights reserved/i);
    expect(texts).not.toMatch(/620075/);
  });

  it('transposes slash chords into a flat key', () => {
    expect(transposeChord('E/G#', 1, 'F')).toBe('F/A');
    expect(transposeChord('(B/D#)', 1, 'F')).toBe('(C/E)');
    expect(transposeChord('N.C.', 3, 'G')).toBe('N.C.');
  });

  it('transposes a parsed chart from E to G', () => {
    const blocks = transposeBlocks(parseChordChart(SAMPLE), 'E', 'G');
    const verse = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')));
    expect(verse?.type).toBe('lyric');
    if (verse?.type === 'lyric') {
      expect(verse.parts.some((p) => p.chord === 'G/B')).toBe(true);
    }
  });

  it('parses a verse as separate lyric lines, not one run-on block', () => {
    const blocks = parseChordChart(`VERSE 1
I'm 
E/G#
shaking
 off the heaviness 
A

I'm 
E
dancing
 out of my regrets
`);
    const lyrics = blocks.filter((b) => b.type === 'lyric');
    expect(lyrics.length).toBeGreaterThanOrEqual(2);
    expect(lyrics.some((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')))).toBe(true);
    expect(lyrics.some((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('dancing')))).toBe(true);
  });

  it('attaches pickup chords to the following lyric instead of extra lines', () => {
    const blocks = parseChordChart(`BRIDGE 1A
B/E


E

 You 
A/E
took
 the cross and You broke Your bod - 
B/E
y
`);
    const lyrics = blocks.filter((b) => b.type === 'lyric');
    expect(lyrics).toHaveLength(1);
    if (lyrics[0]?.type === 'lyric') {
      const chords = lyrics[0].parts.map((p) => p.chord).filter(Boolean);
      expect(chords).toEqual(['B/E', 'E', 'A/E', 'B/E']);
      expect(lyrics[0].parts.some((p) => p.text.includes('took'))).toBe(true);
    }
  });

  it('unglues mashed SongSelect plain text into chords above lyrics', () => {
    const expanded = expandInlineChords(`Verse 1
I’m E/G#shaking off the heaviness A 
I’m Edancing out of my regrets 
AI am not ashamed to praise like this 
E/G#  Where are those Achains that once E/G#held me 
And You broke Your E/G#bod - B/D#y 
`);
    expect(expanded).toMatch(/E\/G#\nshaking/i);
    expect(expanded).toMatch(/E\ndancing/);
    expect(expanded).toMatch(/^A\nI am not ashamed/m);
    expect(expanded).toMatch(/A\nchains/);
    expect(expanded).toMatch(/And You broke Your/);
    expect(expanded).toMatch(/E\/G#\nbod/);

    const blocks = parseChordChart(expanded);
    const shaking = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')));
    expect(shaking?.type).toBe('lyric');
    if (shaking?.type === 'lyric') {
      expect(shaking.parts.some((p) => p.chord === 'E/G#' && p.text.includes('shaking'))).toBe(true);
    }
    const lyrics = blocks.filter((b) => b.type === 'lyric');
    expect(lyrics.length).toBeGreaterThanOrEqual(3);
  });

  it('keeps intro bars on one line and strips SongSelect logo from the title', () => {
    const blocks = parseChordChart(`Thank God I'm FreeSongSelect logo
Joshua Holiday | Mitch Wong
Key - E | Tempo - 128 | Time - 4/4

Intro
| E  | E  | E  | E  | 
| C#m  | A  E/G# | E  | E  | 
`);
    expect(blocks[0]).toEqual({ type: 'title', text: "Thank God I'm Free" });
    const measures = blocks.filter((b) => b.type === 'measure');
    expect(measures.length).toBe(2);
    expect(measures[0]).toMatchObject({ type: 'measure', text: expect.stringMatching(/^\|\s*E/) });
    expect(measures.some((b) => b.type === 'measure' && b.text.includes('C#m'))).toBe(true);
  });

  it('repairs bar lines that were split onto separate lines', () => {
    const fixed = repairBrokenMeasureLines(`Intro
|
E
|
E
|
E
|
`);
    expect(fixed).toMatch(/\|\s*E\s*\|\s*E\s*\|\s*E\s*\|/);
  });

  it('does not turn English words or jump cues into chords', () => {
    const expanded = expandInlineChords(`EBut I say it's worth the risk 
I'll Anever be ashamed to praise like this (To Ch. 1a) 
how Acan E/G#it be 
`);
    expect(expanded).toMatch(/^E\nBut I say/m);
    expect(expanded).not.toMatch(/^B\nut/m);
    expect(expanded).toContain('(To Ch. 1a)');
    expect(expanded).not.toMatch(/\nC\n/);
    expect(expanded).toMatch(/A\nnever/);
    expect(expanded).toMatch(/A\ncan/);

    const blocks = parseChordChart(expanded);
    const texts = blocks.flatMap((b) => {
      if (b.type === 'lyric') return [b.parts.map((p) => `${p.chord ?? ''}:${p.text}`).join('|'), b.cue ?? ''];
      if ('text' in b) return [b.text];
      return [];
    }).join('\n');
    expect(texts).toMatch(/But I say/);
    expect(texts).toMatch(/To Ch\. 1a/i);
    expect(texts).not.toMatch(/^ut /m);
  });

  it('parses ChordPro brackets', () => {
    const blocks = parseChordChart('[E]Hello [G]world');
    const lyric = blocks.find((b) => b.type === 'lyric');
    expect(lyric).toEqual({
      type: 'lyric',
      parts: [
        { chord: 'E', text: 'Hello ' },
        { chord: 'G', text: 'world' },
      ],
    });
  });

  it('treats optional [(B/D#)] as a chord above the lyric, not inline text', () => {
    const blocks = parseChordChart(`TAG 1B
I'm free I'm free thank God I'm
(B/D#)
free
`);
    const lyric = blocks.find((b) => b.type === 'lyric');
    expect(lyric?.type).toBe('lyric');
    if (lyric?.type === 'lyric') {
      const joined = lyric.parts.map((p) => p.text).join('');
      expect(joined).not.toMatch(/\[/);
      expect(lyric.parts.some((p) => p.chord === '(B/D#)' && p.text.includes('free'))).toBe(true);
    }
  });

  it('puts jump cues on the previous chord line', () => {
    const blocks = parseChordChart(`CHORUS 1A
E
I'm free I'm free

(To Br. 1b)

TAG 1B
E
Thank God
`);
    const chorus = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes("I'm free")));
    expect(chorus?.type).toBe('lyric');
    if (chorus?.type === 'lyric') {
      expect(chorus.cue).toMatch(/To Br\. 1b/i);
    }
    expect(blocks.some((b) => b.type === 'note')).toBe(false);
  });

  it('does not split a verse across columns', () => {
    const blocks = parseChordChart(`INTRO
| E | E |

VERSE 1
E
line one
A
line two
E
line three

CHORUS 1A
E
I'm free
`);
    const body = blocks.filter((b) => b.type !== 'title' && b.type !== 'credit' && b.type !== 'meta');
    const [left, right] = splitChartBodyColumns(body);
    const leftHasVerse = left.some((b) => b.type === 'section' && b.text === 'VERSE 1');
    const rightHasVerse = right.some((b) => b.type === 'section' && b.text === 'VERSE 1');
    const verseText = (col: typeof body) => col
      .filter((b) => b.type === 'lyric')
      .map((b) => b.type === 'lyric' ? b.parts.map((p) => p.text).join('') : '')
      .join(' ');
    if (leftHasVerse) {
      expect(rightHasVerse).toBe(false);
      expect(verseText(left)).toMatch(/line one/);
      expect(verseText(left)).toMatch(/line two/);
      expect(verseText(left)).toMatch(/line three/);
      expect(verseText(right)).not.toMatch(/line /);
    } else {
      expect(rightHasVerse).toBe(true);
      expect(verseText(right)).toMatch(/line one/);
      expect(verseText(right)).toMatch(/line two/);
      expect(verseText(right)).toMatch(/line three/);
      expect(verseText(left)).not.toMatch(/line /);
    }
  });
});
