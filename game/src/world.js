// The game's rules and state, with no drawing and no browser in it: the turkey
// runs on its own toward the forest, the farmer chases from behind, ovens, carving
// knives and hay bales roll in from the right, corn cobs are worth points. step()
// advances one fixed step and returns what happened as bit flags, so the caller can
// react (and play sounds) without the world knowing about screens. Nothing here
// allocates after createWorld returns.

import {
  CORN,
  CORN_SPAWN,
  ESCAPE_DISTANCE,
  FARMER,
  FIELD,
  HAY,
  KNIFE,
  LIVES,
  OVEN,
  PARTICLE_POOL,
  PLAYER,
  POOL_SIZE,
  PRESSURE_RATE,
  PRESSURE_START,
  PX_PER_METRE,
  SPAWN,
  SPEED,
} from './config.js';

export const KIND_OVEN = 0;
export const KIND_KNIFE = 1;
export const KIND_HAY = 2;
export const KIND_CORN = 3;

export const EVENT_JUMP = 1;
export const EVENT_CORN = 2;
export const EVENT_HIT = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ESCAPED = 16;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const player = {
    x: PLAYER.x,
    y: FIELD.groundY - PLAYER.height,
    width: PLAYER.width,
    height: PLAYER.height,
    vy: 0,
    onGround: true,
    jumps: 2,
    invulnerable: 0,
    runPhase: 0,
  };
  const farmer = { x: PLAYER.x - FARMER.startGap, y: FIELD.groundY - 84, width: 56, height: 84, runPhase: 0 };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_OVEN, x: 0, y: 0, width: 0, height: 0, passed: false });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#e8a33c', kind: 0 });
  }
  const state = {
    player,
    farmer,
    items,
    particles,
    score: 0,
    distance: 0,
    lives: LIVES,
    elapsed: 0,
    speed: SPEED.start,
    gap: FARMER.startGap,
    scroll: 0,
    spawnTimer: SPAWN.start,
    cornTimer: CORN_SPAWN.start,
    over: false,
    escaped: false,
  };

  function reset() {
    player.y = FIELD.groundY - PLAYER.height;
    player.vy = 0;
    player.onGround = true;
    player.jumps = 2;
    player.invulnerable = 0;
    player.runPhase = 0;
    farmer.x = PLAYER.x - FARMER.startGap;
    farmer.runPhase = 0;
    for (const item of items) item.active = false;
    for (const particle of particles) particle.active = false;
    state.score = 0;
    state.distance = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    state.speed = SPEED.start;
    state.gap = FARMER.startGap;
    state.scroll = 0;
    state.spawnTimer = SPAWN.start;
    state.cornTimer = CORN_SPAWN.start;
    state.over = false;
    state.escaped = false;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function freeParticle() {
    for (let index = 0; index < particles.length; index += 1) if (!particles[index].active) return particles[index];
    return null;
  }

  /** kind 0 = dust puff, 1 = feather, 2 = falling leaf. */
  function spawnParticle(x, y, vx, vy, life, size, color, kind) {
    const particle = freeParticle();
    if (particle === null) return;
    particle.active = true;
    particle.x = x;
    particle.y = y;
    particle.vx = vx;
    particle.vy = vy;
    particle.life = life;
    particle.maxLife = life;
    particle.size = size;
    particle.color = color;
    particle.kind = kind;
  }

  function burstFeathers() {
    for (let index = 0; index < 10; index += 1) {
      spawnParticle(
        player.x + player.width / 2 + (random() - 0.5) * 40,
        player.y + random() * player.height,
        (random() - 0.5) * 260,
        -random() * 180 - 40,
        0.7 + random() * 0.5,
        4 + random() * 4,
        ['#a0522d', '#d2691e', '#e8a33c'][index % 3],
        1,
      );
    }
  }

  function spawnObstacle() {
    const item = freeItem();
    if (item === null) return;
    const roll = random();
    item.active = true;
    item.passed = false;
    if (roll < 0.4) {
      item.kind = KIND_OVEN;
      item.width = OVEN.width;
      item.height = OVEN.height;
    } else if (roll < 0.75) {
      item.kind = KIND_KNIFE;
      item.width = KNIFE.width;
      item.height = KNIFE.height;
    } else {
      item.kind = KIND_HAY;
      item.width = HAY.width;
      item.height = HAY.height;
    }
    item.x = FIELD.width + 40;
    item.y = FIELD.groundY - item.height;
  }

  function spawnCorn() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_CORN;
    item.width = CORN.size;
    item.height = CORN.size;
    item.x = FIELD.width + 40;
    // Corn floats either at beak height or just above a jump's arc, never on the ground.
    item.y = random() < 0.5 ? FIELD.groundY - 110 : FIELD.groundY - 210;
    item.passed = false;
  }

  /**
   * One fixed step. `jump` is true on the frames the player pressed jump. With
   * `harmless` set (the title screen's backdrop) things scroll but nothing touches
   * the player and nothing scores.
   */
  function step(dt, jump, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.speed = Math.min(SPEED.max, SPEED.start + state.distance * SPEED.perMetre);
    const metres = (state.speed * dt) / PX_PER_METRE;
    state.distance += metres;
    if (!harmless) state.score += metres;
    state.scroll += state.speed * dt;
    player.runPhase += dt * (state.speed / 28);
    farmer.runPhase += dt * (state.speed / 30);

    // The turkey jumps — twice per airtime, so a second obstacle right behind the
    // first can still be cleared. Gravity pulls it back to the ground.
    if (jump && player.jumps > 0) {
      player.vy = -PLAYER.jumpSpeed;
      player.onGround = false;
      player.jumps -= 1;
      events |= EVENT_JUMP;
    }
    if (!player.onGround) {
      player.vy += PLAYER.gravity * dt;
      player.y += player.vy * dt;
      if (player.y >= FIELD.groundY - PLAYER.height) {
        player.y = FIELD.groundY - PLAYER.height;
        player.vy = 0;
        player.onGround = true;
        player.jumps = 2;
      }
    }
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);

    // Dust puffs at the turkey's feet while it runs on the ground.
    if (player.onGround && random() < 0.35) {
      spawnParticle(player.x + 6, FIELD.groundY - 4, -60 - random() * 60, -20 - random() * 40, 0.5, 3 + random() * 3, '#c98f3d', 0);
    }
    // Autumn leaves drift down across the field.
    if (random() < 0.06) {
      spawnParticle(random() * FIELD.width, -10, -30 - random() * 40, 40 + random() * 50, 4, 5 + random() * 4, ['#e07b39', '#e8a33c', '#c0392b'][Math.floor(random() * 3)], 2);
    }

    // The farmer: a stumble lunges him forward; clean running slowly opens the gap.
    // Late in a long run he starts closing in on his own, so no run lasts forever.
    if (!harmless) {
      state.gap = Math.min(FARMER.maxGap, state.gap + FARMER.recoverRate * dt);
      if (state.elapsed > PRESSURE_START) state.gap = Math.max(0, state.gap - dt * (state.elapsed - PRESSURE_START) * PRESSURE_RATE);
      farmer.x = player.x - state.gap;
      if (state.gap <= FARMER.catchGap) {
        state.over = true;
        state.escaped = false;
        return events | EVENT_CAUGHT;
      }
    }

    // Spawn waves: obstacles, then corn on its own timer.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnObstacle();
      const interval = Math.max(SPAWN.min, SPAWN.start - state.distance * SPAWN.shrinkPerMetre);
      state.spawnTimer += interval;
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnCorn();
      state.cornTimer += CORN_SPAWN.start + random() * CORN_SPAWN.jitter;
    }

    // Everything scrolls left at the run speed; the player stays put.
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.x -= state.speed * dt;
      if (item.x + item.width < -20) {
        item.active = false;
        continue;
      }
      if (!item.passed && item.x + item.width < player.x) {
        item.passed = true;
        if (item.kind !== KIND_CORN && !harmless) state.score += item.kind === KIND_OVEN ? OVEN.points : item.kind === KIND_KNIFE ? KNIFE.points : HAY.points;
      }
      if (harmless || !overlaps(item, player)) continue;
      if (item.kind === KIND_CORN) {
        item.active = false;
        state.score += CORN.points;
        events |= EVENT_CORN;
      } else if (player.invulnerable === 0) {
        item.active = false;
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        state.gap = Math.max(0, state.gap - FARMER.stumbleLunge);
        farmer.x = player.x - state.gap;
        burstFeathers();
        events |= EVENT_HIT;
        if (state.lives === 0 || state.gap <= FARMER.catchGap) {
          state.over = true;
          state.escaped = false;
          return events | EVENT_CAUGHT;
        }
      }
    }

    // Reaching the forest: escaped, and the run ends in triumph.
    if (!harmless && state.distance >= ESCAPE_DISTANCE) {
      state.over = true;
      state.escaped = true;
      return events | EVENT_ESCAPED;
    }

    // Particles drift and fade; a feather flutters, a leaf sways.
    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      if (particle.kind === 1) particle.vy += 320 * dt;
      if (particle.kind === 2) particle.x += Math.sin(state.elapsed * 3 + index) * 24 * dt;
    }

    return events;
  }

  reset();
  return { state, reset, step };
}
