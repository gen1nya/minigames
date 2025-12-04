import { useState, useCallback, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DifficultyLevel,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  SortingGameLogic,
  MoveResult,
  Ring,
  getTopBlockSize,
} from './gameLogic';

interface SortingGameProps {
  onBack: () => void;
}

interface FlyingRing {
  id: string;
  color: string;
  startX: number;
  startY: number;
  liftY: number;      // Y position after lifting (top of source peg)
  targetLiftY: number; // Y position at top of target peg
  endX: number;
  endY: number;
}

interface AnimationState {
  id: string;
  rings: FlyingRing[];
  onComplete: () => void;
}

// Animations
const shake = keyframes`
  0% { transform: translateX(-50%); }
  25% { transform: translateX(calc(-50% - 3px)); }
  50% { transform: translateX(calc(-50% + 3px)); }
  75% { transform: translateX(calc(-50% - 2px)); }
  100% { transform: translateX(-50%); }
`;

const lift = keyframes`
  0% { transform: translateY(0); }
  100% { transform: translateY(-6px); }
`;

// Styled Components
const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  background: #d6b58a;
  color: #222;
  position: relative;
  overflow: hidden;
`;

const Header = styled.header`
  padding: 10px 12px 4px;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const Message = styled.div`
  font-size: 13px;
  flex: 1;
  min-width: 200px;
`;

const HeaderButton = styled.button`
  padding: 6px 10px;
  border-radius: 999px;
  border: none;
  background: #444;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:active {
    transform: scale(0.96);
  }
`;

const GameArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
`;

const PegsContainer = styled.div<{ $maxHeight: number }>`
  --ring-height: 24px;
  --peg-width: 60px;
  --peg-gap: 10px;
  --max-height: ${props => props.$maxHeight};

  display: flex;
  gap: var(--peg-gap);
  align-items: flex-end;
  justify-content: center;
  max-width: 100%;

  @media (max-width: 700px) {
    --ring-height: 18px;
    --peg-width: 36px;
    --peg-gap: 4px;
  }

  @media (max-width: 500px) {
    --ring-height: 14px;
    --peg-width: 28px;
    --peg-gap: 2px;
  }
`;

const Peg = styled.div<{ $selected: boolean; $invalid: boolean }>`
  position: relative;
  width: var(--peg-width);
  height: calc(var(--ring-height) * (var(--max-height) + 2));
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  padding-bottom: 8px;
  border-radius: 999px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &::before {
    content: '';
    position: absolute;
    bottom: 0;
    width: 70%;
    height: 10px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 999px;
    filter: blur(2px);
    z-index: 0;
  }
`;

const PegRod = styled.div<{ $selected: boolean; $invalid: boolean }>`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 12px;
  height: calc(100% - 28px);
  background: #c0c0c0;
  border-radius: 999px;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5),
    inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  z-index: 0;

  ${props =>
    props.$selected &&
    css`
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.7), 0 0 14px 2px #fff,
        inset 0 0 0 2px rgba(255, 255, 255, 0.5);
    `}

  ${props =>
    props.$invalid &&
    css`
      animation: ${shake} 0.18s linear 1;
    `}
`;

const PegInner = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  height: calc(100% - 28px);
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
  z-index: 1;
`;

const RingElement = styled.div<{ $color: string; $inSelectedGroup: boolean; $hidden?: boolean }>`
  width: 46px;
  height: var(--ring-height);
  border-radius: 12px;
  background: ${props => props.$color};
  box-shadow: ${props => {
    const baseShadow = props.$color === '#e5e5e5'
      ? '0 0 0 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'
      : '0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)';

    if (props.$inSelectedGroup) {
      return `${baseShadow}, 0 0 12px 2px rgba(255, 255, 255, 0.8), 0 0 20px 4px rgba(255, 255, 255, 0.4)`;
    }
    return baseShadow;
  }};
  opacity: ${props => props.$hidden ? 0 : 1};
  transition: box-shadow 0.15s ease;

  ${props =>
    props.$inSelectedGroup &&
    !props.$hidden &&
    css`
      animation: ${lift} 0.3s ease-in-out infinite alternate;
    `}
`;

const FlyingRingElement = styled(motion.div)<{ $color: string }>`
  position: fixed;
  width: 46px;
  height: 24px;
  border-radius: 12px;
  background: ${props => props.$color};
  box-shadow: ${props =>
    props.$color === '#e5e5e5'
      ? '0 0 0 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'
      : '0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'};
  z-index: 1000;
  pointer-events: none;

  @media (max-width: 700px) {
    height: 18px;
  }

  @media (max-width: 500px) {
    height: 14px;
  }
`;

const FlyingRingsLayer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1000;
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const ModalContent = styled(motion.div)`
  background: #fff;
  padding: 20px 30px;
  border-radius: 12px;
  max-width: 300px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;

const ModalText = styled.div`
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
`;

const ModalButton = styled.button`
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #444;
  color: #fff;
  cursor: pointer;
`;

const DifficultyModalContent = styled(motion.div)`
  background: #fff;
  padding: 30px;
  border-radius: 12px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
`;

const DifficultyTitle = styled.div`
  margin-bottom: 24px;
  font-size: 20px;
  font-weight: 600;
`;

const DifficultyButtons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DifficultyButton = styled.button<{ $color: string }>`
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  background: ${props => props.$color};
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  font-weight: 500;
  transition: transform 0.1s, filter 0.1s;

  &:hover {
    transform: scale(1.02);
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const CancelButton = styled.button`
  margin-top: 16px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  background: #999;
  color: #fff;
  cursor: pointer;
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

// Main Component
export default function SortingGame({ onBack }: SortingGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('extreme');
  const [game, setGame] = useState(() => new SortingGameLogic(difficulty));
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [message, setMessage] = useState('Нажми на столбик, потом на другой, чтобы перенести кольца.');
  const [modalText, setModalText] = useState<string | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [invalidPeg, setInvalidPeg] = useState<number | null>(null);
  const [animations, setAnimations] = useState<AnimationState[]>([]);
  const [hiddenRingIds, setHiddenRingIds] = useState<Set<string>>(new Set());
  const [, forceUpdate] = useState({});
  const animationIdRef = useRef(0);

  const pegRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Create new game when difficulty changes
  useEffect(() => {
    setGame(new SortingGameLogic(difficulty));
    setSelectedPeg(null);
    setAnimations([]);
    setHiddenRingIds(new Set());
    setMessage('Нажми на столбик, потом на другой, чтобы перенести кольца.');
  }, [difficulty]);

  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  const blinkInvalid = (index: number) => {
    setInvalidPeg(index);
    setTimeout(() => setInvalidPeg(null), 200);
  };

  const handleMoveResult = (result: MoveResult) => {
    switch (result) {
      case 'win':
        setMessage('Победа! Все башни аккуратно отсортированы.');
        setModalText('Победа! Отличная сортировка!');
        break;
      case 'deadlock':
        setMessage('Похоже, дедлок: ни одного доступного хода.');
        setModalText('Дедлок! Больше нет допустимых ходов.');
        break;
      case 'ok':
        setMessage('Ход сделан.');
        break;
    }
  };

  const getPegMetrics = (pegIndex: number) => {
    const pegEl = pegRefs.current[pegIndex];
    if (!pegEl) return null;

    const pegRect = pegEl.getBoundingClientRect();
    const pegInner = pegEl.querySelector('[data-peg-inner]') as HTMLElement;
    if (!pegInner) return null;

    const computedStyle = getComputedStyle(pegEl);
    const ringHeight = parseFloat(computedStyle.getPropertyValue('--ring-height')) || 24;
    const gap = 2;

    const innerRect = pegInner.getBoundingClientRect();
    const centerX = pegRect.left + pegRect.width / 2 - 23; // 23 = half of ring width
    const bottomY = innerRect.bottom;
    const topY = innerRect.top;

    return { centerX, bottomY, topY, ringHeight, gap };
  };

  const getRingY = (metrics: NonNullable<ReturnType<typeof getPegMetrics>>, ringIndex: number) => {
    const { bottomY, ringHeight, gap } = metrics;
    return bottomY - (ringIndex + 1) * (ringHeight + gap) + gap;
  };

  const animateMove = (from: number, to: number, movingRings: Ring[], onComplete: () => void) => {
    const fromPegState = game.state;
    const fromRingCount = fromPegState[from].length;
    const toRingCount = fromPegState[to].length;

    const fromMetrics = getPegMetrics(from);
    const toMetrics = getPegMetrics(to);

    if (!fromMetrics || !toMetrics) {
      onComplete();
      return;
    }

    const liftGap = 20; // Gap above the peg top
    const flyingRings: FlyingRing[] = [];

    movingRings.forEach((ring, i) => {
      const startY = getRingY(fromMetrics, fromRingCount - movingRings.length + i);
      const endY = getRingY(toMetrics, toRingCount + i);

      // Lift position: top of source peg - gap - stack offset for this ring in the group
      const liftY = fromMetrics.topY - liftGap - (movingRings.length - 1 - i) * (fromMetrics.ringHeight + fromMetrics.gap);

      // Target lift position: top of target peg - gap - stack offset
      const targetLiftY = toMetrics.topY - liftGap - (movingRings.length - 1 - i) * (toMetrics.ringHeight + toMetrics.gap);

      flyingRings.push({
        id: ring.id,
        color: ring.color,
        startX: fromMetrics.centerX,
        startY,
        liftY,
        targetLiftY,
        endX: toMetrics.centerX,
        endY,
      });
    });

    if (flyingRings.length > 0) {
      const animId = `anim-${animationIdRef.current++}`;
      setHiddenRingIds(prev => {
        const next = new Set(prev);
        flyingRings.forEach(r => next.add(r.id));
        return next;
      });
      setAnimations(prev => [...prev, { id: animId, rings: flyingRings, onComplete }]);
    } else {
      onComplete();
    }
  };

  const handleAnimationComplete = (animId: string) => {
    setAnimations(prev => {
      const anim = prev.find(a => a.id === animId);
      if (anim) {
        anim.onComplete();
        // Remove ring IDs from hidden set
        setHiddenRingIds(hidden => {
          const next = new Set(hidden);
          anim.rings.forEach(r => next.delete(r.id));
          return next;
        });
      }
      return prev.filter(a => a.id !== animId);
    });
  };

  const handlePegTap = (index: number) => {
    if (selectedPeg === null) {
      if (!game.hasPeg(index)) {
        blinkInvalid(index);
        return;
      }
      setSelectedPeg(index);
    } else if (selectedPeg === index) {
      setSelectedPeg(null);
    } else {
      const from = selectedPeg;
      const to = index;

      // Check if move is valid before animating
      if (!game.canMove(from, to)) {
        setSelectedPeg(null);
        blinkInvalid(to);
        return;
      }

      // Get the rings that will be moved (before the actual move)
      const sourcePeg = game.state[from];
      const topColor = sourcePeg[sourcePeg.length - 1].color;
      let blockSize = 1;
      for (let i = sourcePeg.length - 2; i >= 0; i--) {
        if (sourcePeg[i].color === topColor) blockSize++;
        else break;
      }
      const movingRings = sourcePeg.slice(sourcePeg.length - blockSize);

      setSelectedPeg(null);

      // Start animation, then do the actual move
      animateMove(from, to, movingRings, () => {
        const result = game.move(from, to);
        triggerUpdate();
        handleMoveResult(result);
      });
    }
  };

  const handleUndo = () => {
    if (game.undo()) {
      triggerUpdate();
      setSelectedPeg(null);
      setMessage('Ход отменён.');
    }
  };

  const handleHint = () => {
    const hint = game.getHint();
    if (!hint) {
      setModalText('Подсказок нет — ходов больше нет!');
    } else {
      setModalText(`Попробуй переместить со столбика ${hint.from + 1} на столбик ${hint.to + 1}`);
    }
  };

  const handleReset = () => {
    game.reset();
    triggerUpdate();
    setSelectedPeg(null);
    setAnimations([]);
    setHiddenRingIds(new Set());
    setMessage('Нажми на столбик, потом на другой, чтобы перенести кольца.');
  };

  const handleDifficultySelect = (level: DifficultyLevel) => {
    setDifficulty(level);
    setShowDifficultyModal(false);
  };


  return (
    <GameContainer>
      <Header>
        <HeaderButton onClick={onBack}>← Назад</HeaderButton>
        <Message>{message}</Message>
        <HeaderButton onClick={() => setShowDifficultyModal(true)}>⚙️ Сложность</HeaderButton>
        <HeaderButton onClick={handleHint}>💡 Подсказка</HeaderButton>
        <HeaderButton onClick={handleUndo}>↶ Отменить</HeaderButton>
        <HeaderButton onClick={handleReset}>⟲ Перезапуск</HeaderButton>
      </Header>

      <GameArea>
        <PegsContainer $maxHeight={game.config.height}>
          {game.state.map((peg, pegIndex) => {
            const isSelected = selectedPeg === pegIndex;
            const blockSize = isSelected ? getTopBlockSize(peg) : 0;

            return (
              <Peg
                key={pegIndex}
                ref={el => { pegRefs.current[pegIndex] = el; }}
                $selected={isSelected}
                $invalid={invalidPeg === pegIndex}
                onClick={() => handlePegTap(pegIndex)}
              >
                <PegRod
                  $selected={isSelected}
                  $invalid={invalidPeg === pegIndex}
                />
                <PegInner data-peg-inner>
                  {peg.map((ring, ringIndex) => {
                    const inSelectedGroup = isSelected && ringIndex >= peg.length - blockSize;
                    return (
                      <RingElement
                        key={ring.id}
                        $color={ring.color}
                        $inSelectedGroup={inSelectedGroup}
                        $hidden={hiddenRingIds.has(ring.id)}
                      />
                    );
                  })}
                </PegInner>
              </Peg>
            );
          })}
        </PegsContainer>
      </GameArea>

      {/* Flying rings animation layer */}
      <FlyingRingsLayer>
        <AnimatePresence>
          {animations.flatMap(anim =>
            anim.rings.map((ring, index) => (
              <FlyingRingElement
                key={ring.id}
                $color={ring.color}
                initial={{
                  x: ring.startX,
                  y: ring.startY,
                }}
                animate={{
                  x: [ring.startX, ring.startX, ring.endX, ring.endX],
                  y: [ring.startY, ring.liftY, ring.targetLiftY, ring.endY],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.25,
                  times: [0, 0.3, 0.7, 1],
                  ease: ['easeOut', 'linear', 'easeIn'],
                }}
                onAnimationComplete={() => {
                  if (index === anim.rings.length - 1) {
                    handleAnimationComplete(anim.id);
                  }
                }}
              />
            ))
          )}
        </AnimatePresence>
      </FlyingRingsLayer>

      {/* Info Modal */}
      {modalText !== null && (
        <ModalOverlay
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalOverlayVariants}
          onClick={() => setModalText(null)}
        >
          <ModalContent
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            onClick={e => e.stopPropagation()}
          >
            <ModalText>{modalText}</ModalText>
            <ModalButton onClick={() => setModalText(null)}>OK</ModalButton>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Difficulty Modal */}
      {showDifficultyModal && (
        <ModalOverlay
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalOverlayVariants}
          onClick={() => setShowDifficultyModal(false)}
        >
          <DifficultyModalContent
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            onClick={e => e.stopPropagation()}
          >
            <DifficultyTitle>Выберите сложность</DifficultyTitle>
            <DifficultyButtons>
              {(Object.keys(DIFFICULTY_LEVELS) as DifficultyLevel[]).map(level => (
                <DifficultyButton
                  key={level}
                  $color={DIFFICULTY_LABELS[level].color}
                  onClick={() => handleDifficultySelect(level)}
                >
                  {DIFFICULTY_LABELS[level].label}
                </DifficultyButton>
              ))}
            </DifficultyButtons>
            <CancelButton onClick={() => setShowDifficultyModal(false)}>Отмена</CancelButton>
          </DifficultyModalContent>
        </ModalOverlay>
      )}
    </GameContainer>
  );
}
