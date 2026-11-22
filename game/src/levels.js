// levels.js — the three rooms of the heist. Each level is one floor plan:
// walls (block movement and sight), crates (low cover that blocks sight),
// shadows (dark floor where guards spot you half as fast), patrol routes,
// sweeping cameras, the loot pedestal and the getaway door.
// Coordinates are in canvas pixels; the HUD occupies y 0..64, the floor 64..720.
export const FLOOR = { x: 0, y: 64, w: 1280, h: 656 };

function borderWalls() {
  return [
    { x: 0, y: 64, w: 1280, h: 16 },
    { x: 0, y: 704, w: 1280, h: 16 },
    { x: 0, y: 64, w: 16, h: 656 },
    { x: 1264, y: 64, w: 16, h: 656 },
  ];
}

export const LEVELS = [
  {
    id: 1,
    name: 'THE FOYER',
    sub: 'Galleria Nocturne — slip past the night shift',
    start: { x: 84, y: 640 },
    loot: { x: 1180, y: 640, label: 'JADE MOTH', value: 4000 },
    exit: { x: 596, y: 668, w: 88, h: 36 },
    tools: { smoke: 2, emp: 1, lockpick: 2 },
    walls: [
      ...borderWalls(),
      { x: 360, y: 180, w: 24, h: 220 },
      { x: 700, y: 420, w: 260, h: 24 },
      { x: 980, y: 140, w: 24, h: 200 },
    ],
    crates: [
      { x: 520, y: 240, w: 56, h: 56 },
      { x: 520, y: 480, w: 56, h: 56 },
      { x: 860, y: 560, w: 56, h: 56 },
      { x: 1100, y: 300, w: 56, h: 56 },
      { x: 180, y: 140, w: 56, h: 56 },
    ],
    shadows: [
      { x: 60, y: 100, w: 140, h: 90 },
      { x: 1060, y: 520, w: 150, h: 120 },
    ],
    guards: [
      { path: [[240, 160], [240, 600], [560, 600], [560, 160]], speed: 70, pause: 1.2 },
      { path: [[1040, 160], [1040, 600]], speed: 85, pause: 1.6 },
    ],
    cameras: [
      { x: 640, y: 88, baseDeg: 90, sweepDeg: 50, range: 260 },
    ],
  },
  {
    id: 2,
    name: 'THE GALLERY',
    sub: 'Three guards, two lenses — read the room before you move',
    start: { x: 84, y: 120 },
    loot: { x: 1190, y: 640, label: 'SUNSTONE CROWN', value: 9000 },
    exit: { x: 40, y: 668, w: 88, h: 36 },
    tools: { smoke: 2, emp: 1, lockpick: 2 },
    walls: [
      ...borderWalls(),
      { x: 300, y: 64, w: 24, h: 300 },
      { x: 300, y: 520, w: 24, h: 184 },
      { x: 640, y: 300, w: 24, h: 404 },
      { x: 900, y: 64, w: 24, h: 240 },
      { x: 980, y: 480, w: 200, h: 24 },
    ],
    crates: [
      { x: 480, y: 140, w: 56, h: 56 },
      { x: 480, y: 600, w: 56, h: 56 },
      { x: 780, y: 160, w: 56, h: 56 },
      { x: 1160, y: 360, w: 56, h: 56 },
      { x: 180, y: 420, w: 56, h: 56 },
    ],
    shadows: [
      { x: 80, y: 80, w: 150, h: 100 },
      { x: 1140, y: 580, w: 120, h: 100 },
    ],
    guards: [
      { path: [[200, 200], [200, 420], [420, 420], [420, 200]], speed: 80, pause: 1.0 },
      { path: [[760, 140], [760, 640]], speed: 95, pause: 1.4 },
      { path: [[960, 200], [960, 600], [1120, 600], [1120, 200]], speed: 85, pause: 1.2 },
    ],
    cameras: [
      { x: 520, y: 88, baseDeg: 90, sweepDeg: 60, range: 280 },
      { x: 1120, y: 88, baseDeg: 110, sweepDeg: 45, range: 260 },
    ],
  },
  {
    id: 3,
    name: 'THE VAULT',
    sub: 'The Star Sapphire — four guards, three lenses, one way out',
    start: { x: 84, y: 120 },
    loot: { x: 1190, y: 640, label: 'STAR SAPPHIRE', value: 20000 },
    exit: { x: 40, y: 668, w: 88, h: 36 },
    tools: { smoke: 3, emp: 2, lockpick: 2 },
    walls: [
      ...borderWalls(),
      { x: 240, y: 64, w: 24, h: 260 },
      { x: 240, y: 480, w: 24, h: 224 },
      { x: 560, y: 200, w: 24, h: 504 },
      { x: 880, y: 64, w: 24, h: 300 },
      { x: 880, y: 500, w: 24, h: 204 },
      { x: 1060, y: 420, w: 204, h: 24 },
    ],
    crates: [
      { x: 330, y: 140, w: 56, h: 56 },
      { x: 330, y: 600, w: 56, h: 56 },
      { x: 720, y: 140, w: 56, h: 56 },
      { x: 660, y: 560, w: 56, h: 56 },
      { x: 1080, y: 220, w: 56, h: 56 },
    ],
    shadows: [
      { x: 30, y: 560, w: 110, h: 110 },
      { x: 1120, y: 80, w: 120, h: 100 },
    ],
    guards: [
      { path: [[160, 200], [160, 600]], speed: 100, pause: 1.0 },
      { path: [[420, 140], [420, 640], [520, 640], [520, 140]], speed: 90, pause: 0.9 },
      { path: [[740, 300], [740, 640]], speed: 100, pause: 1.2 },
      { path: [[1000, 140], [1000, 360], [1220, 360], [1220, 140]], speed: 90, pause: 1.0 },
    ],
    cameras: [
      { x: 400, y: 88, baseDeg: 90, sweepDeg: 55, range: 280 },
      { x: 760, y: 88, baseDeg: 90, sweepDeg: 55, range: 280 },
      { x: 1160, y: 88, baseDeg: 120, sweepDeg: 40, range: 260 },
    ],
  },
];
