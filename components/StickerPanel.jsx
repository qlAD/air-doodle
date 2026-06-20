'use client';

/**
 * 贴纸面板组件。比耶手势呼出，选择后用捏合手势在画布放置。
 */
const STICKERS = {
  表情: ['😀', '😍', '😎', '🥳', '😺', '🤖', '👻', '🦄'],
  自然: ['🌸', '🌈', '☁️', '⭐', '🌙', '🍀', '🌻', '🔥'],
  节日: ['🎄', '🎁', '🎃', '🧧', '🎆', '🎈', '🍡', '🥮'],
  装饰: ['💗', '💎', '👑', '🎀', '🏆', '✨', '🎵', '💌'],
};

export default function StickerPanel({ onPick, onClose }) {
  return (
    <div className="absolute right-3 top-16 bottom-16 z-30 w-56 card-soft rounded-2xl p-3 overflow-y-auto animate-pop">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-extrabold text-sm">🎟️ 贴纸</h3>
        <button onClick={onClose} className="text-[#6d6d9c] hover:text-candy-pink text-lg leading-none">×</button>
      </div>
      {Object.entries(STICKERS).map(([group, items]) => (
        <div key={group} className="mb-3">
          <div className="text-xs font-bold text-[#6d6d9c] mb-1">{group}</div>
          <div className="grid grid-cols-4 gap-1">
            {items.map((s) => (
              <button
                key={s}
                onClick={() => onPick(s)}
                className="aspect-square rounded-lg text-2xl bg-white/70 hover:bg-white hover:scale-110 transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-[#9a9ac0] text-center mt-2">点击选择后，用🤏捏合手势放置到画布</p>
    </div>
  );
}
