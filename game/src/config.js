// Turkey Run — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 600 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Pixels of run per metre of distance shown in the HUD. */
export const PX_PER_METRE = 40;

/** Run this far (metres) and the turkey reaches the forest: escaped. */
export const ESCAPE_DISTANCE = 1500;

export const PLAYER = {
  x: 210,
  width: 64,
  height: 58,
  /** Upward speed when the turkey jumps, px/s. */
  jumpSpeed: 780,
  /** Pull back down, px/s^2. */
  gravity: 1400,
  /** Seconds of flashing safety after a stumble. */
  invulnerable: 1.6,
};

/** The farmer starts this far behind the turkey (px) and closes in on every stumble. */
export const FARMER = {
  startGap: 200,
  maxGap: 220,
  /** How far he lunges forward when the turkey stumbles, px. */
  stumbleLunge: 60,
  /** How fast the gap grows back while the turkey runs clean, px/s. */
  recoverRate: 26,
  /** The gap at which he is close enough to grab: caught. */
  catchGap: 26,
};

export const LIVES = 3;

export const SPEED = {
  start: 330,
  perMetre: 0.14,
  max: 640,
};

export const OVEN = { width: 96, height: 88, points: 5 };
export const KNIFE = { width: 34, height: 92, points: 5 };
export const HAY = { width: 78, height: 62, points: 5 };

export const CORN = { size: 26, points: 10 };

/**
 * Spawn pacing: seconds between obstacle waves. The interval never drops below the
 * jump's airtime plus a quarter of a second, so the turkey always lands with room
 * to jump again; the run gets harder because the scroll speeds up, not because the
 * obstacles pile up on each other.
 */
export const SPAWN = { start: 1.4, min: 1.35, shrinkPerMetre: 0.00004 };
export const CORN_SPAWN = { start: 1.6, jitter: 1.1 };

/** How many obstacles, corn cobs and particles can exist at once; pools are allocated once. */
export const POOL_SIZE = 48;
export const PARTICLE_POOL = 120;

/** Seconds of play before the farmer first starts closing in on his own (no stumble needed). */
export const PRESSURE_START = 60;
/** How fast he closes in per second past PRESSURE_START, px/s^2. */
export const PRESSURE_RATE = 0.35;

export const PALETTE = {
  backdrop: '#2b1a12',
  skyTop: '#f7b733',
  skyMid: '#fc9a4b',
  skyLow: '#f27059',
  sun: '#fff3b0',
  cloud: '#ffe8c2',
  hillFar: '#b5651d',
  hillNear: '#8a4b1f',
  barn: '#7a2e1d',
  barnRoof: '#4a1f14',
  tree: '#5d3a1a',
  leaf: '#e07b39',
  ground: '#7a4a21',
  groundTop: '#a06a35',
  grass: '#c98f3d',
  fence: '#5d3a1a',
  player: '#8a5230',
  playerDark: '#6b3d22',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c0392b', '#8e44ad'],
  head: '#d9c7a7',
  beak: '#e8a33c',
  wattle: '#e5534b',
  eye: '#1a1a1a',
  farmerShirt: '#3b6ea5',
  farmerPants: '#2e4a6b',
  farmerHat: '#d9b36c',
  farmerSkin: '#e8b98a',
  ovenBody: '#4a4a52',
  ovenDoor: '#2b2b31',
  ovenGlow: '#ff7b24',
  ovenKnob: '#c9ced6',
  knife: '#d7dde6',
  knifeEdge: '#f4f7fb',
  handle: '#7a4a26',
  hay: '#e0a83c',
  hayDark: '#b57f22',
  corn: '#f2c94c',
  cornHusk: '#7fae4c',
  panel: 'rgba(43, 26, 18, 0.92)',
  panelEdge: '#e8a33c',
  text: '#fff6e5',
  muted: '#e8c9a0',
  danger: '#ff5a4b',
  good: '#8fd14f',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'turkey-run.best';
