import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import {
  createGameState,
  movePiece,
  rotatePiece,
  dropPiece,
  placePiece,
  canPlacePiece,
  calculateCorrectPieces,
  getShapeBounds,
  loadImage,
  cropImageToField,
  getDiagonalGradientColor,
  GameState,
  Piece,
  PlacedPiece,
  TetrominoType,
} from './gameLogic';

const FIELD_WIDTH = 10;
const FIELD_HEIGHT = 16;
const TILE_SIZE = 28;
const DROP_INTERVAL = 800;
const FAST_DROP_INTERVAL = 50;

interface TetrisPuzzleProps {
  onBack: () => void;
}

// Styled Components
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20px;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 600px;
  margin-bottom: 20px;
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const Title = styled.h1`
  color: white;
  margin: 0;
  font-size: 24px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
`;

const MainContent = styled.div`
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: center;
`;

const SidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
`;

const PreviewContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PreviewLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const PreviewGrid = styled.div<{ $size: number }>`
  display: grid;
  grid-template-columns: repeat(${FIELD_WIDTH}, ${props => props.$size}px);
  grid-template-rows: repeat(${FIELD_HEIGHT}, ${props => props.$size}px);
  gap: 0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
`;

const PreviewTile = styled.div<{ $color: string }>`
  width: 100%;
  height: 100%;
  background: ${props => props.$color};
`;

const PreviewImage = styled.img`
  width: ${FIELD_WIDTH * 10}px;
  height: ${FIELD_HEIGHT * 10}px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
`;

const NextPieceContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const NextPiecePreview = styled.div`
  width: 80px;
  height: 80px;
  position: relative;
`;

const GameFieldContainer = styled.div`
  background: rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const GameField = styled.div`
  position: relative;
  width: ${FIELD_WIDTH * TILE_SIZE}px;
  height: ${FIELD_HEIGHT * TILE_SIZE}px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
`;

// Grid overlay for visual reference
const GridOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: ${TILE_SIZE}px ${TILE_SIZE}px;
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

// Piece element props
interface PieceElementProps {
  $type: TetrominoType;
  $rotation: number;
  $row: number;
  $col: number;
  $targetRotation: number;
  $visualRotation: number;
  $imageDataUrl: string;
  $isGhost?: boolean;
  $isActive?: boolean;
  $isCorrect?: boolean;
  $tileSize: number;
}

// Piece container
interface PieceContainerProps {
  $left: number;
  $top: number;
  $isGhost?: boolean;
  $isActive?: boolean;
  $isCorrect?: boolean;
}

const PieceWrapper = styled.div<PieceContainerProps>`
  position: absolute;
  pointer-events: none;

  ${props => css`
    left: ${props.$left}px;
    top: ${props.$top}px;
  `}

  ${props => props.$isGhost && css`
    opacity: 0.3;
  `}

  ${props => props.$isActive && css`
    animation: ${pulse} 0.5s ease-in-out infinite;
  `}

  ${props => props.$isCorrect && css`
    filter: brightness(1.2);
  `}
`;

// Render piece with pre-rendered image
const PieceElement = (props: PieceElementProps & { style?: React.CSSProperties }) => {
  const targetBounds = getShapeBounds(props.$type, props.$targetRotation);
  const currentBounds = getShapeBounds(props.$type, props.$rotation);

  const left = props.$col * props.$tileSize;
  const top = props.$row * props.$tileSize;

  // Original image dimensions (at target rotation)
  const imgWidth = targetBounds.cols * props.$tileSize;
  const imgHeight = targetBounds.rows * props.$tileSize;

  // Current bounding box dimensions
  const boxWidth = currentBounds.cols * props.$tileSize;
  const boxHeight = currentBounds.rows * props.$tileSize;

  // Center the image in the bounding box
  const offsetX = (boxWidth - imgWidth) / 2;
  const offsetY = (boxHeight - imgHeight) / 2;

  return (
    <PieceWrapper
      $left={left}
      $top={top}
      $isGhost={props.$isGhost}
      $isActive={props.$isActive}
      $isCorrect={props.$isCorrect}
      style={props.style}
    >
      <img
        src={props.$imageDataUrl}
        alt=""
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: imgWidth,
          height: imgHeight,
          transform: `rotate(${props.$visualRotation * 90}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease',
        }}
      />
    </PieceWrapper>
  );
};

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 15px;
  min-width: 120px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatValue = styled.div`
  color: white;
  font-size: 20px;
  font-weight: bold;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 5px;
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${props => props.$percent}%;
  height: 100%;
  background: linear-gradient(90deg, #4ade80, #22d3ee);
  transition: width 0.3s ease;
`;

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  align-items: center;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 10px;
`;

const ControlButton = styled.button<{ $size?: 'small' | 'large' }>`
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: white;
  width: ${props => props.$size === 'large' ? '120px' : '50px'};
  height: 50px;
  border-radius: 10px;
  font-size: ${props => props.$size === 'large' ? '14px' : '20px'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }

  &:active {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(0.95);
  }
`;

const ActionButtonsRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'linear-gradient(135deg, #4ade80, #22d3ee)';
      case 'danger': return 'linear-gradient(135deg, #f87171, #fb923c)';
      default: return 'rgba(255, 255, 255, 0.15)';
    }
  }};
  border: none;
  color: white;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }
`;

const celebrate = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(5px);
`;

const Modal = styled.div`
  background: linear-gradient(135deg, #1e3a5f, #0f2744);
  padding: 40px;
  border-radius: 20px;
  text-align: center;
  max-width: 400px;
  animation: ${celebrate} 0.5s ease-in-out;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const ModalTitle = styled.h2`
  color: white;
  font-size: 32px;
  margin: 0 0 20px;
`;

const ModalText = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  margin: 0 0 30px;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ImageUploadButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.7);
  padding: 15px;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.5);
    color: white;
  }
`;

const KeyboardHint = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  text-align: center;
  margin-top: 10px;

  @media (pointer: coarse) {
    display: none;
  }
`;

export default function TetrisPuzzle({ onBack }: TetrisPuzzleProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<HTMLImageElement | null>(null);
  const [isFastDrop, setIsFastDrop] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [seed, setSeed] = useState(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropIntervalRef = useRef<number | null>(null);
  const gameStateRef = useRef<GameState | null>(null);

  // Keep ref in sync with state for interval callback
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Initialize game
  const initGame = useCallback((newSeed?: number) => {
    const useSeed = newSeed ?? Date.now();
    setSeed(useSeed);
    setGameState(createGameState(FIELD_WIDTH, FIELD_HEIGHT, imageUrl, TILE_SIZE, sourceImage, useSeed));
    setShowWinModal(false);
    setShowGameOverModal(false);
  }, [imageUrl, sourceImage]);

  useEffect(() => {
    initGame(seed);
  }, [imageUrl, sourceImage]);

  // Drop interval - uses ref to avoid resetting on piece changes
  useEffect(() => {
    const isActive = gameState && gameState.currentPiece && !gameState.isWon && !gameState.isGameOver;

    if (!isActive) {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
      return;
    }

    const interval = isFastDrop ? FAST_DROP_INTERVAL : DROP_INTERVAL;

    // Clear previous interval if exists
    if (dropIntervalRef.current) {
      clearInterval(dropIntervalRef.current);
    }

    dropIntervalRef.current = window.setInterval(() => {
      const current = gameStateRef.current;
      if (!current || !current.currentPiece || current.isWon || current.isGameOver) return;

      setGameState(prev => {
        if (!prev || !prev.currentPiece) return prev;

        const newPiece = movePiece(
          prev.currentPiece,
          1, 0,
          prev.occupiedCells,
          FIELD_WIDTH,
          FIELD_HEIGHT
        );

        if (newPiece) {
          return { ...prev, currentPiece: newPiece };
        } else {
          // Place piece
          const { newOccupiedCells, placedPiece } = placePiece(prev.currentPiece, prev.occupiedCells);
          const newPlacedPieces = [...prev.placedPieces, placedPiece];
          const [nextPiece, ...remainingPieces] = prev.nextPieces;

          // Check if piece is placed correctly
          const isCorrectPlacement =
            placedPiece.row === placedPiece.targetRow &&
            placedPiece.col === placedPiece.targetCol &&
            placedPiece.rotation === placedPiece.targetRotation &&
            placedPiece.visualRotation === 0;

          // Game over if piece placed incorrectly
          if (!isCorrectPlacement) {
            return {
              ...prev,
              occupiedCells: newOccupiedCells,
              placedPieces: newPlacedPieces,
              currentPiece: null,
              nextPieces: remainingPieces,
              piecesPlaced: prev.piecesPlaced + 1,
              isGameOver: true,
            };
          }

          // Check if we can place the next piece
          if (nextPiece && !canPlacePiece(nextPiece, newOccupiedCells, FIELD_WIDTH, FIELD_HEIGHT)) {
            return {
              ...prev,
              occupiedCells: newOccupiedCells,
              placedPieces: newPlacedPieces,
              currentPiece: null,
              nextPieces: remainingPieces,
              piecesPlaced: prev.piecesPlaced + 1,
              isGameOver: true,
            };
          }

          // Check win condition
          const isWon = remainingPieces.length === 0 && !nextPiece;

          return {
            ...prev,
            occupiedCells: newOccupiedCells,
            placedPieces: newPlacedPieces,
            currentPiece: nextPiece || null,
            nextPieces: remainingPieces,
            piecesPlaced: prev.piecesPlaced + 1,
            isWon,
            isGameOver: !nextPiece && !isWon,
          };
        }
      });
    }, interval);

    return () => {
      if (dropIntervalRef.current) {
        clearInterval(dropIntervalRef.current);
        dropIntervalRef.current = null;
      }
    };
  }, [isFastDrop, gameState?.isWon, gameState?.isGameOver, !!gameState?.currentPiece]);

  // Show modals
  useEffect(() => {
    if (gameState?.isWon) {
      setShowWinModal(true);
    } else if (gameState?.isGameOver) {
      setShowGameOverModal(true);
    }
  }, [gameState?.isWon, gameState?.isGameOver]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameState || !gameState.currentPiece || gameState.isWon || gameState.isGameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          moveLeft();
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveRight();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setIsFastDrop(true);
          break;
        case ' ':
          e.preventDefault();
          hardDrop();
          break;
        case 'ArrowUp':
        case 'r':
        case 'R':
          e.preventDefault();
          handleRotate();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setIsFastDrop(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  const moveLeft = () => {
    setGameState(prev => {
      if (!prev || !prev.currentPiece) return prev;
      const newPiece = movePiece(prev.currentPiece, 0, -1, prev.occupiedCells, FIELD_WIDTH, FIELD_HEIGHT);
      return newPiece ? { ...prev, currentPiece: newPiece } : prev;
    });
  };

  const moveRight = () => {
    setGameState(prev => {
      if (!prev || !prev.currentPiece) return prev;
      const newPiece = movePiece(prev.currentPiece, 0, 1, prev.occupiedCells, FIELD_WIDTH, FIELD_HEIGHT);
      return newPiece ? { ...prev, currentPiece: newPiece } : prev;
    });
  };

  const handleRotate = () => {
    setGameState(prev => {
      if (!prev || !prev.currentPiece) return prev;
      const newPiece = rotatePiece(prev.currentPiece, 1, prev.occupiedCells, FIELD_WIDTH, FIELD_HEIGHT);
      return newPiece ? { ...prev, currentPiece: newPiece } : prev;
    });
  };

  const hardDrop = () => {
    setGameState(prev => {
      if (!prev || !prev.currentPiece) return prev;

      const droppedPiece = dropPiece(prev.currentPiece, prev.occupiedCells, FIELD_WIDTH, FIELD_HEIGHT);
      const { newOccupiedCells, placedPiece } = placePiece(droppedPiece, prev.occupiedCells);
      const newPlacedPieces = [...prev.placedPieces, placedPiece];
      const [nextPiece, ...remainingPieces] = prev.nextPieces;

      // Check if piece is placed correctly
      const isCorrectPlacement =
        placedPiece.row === placedPiece.targetRow &&
        placedPiece.col === placedPiece.targetCol &&
        placedPiece.rotation === placedPiece.targetRotation &&
        placedPiece.visualRotation === 0;

      // Game over if piece placed incorrectly
      if (!isCorrectPlacement) {
        return {
          ...prev,
          occupiedCells: newOccupiedCells,
          placedPieces: newPlacedPieces,
          currentPiece: null,
          nextPieces: remainingPieces,
          piecesPlaced: prev.piecesPlaced + 1,
          isGameOver: true,
        };
      }

      if (nextPiece && !canPlacePiece(nextPiece, newOccupiedCells, FIELD_WIDTH, FIELD_HEIGHT)) {
        return {
          ...prev,
          occupiedCells: newOccupiedCells,
          placedPieces: newPlacedPieces,
          currentPiece: null,
          nextPieces: remainingPieces,
          piecesPlaced: prev.piecesPlaced + 1,
          isGameOver: true,
        };
      }

      const isWon = remainingPieces.length === 0 && !nextPiece;

      return {
        ...prev,
        occupiedCells: newOccupiedCells,
        placedPieces: newPlacedPieces,
        currentPiece: nextPiece || null,
        nextPieces: remainingPieces,
        piecesPlaced: prev.piecesPlaced + 1,
        isWon,
        isGameOver: !nextPiece && !isWon,
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = await loadImage(file);
      const croppedUrl = cropImageToField(img, FIELD_WIDTH, FIELD_HEIGHT);
      // Load cropped image as HTMLImageElement for piece rendering
      const croppedImg = new Image();
      croppedImg.src = croppedUrl;
      await new Promise<void>((resolve) => {
        croppedImg.onload = () => resolve();
      });
      setImageUrl(croppedUrl);
      setSourceImage(croppedImg);
    } catch (error) {
      console.error('Failed to load image:', error);
    }
  };

  const resetToGradient = () => {
    setImageUrl(null);
    setSourceImage(null);
    initGame();
  };

  // Get ghost piece position
  const getGhostPiece = (): Piece | null => {
    if (!gameState || !gameState.currentPiece) return null;
    return dropPiece(gameState.currentPiece, gameState.occupiedCells, FIELD_WIDTH, FIELD_HEIGHT);
  };

  // Render piece helper
  const renderPieceElement = (
    piece: Piece | PlacedPiece,
    isGhost: boolean = false,
    isActive: boolean = false
  ) => {
    if (!gameState) return null;

    const isCorrect =
      piece.row === piece.targetRow &&
      piece.col === piece.targetCol &&
      piece.rotation === piece.targetRotation &&
      piece.visualRotation === 0;

    return (
      <PieceElement
        key={`${piece.type}-${piece.row}-${piece.col}-${isGhost ? 'ghost' : 'piece'}`}
        $type={piece.type}
        $rotation={piece.rotation}
        $row={piece.row}
        $col={piece.col}
        $targetRotation={piece.targetRotation}
        $visualRotation={piece.visualRotation}
        $imageDataUrl={piece.imageDataUrl}
        $isGhost={isGhost}
        $isActive={isActive}
        $isCorrect={isCorrect && !isGhost && !isActive}
        $tileSize={TILE_SIZE}
      />
    );
  };

  // Render next piece preview
  const renderNextPiece = () => {
    if (!gameState || gameState.nextPieces.length === 0) return null;

    const nextPiece = gameState.nextPieces[0];
    const bounds = getShapeBounds(nextPiece.type, nextPiece.rotation);
    const previewTileSize = 20;
    const offsetX = (80 - bounds.cols * previewTileSize) / 2;
    const offsetY = (80 - bounds.rows * previewTileSize) / 2;

    return (
      <PieceElement
        $type={nextPiece.type}
        $rotation={nextPiece.rotation}
        $row={0}
        $col={0}
        $targetRotation={nextPiece.targetRotation}
        $visualRotation={nextPiece.visualRotation}
        $imageDataUrl={nextPiece.imageDataUrl}
        $tileSize={previewTileSize}
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
        }}
      />
    );
  };

  const correctPieces = gameState ? calculateCorrectPieces(gameState.placedPieces) : 0;
  const totalPlaced = gameState?.placedPieces.length || 0;
  const progressPercent = totalPlaced > 0 ? (correctPieces / totalPlaced) * 100 : 0;

  return (
    <GameContainer>
      <Header>
        <BackButton onClick={onBack}>← Back</BackButton>
        <Title>Tetris Puzzle</Title>
        <div style={{ width: 80 }} />
      </Header>

      <MainContent>
        <SidePanel>
          <PreviewContainer>
            <PreviewLabel>Target Image</PreviewLabel>
            {gameState?.imageUrl ? (
              <PreviewImage src={gameState.imageUrl} alt="Target" />
            ) : (
              <PreviewGrid $size={10}>
                {Array.from({ length: FIELD_HEIGHT * FIELD_WIDTH }, (_, index) => {
                  const row = Math.floor(index / FIELD_WIDTH);
                  const col = index % FIELD_WIDTH;
                  return (
                    <PreviewTile
                      key={index}
                      $color={getDiagonalGradientColor(row, col, FIELD_HEIGHT, FIELD_WIDTH)}
                    />
                  );
                })}
              </PreviewGrid>
            )}
          </PreviewContainer>

          <NextPieceContainer>
            <PreviewLabel>Next</PreviewLabel>
            <NextPiecePreview>
              {renderNextPiece()}
            </NextPiecePreview>
          </NextPieceContainer>

          <StatsContainer>
            <StatItem>
              <StatLabel>Pieces</StatLabel>
              <StatValue>
                {gameState?.piecesPlaced || 0}/{gameState?.totalPieces || 0}
              </StatValue>
            </StatItem>
            <StatItem>
              <StatLabel>Correct</StatLabel>
              <StatValue>{correctPieces}/{totalPlaced}</StatValue>
              <ProgressBar>
                <ProgressFill $percent={progressPercent} />
              </ProgressBar>
            </StatItem>
          </StatsContainer>

          <ImageUploadButton onClick={() => fileInputRef.current?.click()}>
            Upload Image
          </ImageUploadButton>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
          />
          {imageUrl && (
            <ActionButton onClick={resetToGradient}>
              Use Gradient
            </ActionButton>
          )}
        </SidePanel>

        <GameFieldContainer>
          <GameField>
            <GridOverlay />

            {/* Render placed pieces */}
            {gameState?.placedPieces.map((piece, i) => (
              <React.Fragment key={`placed-${i}`}>
                {renderPieceElement(piece, false, false)}
              </React.Fragment>
            ))}

            {/* Render ghost piece */}
            {gameState?.currentPiece && renderPieceElement(getGhostPiece()!, true, false)}

            {/* Render current piece */}
            {gameState?.currentPiece && renderPieceElement(gameState.currentPiece, false, true)}
          </GameField>
        </GameFieldContainer>
      </MainContent>

      <ControlsContainer>
        <ControlRow>
          <ControlButton onClick={moveLeft}>←</ControlButton>
          <ControlButton
            onTouchStart={() => setIsFastDrop(true)}
            onTouchEnd={() => setIsFastDrop(false)}
            onMouseDown={() => setIsFastDrop(true)}
            onMouseUp={() => setIsFastDrop(false)}
            onMouseLeave={() => setIsFastDrop(false)}
          >
            ↓
          </ControlButton>
          <ControlButton onClick={moveRight}>→</ControlButton>
          <ControlButton onClick={handleRotate}>↻</ControlButton>
        </ControlRow>
        <ControlRow>
          <ControlButton $size="large" onClick={hardDrop}>
            DROP
          </ControlButton>
        </ControlRow>
        <KeyboardHint>
          ← → Move | ↓ Fast | Space Drop | ↑/R Rotate
        </KeyboardHint>
      </ControlsContainer>

      <ActionButtonsRow>
        <ActionButton onClick={() => initGame(seed)}>Reset</ActionButton>
        <ActionButton onClick={() => initGame()}>New Game</ActionButton>
      </ActionButtonsRow>

      {showWinModal && (
        <ModalOverlay onClick={() => setShowWinModal(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>Puzzle Complete!</ModalTitle>
            <ModalText>
              You assembled the image using {gameState?.piecesPlaced} Tetris pieces!
              <br />
              {correctPieces} pieces are in the correct position.
            </ModalText>
            <ModalButtons>
              <ActionButton onClick={() => initGame()}>Play Again</ActionButton>
              <ActionButton $variant="primary" onClick={onBack}>Back to Menu</ActionButton>
            </ModalButtons>
          </Modal>
        </ModalOverlay>
      )}

      {showGameOverModal && (
        <ModalOverlay onClick={() => setShowGameOverModal(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>Game Over</ModalTitle>
            <ModalText>
              Piece placed incorrectly! You placed {gameState?.piecesPlaced} of {gameState?.totalPieces} pieces.
            </ModalText>
            <ModalButtons>
              <ActionButton $variant="danger" onClick={() => initGame(seed)}>Try Again</ActionButton>
              <ActionButton onClick={() => initGame()}>New Game</ActionButton>
              <ActionButton onClick={onBack}>Back to Menu</ActionButton>
            </ModalButtons>
          </Modal>
        </ModalOverlay>
      )}
    </GameContainer>
  );
}
