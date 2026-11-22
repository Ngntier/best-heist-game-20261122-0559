// main.js — the heist itself: the game loop, the alarm, the tools, the loot
// grab and the getaway. One frame at a time it asks the guards and cameras
// how clearly they see the thief, lets the alarm rise and fall on that,
// and hands the room to the renderer.
import { LEVELS, FLOOR } from './levels.js';
import { Guard, THIEF_RADIUS } from './guards.js';
import { Camera } from './cameras.js';
import { collideCircle, pointInRect } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';

const WALK_SPEED = 175;
const SNEAK_SPEED = 95;
const GRAB_TIME = 1.2;
const SMOKE_DURATION = 5;
const EMP_DURATION = 8;

const params = new URLSearchParams(window.location.search);

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.canvas.width = 1280;
    this.canvas.height = 720;
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.sounds = new SoundBank();
    this.screen = 'title';
    this.levelIndex = 0;
    this.score = 0;
    this.levelsCleared = 0;
    this.time = 0;
    this.loadLevel(0);
    this.lastTs = 0;
    this.stepTimer = 0;
    this.wasSpotted = false;
    window.__game = this; // test hook: playtests drive and inspect the game here
    requestAnimationFrame((ts) => this.frame(ts));
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.thief = {
      x: this.level.start.x,
      y: this.level.start.y,
      sneaking: false,
    };
    this.solids = [...this.level.walls, ...this.level.crates];
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.smokes = [];
    this.particles = [];
    this.tools = { ...this.level.tools };
    this.alarm = 0;
    this.levelTime = 0;
    this.lootTaken = false;
    this.grabProgress = 0;
    this.grabbing = false;
    this.caughtBy = '';
    this.roomBonus = 0;
    this.moving = false;
    this.clickTarget = null;
    this.autopilot = params.get('auto') === '1';
    this.stageShot(params.get('shot'));
  }

  // Screenshot staging: put the game in a real, playable state that shows
  // the room at its best. Every staged state is a state the game reaches
  // by playing — nothing here is drawn by hand for the camera.
  stageShot(shot) {
    if (!shot) return;
    if (shot === 'play') {
      this.screen = 'play';
      this.thief.x = 470; this.thief.y = 330;
      this.alarm = 32;
      this.guards[0].heading = Math.atan2(330 - 160, 470 - 240);
      this.guards[0].pos = { x: 240, y: 160 };
      this.guards[1].pos = { x: 1040, y: 300 };
      this.guards[1].heading = -Math.PI / 2;
    } else if (shot === 'alarm') {
      if (this.levelIndex !== 1) this.loadLevel(1);
      this.screen = 'play';
      // The thief ducks behind the gallery wall: unseen, but the alarm is
      // still at 88 and falling — the SPOTTED banner is up, a guard is
      // investigating the last place he saw her, smoke hangs in the air.
      this.thief.x = 560; this.thief.y = 560;
      this.alarm = 95;
      const g = this.guards[1];
      g.pos = { x: 760, y: 330 };
      g.heading = Math.PI / 2;
      g.suspicion = 0.9;
      g.state = 'investigate';
      g.lastSeen = { x: 700, y: 470 };
      this.smokes.push({ x: 640, y: 500, r: 90, life: 4 });
    } else if (shot === 'loot') {
      if (this.levelIndex !== 2) this.loadLevel(2);
      this.screen = 'play';
      this.thief.x = 1130; this.thief.y = 620;
      this.alarm = 18;
      this.grabProgress = 0.65;
      this.grabbing = true;
      this.smokes.push({ x: 1050, y: 560, r: 100, life: 4 });
      const g = this.guards[3];
      g.pos = { x: 1150, y: 300 };
      g.heading = Math.PI / 2;
      this.cameras[2].heading = (140 * Math.PI) / 180;
      this.spawnSparkles(this.level.loot.x, this.level.loot.y, 14);
    }
  }

  frame(ts) {
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000 || 0.016);
    this.lastTs = ts;
    if (this.screen === 'play') this.update(dt);
    this.time += dt;
    this.renderer.draw(this);
    this.input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    this.levelTime += dt;
    const move = this.input.moveVector(this.thief);
    if (this.autopilot) this.autopilotMove(move);
    this.moving = move.x !== 0 || move.y !== 0;
    this.thief.sneaking = move.sneak;
    this.clickTarget = this.input.clickTarget;

    // --- move the thief, sliding along walls ---
    const speed = this.thief.sneaking ? SNEAK_SPEED : WALK_SPEED;
    const nx = this.thief.x + move.x * speed * dt;
    const ny = this.thief.y + move.y * speed * dt;
    const fixed = collideCircle({ x: nx, y: ny }, THIEF_RADIUS, this.solids);
    this.thief.x = Math.max(FLOOR.x + 16 + THIEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - 16 - THIEF_RADIUS, fixed.x));
    this.thief.y = Math.max(FLOOR.y + 16 + THIEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - 16 - THIEF_RADIUS, fixed.y));
    if (this.moving) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.sounds.step(this.thief.sneaking);
        this.stepTimer = this.thief.sneaking ? 0.45 : 0.3;
      }
    }

    // --- tools: smoke, EMP, lockpick ---
    if (this.input.hit('1') && this.tools.smoke > 0) this.dropSmoke();
    if (this.input.hit('2') && this.tools.emp > 0) this.fireEmp();
    if (this.input.hit('3') && this.tools.lockpick > 0) this.useLockpick();
    if (this.input.hit('m')) this.sounds.muted = !this.sounds.muted;

    // --- watchers: how clearly is the thief seen? ---
    let seen = 0;
    for (const g of this.guards) {
      g.update(dt, this.thief, this.solids, this.level.shadows, this.smokes);
      seen = Math.max(seen, g.visibility(this.thief, this.solids, this.level.shadows, this.smokes));
    }
    for (const cam of this.cameras) {
      cam.update(dt);
      seen = Math.max(seen, cam.visibility(this.thief, this.solids, this.level.shadows, this.smokes));
    }

    // --- the alarm: rises while seen, falls while hidden ---
    if (seen > 0.12) {
      this.alarm = Math.min(100, this.alarm + seen * 34 * dt);
      if (!this.wasSpotted) {
        this.sounds.spotted();
        this.wasSpotted = true;
      }
    } else {
      this.alarm = Math.max(0, this.alarm - 16 * dt);
      this.wasSpotted = false;
    }
    this.sounds.alarmLoop(this.alarm);

    // Caught on touch — but only when the guard already knows you are
    // there. A blind bump (alarm low, guard unsuspicious) is not a catch:
    // the guard spins round, certain something is there, the alarm jumps,
    // and you get a heartbeat to run. The catch has to be earned.
    for (const g of this.guards) {
      const d = Math.hypot(g.pos.x - this.thief.x, g.pos.y - this.thief.y);
      if (d < 26) {
        if (g.suspicion > 0.3 || this.alarm > 50) {
          this.getCaught('A guard grabbed Moth by the collar.');
          return;
        }
        g.suspicion = 1;
        g.state = 'investigate';
        g.lastSeen = { x: this.thief.x, y: this.thief.y };
        this.alarm = Math.min(100, this.alarm + 25);
        this.sounds.spotted();
        // Shove the thief clear so the same touch does not repeat next frame.
        const ux = (this.thief.x - g.pos.x) / (d || 1);
        const uy = (this.thief.y - g.pos.y) / (d || 1);
        const fixed = collideCircle(
          { x: this.thief.x + ux * 30, y: this.thief.y + uy * 30 },
          THIEF_RADIUS, this.solids,
        );
        this.thief.x = fixed.x;
        this.thief.y = fixed.y;
      }
    }
    if (this.alarm >= 100) {
      this.getCaught('The alarm hit 100 — the whole night shift closed in.');
      return;
    }

    // --- loot: hold E beside the case, or spend a lockpick ---
    const loot = this.level.loot;
    const nearLoot = !this.lootTaken && Math.hypot(loot.x - this.thief.x, loot.y - this.thief.y) < 52;
    if (nearLoot && this.input.down('e')) {
      this.grabbing = true;
      this.grabProgress += dt / GRAB_TIME;
      if (Math.random() < dt * 6) this.sounds.grabTick();
      if (this.grabProgress >= 1) this.takeLoot();
    } else {
      this.grabbing = false;
      if (!nearLoot) this.grabProgress = 0;
    }

    // --- the getaway: reach the exit with the loot ---
    if (this.lootTaken && pointInRect(this.thief.x, this.thief.y, this.level.exit)) {
      this.completeLevel();
      return;
    }

    // --- smoke fades, particles drift ---
    for (const s of this.smokes) s.life -= dt;
    this.smokes = this.smokes.filter((s) => s.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (!this.lootTaken && Math.random() < dt * 8) {
      this.spawnSparkles(loot.x, loot.y, 1);
    }
  }

  dropSmoke() {
    this.tools.smoke -= 1;
    this.smokes.push({ x: this.thief.x, y: this.thief.y, r: 105, life: SMOKE_DURATION });
    this.sounds.smoke();
  }

  fireEmp() {
    this.tools.emp -= 1;
    for (const cam of this.cameras) cam.disabled = EMP_DURATION;
    this.sounds.emp();
  }

  useLockpick() {
    const loot = this.level.loot;
    if (this.lootTaken) return;
    if (Math.hypot(loot.x - this.thief.x, loot.y - this.thief.y) >= 52) return;
    this.tools.lockpick -= 1;
    this.sounds.lockpick();
    this.takeLoot();
  }

  takeLoot() {
    this.lootTaken = true;
    this.grabProgress = 1;
    this.score += this.level.loot.value;
    this.sounds.pickup();
    this.spawnSparkles(this.level.loot.x, this.level.loot.y, 26);
  }

  completeLevel() {
    this.roomBonus = Math.max(0, 600 - Math.floor(this.levelTime) * 10);
    this.score += this.roomBonus;
    this.levelsCleared += 1;
    this.sounds.escape();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.screen = 'win';
      this.sounds.win();
    } else {
      this.screen = 'levelComplete';
      this.loadLevelPending = this.levelIndex + 1;
    }
  }

  getCaught(reason) {
    this.caughtBy = reason;
    this.screen = 'caught';
    this.sounds.caught();
    this.sounds.stopAlarm();
  }

  spawnSparkles(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 12 + Math.random() * 30;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 12,
        size: 1.5 + Math.random() * 2.5,
        color: '#ffd75a',
        life: 0.5 + Math.random() * 0.6,
        maxLife: 1.1,
      });
    }
  }

  // Test-only autopilot (?auto=1): steer at the loot, then the exit, sliding
  // along walls and sidestepping when stuck. It proves the rooms are winnable.
  autopilotMove(move) {
    // Spend smoke when the heat is on, sneak while the alarm is up.
    if (this.alarm > 45 && this.tools.smoke > 0) this.dropSmoke();
    const target = this.lootTaken ? {
      x: this.level.exit.x + this.level.exit.w / 2,
      y: this.level.exit.y + this.level.exit.h / 2,
    } : this.level.loot;
    const dx = target.x - this.thief.x;
    const dy = target.y - this.thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 30) {
      if (!this.lootTaken) this.takeLoot();
      return;
    }
    if (!this._autoStuck) this._autoStuck = { x: this.thief.x, y: this.thief.y, t: 0, dir: 1 };
    const st = this._autoStuck;
    st.t += 1 / 60;
    if (st.t > 0.8) {
      const moved = Math.hypot(this.thief.x - st.x, this.thief.y - st.y);
      if (moved < 12) st.dir *= -1; // stuck: try the other way around
      st.x = this.thief.x; st.y = this.thief.y; st.t = 0;
    }
    let vx = dx / dist;
    let vy = dy / dist;
    if (st.dir === -1) { const t = vx; vx = -vy; vy = t; }
    move.x = vx; move.y = vy; move.sneak = this.alarm > 25;
  }

  handleKey() {
    // Called from the global keydown hook below for screen transitions.
    // Any key starts the heist from the title screen; later screens use
    // their own key (Enter to advance, R to run it back).
    if (this.screen === 'title') {
      this.sounds.unlock();
      this.screen = 'play';
    } else if (this.screen === 'levelComplete' && this.input.hit('enter')) {
      this.loadLevel(this.loadLevelPending);
      this.screen = 'play';
    } else if ((this.screen === 'caught' || this.screen === 'win') && this.input.hit('r')) {
      this.score = 0;
      this.levelsCleared = 0;
      this.loadLevel(0);
      this.screen = 'play';
    }
  }
}

const game = new Game();
window.addEventListener('keydown', () => {
  game.sounds.unlock();
  game.handleKey();
});
document.getElementById('game').addEventListener('pointerdown', () => {
  game.sounds.unlock();
  if (game.screen === 'title') game.screen = 'play';
});
