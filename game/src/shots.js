// The screenshot scenes behind ?shot=start|play|end|escaped. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (jump when an obstacle is close ahead, judged from the jump's own
// airtime and the run speed), so the frame is what a short game really looks like
// and the same seed always gives the same frame.
import { PLAYER, STEP } from './config.js';
import { EVENT_CAUGHT, EVENT_ESCAPED, KIND_CORN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const ESCAPED_LIMIT_SECONDS = 900;
/** How far ahead (px) the end-scene autopilot jumps: far too late, so it stumbles. */
const JUMP_AHEAD_END = 25;

/**
 * The nearest obstacle that can still hit the turkey: one whose far edge has not
 * passed the turkey's tail, and whose top is still above the turkey's feet. An
 * obstacle the turkey is already flying above is not a threat yet — the one behind
 * it is what the next jump is for.
 */
function threateningObstacle(state) {
  const player = state.player;
  let nearest = null;
  let nearestGap = Infinity;
  for (const item of state.items) {
    if (!item.active || item.kind === KIND_CORN) continue;
    if (item.x + item.width <= player.x) continue;
    if (player.y + player.height <= item.y) continue;
    const gap = item.x - (player.x + player.width);
    if (gap < -10 || gap >= nearestGap) continue;
    nearestGap = gap;
    nearest = item;
  }
  return { item: nearest, gap: nearestGap };
}

/**
 * Should the turkey jump now? In play mode the jump is timed from the jump's own
 * arc: rise(t) = jumpSpeed*t - gravity*t^2/2 stays above the obstacle's height
 * between two moments, and the turkey must be above it for the whole time the
 * obstacle overlaps it (from its front reaching the turkey's front to its far edge
 * passing the turkey's tail). So it takes off when the gap first drops below the
 * far end of that window. In end mode it waits until the obstacle is almost on it
 * and never spends the second jump, so it stumbles and gets caught, as a hurried
 * player is.
 */
export function autopilot(state, mode) {
  const player = state.player;
  const { item, gap } = threateningObstacle(state);
  if (item === null || gap <= 0) return false;
  if (mode === 'end') return player.onGround && gap < JUMP_AHEAD_END;
  if (player.onGround) {
    // The later moment the turkey is still above this obstacle's height.
    const disc = Math.sqrt(PLAYER.jumpSpeed * PLAYER.jumpSpeed - 2 * PLAYER.gravity * item.height);
    const latestTakeoff = ((PLAYER.jumpSpeed + disc) / PLAYER.gravity) * state.speed - item.width - PLAYER.width - 20;
    return gap < latestTakeoff;
  }
  // Second jump only as a rescue: already falling, still below the obstacle's top,
  // and the obstacle is close. Never spent while still rising over it.
  return player.jumps > 0 && player.vy > 0 && gap < 120 && player.y + player.height > item.y;
}

/**
 * Set `world` to the named scene (start, play, end or escaped; any other name is
 * start) and return the screen to draw over it, the best score to show and whether
 * the run ended in an escape.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'escaped') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, false, true);
    return { screen: SCREEN_TITLE, best: 0, escaped: false };
  }
  if (name === 'escaped') {
    for (let index = 0; index < ESCAPED_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, 'play'), false);
      if (events & EVENT_ESCAPED) break;
      if (events & EVENT_CAUGHT) break;
    }
    return { screen: SCREEN_OVER, best: Math.floor(world.state.score), escaped: world.state.escaped };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const mode = name === 'end' ? 'end' : 'play';
  for (let index = 0; index < limit / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state, mode), false) & EVENT_CAUGHT) break;
  }
  const over = world.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score), escaped: false };
}
