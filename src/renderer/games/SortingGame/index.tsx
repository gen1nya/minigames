import { useState, useCallback, useRef, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';

// Types
interface Ring {
  color: string;
}

interface DifficultyConfig {
  pegs: number;
  height: number;
  colors: number;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'extreme' | 'insane';

interface SortingGameProps {
  onBack: () => void;
}

// Constants
const DIFFICULTY_LEVELS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: { pegs: 7, height: 7, colors: 5 },
  medium: { pegs: 8, height: 8, colors: 6 },
  hard: { pegs: 9, height: 9, colors: 7 },
  extreme: { pegs: 10, height: 10, colors: 8 },
  insane: { pegs: 14, height: 8, colors: 6 },
};

const ALL_COLORS = [
  '#f44336',
  '#ff9800',
  '#ffc107',
  '#4caf50',
  '#2196f3',
  '#9c27b0',
  '#e0e0e0',
  '#000000',
];

const DIFFICULTY_LABELS: Record<DifficultyLevel, { label: string; color: string }> = {
  easy: { label: 'Легко (7 столбцов, 5 цветов)', color: '#4caf50' },
  medium: { label: 'Средне (8 столбцов, 6 цветов)', color: '#ff9800' },
  hard: { label: 'Сложно (9 столбцов, 7 цветов)', color: '#f44336' },
  extreme: { label: 'Экстремально (10 столбцов, 8 цветов)', color: '#9c27b0' },
  insane: { label: 'Безумие (14 столбцов, 6 цветов × 2)', color: '#212121' },
};

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

const RingElement = styled.div<{ $color: string; $isTop: boolean; $selected: boolean }>`
  width: 46px;
  height: var(--ring-height);
  border-radius: 12px;
  background: ${props => props.$color};
  box-shadow: ${props =>
    props.$color === '#e0e0e0'
      ? '0 0 0 2px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'
      : '0 1px 0 rgba(255,255,255,0.6), 0 2px 0 rgba(0,0,0,0.35)'};

  ${props =>
    props.$isTop &&
    props.$selected &&
    css`
      animation: ${lift} 0.3s ease-in-out infinite alternate;
    `}
`;

const ModalOverlay = styled.div<{ $visible: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: ${props => (props.$visible ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const ModalContent = styled.div`
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

const DifficultyModalContent = styled.div`
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

// Helper functions
function deepCopyState(s: Ring[][]): Ring[][] {
  return s.map(peg => peg.map(r => ({ color: r.color })));
}

function createInitialState(config: DifficultyConfig, colors: string[]): Ring[][] {
  const totalSlots = (config.pegs - 2) * config.height;
  const ringsPool: Ring[] = [];

  for (let i = 0; i < totalSlots; i++) {
    ringsPool.push({ color: colors[i % colors.length] });
  }

  // Shuffle
  for (let i = ringsPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ringsPool[i], ringsPool[j]] = [ringsPool[j], ringsPool[i]];
  }

  const state: Ring[][] = Array.from({ length: config.pegs }, () => []);
  let idx = 0;
  for (let p = 0; p < config.pegs; p++) {
    if (p >= config.pegs - 2) continue;
    for (let h = 0; h < config.height; h++) {
      state[p].push(ringsPool[idx++]);
    }
  }

  return state;
}

function canMove(state: Ring[][], from: number, to: number, maxHeight: number): boolean {
  const source = state[from];
  const target = state[to];
  if (!source.length) return false;

  const topColor = source[source.length - 1].color;
  let blockSize = 1;
  for (let i = source.length - 2; i >= 0; i--) {
    if (source[i].color === topColor) blockSize++;
    else break;
  }

  if (target.length > 0) {
    const targetTopColor = target[target.length - 1].color;
    if (targetTopColor !== topColor) return false;
  }
  if (target.length + blockSize > maxHeight) return false;

  return true;
}

function tryMove(state: Ring[][], from: number, to: number, maxHeight: number): Ring[][] | null {
  const newState = deepCopyState(state);
  const source = newState[from];
  const target = newState[to];
  if (!source.length) return null;

  const topColor = source[source.length - 1].color;
  let blockSize = 1;
  for (let i = source.length - 2; i >= 0; i--) {
    if (source[i].color === topColor) blockSize++;
    else break;
  }

  if (target.length > 0) {
    const targetTopColor = target[target.length - 1].color;
    if (targetTopColor !== topColor) return null;
  }
  if (target.length + blockSize > maxHeight) return null;

  const moving = source.splice(source.length - blockSize, blockSize);
  newState[to].push(...moving);
  return newState;
}

function checkWin(state: Ring[][], numPegs: number, maxHeight: number, colors: string[]): boolean {
  const colorCounts: Record<string, number> = {};
  const pegsPerColor = (numPegs - 2) / colors.length;

  for (const peg of state) {
    if (!peg.length) continue;
    if (peg.length !== maxHeight) return false;

    const pegColor = peg[0].color;
    if (!peg.every(r => r.color === pegColor)) return false;

    colorCounts[pegColor] = (colorCounts[pegColor] || 0) + 1;
  }

  for (const color of colors) {
    if (colorCounts[color] !== pegsPerColor) return false;
  }
  return true;
}

function isDeadlocked(state: Ring[][], maxHeight: number): boolean {
  for (let from = 0; from < state.length; from++) {
    for (let to = 0; to < state.length; to++) {
      if (from === to) continue;
      if (canMove(state, from, to, maxHeight)) return false;
    }
  }
  return true;
}

function findHint(state: Ring[][], maxHeight: number): { from: number; to: number } | null {
  for (let from = 0; from < state.length; from++) {
    for (let to = 0; to < state.length; to++) {
      if (from === to) continue;
      if (canMove(state, from, to, maxHeight)) return { from, to };
    }
  }
  return null;
}

// Main Component
export default function SortingGame({ onBack }: SortingGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('extreme');
  const [state, setState] = useState<Ring[][]>([]);
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [history, setHistory] = useState<Ring[][][]>([]);
  const [message, setMessage] = useState('Нажми на столбик, потом на другой, чтобы перенести кольца.');
  const [modalText, setModalText] = useState<string | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [invalidPeg, setInvalidPeg] = useState<number | null>(null);

  const config = DIFFICULTY_LEVELS[difficulty];
  const colors = ALL_COLORS.slice(0, config.colors);

  const initGame = useCallback(() => {
    const newState = createInitialState(config, colors);
    setState(newState);
    setSelectedPeg(null);
    setHistory([]);
    setMessage('Нажми на столбик, потом на другой, чтобы перенести кольца.');
  }, [config, colors]);

  useEffect(() => {
    initGame();
  }, [difficulty]);

  const blinkInvalid = (index: number) => {
    setInvalidPeg(index);
    setTimeout(() => setInvalidPeg(null), 200);
  };

  const handlePegTap = (index: number) => {
    if (selectedPeg === null) {
      if (state[index].length === 0) {
        blinkInvalid(index);
        return;
      }
      setSelectedPeg(index);
    } else if (selectedPeg === index) {
      setSelectedPeg(null);
    } else {
      const from = selectedPeg;
      const to = index;
      const newState = tryMove(state, from, to, config.height);
      setSelectedPeg(null);

      if (newState) {
        setHistory(prev => {
          const newHistory = [...prev, deepCopyState(state)];
          if (newHistory.length > 200) newHistory.shift();
          return newHistory;
        });
        setState(newState);

        if (checkWin(newState, config.pegs, config.height, colors)) {
          setMessage('Победа! Все башни аккуратно отсортированы.');
          setModalText('Победа! Отличная сортировка!');
        } else if (isDeadlocked(newState, config.height)) {
          setMessage('Похоже, дедлок: ни одного доступного хода.');
          setModalText('Дедлок! Больше нет допустимых ходов.');
        } else {
          setMessage('Ход сделан.');
        }
      } else {
        blinkInvalid(to);
      }
    }
  };

  const handleUndo = () => {
    if (!history.length) return;
    const newHistory = [...history];
    const prevState = newHistory.pop()!;
    setHistory(newHistory);
    setState(prevState);
    setSelectedPeg(null);
    setMessage('Ход отменён.');
  };

  const handleHint = () => {
    const hint = findHint(state, config.height);
    if (!hint) {
      setModalText('Подсказок нет — ходов больше нет!');
    } else {
      setModalText(`Попробуй переместить со столбика ${hint.from + 1} на столбик ${hint.to + 1}`);
    }
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
        <HeaderButton onClick={initGame}>⟲ Перезапуск</HeaderButton>
      </Header>

      <GameArea>
        <PegsContainer $maxHeight={config.height}>
          {state.map((peg, pegIndex) => (
            <Peg
              key={pegIndex}
              $selected={selectedPeg === pegIndex}
              $invalid={invalidPeg === pegIndex}
              onClick={() => handlePegTap(pegIndex)}
            >
              <PegRod
                $selected={selectedPeg === pegIndex}
                $invalid={invalidPeg === pegIndex}
              />
              <PegInner>
                {peg.map((ring, ringIndex) => (
                  <RingElement
                    key={ringIndex}
                    $color={ring.color}
                    $isTop={ringIndex === peg.length - 1}
                    $selected={selectedPeg === pegIndex}
                  />
                ))}
              </PegInner>
            </Peg>
          ))}
        </PegsContainer>
      </GameArea>

      {/* Info Modal */}
      <ModalOverlay $visible={modalText !== null} onClick={() => setModalText(null)}>
        <ModalContent onClick={e => e.stopPropagation()}>
          <ModalText>{modalText}</ModalText>
          <ModalButton onClick={() => setModalText(null)}>OK</ModalButton>
        </ModalContent>
      </ModalOverlay>

      {/* Difficulty Modal */}
      <ModalOverlay $visible={showDifficultyModal} onClick={() => setShowDifficultyModal(false)}>
        <DifficultyModalContent onClick={e => e.stopPropagation()}>
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
    </GameContainer>
  );
}
