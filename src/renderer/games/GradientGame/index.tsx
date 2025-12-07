import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LevelConfig,
  LEVEL_PACKS,
  ALL_LEVELS,
  getNextLevel,
  getPackByLevelId,
} from './levels';
import {
  Tile,
  generateTiles,
  shuffleTiles,
  swapTiles,
  checkComplete,
  calculateScore,
  loadProgress,
  markLevelComplete,
  isLevelUnlocked,
  findHint,
  GameProgress,
} from './gameLogic';

interface GradientGameProps {
  onBack: () => void;
}

type Screen = 'levels' | 'game';

// Animations
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const hintGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 8px 4px rgba(255, 215, 0, 0.6), 0 0 16px 8px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 12px 6px rgba(255, 215, 0, 0.8), 0 0 24px 12px rgba(255, 215, 0, 0.4);
  }
`;

// Styled Components
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #eee;
  position: relative;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
`;

const Header = styled.header`
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(10px);
`;

const HeaderLeft = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const HeaderCenter = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const HeaderButton = styled.button`
  padding: 8px 14px;
  border-radius: 12px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(5px);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.96);
  }
`;

const Counter = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.1);
  padding: 6px 14px;
  border-radius: 20px;
  min-width: 80px;
  text-align: center;

  @media (max-width: 500px) {
    font-size: 14px;
    padding: 4px 10px;
    min-width: 60px;
  }
`;

const LevelTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0;

  @media (max-width: 500px) {
    font-size: 14px;
  }
`;

// Level Selection Screen
const LevelSelectContainer = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const LevelSelectTitle = styled.h1`
  font-size: 2.5rem;
  text-align: center;
  margin-bottom: 8px;
  background: linear-gradient(90deg, #00d4ff, #7b2cbf, #ff6b6b);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: ${shimmer} 3s linear infinite;
`;

const LevelSelectSubtitle = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 30px;
`;

const PackSection = styled.div`
  margin-bottom: 30px;
`;

const PackHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const PackName = styled.h3`
  font-size: 1.3rem;
  margin: 0;
  color: #fff;
`;

const PackDescription = styled.span`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
`;

const PackProgress = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
`;

const LevelsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const LevelCard = styled.button<{ $locked: boolean; $completed: boolean }>`
  aspect-ratio: 1;
  border-radius: 16px;
  border: 2px solid ${props => props.$completed ? 'rgba(46, 204, 113, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  cursor: ${props => props.$locked ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$locked ? 0.4 : 1};
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
  overflow: hidden;

  ${props => !props.$locked && css`
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      border-color: rgba(255, 255, 255, 0.3);
    }
  `}

  ${props => props.$completed && css`
    &::after {
      content: '';
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: #2ecc71;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `}
`;

const LevelCardOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
`;

const LevelCardName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
`;

const LevelCardDimensions = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
`;

const LevelCardLock = styled.span`
  font-size: 24px;
`;

const LevelCardCheck = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
`;

// Game Area
const GameArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
`;

const GridContainer = styled.div.attrs<{ $cols: number; $rows: number; $gap: number; $showGap: boolean; $tileSize: number }>(props => ({
  style: {
    gridTemplateColumns: `repeat(${props.$cols}, ${props.$tileSize}px)`,
    gridTemplateRows: `repeat(${props.$rows}, ${props.$tileSize}px)`,
    gap: `${props.$showGap ? props.$gap : 0}px`,
  },
}))`
  display: grid;
  justify-content: center;
`;

const TileWrapper = styled(motion.div)<{
  $shape: string;
  $isAnchor: boolean;
  $isSelected: boolean;
  $isDragging: boolean;
}>`
  aspect-ratio: 1;
  cursor: ${props => props.$isAnchor ? 'not-allowed' : 'grab'};
  position: relative;

  ${props => props.$isDragging && css`
    cursor: grabbing;
    z-index: 100;
  `}

  ${props => props.$isSelected && !props.$isAnchor && css`
    animation: ${pulse} 0.5s ease infinite;
  `}
`;

const TileElement = styled.div<{
  $color: string;
  $shape: string;
  $isAnchor: boolean;
  $isSelected: boolean;
  $isHinted: boolean;
  $seamlessMode: boolean;
}>`
  width: 100%;
  height: 100%;
  background: ${props => props.$color};
  border-radius: ${props => {
    if (props.$seamlessMode) return '0';
    switch (props.$shape) {
      case 'circle': return '50%';
      case 'hexagon': return '8px';
      default: return '8px';
    }
  }};
  box-shadow: ${props => {
    if (props.$isSelected) {
      return '0 0 0 3px rgba(255, 255, 255, 0.8), 0 4px 12px rgba(0, 0, 0, 0.3)';
    }
    return '0 2px 8px rgba(0, 0, 0, 0.2)';
  }};
  transition: box-shadow 0.2s ease;
  position: relative;

  ${props => props.$isHinted && css`
    animation: ${hintGlow} 1s ease-in-out infinite;
  `}

  ${props => props.$isAnchor && css`
    &::after {
      content: '';
      position: absolute;
      inset: 4px;
      border: 2px dashed rgba(255, 255, 255, 0.5);
      border-radius: inherit;
      pointer-events: none;
    }
  `}

  &:hover {
    ${props => !props.$isAnchor && css`
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3);
    `}
  }
`;

const AnchorIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  opacity: 0.6;
  pointer-events: none;
`;

// Settings toggle button
const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  background: ${props => props.$active ? 'rgba(46, 204, 113, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? '#2ecc71' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.$active ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255, 255, 255, 0.2)'};
  }

  &:active {
    transform: scale(0.96);
  }

  @media (max-width: 600px) {
    font-size: 11px;
    padding: 5px 8px;
  }
`;

// Smoothness indicator
const SmoothnessBar = styled.div`
  width: 100%;
  max-width: 300px;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin: 0 auto 20px;
`;

const SmoothnessProgress = styled.div<{ $value: number }>`
  height: 100%;
  width: ${props => props.$value}%;
  background: linear-gradient(90deg, #e74c3c, #f1c40f, #2ecc71);
  background-size: 300% 100%;
  background-position: ${props => 100 - props.$value}% 0;
  transition: all 0.3s ease;
  border-radius: 3px;
`;

// Modal styles
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #2a2a4a 0%, #1a1a3e 100%);
  padding: 28px 36px;
  border-radius: 20px;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalTitle = styled.div`
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 12px;
`;

const ModalText = styled.div`
  margin-bottom: 24px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const ModalButton = styled.button`
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &:active {
    transform: scale(0.96);
  }
`;

const ModalButtonPrimary = styled(ModalButton)`
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);

  &:hover {
    background: linear-gradient(135deg, #27ae60 0%, #219a52 100%);
  }
`;

const ModalButtonSecondary = styled(ModalButton)`
  background: rgba(255, 255, 255, 0.1);
`;

// Animation variants
const modalOverlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalContentVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

// Create gradient preview for level cards
const createCardStyle = (level: LevelConfig): React.CSSProperties => {
  const { colors } = level;
  return {
    background: `
      linear-gradient(to bottom,
        ${colors.topLeft} 0%,
        ${colors.bottomLeft} 100%
      ),
      linear-gradient(to bottom,
        ${colors.topRight} 0%,
        ${colors.bottomRight} 100%
      )
    `,
    backgroundSize: '50% 100%, 50% 100%',
    backgroundPosition: 'left, right',
    backgroundRepeat: 'no-repeat',
  };
};

// Format time
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function GradientGame({ onBack }: GradientGameProps) {
  const [screen, setScreen] = useState<Screen>('levels');
  const [currentLevel, setCurrentLevel] = useState<LevelConfig | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsed, setElapsed] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [progress, setProgress] = useState<GameProgress>(() => loadProgress());

  // Hints
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedTiles, setHintedTiles] = useState<[number, number] | null>(null);

  // Visual settings - seamless mode disables gap and border radius
  const [seamlessMode, setSeamlessMode] = useState(false);

  // Auto-scaling
  const [tileSize, setTileSize] = useState(60);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const timerRef = useRef<number | null>(null);

  const allLevelIds = ALL_LEVELS.map(l => l.id);

  // Timer effect
  useEffect(() => {
    if (screen === 'game' && currentLevel && !showWinModal) {
      timerRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [screen, currentLevel, startTime, showWinModal]);

  // Auto-scale tiles to fit the game area
  useEffect(() => {
    if (!currentLevel || !gameAreaRef.current) return;

    const calculateTileSize = () => {
      const container = gameAreaRef.current;
      if (!container) return;

      const gap = seamlessMode ? 0 : (currentLevel.gap ?? 4);
      const padding = 40; // GameArea padding
      const smoothnessBarHeight = 30; // Space for smoothness bar

      const availableWidth = container.clientWidth - padding;
      const availableHeight = container.clientHeight - padding - smoothnessBarHeight;

      const totalGapWidth = gap * (currentLevel.cols - 1);
      const totalGapHeight = gap * (currentLevel.rows - 1);

      const maxTileWidth = (availableWidth - totalGapWidth) / currentLevel.cols;
      const maxTileHeight = (availableHeight - totalGapHeight) / currentLevel.rows;

      // Use the smaller dimension to ensure tiles are square and fit
      const optimalSize = Math.floor(Math.min(maxTileWidth, maxTileHeight));

      // Clamp between min and max sizes
      const clampedSize = Math.max(30, Math.min(80, optimalSize));

      setTileSize(clampedSize);
    };

    calculateTileSize();

    const resizeObserver = new ResizeObserver(calculateTileSize);
    resizeObserver.observe(gameAreaRef.current);

    return () => resizeObserver.disconnect();
  }, [currentLevel, seamlessMode]);

  // Start a level
  const startLevel = useCallback((level: LevelConfig) => {
    const newTiles = shuffleTiles(generateTiles(level));
    setCurrentLevel(level);
    setTiles(newTiles);
    setSelectedTile(null);
    setMoves(0);
    setHintsUsed(0);
    setHintedTiles(null);
    setStartTime(Date.now());
    setElapsed(0);
    setShowWinModal(false);
    setScreen('game');
  }, []);

  // Handle tile click/tap
  const handleTileClick = useCallback((index: number) => {
    if (!currentLevel) return;

    // Clear hint highlight on any click
    setHintedTiles(null);

    const tile = tiles[index];
    if (tile.isAnchor) return;

    if (selectedTile === null) {
      setSelectedTile(index);
    } else if (selectedTile === index) {
      setSelectedTile(null);
    } else {
      // Try to swap
      const newTiles = swapTiles(tiles, selectedTile, index);
      if (newTiles) {
        setTiles(newTiles);
        setMoves(m => m + 1);
        setSelectedTile(null);

        // Check for win
        if (checkComplete(newTiles)) {
          const time = Date.now() - startTime;
          markLevelComplete(currentLevel.id, moves + 1, time, hintsUsed);
          setProgress(loadProgress());
          setShowWinModal(true);
        }
      } else {
        setSelectedTile(null);
      }
    }
  }, [tiles, selectedTile, currentLevel, startTime, moves, hintsUsed]);

  // Show hint
  const showHint = useCallback(() => {
    // Don't count if hint is already displayed
    if (hintedTiles !== null) return;

    const hint = findHint(tiles);
    if (hint) {
      setHintedTiles(hint);
      setHintsUsed(h => h + 1);
      setSelectedTile(null);
    }
  }, [tiles, hintedTiles]);

  // Reset current level
  const resetLevel = useCallback(() => {
    if (currentLevel) {
      startLevel(currentLevel);
    }
  }, [currentLevel, startLevel]);

  // Go to next level
  const goToNextLevel = useCallback(() => {
    if (currentLevel) {
      const next = getNextLevel(currentLevel.id);
      if (next) {
        startLevel(next);
      } else {
        setScreen('levels');
        setCurrentLevel(null);
        setShowWinModal(false);
      }
    }
  }, [currentLevel, startLevel]);

  // Back to level select
  const goToLevels = useCallback(() => {
    setScreen('levels');
    setCurrentLevel(null);
    setShowWinModal(false);
    setProgress(loadProgress());
  }, []);

  // Calculate correctness score for current state
  const correctness = currentLevel ? calculateScore(tiles) : 0;

  // Render level selection
  if (screen === 'levels') {
    return (
      <GameContainer>
        <Header>
          <HeaderLeft>
            <HeaderButton onClick={onBack}>← Назад</HeaderButton>
          </HeaderLeft>
        </Header>

        <LevelSelectContainer>
          <LevelSelectTitle>Gradient Puzzle</LevelSelectTitle>
          <LevelSelectSubtitle>Собери градиент, перемещая плитки</LevelSelectSubtitle>

          {LEVEL_PACKS.map(pack => {
            const completedInPack = pack.levels.filter(
              l => progress.completedLevels[l.id]?.completed
            ).length;

            return (
              <PackSection key={pack.id}>
                <PackHeader>
                  <PackName>{pack.name}</PackName>
                  <PackDescription>{pack.description}</PackDescription>
                  <PackProgress>{completedInPack}/{pack.levels.length}</PackProgress>
                </PackHeader>

                <LevelsGrid>
                  {pack.levels.map(level => {
                    const isUnlocked = isLevelUnlocked(level.id, allLevelIds);
                    const isCompleted = progress.completedLevels[level.id]?.completed ?? false;

                    return (
                      <LevelCard
                        key={level.id}
                        $locked={!isUnlocked}
                        $completed={isCompleted}
                        style={isUnlocked ? createCardStyle(level) : { background: 'rgba(255, 255, 255, 0.05)' }}
                        onClick={() => isUnlocked && startLevel(level)}
                        disabled={!isUnlocked}
                      >
                        <LevelCardOverlay>
                          {!isUnlocked ? (
                            <LevelCardLock>🔒</LevelCardLock>
                          ) : (
                            <>
                              <LevelCardName>{level.name}</LevelCardName>
                              <LevelCardDimensions>{level.cols}x{level.rows}</LevelCardDimensions>
                            </>
                          )}
                        </LevelCardOverlay>
                        {isCompleted && <LevelCardCheck>✓</LevelCardCheck>}
                      </LevelCard>
                    );
                  })}
                </LevelsGrid>
              </PackSection>
            );
          })}
        </LevelSelectContainer>
      </GameContainer>
    );
  }

  // Render game
  if (!currentLevel) return null;

  const pack = getPackByLevelId(currentLevel.id);

  return (
    <GameContainer>
      <Header>
        <HeaderLeft>
          <HeaderButton onClick={goToLevels}>← Уровни</HeaderButton>
        </HeaderLeft>
        <HeaderCenter>
          <LevelTitle>{currentLevel.name}</LevelTitle>
        </HeaderCenter>
        <HeaderRight>
          <ToggleButton $active={seamlessMode} onClick={() => setSeamlessMode(!seamlessMode)}>
            Seamless
          </ToggleButton>
          <HeaderButton onClick={showHint}>💡 {hintsUsed > 0 && `(${hintsUsed})`}</HeaderButton>
          <Counter>{formatTime(elapsed)}</Counter>
          <Counter>Ходов: {moves}</Counter>
          <HeaderButton onClick={resetLevel}>⟲</HeaderButton>
        </HeaderRight>
      </Header>

      <GameArea ref={gameAreaRef}>
        <div>
          <SmoothnessBar>
            <SmoothnessProgress $value={correctness} />
          </SmoothnessBar>

          <GridContainer
            $cols={currentLevel.cols}
            $rows={currentLevel.rows}
            $gap={currentLevel.gap ?? 4}
            $showGap={!seamlessMode}
            $tileSize={tileSize}
          >
            {tiles.map((tile, index) => (
              <TileWrapper
                key={tile.id}
                $shape={currentLevel.tileShape}
                $isAnchor={tile.isAnchor}
                $isSelected={selectedTile === index}
                $isDragging={false}
                onClick={() => handleTileClick(index)}
                layout
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              >
                <TileElement
                  $color={tile.color}
                  $shape={currentLevel.tileShape}
                  $isAnchor={tile.isAnchor}
                  $isSelected={selectedTile === index}
                  $isHinted={hintedTiles !== null && (hintedTiles[0] === index || hintedTiles[1] === index)}
                  $seamlessMode={seamlessMode}
                >
                  {tile.isAnchor && <AnchorIcon>📌</AnchorIcon>}
                </TileElement>
              </TileWrapper>
            ))}
          </GridContainer>
        </div>
      </GameArea>

      {/* Win Modal */}
      <AnimatePresence>
        {showWinModal && (
          <ModalOverlay
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalOverlayVariants}
          >
            <ModalContent
              variants={modalContentVariants}
              initial="hidden"
              animate="visible"
              onClick={e => e.stopPropagation()}
            >
              <ModalTitle>🎨 Отлично!</ModalTitle>
              <ModalText>
                Уровень "{currentLevel.name}" пройден!<br />
                Время: {formatTime(elapsed)}<br />
                Ходов: {moves}<br />
                Подсказок: {hintsUsed}
              </ModalText>
              <ModalButtons>
                {getNextLevel(currentLevel.id) ? (
                  <ModalButtonPrimary onClick={goToNextLevel}>
                    Следующий уровень →
                  </ModalButtonPrimary>
                ) : (
                  <ModalButtonPrimary onClick={goToLevels}>
                    Все уровни пройдены!
                  </ModalButtonPrimary>
                )}
                <ModalButton onClick={resetLevel}>Ещё раз</ModalButton>
                <ModalButtonSecondary onClick={goToLevels}>К уровням</ModalButtonSecondary>
              </ModalButtons>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </GameContainer>
  );
}
