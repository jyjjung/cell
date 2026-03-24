
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { BIBLE_BOOKS_DATA } from '../bible-data';

export interface BibleVerse {
  number: number;
  text: string;
}

export interface BiblePassage {
  book: string;
  chapter: number;
  version: string;
  verses: BibleVerse[];
}

const BIBLE_DATA_DIR = path.join(process.cwd(), 'src/lib/bible/data');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

export async function getLocalBiblePassage(
  bookName: string,
  chapter: number,
  version: 'korRV' | 'engESV' = 'korRV'
): Promise<BiblePassage | null> {
  try {
    const filePath = path.join(BIBLE_DATA_DIR, `${version}.xml`);
    if (!fs.existsSync(filePath)) {
      console.error(`Bible file not found: ${filePath}`);
      return null;
    }

    const xmlData = fs.readFileSync(filePath, 'utf-8');
    const jsonObj = parser.parse(xmlData);

    // Handle Zefania XML format (used by korRV.xml)
    if (jsonObj.XMLBIBLE) {
      const bible = jsonObj.XMLBIBLE;
      const books = Array.isArray(bible.BIBLEBOOK) ? bible.BIBLEBOOK : [bible.BIBLEBOOK];
      const book = books.find((b: any) => 
        b.bname?.toLowerCase() === bookName.toLowerCase() || 
        b.bsname?.toLowerCase() === bookName.toLowerCase()
      );

      if (!book) return null;

      const chapters = Array.isArray(book.CHAPTER) ? book.CHAPTER : [book.CHAPTER];
      const targetChapter = chapters.find((c: any) => parseInt(c.cnumber) === chapter);

      if (!targetChapter) return null;

      const verses = Array.isArray(targetChapter.VERS) ? targetChapter.VERS : [targetChapter.VERS];
      const parsedVerses: BibleVerse[] = verses.map((v: any) => ({
        number: parseInt(v.vnumber),
        text: v['#text'] || v.toString(),
      }));

      return {
        book: book.bname,
        chapter: chapter,
        version: bible.biblename || version,
        verses: parsedVerses,
      };
    }

    // Handle ESV XML format
    if (jsonObj.bible) {
      const bible = jsonObj.bible;
      const bookMeta = Object.values(BIBLE_BOOKS_DATA).find(
        (b) => b.fullName.toLowerCase() === bookName.toLowerCase() || 
               b.shortNames?.some(sn => sn.toLowerCase() === bookName.toLowerCase())
      );
      
      if (!bookMeta) return null;
      const bookNumber = bookMeta.order;

      // In ESV format, books are usually under testaments
      const testaments = Array.isArray(bible.testament) ? bible.testament : [bible.testament];
      let targetBook: any = null;
      
      for (const testament of testaments) {
        const books = Array.isArray(testament.book) ? testament.book : [testament.book];
        targetBook = books.find((b: any) => parseInt(b.number) === bookNumber);
        if (targetBook) break;
      }

      if (!targetBook) return null;

      const chapters = Array.isArray(targetBook.chapter) ? targetBook.chapter : [targetBook.chapter];
      const targetChapter = chapters.find((c: any) => parseInt(c.number) === chapter);

      if (!targetChapter) return null;

      const verses = Array.isArray(targetChapter.verse) ? targetChapter.verse : [targetChapter.verse];
      const parsedVerses: BibleVerse[] = verses.map((v: any) => {
        let text = '';
        if (typeof v === 'string') {
          text = v;
        } else if (v['#text']) {
          text = String(v['#text']);
        } else if (typeof v === 'object') {
          // If `#text` is absent, sometimes fast-xml-parser returns objects with other keys.
          text = JSON.stringify(v);
        } else {
          text = String(v);
        }
        
        return {
          number: parseInt(String(v.number)) || 0,
          text: text,
        };
      });

      return {
        book: bookMeta.fullName,
        chapter: chapter,
        version: 'English Standard Version',
        verses: parsedVerses,
      };
    }

    return null;
  } catch (error) {
    console.error('Error parsing local Bible XML:', error);
    return null;
  }
}

export function formatPassageToHtml(passage: BiblePassage): string {
  let html = `<div class="bible-passage">`;
  html += `<h2>${passage.book} ${passage.chapter}</h2>`;
  html += `<div class="passage-text">`;
  
  passage.verses.forEach(v => {
    html += `<p><span class="verse-num">${v.number}</span> ${v.text}</p>`;
  });
  
  html += `</div></div>`;
  return html;
}
