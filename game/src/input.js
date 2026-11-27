// Keyboard and pointer input. Held keys do nothing here (the turkey runs on its
// own); one-shot presses are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice.
// Space / ArrowUp / W / click = jump (and start / restart). P / Escape = pause. M = mute.

export const ACTION_JUMP = 1;
export const ACTION_CONFIRM = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;

const JUMP = new Set(['Space', 'ArrowUp', 'KeyW']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  // A click is a jump too: mouse-only players can play the whole game.
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_JUMP;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
