// Level configuration for Gradient Puzzle game

export interface LevelConfig {
  id: string;
  name: string;
  description?: string;
  cols: number;
  rows: number;
  // 4-corner gradient colors for bilinear interpolation
  colors: {
    topLeft: string;
    topRight: string;
    bottomLeft: string;
    bottomRight: string;
  };
  anchors: number[];
  tileShape: 'square' | 'hexagon' | 'circle';
  gap?: number;
}

export interface LevelPack {
  id: string;
  name: string;
  description: string;
  levels: LevelConfig[];
}

// Level packs with 4-corner gradients
export const LEVEL_PACKS: LevelPack[] = [
  {
    id: 'tutorial',
    name: 'Обучение',
    description: 'Простые уровни для знакомства с игрой',
    levels: [
      {
        id: 'tutorial-1',
        name: 'Первые шаги',
        cols: 3,
        rows: 3,
        colors: {
          topLeft: '#cc952e',
          topRight: '#db4734',
          bottomLeft: '#f1660f',
          bottomRight: '#e74c3c',
        },
        anchors: [0, 2, 4, 6, 8],
        tileShape: 'square',
      },
      {
        id: 'tutorial-2',
        name: 'Рассвет',
        cols: 4,
        rows: 3,
        colors: {
          topLeft: '#1a1a2e',
          topRight: '#4a1942',
          bottomLeft: '#f39c12',
          bottomRight: '#e74c3c',
        },
        anchors: [0, 3, 8, 11],
        tileShape: 'square',
      },
      {
        id: 'tutorial-3',
        name: 'Океан',
        cols: 4,
        rows: 4,
        colors: {
          topLeft: '#0c2461',
          topRight: '#1e3799',
          bottomLeft: '#0a3d62',
          bottomRight: '#82ccdd',
        },
        anchors: [0, 3, 12, 15],
        tileShape: 'square',
      },
    ],
  },
  {
    id: 'forest',
    name: 'Лесные тона',
    description: 'Оттенки зеленого и коричневого',
    levels: [
      {
        id: 'forest-1',
        name: 'Листва',
        cols: 4,
        rows: 4,
        colors: {
          topLeft: '#1e8449',
          topRight: '#58d68d',
          bottomLeft: '#145a32',
          bottomRight: '#82e0aa',
        },
        anchors: [0, 3, 12, 15],
        tileShape: 'square',
      },
      {
        id: 'forest-2',
        name: 'Мох',
        cols: 5,
        rows: 4,
        colors: {
          topLeft: '#0b5345',
          topRight: '#1e8449',
          bottomLeft: '#104728',
          bottomRight: '#abebc6',
        },
        anchors: [0, 4, 15, 19],
        tileShape: 'square',
      },
      {
        id: 'forest-3',
        name: 'Папоротник',
        cols: 5,
        rows: 5,
        colors: {
          topLeft: '#0b3d0b',
          topRight: '#27ae60',
          bottomLeft: '#1d8348',
          bottomRight: '#d5f5e3',
        },
        anchors: [0, 4, 12, 20, 24],
        tileShape: 'square',
      },
      {
        id: 'forest-4',
        name: 'Древний лес',
        cols: 6,
        rows: 5,
        colors: {
          topLeft: '#0a2f0a',
          topRight: '#196f3d',
          bottomLeft: '#145a32',
          bottomRight: '#7dcea0',
        },
        anchors: [0, 5, 14, 15, 24, 29],
        tileShape: 'square',
      },
    ],
  },
  {
    id: 'sunset',
    name: 'Закат',
    description: 'Теплые оттенки заката',
    levels: [
      {
        id: 'sunset-1',
        name: 'Сумерки',
        cols: 4,
        rows: 4,
        colors: {
          topLeft: '#1a1a2e',
          topRight: '#4a235a',
          bottomLeft: '#f39c12',
          bottomRight: '#e74c3c',
        },
        anchors: [0, 3, 12, 15],
        tileShape: 'square',
      },
      {
        id: 'sunset-2',
        name: 'Горизонт',
        cols: 5,
        rows: 4,
        colors: {
          topLeft: '#2c3e50',
          topRight: '#8e44ad',
          bottomLeft: '#f1c40f',
          bottomRight: '#e67e22',
        },
        anchors: [0, 4, 15, 19],
        tileShape: 'square',
      },
      {
        id: 'sunset-3',
        name: 'Пламя',
        cols: 5,
        rows: 5,
        colors: {
          topLeft: '#7b241c',
          topRight: '#c0392b',
          bottomLeft: '#f39c12',
          bottomRight: '#f7dc6f',
        },
        anchors: [0, 4, 12, 20, 24],
        tileShape: 'square',
      },
      {
        id: 'sunset-4',
        name: 'Магма',
        cols: 6,
        rows: 5,
        colors: {
          topLeft: '#1a0a0a',
          topRight: '#641e16',
          bottomLeft: '#c0392b',
          bottomRight: '#f5b041',
        },
        anchors: [0, 5, 14, 15, 24, 29],
        tileShape: 'circle',
      },
    ],
  },
  {
    id: 'ocean',
    name: 'Океан',
    description: 'Голубые и бирюзовые оттенки',
    levels: [
      {
        id: 'ocean-1',
        name: 'Лагуна',
        cols: 4,
        rows: 4,
        colors: {
          topLeft: '#1b4f72',
          topRight: '#2e86ab',
          bottomLeft: '#117a65',
          bottomRight: '#76d7c4',
        },
        anchors: [0, 3, 12, 15],
        tileShape: 'square',
      },
      {
        id: 'ocean-2',
        name: 'Глубина',
        cols: 5,
        rows: 4,
        colors: {
          topLeft: '#0a1628',
          topRight: '#1a5276',
          bottomLeft: '#154360',
          bottomRight: '#85c1e9',
        },
        anchors: [0, 4, 15, 19],
        tileShape: 'square',
      },
      {
        id: 'ocean-3',
        name: 'Коралл',
        cols: 5,
        rows: 5,
        colors: {
          topLeft: '#0e6655',
          topRight: '#148f77',
          bottomLeft: '#1abc9c',
          bottomRight: '#a3e4d7',
        },
        anchors: [0, 4, 12, 20, 24],
        tileShape: 'circle',
      },
      {
        id: 'ocean-4',
        name: 'Атлантида',
        cols: 6,
        rows: 6,
        colors: {
          topLeft: '#0a192f',
          topRight: '#172a45',
          bottomLeft: '#2980b9',
          bottomRight: '#a9cce3',
        },
        anchors: [0, 5, 17, 18, 30, 35],
        tileShape: 'square',
      },
    ],
  },
  {
    id: 'lavender',
    name: 'Лаванда',
    description: 'Фиолетовые и розовые оттенки',
    levels: [
      {
        id: 'lavender-1',
        name: 'Утро',
        cols: 4,
        rows: 4,
        colors: {
          topLeft: '#4a235a',
          topRight: '#7d3c98',
          bottomLeft: '#a569bd',
          bottomRight: '#e8daef',
        },
        anchors: [0, 3, 12, 15],
        tileShape: 'square',
      },
      {
        id: 'lavender-2',
        name: 'Поле',
        cols: 5,
        rows: 4,
        colors: {
          topLeft: '#2e1a47',
          topRight: '#6c3483',
          bottomLeft: '#8e44ad',
          bottomRight: '#d7bde2',
        },
        anchors: [0, 4, 15, 19],
        tileShape: 'square',
      },
      {
        id: 'lavender-3',
        name: 'Аметист',
        cols: 5,
        rows: 5,
        colors: {
          topLeft: '#1a0a2e',
          topRight: '#512e5f',
          bottomLeft: '#76448a',
          bottomRight: '#f5eef8',
        },
        anchors: [0, 4, 12, 20, 24],
        tileShape: 'hexagon',
      },
      {
        id: 'lavender-4',
        name: 'Космос',
        cols: 6,
        rows: 6,
        colors: {
          topLeft: '#0a0a1a',
          topRight: '#2c0a37',
          bottomLeft: '#4a235a',
          bottomRight: '#bb8fce',
        },
        anchors: [0, 5, 17, 18, 30, 35],
        tileShape: 'circle',
      },
    ],
  },
  {
    id: 'advanced',
    name: 'Продвинутые',
    description: 'Сложные уровни для экспертов',
    levels: [
      {
        id: 'advanced-1',
        name: 'Радуга',
        cols: 6,
        rows: 5,
        colors: {
          topLeft: '#e74c3c',
          topRight: '#9b59b6',
          bottomLeft: '#f1c40f',
          bottomRight: '#3498db',
        },
        anchors: [0, 5, 24, 29],
        tileShape: 'square',
      },
      {
        id: 'advanced-2',
        name: 'Северное сияние',
        cols: 6,
        rows: 6,
        colors: {
          topLeft: '#0a3d0a',
          topRight: '#1abc9c',
          bottomLeft: '#2c3e50',
          bottomRight: '#9b59b6',
        },
        anchors: [0, 5, 17, 18, 30, 35],
        tileShape: 'square',
      },
      {
        id: 'advanced-3',
        name: 'Галактика',
        cols: 7,
        rows: 6,
        colors: {
          topLeft: '#0a0a14',
          topRight: '#1a1a3e',
          bottomLeft: '#4a235a',
          bottomRight: '#f39c12',
        },
        anchors: [0, 6, 20, 21, 35, 41],
        tileShape: 'circle',
      },
      {
        id: 'advanced-4',
        name: 'Мастер',
        cols: 7,
        rows: 7,
        colors: {
          topLeft: '#1a2a3a',
          topRight: '#3a5a7a',
          bottomLeft: '#5a3a1a',
          bottomRight: '#9a7a5a',
        },
        anchors: [0, 6, 24, 42, 48],
        tileShape: 'square',
      },
    ],
  },
];

// Flatten all levels for easy access
export const ALL_LEVELS: LevelConfig[] = LEVEL_PACKS.flatMap(pack => pack.levels);

// Get level by ID
export const getLevelById = (id: string): LevelConfig | undefined => {
  return ALL_LEVELS.find(level => level.id === id);
};

// Get pack by level ID
export const getPackByLevelId = (levelId: string): LevelPack | undefined => {
  return LEVEL_PACKS.find(pack => pack.levels.some(level => level.id === levelId));
};

// Get next level
export const getNextLevel = (currentLevelId: string): LevelConfig | undefined => {
  const currentIndex = ALL_LEVELS.findIndex(level => level.id === currentLevelId);
  if (currentIndex === -1 || currentIndex === ALL_LEVELS.length - 1) return undefined;
  return ALL_LEVELS[currentIndex + 1];
};
