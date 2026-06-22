'use client';

import { useState } from 'react';

/**
 * 新手交互式手势引导教程。分步演示核心手势，首次进入自动弹出。
 */
const STEPS = [
  { emoji: '☝️', title: '光标模式（默认）', desc: '只伸出食指即为光标，隔空移动定位。食指+中指并拢则进入绘画模式，以中指指尖为笔尖画出线条。' },
  { emoji: '🤏', title: '捏合橡皮擦', desc: '拇指与食指捏合即可擦除涂鸦。保持捏合并移动可持续擦除，松开即退出。' },
  { emoji: '🖐️', title: '五指拖拽画布', desc: '单掌五指完全张开，移动手掌即可拖拽无限画布。底层摄像头画面固定不动，握拳收拢终止拖拽。' },
  { emoji: '👌', title: 'OK 换色', desc: '比 OK 手势切换画笔颜色，左右手分别对应不同颜色。' },
  { emoji: '🤟', title: '三指笔刷滚盘', desc: '伸出三指静置 1 秒唤起半圆笔刷滚盘，循环切换星光、彩虹、烟花、水彩、霓虹、像素等特效笔。' },
  { emoji: '🖐️→✊', title: '序列动作贴纸', desc: '五指张开 → 缓慢捏拳，唤起贴纸素材库。选中贴纸后用捏合手势放置到画布。' },
  { emoji: '🫰🫱', title: '双手高级手势', desc: '双手全张静置 2 秒清空画布；双手比心开启爱心笔；单手 L 型 + 另一手捏合 3 秒截图保存。' },
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
