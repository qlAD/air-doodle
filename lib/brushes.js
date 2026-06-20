/**
 * 特效画笔定义与绘制逻辑
 * ----------------------------------------------------------------------------
 * 每种画笔导出一个 draw(ctx, seg, state) 方法，在 CanvasBoard 中按当前画笔类型调用。
 * seg = { from:{x,y}, to:{x,y} } 为一段轨迹（画布像素坐标）。
 */

export const BRUSHES = [
  { id: 'normal', name: '经典笔', emoji: '🖊️', color: '#ff5c8a' },
  { id: 'star', name: '星光笔', emoji: '✨', color: '#ffd54a' },
  { id: 'rainbow', name: '彩虹笔', emoji: '🌈', color: '#ff5c8a' },
  { id: 'firework', name: '烟花笔', emoji: '🎆', color: '#ff8a3d' },
  { id: 'watercolor', name: '水彩笔', emoji: '🎨', color: '#5ca8ff' },
  { id: 'neon', name: '霓虹笔', emoji: '💡', color: '#39ff14' },
  { id: 'pixel', name: '像素笔', emoji: '🟦', color: '#5c7cff' },
  { id: 'heart', name: '爱心笔', emoji: '💗', color: '#ff5c8a' },
];

export const BRUSH_COLORS = ['#ff5c8a', '#5c7cff', '#39d98a', '#ffb13d', '#a35cff', '#3b3b5c'];

let hue = 0;

function rand(n) {
  return (Math.random() - 0.5) * n;
}

// 简单粒子池，由 CanvasBoard 在特效层维护并调用 spawn
export function spawnParticles(pool, x, y, type, color) {
  if (type === 'star') {
    pool.push({
      x, y, vx: rand(1.2), vy: rand(1.2) - 0.4,
      life: 1, size: 2 + Math.random() * 3, color: color || '#ffd54a', shape: 'star',
    });
  } else if (type === 'firework') {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      const sp = 1.5 + Math.random() * 2;
      pool.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, size: 2 + Math.random() * 2,
        color: `hsl(${Math.floor(Math.random() * 360)},90%,60%)`, shape: 'dot',
      });
    }
  } else if (type === 'heart') {
    pool.push({
      x, y, vx: rand(0.6), vy: -0.6 - Math.random(),
      life: 1, size: 8 + Math.random() * 6, color: '#ff5c8a', shape: 'heart',
    });
  }
}

export function drawSegment(ctx, seg, brushId, size, baseColor) {
  const { from, to } = seg;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (brushId) {
    case 'rainbow': {
      hue = (hue + 6) % 360;
      ctx.strokeStyle = `hsl(${hue},90%,60%)`;
      ctx.lineWidth = size;
      ctx.shadowBlur = 0;
      line(ctx, from, to);
      break;
    }
    case 'neon': {
      ctx.strokeStyle = baseColor || '#39ff14';
      ctx.lineWidth = size;
      ctx.shadowBlur = 18;
      ctx.shadowColor = baseColor || '#39ff14';
      line(ctx, from, to);
      ctx.shadowBlur = 0;
      break;
    }
    case 'watercolor': {
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = baseColor || '#5ca8ff';
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = size * (1.4 + i * 0.8);
        line(ctx, { x: from.x + rand(4), y: from.y + rand(4) }, { x: to.x + rand(4), y: to.y + rand(4) });
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'pixel': {
      ctx.fillStyle = baseColor || '#5c7cff';
      const step = Math.max(6, size);
      const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / step);
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const px = Math.round((from.x + (to.x - from.x) * t) / step) * step;
        const py = Math.round((from.y + (to.y - from.y) * t) / step) * step;
        ctx.fillRect(px, py, step, step);
      }
      break;
    }
    case 'star':
    case 'firework':
    case 'heart': {
      // 主线条仍画一条柔和底线，粒子由特效层负责
      ctx.strokeStyle = baseColor || '#ffd54a';
      ctx.lineWidth = size * 0.7;
      ctx.shadowBlur = 6;
      ctx.shadowColor = baseColor || '#ffd54a';
      line(ctx, from, to);
      ctx.shadowBlur = 0;
      break;
    }
    case 'normal':
    default: {
      ctx.strokeStyle = baseColor || '#ff5c8a';
      ctx.lineWidth = size;
      ctx.shadowBlur = 0;
      line(ctx, from, to);
    }
  }
}

function line(ctx, a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

// 在特效层绘制/更新粒子，返回存活粒子
export function updateParticles(ctx, pool) {
  const alive = [];
  for (const p of pool) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.04; // 轻微重力
    p.life -= 0.02;
    if (p.life <= 0) continue;
    ctx.globalAlpha = Math.max(0, p.life);
    if (p.shape === 'heart') {
      drawHeart(ctx, p.x, p.y, p.size, p.color);
    } else if (p.shape === 'star') {
      drawStar(ctx, p.x, p.y, p.size, p.color);
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    alive.push(p);
  }
  ctx.globalAlpha = 1;
  return alive;
}

export function drawStar(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (Math.PI / 2.5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawHeart(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  const s = r / 16;
  ctx.moveTo(cx, cy + 4 * s);
  ctx.bezierCurveTo(cx, cy, cx - 8 * s, cy - 6 * s, cx - 8 * s, cy + 2 * s);
  ctx.bezierCurveTo(cx - 8 * s, cy + 8 * s, cx, cy + 12 * s, cx, cy + 16 * s);
  ctx.bezierCurveTo(cx, cy + 12 * s, cx + 8 * s, cy + 8 * s, cx + 8 * s, cy + 2 * s);
  ctx.bezierCurveTo(cx + 8 * s, cy - 6 * s, cx, cy, cx, cy + 4 * s);
  ctx.closePath();
  ctx.fill();
}
