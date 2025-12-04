import {
  Ring,
  DIFFICULTY_LEVELS,
  ALL_COLORS,
  shuffleArray,
  getTopBlockSize,
  SortingGameLogic,
} from './gameLogic';

describe('shuffleArray', () => {
  it('returns array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled).toHaveLength(arr.length);
  });

  it('contains all original elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('does not mutate original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(original);
  });

  it('uses provided random function', () => {
    const arr = [1, 2, 3, 4, 5];
    const mockRandom = () => 0;
    const shuffled = shuffleArray(arr, mockRandom);
    expect(shuffled).toHaveLength(arr.length);
  });
});

describe('getTopBlockSize', () => {
  it('returns 0 for empty peg', () => {
    expect(getTopBlockSize([])).toBe(0);
  });

  it('returns 1 for single ring', () => {
    const peg: Ring[] = [{ id: '1', color: 'red' }];
    expect(getTopBlockSize(peg)).toBe(1);
  });

  it('returns 1 when top ring differs from below', () => {
    const peg: Ring[] = [{ id: '1', color: 'red' }, { id: '2', color: 'blue' }];
    expect(getTopBlockSize(peg)).toBe(1);
  });

  it('counts consecutive same-color rings from top', () => {
    const peg: Ring[] = [
      { id: '1', color: 'red' },
      { id: '2', color: 'blue' },
      { id: '3', color: 'blue' },
      { id: '4', color: 'blue' },
    ];
    expect(getTopBlockSize(peg)).toBe(3);
  });

  it('returns full length for single-color peg', () => {
    const peg: Ring[] = [
      { id: '1', color: 'red' },
      { id: '2', color: 'red' },
      { id: '3', color: 'red' },
    ];
    expect(getTopBlockSize(peg)).toBe(3);
  });
});

describe('SortingGameLogic', () => {
  // Helper to create seeded random
  const createSeededRandom = (seed = 0.5) => {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  };

  describe('constructor and initialization', () => {
    it('creates game with correct config for difficulty', () => {
      const game = new SortingGameLogic('easy');
      expect(game.config).toEqual(DIFFICULTY_LEVELS.easy);
    });

    it('creates correct number of colors', () => {
      const game = new SortingGameLogic('easy');
      expect(game.colors).toHaveLength(DIFFICULTY_LEVELS.easy.colors);
    });

    it('creates correct number of pegs', () => {
      const game = new SortingGameLogic('easy');
      expect(game.state).toHaveLength(DIFFICULTY_LEVELS.easy.pegs);
    });

    it('leaves last 2 pegs empty', () => {
      const game = new SortingGameLogic('easy');
      const { pegs } = game.config;
      expect(game.state[pegs - 1]).toHaveLength(0);
      expect(game.state[pegs - 2]).toHaveLength(0);
    });

    it('fills other pegs to max height', () => {
      const game = new SortingGameLogic('easy');
      const { pegs, height } = game.config;
      for (let i = 0; i < pegs - 2; i++) {
        expect(game.state[i]).toHaveLength(height);
      }
    });

    it('uses all colors equally', () => {
      const game = new SortingGameLogic('easy');
      const colorCounts: Record<string, number> = {};

      for (const peg of game.state) {
        for (const ring of peg) {
          colorCounts[ring.color] = (colorCounts[ring.color] || 0) + 1;
        }
      }

      const { pegs, height, colors } = game.config;
      const expectedCount = ((pegs - 2) * height) / colors;
      for (const color of game.colors) {
        expect(colorCounts[color]).toBe(expectedCount);
      }
    });

    it('produces deterministic results with seeded random', () => {
      const game1 = new SortingGameLogic('easy', createSeededRandom(0.5));
      const game2 = new SortingGameLogic('easy', createSeededRandom(0.5));
      // Compare colors only (IDs will differ between instances)
      const colors1 = game1.state.map(peg => peg.map(r => r.color));
      const colors2 = game2.state.map(peg => peg.map(r => r.color));
      expect(colors1).toEqual(colors2);
    });

    it('assigns unique IDs to all rings', () => {
      const game = new SortingGameLogic('easy');
      const allIds = new Set<string>();

      for (const peg of game.state) {
        for (const ring of peg) {
          expect(ring.id).toBeDefined();
          expect(allIds.has(ring.id)).toBe(false);
          allIds.add(ring.id);
        }
      }
    });
  });

  describe('canMove', () => {
    it('returns false when source is empty', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      expect(game.canMove(emptyPegIndex, 0)).toBe(false);
    });

    it('returns true when target is empty and has space', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      expect(game.canMove(0, emptyPegIndex)).toBe(true);
    });

    it('returns false for invalid peg index', () => {
      const game = new SortingGameLogic('easy');
      expect(game.canMove(-1, 0)).toBe(false);
      expect(game.canMove(100, 0)).toBe(false);
    });
  });

  describe('move', () => {
    it('returns invalid for impossible move', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      expect(game.move(emptyPegIndex, 0)).toBe('invalid');
    });

    it('returns ok for valid move', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      const result = game.move(0, emptyPegIndex);
      expect(result).toBe('ok');
    });

    it('moves rings to target peg', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      const sourceTopColor = game.state[0][game.state[0].length - 1].color;
      const blockSize = getTopBlockSize(game.state[0]);

      game.move(0, emptyPegIndex);

      expect(game.state[emptyPegIndex]).toHaveLength(blockSize);
      expect(game.state[emptyPegIndex][0].color).toBe(sourceTopColor);
    });

    it('adds to history on successful move', () => {
      const game = new SortingGameLogic('easy');
      expect(game.historyLength).toBe(0);

      const emptyPegIndex = game.config.pegs - 1;
      game.move(0, emptyPegIndex);

      expect(game.historyLength).toBe(1);
    });

    it('does not add to history on invalid move', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      game.move(emptyPegIndex, 0); // invalid - source empty

      expect(game.historyLength).toBe(0);
    });
  });

  describe('undo', () => {
    it('returns false when no history', () => {
      const game = new SortingGameLogic('easy');
      expect(game.undo()).toBe(false);
    });

    it('returns true and restores previous state', () => {
      const game = new SortingGameLogic('easy');
      const originalState = JSON.stringify(game.state);
      const emptyPegIndex = game.config.pegs - 1;

      game.move(0, emptyPegIndex);
      expect(JSON.stringify(game.state)).not.toBe(originalState);

      const undone = game.undo();
      expect(undone).toBe(true);
      expect(JSON.stringify(game.state)).toBe(originalState);
    });

    it('decreases history length', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;

      game.move(0, emptyPegIndex);
      expect(game.historyLength).toBe(1);

      game.undo();
      expect(game.historyLength).toBe(0);
    });
  });

  describe('canUndo', () => {
    it('returns false initially', () => {
      const game = new SortingGameLogic('easy');
      expect(game.canUndo).toBe(false);
    });

    it('returns true after a move', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      game.move(0, emptyPegIndex);
      expect(game.canUndo).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears history', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      game.move(0, emptyPegIndex);
      expect(game.historyLength).toBe(1);

      game.reset();
      expect(game.historyLength).toBe(0);
    });

    it('creates new game state', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      game.move(0, emptyPegIndex);
      const stateAfterMove = JSON.stringify(game.state);

      game.reset();
      // State should be different (new shuffle)
      // Just check structure is correct
      expect(game.state).toHaveLength(game.config.pegs);
      expect(game.state[game.config.pegs - 1]).toHaveLength(0);
    });
  });

  describe('getHint', () => {
    it('returns valid move when available', () => {
      const game = new SortingGameLogic('easy');
      const hint = game.getHint();

      expect(hint).not.toBeNull();
      expect(game.canMove(hint!.from, hint!.to)).toBe(true);
    });
  });

  describe('checkWin', () => {
    it('returns false for initial state', () => {
      const game = new SortingGameLogic('easy');
      expect(game.checkWin()).toBe(false);
    });
  });

  describe('isDeadlocked', () => {
    it('returns false for initial state (moves available)', () => {
      const game = new SortingGameLogic('easy');
      expect(game.isDeadlocked()).toBe(false);
    });
  });

  describe('hasPeg', () => {
    it('returns true for filled peg', () => {
      const game = new SortingGameLogic('easy');
      expect(game.hasPeg(0)).toBe(true);
    });

    it('returns false for empty peg', () => {
      const game = new SortingGameLogic('easy');
      const emptyPegIndex = game.config.pegs - 1;
      expect(game.hasPeg(emptyPegIndex)).toBe(false);
    });

    it('returns false for invalid index', () => {
      const game = new SortingGameLogic('easy');
      expect(game.hasPeg(-1)).toBe(false);
      expect(game.hasPeg(100)).toBe(false);
    });
  });

  describe('history limit', () => {
    it('limits history to max size', () => {
      const game = new SortingGameLogic('easy');

      // Make many moves back and forth
      for (let i = 0; i < 250; i++) {
        const emptyPeg = game.state.findIndex(p => p.length === 0);
        const filledPeg = game.state.findIndex(p => p.length > 0);
        if (emptyPeg !== -1 && filledPeg !== -1) {
          game.move(filledPeg, emptyPeg);
        }
      }

      expect(game.historyLength).toBeLessThanOrEqual(200);
    });
  });
});

describe('DIFFICULTY_LEVELS', () => {
  it('has valid configurations', () => {
    for (const [level, config] of Object.entries(DIFFICULTY_LEVELS)) {
      expect(config.pegs).toBeGreaterThan(2);
      expect(config.height).toBeGreaterThan(0);
      expect(config.colors).toBeGreaterThan(0);
      expect(config.colors).toBeLessThanOrEqual(ALL_COLORS.length);

      // Verify that rings distribute evenly
      const totalSlots = (config.pegs - 2) * config.height;
      expect(totalSlots % config.colors).toBe(0);
    }
  });
});
