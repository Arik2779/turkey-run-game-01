// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Everything is flat canvas shapes: a sunset farm, a running turkey
// with a fanning tail, the farmer in pursuit, ovens, carving knives, hay bales and
// corn. Canvas text for the HUD and the panels. Text that holds a number is rebuilt
// only when the number changes, so a frame allocates nothing.
import { ESCAPE_DISTANCE, FARMER, FIELD, FONT, LIVES, PALETTE, PLAYER } from './config.js';
import { KIND_CORN, KIND_HAY, KIND_KNIFE, KIND_OVEN } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 800, top: 150, line: 34, bottom: 76 };
const HEART_SIZE = 22;
const HEART_GAP = 8;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const distanceLabel = cachedLabel('DISTANCE ');
  const finalScoreLabel = cachedLabel('Score ');
  const finalDistanceLabel = cachedLabel('Distance ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function roundRect(x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.arcTo(x + width, y, x + width, y + radius, radius);
    context.lineTo(x + width, y + height - radius);
    context.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    context.lineTo(x + radius, y + height);
    context.arcTo(x, y + height, x, y + height - radius, radius);
    context.lineTo(x, y + radius);
    context.arcTo(x, y, x + radius, y, radius);
    context.closePath();
  }

  /** The sunset farm behind everything: sky, sun, clouds, hills, a barn, trees, a fence. */
  function drawBackground(scroll) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, PALETTE.skyTop);
    gradient.addColorStop(0.55, PALETTE.skyMid);
    gradient.addColorStop(1, PALETTE.skyLow);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);

    // Low autumn sun, fixed in the sky.
    context.fillStyle = PALETTE.sun;
    context.beginPath();
    context.arc(1050, 130, 52, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 243, 176, 0.35)';
    context.beginPath();
    context.arc(1050, 130, 78, 0, Math.PI * 2);
    context.fill();

    // Clouds drift at a tenth of the run speed.
    context.fillStyle = PALETTE.cloud;
    const clouds = [[180, 90, 120], [560, 60, 90], [900, 150, 140], [1240, 80, 100]];
    for (const [cx, cy, width] of clouds) {
      const x = (((cx - scroll * 0.1) % (FIELD.width + 320)) + FIELD.width + 320) % (FIELD.width + 320) - 160;
      context.beginPath();
      context.ellipse(x, cy, width / 2, 20, 0, 0, Math.PI * 2);
      context.ellipse(x + 34, cy + 8, width / 3, 16, 0, 0, Math.PI * 2);
      context.fill();
    }

    // Far hill, then the near hill with the barn and trees on it.
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, 520);
    context.quadraticCurveTo(320, 430, 700, 500);
    context.quadraticCurveTo(1000, 560, 1280, 480);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.closePath();
    context.fill();

    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, 560);
    context.quadraticCurveTo(420, 500, 800, 556);
    context.quadraticCurveTo(1080, 590, 1280, 540);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.closePath();
    context.fill();

    // The barn the turkey escaped from, scrolling at a third of the run speed.
    const barnX = (((980 - scroll * 0.3) % (FIELD.width + 500)) + FIELD.width + 500) % (FIELD.width + 500) - 250;
    context.fillStyle = PALETTE.barn;
    context.fillRect(barnX, 420, 170, 120);
    context.fillStyle = PALETTE.barnRoof;
    context.beginPath();
    context.moveTo(barnX - 12, 424);
    context.lineTo(barnX + 85, 360);
    context.lineTo(barnX + 182, 424);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.ovenGlow;
    context.fillRect(barnX + 66, 470, 38, 70);
    context.fillStyle = PALETTE.barnRoof;
    context.fillRect(barnX + 66, 470, 38, 8);

    // Bare autumn trees, same slow layer as the barn.
    context.fillStyle = PALETTE.tree;
    for (const base of [140, 620, 1150]) {
      const treeX = (((base - scroll * 0.3) % (FIELD.width + 400)) + FIELD.width + 400) % (FIELD.width + 400) - 200;
      context.fillRect(treeX - 5, 470, 10, 90);
      context.beginPath();
      context.moveTo(treeX, 480);
      context.lineTo(treeX - 34, 420);
      context.lineTo(treeX - 12, 448);
      context.lineTo(treeX - 40, 400);
      context.lineTo(treeX, 440);
      context.lineTo(treeX + 40, 396);
      context.lineTo(treeX + 14, 446);
      context.lineTo(treeX + 36, 418);
      context.lineTo(treeX + 4, 480);
      context.closePath();
      context.fill();
      context.fillStyle = PALETTE.leaf;
      context.beginPath();
      context.arc(treeX - 30, 420, 12, 0, Math.PI * 2);
      context.arc(treeX + 26, 404, 10, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.tree;
    }

    // The ground and a fence that rushes past at full speed.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.groundTop;
    context.fillRect(0, FIELD.groundY, FIELD.width, 10);
    context.fillStyle = PALETTE.fence;
    const fenceOffset = scroll % 96;
    for (let x = -fenceOffset; x < FIELD.width + 96; x += 96) {
      context.fillRect(x, FIELD.groundY - 46, 8, 46);
    }
    context.fillRect(0, FIELD.groundY - 40, FIELD.width, 6);
    context.fillRect(0, FIELD.groundY - 22, FIELD.width, 6);
    // Grass tufts, also at full speed.
    context.strokeStyle = PALETTE.grass;
    context.lineWidth = 2;
    const tuftOffset = scroll % 70;
    for (let x = 20 - tuftOffset; x < FIELD.width; x += 70) {
      context.beginPath();
      context.moveTo(x, FIELD.groundY + 26);
      context.lineTo(x - 5, FIELD.groundY + 14);
      context.moveTo(x + 6, FIELD.groundY + 26);
      context.lineTo(x + 10, FIELD.groundY + 15);
      context.stroke();
    }
  }

  /** The oven the turkey must jump: a hot kitchen oven with a glowing door. */
  function drawOven(item) {
    context.fillStyle = PALETTE.ovenBody;
    roundRect(item.x, item.y, item.width, item.height, 8);
    context.fill();
    context.fillStyle = PALETTE.ovenDoor;
    roundRect(item.x + 10, item.y + 30, item.width - 20, item.height - 38, 5);
    context.fill();
    context.fillStyle = PALETTE.ovenGlow;
    roundRect(item.x + 18, item.y + 36, item.width - 36, item.height - 50, 4);
    context.fill();
    // Three flames licking the door window.
    context.fillStyle = '#ffd23e';
    for (let index = 0; index < 3; index += 1) {
      const flameX = item.x + 26 + index * 22;
      context.beginPath();
      context.moveTo(flameX, item.y + item.height - 8);
      context.quadraticCurveTo(flameX + 5, item.y + item.height - 30, flameX + 10, item.y + item.height - 8);
      context.closePath();
      context.fill();
    }
    context.fillStyle = PALETTE.ovenKnob;
    for (let index = 0; index < 3; index += 1) {
      context.beginPath();
      context.arc(item.x + 24 + index * 24, item.y + 16, 5, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.ovenBody;
    context.fillRect(item.x + item.width - 14, item.y - 20, 10, 20);
  }

  /** The carving knife, blade up out of the dirt, handle down. */
  function drawKnife(item) {
    context.save();
    context.translate(item.x + item.width / 2, item.y + item.height);
    context.rotate(-0.12);
    context.fillStyle = PALETTE.handle;
    roundRect(-8, -26, 16, 26, 5);
    context.fill();
    context.fillStyle = PALETTE.knife;
    context.beginPath();
    context.moveTo(-13, -26);
    context.lineTo(13, -26);
    context.lineTo(4, -item.height + 8);
    context.lineTo(-13, -item.height + 22);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.knifeEdge;
    context.beginPath();
    context.moveTo(13, -26);
    context.lineTo(4, -item.height + 8);
    context.lineTo(9, -item.height + 14);
    context.lineTo(13, -30);
    context.closePath();
    context.fill();
    context.restore();
  }

  /** A round hay bale with a spiral of straw. */
  function drawHay(item) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    context.fillStyle = PALETTE.hay;
    context.beginPath();
    context.arc(cx, cy, item.width / 2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.hayDark;
    context.lineWidth = 3;
    context.beginPath();
    for (let angle = 0; angle < Math.PI * 6; angle += 0.25) {
      const radius = (angle / (Math.PI * 6)) * (item.width / 2 - 4);
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      if (angle === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.stroke();
  }

  /** A corn cob in its husk, worth 10 points. */
  function drawCorn(item, time) {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2 + Math.sin(time * 3 + item.x * 0.05) * 3;
    context.fillStyle = PALETTE.cornHusk;
    context.beginPath();
    context.moveTo(cx - 12, cy + 4);
    context.lineTo(cx - 20, cy + 16);
    context.lineTo(cx - 8, cy + 12);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(cx + 12, cy + 4);
    context.lineTo(cx + 20, cy + 16);
    context.lineTo(cx + 8, cy + 12);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.corn;
    context.beginPath();
    context.ellipse(cx, cy - 2, 11, 14, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#d9a91f';
    context.lineWidth = 1.5;
    for (let row = -8; row <= 8; row += 5) {
      context.beginPath();
      context.moveTo(cx - 9, cy + row);
      context.lineTo(cx + 9, cy + row);
      context.stroke();
    }
  }

  /** The turkey, facing right: fanning tail, brown body, head, beak and wattle, running legs. */
  function drawTurkey(player, time) {
    const cx = player.x + player.width / 2;
    const base = player.y + player.height;
    const legSwing = player.onGround ? Math.sin(player.runPhase * 2) * 10 : 6;
    const bob = player.onGround ? Math.abs(Math.sin(player.runPhase * 2)) * -3 : 0;

    // Legs, mid-stride.
    context.strokeStyle = PALETTE.beak;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(cx - 8, base - 8 + bob);
    context.lineTo(cx - 8 + legSwing, base + 2);
    context.moveTo(cx + 8, base - 8 + bob);
    context.lineTo(cx + 8 - legSwing, base + 2);
    context.stroke();

    // Tail fan: five feathers behind the body.
    for (let index = 0; index < 5; index += 1) {
      const angle = -Math.PI / 2 + (index - 2) * 0.42;
      const featherX = cx - 22 + Math.cos(angle) * 30;
      const featherY = base - 34 + bob + Math.sin(angle) * 30;
      context.fillStyle = PALETTE.tail[index];
      context.beginPath();
      context.ellipse(featherX, featherY, 9, 20, angle + Math.PI / 2, 0, Math.PI * 2);
      context.fill();
    }

    // Body.
    context.fillStyle = PALETTE.player;
    context.beginPath();
    context.ellipse(cx, base - 26 + bob, 30, 24, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.playerDark;
    context.beginPath();
    context.ellipse(cx - 6, base - 18 + bob, 18, 12, 0, 0, Math.PI * 2);
    context.fill();

    // Wing, flapping gently while running, tucked while jumping.
    const wingAngle = player.onGround ? Math.sin(player.runPhase * 2) * 0.25 : -0.5;
    context.save();
    context.translate(cx - 2, base - 28 + bob);
    context.rotate(wingAngle);
    context.fillStyle = PALETTE.playerDark;
    context.beginPath();
    context.ellipse(-4, 2, 16, 9, -0.3, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Head, beak, wattle and eye.
    context.fillStyle = PALETTE.head;
    context.beginPath();
    context.arc(cx + 24, base - 52 + bob, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(cx + 32, base - 54 + bob);
    context.lineTo(cx + 44, base - 50 + bob);
    context.lineTo(cx + 32, base - 47 + bob);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(cx + 30, base - 42 + bob, 4, 7, 0.2, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.eye;
    context.beginPath();
    context.arc(cx + 27, base - 55 + bob, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  /** The farmer, sprinting in from the left with his arm reaching for the turkey. */
  function drawFarmer(farmer) {
    if (farmer.x + farmer.width < 0 || farmer.x > FIELD.width) return;
    const cx = farmer.x + farmer.width / 2;
    const base = farmer.y + farmer.height;
    const legSwing = Math.sin(farmer.runPhase * 2) * 12;
    const bob = Math.abs(Math.sin(farmer.runPhase * 2)) * -3;

    // Legs.
    context.strokeStyle = PALETTE.farmerPants;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(cx - 6, base - 34 + bob);
    context.lineTo(cx - 6 + legSwing, base);
    context.moveTo(cx + 6, base - 34 + bob);
    context.lineTo(cx + 6 - legSwing, base);
    context.stroke();

    // Body: shirt and overalls.
    context.fillStyle = PALETTE.farmerShirt;
    roundRect(cx - 20, base - 66 + bob, 40, 34, 8);
    context.fill();
    context.fillStyle = PALETTE.farmerPants;
    context.fillRect(cx - 16, base - 40 + bob, 32, 12);

    // Reaching arm, grabbing toward the turkey.
    context.strokeStyle = PALETTE.farmerSkin;
    context.lineWidth = 7;
    context.beginPath();
    context.moveTo(cx + 12, base - 56 + bob);
    context.lineTo(cx + 34, base - 48 + bob + Math.sin(farmer.runPhase * 2) * 3);
    context.stroke();
    // Back arm pumping.
    context.beginPath();
    context.moveTo(cx - 14, base - 56 + bob);
    context.lineTo(cx - 30, base - 40 + bob);
    context.stroke();

    // Head and straw hat.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(cx + 6, base - 76 + bob, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(cx + 6, base - 84 + bob, 24, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(cx + 6, base - 86 + bob, 11, Math.PI, 0);
    context.fill();
    // Moustache.
    context.fillStyle = '#3a2a1a';
    context.fillRect(cx + 10, base - 70 + bob, 12, 4);
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      const alpha = Math.max(0, particle.life / particle.maxLife);
      context.globalAlpha = particle.kind === 0 ? alpha * 0.6 : alpha;
      context.fillStyle = particle.color;
      if (particle.kind === 1) {
        context.beginPath();
        context.ellipse(particle.x, particle.y, particle.size, particle.size * 0.6, particle.life * 4, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  function drawField(state) {
    drawBackground(state.scroll);
    const time = state.elapsed;
    for (const item of state.items) {
      if (!item.active) continue;
      if (item.kind === KIND_OVEN) drawOven(item);
      else if (item.kind === KIND_KNIFE) drawKnife(item);
      else if (item.kind === KIND_HAY) drawHay(item);
      else drawCorn(item, time);
    }
    drawFarmer(state.farmer);
    const player = state.player;
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) drawTurkey(player, time);
    drawParticles(state);
  }

  function drawHeart(x, y, filled) {
    context.fillStyle = filled ? '#ff5a4b' : 'rgba(255, 246, 229, 0.25)';
    context.strokeStyle = 'rgba(43, 26, 18, 0.8)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y + 7);
    context.bezierCurveTo(x - 11, y - 3, x - 6, y - 12, x, y - 5);
    context.bezierCurveTo(x + 6, y - 12, x + 11, y - 3, x, y + 7);
    context.closePath();
    context.fill();
    context.stroke();
  }

  function drawHud(state, muted) {
    // A dark strip behind the whole top bar, so the HUD stays readable over the
    // bright sky, the sun and the drifting clouds.
    context.fillStyle = 'rgba(43, 26, 18, 0.45)';
    context.fillRect(0, 0, FIELD.width, 100);
    context.textBaseline = 'top';
    text(scoreLabel(Math.floor(state.score)), 24, 18, 30, PALETTE.text, 'left');
    text(distanceLabel(`${Math.floor(state.distance)}m`), 24, 54, 22, PALETTE.muted, 'left');

    // Freedom progress: how far to the forest at 1500m.
    const barX = FIELD.width / 2 - 180;
    const barY = 22;
    const progress = Math.min(1, state.distance / ESCAPE_DISTANCE);
    text('FREEDOM', FIELD.width / 2, barY - 2, 16, PALETTE.muted, 'center');
    context.fillStyle = 'rgba(43, 26, 18, 0.55)';
    roundRect(barX, barY + 20, 360, 14, 7);
    context.fill();
    context.fillStyle = PALETTE.good;
    if (progress > 0) {
      roundRect(barX, barY + 20, 360 * progress, 14, 7);
      context.fill();
    }
    // A little pine tree marks the forest at the end of the bar.
    context.fillStyle = '#2e7d32';
    context.beginPath();
    context.moveTo(barX + 376, barY + 8);
    context.lineTo(barX + 366, barY + 26);
    context.lineTo(barX + 386, barY + 26);
    context.closePath();
    context.fill();
    context.fillRect(barX + 374, barY + 26, 4, 6);

    // Lives as hearts, top right.
    const firstHeart = FIELD.width - 24 - LIVES * (HEART_SIZE + HEART_GAP) + HEART_GAP;
    text('LIVES', firstHeart - 14, 18, 22, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(firstHeart + life * (HEART_SIZE + HEART_GAP) + HEART_SIZE / 2, 30, life < state.lives);
    }

    // Farmer meter: how close he is behind the turkey.
    const meterX = FIELD.width - 24 - 220;
    const meterY = 64;
    const closeness = 1 - state.gap / FARMER.maxGap;
    text('FARMER', meterX - 8, meterY - 2, 16, closeness > 0.75 ? PALETTE.danger : PALETTE.muted, 'right');
    context.fillStyle = 'rgba(43, 26, 18, 0.55)';
    roundRect(meterX, meterY + 16, 220, 12, 6);
    context.fill();
    context.fillStyle = closeness > 0.75 ? PALETTE.danger : closeness > 0.45 ? PALETTE.ovenGlow : PALETTE.good;
    if (closeness > 0.02) {
      roundRect(meterX, meterY + 16, 220 * closeness, 12, 6);
      context.fill();
    }

    if (muted) text('MUTED (M)', 24, FIELD.height - 34, 16, PALETTE.muted, 'left');
  }

  function drawPanel(title, lines, prompt, titleColor) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRect(x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    roundRect(x, y, PANEL.width, height, 16);
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, titleColor ?? PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 24, PALETTE.corn, 'center');
  }

  const TITLE_LINES = [
    'Thanksgiving dinner is tonight — and YOU are the main course.',
    'Jump the ovens. Dodge the carving knives. Grab the corn.',
    'Outrun the farmer all the way to the forest, 1500m away.',
    'Space / ↑ / Click to jump · P to pause · M to mute',
    '',
  ];
  const PAUSED_LINES = ['The farmer waits for no turkey.'];
  const CAUGHT_LINES = ['', '', 'The farmer finally caught up with you.'];
  const ESCAPED_LINES = ['', '', 'You reached the forest. Thanksgiving is cancelled!'];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted, escaped) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('TURKEY RUN', TITLE_LINES, 'Press Space or click to run for it!');
      return;
    }
    drawHud(state, muted);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to keep running');
    else if (screen === SCREEN_OVER) {
      if (escaped) {
        ESCAPED_LINES[0] = finalScoreLabel(Math.floor(state.score));
        ESCAPED_LINES[1] = finalDistanceLabel(`${Math.floor(state.distance)}m  ·  Best ${best}`);
        drawPanel('ESCAPED!', ESCAPED_LINES, 'Press Space or click to run again', PALETTE.good);
      } else {
        CAUGHT_LINES[0] = finalScoreLabel(Math.floor(state.score));
        CAUGHT_LINES[1] = finalDistanceLabel(`${Math.floor(state.distance)}m  ·  Best ${best}`);
        drawPanel('CAUGHT!', CAUGHT_LINES, 'Press Space or click to run again', PALETTE.danger);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
