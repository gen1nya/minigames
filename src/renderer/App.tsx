import { useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import SortingGame from './games/SortingGame';
import GradientGame from './games/GradientGame';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #eee;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }
`;

const Container = styled.div`
  text-align: center;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  background: linear-gradient(90deg, #00d4ff, #7b2cbf);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #aaa;
  margin-bottom: 2rem;
`;

const GamesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
`;

const GameCard = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: translateY(-4px);
    border-color: rgba(0, 212, 255, 0.5);
  }

  &:active {
    transform: translateY(-2px);
  }
`;

const GameIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const GameTitle = styled.h3`
  color: #fff;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
`;

const GameDescription = styled.p`
  color: #888;
  font-size: 0.9rem;
`;

type Screen = 'home' | 'sorting-game' | 'gradient-game';

function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'sorting-game') {
    return (
      <>
        <GlobalStyle />
        <SortingGame onBack={() => setScreen('home')} />
      </>
    );
  }

  if (screen === 'gradient-game') {
    return (
      <>
        <GlobalStyle />
        <GradientGame onBack={() => setScreen('home')} />
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>Minigames</Title>
        <Subtitle>Выбери игру</Subtitle>
        <GamesGrid>
          <GameCard onClick={() => setScreen('sorting-game')}>
            <GameIcon>🗼</GameIcon>
            <GameTitle>Color Tower Puzzle</GameTitle>
            <GameDescription>Отсортируй кольца по цветам на столбиках</GameDescription>
          </GameCard>
          <GameCard onClick={() => setScreen('gradient-game')}>
            <GameIcon>🎨</GameIcon>
            <GameTitle>Gradient Puzzle</GameTitle>
            <GameDescription>Собери красивый градиент из перемешанных плиток</GameDescription>
          </GameCard>
        </GamesGrid>
      </Container>
    </>
  );
}

export default App;
