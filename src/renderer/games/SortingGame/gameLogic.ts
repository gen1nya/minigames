// Types
export interface Ring {
  id: string;
  color: string;
}

export interface DifficultyConfig {
  pegs: number;
  height: number;
  colors: number;
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'extreme' | 'insane';

export type MoveResult = 'ok' | 'invalid' | 'win' | 'deadlock';

// Constants
export const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: { pegs: 7, height: 7, colors: 5 },
  medium: { pegs: 8, height: 8, colors: 6 },
  hard: { pegs: 9, height: 9, colors: 7 },
  extreme: { pegs: 10, height: 10, colors: 8 },
  insane: { pegs: 14, height: 8, colors: 6 },
};

export const ALL_COLORS = [
  '#f44336',
  '#ff9800',
  '#ffc107',
  '#4caf50',
  '#2196f3',
  '#9c27b0',
  '#e5e5e5',
  '#323232',
];

export const DIFFICULTY_LABELS: Record<DifficultyLevel, { label: string; color: string }> = {
  easy: { label: 'Легко (7 столбцов, 5 цветов)', color: '#4caf50' },
  medium: { label: 'Средне (8 столбцов, 6 цветов)', color: '#ff9800' },
  hard: { label: 'Сложно (9 столбцов, 7 цветов)', color: '#f44336' },
  extreme: { label: 'Экстремально (10 столбцов, 8 цветов)', color: '#9c27b0' },
  insane: { label: 'Безумие (14 столбцов, 6 цветов × 2)', color: '#212121' },
};

// Utility functions (kept for testing)
export function shuffleArray<T>(array: T[], random = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getTopBlockSize(peg: Ring[]): number {
  if (peg.length === 0) return 0;

  const topColor = peg[peg.length - 1].color;
  let blockSize = 1;
  for (let i = peg.length - 2; i >= 0; i--) {
    if (peg[i].color === topColor) blockSize++;
    else break;
  }
  return blockSize;
}

// Main Game Class
export class SortingGameLogic {
  private _state: Ring[][];
  private _history: Ring[][][];
  private readonly _config: DifficultyConfig;
  private readonly _colors: string[];
  private readonly _maxHistorySize = 200;
  private _nextRingId = 0;

  constructor(
    difficulty: DifficultyLevel,
    private readonly _random = Math.random
  ) {
    this._config = DIFFICULTY_LEVELS[difficulty];
    this._colors = ALL_COLORS.slice(0, this._config.colors);
    this._state = [];
    this._history = [];
    this.reset();
  }

  private generateRingId(): string {
    return `ring-${this._nextRingId++}`;
  }

  // Getters for read-only access
  get state(): Ring[][] {
    return this._state;
  }

  get config(): DifficultyConfig {
    return this._config;
  }

  get colors(): string[] {
    return this._colors;
  }

  get canUndo(): boolean {
    return this._history.length > 0;
  }

  get historyLength(): number {
    return this._history.length;
  }

  // Reset game to initial state
  reset(): void {
    this._state = this.createInitialState();
    this._history = [];
  }

  // Check if a move is valid
  canMove(from: number, to: number): boolean {
    const source = this._state[from];
    const target = this._state[to];

    if (!source?.length) return false;

    const topColor = source[source.length - 1].color;
    const blockSize = getTopBlockSize(source);

    if (target.length > 0) {
      const targetTopColor = target[target.length - 1].color;
      if (targetTopColor !== topColor) return false;
    }

    if (target.length + blockSize > this._config.height) return false;

    return true;
  }

  // Execute a move, returns result
  move(from: number, to: number): MoveResult {
    if (!this.canMove(from, to)) return 'invalid';

    // Save state to history
    this.pushHistory();

    // Perform the move
    const source = this._state[from];
    const blockSize = getTopBlockSize(source);
    const moving = source.splice(source.length - blockSize, blockSize);
    this._state[to].push(...moving);

    // Check game end conditions
    if (this.checkWin()) return 'win';
    if (this.isDeadlocked()) return 'deadlock';

    return 'ok';
  }

  // Undo last move
  undo(): boolean {
    if (!this._history.length) return false;

    this._state = this._history.pop()!;
    return true;
  }

  // Get a hint for next move
  getHint(): { from: number; to: number } | null {
    for (let from = 0; from < this._state.length; from++) {
      for (let to = 0; to < this._state.length; to++) {
        if (from === to) continue;
        if (this.canMove(from, to)) return { from, to };
      }
    }
    return null;
  }

  // Check if game is won
  checkWin(): boolean {
    const colorCounts: Record<string, number> = {};
    const pegsPerColor = (this._config.pegs - 2) / this._colors.length;

    for (const peg of this._state) {
      if (!peg.length) continue;
      if (peg.length !== this._config.height) return false;

      const pegColor = peg[0].color;
      if (!peg.every(r => r.color === pegColor)) return false;

      colorCounts[pegColor] = (colorCounts[pegColor] || 0) + 1;
    }

    for (const color of this._colors) {
      if (colorCounts[color] !== pegsPerColor) return false;
    }
    return true;
  }

  // Check if no moves are available
  isDeadlocked(): boolean {
    for (let from = 0; from < this._state.length; from++) {
      for (let to = 0; to < this._state.length; to++) {
        if (from === to) continue;
        if (this.canMove(from, to)) return false;
      }
    }
    return true;
  }

  // Check if a peg has rings
  hasPeg(index: number): boolean {
    return this._state[index]?.length > 0;
  }

  // Private methods
  private createInitialState(): Ring[][] {
    const totalSlots = (this._config.pegs - 2) * this._config.height;
    const ringsPool: Ring[] = [];

    for (let i = 0; i < totalSlots; i++) {
      ringsPool.push({
        id: this.generateRingId(),
        color: this._colors[i % this._colors.length],
      });
    }

    const shuffled = shuffleArray(ringsPool, this._random);

    const state: Ring[][] = Array.from({ length: this._config.pegs }, () => []);
    let idx = 0;
    for (let p = 0; p < this._config.pegs; p++) {
      if (p >= this._config.pegs - 2) continue;
      for (let h = 0; h < this._config.height; h++) {
        state[p].push(shuffled[idx++]);
      }
    }

    return state;
  }

  private pushHistory(): void {
    const copy = this._state.map(peg => peg.map(r => ({ id: r.id, color: r.color })));
    this._history.push(copy);
    if (this._history.length > this._maxHistorySize) {
      this._history.shift();
    }
  }
}
