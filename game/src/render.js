// render.js — everything the player sees, drawn on one canvas.
// The visual language is the whole point: warm gold for loot, red cones for
// danger, deep shadow for safe darkness, and the thief in bright cyan so
// your eye finds them at once. The HUD is drawn on the same canvas so the
// alarm meter is always in the frame with the room.
import { FLOOR } from './levels.js';
import { CAMERA_CONE_HALF } from './cameras.js';
import { GUARD_CONE_HALF, GUARD_SIGHT_RANGE } from './guards.js';

const W = 1280;
const H = 720;
const HUD_H = 64;

function conePath(ctx, x, y, heading, half, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, heading - half, heading + half);
  ctx.closePath();
}

function drawCone(ctx, x, y, heading, half, range, heat) {
  // heat 0 = calm amber, 1 = spotted red.
  const r = Math.round(255);
  const g = Math.round(210 - heat * 160);
  const b = Math.round(60 - heat * 50);
  const grad = ctx.createRadialGradient(x, y, 10, x, y, range);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.42)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0.05)`);
  ctx.fillStyle = grad;
  conePath(ctx, x, y, heading, half, range);
  ctx.fill();
  ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(game) {
    const ctx = this.ctx;
    const level = game.level;
    ctx.clearRect(0, 0, W, H);

    // --- floor: dark parquet with a faint grid so motion reads ---
    ctx.fillStyle = '#1b1f33';
    ctx.fillRect(0, HUD_H, W, H - HUD_H);
    ctx.strokeStyle = 'rgba(255,255,255,0.045)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 80) {
      ctx.beginPath(); ctx.moveTo(x, HUD_H); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = HUD_H; y <= H; y += 80) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // A deep-red carpet runner down the middle of each room.
    ctx.fillStyle = 'rgba(150,40,60,0.16)';
    ctx.fillRect(0, 360, W, 72);

    // --- shadows: safe darkness, drawn as cool blue pools ---
    for (const sh of level.shadows) {
      ctx.fillStyle = 'rgba(8,12,28,0.55)';
      ctx.fillRect(sh.x, sh.y, sh.w, sh.h);
      ctx.strokeStyle = 'rgba(120,160,255,0.25)';
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(sh.x + 1, sh.y + 1, sh.w - 2, sh.h - 2);
      ctx.setLineDash([]);
    }

    // --- exit door: glows green once the loot is yours ---
    const ex = level.exit;
    ctx.fillStyle = game.lootTaken ? '#1f9d55' : '#3a3f55';
    ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
    ctx.strokeStyle = game.lootTaken ? '#7CFC9A' : '#6b7194';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);
    ctx.fillStyle = game.lootTaken ? '#d8ffe2' : '#9aa0bd';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.lootTaken ? 'EXIT — GO!' : 'EXIT', ex.x + ex.w / 2, ex.y + 23);

    // --- loot pedestal: gold, glowing, labelled ---
    if (!game.lootTaken) {
      const l = level.loot;
      const pulse = 0.5 + Math.sin(game.time * 3) * 0.2;
      const glow = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 70);
      glow.addColorStop(0, `rgba(255,215,90,${0.5 * pulse + 0.2})`);
      glow.addColorStop(1, 'rgba(255,215,90,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(l.x, l.y, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2118';
      ctx.beginPath(); ctx.arc(l.x, l.y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd75a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // A little gem: a diamond that catches the eye.
      ctx.fillStyle = '#ffd75a';
      ctx.beginPath();
      ctx.moveTo(l.x, l.y - 12); ctx.lineTo(l.x + 9, l.y); ctx.lineTo(l.x, l.y + 12); ctx.lineTo(l.x - 9, l.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.moveTo(l.x, l.y - 12); ctx.lineTo(l.x + 9, l.y); ctx.lineTo(l.x, l.y); ctx.lineTo(l.x - 9, l.y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd75a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(l.label, l.x, l.y - 36);
      if (game.grabProgress > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(l.x - 34, l.y + 34, 68, 8);
        ctx.fillStyle = '#ffd75a';
        ctx.fillRect(l.x - 33, l.y + 35, 66 * game.grabProgress, 6);
      }
    }

    // --- crates: low cover, drawn as wooden chests ---
    for (const c of level.crates) {
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = '#a97c46';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
      ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.stroke();
    }

    // --- walls: slate blocks with a lit top edge ---
    for (const wl of level.walls) {
      ctx.fillStyle = '#39406b';
      ctx.fillRect(wl.x, wl.y, wl.w, wl.h);
      ctx.fillStyle = '#565e96';
      ctx.fillRect(wl.x, wl.y, wl.w, 3);
      ctx.strokeStyle = '#232744';
      ctx.lineWidth = 1;
      ctx.strokeRect(wl.x + 0.5, wl.y + 0.5, wl.w - 1, wl.h - 1);
    }

    // --- cameras: cones first, then the little lens on the wall ---
    for (const cam of game.cameras) {
      if (cam.disabled <= 0) {
        drawCone(ctx, cam.pos.x, cam.pos.y, cam.heading, CAMERA_CONE_HALF, cam.range, 0.35);
      }
      ctx.fillStyle = cam.disabled > 0 ? '#555a70' : '#2c2f45';
      ctx.beginPath(); ctx.arc(cam.pos.x, cam.pos.y, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = cam.disabled > 0 ? '#777' : '#ff5a5a';
      ctx.lineWidth = 2;
      ctx.stroke();
      if (cam.disabled <= 0 && Math.sin(cam.blink * 4) > 0) {
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath(); ctx.arc(cam.pos.x, cam.pos.y, 3, 0, Math.PI * 2); ctx.fill();
      }
    }

    // --- guards: cones first, then the patrolling figure ---
    for (const g of game.guards) {
      drawCone(ctx, g.pos.x, g.pos.y, g.heading, GUARD_CONE_HALF, GUARD_SIGHT_RANGE, g.suspicion);
      const bobY = Math.sin(g.bob) * 1.5;
      ctx.fillStyle = g.state === 'investigate' ? '#ff8c42' : '#3f6fb5';
      ctx.beginPath(); ctx.arc(g.pos.x, g.pos.y + bobY, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#dfe6ff';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Facing tick: a little nose so the heading reads.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(g.pos.x, g.pos.y + bobY);
      ctx.lineTo(g.pos.x + Math.cos(g.heading) * 17, g.pos.y + bobY + Math.sin(g.heading) * 17);
      ctx.stroke();
      // Suspicion mark above a guard who is onto you.
      if (g.suspicion > 0.25) {
        ctx.fillStyle = g.suspicion > 0.55 ? '#ff3b30' : '#ffd75a';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(g.suspicion > 0.55 ? '!' : '?', g.pos.x, g.pos.y - 20 + bobY);
      }
    }

    // --- smoke clouds ---
    for (const s of game.smokes) {
      const grad = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      grad.addColorStop(0, 'rgba(200,200,210,0.75)');
      grad.addColorStop(1, 'rgba(200,200,210,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }

    // --- the thief: Moth, in bright cyan with a little mask ---
    const t = game.thief;
    const walkBob = game.moving ? Math.sin(game.time * 14) * 1.5 : 0;
    ctx.fillStyle = '#19d3e6';
    ctx.beginPath(); ctx.arc(t.x, t.y + walkBob, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8fbff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#10202a';
    ctx.fillRect(t.x - 9, t.y - 4 + walkBob, 18, 5); // the mask
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(t.x - 4, t.y - 1 + walkBob, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(t.x + 4, t.y - 1 + walkBob, 1.8, 0, Math.PI * 2); ctx.fill();
    if (t.sneaking) {
      ctx.fillStyle = 'rgba(25,211,230,0.9)';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SNEAKING', t.x, t.y - 22);
    }
    // Click-to-move target marker.
    if (game.clickTarget) {
      ctx.strokeStyle = 'rgba(25,211,230,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(game.clickTarget.x, game.clickTarget.y, 8, 0, Math.PI * 2); ctx.stroke();
    }

    // --- particles: loot sparkles, smoke wisps, alarm flashes ---
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawHud(game);
    if (game.screen === 'title') this.drawTitle(game);
    if (game.screen === 'caught') this.drawCaught(game);
    if (game.screen === 'levelComplete') this.drawLevelComplete(game);
    if (game.screen === 'win') this.drawWin(game);
  }

  drawHud(game) {
    const ctx = this.ctx;
    ctx.fillStyle = '#10131f';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.fillStyle = '#2a2f4a';
    ctx.fillRect(0, HUD_H - 2, W, 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8eaf6';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('VELVET VAULT', 16, 28);
    ctx.fillStyle = '#9aa0bd';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`${game.level.name}  ·  ${game.level.sub}`, 16, 50);

    // Loot tally.
    ctx.fillStyle = '#ffd75a';
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillText(`LOOT  $${game.score.toLocaleString('en-US')}`, 560, 30);
    ctx.fillStyle = '#9aa0bd';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(game.lootTaken ? 'loot secured — reach the EXIT' : `steal the ${game.level.loot.label}`, 560, 50);

    // Alarm meter: the big one, front and centre.
    const ax = 830;
    const ay = 16;
    const aw = 210;
    ctx.fillStyle = '#e8eaf6';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('ALARM', ax, ay + 10);
    ctx.fillStyle = '#232744';
    ctx.fillRect(ax, ay + 16, aw, 16);
    const frac = game.alarm / 100;
    const col = frac < 0.4 ? '#2ecc71' : frac < 0.7 ? '#f5b301' : '#ff3b30';
    ctx.fillStyle = col;
    ctx.fillRect(ax + 1, ay + 17, Math.max(0, (aw - 2) * frac), 14);
    ctx.strokeStyle = '#565e96';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax + 0.5, ay + 16.5, aw, 16);

    // Tools, right side, second row so nothing collides with the alarm bar.
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#9aa0bd';
    ctx.textAlign = 'right';
    ctx.fillText(`[1] Smoke ${game.tools.smoke}  ·  [2] EMP ${game.tools.emp}  ·  [3] Pick ${game.tools.lockpick}`, W - 16, 48);

    // Timer, top-right corner.
    ctx.fillStyle = '#e8eaf6';
    ctx.font = 'bold 15px system-ui, sans-serif';
    const secs = Math.floor(game.levelTime);
    ctx.fillText(`${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`, W - 16, 26);
    ctx.textAlign = 'left';

    // High-alarm banner across the top of the room, impossible to miss.
    if (game.alarm >= 70 && game.screen === 'play') {
      const msg = 'SPOTTED — BREAK LINE OF SIGHT!';
      ctx.font = 'bold 20px system-ui, sans-serif';
      const mw = ctx.measureText(msg).width + 36;
      ctx.fillStyle = 'rgba(10,10,18,0.75)';
      ctx.fillRect(W / 2 - mw / 2, 76, mw, 34);
      ctx.strokeStyle = '#ff3b30';
      ctx.lineWidth = 2;
      ctx.strokeRect(W / 2 - mw / 2, 76, mw, 34);
      ctx.fillStyle = game.time % 0.5 < 0.25 ? '#ff3b30' : '#ffd75a';
      ctx.textAlign = 'center';
      ctx.fillText(msg, W / 2, 100);
      ctx.textAlign = 'left';
    }
  }

  overlay(ctx, title, lines, accent) {
    ctx.fillStyle = 'rgba(8,10,20,0.78)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.fillText(title, W / 2, 250);
    ctx.fillStyle = '#e8eaf6';
    ctx.font = '18px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, W / 2, 300 + i * 30));
    ctx.textAlign = 'left';
  }

  drawTitle(game) {
    const ctx = this.ctx;
    this.overlay(ctx, 'VELVET VAULT', [
      'Moth is going in. Three rooms, three treasures, one way out.',
      '',
      'Move — WASD / arrows, or click the floor.  Shift — sneak.',
      'E — hold to crack the case.  1 Smoke  ·  2 EMP  ·  3 Lockpick.',
      'Red cones see you. Cameras sweep. Shadows hide you. The alarm only',
      'falls when nobody can see you — at 100, the night shift catches you.',
      '',
      'Press any key or click to begin the heist.',
    ], '#ffd75a');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9aa0bd';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('An original game — no borrowed names, art or music.', W / 2, 560);
    ctx.textAlign = 'left';
  }

  drawCaught(game) {
    this.overlay(this.ctx, 'CAUGHT!', [
      game.caughtBy,
      `The alarm hit 100 in ${game.level.name}. The loot stays where it is.`,
      '',
      'Press R to run it back — the patrols reset, the plan is yours.',
    ], '#ff3b30');
  }

  drawLevelComplete(game) {
    this.overlay(this.ctx, 'CLEAN GETAWAY', [
      `${game.level.loot.label} secured — $${game.level.loot.value.toLocaleString('en-US')} — and out the door.`,
      `Room bonus $${game.roomBonus.toLocaleString('en-US')}  ·  total loot $${game.score.toLocaleString('en-US')}`,
      '',
      'Press ENTER for the next room.',
    ], '#2ecc71');
  }

  drawWin(game) {
    this.overlay(this.ctx, 'THE PERFECT HEIST', [
      'All three treasures. No cuffs. The Galleria never saw Moth at all.',
      `Final take: $${game.score.toLocaleString('en-US')} across ${game.levelsCleared} rooms.`,
      '',
      'Press R to steal it all over again.',
    ], '#ffd75a');
  }
}
