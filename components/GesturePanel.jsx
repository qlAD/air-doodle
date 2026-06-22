'use client';

import { BRUSHES } from '@/lib/brushes';

/**
 * 手势可视化面板：实时显示当前手势、画笔、颜色，以及手势速查表。
 */
const CHEATSHEET = [
  { g: '☝️ 食指伸直', a: '光标模式（默认）' },
  { g: '☝️🤞 食指+中指并拢', a: '绘画模式' },
  { g: '🤏 拇指食指捏合', a: '橡皮擦' },
  { g: '🖐️ 五指全张', a: '拖拽无限画布' },
  { g: '✊ 握拳', a: '暂停落笔' },
  { g: '👌 OK 手势', a: '切换颜色' },
  { g: '🤟 三指静置1秒', a: '笔刷滚盘' },
  { g: '✌️ 比耶', a: '页面滚动' },
  { g: '🖐️→✊ 张开→握拳', a: '贴纸面板' },
  { g: '🖐️🖐️ 双手全张2秒', a: '清空画布' },
  { g: '🫰 双手比心', a: '爱心画笔' },
  { g: '🫱 L型+捏合3秒', a: '取景截图' },
];

export default function GesturePanel({ gesture, brush, color, hands, mode }) {
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
      <div className="rounded-xl bg-white/60 px-3 py-2 text-center font-bold text-candy-purple text-sm mb-1 min-h-[2.2rem] flex items-center justify-center">
        {gesture === 'none' ? '等待手势…' : gesture}
      </div>
      {mode && (
        <div className="text-center text-[10px] text-[#9a9ac0] mb-3">
          当前模式：{mode}
        </div>
      )}
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
