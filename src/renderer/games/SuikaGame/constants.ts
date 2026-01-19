import { BallLevel } from './types';

// 11 ball levels (like in original Suika Game)
// Sorted by followers count (ascending)
export const BALL_LEVELS: BallLevel[] = [
  { radius: 17, color: '#FF6B6B', points: 1,   name: 'Spiritus_Unit', imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/b3ebcf12-dc66-43cb-8903-bb824f42fa0f-profile_image-300x300.jpeg' },
  { radius: 25, color: '#4ECDC4', points: 3,   name: 'EVG_On',        imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/0ec0286c-246e-413b-8ca1-4623d802d10d-profile_image-300x300.png' },
  { radius: 32, color: '#45B7D1', points: 6,   name: 'kuyanchuk',     imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/501245ef-1b32-41e4-94d4-3a354b519489-profile_image-300x300.png' },
  { radius: 40, color: '#96CEB4', points: 10,  name: 'gena_zogii',    imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/f1d1d3a2-205f-458d-9c9d-6984b49befa2-profile_image-300x300.png' },
  { radius: 52, color: '#FFEAA7', points: 15,  name: 'Fox1k_ru',      imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/9a9749ff-7c01-4f7a-935a-a999965372fc-profile_image-300x300.jpeg' },
  { radius: 63, color: '#DDA0DD', points: 21,  name: 'KiguDi',        imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/a808c3d8-b72f-4fbf-924f-394b0e43c503-profile_image-300x300.png' },
  { radius: 75, color: '#98D8C8', points: 28,  name: 'Ellis_Leaf',    imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/a79da802-b52f-48c6-89b8-37e078e19ef8-profile_image-300x300.png' },
  { radius: 87, color: '#F7DC6F', points: 36,  name: 'qvik_l',        imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/0d33e679-e919-4e0b-af0c-a3d1fc048bf4-profile_image-300x300.png' },
  { radius: 100, color: '#BB8FCE', points: 45, name: 'kururun_chan',  imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/57c88f23-d560-4d13-aa36-cee37a11727a-profile_image-300x300.png' },
  { radius: 115, color: '#85C1E9', points: 55, name: 'KurosakiSsora', imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/29fe8dec-9c2f-485a-884a-99690e84c0a9-profile_image-300x300.png' },
  { radius: 128, color: '#F1948A', points: 66, name: 'sonamint',      imageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/e8acab6b-51c3-4c4e-b37b-ece7edff52b3-profile_image-300x300.png' },
];

export const GAME_CONFIG = {
  containerWidth: 400,
  containerHeight: 600,
  wallThickness: 15,
  dropZoneY: 80,        // Drop zone height
  gameOverLineY: 100,   // Game over line
  spawnLevels: [0, 1, 2, 3, 4] as const, // Only small balls spawn
  dropCooldown: 500,    // ms between drops
  gameOverDelay: 2000,  // ms ball can be above line before game over
};

export const COLORS = {
  background: '#2C3E50',
  container: '#1a1a2e',
  wall: '#4a4a6a',
  dropLine: 'rgba(255, 255, 255, 0.3)',
  gameOverLine: 'rgba(255, 0, 0, 0.5)',
  text: '#ffffff',
  accent: '#FFD93D',
};
