import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createGlobalStyle } from 'styled-components';
import SortingGame from './games/SortingGame';

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    min-height: 100vh;
  }

  #root {
    min-height: 100vh;
  }
`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalStyle />
    <SortingGame onBack={() => window.history.back()} />
  </StrictMode>
);
