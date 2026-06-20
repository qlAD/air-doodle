/**
 * 手势判定逻辑
 * ----------------------------------------------------------------------------
 * 输入：MediaPipe Hands 返回的 21 个手部关键点（归一化坐标 0~1）。
 * 输出：语义化手势名称（pointing / fist / palm / ok / peace / pinch ...）。
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
  POINTING: 'pointing', // 食指单指 -> 绘画
  FIST: 'fist', // 握拳 -> 暂停 / 长按清空
  PALM: 'palm', // 五指摊开 -> 橡皮擦
  OK: 'ok', // OK 手势 -> 换色 / 特效切换
  PEACE: 'peace', // 比耶 -> 贴纸面板
  PINCH: 'pinch', // 食指拇指捏合 -> 抓取（小游戏）
  THREE: 'three', // 三指 -> 特效组合
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
 * 对食指/中指/无名指/小指：指尖距手腕 > PIP 距手腕 且 指尖在 PIP 上方。
 * 对拇指：用横向张开判断（指尖到掌心中指根的水平距离）。
 */
export function getFingerStates(lm) {
  const wrist = lm[0];
  const isExtended = (finger) => {
    const tip = lm[TIP[finger]];
    const pip = lm[PIP[finger]];
    // 指尖比近端指节离手腕更远 => 伸直
    return dist(tip, wrist) > dist(pip, wrist) * 1.05;
  };

  // 拇指：指尖到中指掌指关节(9)的距离 与 指根(2)到(9)的距离比较
  const thumbTip = lm[TIP.thumb];
  const thumbIp = lm[PIP.thumb];
  const indexMcp = lm[MCP.index];
  const pinkyMcp = lm[MCP.pinky];
  const palmWidth = dist2d(indexMcp, pinkyMcp) || 0.0001;
  const thumbOut = dist2d(thumbTip, indexMcp) / palmWidth > 0.9 &&
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
 * 对单只手分类手势。
 * 返回 { gesture, states, tip }，tip 为食指指尖（归一化坐标）。
 */
export function classifyHand(lm) {
  const states = getFingerStates(lm);
  const n = countExtended(states);
  const indexTip = lm[TIP.index];
  const thumbTip = lm[TIP.thumb];
  const palmWidth = dist2d(lm[MCP.index], lm[MCP.pinky]) || 0.0001;

  // 食指拇指捏合距离（OK / pinch）
  const pinchDist = dist2d(indexTip, thumbTip) / palmWidth;
  const isPinch = pinchDist < 0.45;

  let gesture = GESTURE.NONE;

  if (n <= 1 && !states.index) {
    gesture = GESTURE.FIST; // 全部弯曲（拇指可能略翘）
  } else if (states.index && states.middle && states.ring && states.pinky) {
    gesture = GESTURE.PALM; // 五指摊开（拇指可有可无）
  } else if (isPinch && states.middle && states.ring) {
    gesture = GESTURE.OK; // 拇指食指捏合 + 其余伸直
  } else if (states.index && states.middle && !states.ring && !states.pinky) {
    gesture = GESTURE.PEACE; // 比耶
  } else if (states.index && !states.middle && !states.ring && !states.pinky) {
    gesture = isPinch ? GESTURE.PINCH : GESTURE.POINTING; // 单食指
  } else if (states.index && states.middle && states.ring && !states.pinky) {
    gesture = GESTURE.THREE; // 三指
  } else if (isPinch) {
    gesture = GESTURE.PINCH;
  }

  return {
    gesture,
    states,
    fingerCount: n,
    tip: indexTip, // 食指指尖
    thumbTip,
    pinchDist,
    center: lm[9], // 掌心近似（中指根）
  };
}

/**
 * 计算手掌包围盒中心与半径（用于橡皮擦/抓星星范围判定）。
 */
export function palmRegion(lm) {
  let cx = 0, cy = 0;
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
 * 多手综合判定，识别双手协同手势。
 * hands: [{ landmarks, handedness, ...classified }]
 * 返回 { perHand: [...], combo, midline }
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
    // 双手握拳
    if (a.gesture === GESTURE.FIST && b.gesture === GESTURE.FIST) {
      combo = 'double_fist';
    }
    // 双手摊开
    else if (a.gesture === GESTURE.PALM && b.gesture === GESTURE.PALM) {
      combo = 'double_palm';
    }
    // 双手比心：两手食指尖接近 + 两手拇指尖接近（构成心形顶部/底部）
    else if (isHeart(a, b)) {
      combo = 'heart';
    }
  }

  return { perHand, combo };
}

function isHeart(a, b) {
  // 两手食指指尖靠近（心尖），拇指指尖靠近（心顶），中无小指弯曲
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
