'use client';

import { BRUSHES, BRUSH_COLORS } from '@/lib/brushes';
import { BACKGROUNDS } from './Backgrounds';
import { TEMPLATES } from '@/lib/templates';

/**
 * 特效画笔 / 颜色 / 笔粗 / 背景 / 临摹模板 选择面板。
 */
export default function BrushPanel({
  brush, color, size, background, templateId, templateOpacity,
  onBrush, onColor, onSize, onBackground, onTemplate, onTemplateOpacity,
}) {
  return (
    <div className="card-soft rounded-2xl p-4 space-y-4">
      {/* 画笔 */}
      <Section title="🖌️ 特效画笔">
        <div className="grid grid-cols-4 gap-2">
          {BRUSHES.map((b) => (
            <button
              key={b.id}
              onClick={() => onBrush(b.id)}
              title={b.name}
              className={`aspect-square rounded-xl text-xl flex items-center justify-center transition ${
                brush === b.id ? 'bg-candy-purple text-white scale-105 shadow' : 'bg-white/70 hover:bg-white'
              }`}
            >
              {b.emoji}
            </button>
          ))}
        </div>
      </Section>

      {/* 颜色 */}
      <Section title="🎨 颜色">
        <div className="flex flex-wrap gap-2">
          {BRUSH_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition ${
                color === c ? 'border-candy-purple scale-110' : 'border-white'
              }`}
              style={{ background: c }}
            />
          ))}
        </div>
      </Section>

      {/* 笔粗 */}
      <Section title={`✏️ 笔粗 ${size}px`}>
        <input
          type="range" min="2" max="30" value={size}
          onChange={(e) => onSize(Number(e.target.value))}
          className="w-full accent-candy-pink"
        />
      </Section>

      {/* 背景 */}
      <Section title="🌈 动态背景">
        <div className="grid grid-cols-3 gap-2">
          {BACKGROUNDS.map((bg) => (
            <button
              key={bg.id}
              onClick={() => onBackground(bg.id)}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                background === bg.id ? 'bg-candy-blue text-white' : 'bg-white/70 hover:bg-white'
              }`}
            >
              {bg.emoji} {bg.name}
            </button>
          ))}
        </div>
      </Section>

      {/* 临摹模板 */}
      <Section title="✏️ 临摹模板">
        <select
          value={templateId || ''}
          onChange={(e) => onTemplate(e.target.value || null)}
          className="w-full rounded-lg px-2 py-1.5 text-sm bg-white/80"
        >
          <option value="">不使用模板</option>
          {TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.emoji} {t.name}（{levelLabel(t.level)}）
            </option>
          ))}
        </select>
        {templateId && (
          <div className="mt-2">
            <label className="text-xs text-[#6d6d9c]">透明度 {Math.round(templateOpacity * 100)}%</label>
            <input
              type="range" min="0.1" max="0.7" step="0.05" value={templateOpacity}
              onChange={(e) => onTemplateOpacity(Number(e.target.value))}
              className="w-full accent-candy-purple"
            />
          </div>
        )}
      </Section>
    </div>
  );
}

function levelLabel(l) {
  return { easy: '幼儿', medium: '进阶', hard: '高手' }[l] || l;
}

function Section({ title, children }) {
  return (
    <div>
      <div className="font-bold text-xs mb-2 text-[#6d6d9c]">{title}</div>
      {children}
    </div>
  );
}
