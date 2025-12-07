import { LevelConfig, LEVEL_PACKS } from './levels';

export interface Tile {
  id: string;
  color: string;
  correctIndex: number;
  isAnchor: boolean;
}

// Parse hex color to RGB
const parseColor = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
};

// RGB to hex
const toHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
};

// Bilinear interpolation between 4 corner colors
const bilinearInterpolate = (
  topLeft: [number, number, number],
  topRight: [number, number, number],
  bottomLeft: [number, number, number],
  bottomRight: [number, number, number],
  x: number, // 0-1 horizontal position
  y: number  // 0-1 vertical position
): string => {
  // Interpolate top edge
  const topR = topLeft[0] + (topRight[0] - topLeft[0]) * x;
  const topG = topLeft[1] + (topRight[1] - topLeft[1]) * x;
  const topB = topLeft[2] + (topRight[2] - topLeft[2]) * x;

  // Interpolate bottom edge
  const bottomR = bottomLeft[0] + (bottomRight[0] - bottomLeft[0]) * x;
  const bottomG = bottomLeft[1] + (bottomRight[1] - bottomLeft[1]) * x;
  const bottomB = bottomLeft[2] + (bottomRight[2] - bottomLeft[2]) * x;

  // Interpolate between top and bottom
  const r = topR + (bottomR - topR) * y;
  const g = topG + (bottomG - topG) * y;
  const b = topB + (bottomB - topB) * y;

  return toHex(r, g, b);
};

// Generate tiles for a level using 4-corner bilinear interpolation
export const generateTiles = (level: LevelConfig): Tile[] => {
  const total = level.cols * level.rows;
  const tiles: Tile[] = [];

  const topLeft = parseColor(level.colors.topLeft);
  const topRight = parseColor(level.colors.topRight);
  const bottomLeft = parseColor(level.colors.bottomLeft);
  const bottomRight = parseColor(level.colors.bottomRight);

  for (let i = 0; i < total; i++) {
    const row = Math.floor(i / level.cols);
    const col = i % level.cols;

    // Calculate normalized position (0-1)
    const x = level.cols === 1 ? 0 : col / (level.cols - 1);
    const y = level.rows === 1 ? 0 : row / (level.rows - 1);

    const color = bilinearInterpolate(topLeft, topRight, bottomLeft, bottomRight, x, y);

    tiles.push({
      id: `tile-${i}`,
      color,
      correctIndex: i,
      isAnchor: level.anchors.includes(i),
    });
  }

  return tiles;
};

// Fisher-Yates shuffle with anchor support
export const shuffleTiles = (tiles: Tile[]): Tile[] => {
  const result = [...tiles];
  const nonAnchorIndices: number[] = [];

  // Collect non-anchor indices
  for (let i = 0; i < result.length; i++) {
    if (!result[i].isAnchor) {
      nonAnchorIndices.push(i);
    }
  }

  // Shuffle only non-anchor tiles
  for (let i = nonAnchorIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const indexI = nonAnchorIndices[i];
    const indexJ = nonAnchorIndices[j];
    [result[indexI], result[indexJ]] = [result[indexJ], result[indexI]];
  }

  // Ensure the puzzle is not already solved after shuffling
  const isSolved = result.every((tile, index) => tile.correctIndex === index);
  if (isSolved && nonAnchorIndices.length >= 2) {
    // Swap first two non-anchors
    const [i, j] = nonAnchorIndices;
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

// Check if puzzle is solved
export const checkComplete = (tiles: Tile[]): boolean => {
  return tiles.every((tile, index) => tile.correctIndex === index);
};

// Swap two tiles (if neither is anchor)
export const swapTiles = (tiles: Tile[], indexA: number, indexB: number): Tile[] | null => {
  if (tiles[indexA].isAnchor || tiles[indexB].isAnchor) {
    return null;
  }

  const result = [...tiles];
  [result[indexA], result[indexB]] = [result[indexB], result[indexA]];
  return result;
};

// Calculate "correctness" score (0-100) for visual feedback
export const calculateScore = (tiles: Tile[]): number => {
  const correctCount = tiles.filter((tile, index) => tile.correctIndex === index).length;
  return Math.round((correctCount / tiles.length) * 100);
};

// Calculate color distance between two hex colors
const colorDistance = (hex1: string, hex2: string): number => {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  };

  const [r1, g1, b1] = parse(hex1);
  const [r2, g2, b2] = parse(hex2);

  return Math.sqrt((r2 - r1) ** 2 + (g2 - g1) ** 2 + (b2 - b1) ** 2);
};

// Calculate "smoothness" score based on neighbor color similarity
export const calculateSmoothness = (tiles: Tile[], cols: number): number => {
  let totalDistance = 0;
  let comparisons = 0;

  for (let i = 0; i < tiles.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Check right neighbor
    if (col < cols - 1) {
      totalDistance += colorDistance(tiles[i].color, tiles[i + 1].color);
      comparisons++;
    }

    // Check bottom neighbor
    if (row < Math.floor(tiles.length / cols) - 1) {
      totalDistance += colorDistance(tiles[i].color, tiles[i + cols].color);
      comparisons++;
    }
  }

  if (comparisons === 0) return 100;

  // Max possible distance is ~441 (sqrt(255^2 * 3))
  const avgDistance = totalDistance / comparisons;
  const maxDistance = 441;
  const smoothness = Math.max(0, 100 - (avgDistance / maxDistance) * 100);

  return Math.round(smoothness);
};

// Progress storage
const STORAGE_KEY = 'gradient-puzzle-progress';

export interface LevelProgress {
  completed: boolean;
  bestMoves?: number;
  bestTime?: number;
}

export interface GameProgress {
  completedLevels: Record<string, LevelProgress>;
  currentLevel?: string;
}

export const loadProgress = (): GameProgress => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return { completedLevels: {} };
};

export const saveProgress = (progress: GameProgress): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
};

export const markLevelComplete = (
  levelId: string,
  moves: number,
  time: number
): void => {
  const progress = loadProgress();
  const existing = progress.completedLevels[levelId];

  progress.completedLevels[levelId] = {
    completed: true,
    bestMoves: existing?.bestMoves ? Math.min(existing.bestMoves, moves) : moves,
    bestTime: existing?.bestTime ? Math.min(existing.bestTime, time) : time,
  };

  saveProgress(progress);
};

// Get IDs of first levels in each pack
const getFirstLevelIds = (): Set<string> => {
  return new Set(LEVEL_PACKS.map(pack => pack.levels[0]?.id).filter(Boolean));
};

export const isLevelUnlocked = (levelId: string, allLevelIds: string[]): boolean => {
  const levelIndex = allLevelIds.indexOf(levelId);
  if (levelIndex === 0) return true; // First level always unlocked

  // First level of each pack is always unlocked
  const firstLevelIds = getFirstLevelIds();
  if (firstLevelIds.has(levelId)) return true;

  // Previous level must be completed
  const prevLevelId = allLevelIds[levelIndex - 1];
  const progress = loadProgress();
  return progress.completedLevels[prevLevelId]?.completed ?? false;
};
