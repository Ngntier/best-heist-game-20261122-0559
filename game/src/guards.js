// guards.js — the night shift. A Guard walks a patrol route, pauses at each
// waypoint to look around, and watches a vision cone: distance, angle and a
// clear line of sight. Spotting the thief builds suspicion; a suspicious
// guard turns, hurries to the last place he saw you, and looks around.
// Sneaking and darkness slow suspicion down; smoke blinds it entirely.
import { angleDiff, collideCircle, lineOfSight, pointInRect } from './world.js';

export const GUARD_SIGHT_RANGE = 210;
export const GUARD_CONE_HALF = 0.61; // ~35 degrees each side
export const THIEF_RADIUS = 14;

export class Guard {
  constructor(def) {
    this.path = def.path;
    this.speed = def.speed;
    this.pauseTime = def.pause;
    this.pos = { x: def.path[0][0], y: def.path[0][1] };
    this.leg = 0; // index of the waypoint we are walking toward
    this.heading = Math.PI / 2;
    this.wait = 0;
    this.suspicion = 0; // 0 calm .. 1 certain
    this.state = 'patrol'; // patrol | investigate | return
    this.lastSeen = null;
    this.searchTimer = 0;
    this.bob = Math.random() * Math.PI * 2;
  }

  // How clearly this guard sees the thief right now, 0..1.
  // 0 means the thief is out of the cone, behind cover, or hidden in smoke.
  visibility(thief, solids, shadows, smokes) {
    const dx = thief.x - this.pos.x;
    const dy = thief.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD_SIGHT_RANGE) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.heading)) > GUARD_CONE_HALF) return 0;
    if (!lineOfSight(this.pos.x, this.pos.y, thief.x, thief.y, solids)) return 0;
    for (const s of smokes) {
      if (Math.hypot(thief.x - s.x, thief.y - s.y) < s.r ||
          segmentThroughSmoke(this.pos, thief, s)) return 0;
    }
    let v = 1 - dist / (GUARD_SIGHT_RANGE * 1.25);
    v = Math.max(0.25, v);
    if (thief.sneaking) v *= 0.55;
    for (const sh of shadows) {
      if (pointInRect(thief.x, thief.y, sh)) v *= 0.5;
    }
    return v;
  }

  update(dt, thief, solids, shadows, smokes) {
    this.bob += dt * 6;
    const seen = this.visibility(thief, solids, shadows, smokes);
    if (seen > 0) {
      this.suspicion = Math.min(1, this.suspicion + seen * 1.15 * dt);
      this.lastSeen = { x: thief.x, y: thief.y };
      if (this.suspicion > 0.55 && this.state === 'patrol') this.state = 'investigate';
    } else {
      this.suspicion = Math.max(0, this.suspicion - 0.5 * dt);
    }

    if (this.state === 'investigate' && this.lastSeen) {
      const arrived = this.walkToward(this.lastSeen, this.speed * 1.15, dt, solids);
      if (arrived) {
        this.searchTimer += dt;
        this.heading += dt * 1.8; // look around the spot
        if (this.searchTimer > 3 || this.suspicion <= 0.05) {
          this.state = 'return';
          this.searchTimer = 0;
        }
      }
      return;
    }

    if (this.state === 'return') {
      const target = { x: this.path[this.leg][0], y: this.path[this.leg][1] };
      const arrived = this.walkToward(target, this.speed, dt, solids);
      if (arrived) this.state = 'patrol';
      return;
    }

    // Patrol: walk the route, pausing at each waypoint to scan the room.
    if (this.wait > 0) {
      this.wait -= dt;
      this.heading += Math.sin(this.bob * 0.4) * dt * 0.5;
      return;
    }
    const next = this.path[(this.leg + 1) % this.path.length];
    const arrived = this.walkToward({ x: next[0], y: next[1] }, this.speed, dt, solids);
    if (arrived) {
      this.leg = (this.leg + 1) % this.path.length;
      this.wait = this.pauseTime;
    }
  }

  // Step toward a point, sliding along walls. Returns true when close.
  walkToward(target, speed, dt, solids) {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 6) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.pos.x + (dx / dist) * step;
    const ny = this.pos.y + (dy / dist) * step;
    this.heading = Math.atan2(dy, dx);
    const fixed = collideCircle({ x: nx, y: ny }, THIEF_RADIUS, solids);
    // If a wall stopped us dead, give up on this leg so we never get stuck.
    if (Math.hypot(fixed.x - this.pos.x, fixed.y - this.pos.y) < step * 0.15) return true;
    this.pos = fixed;
    return false;
  }
}

function segmentThroughSmoke(a, b, smoke) {
  // Distance from the smoke centre to the sight line segment.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((smoke.x - a.x) * dx + (smoke.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = a.x + t * dx;
  const cy = a.y + t * dy;
  return Math.hypot(smoke.x - cx, smoke.y - cy) < smoke.r * 0.8;
}
