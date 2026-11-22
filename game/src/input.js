// input.js — keyboard and mouse, kept in one place so the game loop never
// touches the DOM directly. WASD or arrows move, Shift sneaks, E grabs loot,
// 1/2/3 spend tools, R restarts, Enter starts. Clicking the floor sets a
// move target so the game also plays with the mouse alone.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last frame was read
    this.clickTarget = null; // {x, y} in canvas pixels, or null
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.clickTarget = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pressed.clear();
    });
  }

  down(key) {
    return this.keys.has(key);
  }

  // True once, on the frame the key went down.
  hit(key) {
    return this.pressed.has(key);
  }

  endFrame() {
    this.pressed.clear();
  }

  // Movement vector from keys, or toward the click target. Returns {x, y}
  // already normalised, plus whether the player is sneaking.
  moveVector(thief) {
    let x = 0;
    let y = 0;
    if (this.down('a') || this.down('arrowleft')) x -= 1;
    if (this.down('d') || this.down('arrowright')) x += 1;
    if (this.down('w') || this.down('arrowup')) y -= 1;
    if (this.down('s') || this.down('arrowdown')) y += 1;
    if (x !== 0 || y !== 0) {
      this.clickTarget = null;
      const len = Math.hypot(x, y);
      return { x: x / len, y: y / len, sneak: this.down('shift') };
    }
    if (this.clickTarget) {
      const dx = this.clickTarget.x - thief.x;
      const dy = this.clickTarget.y - thief.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) {
        this.clickTarget = null;
        return { x: 0, y: 0, sneak: false };
      }
      return { x: dx / dist, y: dy / dist, sneak: this.down('shift') };
    }
    return { x: 0, y: 0, sneak: false };
  }
}
