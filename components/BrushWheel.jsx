'use client';

import { BRUSHES } from '@/lib/brushes';

/**
 * 半圆笔刷滚盘组件。
 * 三指伸展静置 1 秒后唤出，呈扇形排列笔刷选项。
 * 点击选择切换笔刷，点击空白处关闭。
 */
export default function BrushWheel({ brush, onSelect, onClose }) {
  const count = BRUSHES.length;
  const radius = 130;
  const cx = 0;
  const cy = 40;

  return (
    <div className="absolute inset-0 z-35" onClick={onClose}>
      <div className="absolute inset-0 bg-black/25" />

      <div className="absolute bottom-28 left-1/2 -translate-x-1/2">
        <div className="relative" style={{ width: radius * 2 + 80, height: radius + 80 }}>
          {/* 中心标签 */}
          <div
            className="absolute z-10 card-soft rounded-full px-4 py-1.5 text-xs font-extrabold text-candy-purple"
            style={{
              left: '50%',
              top: cy + 40,
              transform: 'translate(-50%, -50%)',
            }}
          >
            🖌️ 笔刷
          </div>

          {BRUSHES.map((b, i) => {
            const angleStart = -Math.PI * (5 / 6);
            const angleEnd = -Math.PI / 6;
            const angle = angleStart + (angleEnd - angleStart) * (i / (count - 1 || 1));
            const bx = cx + radius * Math.cos(angle);
            const by = cy + radius * Math.sin(angle);
            const active = b.id === brush;

            return (
              <button
                key={b.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(b.id);
                }}
                className={`absolute rounded-2xl flex flex-col items-center justify-center transition-all duration-200 ${
                  active
                    ? 'bg-candy-purple text-white scale-110 shadow-lg z-10'
                    : 'card-soft hover:scale-105 hover:bg-white'
                }`}
                style={{
                  left: `calc(50% + ${bx}px)`,
                  top: `${cy + 40 + by}px`,
                  transform: `translate(-50%, -50%) ${active ? 'scale(1.15)' : ''}`,
                  width: 64,
                  height: 64,
                }}
                title={b.name}
              >
                <span className="text-2xl">{b.emoji}</span>
                <span className="text-[10px] font-bold mt-0.5 leading-tight">{b.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <span className="px-3 py-1 rounded-full text-xs font-bold card-soft">
          点击选择笔刷 · 点击空白处关闭
        </span>
      </div>
    </div>
  );
}
