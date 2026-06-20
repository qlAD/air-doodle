/**
 * 临摹模板库定义。
 * 每个模板用一段 SVG path/绘制函数表达轮廓，CanvasBoard 将其半透明铺在画布底层。
 * 这样无需准备大量图片素材即可提供"分层描线"体验。
 */

export const TEMPLATE_CATEGORIES = [
  { id: 'kids', name: '幼儿简笔画', emoji: '🧸' },
  { id: 'animal', name: '小动物', emoji: '🐱' },
  { id: 'scene', name: '风景星空', emoji: '🌌' },
  { id: 'festival', name: '节日素材', emoji: '🎄' },
];

// 难度：easy / medium / hard
export const TEMPLATES = [
  { id: 'cat', name: '小猫', category: 'animal', level: 'easy', emoji: '🐱', word: '小猫' },
  { id: 'house', name: '小房子', category: 'kids', level: 'easy', emoji: '🏠', word: '房子' },
  { id: 'flower', name: '小花', category: 'kids', level: 'easy', emoji: '🌸', word: '花' },
  { id: 'star', name: '五角星', category: 'scene', level: 'easy', emoji: '⭐', word: '星星' },
  { id: 'fish', name: '小鱼', category: 'animal', level: 'easy', emoji: '🐟', word: '鱼' },
  { id: 'umbrella', name: '雨伞', category: 'kids', level: 'medium', emoji: '☂️', word: '伞' },
  { id: 'tree', name: '大树', category: 'scene', level: 'medium', emoji: '🌳', word: '树' },
  { id: 'gift', name: '礼物盒', category: 'festival', level: 'medium', emoji: '🎁', word: '礼物' },
  { id: 'moon', name: '月亮', category: 'scene', level: 'easy', emoji: '🌙', word: '月亮' },
  { id: 'rabbit', name: '小兔子', category: 'animal', level: 'medium', emoji: '🐰', word: '兔子' },
];

/**
 * 在 ctx 上以归一化坐标(0~1)绘制模板轮廓。w/h 为画布尺寸。
 * 返回时已设置好半透明虚线轮廓。
 */
export function drawTemplate(ctx, id, w, h, opacity = 0.35) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = '#7c6cf0';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineCap = 'round';
  const X = (n) => n * w;
  const Y = (n) => n * h;
  const P = (fn) => {
    ctx.beginPath();
    fn();
    ctx.stroke();
  };

  switch (id) {
    case 'house':
      P(() => {
        ctx.moveTo(X(0.3), Y(0.45));
        ctx.lineTo(X(0.3), Y(0.75));
        ctx.lineTo(X(0.7), Y(0.75));
        ctx.lineTo(X(0.7), Y(0.45));
      });
      P(() => {
        ctx.moveTo(X(0.25), Y(0.45));
        ctx.lineTo(X(0.5), Y(0.25));
        ctx.lineTo(X(0.75), Y(0.45));
      });
      P(() => ctx.rect(X(0.45), Y(0.6), X(0.1), Y(0.15)));
      break;
    case 'star':
      P(() => {
        const cx = X(0.5), cy = Y(0.45), r = Math.min(w, h) * 0.22;
        for (let i = 0; i < 5; i++) {
          const a = (Math.PI / 2.5) * i - Math.PI / 2;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          const a2 = a + Math.PI / 5;
          ctx.lineTo(cx + Math.cos(a2) * r * 0.45, cy + Math.sin(a2) * r * 0.45);
        }
        ctx.closePath();
      });
      break;
    case 'moon':
      P(() => {
        ctx.arc(X(0.5), Y(0.45), Math.min(w, h) * 0.2, Math.PI * 0.25, Math.PI * 1.75);
      });
      break;
    case 'flower':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        P(() => ctx.ellipse(X(0.5) + Math.cos(a) * 40, Y(0.4) + Math.sin(a) * 40, 26, 16, a, 0, Math.PI * 2));
      }
      P(() => ctx.arc(X(0.5), Y(0.4), 16, 0, Math.PI * 2));
      P(() => { ctx.moveTo(X(0.5), Y(0.45)); ctx.lineTo(X(0.5), Y(0.78)); });
      break;
    case 'fish':
      P(() => ctx.ellipse(X(0.5), Y(0.45), 70, 40, 0, 0, Math.PI * 2));
      P(() => {
        ctx.moveTo(X(0.5) + 70, Y(0.45));
        ctx.lineTo(X(0.5) + 110, Y(0.32));
        ctx.lineTo(X(0.5) + 110, Y(0.58));
        ctx.closePath();
      });
      P(() => ctx.arc(X(0.5) - 35, Y(0.4), 5, 0, Math.PI * 2));
      break;
    case 'umbrella':
      P(() => ctx.arc(X(0.5), Y(0.5), Math.min(w, h) * 0.22, Math.PI, 0));
      P(() => { ctx.moveTo(X(0.5), Y(0.5)); ctx.lineTo(X(0.5), Y(0.78)); });
      P(() => ctx.arc(X(0.46), Y(0.78), 14, 0, Math.PI, true));
      break;
    case 'tree':
      P(() => ctx.arc(X(0.5), Y(0.4), Math.min(w, h) * 0.2, 0, Math.PI * 2));
      P(() => ctx.rect(X(0.47), Y(0.55), X(0.06), Y(0.25)));
      break;
    case 'gift':
      P(() => ctx.rect(X(0.35), Y(0.45), X(0.3), Y(0.3)));
      P(() => { ctx.moveTo(X(0.5), Y(0.45)); ctx.lineTo(X(0.5), Y(0.75)); });
      P(() => { ctx.moveTo(X(0.35), Y(0.55)); ctx.lineTo(X(0.65), Y(0.55)); });
      break;
    case 'cat':
      P(() => ctx.arc(X(0.5), Y(0.5), Math.min(w, h) * 0.2, 0, Math.PI * 2));
      P(() => { ctx.moveTo(X(0.38), Y(0.36)); ctx.lineTo(X(0.32), Y(0.2)); ctx.lineTo(X(0.45), Y(0.3)); });
      P(() => { ctx.moveTo(X(0.62), Y(0.36)); ctx.lineTo(X(0.68), Y(0.2)); ctx.lineTo(X(0.55), Y(0.3)); });
      P(() => ctx.arc(X(0.43), Y(0.48), 5, 0, Math.PI * 2));
      P(() => ctx.arc(X(0.57), Y(0.48), 5, 0, Math.PI * 2));
      P(() => { ctx.moveTo(X(0.5), Y(0.54)); ctx.lineTo(X(0.5), Y(0.58)); });
      break;
    case 'rabbit':
      P(() => ctx.arc(X(0.5), Y(0.55), Math.min(w, h) * 0.17, 0, Math.PI * 2));
      P(() => ctx.ellipse(X(0.44), Y(0.3), 12, 36, 0, 0, Math.PI * 2));
      P(() => ctx.ellipse(X(0.56), Y(0.3), 12, 36, 0, 0, Math.PI * 2));
      P(() => ctx.arc(X(0.45), Y(0.53), 4, 0, Math.PI * 2));
      P(() => ctx.arc(X(0.55), Y(0.53), 4, 0, Math.PI * 2));
      break;
    default:
      P(() => ctx.arc(X(0.5), Y(0.5), Math.min(w, h) * 0.2, 0, Math.PI * 2));
  }
  ctx.restore();
}
