/**
 * 音效管理工具 —— 基于 Web Audio API 合成音效，无需外部音频文件。
 * 同时封装移动端触觉震动（navigator.vibrate）。
 */

let ctx = null;
let enabled = true;

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, type = 'sine', dur = 0.12, gain = 0.15, slide = 0 }) {
  const ac = ensureCtx();
  if (!ac || !enabled) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), ac.currentTime + dur);
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  osc.connect(g).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

export const Sound = {
  setEnabled(v) {
    enabled = v;
  },
  isEnabled() {
    return enabled;
  },
  // 用户首次交互时调用以解锁 AudioContext
  unlock() {
    ensureCtx();
  },
  draw() {
    tone({ freq: 600, type: 'triangle', dur: 0.05, gain: 0.04 });
  },
  color() {
    tone({ freq: 520, type: 'sine', dur: 0.12, gain: 0.12, slide: 220 });
  },
  erase() {
    tone({ freq: 180, type: 'sawtooth', dur: 0.18, gain: 0.08, slide: -80 });
  },
  clear() {
    tone({ freq: 300, type: 'square', dur: 0.4, gain: 0.1, slide: 500 });
    setTimeout(() => tone({ freq: 800, type: 'triangle', dur: 0.3, gain: 0.1 }), 120);
    this.vibrate([30, 30, 60]);
  },
  pop() {
    tone({ freq: 880, type: 'sine', dur: 0.08, gain: 0.12 });
  },
  achieve() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone({ freq: f, type: 'triangle', dur: 0.18, gain: 0.12 }), i * 100)
    );
    this.vibrate([20, 40, 20, 40, 60]);
  },
  vibrate(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate && enabled) {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* 忽略不支持的设备 */
      }
    }
  },
};

export default Sound;
