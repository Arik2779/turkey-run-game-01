// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between five screens: title, play, paused, caught and escaped.
//
// ?seed=N fixes the obstacle pattern. ?shot=start|play|end|escaped (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot. window.__turkeyRun exposes the live screen, score, distance and
// lives for play-testing.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_CORN, EVENT_ESCAPED, EVENT_HIT, EVENT_JUMP } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false, scene.escaped);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let escaped = false;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Live state for play-testing (and for anyone watching the page's script).
  window.__turkeyRun = {
    get screen() {
      return screen;
    },
    get score() {
      return Math.floor(world.state.score);
    },
    get distance() {
      return Math.floor(world.state.distance);
    },
    get lives() {
      return world.state.lives;
    },
    get escaped() {
      return escaped;
    },
    get best() {
      return best;
    },
  };

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    escaped = false;
    screen = SCREEN_PLAY;
    audio.gobble();
    announce('Running! Jump the ovens, dodge the knives, reach the forest.');
  }

  function endGame(wasEscape) {
    escaped = wasEscape;
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = Math.floor(world.state.score);
      saveBest(best);
    }
    if (wasEscape) {
      audio.escaped();
      announce(`Escaped! Score ${Math.floor(world.state.score)}. Best ${best}.`);
    } else {
      audio.caught();
      announce(`Caught. Score ${Math.floor(world.state.score)}. Best ${best}.`);
    }
  }

  function step(jump) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, false, true);
      return;
    }
    const events = world.step(STEP, jump, false);
    if (events & EVENT_JUMP) audio.jump();
    if (events & EVENT_CORN) audio.corn();
    if (events & EVENT_HIT) {
      audio.stumble();
      announce(world.state.lives === 1 ? 'Stumble! The farmer is right behind you — 1 life left.' : `Stumble! ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CAUGHT) endGame(false);
    else if (events & EVENT_ESCAPED) endGame(true);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One read of the input per frame: screen changes first, then the jump (if any)
    // rides on the first simulation step of this frame, exactly once.
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & (ACTION_JUMP | ACTION_CONFIRM) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_JUMP | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Running.');
    }
    const wantJump = (actions & ACTION_JUMP) !== 0 && screen === SCREEN_PLAY;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep && wantJump);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.muted, escaped);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Turkey Run. Press Space or click to run for it!');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
