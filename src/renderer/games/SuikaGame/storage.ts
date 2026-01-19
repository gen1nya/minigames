const STORAGE_KEY = 'suika-game-highscores';
const MAX_SCORES = 5;

export function getHighScores(): number[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const scores = JSON.parse(stored);
    return Array.isArray(scores) ? scores.slice(0, MAX_SCORES) : [];
  } catch {
    return [];
  }
}

export function saveHighScore(score: number): number[] {
  const scores = getHighScores();
  scores.push(score);
  scores.sort((a, b) => b - a);
  const topScores = scores.slice(0, MAX_SCORES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
  return topScores;
}

export function isNewHighScore(score: number): boolean {
  const scores = getHighScores();
  if (scores.length < MAX_SCORES) return score > 0;
  return score > scores[scores.length - 1];
}

export function getTopScore(): number {
  const scores = getHighScores();
  return scores.length > 0 ? scores[0] : 0;
}
