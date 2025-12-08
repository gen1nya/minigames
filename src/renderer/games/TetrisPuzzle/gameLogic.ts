// Tetris piece shapes with non-negative offsets (row, col from top-left of bounding box)
// 4 rotations for each piece type

export const TETROMINO_SHAPES = {
  I: [
    [[0, 0], [0, 1], [0, 2], [0, 3]], // horizontal
    [[0, 0], [1, 0], [2, 0], [3, 0]], // vertical
    [[0, 0], [0, 1], [0, 2], [0, 3]], // horizontal
    [[0, 0], [1, 0], [2, 0], [3, 0]], // vertical
  ],
  O: [
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [1, 0], [1, 1]],
  ],
  T: [
    [[0, 0], [0, 1], [0, 2], [1, 1]], // T up
    [[0, 0], [1, 0], [1, 1], [2, 0]], // T right
    [[0, 1], [1, 0], [1, 1], [1, 2]], // T down
    [[0, 1], [1, 0], [1, 1], [2, 1]], // T left
  ],
  S: [
    [[0, 1], [0, 2], [1, 0], [1, 1]], // S horizontal
    [[0, 0], [1, 0], [1, 1], [2, 1]], // S vertical
    [[0, 1], [0, 2], [1, 0], [1, 1]], // S horizontal
    [[0, 0], [1, 0], [1, 1], [2, 1]], // S vertical
  ],
  Z: [
    [[0, 0], [0, 1], [1, 1], [1, 2]], // Z horizontal
    [[0, 1], [1, 0], [1, 1], [2, 0]], // Z vertical
    [[0, 0], [0, 1], [1, 1], [1, 2]], // Z horizontal
    [[0, 1], [1, 0], [1, 1], [2, 0]], // Z vertical
  ],
  J: [
    [[0, 0], [1, 0], [1, 1], [1, 2]], // J up
    [[0, 0], [0, 1], [1, 0], [2, 0]], // J right
    [[0, 0], [0, 1], [0, 2], [1, 2]], // J down
    [[0, 1], [1, 1], [2, 0], [2, 1]], // J left
  ],
  L: [
    [[0, 2], [1, 0], [1, 1], [1, 2]], // L up
    [[0, 0], [1, 0], [2, 0], [2, 1]], // L right
    [[0, 0], [0, 1], [0, 2], [1, 0]], // L down
    [[0, 0], [0, 1], [1, 1], [2, 1]], // L left
  ],
} as const;

export type TetrominoType = keyof typeof TETROMINO_SHAPES;

// Get bounding box size for a shape
export function getShapeBounds(type: TetrominoType, rotation: number): { rows: number; cols: number } {
  const shape = TETROMINO_SHAPES[type][rotation];
  const maxRow = Math.max(...shape.map(([r]) => r));
  const maxCol = Math.max(...shape.map(([, c]) => c));
  return { rows: maxRow + 1, cols: maxCol + 1 };
}

// Piece - stores pre-rendered image of the piece
export interface Piece {
  type: TetrominoType;
  rotation: number;           // Shape rotation (0-3)
  row: number;                // Current position on field
  col: number;
  targetRow: number;          // Target position (where this piece should go)
  targetCol: number;
  targetRotation: number;     // Target shape rotation
  visualRotation: number;     // How much the image is rotated from target (0 = correct)
  imageDataUrl: string;       // Pre-rendered image of just this piece
  imageWidth: number;         // Width of piece image in pixels
  imageHeight: number;        // Height of piece image in pixels
}

// Placed piece on the field
export interface PlacedPiece {
  type: TetrominoType;
  rotation: number;
  row: number;
  col: number;
  targetRow: number;
  targetCol: number;
  targetRotation: number;
  visualRotation: number;
  imageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export interface GameState {
  occupiedCells: boolean[][];     // Grid to track which cells are occupied
  placedPieces: PlacedPiece[];    // List of placed pieces for rendering
  currentPiece: Piece | null;
  nextPieces: Piece[];
  piecesPlaced: number;
  totalPieces: number;
  isGameOver: boolean;
  isWon: boolean;
  imageUrl: string | null;
  fieldWidth: number;
  fieldHeight: number;
}

// Seeded random number generator
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Generate diagonal gradient color
export function getDiagonalGradientColor(
  row: number,
  col: number,
  totalRows: number,
  totalCols: number
): string {
  const progress = (row / (totalRows - 1) + col / (totalCols - 1)) / 2;
  const r = Math.round(255 - progress * 200);
  const g = Math.round(50 + progress * 150);
  const b = Math.round(50 + progress * 205);
  return `rgb(${r}, ${g}, ${b})`;
}

// Check if a piece is "grounded"
function isPieceGrounded(
  cells: [number, number][],
  used: boolean[][],
  fieldHeight: number
): boolean {
  const columnBottoms = new Map<number, number>();
  for (const [row, col] of cells) {
    const current = columnBottoms.get(col);
    if (current === undefined || row > current) {
      columnBottoms.set(col, row);
    }
  }

  for (const [col, bottomRow] of Array.from(columnBottoms.entries())) {
    if (bottomRow === fieldHeight - 1) continue;
    if (!used[bottomRow + 1][col]) return false;
  }
  return true;
}

// Generate piece layout
export function generatePieceLayout(
  fieldWidth: number,
  fieldHeight: number,
  seed: number
): { type: TetrominoType; layoutRotation: number; cells: [number, number][] }[] {
  const random = mulberry32(seed);
  const tetrominoTypes: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

  function tryGenerate(maxAttempts: number) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const used = Array.from({ length: fieldHeight }, () =>
        Array.from({ length: fieldWidth }, () => false)
      );
      const pieces: { type: TetrominoType; layoutRotation: number; cells: [number, number][] }[] = [];
      let failed = false;

      for (let row = fieldHeight - 1; row >= 0 && !failed; row--) {
        for (let col = 0; col < fieldWidth && !failed; col++) {
          if (used[row][col]) continue;

          const shuffledTypes = [...tetrominoTypes].sort(() => random() - 0.5);
          let placed = false;

          for (const type of shuffledTypes) {
            if (placed) break;
            const shapes = TETROMINO_SHAPES[type];
            const shuffledRotations = [0, 1, 2, 3].sort(() => random() - 0.5);

            for (const rotIdx of shuffledRotations) {
              const shape = shapes[rotIdx] as readonly (readonly [number, number])[];

              for (let shapeIdx = 0; shapeIdx < shape.length; shapeIdx++) {
                const [anchorDr, anchorDc] = shape[shapeIdx];
                const baseRow = row - anchorDr;
                const baseCol = col - anchorDc;

                const cells: [number, number][] = shape.map(pos =>
                  [baseRow + pos[0], baseCol + pos[1]] as [number, number]
                );

                const allValid = cells.every(([nr, nc]) =>
                  nr >= 0 && nr < fieldHeight && nc >= 0 && nc < fieldWidth && !used[nr][nc]
                );

                if (!allValid) continue;
                if (!isPieceGrounded(cells, used, fieldHeight)) continue;

                cells.forEach(([nr, nc]) => { used[nr][nc] = true; });
                pieces.push({ type, layoutRotation: rotIdx, cells });
                placed = true;
                break;
              }
              if (placed) break;
            }
          }

          if (!placed && !used[row][col]) failed = true;
        }
      }

      if (!failed) {
        let complete = true;
        for (let r = 0; r < fieldHeight && complete; r++) {
          for (let c = 0; c < fieldWidth && complete; c++) {
            if (!used[r][c]) complete = false;
          }
        }
        if (complete) return pieces;
      }
    }
    return null;
  }

  let result = tryGenerate(50);
  if (!result) {
    console.warn('Using fallback layout');
    result = generateFallbackLayout(fieldWidth, fieldHeight, random);
  }
  return result;
}

function generateFallbackLayout(
  fieldWidth: number,
  fieldHeight: number,
  random: () => number
): { type: TetrominoType; layoutRotation: number; cells: [number, number][] }[] {
  const pieces: { type: TetrominoType; layoutRotation: number; cells: [number, number][] }[] = [];
  const used = Array.from({ length: fieldHeight }, () =>
    Array.from({ length: fieldWidth }, () => false)
  );

  for (let row = fieldHeight - 1; row >= 0; row--) {
    let col = 0;
    while (col < fieldWidth) {
      if (used[row][col]) { col++; continue; }

      let freeCount = 0;
      for (let c = col; c < fieldWidth && !used[row][c]; c++) freeCount++;

      if (freeCount >= 4) {
        const cells: [number, number][] = [[row, col], [row, col + 1], [row, col + 2], [row, col + 3]];
        cells.forEach(([r, c]) => used[r][c] = true);
        pieces.push({ type: 'I', layoutRotation: 0, cells });
        col += 4;
      } else if (freeCount >= 2 && row >= 1 && !used[row - 1][col] && !used[row - 1][col + 1]) {
        const cells: [number, number][] = [[row - 1, col], [row - 1, col + 1], [row, col], [row, col + 1]];
        cells.forEach(([r, c]) => used[r][c] = true);
        pieces.push({ type: 'O', layoutRotation: 0, cells });
        col += 2;
      } else {
        col++;
      }
    }
  }

  for (let col = 0; col < fieldWidth; col++) {
    let row = fieldHeight - 1;
    while (row >= 0) {
      if (used[row][col]) { row--; continue; }
      let freeCount = 0;
      for (let r = row; r >= 0 && !used[r][col]; r--) freeCount++;

      if (freeCount >= 4) {
        const cells: [number, number][] = [[row, col], [row - 1, col], [row - 2, col], [row - 3, col]];
        cells.forEach(([r, c]) => used[r][c] = true);
        pieces.push({ type: 'I', layoutRotation: 1, cells });
        row -= 4;
      } else {
        row--;
      }
    }
  }

  return pieces;
}

// Get cell positions for a piece
export function getPieceCells(piece: { type: TetrominoType; rotation: number; row: number; col: number }): [number, number][] {
  const shape = TETROMINO_SHAPES[piece.type][piece.rotation];
  return shape.map(([dr, dc]) => [piece.row + dr, piece.col + dc] as [number, number]);
}

// Check if piece can be placed
export function canPlacePiece(
  piece: { type: TetrominoType; rotation: number; row: number; col: number },
  occupiedCells: boolean[][],
  fieldWidth: number,
  fieldHeight: number
): boolean {
  const cells = getPieceCells(piece);
  return cells.every(([row, col]) =>
    row >= 0 && row < fieldHeight &&
    col >= 0 && col < fieldWidth &&
    !occupiedCells[row][col]
  );
}

// Check reachability
function canReachTargetPosition(
  piece: Piece,
  occupiedCells: boolean[][],
  fieldWidth: number,
  fieldHeight: number
): boolean {
  const shape = TETROMINO_SHAPES[piece.type][piece.rotation];
  const minShapeRow = Math.min(...shape.map(pos => pos[0]));
  const minShapeCol = Math.min(...shape.map(pos => pos[1]));

  const pieceTargetRow = piece.targetRow - minShapeRow;
  const pieceTargetCol = piece.targetCol - minShapeCol;

  const targetPiece = { ...piece, row: pieceTargetRow, col: pieceTargetCol };
  if (!canPlacePiece(targetPiece, occupiedCells, fieldWidth, fieldHeight)) return false;

  const visited = new Set<string>();
  const queue: [number, number][] = [];

  for (let startCol = -3; startCol < fieldWidth + 3; startCol++) {
    const key = `0,${startCol}`;
    if (!visited.has(key)) {
      const testPiece = { ...piece, row: 0, col: startCol };
      if (canPlacePiece(testPiece, occupiedCells, fieldWidth, fieldHeight)) {
        queue.push([0, startCol]);
        visited.add(key);
      }
    }
  }

  while (queue.length > 0) {
    const [row, col] = queue.shift()!;
    if (row === pieceTargetRow && col === pieceTargetCol) return true;
    if (row > pieceTargetRow) continue;

    for (const [dr, dc] of [[1, 0], [0, -1], [0, 1]]) {
      const newRow = row + dr;
      const newCol = col + dc;
      const key = `${newRow},${newCol}`;

      if (!visited.has(key)) {
        const testPiece = { ...piece, row: newRow, col: newCol };
        if (canPlacePiece(testPiece, occupiedCells, fieldWidth, fieldHeight)) {
          visited.add(key);
          queue.push([newRow, newCol]);
        }
      }
    }
  }

  return false;
}

// Render piece image to canvas and return data URL
export function renderPieceImage(
  type: TetrominoType,
  targetRotation: number,
  cells: [number, number][],
  tileSize: number,
  sourceImage: HTMLImageElement | null,
  fieldWidth: number,
  fieldHeight: number
): { dataUrl: string; width: number; height: number } {
  const shape = TETROMINO_SHAPES[type][targetRotation];
  const bounds = getShapeBounds(type, targetRotation);

  const width = bounds.cols * tileSize;
  const height = bounds.rows * tileSize;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Clear with transparency
  ctx.clearRect(0, 0, width, height);

  const minRow = Math.min(...cells.map(([r]) => r));
  const minCol = Math.min(...cells.map(([, c]) => c));

  // Draw each cell of the piece
  shape.forEach(([dr, dc]) => {
    const cellRow = minRow + dr;
    const cellCol = minCol + dc;
    const x = dc * tileSize;
    const y = dr * tileSize;

    if (sourceImage) {
      // Calculate source position in the image
      const srcX = (cellCol / fieldWidth) * sourceImage.width;
      const srcY = (cellRow / fieldHeight) * sourceImage.height;
      const srcW = sourceImage.width / fieldWidth;
      const srcH = sourceImage.height / fieldHeight;

      ctx.drawImage(
        sourceImage,
        srcX, srcY, srcW, srcH,
        x, y, tileSize, tileSize
      );
    } else {
      // Draw gradient color
      const color = getDiagonalGradientColor(cellRow, cellCol, fieldHeight, fieldWidth);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, tileSize, tileSize);
    }
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width,
    height,
  };
}

// Create pieces from layout
export function createPiecesFromLayout(
  layout: { type: TetrominoType; layoutRotation: number; cells: [number, number][] }[],
  fieldWidth: number,
  fieldHeight: number,
  seed: number,
  tileSize: number,
  sourceImage: HTMLImageElement | null
): Piece[] {
  const random = mulberry32(seed + 12345);

  const piecesWithCells = layout.map(({ type, layoutRotation, cells }, id) => {
    const minRow = Math.min(...cells.map(([r]) => r));
    const minCol = Math.min(...cells.map(([, c]) => c));

    // Random rotation offset (0-3)
    const rotationOffset = Math.floor(random() * 4);
    const currentRotation = (layoutRotation + rotationOffset) % 4;

    // Pre-render the piece image
    const { dataUrl, width, height } = renderPieceImage(
      type, layoutRotation, cells, tileSize,
      sourceImage, fieldWidth, fieldHeight
    );

    return {
      piece: {
        type,
        rotation: currentRotation,
        row: 0,
        col: Math.floor(fieldWidth / 2) - 1,
        targetRow: minRow,
        targetCol: minCol,
        targetRotation: layoutRotation,
        visualRotation: rotationOffset,
        imageDataUrl: dataUrl,
        imageWidth: width,
        imageHeight: height,
      } as Piece,
      cells,
      id,
      minRow,
      minCol,
    };
  });

  // Build dependencies
  const cellToPiece = new Map<string, number>();
  piecesWithCells.forEach(({ cells, id }) => {
    cells.forEach(([r, c]) => cellToPiece.set(`${r},${c}`, id));
  });

  const dependencies = new Map<number, Set<number>>();
  piecesWithCells.forEach(({ id }) => dependencies.set(id, new Set()));

  piecesWithCells.forEach(({ cells, id }) => {
    cells.forEach(([r, c]) => {
      if (r < fieldHeight - 1) {
        const belowId = cellToPiece.get(`${r + 1},${c}`);
        if (belowId !== undefined && belowId !== id) {
          dependencies.get(id)!.add(belowId);
        }
      }
    });
  });

  // Order pieces
  const result: Piece[] = [];
  const placed = new Set<number>();
  const remaining = new Set(piecesWithCells.map(p => p.id));
  const simulatedField = Array.from({ length: fieldHeight }, () =>
    Array.from({ length: fieldWidth }, () => false)
  );

  while (remaining.size > 0) {
    const ready = Array.from(remaining).filter(id =>
      Array.from(dependencies.get(id)!).every(depId => placed.has(depId))
    );

    if (ready.length === 0) {
      Array.from(remaining).forEach(id => {
        result.push(piecesWithCells.find(p => p.id === id)!.piece);
      });
      break;
    }

    ready.sort((a, b) => {
      const cellsA = piecesWithCells.find(p => p.id === a)!.cells;
      const cellsB = piecesWithCells.find(p => p.id === b)!.cells;
      const maxRowA = Math.max(...cellsA.map(([r]) => r));
      const maxRowB = Math.max(...cellsB.map(([r]) => r));
      if (maxRowA !== maxRowB) return maxRowB - maxRowA;
      return Math.min(...cellsA.map(([, c]) => c)) - Math.min(...cellsB.map(([, c]) => c));
    });

    let placedThisRound = false;
    for (const id of ready) {
      const p = piecesWithCells.find(p => p.id === id)!;

      if (canReachTargetPosition(p.piece, simulatedField, fieldWidth, fieldHeight)) {
        result.push(p.piece);
        placed.add(id);
        remaining.delete(id);
        p.cells.forEach(([r, c]) => { simulatedField[r][c] = true; });
        placedThisRound = true;
        break;
      }
    }

    if (!placedThisRound) {
      const id = ready[0];
      const p = piecesWithCells.find(p => p.id === id)!;
      result.push(p.piece);
      placed.add(id);
      remaining.delete(id);
      p.cells.forEach(([r, c]) => { simulatedField[r][c] = true; });
    }
  }

  return result;
}

// Move piece
export function movePiece(
  piece: Piece,
  deltaRow: number,
  deltaCol: number,
  occupiedCells: boolean[][],
  fieldWidth: number,
  fieldHeight: number
): Piece | null {
  const newPiece = { ...piece, row: piece.row + deltaRow, col: piece.col + deltaCol };
  if (canPlacePiece(newPiece, occupiedCells, fieldWidth, fieldHeight)) {
    return newPiece;
  }
  return null;
}

// Rotate piece
export function rotatePiece(
  piece: Piece,
  direction: 1 | -1,
  occupiedCells: boolean[][],
  fieldWidth: number,
  fieldHeight: number
): Piece | null {
  const newRotation = (piece.rotation + direction + 4) % 4;
  const newVisualRotation = (piece.visualRotation + direction + 4) % 4;

  const newPiece: Piece = {
    ...piece,
    rotation: newRotation,
    visualRotation: newVisualRotation,
  };

  if (canPlacePiece(newPiece, occupiedCells, fieldWidth, fieldHeight)) {
    return newPiece;
  }

  // Wall kicks
  for (const [kickRow, kickCol] of [[0, -1], [0, 1], [0, -2], [0, 2], [-1, 0], [1, 0]]) {
    const kickedPiece = { ...newPiece, row: piece.row + kickRow, col: piece.col + kickCol };
    if (canPlacePiece(kickedPiece, occupiedCells, fieldWidth, fieldHeight)) {
      return kickedPiece;
    }
  }

  return null;
}

// Place piece
export function placePiece(
  piece: Piece,
  occupiedCells: boolean[][]
): { newOccupiedCells: boolean[][]; placedPiece: PlacedPiece } {
  const newOccupiedCells = occupiedCells.map(row => [...row]);
  const cells = getPieceCells(piece);
  cells.forEach(([r, c]) => { newOccupiedCells[r][c] = true; });

  const placedPiece: PlacedPiece = {
    type: piece.type,
    rotation: piece.rotation,
    row: piece.row,
    col: piece.col,
    targetRow: piece.targetRow,
    targetCol: piece.targetCol,
    targetRotation: piece.targetRotation,
    visualRotation: piece.visualRotation,
    imageDataUrl: piece.imageDataUrl,
    imageWidth: piece.imageWidth,
    imageHeight: piece.imageHeight,
  };

  return { newOccupiedCells, placedPiece };
}

// Drop piece
export function dropPiece(
  piece: Piece,
  occupiedCells: boolean[][],
  fieldWidth: number,
  fieldHeight: number
): Piece {
  let currentPiece = { ...piece };
  while (true) {
    const nextPiece = movePiece(currentPiece, 1, 0, occupiedCells, fieldWidth, fieldHeight);
    if (!nextPiece) break;
    currentPiece = nextPiece;
  }
  return currentPiece;
}

// Check win condition
export function checkWinCondition(placedPieces: PlacedPiece[]): boolean {
  return placedPieces.every(p =>
    p.row === p.targetRow &&
    p.col === p.targetCol &&
    p.rotation === p.targetRotation &&
    p.visualRotation === 0
  );
}

// Calculate correct pieces
export function calculateCorrectPieces(placedPieces: PlacedPiece[]): number {
  return placedPieces.filter(p =>
    p.row === p.targetRow &&
    p.col === p.targetCol &&
    p.rotation === p.targetRotation &&
    p.visualRotation === 0
  ).length;
}

// Load image
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// Crop image
export function cropImageToField(
  img: HTMLImageElement,
  fieldWidth: number,
  fieldHeight: number
): string {
  const canvas = document.createElement('canvas');
  const targetAspect = fieldWidth / fieldHeight;
  const imgAspect = img.width / img.height;

  let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

  if (imgAspect > targetAspect) {
    srcW = img.height * targetAspect;
    srcX = (img.width - srcW) / 2;
  } else {
    srcH = img.width / targetAspect;
    srcY = (img.height - srcH) / 2;
  }

  const maxSize = 800;
  const scale = Math.min(1, maxSize / Math.max(srcW, srcH));
  canvas.width = Math.round(srcW * scale);
  canvas.height = Math.round(srcH * scale);

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.9);
}

// Create game state
export function createGameState(
  fieldWidth: number,
  fieldHeight: number,
  imageUrl: string | null,
  tileSize: number,
  sourceImage: HTMLImageElement | null,
  seed: number = Date.now()
): GameState {
  const layout = generatePieceLayout(fieldWidth, fieldHeight, seed);
  const pieces = createPiecesFromLayout(layout, fieldWidth, fieldHeight, seed, tileSize, sourceImage);

  const occupiedCells = Array.from({ length: fieldHeight }, () =>
    Array.from({ length: fieldWidth }, () => false)
  );

  const [currentPiece, ...nextPieces] = pieces;

  return {
    occupiedCells,
    placedPieces: [],
    currentPiece: currentPiece || null,
    nextPieces,
    piecesPlaced: 0,
    totalPieces: pieces.length,
    isGameOver: false,
    isWon: false,
    imageUrl,
    fieldWidth,
    fieldHeight,
  };
}

