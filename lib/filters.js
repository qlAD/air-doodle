/**
 * 前端 AI 画作滤镜
 * ----------------------------------------------------------------------------
 * 通过 Canvas 2D 像素操作实现四种风格滤镜，无需后端算力。
 * 每种滤镜接收 ImageData，返回新的 ImageData。
 *
 * 支持的滤镜：
 *  - anime: 动漫风格（色彩量化 + 边缘增强）
 *  - oil: 油画风格（块状颜色平均 + 笔触纹理）
 *  - sketch: 素描风格（灰度 + 边缘检测 + 反相）
 *  - film: 胶片风格（暖棕色调 + 暗角 + 颗粒噪点）
 */

/**
 * 对 ImageData 应用指定滤镜，返回新的 ImageData。
 */
export function applyFilter(src, type) {
  switch (type) {
    case 'anime': return filterAnime(src);
    case 'oil': return filterOil(src);
    case 'sketch': return filterSketch(src);
    case 'film': return filterFilm(src);
    default: return src;
  }
}

// ---- 动漫滤镜：色彩量化 + 边缘增强 ----
function filterAnime(src) {
  const w = src.width, h = src.height;
  const dst = new ImageData(w, h);
  const levels = 6;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];

      const qr = Math.round(r / (255 / levels)) * (255 / levels);
      const qg = Math.round(g / (255 / levels)) * (255 / levels);
      const qb = Math.round(b / (255 / levels)) * (255 / levels);

      const edge = getEdge(src, x, y, w, h);
      const blend = Math.min(1, edge / 50);
      dst.data[i]     = qr * (1 - blend) + qr * 0.3 * blend;
      dst.data[i + 1] = qg * (1 - blend) + qg * 0.3 * blend;
      dst.data[i + 2] = qb * (1 - blend) + qb * 0.3 * blend;
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}

// ---- 油画滤镜：邻域强度桶 ----
function filterOil(src) {
  const w = src.width, h = src.height;
  const dst = new ImageData(w, h);
  const radius = 3, bins = 16;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cnt = new Array(bins).fill(0);
      const rS = new Array(bins).fill(0);
      const gS = new Array(bins).fill(0);
      const bS = new Array(bins).fill(0);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = clamp(x + dx, 0, w - 1);
          const ny = clamp(y + dy, 0, h - 1);
          const j = (ny * w + nx) * 4;
          const rv = src.data[j], gv = src.data[j + 1], bv = src.data[j + 2];
          const bin = Math.min(bins - 1, Math.floor(((rv + gv + bv) / 3) / (256 / bins)));
          cnt[bin]++; rS[bin] += rv; gS[bin] += gv; bS[bin] += bv;
        }
      }

      let best = 0, bestCnt = 0;
      for (let b = 0; b < bins; b++) {
        if (cnt[b] > bestCnt) { bestCnt = cnt[b]; best = b; }
      }

      const i = (y * w + x) * 4;
      dst.data[i]     = rS[best] / bestCnt;
      dst.data[i + 1] = gS[best] / bestCnt;
      dst.data[i + 2] = bS[best] / bestCnt;
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}

// ---- 素描滤镜：灰度 + Sobel边缘 + 反相 ----
function filterSketch(src) {
  const w = src.width, h = src.height;
  const dst = new ImageData(w, h);
  const gray = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      gray[y * w + x] = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let gx = 0, gy = 0;
      if (x > 0 && x < w - 1 && y > 0 && y < h - 1) {
        gx = -gray[(y-1)*w+x-1] + gray[(y-1)*w+x+1]
             -2*gray[y*w+x-1] + 2*gray[y*w+x+1]
             -gray[(y+1)*w+x-1] + gray[(y+1)*w+x+1];
        gy = -gray[(y-1)*w+x-1] -2*gray[(y-1)*w+x]
             -gray[(y-1)*w+x+1] + gray[(y+1)*w+x-1]
             +2*gray[(y+1)*w+x] + gray[(y+1)*w+x+1];
      }
      const val = 255 - Math.min(255, Math.hypot(gx, gy));
      dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = val;
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}

// ---- 胶片滤镜：棕褐 + 暗角 + 颗粒 ----
function filterFilm(src) {
  const w = src.width, h = src.height;
  const dst = new ImageData(w, h);
  const cx = w / 2, cy = h / 2, maxR = Math.hypot(cx, cy);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];

      // sepia
      let sr = r * 0.393 + g * 0.769 + b * 0.189;
      let sg = r * 0.349 + g * 0.686 + b * 0.168;
      let sb = r * 0.272 + g * 0.534 + b * 0.131;

      // 暗角
      const vig = 1 - (Math.hypot(x - cx, y - cy) / maxR) * 0.5;
      sr *= vig; sg *= vig; sb *= vig;

      // 颗粒
      const grain = (Math.random() - 0.5) * 24;
      dst.data[i]     = clamp(sr + grain, 0, 255);
      dst.data[i + 1] = clamp(sg + grain, 0, 255);
      dst.data[i + 2] = clamp(sb + grain, 0, 255);
      dst.data[i + 3] = src.data[i + 3];
    }
  }
  return dst;
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function getEdge(src, x, y, w, h) {
  if (x <= 0 || x >= w - 1 || y <= 0 || y >= h - 1) return 0;
  const i = (y * w + x) * 4;
  const r = (y * w + x + 1) * 4;
  const b = ((y + 1) * w + x) * 4;
  const dx = Math.abs(src.data[i]-src.data[r]) + Math.abs(src.data[i+1]-src.data[r+1]) + Math.abs(src.data[i+2]-src.data[r+2]);
  const dy = Math.abs(src.data[i]-src.data[b]) + Math.abs(src.data[i+1]-src.data[b+1]) + Math.abs(src.data[i+2]-src.data[b+2]);
  return Math.hypot(dx, dy) / 3;
}

export const FILTER_TYPES = [
  { id: 'anime', name: '动漫风格', emoji: '🎭', desc: '色彩量化 + 边缘增强' },
  { id: 'oil', name: '油画风格', emoji: '🖼️', desc: '块状笔触 + 颜色混合' },
  { id: 'sketch', name: '素描风格', emoji: '✏️', desc: '灰度边缘 + 铅笔效果' },
  { id: 'film', name: '胶片风格', emoji: '📷', desc: '暖棕调 + 暗角 + 颗粒' },
];
