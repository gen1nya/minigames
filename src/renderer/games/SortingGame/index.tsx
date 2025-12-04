import { useState, useCallback, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import {
  DifficultyLevel,
  DIFFICULTY_LEVELS,
  DIFFICULTY_LABELS,
  SortingGameLogic,
  MoveResult,
} from './gameLogic';

interface SortingGameProps {
  onBack: () => void;
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
    props.$color === '#e5e5e5'
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

// Main Component
export default function SortingGame({ onBack }: SortingGameProps) {
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('extreme');
  const [game, setGame] = useState(() => new SortingGameLogic(difficulty));
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [message, setMessage] = useState('Нажми на столбик, потом на другой, чтобы перенести кольца.');
  const [modalText, setModalText] = useState<string | null>(null);
  const [showDifficultyModal, setShowDifficultyModal] = useState(false);
  const [invalidPeg, setInvalidPeg] = useState<number | null>(null);
  const [, forceUpdate] = useState({});

  // Create new game when difficulty changes
  useEffect(() => {
    setGame(new SortingGameLogic(difficulty));
    setSelectedPeg(null);
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
      const result = game.move(selectedPeg, index);
      setSelectedPeg(null);

      if (result === 'invalid') {
        blinkInvalid(index);
      } else {
        triggerUpdate();
        handleMoveResult(result);
      }
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
          {game.state.map((peg, pegIndex) => (
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
