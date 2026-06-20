'use client';

/**
 * 动态背景画布层（星空 / 云朵 / 海浪 / 渐变 / 节日）。
 * 用纯 CSS 渐变与简单动画实现，置于视频层之下。
 */
export const BACKGROUNDS = [
  { id: 'none', name: '无', emoji: '⬜' },
  { id: 'starry', name: '星空', emoji: '🌌' },
  { id: 'cloud', name: '云朵', emoji: '☁️' },
  { id: 'wave', name: '海浪', emoji: '🌊' },
  { id: 'gradient', name: '渐变', emoji: '🌈' },
  { id: 'festival', name: '节日', emoji: '🎉' },
];

const STYLES = {
  none: { background: 'transparent' },
  starry: {
    background:
      'radial-gradient(2px 2px at 20% 30%, #fff, transparent), radial-gradient(2px 2px at 70% 60%, #fff, transparent), radial-gradient(1px 1px at 40% 80%, #fff, transparent), radial-gradient(1px 1px at 85% 20%, #fff, transparent), linear-gradient(160deg, #1a1340, #2d1b66 60%, #4a2c8f)',
  },
  cloud: {
    background:
      'radial-gradient(circle at 25% 30%, rgba(255,255,255,0.9) 0 60px, transparent 61px), radial-gradient(circle at 70% 50%, rgba(255,255,255,0.85) 0 70px, transparent 71px), linear-gradient(160deg, #aee2ff, #e6f6ff)',
  },
  wave: {
    background: 'linear-gradient(180deg, #4fc3f7, #0288d1 70%, #01579b)',
  },
  gradient: {
    background: 'linear-gradient(135deg, #ff9a9e, #fad0c4 40%, #a18cd1 100%)',
  },
  festival: {
    background:
      'radial-gradient(circle at 30% 20%, #ffe28a 0 8px, transparent 9px), radial-gradient(circle at 60% 70%, #ff7eb9 0 8px, transparent 9px), radial-gradient(circle at 80% 30%, #7efcc1 0 8px, transparent 9px), linear-gradient(160deg, #c0392b, #8e44ad)',
  },
};

export default function Backgrounds({ type = 'none' }) {
  return (
    <div
      className="absolute inset-0 w-full h-full"
      style={STYLES[type] || STYLES.none}
      aria-hidden
    />
  );
}
