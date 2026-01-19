import Matter from 'matter-js';

export interface BallLevel {
  radius: number;
  color: string;
  points: number;
  name: string;
  imageUrl: string;
}

export interface GameState {
  score: number;
  isGameOver: boolean;
  nextBallLevel: number;
  currentBallLevel: number;
  dropX: number;
  canDrop: boolean;
}

export interface BallUserData {
  level: number;
  isMerging?: boolean;
}

export type BallBody = Matter.Body & {
  userData: BallUserData;
};
