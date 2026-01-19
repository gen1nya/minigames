import React, { useRef, useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { SuikaGameLogic, preloadImages } from './gameLogic';
import { GAME_CONFIG, COLORS, BALL_LEVELS } from './constants';
import { GameState } from './types';
import { getTopScore, saveHighScore, isNewHighScore, getHighScores } from './storage';
import { setMuted, getMuted } from './sounds';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  background: ${COLORS.background};
  padding: 20px;
  box-sizing: border-box;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: ${GAME_CONFIG.containerWidth}px;
  margin-bottom: 10px;

  @media (max-width: 450px) {
    width: 100%;
    max-width: ${GAME_CONFIG.containerWidth}px;
  }
`;

const BackButton = styled.button`
  background: transparent;
  border: 2px solid ${COLORS.text};
  color: ${COLORS.text};
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.text};
    color: ${COLORS.background};
  }
`;

const ScoreContainer = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const ScoreBox = styled.div`
  text-align: center;
  color: ${COLORS.text};
`;

const ScoreLabel = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;

const ScoreValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: ${COLORS.accent};
`;

const GameArea = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const CanvasContainer = styled.div`
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
`;

const GameOverLine = styled.div`
  position: absolute;
  top: ${GAME_CONFIG.gameOverLineY}px;
  left: 0;
  right: 0;
  height: 2px;
  background: ${COLORS.gameOverLine};
  pointer-events: none;
  z-index: 10;

  &::after {
    content: 'DANGER';
    position: absolute;
    right: 5px;
    top: -10px;
    font-size: 10px;
    color: rgba(255, 0, 0, 0.7);
  }
`;

const NextBallPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  color: ${COLORS.text};
  height: 50px;
`;

const NextBallLabel = styled.span`
  font-size: 14px;
  opacity: 0.7;
`;

const NextBallContainer = styled.div`
  position: relative;
  width: 40px;
  height: 40px;
`;

const NextBallCircle = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  object-fit: cover;
`;

const NextBallLevel = styled.div`
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: ${COLORS.accent};
  color: ${COLORS.background};
  font-size: 10px;
  font-weight: bold;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LoadingScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
`;

const LoadingText = styled.div`
  color: ${COLORS.text};
  font-size: 18px;
  opacity: 0.8;
`;

const Controls = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 15px;
`;

const ControlButton = styled.button`
  background: ${COLORS.wall};
  border: none;
  color: ${COLORS.text};
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    background: ${COLORS.accent};
    color: ${COLORS.background};
  }
`;

const GameOverOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COLORS.text};
  font-size: 24px;
  font-weight: bold;
  pointer-events: none;
  z-index: 5;
`;

const ScoreBoard = styled.div`
  width: ${GAME_CONFIG.containerWidth}px;
  margin-top: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 15px;

  @media (max-width: 450px) {
    width: 100%;
    max-width: ${GAME_CONFIG.containerWidth}px;
  }
`;

const ScoreBoardTitle = styled.div`
  color: ${COLORS.text};
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
  opacity: 0.8;
`;

const ScoreBoardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const ScoreBoardItem = styled.div<{ $highlight?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${props => props.$highlight ? 'rgba(255, 217, 61, 0.2)' : 'rgba(255, 255, 255, 0.03)'};
  border-radius: 6px;
  color: ${COLORS.text};
  font-size: 14px;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
`;

const ModalContent = styled.div`
  background: ${COLORS.container};
  padding: 30px;
  border-radius: 15px;
  text-align: center;
  color: ${COLORS.text};
  min-width: 280px;
`;

const ModalTitle = styled.h2`
  margin: 0 0 10px 0;
  color: ${COLORS.accent};
`;

const ModalScore = styled.div`
  font-size: 48px;
  font-weight: bold;
  margin: 20px 0;
`;

const NewHighScore = styled.div`
  color: ${COLORS.accent};
  font-size: 18px;
  margin-bottom: 15px;
`;

const HighScoresList = styled.div`
  margin: 20px 0;
  text-align: left;
`;

const HighScoreItem = styled.div<{ $isNew?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: 5px 10px;
  background: ${props => props.$isNew ? 'rgba(255, 217, 61, 0.2)' : 'transparent'};
  border-radius: 5px;
  margin: 2px 0;
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
`;

const ModalButton = styled.button<{ $primary?: boolean }>`
  background: ${props => props.$primary ? COLORS.accent : COLORS.wall};
  color: ${props => props.$primary ? COLORS.background : COLORS.text};
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

interface SuikaGameProps {
  onBack: () => void;
}

export const SuikaGame: React.FC<SuikaGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SuikaGameLogic | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isGameOver: false,
    nextBallLevel: 0,
    currentBallLevel: 0,
    dropX: GAME_CONFIG.containerWidth / 2,
    canDrop: true,
  });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(getTopScore());
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [highScores, setHighScores] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(getMuted());

  // Use ref to avoid recreating handleGameOver on score change
  const scoreRef = useRef(score);
  scoreRef.current = score;

  // Preload images on mount
  useEffect(() => {
    preloadImages().then(() => {
      setImagesLoaded(true);
    });
  }, []);

  const handleGameOver = useCallback(() => {
    const currentScore = scoreRef.current;
    setFinalScore(currentScore);
    setIsNewRecord(isNewHighScore(currentScore));
    const newScores = saveHighScore(currentScore);
    setHighScores(newScores);
    setHighScore(newScores[0] || 0);
    setShowGameOver(true);
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !imagesLoaded) return;

    const game = new SuikaGameLogic(
      canvasRef.current,
      setGameState,
      setScore,
      handleGameOver
    );

    gameRef.current = game;

    return () => {
      game.destroy();
    };
  }, [handleGameOver, imagesLoaded]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameRef.current || gameState.isGameOver) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    gameRef.current.setDropX(x);
  }, [gameState.isGameOver]);

  const handleClick = useCallback(() => {
    if (!gameRef.current || gameState.isGameOver) return;
    gameRef.current.dropBall();
  }, [gameState.isGameOver]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!gameRef.current || gameState.isGameOver) return;
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.touches[0].clientX - rect.left;
    gameRef.current.setDropX(x);
  }, [gameState.isGameOver]);

  const handleTouchEnd = useCallback(() => {
    if (!gameRef.current || gameState.isGameOver) return;
    gameRef.current.dropBall();
  }, [gameState.isGameOver]);

  const handleRestart = useCallback(() => {
    if (gameRef.current) {
      gameRef.current.restart();
      setScore(0);
      setShowGameOver(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMuted(newMuted);
  }, [isMuted]);

  const [shareButtonText, setShareButtonText] = useState('Share');

  // Check if Web Share API is available (mobile)
  const canNativeShare = typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof window !== 'undefined' &&
    !window.navigator.userAgent.includes('Electron');

  const getShareText = useCallback(() => {
    return `🍉 Suika Game: ${finalScore} points!\n\nCan you beat my score?`;
  }, [finalScore]);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    // Try modern Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        console.log('Clipboard API failed:', e);
      }
    }

    // Fallback: execCommand
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (e) {
      console.log('execCommand failed:', e);
      return false;
    }
  }, []);

  const handleShare = useCallback(async () => {
    const text = getShareText();

    if (canNativeShare) {
      // Use native share on mobile
      try {
        await navigator.share({ text });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Copy to clipboard
    const success = await copyToClipboard(text);
    if (success) {
      setShareButtonText('Copied!');
    } else {
      setShareButtonText('Failed');
    }
    setTimeout(() => setShareButtonText('Share'), 2000);
  }, [canNativeShare, getShareText, copyToClipboard]);

  // Get current high scores for display
  const displayScores = showGameOver ? highScores : getHighScores();

  // Show loading screen while images are loading
  if (!imagesLoaded) {
    return (
      <Container>
        <LoadingScreen>
          <LoadingText>Loading avatars...</LoadingText>
        </LoadingScreen>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <BackButton onClick={onBack}>Back</BackButton>
        <ScoreContainer>
          <ScoreBox>
            <ScoreLabel>Score</ScoreLabel>
            <ScoreValue>{score}</ScoreValue>
          </ScoreBox>
          <ScoreBox>
            <ScoreLabel>Best</ScoreLabel>
            <ScoreValue>{highScore}</ScoreValue>
          </ScoreBox>
        </ScoreContainer>
      </Header>

      <GameArea>
        <NextBallPreview>
          <NextBallLabel>Next:</NextBallLabel>
          <NextBallContainer>
            <NextBallCircle
              src={BALL_LEVELS[gameState.nextBallLevel].imageUrl}
              alt={BALL_LEVELS[gameState.nextBallLevel].name}
            />
            <NextBallLevel>{gameState.nextBallLevel + 1}</NextBallLevel>
          </NextBallContainer>
        </NextBallPreview>

        <CanvasContainer ref={containerRef}>
          <canvas
            ref={canvasRef}
            width={GAME_CONFIG.containerWidth}
            height={GAME_CONFIG.containerHeight}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <GameOverLine />
          {gameState.isGameOver && <GameOverOverlay>Game Over</GameOverOverlay>}
        </CanvasContainer>

        <Controls>
          <ControlButton onClick={handleRestart}>Restart</ControlButton>
          <ControlButton onClick={toggleMute}>
            {isMuted ? 'Unmute' : 'Mute'}
          </ControlButton>
        </Controls>
      </GameArea>

      {displayScores.length > 0 && (
        <ScoreBoard>
          <ScoreBoardTitle>High Scores</ScoreBoardTitle>
          <ScoreBoardList>
            {displayScores.map((s, i) => (
              <ScoreBoardItem key={i} $highlight={s === score && score > 0}>
                <span>#{i + 1}</span>
                <span>{s}</span>
              </ScoreBoardItem>
            ))}
          </ScoreBoardList>
        </ScoreBoard>
      )}

      {showGameOver && (
        <Modal>
          <ModalContent>
            <ModalTitle>Game Over!</ModalTitle>
            <ModalScore>{finalScore}</ModalScore>
            {isNewRecord && <NewHighScore>New High Score!</NewHighScore>}

            <ModalButtons>
              <ModalButton onClick={handleShare}>
                {shareButtonText}
              </ModalButton>
              <ModalButton onClick={onBack}>Menu</ModalButton>
              <ModalButton $primary onClick={handleRestart}>
                Play Again
              </ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

export default SuikaGame;
