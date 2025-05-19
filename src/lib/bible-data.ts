
// Contains Bible book data and the preset custom reading list.

export interface BookMeta {
  chapters: number;
  order: number;
  shortNames?: string[];
  fullName: string;
}

export const BIBLE_BOOKS_DATA: Record<string, BookMeta> = {
  'Genesis': { fullName: 'Genesis', chapters: 50, order: 1, shortNames: ['Gen', 'Ge'] },
  'Exodus': { fullName: 'Exodus', chapters: 40, order: 2, shortNames: ['Exo', 'Ex'] },
  'Leviticus': { fullName: 'Leviticus', chapters: 27, order: 3, shortNames: ['Lev', 'Le'] },
  'Numbers': { fullName: 'Numbers', chapters: 36, order: 4, shortNames: ['Num', 'Nu'] },
  'Deuteronomy': { fullName: 'Deuteronomy', chapters: 34, order: 5, shortNames: ['Deut', 'Dt'] },
  'Joshua': { fullName: 'Joshua', chapters: 24, order: 6, shortNames: ['Josh', 'Jos'] },
  'Judges': { fullName: 'Judges', chapters: 21, order: 7, shortNames: ['Judg', 'Jdg'] },
  'Ruth': { fullName: 'Ruth', chapters: 4, order: 8, shortNames: ['Ru'] },
  '1 Samuel': { fullName: '1 Samuel', chapters: 31, order: 9, shortNames: ['1 Sam', '1 Sa', '1Samuel'] },
  '2 Samuel': { fullName: '2 Samuel', chapters: 24, order: 10, shortNames: ['2 Sam', '2 Sa', '2Samuel'] },
  '1 Kings': { fullName: '1 Kings', chapters: 22, order: 11, shortNames: ['1 Kgs', '1 Ki', '1Kings'] },
  '2 Kings': { fullName: '2 Kings', chapters: 25, order: 12, shortNames: ['2 Kgs', '2 Ki', '2Kings'] },
  '1 Chronicles': { fullName: '1 Chronicles', chapters: 29, order: 13, shortNames: ['1 Chron', '1 Ch', '1Chronicles'] },
  '2 Chronicles': { fullName: '2 Chronicles', chapters: 36, order: 14, shortNames: ['2 Chron', '2 Ch', '2Chronicles'] },
  'Ezra': { fullName: 'Ezra', chapters: 10, order: 15, shortNames: ['Ezr'] },
  'Nehemiah': { fullName: 'Nehemiah', chapters: 13, order: 16, shortNames: ['Neh'] },
  'Esther': { fullName: 'Esther', chapters: 10, order: 17, shortNames: ['Esth', 'Es'] },
  'Job': { fullName: 'Job', chapters: 42, order: 18 },
  'Psalms': { fullName: 'Psalms', chapters: 150, order: 19, shortNames: ['Ps', 'Psa', 'Psalm'] },
  'Proverbs': { fullName: 'Proverbs', chapters: 31, order: 20, shortNames: ['Prov', 'Pr'] },
  'Ecclesiastes': { fullName: 'Ecclesiastes', chapters: 12, order: 21, shortNames: ['Eccles', 'Ecc', 'Eccl'] },
  'Song of Solomon': { fullName: 'Song of Solomon', chapters: 8, order: 22, shortNames: ['Song', 'SS', 'SOS', 'Song of Songs'] },
  'Isaiah': { fullName: 'Isaiah', chapters: 66, order: 23, shortNames: ['Isa', 'Is'] },
  'Jeremiah': { fullName: 'Jeremiah', chapters: 52, order: 24, shortNames: ['Jer', 'Je'] },
  'Lamentations': { fullName: 'Lamentations', chapters: 5, order: 25, shortNames: ['Lam', 'La'] },
  'Ezekiel': { fullName: 'Ezekiel', chapters: 48, order: 26, shortNames: ['Ezek', 'Eze'] },
  'Daniel': { fullName: 'Daniel', chapters: 12, order: 27, shortNames: ['Dan', 'Da'] },
  'Hosea': { fullName: 'Hosea', chapters: 14, order: 28, shortNames: ['Hos'] },
  'Joel': { fullName: 'Joel', chapters: 3, order: 29, shortNames: ['Joe'] },
  'Amos': { fullName: 'Amos', chapters: 9, order: 30 },
  'Obadiah': { fullName: 'Obadiah', chapters: 1, order: 31, shortNames: ['Obad', 'Ob'] },
  'Jonah': { fullName: 'Jonah', chapters: 4, order: 32, shortNames: ['Jon'] },
  'Micah': { fullName: 'Micah', chapters: 7, order: 33, shortNames: ['Mic'] },
  'Nahum': { fullName: 'Nahum', chapters: 3, order: 34, shortNames: ['Nah', 'Na'] },
  'Habakkuk': { fullName: 'Habakkuk', chapters: 3, order: 35, shortNames: ['Hab'] },
  'Zephaniah': { fullName: 'Zephaniah', chapters: 3, order: 36, shortNames: ['Zeph', 'Zep'] },
  'Haggai': { fullName: 'Haggai', chapters: 2, order: 37, shortNames: ['Hag'] },
  'Zechariah': { fullName: 'Zechariah', chapters: 14, order: 38, shortNames: ['Zech', 'Zec'] },
  'Malachi': { fullName: 'Malachi', chapters: 4, order: 39, shortNames: ['Mal'] },
  'Matthew': { fullName: 'Matthew', chapters: 28, order: 40, shortNames: ['Matt', 'Mt'] },
  'Mark': { fullName: 'Mark', chapters: 16, order: 41, shortNames: ['Mark', 'Mk'] },
  'Luke': { fullName: 'Luke', chapters: 24, order: 42, shortNames: ['Luk', 'Lk'] },
  'John': { fullName: 'John', chapters: 21, order: 43, shortNames: ['Joh', 'Jn'] },
  'Acts': { fullName: 'Acts', chapters: 28, order: 44, shortNames: ['Ac'] },
  'Romans': { fullName: 'Romans', chapters: 16, order: 45, shortNames: ['Rom'] },
  '1 Corinthians': { fullName: '1 Corinthians', chapters: 16, order: 46, shortNames: ['1 Cor', '1 Co', '1Corinthians'] },
  '2 Corinthians': { fullName: '2 Corinthians', chapters: 13, order: 47, shortNames: ['2 Cor', '2 Co', '2Corinthians'] },
  'Galatians': { fullName: 'Galatians', chapters: 6, order: 48, shortNames: ['Gal'] },
  'Ephesians': { fullName: 'Ephesians', chapters: 6, order: 49, shortNames: ['Eph'] },
  'Philippians': { fullName: 'Philippians', chapters: 4, order: 50, shortNames: ['Phil', 'Php'] },
  'Colossians': { fullName: 'Colossians', chapters: 4, order: 51, shortNames: ['Col'] },
  '1 Thessalonians': { fullName: '1 Thessalonians', chapters: 5, order: 52, shortNames: ['1 Thess', '1 Th', '1Thessalonians'] },
  '2 Thessalonians': { fullName: '2 Thessalonians', chapters: 3, order: 53, shortNames: ['2 Thess', '2 Th', '2Thessalonians'] },
  '1 Timothy': { fullName: '1 Timothy', chapters: 6, order: 54, shortNames: ['1 Tim', '1 Ti', '1Timothy'] },
  '2 Timothy': { fullName: '2 Timothy', chapters: 4, order: 55, shortNames: ['2 Tim', '2 Ti', '2Timothy'] },
  'Titus': { fullName: 'Titus', chapters: 3, order: 56, shortNames: ['Tit'] },
  'Philemon': { fullName: 'Philemon', chapters: 1, order: 57, shortNames: ['Philem', 'Phm'] },
  'Hebrews': { fullName: 'Hebrews', chapters: 13, order: 58, shortNames: ['Heb'] },
  'James': { fullName: 'James', chapters: 5, order: 59, shortNames: ['Jas'] },
  '1 Peter': { fullName: '1 Peter', chapters: 5, order: 60, shortNames: ['1 Pet', '1 Pe', '1Peter'] },
  '2 Peter': { fullName: '2 Peter', chapters: 3, order: 61, shortNames: ['2 Pet', '2 Pe', '2Peter'] },
  '1 John': { fullName: '1 John', chapters: 5, order: 62, shortNames: ['1 Jn', '1John'] },
  '2 John': { fullName: '2 John', chapters: 1, order: 63, shortNames: ['2 Jn', '2John'] },
  '3 John': { fullName: '3 John', chapters: 1, order: 64, shortNames: ['3 Jn', '3John'] },
  'Jude': { fullName: 'Jude', chapters: 1, order: 65 },
  'Revelation': { fullName: 'Revelation', chapters: 22, order: 66, shortNames: ['Rev', 'Re', 'The Revelation'] }
};

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
  "Matthew 1-28", "Mark 1-16", "Luke 1-24", // User had Luke 1-22, corrected to 24 for data but parser respects original input
  "John 1-21", "Acts 1-18(:11)", "1 Thessalonians 1-5", "2 Thessalonians 1-3",
  "Galatians 1-6", "Acts 18(:12)-19(:20)", "1 Corinthians 1-16", "2 Corinthians 1-13", // Assumed second "1 cor 1-13" was "2 Cor 1-13"
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
    BOOK_NAME_LOOKUP_MAP.set(bookMeta.fullName.toLowerCase().replace(/\s+/g, ''), bookMeta.fullName); // e.g. "1kings"
});
BOOK_NAME_LOOKUP_MAP.set("song of songs", "Song of Solomon"); // Alias

