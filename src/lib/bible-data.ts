// Contains Bible book data and the preset custom reading list.

export interface BookMeta {
  chapters: number;
  order: number;
  shortNames?: string[];
  /** Compact English label (e.g. Gen, 1Sa). */
  abbr: string;
  /** Compact Korean label (e.g. 창, 삼상). */
  koAbbr: string;
  /** Full Korean book name (e.g. 창세기). */
  koFull: string;
  fullName: string;
}

export const BIBLE_BOOKS_DATA: Record<string, BookMeta> = {
  'Genesis': { fullName: 'Genesis', koFull: '창세기', chapters: 50, order: 1, abbr: 'Gen', koAbbr: '창', shortNames: ['Gen', 'Ge'] },
  'Exodus': { fullName: 'Exodus', koFull: '출애굽기', chapters: 40, order: 2, abbr: 'Exo', koAbbr: '출', shortNames: ['Exo', 'Ex'] },
  'Leviticus': { fullName: 'Leviticus', koFull: '레위기', chapters: 27, order: 3, abbr: 'Lev', koAbbr: '레', shortNames: ['Lev', 'Le'] },
  'Numbers': { fullName: 'Numbers', koFull: '민수기', chapters: 36, order: 4, abbr: 'Num', koAbbr: '민', shortNames: ['Num', 'Nu'] },
  'Deuteronomy': { fullName: 'Deuteronomy', koFull: '신명기', chapters: 34, order: 5, abbr: 'Deut', koAbbr: '신', shortNames: ['Deut', 'Dt'] },
  'Joshua': { fullName: 'Joshua', koFull: '여호수아', chapters: 24, order: 6, abbr: 'Josh', koAbbr: '수', shortNames: ['Josh', 'Jos'] },
  'Judges': { fullName: 'Judges', koFull: '사사기', chapters: 21, order: 7, abbr: 'Judg', koAbbr: '삿', shortNames: ['Judg', 'Jdg'] },
  'Ruth': { fullName: 'Ruth', koFull: '룻기', chapters: 4, order: 8, abbr: 'Ruth', koAbbr: '룻', shortNames: ['Ru'] },
  '1 Samuel': { fullName: '1 Samuel', koFull: '사무엘상', chapters: 31, order: 9, abbr: '1Sa', koAbbr: '삼상', shortNames: ['1 Sam', '1 Sa', '1Samuel'] },
  '2 Samuel': { fullName: '2 Samuel', koFull: '사무엘하', chapters: 24, order: 10, abbr: '2Sa', koAbbr: '삼하', shortNames: ['2 Sam', '2 Sa', '2Samuel'] },
  '1 Kings': { fullName: '1 Kings', koFull: '열왕기상', chapters: 22, order: 11, abbr: '1Ki', koAbbr: '왕상', shortNames: ['1 Kgs', '1 Ki', '1Kings'] },
  '2 Kings': { fullName: '2 Kings', koFull: '열왕기하', chapters: 25, order: 12, abbr: '2Ki', koAbbr: '왕하', shortNames: ['2 Kgs', '2 Ki', '2Kings'] },
  '1 Chronicles': { fullName: '1 Chronicles', koFull: '역대상', chapters: 29, order: 13, abbr: '1Ch', koAbbr: '대상', shortNames: ['1 Chron', '1 Ch', '1Chronicles'] },
  '2 Chronicles': { fullName: '2 Chronicles', koFull: '역대하', chapters: 36, order: 14, abbr: '2Ch', koAbbr: '대하', shortNames: ['2 Chron', '2 Ch', '2Chronicles'] },
  'Ezra': { fullName: 'Ezra', koFull: '에스라', chapters: 10, order: 15, abbr: 'Ezra', koAbbr: '스', shortNames: ['Ezr'] },
  'Nehemiah': { fullName: 'Nehemiah', koFull: '느헤미야', chapters: 13, order: 16, abbr: 'Neh', koAbbr: '느', shortNames: ['Neh'] },
  'Esther': { fullName: 'Esther', koFull: '에스더', chapters: 10, order: 17, abbr: 'Esth', koAbbr: '에', shortNames: ['Esth', 'Es'] },
  'Job': { fullName: 'Job', koFull: '욥기', chapters: 42, order: 18, abbr: 'Job', koAbbr: '욥' },
  'Psalms': { fullName: 'Psalms', koFull: '시편', chapters: 150, order: 19, abbr: 'Ps', koAbbr: '시', shortNames: ['Ps', 'Psa', 'Psalm'] },
  'Proverbs': { fullName: 'Proverbs', koFull: '잠언', chapters: 31, order: 20, abbr: 'Prov', koAbbr: '잠', shortNames: ['Prov', 'Pr'] },
  'Ecclesiastes': { fullName: 'Ecclesiastes', koFull: '전도서', chapters: 12, order: 21, abbr: 'Eccl', koAbbr: '전', shortNames: ['Eccles', 'Ecc', 'Eccl'] },
  'Song of Solomon': { fullName: 'Song of Solomon', koFull: '아가', chapters: 8, order: 22, abbr: 'Song', koAbbr: '아', shortNames: ['Song', 'SS', 'SOS', 'Song of Songs'] },
  'Isaiah': { fullName: 'Isaiah', koFull: '이사야', chapters: 66, order: 23, abbr: 'Isa', koAbbr: '사', shortNames: ['Isa', 'Is'] },
  'Jeremiah': { fullName: 'Jeremiah', koFull: '예레미야', chapters: 52, order: 24, abbr: 'Jer', koAbbr: '렘', shortNames: ['Jer', 'Je'] },
  'Lamentations': { fullName: 'Lamentations', koFull: '예레미야애가', chapters: 5, order: 25, abbr: 'Lam', koAbbr: '애', shortNames: ['Lam', 'La'] },
  'Ezekiel': { fullName: 'Ezekiel', koFull: '에스겔', chapters: 48, order: 26, abbr: 'Ezek', koAbbr: '겔', shortNames: ['Ezek', 'Eze'] },
  'Daniel': { fullName: 'Daniel', koFull: '다니엘', chapters: 12, order: 27, abbr: 'Dan', koAbbr: '단', shortNames: ['Dan', 'Da'] },
  'Hosea': { fullName: 'Hosea', koFull: '호세아', chapters: 14, order: 28, abbr: 'Hos', koAbbr: '호', shortNames: ['Hos'] },
  'Joel': { fullName: 'Joel', koFull: '요엘', chapters: 3, order: 29, abbr: 'Joel', koAbbr: '욜', shortNames: ['Joe'] },
  'Amos': { fullName: 'Amos', koFull: '아모스', chapters: 9, order: 30, abbr: 'Amos', koAbbr: '암' },
  'Obadiah': { fullName: 'Obadiah', koFull: '오바댜', chapters: 1, order: 31, abbr: 'Obad', koAbbr: '옵', shortNames: ['Obad', 'Ob'] },
  'Jonah': { fullName: 'Jonah', koFull: '요나', chapters: 4, order: 32, abbr: 'Jonah', koAbbr: '욘', shortNames: ['Jon'] },
  'Micah': { fullName: 'Micah', koFull: '미가', chapters: 7, order: 33, abbr: 'Mic', koAbbr: '미', shortNames: ['Mic'] },
  'Nahum': { fullName: 'Nahum', koFull: '나훔', chapters: 3, order: 34, abbr: 'Nah', koAbbr: '나', shortNames: ['Nah', 'Na'] },
  'Habakkuk': { fullName: 'Habakkuk', koFull: '하박국', chapters: 3, order: 35, abbr: 'Hab', koAbbr: '합', shortNames: ['Hab'] },
  'Zephaniah': { fullName: 'Zephaniah', koFull: '스바냐', chapters: 3, order: 36, abbr: 'Zeph', koAbbr: '습', shortNames: ['Zeph', 'Zep'] },
  'Haggai': { fullName: 'Haggai', koFull: '학개', chapters: 2, order: 37, abbr: 'Hag', koAbbr: '학', shortNames: ['Hag'] },
  'Zechariah': { fullName: 'Zechariah', koFull: '스가랴', chapters: 14, order: 38, abbr: 'Zech', koAbbr: '슥', shortNames: ['Zech', 'Zec'] },
  'Malachi': { fullName: 'Malachi', koFull: '말라기', chapters: 4, order: 39, abbr: 'Mal', koAbbr: '말', shortNames: ['Mal'] },
  'Matthew': { fullName: 'Matthew', koFull: '마태복음', chapters: 28, order: 40, abbr: 'Matt', koAbbr: '마', shortNames: ['Matt', 'Mt'] },
  'Mark': { fullName: 'Mark', koFull: '마가복음', chapters: 16, order: 41, abbr: 'Mark', koAbbr: '막', shortNames: ['Mark', 'Mk'] },
  'Luke': { fullName: 'Luke', koFull: '누가복음', chapters: 24, order: 42, abbr: 'Luke', koAbbr: '눅', shortNames: ['Luk', 'Lk'] },
  'John': { fullName: 'John', koFull: '요한복음', chapters: 21, order: 43, abbr: 'John', koAbbr: '요', shortNames: ['Joh', 'Jn'] },
  'Acts': { fullName: 'Acts', koFull: '사도행전', chapters: 28, order: 44, abbr: 'Acts', koAbbr: '행', shortNames: ['Ac'] },
  'Romans': { fullName: 'Romans', koFull: '로마서', chapters: 16, order: 45, abbr: 'Rom', koAbbr: '롬', shortNames: ['Rom'] },
  '1 Corinthians': { fullName: '1 Corinthians', koFull: '고린도전서', chapters: 16, order: 46, abbr: '1Cor', koAbbr: '고전', shortNames: ['1 Cor', '1 Co', '1Corinthians'] },
  '2 Corinthians': { fullName: '2 Corinthians', koFull: '고린도후서', chapters: 13, order: 47, abbr: '2Cor', koAbbr: '고후', shortNames: ['2 Cor', '2 Co', '2Corinthians'] },
  'Galatians': { fullName: 'Galatians', koFull: '갈라디아서', chapters: 6, order: 48, abbr: 'Gal', koAbbr: '갈', shortNames: ['Gal'] },
  'Ephesians': { fullName: 'Ephesians', koFull: '에베소서', chapters: 6, order: 49, abbr: 'Eph', koAbbr: '엡', shortNames: ['Eph'] },
  'Philippians': { fullName: 'Philippians', koFull: '빌립보서', chapters: 4, order: 50, abbr: 'Phil', koAbbr: '빌', shortNames: ['Phil', 'Php'] },
  'Colossians': { fullName: 'Colossians', koFull: '골로새서', chapters: 4, order: 51, abbr: 'Col', koAbbr: '골', shortNames: ['Col'] },
  '1 Thessalonians': { fullName: '1 Thessalonians', koFull: '데살로니가전서', chapters: 5, order: 52, abbr: '1Th', koAbbr: '살전', shortNames: ['1 Thess', '1 Th', '1Thessalonians'] },
  '2 Thessalonians': { fullName: '2 Thessalonians', koFull: '데살로니가후서', chapters: 3, order: 53, abbr: '2Th', koAbbr: '살후', shortNames: ['2 Thess', '2 Th', '2Thessalonians'] },
  '1 Timothy': { fullName: '1 Timothy', koFull: '디모데전서', chapters: 6, order: 54, abbr: '1Tim', koAbbr: '딤전', shortNames: ['1 Tim', '1 Ti', '1Timothy'] },
  '2 Timothy': { fullName: '2 Timothy', koFull: '디모데후서', chapters: 4, order: 55, abbr: '2Tim', koAbbr: '딤후', shortNames: ['2 Tim', '2 Ti', '2Timothy'] },
  'Titus': { fullName: 'Titus', koFull: '디도서', chapters: 3, order: 56, abbr: 'Tit', koAbbr: '딛', shortNames: ['Tit'] },
  'Philemon': { fullName: 'Philemon', koFull: '빌레몬서', chapters: 1, order: 57, abbr: 'Phlm', koAbbr: '몬', shortNames: ['Philem', 'Phm'] },
  'Hebrews': { fullName: 'Hebrews', koFull: '히브리서', chapters: 13, order: 58, abbr: 'Heb', koAbbr: '히', shortNames: ['Heb'] },
  'James': { fullName: 'James', koFull: '야고보서', chapters: 5, order: 59, abbr: 'Jas', koAbbr: '약', shortNames: ['Jas'] },
  '1 Peter': { fullName: '1 Peter', koFull: '베드로전서', chapters: 5, order: 60, abbr: '1Pet', koAbbr: '벧전', shortNames: ['1 Pet', '1 Pe', '1Peter'] },
  '2 Peter': { fullName: '2 Peter', koFull: '베드로후서', chapters: 3, order: 61, abbr: '2Pet', koAbbr: '벧후', shortNames: ['2 Pet', '2 Pe', '2Peter'] },
  '1 John': { fullName: '1 John', koFull: '요한1서', chapters: 5, order: 62, abbr: '1Jn', koAbbr: '요일', shortNames: ['1 Jn', '1John'] },
  '2 John': { fullName: '2 John', koFull: '요한2서', chapters: 1, order: 63, abbr: '2Jn', koAbbr: '요이', shortNames: ['2 Jn', '2John'] },
  '3 John': { fullName: '3 John', koFull: '요한3서', chapters: 1, order: 64, abbr: '3Jn', koAbbr: '요삼', shortNames: ['3 Jn', '3John'] },
  'Jude': { fullName: 'Jude', koFull: '유다서', chapters: 1, order: 65, abbr: 'Jude', koAbbr: '유' },
  'Revelation': { fullName: 'Revelation', koFull: '요한계시록', chapters: 22, order: 66, abbr: 'Rev', koAbbr: '계', shortNames: ['Rev', 'Re', 'The Revelation'] },
};

/** Compact book label — Korean abbr when reading KRV. */
export function bibleBookAbbr(bookName: string, korean: boolean): string {
  const meta = BIBLE_BOOKS_DATA[bookName];
  if (!meta) return bookName;
  return korean ? meta.koAbbr : meta.abbr;
}

/** Full book label for pickers — Korean full name when reading KRV. */
export function bibleBookLabel(bookName: string, korean: boolean): string {
  const meta = BIBLE_BOOKS_DATA[bookName];
  if (!meta) return bookName;
  return korean ? meta.koFull : meta.fullName;
}

export function bibleTestamentLabel(testament: 'ot' | 'nt', korean: boolean): string {
  if (korean) return testament === 'ot' ? '구약' : '신약';
  return testament === 'ot' ? 'Old Testament' : 'New Testament';
}

export const CANONICAL_BIBLE_ORDER = Object.values(BIBLE_BOOKS_DATA)
  .sort((a, b) => a.order - b.order)
  .map(book => book.fullName);


export const PRESET_CUSTOM_ORDER_STRINGS: string[] = [
  "Genesis 1-50", "Exodus 1-40", "Leviticus 1-27", "Numbers 1-36", "Deuteronomy 1-34",
  "Joshua 1-24", "Judges 1-21", "Ruth 1-4", "1 Samuel 1-31", "2 Samuel 1-24",
  "1 Kings 1-22", "2 Kings 1-13", "Jonah 1-4", "2 Kings 14", "Amos 1-9",
  "Hosea 1-14", "Joel 1-3", "2 Kings 15-16", "Micah 1-7", "Isaiah 1-66",
  "Nahum 1-3", "Obadiah 1", "2 Kings 17-23", "Habakkuk 1-3", "Zephaniah 1-3",
  "Jeremiah 1-52", "2 Kings 24-25", "Lamentations 1-5", "Daniel 1-12", "Ezekiel 1-48",
  "Ezra 1-4", "Haggai 1-2", "Zechariah 1-14", "Ezra 5-6", "Esther 1-10",
  "1 Chronicles 1-29", "2 Chronicles 1-36", "Ezra 7-10", "Nehemiah 1-13",
  "Job 1-42", "Psalms 1-150", "Proverbs 1-31", "Ecclesiastes 1-12", "Song of Solomon 1-8",
  "Malachi 1-4",
  "Matthew 1-28", "Mark 1-16", "Luke 1-24",
  "John 1-21", "Acts 1-18(:11)", "1 Thessalonians 1-5", "2 Thessalonians 1-3",
  "Galatians 1-6", "Acts 18(:12)-19(:20)", "1 Corinthians 1-16", "2 Corinthians 1-13",
  "Acts 19(:21)-20(:3)", "Romans 1-16", "Acts 20(:4)-28", "Ephesians 1-6",
  "Colossians 1-4", "Philemon 1", "Philippians 1-4", "1 Timothy 1-6", "Titus 1-3",
  "2 Timothy 1-4", "Hebrews 1-13", "James 1-5", "1 Peter 1-5", "2 Peter 1-3",
  "1 John 1-5", "2 John 1", "3 John 1", "Jude 1", "Revelation 1-22"
];

export const BOOK_NAME_LOOKUP_MAP: Map<string, string> = new Map();
Object.values(BIBLE_BOOKS_DATA).forEach(bookMeta => {
    BOOK_NAME_LOOKUP_MAP.set(bookMeta.fullName.toLowerCase(), bookMeta.fullName);
    bookMeta.shortNames?.forEach(sn => {
        BOOK_NAME_LOOKUP_MAP.set(sn.toLowerCase(), bookMeta.fullName);
        BOOK_NAME_LOOKUP_MAP.set(sn.toLowerCase().replace(/\s+/g, ''), bookMeta.fullName); // e.g. "1sam"
    });
    BOOK_NAME_LOOKUP_MAP.set(bookMeta.abbr.toLowerCase(), bookMeta.fullName);
    BOOK_NAME_LOOKUP_MAP.set(bookMeta.koAbbr, bookMeta.fullName);
    BOOK_NAME_LOOKUP_MAP.set(bookMeta.koFull, bookMeta.fullName);
    BOOK_NAME_LOOKUP_MAP.set(bookMeta.fullName.toLowerCase().replace(/\s+/g, ''), bookMeta.fullName); // e.g. "1kings"
});
BOOK_NAME_LOOKUP_MAP.set("song of songs", "Song of Solomon"); // Alias
