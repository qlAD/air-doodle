'use client';

import { useState } from 'react';

/**
 * 新手交互式手势引导教程。分步演示核心手势，首次进入自动弹出。
 */
const STEPS = [
  { emoji: '☝️', title: '食指绘画', desc: '只伸出食指，在空中移动即可画出线条。轨迹会自动平滑。' },
  { emoji: '✊', title: '握拳暂停', desc: '五指握拳锁定画笔，移动手不会留下笔迹，方便重新定位。' },
  { emoji: '🖐️', title: '手掌橡皮擦', desc: '五指完全摊开，手掌覆盖区域会被擦除。双手摊开则雾化擦除。' },
  { emoji: '👌', title: 'OK 换色', desc: '比 OK 手势切换画笔颜色，左右手对应不同颜色。' },
  { emoji: '🤟', title: '三指换特效笔', desc: '伸出三指循环切换星光、彩虹、烟花、水彩、霓虹、像素等特效笔。' },
  { emoji: '✌️', title: '比耶贴纸', desc: '比耶手势呼出贴纸面板，选中后用🤏捏合手势放置到画布。' },
  { emoji: '🫰', title: '双手比心爱心笔', desc: '双手比心自动开启爱心画笔；双手握拳 2 秒可一键清空画布。' },
];

export default function TutorialGuide({ onClose }) {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4">
      <div className="card-soft rounded-3xl p-8 max-w-md w-full text-center animate-pop">
        <div className="text-xs font-bold text-candy-purple mb-2">
          新手教程 {step + 1} / {STEPS.length}
        </div>
        <div className="text-7xl mb-4 animate-float">{s.emoji}</div>
        <h2 className="text-2xl font-extrabold mb-2">{s.title}</h2>
        <p className="text-[#6d6d9c] leading-relaxed mb-6">{s.desc}</p>

        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition ${i === step ? 'bg-candy-pink w-5' : 'bg-white'}`}
            />
          ))}
        </div>

        <div className="flex gap-2 justify-center">
          {step > 0 && (
            <button className="btn-ghost" onClick={() => setStep((v) => v - 1)}>上一步</button>
          )}
          {last ? (
            <button className="btn-candy" onClick={onClose}>🎨 开始创作</button>
          ) : (
            <button className="btn-candy" onClick={() => setStep((v) => v + 1)}>下一步</button>
          )}
          <button className="btn-ghost" onClick={onClose}>跳过</button>
        </div>
      </div>
    </div>
  );
}
