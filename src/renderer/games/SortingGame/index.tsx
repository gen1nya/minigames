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
  generateSeed,
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
  --ring-height: 24px;
  --ring-width: 46px;
  --ring-radius: 12px;
  --peg-width: 60px;
  --peg-rod-width: 12px;
  --peg-gap: 10px;
  --peg-top-padding: 20px;

  @media (max-width: 700px) {
    --ring-height: 18px;
    --ring-width: 36px;
    --ring-radius: 10px;
    --peg-width: 46px;
    --peg-rod-width: 10px;
    --peg-gap: 4px;
    --peg-top-padding: 24px;
  }

  @media (max-width: 500px) {
    --ring-height: 14px;
    --ring-width: 28px;
    --ring-radius: 8px;
    --peg-width: 36px;
    --peg-rod-width: 8px;
    --peg-gap: 2px;
    --peg-top-padding: 28px;
  }

  @media (max-width: 380px) {
    --ring-height: 12px;
    --ring-width: 24px;
    --ring-radius: 6px;
    --peg-width: 30px;
    --peg-rod-width: 6px;
    --peg-gap: 1px;
    --peg-top-padding: 24px;
  }

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
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 500px) {
    padding: 8px 10px;
    gap: 6px;
  }
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

const MoveCounter = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #5d4037;
  background: rgba(255, 255, 255, 0.3);
  padding: 6px 14px;
  border-radius: 20px;
  min-width: 80px;
  text-align: center;

  @media (max-width: 500px) {
    font-size: 14px;
    padding: 4px 10px;
    min-width: 60px;
  }

  @media (max-width: 380px) {
    font-size: 12px;
    padding: 3px 8px;
    min-width: auto;
  }
`;

const HeaderButton = styled.button`
  padding: 8px 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(180deg, #6d5d4e 0%, #5d4d3e 100%);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.1s, box-shadow 0.1s;
  white-space: nowrap;

  &:hover {
    box-shadow: 0 3px 6px rgba(0,0,0,0.3);
  }

  &:active {
    transform: scale(0.96);
    box-shadow: 0 1px 2px rgba(0,0,0,0.2);
  }

  @media (max-width: 500px) {
    padding: 6px 10px;
    font-size: 12px;
    border-radius: 10px;
  }

  @media (max-width: 380px) {
    padding: 5px 8px;
    font-size: 11px;
  }
`;

const HintButton = styled(HeaderButton)`
  background: linear-gradient(180deg, #ffc107 0%, #ff9800 100%);
  color: #333;
`;

const UndoButton = styled(HeaderButton)`
  background: linear-gradient(180deg, #78909c 0%, #607d8b 100%);

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ResetButton = styled(HeaderButton)`
  background: linear-gradient(180deg, #ef5350 0%, #d32f2f 100%);
`;

const SettingsButton = styled(HeaderButton)`
  background: linear-gradient(180deg, #7e57c2 0%, #5e35b1 100%);
`;

const GameArea = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
`;

const PegsContainer = styled.div<{ $maxHeight: number }>`
  --max-height: ${props => props.$maxHeight};

  display: flex;
  gap: var(--peg-gap);
  align-items: flex-end;
  justify-content: center;
  max-width: 100%;
`;

const Peg = styled.div<{ $selected: boolean; $invalid: boolean }>`
  position: relative;
  width: var(--peg-width);
  /* Height = rings + gaps between them + top padding */
  height: calc((var(--ring-height) + 2px) * var(--max-height) + var(--peg-top-padding));
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
  width: var(--peg-rod-width);
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

const PegNumber = styled.div`
  position: absolute;
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  font-weight: bold;
  color: #5d4037;
  opacity: 0.7;

  @media (max-width: 500px) {
    font-size: 12px;
    bottom: -16px;
  }

  @media (max-width: 380px) {
    font-size: 10px;
    bottom: -14px;
  }
`;

const RingElement = styled.div<{ $color: string; $inSelectedGroup: boolean; $hidden?: boolean }>`
  width: var(--ring-width);
  height: var(--ring-height);
  min-height: var(--ring-height);
  flex-shrink: 0;
  border-radius: var(--ring-radius);
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
  width: var(--ring-width);
  height: var(--ring-height);
  border-radius: var(--ring-radius);
  background: ${props => props.$color};
  box-shadow: ${props =>
    props.$color === '#e5e5e5'
      ? '0 0 0 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'
      : '0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'};
  z-index: 1000;
  pointer-events: none;
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
  background: linear-gradient(180deg, #fff9e6 0%, #ffe4b5 100%);
  padding: 24px 32px;
  border-radius: 16px;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 3px solid #d4a574;
`;

const ModalTitle = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #5d4037;
  margin-bottom: 8px;
`;

const ModalText = styled.div`
  margin-bottom: 20px;
  font-size: 16px;
  color: #6d5d4e;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
`;

const ModalButton = styled.button`
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(180deg, #6d5d4e 0%, #5d4d3e 100%);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.1s;

  &:active {
    transform: scale(0.96);
  }
`;

const ModalButtonPrimary = styled(ModalButton)`
  background: linear-gradient(180deg, #66bb6a 0%, #43a047 100%);
`;

const ModalButtonDanger = styled(ModalButton)`
  background: linear-gradient(180deg, #ef5350 0%, #d32f2f 100%);
`;

const ModalButtonSecondary = styled(ModalButton)`
  background: linear-gradient(180deg, #90a4ae 0%, #78909c 100%);
`;

const ShareButtonGroup = styled.div`
  display: inline-flex;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
`;

const ShareButton = styled.button`
  padding: 10px 14px;
  border: none;
  background: linear-gradient(180deg, #29b6f6 0%, #0288d1 100%);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: filter 0.1s;

  &:hover {
    filter: brightness(1.1);
  }

  &:active {
    filter: brightness(0.95);
  }
`;

const CopyLinkButton = styled.button`
  padding: 10px 12px;
  border: none;
  border-left: 1px solid rgba(255,255,255,0.3);
  background: linear-gradient(180deg, #29b6f6 0%, #0288d1 100%);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: filter 0.1s;

  &:hover {
    filter: brightness(1.1);
  }

  &:active {
    filter: brightness(0.95);
  }
`;

const CopyOnlyButton = styled(ModalButton)`
  background: linear-gradient(180deg, #29b6f6 0%, #0288d1 100%);
`;

const DifficultyModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #fff9e6 0%, #ffe4b5 100%);
  padding: 28px 32px;
  border-radius: 16px;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 3px solid #d4a574;
`;

const DifficultyTitle = styled.div`
  margin-bottom: 20px;
  font-size: 22px;
  font-weight: bold;
  color: #5d4037;
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

const CancelButton = styled(ModalButtonSecondary)`
  margin-top: 16px;
`;

const SeedContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.3);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #5d4037;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.5);
  }

  @media (max-width: 500px) {
    font-size: 10px;
    padding: 3px 8px;
    gap: 4px;
  }

  @media (max-width: 380px) {
    display: none;
  }
`;

const SeedLabel = styled.span`
  font-weight: 500;
  opacity: 0.7;
`;

const SeedValue = styled.span`
  font-family: monospace;
  font-weight: bold;
`;

const CopyIcon = styled.span`
  opacity: 0.6;
  font-size: 14px;
`;

const SeedModalContent = styled(motion.div)`
  background: linear-gradient(180deg, #fff9e6 0%, #ffe4b5 100%);
  padding: 24px 32px;
  border-radius: 16px;
  max-width: 340px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 3px solid #d4a574;
`;

const SeedInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #d4a574;
  border-radius: 8px;
  font-size: 18px;
  font-family: monospace;
  text-align: center;
  background: #fff;
  color: #333;
  margin: 16px 0;

  &:focus {
    outline: none;
    border-color: #5d4037;
  }
`;

const SeedModalButtons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
`;

const CopiedToast = styled(motion.div)`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 10000;
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

// Parse URL params for shared games
const getInitialParams = (): { difficulty: DifficultyLevel; seed?: number } => {
  if (typeof window === 'undefined') return { difficulty: 'extreme' };

  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('seed');
  const diffParam = params.get('difficulty');

  const difficulty: DifficultyLevel =
    diffParam && diffParam in DIFFICULTY_LEVELS
      ? (diffParam as DifficultyLevel)
      : 'extreme';

  const seed = seedParam ? parseInt(seedParam, 10) : undefined;

  return { difficulty, seed: seed && !isNaN(seed) ? seed : undefined };
};

// Main Component
export default function SortingGame({ onBack }: SortingGameProps) {
  const initialParams = getInitialParams();
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(initialParams.difficulty);
  const [game, setGame] = useState(() => {
    const g = new SortingGameLogic(initialParams.difficulty);
    if (initialParams.seed) {
      g.resetWithSeed(initialParams.seed);
    }
    return g;
  });
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showDeadlockModal, setShowDeadlockModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [invalidPeg, setInvalidPeg] = useState<number | null>(null);
  const [animations, setAnimations] = useState<AnimationState[]>([]);
  const [hiddenRingIds, setHiddenRingIds] = useState<Set<string>>(new Set());
  const [, forceUpdate] = useState({});
  const animationIdRef = useRef(0);

  const pegRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isFirstRender = useRef(true);

  // Check if Web Share API is available (browser only, not Electron)
  const canShare = typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof window !== 'undefined' &&
    !('electronAPI' in window);

  // Check if running in browser (not Electron)
  const isBrowser = typeof window !== 'undefined' && !('electronAPI' in window);

  const getShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?seed=${game.seed}&difficulty=${difficulty}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch {
      // Fallback - select text in a temporary input
      const input = document.createElement('input');
      input.value = getShareUrl();
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  const handleShare = async (type: 'win' | 'deadlock' | 'seed') => {
    if (!canShare) return;

    const difficultyLabel = DIFFICULTY_LABELS[difficulty].label;
    const shareUrl = getShareUrl();

    let text: string;

    switch (type) {
      case 'win':
        text = `🎉 Я прошёл SortingGame (${difficultyLabel}) за ${game.historyLength} ходов!\n\nПопробуй побить мой результат:\n${shareUrl}`;
        break;
      case 'deadlock':
        text = `🎯 Попробуй пройти этот уровень SortingGame (${difficultyLabel})!\n\n${shareUrl}`;
        break;
      case 'seed':
        text = `🎮 Сыграй в SortingGame с этой раскладкой!\n\nСложность: ${difficultyLabel}\n${shareUrl}`;
        break;
    }

    try {
      // Use only 'text' - iOS ignores 'title' and 'url' in many apps
      await navigator.share({ text });
    } catch (err) {
      // User cancelled or share failed silently
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  // Clear URL params after initial load (so they don't interfere with future changes)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Create new game when difficulty changes (skip first render to preserve URL seed)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setGame(new SortingGameLogic(difficulty));
    setSelectedPeg(null);
    setAnimations([]);
    setHiddenRingIds(new Set());
    setShowWinModal(false);
    setShowDeadlockModal(false);
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
        setShowWinModal(true);
        break;
      case 'deadlock':
        setShowDeadlockModal(true);
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
    const ringWidth = parseFloat(computedStyle.getPropertyValue('--ring-width')) || 46;
    const gap = 2;

    const innerRect = pegInner.getBoundingClientRect();
    const centerX = pegRect.left + pegRect.width / 2 - ringWidth / 2;
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
    }
  };

  const handleHint = () => {
    const hint = game.getHint();
    if (!hint) {
      setHintText('Ходов больше нет!');
    } else {
      setHintText(`${hint.from + 1} → ${hint.to + 1}`);
    }
  };

  const handleResetClick = () => {
    if (game.historyLength > 0) {
      setShowResetConfirm(true);
    } else {
      doReset(true);
    }
  };

  const doReset = (newSeed = false) => {
    if (newSeed) {
      game.resetWithSeed(generateSeed());
    } else {
      game.reset();
    }
    triggerUpdate();
    setSelectedPeg(null);
    setAnimations([]);
    setHiddenRingIds(new Set());
    setShowWinModal(false);
    setShowDeadlockModal(false);
    setShowResetConfirm(false);
  };

  const handleDifficultySelect = (level: DifficultyLevel) => {
    setDifficulty(level);
    setShowDifficultyModal(false);
  };

  const handleCopySeed = async () => {
    try {
      await navigator.clipboard.writeText(game.seed.toString());
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      setShowSeedModal(true);
      setSeedInput(game.seed.toString());
    }
  };

  const handleSeedClick = () => {
    setSeedInput(game.seed.toString());
    setShowSeedModal(true);
  };

  const handleApplySeed = () => {
    const newSeed = parseInt(seedInput, 10);
    if (!isNaN(newSeed) && newSeed > 0) {
      game.resetWithSeed(newSeed);
      triggerUpdate();
      setSelectedPeg(null);
      setAnimations([]);
      setHiddenRingIds(new Set());
      setShowWinModal(false);
      setShowDeadlockModal(false);
      setShowSeedModal(false);
    }
  };

  const handleNewSeed = () => {
    const newSeed = generateSeed();
    game.resetWithSeed(newSeed);
    triggerUpdate();
    setSelectedPeg(null);
    setAnimations([]);
    setHiddenRingIds(new Set());
    setShowWinModal(false);
    setShowDeadlockModal(false);
    setShowSeedModal(false);
  };

  return (
    <GameContainer>
      <Header>
        <HeaderLeft>
          <HeaderButton onClick={onBack}>← Назад</HeaderButton>
          <SettingsButton onClick={() => setShowDifficultyModal(true)}>⚙️</SettingsButton>
        </HeaderLeft>
        <HeaderCenter>
          <MoveCounter>Ходов: {game.historyLength}</MoveCounter>
          <SeedContainer onClick={handleSeedClick} title="Нажмите для ввода seed">
            <SeedLabel>Seed:</SeedLabel>
            <SeedValue>{game.seed}</SeedValue>
            <CopyIcon onClick={(e) => { e.stopPropagation(); handleCopySeed(); }}>📋</CopyIcon>
          </SeedContainer>
        </HeaderCenter>
        <HeaderRight>
          <HintButton onClick={handleHint}>💡</HintButton>
          <UndoButton onClick={handleUndo} disabled={!game.canUndo}>↩</UndoButton>
          <ResetButton onClick={handleResetClick}>⟲</ResetButton>
        </HeaderRight>
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
                <PegNumber>{pegIndex + 1}</PegNumber>
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

      {/* Win Modal */}
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
            <ModalTitle>🎉 Победа!</ModalTitle>
            <ModalText>Отлично! Решено за {game.historyLength} ходов</ModalText>
            <ModalButtons>
              <ModalButtonPrimary onClick={() => doReset()}>Ещё раз</ModalButtonPrimary>
              {isBrowser && (
                canShare ? (
                  <ShareButtonGroup>
                    <ShareButton onClick={() => handleShare('win')}>Поделиться</ShareButton>
                    <CopyLinkButton onClick={handleCopyLink} title="Скопировать ссылку">📋</CopyLinkButton>
                  </ShareButtonGroup>
                ) : (
                  <CopyOnlyButton onClick={handleCopyLink}>📋 Скопировать</CopyOnlyButton>
                )
              )}
              <ModalButtonSecondary onClick={onBack}>В меню</ModalButtonSecondary>
            </ModalButtons>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Deadlock Modal */}
      {showDeadlockModal && (
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
            <ModalTitle>🔒 Тупик!</ModalTitle>
            <ModalText>Ходов больше нет. Попробуй снова!</ModalText>
            <ModalButtons>
              <ModalButtonPrimary onClick={() => doReset(false)}>Та же раскладка</ModalButtonPrimary>
              <ModalButtonDanger onClick={() => doReset(true)}>Новая раскладка</ModalButtonDanger>
              {isBrowser && (
                canShare ? (
                  <ShareButtonGroup>
                    <ShareButton onClick={() => handleShare('deadlock')}>Поделиться</ShareButton>
                    <CopyLinkButton onClick={handleCopyLink} title="Скопировать ссылку">📋</CopyLinkButton>
                  </ShareButtonGroup>
                ) : (
                  <CopyOnlyButton onClick={handleCopyLink}>📋 Скопировать</CopyOnlyButton>
                )
              )}
            </ModalButtons>
            <CancelButton onClick={() => { setShowDeadlockModal(false); handleUndo(); }}>Отменить ход</CancelButton>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <ModalOverlay
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalOverlayVariants}
          onClick={() => setShowResetConfirm(false)}
        >
          <ModalContent
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            onClick={e => e.stopPropagation()}
          >
            <ModalTitle>Начать заново?</ModalTitle>
            <ModalText>Прогресс ({game.historyLength} ходов) будет потерян</ModalText>
            <ModalButtons>
              <ModalButtonPrimary onClick={() => doReset(false)}>Та же раскладка</ModalButtonPrimary>
              <ModalButtonDanger onClick={() => doReset(true)}>Новая раскладка</ModalButtonDanger>
            </ModalButtons>
            <CancelButton onClick={() => setShowResetConfirm(false)}>Отмена</CancelButton>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Hint Modal */}
      {hintText !== null && (
        <ModalOverlay
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalOverlayVariants}
          onClick={() => setHintText(null)}
        >
          <ModalContent
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            onClick={e => e.stopPropagation()}
          >
            <ModalTitle>💡 Подсказка</ModalTitle>
            <ModalText>{hintText}</ModalText>
            <ModalButton onClick={() => setHintText(null)}>OK</ModalButton>
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

      {/* Seed Modal */}
      {showSeedModal && (
        <ModalOverlay
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={modalOverlayVariants}
          onClick={() => setShowSeedModal(false)}
        >
          <SeedModalContent
            variants={modalContentVariants}
            initial="hidden"
            animate="visible"
            onClick={e => e.stopPropagation()}
          >
            <ModalTitle>Seed раскладки</ModalTitle>
            <ModalText>Введите seed для воспроизведения конкретной раскладки</ModalText>
            <SeedInput
              type="text"
              value={seedInput}
              onChange={e => setSeedInput(e.target.value.replace(/\D/g, ''))}
              placeholder="Введите число"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleApplySeed()}
            />
            <SeedModalButtons>
              <ModalButtonPrimary onClick={handleApplySeed}>Применить</ModalButtonPrimary>
              <ModalButton onClick={handleNewSeed}>Новый seed</ModalButton>
              {isBrowser && (
                canShare ? (
                  <ShareButtonGroup>
                    <ShareButton onClick={() => handleShare('seed')}>Поделиться</ShareButton>
                    <CopyLinkButton onClick={handleCopyLink} title="Скопировать ссылку">📋</CopyLinkButton>
                  </ShareButtonGroup>
                ) : (
                  <CopyOnlyButton onClick={handleCopyLink}>📋 Скопировать</CopyOnlyButton>
                )
              )}
              <ModalButtonSecondary onClick={() => setShowSeedModal(false)}>Отмена</ModalButtonSecondary>
            </SeedModalButtons>
          </SeedModalContent>
        </ModalOverlay>
      )}

      {/* Copied Toast */}
      <AnimatePresence>
        {showCopiedToast && (
          <CopiedToast
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            Скопировано!
          </CopiedToast>
        )}
      </AnimatePresence>
    </GameContainer>
  );
}
