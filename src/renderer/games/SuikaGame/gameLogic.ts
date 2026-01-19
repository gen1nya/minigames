import Matter from 'matter-js';
import { BALL_LEVELS, GAME_CONFIG, COLORS } from './constants';
import { BallBody, GameState } from './types';
import { playDrop, playMerge, playGameOver } from './sounds';

// Preload all avatar images into cache
const imageCache: Map<string, HTMLImageElement> = new Map();
let imagesReady = false;

export async function preloadImages(): Promise<void> {
  const promises = BALL_LEVELS.map((level) => {
    return new Promise<void>((resolve) => {
      if (imageCache.has(level.imageUrl)) {
        resolve();
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.set(level.imageUrl, img);
        resolve();
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${level.imageUrl}`);
        resolve();
      };
      img.src = level.imageUrl;
    });
  });
  await Promise.all(promises);
  imagesReady = true;
}

export function getImageForLevel(levelIndex: number): HTMLImageElement | undefined {
  return imageCache.get(BALL_LEVELS[levelIndex].imageUrl);
}

export function areImagesLoaded(): boolean {
  return imagesReady;
}

interface MergeAction {
  bodyA: BallBody;
  bodyB: BallBody;
  level: number;
  x: number;
  y: number;
}

export class SuikaGameLogic {
  private engine: Matter.Engine;
  private render: Matter.Render;
  private runner: Matter.Runner;
  private walls: Matter.Body[] = [];
  private balls: BallBody[] = [];
  private previewBall: Matter.Body | null = null;
  private gameOverCheckInterval: number | null = null;
  private ballsAboveLine: Map<number, number> = new Map(); // ball id -> time above line
  private pendingMerges: MergeAction[] = [];
  private processingMerges = false;

  public state: GameState = {
    score: 0,
    isGameOver: false,
    nextBallLevel: 0,
    currentBallLevel: 0,
    dropX: GAME_CONFIG.containerWidth / 2,
    canDrop: true,
  };

  private onStateChange: (state: GameState) => void;
  private onScoreChange: (score: number) => void;
  private onGameOver: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    onStateChange: (state: GameState) => void,
    onScoreChange: (score: number) => void,
    onGameOver: () => void
  ) {
    this.onStateChange = onStateChange;
    this.onScoreChange = onScoreChange;
    this.onGameOver = onGameOver;

    // Create engine
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 },
    });

    // Create renderer
    this.render = Matter.Render.create({
      canvas,
      engine: this.engine,
      options: {
        width: GAME_CONFIG.containerWidth,
        height: GAME_CONFIG.containerHeight,
        wireframes: false,
        background: COLORS.container,
      },
    });

    // Create runner
    this.runner = Matter.Runner.create();

    this.createWalls();
    this.setupCollisionHandler();
    this.initializeGame();
    this.setupCustomRenderer();

    // Start the engine and renderer
    Matter.Render.run(this.render);
    Matter.Runner.run(this.runner, this.engine);

    // Start game over check
    this.startGameOverCheck();
  }

  private setupCustomRenderer(): void {
    // Draw avatar images after Matter.js renders
    Matter.Events.on(this.render, 'afterRender', () => {
      const ctx = this.render.context;

      // Draw images for all balls (including preview)
      const allBodies = [...this.balls];
      if (this.previewBall) {
        allBodies.push(this.previewBall as BallBody);
      }

      for (const ball of allBodies) {
        if (!ball.userData) continue;

        const level = ball.userData.level;
        const img = getImageForLevel(level);
        const radius = BALL_LEVELS[level].radius;
        const isPreview = ball === this.previewBall;

        if (img) {
          ctx.save();

          // Create circular clipping path
          ctx.beginPath();
          ctx.arc(ball.position.x, ball.position.y, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          // Draw image
          if (isPreview) {
            ctx.globalAlpha = 0.7;
          }
          ctx.drawImage(
            img,
            ball.position.x - radius,
            ball.position.y - radius,
            radius * 2,
            radius * 2
          );

          ctx.restore();

          // Draw border
          ctx.beginPath();
          ctx.arc(ball.position.x, ball.position.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = BALL_LEVELS[level].color;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }
    });
  }

  private createWalls(): void {
    const { containerWidth, containerHeight, wallThickness } = GAME_CONFIG;

    // Bottom wall
    const bottom = Matter.Bodies.rectangle(
      containerWidth / 2,
      containerHeight - wallThickness / 2,
      containerWidth,
      wallThickness,
      {
        isStatic: true,
        render: { fillStyle: COLORS.wall },
        friction: 0.5,
      }
    );

    // Left wall
    const left = Matter.Bodies.rectangle(
      wallThickness / 2,
      containerHeight / 2,
      wallThickness,
      containerHeight,
      {
        isStatic: true,
        render: { fillStyle: COLORS.wall },
        friction: 0.1,
      }
    );

    // Right wall
    const right = Matter.Bodies.rectangle(
      containerWidth - wallThickness / 2,
      containerHeight / 2,
      wallThickness,
      containerHeight,
      {
        isStatic: true,
        render: { fillStyle: COLORS.wall },
        friction: 0.1,
      }
    );

    this.walls = [bottom, left, right];
    Matter.Composite.add(this.engine.world, this.walls);
  }

  private initializeGame(): void {
    this.state.currentBallLevel = this.getRandomSpawnLevel();
    this.state.nextBallLevel = this.getRandomSpawnLevel();
    this.updatePreviewBall();
    this.notifyStateChange();
  }

  private getRandomSpawnLevel(): number {
    const levels = GAME_CONFIG.spawnLevels;
    return levels[Math.floor(Math.random() * levels.length)];
  }

  private updatePreviewBall(): void {
    // Remove old preview ball
    if (this.previewBall) {
      Matter.Composite.remove(this.engine.world, this.previewBall);
    }

    const level = BALL_LEVELS[this.state.currentBallLevel];

    this.previewBall = Matter.Bodies.circle(
      this.state.dropX,
      GAME_CONFIG.dropZoneY - level.radius,
      level.radius,
      {
        isStatic: true,
        isSensor: true,
        render: {
          fillStyle: 'transparent', // We draw avatar manually
          strokeStyle: level.color,
          lineWidth: 2,
        },
      }
    ) as BallBody;
    (this.previewBall as BallBody).userData = { level: this.state.currentBallLevel };

    Matter.Composite.add(this.engine.world, this.previewBall);
  }

  public setDropX(x: number): void {
    const level = BALL_LEVELS[this.state.currentBallLevel];
    const minX = GAME_CONFIG.wallThickness + level.radius;
    const maxX = GAME_CONFIG.containerWidth - GAME_CONFIG.wallThickness - level.radius;

    this.state.dropX = Math.max(minX, Math.min(maxX, x));

    if (this.previewBall) {
      Matter.Body.setPosition(this.previewBall, {
        x: this.state.dropX,
        y: GAME_CONFIG.dropZoneY - level.radius,
      });
    }

    this.notifyStateChange();
  }

  public dropBall(): void {
    if (!this.state.canDrop || this.state.isGameOver) return;

    this.state.canDrop = false;

    // Remove preview ball
    if (this.previewBall) {
      Matter.Composite.remove(this.engine.world, this.previewBall);
      this.previewBall = null;
    }

    // Create actual ball
    const levelIndex = this.state.currentBallLevel;
    const level = BALL_LEVELS[levelIndex];

    const ball = Matter.Bodies.circle(
      this.state.dropX,
      GAME_CONFIG.dropZoneY - level.radius,
      level.radius,
      {
        restitution: 0.3,
        friction: 0.5,
        frictionAir: 0.01,
        render: {
          fillStyle: 'transparent', // We draw avatar manually
          strokeStyle: level.color,
          lineWidth: 2,
        },
      }
    ) as BallBody;

    ball.userData = { level: levelIndex };
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);

    playDrop();

    // Set next ball
    this.state.currentBallLevel = this.state.nextBallLevel;
    this.state.nextBallLevel = this.getRandomSpawnLevel();

    // Cooldown before next drop
    setTimeout(() => {
      if (!this.state.isGameOver) {
        this.state.canDrop = true;
        this.updatePreviewBall();
        this.notifyStateChange();
      }
    }, GAME_CONFIG.dropCooldown);

    this.notifyStateChange();
  }

  private setupCollisionHandler(): void {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      const pairs = event.pairs;

      for (const pair of pairs) {
        const bodyA = pair.bodyA as BallBody;
        const bodyB = pair.bodyB as BallBody;

        // Skip if either is a wall or preview
        if (!bodyA.userData || !bodyB.userData) continue;

        // Skip if either is already merging
        if (bodyA.userData.isMerging || bodyB.userData.isMerging) continue;

        // Check if same level
        if (bodyA.userData.level === bodyB.userData.level) {
          const level = bodyA.userData.level;

          // Don't merge max level balls
          if (level >= BALL_LEVELS.length - 1) continue;

          // Mark as merging to prevent double merges
          bodyA.userData.isMerging = true;
          bodyB.userData.isMerging = true;

          // Calculate merge position (midpoint)
          const mergeX = (bodyA.position.x + bodyB.position.x) / 2;
          const mergeY = (bodyA.position.y + bodyB.position.y) / 2;

          // Queue the merge to be processed after collision handling
          this.pendingMerges.push({
            bodyA,
            bodyB,
            level,
            x: mergeX,
            y: mergeY,
          });
        }
      }

      // Process merges after collision event completes
      if (this.pendingMerges.length > 0 && !this.processingMerges) {
        this.processingMerges = true;
        setTimeout(() => this.processPendingMerges(), 0);
      }
    });
  }

  private processPendingMerges(): void {
    const merges = [...this.pendingMerges];
    this.pendingMerges = [];
    this.processingMerges = false;

    for (const merge of merges) {
      // Verify balls still exist and are still marked for merging
      if (!this.balls.includes(merge.bodyA) || !this.balls.includes(merge.bodyB)) {
        continue;
      }

      // Remove both balls
      this.removeBall(merge.bodyA);
      this.removeBall(merge.bodyB);

      // Create new larger ball
      this.createMergedBall(merge.level + 1, merge.x, merge.y);

      // Add points
      const newLevel = BALL_LEVELS[merge.level + 1];
      this.state.score += newLevel.points;
      this.onScoreChange(this.state.score);

      playMerge(merge.level + 1);
    }
  }

  private removeBall(ball: BallBody): void {
    const index = this.balls.indexOf(ball);
    if (index > -1) {
      this.balls.splice(index, 1);
    }
    this.ballsAboveLine.delete(ball.id);
    Matter.Composite.remove(this.engine.world, ball);
  }

  private createMergedBall(levelIndex: number, x: number, y: number): void {
    const level = BALL_LEVELS[levelIndex];

    const ball = Matter.Bodies.circle(x, y, level.radius, {
      restitution: 0.3,
      friction: 0.5,
      frictionAir: 0.01,
      render: {
        fillStyle: 'transparent',
        strokeStyle: level.color,
        lineWidth: 2,
      },
    }) as BallBody;

    ball.userData = { level: levelIndex };
    this.balls.push(ball);
    Matter.Composite.add(this.engine.world, ball);
  }

  private startGameOverCheck(): void {
    this.gameOverCheckInterval = window.setInterval(() => {
      if (this.state.isGameOver) return;

      const now = Date.now();
      const lineY = GAME_CONFIG.gameOverLineY;

      for (const ball of this.balls) {
        const ballTop = ball.position.y - BALL_LEVELS[ball.userData.level].radius;

        if (ballTop < lineY) {
          // Ball is above line
          if (!this.ballsAboveLine.has(ball.id)) {
            this.ballsAboveLine.set(ball.id, now);
          } else {
            const timeAbove = now - this.ballsAboveLine.get(ball.id)!;
            if (timeAbove > GAME_CONFIG.gameOverDelay) {
              this.triggerGameOver();
              return;
            }
          }
        } else {
          // Ball is below line
          this.ballsAboveLine.delete(ball.id);
        }
      }
    }, 100);
  }

  private triggerGameOver(): void {
    this.state.isGameOver = true;
    this.state.canDrop = false;

    if (this.previewBall) {
      Matter.Composite.remove(this.engine.world, this.previewBall);
      this.previewBall = null;
    }

    playGameOver();
    this.onGameOver();
    this.notifyStateChange();
  }

  private notifyStateChange(): void {
    this.onStateChange({ ...this.state });
  }

  public restart(): void {
    // Clear pending merges
    this.pendingMerges = [];
    this.processingMerges = false;

    // Clear all balls
    for (const ball of this.balls) {
      Matter.Composite.remove(this.engine.world, ball);
    }
    this.balls = [];
    this.ballsAboveLine.clear();

    // Remove preview ball
    if (this.previewBall) {
      Matter.Composite.remove(this.engine.world, this.previewBall);
      this.previewBall = null;
    }

    // Reset state
    this.state = {
      score: 0,
      isGameOver: false,
      nextBallLevel: 0,
      currentBallLevel: 0,
      dropX: GAME_CONFIG.containerWidth / 2,
      canDrop: true,
    };

    this.initializeGame();
    this.onScoreChange(0);
  }

  public destroy(): void {
    if (this.gameOverCheckInterval) {
      clearInterval(this.gameOverCheckInterval);
    }
    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
    Matter.Engine.clear(this.engine);
  }

  public getNextBallColor(): string {
    return BALL_LEVELS[this.state.nextBallLevel].color;
  }

  public getNextBallRadius(): number {
    return BALL_LEVELS[this.state.nextBallLevel].radius;
  }
}
