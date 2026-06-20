'use client';

import { BRUSHES } from '@/lib/brushes';

/**
 * 手势可视化面板：实时显示当前手势、画笔、颜色，以及手势速查表。
 */
const CHEATSHEET = [
  { g: '☝️ 食指伸直', a: '隔空绘画' },
  { g: '✊ 握拳', a: '暂停落笔' },
  { g: '🖐️ 五指摊开', a: '橡皮擦' },
  { g: '👌 OK 手势', a: '切换颜色' },
  { g: '🤟 三指', a: '切换特效笔' },
  { g: '✌️ 比耶', a: '贴纸面板' },
  { g: '🤏 捏合', a: '放置贴纸' },
  { g: '✊✊ 双手握拳2秒', a: '清空画布' },
  { g: '🖐️🖐️ 双手摊开', a: '雾化擦除' },
  { g: '🫰 双手比心', a: '爱心画笔' },
];

export default function GesturePanel({ gesture, brush, color, hands }) {
  const b = BRUSHES.find((x) => x.id === brush);
  return (
    <div className="card-soft rounded-2xl p-4">
      <h3 className="font-extrabold text-sm mb-3 flex items-center gap-1">
        <span>🎯</span> 实时手势
      </h3>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-white shadow"
          style={{ background: color }}
        />
        <div className="flex-1">
          <div className="text-xs text-[#6d6d9c]">当前画笔</div>
          <div className="font-bold text-sm">{b?.emoji} {b?.name}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[#6d6d9c]">手数</div>
          <div className="font-bold">{hands}</div>
        </div>
      </div>
      <div className="rounded-xl bg-white/60 px-3 py-2 text-center font-bold text-candy-purple text-sm mb-3 min-h-[2.2rem] flex items-center justify-center">
        {gesture === 'none' ? '等待手势…' : gesture}
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer font-bold text-[#6d6d9c] mb-1">📋 手势速查表</summary>
        <ul className="space-y-1 mt-2">
          {CHEATSHEET.map((c) => (
            <li key={c.g} className="flex justify-between gap-2">
              <span>{c.g}</span>
              <span className="text-candy-purple font-semibold">{c.a}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
