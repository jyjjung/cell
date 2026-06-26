
import type { AvatarData } from '@/types';

// Skin Tones - Ordered Light to Dark
export const SKIN_TONES = [
  '#FFDBAC', '#F1C27D', '#E0AC69', '#E0A376', '#C68642', 
  '#8D5524', '#795548', '#61381A', '#3C1E0E', '#373028'
];

// Hair Colors - Grouped by natural tones then expressive
export const HAIR_COLORS = [
  '#1C1C1C', '#342319', '#3E2723', '#4E2C00', '#573B2A', 
  '#6D4C41', '#795548', '#8E5A3D', '#A56B46', '#D19A66', 
  '#FFD692', '#F5D3A9', '#BDBDBD', '#C75A7E', '#F0A1C1'
];
export const FACIAL_HAIR_COLORS = HAIR_COLORS;

// Outfit Colors - Spectral order
export const OUTFIT_COLORS = [
  '#FFFFFF', '#F3F4F6', '#D1D5DB', '#4B5563', '#1F2937', 
  '#342319', '#D95763', '#E91E63', '#F5A623', '#FFEB3B', 
  '#8BC34A', '#7ED321', '#4CAF50', '#3A8D5B', '#009688', 
  '#00BCD4', '#2196F3', '#4A90E2', '#3F51B5', '#673AB7', '#9C27B0'
];

export const ACCESSORY_COLORS = ['#222222', '#5A6978', '#FFFFFF', '#D95763', '#F5A623', '#FFEB3B', '#4A90E2'];

export { BACKGROUNDS } from '@/lib/avatar-backgrounds';

export const DEFAULT_AVATAR_DATA: Required<AvatarData> = {
    mode: 'custom',
    seed: 'spark',
    skinTone: '#E0A376',
    hairStyle: 'short',
    hairColor: '#342319',
    outfit: 'tshirt',
    accessory: 'none',
    outfitColor: '#D95763',
    accessoryColor: '#222222',
    mouth: 'smile',
    facialHair: 'none',
    facialHairColor: '#342319',
    backgroundColor: 'blue-gradient',
    initials: '',
    imageUrl: '',
    cosmeticTier: 'none',
};


// Hair Styles
export const HAIR_STYLES: { [key: string]: { paths: string[] } } = {
  none: { paths: [] },
  short: {
    paths: [
      'M7 5H17V6H7V5Z',
      'M6 6H7V7H6V6Z',
      'M17 6H18V7H17V6Z',
      'M7 7H17V8H7V7Z',
    ],
  },
  long: {
    paths: [
      'M7 5H17V6H7V5Z', // Top
      'M6 6H7V9H6V6Z', // Left sideburn
      'M17 6H18V9H17V6Z', // Right sideburn
      'M7 7H17V8H7V7Z', // Fringe
      'M6 9H8V15H6V9Z', // Long left side
      'M16 9H18V15H16V9Z', // Long right side
      'M8 15H16V16H8V15Z', // Bottom edge
    ],
  },
  sidepart: {
    paths: [
        'M7 5H10V7H7V5Z',
        'M11 5H17V7H11V5Z',
        'M6 7H7V8H6V7Z',
        'M17 7H18V8H17V7Z',
        'M10 7H11V8H10V7Z',
    ]
  },
  bun: {
    paths: [
        'M10 2H14V3H10V2Z',
        'M11 1H13V2H11V1Z',
        'M7 5H17V7H7V5Z',
        'M6 6H7V8H6V6Z',
        'M17 6H18V8H17V6Z',
    ]
  },
  spiky: {
    paths: [
      "M7 4H8V5H7V4Z",
      "M9 3H10V4H9V3Z",
      "M11 4H12V5H11V4Z",
      "M13 3H14V4H13V3Z",
      "M15 4H16V5H15V4Z",
      "M7 5H17V7H7V5Z",
      "M6 7H7V8H6V7Z",
      "M17 7H18V8H17V7Z",
    ]
  },
  afro: {
    paths: [
        "M8 2H16V3H8V2Z",
        "M7 3H17V4H7V3Z",
        "M6 4H18V7H6V4Z",
        "M7 7H17V8H7V7Z"
    ]
  },
  bowl: {
    paths: [
        "M7 5H17V6H7V5Z",
        "M6 6H18V9H6V6Z",
        "M6 9H7V10H6V9Z",
        "M17 9H18V10H17V9Z"
    ]
  }
};

export const MOUTHS: { [key: string]: { paths: string[] } } = {
    smile: {
        paths: [ 'M10 13H14V14H10V13Z', 'M9 12H10V13H9V12Z', 'M14 12H15V13H14V12Z']
    },
    neutral: {
        paths: ['M10 13H14V14H10V13Z']
    },
    none: { paths: [] },
};

export const FACIAL_HAIR_STYLES: { [key: string]: { paths: string[] } } = {
    none: { paths: [] },
    mustache: {
        paths: [ 'M9 12H15V13H9V12Z' ]
    },
    goatee: {
        paths: [ 'M10 14H14V16H10V14Z', 'M9 15H10V16H9V15Z', 'M14 15H15V16H14V15Z' ]
    },
    beard: {
        paths: [ 'M7 13H17V16H7V13Z', 'M8 12H9V13H8V12Z', 'M15 12H16V13H15V12Z' ]
    }
};

// Outfits
export const OUTFITS: { [key: string]: { paths: string[] } } = {
  tshirt: {
    paths: [
      'M10 17H14V20H10V17Z',
      'M8 17H10V18H8V17Z',
      'M14 17H16V18H14V17Z',
    ],
  },
  hoodie: {
    paths: [
      'M7 16H17V20H7V16Z',
      'M9 15H15V16H9V15Z',
      'M8 14H16V15H8V14Z',
    ],
  },
   singlet: {
    paths: [
      'M10 17H14V20H10V17Z',
      'M9 17H10V18H9V17Z',
      'M14 17H15V18H14V17Z',
    ],
  },
  suit: {
    paths: [
        "M9 16H15V20H9V16Z",
        "M8 16H9V18H8V16Z",
        "M15 16H16V18H15V16Z",
        "M11 16H13V20H11V16Z"
    ]
  }
};

// Accessories
export const ACCESSORIES: { [key: string]: { paths: string[] } } = {
  none: { paths: [] },
  glasses: {
    paths: [
      'M8 9H12V10H8V9Z',
      'M12 9H16V10H12V9Z',
      'M7 10H8V11H7V10Z',
      'M16 10H17V11H16V10Z',
    ],
  },
  sunglasses: {
    paths: [
      'M8 9H16V11H8V9Z',
      'M7 9H8V10H7V9Z',
      'M16 9H17V10H16V9Z',
    ],
  },
  headband: {
    paths: [
      'M7 5H17V6H7V5Z',
    ],
  },
  beanie: {
      paths: [
          'M6 3H18V7H6V3Z', 'M6 7H18V8H6V7Z'
      ]
  }
};
