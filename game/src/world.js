// world.js — geometry the whole game stands on: circle-vs-rectangle movement
// (walls and crates block the thief and the guards) and line of sight
// (a watcher only sees the thief when no wall or crate stands between them).
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Push a circle (cx, cy, radius) out of every solid rectangle it overlaps.
// Returns the corrected position; sliding along a wall falls out naturally
// because each axis is resolved separately.
export function collideCircle(pos, radius, solids) {
  let { x, y } = pos;
  for (const s of solids) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - nx;
    const dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        y = ny + (dy / d) * radius;
      } else {
        // Centre inside the rectangle: push out along the shallowest side.
        const left = x - s.x;
        const right = s.x + s.w - x;
        const top = y - s.y;
        const bottom = s.y + s.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = s.x - radius;
        else if (m === right) x = s.x + s.w + radius;
        else if (m === top) y = s.y - radius;
        else y = s.y + s.h + radius;
      }
    }
  }
  return { x, y };
}

// True when the segment from (x1,y1) to (x2,y2) touches no solid rectangle.
export function lineOfSight(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return false;
  }
  return true;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = cross(x3 - x1, y3 - y1, x2 - x1, y2 - y1);
  const d2 = cross(x4 - x1, y4 - y1, x2 - x1, y2 - y1);
  const d3 = cross(x1 - x3, y1 - y3, x4 - x3, y4 - y3);
  const d4 = cross(x2 - x3, y2 - y3, x4 - x3, y4 - y3);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
         ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

// Smallest absolute angle between two headings, in radians.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
