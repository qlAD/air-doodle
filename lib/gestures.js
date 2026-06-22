/**
 * 手势判定逻辑 —— 第五版（匹配项目文档第6章规范）
 * ----------------------------------------------------------------------------
 * 输入：MediaPipe Hands 返回的 21 个手部关键点（归一化坐标 0~1）。
 * 输出：语义化手势名称，严格对应文档定义的手势交互体系。
 *
 * 优先级规则（从高到低）：
 *   双手组合指令 > 单手序列动作手势 > 功能指令手势 > 绘画模式 > 默认光标模式
 *
 * MediaPipe 关键点索引：
 *   0  手腕
 *   1-4   拇指（4 指尖）
 *   5-8   食指（8 指尖）
 *   9-12  中指（12 指尖）
 *   13-16 无名指（16 指尖）
 *   17-20 小指（20 指尖）
 */

export const GESTURE = {
  NONE: 'none',
  CURSOR: 'cursor',       // 单食指伸直 → 光标模式（默认）
  DRAW: 'draw',           // 食指+中指并拢 → 绘画模式
  FIST: 'fist',           // 握拳 → 暂停 / 长按缩放
  PALM: 'palm',           // 五指全张 → 无限画布拖拽
  OK: 'ok',               // OK 手势 → 切换颜色 / 画笔
  PEACE: 'peace',         // 比耶 → 滚动页面 / 列表
  PINCH: 'pinch',         // 拇指食指捏合 → 橡皮擦
  THREE: 'three',         // 三指伸展 → 笔刷滚盘（需静置1s）
  L_SHAPE: 'l_shape',     // 食指竖直+拇指横撑 → L型取景框
};

const TIP = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIP = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };
const MCP = { thumb: 2, index: 5, middle: 9, ring: 13, pinky: 17 };

export function dist(a, b) {
  const dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.hypot(a.x - b.x, a.y - b.y, dz);
}

function dist2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * 判断每根手指是否伸直。
 * 食指/中指/无名指/小指：指尖距手腕 > PIP距手腕 且 指尖在PIP上方。
 * 拇指：横向张开判断（距食指MCP的水平距离 / 掌宽）。
 */
export function getFingerStates(lm) {
  const wrist = lm[0];

  const isExtended = (finger) => {
    const tip = lm[TIP[finger]];
    const pip = lm[PIP[finger]];
    return dist(tip, wrist) > dist(pip, wrist) * 1.05;
  };

  // 拇指：指尖到食指掌指关节(5)的距离 vs 拇指指根(2)到(5)的距离
  const thumbTip = lm[TIP.thumb];
  const thumbIp = lm[PIP.thumb];
  const indexMcp = lm[MCP.index];
  const pinkyMcp = lm[MCP.pinky];
  const palmWidth = dist2d(indexMcp, pinkyMcp) || 0.0001;
  const thumbOut =
    dist2d(thumbTip, indexMcp) / palmWidth > 0.9 &&
    dist(thumbTip, wrist) > dist(thumbIp, wrist);

  return {
    thumb: thumbOut,
    index: isExtended('index'),
    middle: isExtended('middle'),
    ring: isExtended('ring'),
    pinky: isExtended('pinky'),
  };
}

export function countExtended(states) {
  return (
    (states.thumb ? 1 : 0) +
    (states.index ? 1 : 0) +
    (states.middle ? 1 : 0) +
    (states.ring ? 1 : 0) +
    (states.pinky ? 1 : 0)
  );
}

/**
 * 判断是否食指竖直 + 拇指横撑（构成 L 型取景框）。
 * 条件：
 *  - 食指伸直
 *  - 拇指横向外展（与食指方向接近垂直）
 *  - 中、无、小指弯曲收拢
 */
function isLShape(lm, states) {
  if (!states.index) return false;
  if (states.middle || states.ring || states.pinky) return false;

  const indexTip = lm[TIP.index];
  const indexPip = lm[PIP.index];
  const thumbTip = lm[TIP.thumb];
  const wrist = lm[0];

  // 食指方向向量（从PIP到指尖）
  const idxDx = indexTip.x - indexPip.x;
  const idxDy = indexTip.y - indexPip.y;
  const idxLen = Math.hypot(idxDx, idxDy) || 0.0001;

  // 拇指方向向量（从手腕到拇指尖）
  const thumbDx = thumbTip.x - wrist.x;
  const thumbDy = thumbTip.y - wrist.y;
  const thumbLen = Math.hypot(thumbDx, thumbDy) || 0.0001;

  // 食指与拇指夹角应接近 90°（cos ≈ 0）
  const dot = (idxDx * thumbDx + idxDy * thumbDy) / (idxLen * thumbLen);
  // |cos| < 0.5 即角度在 60°~120° 之间
  const isPerpendicular = Math.abs(dot) < 0.5;

  // 拇指需横向展开
  const thumbExtended = states.thumb;

  return isPerpendicular && thumbExtended;
}

/**
 * 对单只手分类手势。
 * 返回 { gesture, states, tip, middleTip, thumbTip, pinchDist, center }。
 * gesture 严格按照文档第6章定义。
 */
export function classifyHand(lm) {
  const states = getFingerStates(lm);
  const n = countExtended(states);
  const indexTip = lm[TIP.index];
  const middleTip = lm[TIP.middle];
  const thumbTip = lm[TIP.thumb];
  const palmWidth = dist2d(lm[MCP.index], lm[MCP.pinky]) || 0.0001;

  // 拇指食指捏合距离（用于 OK / pinch 判定）
  const pinchDist = dist2d(indexTip, thumbTip) / palmWidth;
  const isPinch = pinchDist < 0.45;

  // 拇指+食指捏合，其余三指伸直 → OK 手势
  const isOk =
    isPinch && states.middle && states.ring && states.pinky;

  let gesture = GESTURE.NONE;

  // ---- 按优先级分类 ----

  // L 型取景框手势（食指竖直 + 拇指横撑）
  if (isLShape(lm, states)) {
    gesture = GESTURE.L_SHAPE;
  }
  // 五指全张 → 画布拖拽（拇指可有可无，但至少4指全伸）
  else if (states.index && states.middle && states.ring && states.pinky) {
    gesture = GESTURE.PALM;
  }
  // OK 手势
  else if (isOk) {
    gesture = GESTURE.OK;
  }
  // 三指伸展 → 笔刷滚盘
  else if (states.index && states.middle && states.ring && !states.pinky) {
    gesture = GESTURE.THREE;
  }
  // 食指+中指并拢伸直 → 绘画模式（文档核心：双指=绘画，区别于单指光标）
  else if (states.index && states.middle && !states.ring && !states.pinky) {
    gesture = GESTURE.DRAW;
  }
  // 仅拇指食指捏合 → 橡皮擦
  else if (isPinch && !states.middle && !states.ring && !states.pinky) {
    gesture = GESTURE.PINCH;
  }
  // 单食指伸直 → 光标模式（默认）
  else if (states.index && !states.middle && !states.ring && !states.pinky) {
    gesture = isPinch ? GESTURE.PINCH : GESTURE.CURSOR;
  }
  // 全弯曲 → 握拳
  else if (n <= 1 && !states.index) {
    gesture = GESTURE.FIST;
  }
  // 兜底
  else if (isPinch) {
    gesture = GESTURE.PINCH;
  }

  return {
    gesture,
    states,
    fingerCount: n,
    tip: indexTip,           // 食指指尖（光标/点击）
    middleTip,               // 中指指尖（绘画笔尖）
    thumbTip,
    pinchDist,
    isPinch,
    center: lm[9],           // 中指掌指关节（掌心近似）
  };
}

/**
 * 计算手掌包围盒中心与半径（用于橡皮擦/抓星星范围判定）。
 */
export function palmRegion(lm) {
  let cx = 0,
    cy = 0;
  const pts = [0, 5, 9, 13, 17];
  pts.forEach((i) => {
    cx += lm[i].x;
    cy += lm[i].y;
  });
  cx /= pts.length;
  cy /= pts.length;
  const r = dist2d(lm[0], lm[12]); // 手腕到中指尖
  return { x: cx, y: cy, r };
}

/**
 * 检测序列动作：五指张开 → 缓慢捏拳（用于唤起贴纸面板）。
 * 跟踪手掌状态变化，识别完整的"张开-收拢"序列。
 */
export class SequenceDetector {
  constructor() {
    this.stage = 'idle';     // idle | open | closing | done
    this.openStart = 0;
    this.lastFingerCount = 0;
  }

  /**
   * @param {object} hand - classifyHand 的输出
   * @param {number} now - performance.now()
   * @returns {string|null} - 'triggered' 当序列完成时，否则 null
   */
  update(hand, now) {
    if (!hand) {
      this.reset();
      return null;
    }

    const fc = hand.fingerCount;
    const isOpen = hand.gesture === GESTURE.PALM;
    const isFist = hand.gesture === GESTURE.FIST;

    switch (this.stage) {
      case 'idle':
        if (isOpen) {
          this.stage = 'open';
          this.openStart = now;
          this.lastFingerCount = fc;
        }
        break;

      case 'open':
        // 必须保持张开至少 300ms 才开始检测收拢
        if (!isOpen) {
          if (fc < this.lastFingerCount) {
            this.stage = 'closing';
          } else {
            this.reset();
          }
        }
        this.lastFingerCount = fc;
        break;

      case 'closing':
        if (isFist) {
          this.reset();
          return 'triggered';
        }
        if (fc < this.lastFingerCount) {
          this.lastFingerCount = fc;
        } else if (isOpen || fc > this.lastFingerCount + 1) {
          this.reset();
        }
        if (now - this.openStart > 2500) {
          this.reset();
        }
        break;
    }

    return null;
  }

  reset() {
    this.stage = 'idle';
    this.openStart = 0;
    this.lastFingerCount = 0;
  }
}

/**
 * 多手综合判定，识别双手协同手势。
 * hands: [{ landmarks, handedness, ...classified }]
 * 返回 { perHand: [...], combo, midline }
 *
 * 双手组合指令（优先级最高）：
 *  - double_palm: 双手五指全张静置 → 清空画布（2s计时）
 *  - heart: 双手比心 → 爱心画笔
 *  - l_shape_screenshot: L型手势 + 另一手捏合 → 取景截图
 */
export function classifyHands(handsLandmarks, handedness = []) {
  const perHand = handsLandmarks.map((lm, i) => ({
    handedness: handedness[i]?.categoryName || (i === 0 ? 'Right' : 'Left'),
    landmarks: lm,
    ...classifyHand(lm),
  }));

  let combo = null;
  if (perHand.length === 2) {
    const [a, b] = perHand;

    // 双手五指全张 → 清空画布（在CanvasBoard中计时2s防误触）
    if (a.gesture === GESTURE.PALM && b.gesture === GESTURE.PALM) {
      combo = 'double_palm';
    }
    // 双手比心
    else if (isHeart(a, b)) {
      combo = 'heart';
    }
    // L型 + 捏合 → 取景截图
    else if (
      (a.gesture === GESTURE.L_SHAPE && b.gesture === GESTURE.PINCH) ||
      (b.gesture === GESTURE.L_SHAPE && a.gesture === GESTURE.PINCH)
    ) {
      combo = 'l_shape_screenshot';
    }
    // 双手捏合 → 同时擦除
    else if (a.gesture === GESTURE.PINCH && b.gesture === GESTURE.PINCH) {
      combo = 'double_pinch';
    }
  }

  return { perHand, combo };
}

function isHeart(a, b) {
  const idxClose = dist2d(a.tip, b.tip) < 0.12;
  const thumbClose = dist2d(a.thumbTip, b.thumbTip) < 0.18;
  const curled = !a.states.pinky && !b.states.pinky;
  return idxClose && thumbClose && curled;
}

/**
 * 平滑滤波器（指数移动平均），减少指尖抖动。
 */
export class SmoothPoint {
  constructor(alpha = 0.5) {
    this.alpha = alpha;
    this.x = null;
    this.y = null;
  }
  next(x, y) {
    if (this.x === null) {
      this.x = x;
      this.y = y;
    } else {
      this.x = this.alpha * x + (1 - this.alpha) * this.x;
      this.y = this.alpha * y + (1 - this.alpha) * this.y;
    }
    return { x: this.x, y: this.y };
  }
  reset() {
    this.x = null;
    this.y = null;
  }
}
