// cameras.js — the ceiling lenses. A Camera sits on a wall and sweeps its
// vision cone back and forth across the room on a slow, readable rhythm.
// It spots the thief exactly like a guard does, but it never moves —
// so the safe moment is the moment its cone sweeps away. An EMP burst
// knocks every camera out for a few seconds.
import { angleDiff, lineOfSight, pointInRect } from './world.js';

export const CAMERA_RANGE = 280;
export const CAMERA_CONE_HALF = 0.5; // ~29 degrees each side

export class Camera {
  constructor(def) {
    this.pos = { x: def.x, y: def.y };
    this.base = (def.baseDeg * Math.PI) / 180;
    this.sweep = (def.sweepDeg * Math.PI) / 180;
    this.range = def.range;
    this.phase = Math.random() * Math.PI * 2;
    this.heading = this.base;
    this.disabled = 0; // seconds of EMP left
    this.blink = 0;
  }

  update(dt) {
    this.blink += dt;
    if (this.disabled > 0) {
      this.disabled -= dt;
      return;
    }
    this.phase += dt * 0.55;
    this.heading = this.base + Math.sin(this.phase) * this.sweep;
  }

  visibility(thief, solids, shadows, smokes) {
    if (this.disabled > 0) return 0;
    const dx = thief.x - this.pos.x;
    const dy = thief.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.range) return 0;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.heading)) > CAMERA_CONE_HALF) return 0;
    if (!lineOfSight(this.pos.x, this.pos.y, thief.x, thief.y, solids)) return 0;
    for (const s of smokes) {
      if (Math.hypot(thief.x - s.x, thief.y - s.y) < s.r) return 0;
    }
    let v = 1 - dist / (this.range * 1.3);
    v = Math.max(0.3, v);
    if (thief.sneaking) v *= 0.6;
    for (const sh of shadows) {
      if (pointInRect(thief.x, thief.y, sh)) v *= 0.5;
    }
    return v;
  }
}
