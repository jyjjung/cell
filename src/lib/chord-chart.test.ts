import { describe, expect, it } from 'vitest';
import {
  detectKeyFromText,
  expandInlineChords,
  parseChordChart,
  prepareChordChartPaste,
  repairBrokenMeasureLines,
  splitChartBodyColumns,
  transposeBlocks,
  transposeChord,
  type ChartBlock,
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
    }
    expect(blocks.some((b) => b.type === 'lyric' && b.parts.some((p) => p.chord === 'A'))).toBe(true);
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
    expect(lyrics.length).toBeGreaterThanOrEqual(1);
    const chords = lyrics.flatMap((b) => (b.type === 'lyric' ? b.parts.map((p) => p.chord).filter(Boolean) : []));
    expect(chords).toEqual(expect.arrayContaining(['B/E', 'E', 'A/E', 'B/E']));
    expect(lyrics.some((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('took')))).toBe(true);
  });

  it('unglues mashed compound chords glued to lyrics', () => {
    const expanded = expandInlineChords(`Verse 1
I’m E/G#shaking off the heaviness 
E/G#  Where are those Achains that once E/G#held me 
And You broke Your E/G#bod - B/D#y 
`);
    expect(expanded).toMatch(/E\/G#\nshaking/i);
    expect(expanded).toMatch(/E\/G#\nbod/);
    expect(expanded).toMatch(/And You broke Your/);
    expect(expanded).toMatch(/A\nchains/);

    const blocks = parseChordChart(expanded);
    const shaking = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')));
    expect(shaking?.type).toBe('lyric');
    if (shaking?.type === 'lyric') {
      expect(shaking.parts.some((p) => p.chord === 'E/G#' && p.text.includes('shaking'))).toBe(true);
    }
  });

  it('keeps song titles intact when they start with chord letters', () => {
    const blocks = parseChordChart(`Great Are You Lord
David Leonard | Jason Ingram | Leslie Jordan
Key - A | Tempo - 144 | Time - 6/8

INTRO
| D | D |
`);
    expect(blocks[0]).toEqual({ type: 'title', text: 'Great Are You Lord' });
  });

  it('pairs chord-only lines with the next lyric using line breaks only', () => {
    const blocks = parseChordChart(`VERSE 1A
Ab
Goodbye yesterday
I'm 
Ab
living in the light of a new day
`);
    const goodbye = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('Goodbye')));
    expect(goodbye?.type).toBe('lyric');
    if (goodbye?.type === 'lyric') {
      expect(goodbye.parts).toEqual([{ chord: 'Ab', text: 'Goodbye yesterday' }]);
    }
    const imLiving = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('living')));
    expect(imLiving?.type).toBe('lyric');
    if (imLiving?.type === 'lyric') {
      expect(imLiving.parts).toEqual([
        { text: "I'm" },
        { chord: 'Ab', text: 'living in the light of a new day' },
      ]);
    }
  });

  it('parses Apple Notes / SongSelect syllable line breaks', () => {
    const notes = `VERSE 1A
G
 
 Goodbye yesterday
I'm 
G
living
 in the light of a new day
I won't 
G
waste
 another minute in my old ways
Gsus
Praise
 the Lord I've been born a - 
G
gain
`;
    const blocks = parseChordChart(notes);
    const goodbye = blocks.find(
      (b): b is Extract<typeof b, { type: 'lyric' }> =>
        b.type === 'lyric' && b.parts.some((p) => p.text.includes('Goodbye')),
    );
    expect(goodbye?.parts).toEqual([{ chord: 'G', text: 'Goodbye yesterday' }]);
    const living = blocks.find(
      (b): b is Extract<typeof b, { type: 'lyric' }> =>
        b.type === 'lyric' && b.parts.some((p) => p.text.includes('living in the light')),
    );
    expect(living?.parts).toEqual([
      { text: "I'm" },
      { chord: 'G', text: 'living in the light of a new day' },
    ]);
    const waste = blocks.find(
      (b): b is Extract<typeof b, { type: 'lyric' }> =>
        b.type === 'lyric' && b.parts.some((p) => p.text.includes('waste')),
    );
    expect(waste?.parts).toEqual([
      { text: "I won't" },
      { chord: 'G', text: 'waste another minute in my old ways' },
    ]);
    const born = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => /Praise|gain/.test(p.text)));
    expect(born?.type).toBe('lyric');
    if (born?.type === 'lyric') {
      expect(born.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['Gsus', 'G']);
      expect(born.parts.map((p) => p.text).join(' ')).toMatch(/Praise the Lord[\s\S]*gain/);
    }
  });

  it('keeps mashed plain text unchanged on paste (use SongSelect HTML for structure)', () => {
    const mashed = `Verse 1a
G  Goodbye yesterday
I'm Gliving in the light of a new day
`;
    const pasted = prepareChordChartPaste(mashed);
    expect(pasted).toContain('G  Goodbye yesterday');
    expect(pasted).toContain("I'm Gliving");
  });

  it('parses line-break SongSelect format like Notes', () => {
    const formatted = `VERSE 1A
G
Goodbye yesterday
I'm
G
living in the light of a new day
G
A7sus
I have decided
`;
    const blocks = parseChordChart(formatted);
    const goodbye = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('Goodbye')));
    expect(goodbye?.type).toBe('lyric');
    if (goodbye?.type === 'lyric') {
      expect(goodbye.parts).toEqual([{ chord: 'G', text: 'Goodbye yesterday' }]);
    }
    const living = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('living')));
    expect(living?.type).toBe('lyric');
    if (living?.type === 'lyric') {
      expect(living.parts).toEqual([
        { text: "I'm" },
        { chord: 'G', text: 'living in the light of a new day' },
      ]);
    }
    const bridge = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('I have decided')));
    expect(bridge?.type).toBe('lyric');
    if (bridge?.type === 'lyric') {
      expect(bridge.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['G', 'A7sus']);
    }
  });

  it('treats INTRO / TURNAROUND after the time signature as a section', () => {
    const blocks = parseChordChart(`Goodbye Yesterday
Grace Binion | Joshua Holiday
Key - Ab | Tempo - 75 | Time - 4/4

INTRO / TURNAROUND
| Ab  | Ab  | Ab  | Absus  |

VERSE 1A
Ab
Goodbye yesterday
`);
    expect(blocks.some((b) => b.type === 'section' && b.text === 'INTRO / TURNAROUND')).toBe(true);
    expect(blocks.some((b) => b.type === 'section' && b.text === 'VERSE 1A')).toBe(true);
    expect(blocks.some((b) => b.type === 'credit' && /INTRO/i.test(b.text))).toBe(false);
    const goodbye = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('Goodbye')));
    expect(goodbye?.type).toBe('lyric');
    if (goodbye?.type === 'lyric') {
      expect(goodbye.parts).toEqual([{ chord: 'Ab', text: 'Goodbye yesterday' }]);
    }
  });

  it('aligns mid-line chords to the matching syllable', () => {
    const blocks = parseChordChart(`CHORUS 1B
A -
Db2(no3)
gain
Ebsus
and a - gain
Fm7
and a - gain and again
`);
    const line = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.toLowerCase().includes('gain')));
    expect(line?.type).toBe('lyric');
    if (line?.type === 'lyric') {
      expect(line.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['Db2(no3)', 'Ebsus', 'Fm7']);
      expect(line.parts[0]?.text).toMatch(/A\s*-/);
    }
  });

  it('keeps C2 and G7sus as one chord instead of putting the suffix in the lyrics', () => {
    const blocks = parseChordChart(`CHORUS 1A
You
C2
rescued me out of the mess I was in
G7sus
A7sus
I have decided
`);
    const rescued = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('rescued')));
    expect(rescued?.type).toBe('lyric');
    if (rescued?.type === 'lyric') {
      expect(rescued.parts.some((p) => p.chord === 'C2')).toBe(true);
      expect(rescued.parts.some((p) => /\b2\b/.test(p.text))).toBe(false);
    }
    const decided = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('decided')));
    expect(decided?.type).toBe('lyric');
    if (decided?.type === 'lyric') {
      expect(decided.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['G7sus', 'A7sus']);
      expect(decided.parts.some((p) => /7sus/.test(p.text))).toBe(false);
    }
  });

  it('rejoins a chord root and suffix that were split onto two lines', () => {
    const blocks = parseChordChart(`CHORUS 1A
You
C
2
rescued me
G
7sus
A
7sus
I have decided

CHORUS 1B
C
2(no3)
gain
`);
    const rescued = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('rescued')));
    expect(rescued?.type).toBe('lyric');
    if (rescued?.type === 'lyric') {
      expect(rescued.parts.some((p) => p.chord === 'C2')).toBe(true);
      expect(rescued.parts.map((p) => p.text).join(' ')).not.toMatch(/\b2\s+rescued/);
    }
    const decided = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('decided')));
    expect(decided?.type).toBe('lyric');
    if (decided?.type === 'lyric') {
      expect(decided.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['G7sus', 'A7sus']);
    }
    const gain = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('gain')));
    expect(gain?.type).toBe('lyric');
    if (gain?.type === 'lyric') {
      expect(gain.parts.some((p) => p.chord === 'C2(no3)')).toBe(true);
    }
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

  it('keeps Gsus on the intro bar instead of wrapping the suffix', () => {
    const blocks = parseChordChart(`INTRO / TURNAROUND
| G | G | G | G
sus |
`);
    const measures = blocks.filter((b) => b.type === 'measure');
    expect(measures).toHaveLength(1);
    expect(measures[0]).toMatchObject({
      type: 'measure',
      text: expect.stringMatching(/^\|\s*G\s*\|\s*G\s*\|\s*G\s*\|\s*Gsus\s*\|$/),
    });
    expect(blocks.some((b) => b.type === 'lyric' && b.parts.some((p) => /sus/.test(p.text)))).toBe(false);
  });

  it('repairs | C2(no3) Dsus Em7 . | bars split across lines', () => {
    const blocks = parseChordChart(`POST-CHORUS
|
C2(no3) Dsus Em7
.|
|
C2(no3) Dsus Em7
.|
`);
    const measures = blocks.filter((b) => b.type === 'measure');
    expect(measures.length).toBe(2);
    for (const m of measures) {
      expect(m).toMatchObject({
        type: 'measure',
        text: expect.stringMatching(/^\|\s*C2\(no3\)\s+Dsus\s+Em7\s+\.\s*\|$/),
      });
    }
    expect(blocks.some((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('.|')))).toBe(false);
  });

  it('does not wrap the lyric pickup after a | C2(no3) Dsus Em7 . | bar', () => {
    const blocks = parseChordChart(`POST-CHORUS
|
C2(no3) Dsus Em7
.|
|
C2(no3)
Dsus
Praise the Lord
`);
    const measures = blocks.filter((b) => b.type === 'measure');
    expect(measures).toHaveLength(1);
    expect(measures[0]).toMatchObject({
      type: 'measure',
      text: expect.stringMatching(/^\|\s*C2\(no3\)\s+Dsus\s+Em7\s+\.\s*\|$/),
    });
    const praise = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('Praise')));
    expect(praise?.type).toBe('lyric');
    if (praise?.type === 'lyric') {
      expect(praise.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['C2(no3)', 'Dsus']);
      expect(praise.parts.map((p) => p.text).join(' ')).toMatch(/Praise the Lord/);
    }
  });

  it('unwraps a stray | C2(no3) | bar that belongs with the lyrics', () => {
    const blocks = parseChordChart(`POST-CHORUS
| C2(no3) Dsus Em7 . |
| C2(no3) |
Dsus
Praise the Lord
`);
    const measures = blocks.filter((b) => b.type === 'measure');
    expect(measures).toHaveLength(1);
    expect(measures[0]).toMatchObject({
      type: 'measure',
      text: expect.stringMatching(/^\|\s*C2\(no3\)\s+Dsus\s+Em7\s+\.\s*\|$/),
    });
    const praise = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('Praise')));
    expect(praise?.type).toBe('lyric');
    if (praise?.type === 'lyric') {
      expect(praise.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['C2(no3)', 'Dsus']);
    }
  });

  it('does not turn English words or jump cues into chords', () => {
    const expanded = expandInlineChords(`EBut I say it's worth the risk 
I'll Anever be ashamed to praise like this (To Ch. 1a) 
how Acan E/G#it be 
`);
    // Glued single-letter roots split from the following lyric (`EBut`, `Anever`).
    expect(expanded).toMatch(/E\nBut I say/);
    expect(expanded).not.toMatch(/^EBut/m);
    expect(expanded).toContain('(To Ch. 1a)');
    expect(expanded).not.toMatch(/\nC\n/);
    expect(expanded).toMatch(/A\nnever/);
    expect(expanded).toMatch(/E\/G#\nit/);

    const blocks = parseChordChart(`VERSE 1
E
But I say it's worth the risk
A
never be ashamed to praise like this (To Ch. 1a)
`);
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
    const lyric = blocks.find((b) => b.type === 'lyric' && b.parts.some((p) => p.chord === '(B/D#)'));
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
    const verseText = (col: ChartBlock[]) => col
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

  it('starts a new line at And/The after a finished phrase, not mid-line “and a - gain”', () => {
    const blocks = parseChordChart(`VERSE 1
E
I'm shaking off the heaviness
And
A
You took the cross
CHORUS 1B
A -
Db2(no3)
gain
Ebsus
and a - gain
`);
    const lyrics = blocks.filter((b) => b.type === 'lyric');
    const heaviness = lyrics.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('heaviness')));
    const took = lyrics.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('took')));
    expect(heaviness).toBeTruthy();
    expect(took).toBeTruthy();
    expect(heaviness).not.toBe(took);
    if (heaviness?.type === 'lyric') {
      expect(heaviness.parts.map((p) => p.text).join(' ')).not.toMatch(/took/);
    }
    const again = lyrics.find((b) => b.type === 'lyric' && b.parts.some((p) => /gain/.test(p.text)));
    expect(again?.type).toBe('lyric');
    if (again?.type === 'lyric') {
      expect(again.parts.filter((p) => p.chord).map((p) => p.chord)).toEqual(['Db2(no3)', 'Ebsus']);
      expect(again.parts.map((p) => p.text).join(' ')).toMatch(/A\s*-[\s\S]*and a -/);
    }
  });

  it('treats a blank line as a lyric break even when the next line starts lowercase', () => {
    const blocks = parseChordChart(`VERSE 1
E
shaking off the heaviness

dancing out of my regrets
`);
    const lyrics = blocks.filter((b) => b.type === 'lyric');
    expect(lyrics.length).toBeGreaterThanOrEqual(2);
    expect(lyrics.some((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')))).toBe(true);
    expect(lyrics.some((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('dancing')))).toBe(true);
    const joined = lyrics
      .filter((b) => b.type === 'lyric')
      .map((b) => (b.type === 'lyric' ? b.parts.map((p) => p.text).join(' ') : ''));
    expect(joined.some((t) => /shaking/.test(t) && /dancing/.test(t))).toBe(false);
  });

  it('keeps SongSelect syllable lines together when an optional [(B/D#)] is in the chart', () => {
    const blocks = parseChordChart(`Thank God I'm Free
Joshua Holiday
Key - E | Tempo - 128 | Time - 4/4

VERSE 1
I'm 
E/G#
shaking
 off the heaviness 

I'm 
E
dancing
 out of my regrets

TAG 1B
I'm free I'm free thank God I'm
[(B/D#)]
free
`);
    const lyrics = blocks.filter((b) => b.type === 'lyric');
    const shaking = lyrics.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('shaking')));
    const dancing = lyrics.find((b) => b.type === 'lyric' && b.parts.some((p) => p.text.includes('dancing')));
    expect(shaking).toBeTruthy();
    expect(dancing).toBeTruthy();
    expect(shaking).not.toBe(dancing);
    if (shaking?.type === 'lyric') {
      expect(shaking.parts.some((p) => p.chord === 'E/G#' && p.text.includes('shaking'))).toBe(true);
      expect(shaking.parts.map((p) => p.text).join(' ')).toMatch(/heaviness/);
    }
    const tag = lyrics.find((b) => b.type === 'lyric' && b.parts.some((p) => p.chord === '(B/D#)'));
    expect(tag?.type).toBe('lyric');
    if (tag?.type === 'lyric') {
      expect(tag.parts.some((p) => p.chord === '(B/D#)' && p.text.includes('free'))).toBe(true);
    }
  });
});
