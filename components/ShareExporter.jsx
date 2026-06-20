'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 分享导出组件
 * ----------------------------------------------------------------------------
 * - 将画作合成带 Air Doodle 水印/边框/文案的分享海报
 * - 保存作品到后端（/api/artwork/upload），可选公开/私密
 * - 下载图片、复制链接、调用 Web Share API
 */
const FRAMES = [
  { id: 'candy', name: '糖果边框', grad: ['#ff9a9e', '#a18cd1'] },
  { id: 'mint', name: '薄荷边框', grad: ['#a8edea', '#fed6e3'] },
  { id: 'sunny', name: '暖阳边框', grad: ['#fddb92', '#d1fdff'] },
];

export default function ShareExporter({ getImage, templateId, brush, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [frame, setFrame] = useState('candy');
  const [caption, setCaption] = useState('我用隔空手势画出了这幅画');
  const [posterUrl, setPosterUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const posterCanvasRef = useRef(null);

  // 合成海报
  useEffect(() => {
    const src = getImage();
    if (!src) return;
    const img = new Image();
    img.onload = () => {
      const pad = 60;
      const footer = 90;
      const c = posterCanvasRef.current || document.createElement('canvas');
      c.width = img.width + pad * 2;
      c.height = img.height + pad + footer;
      const ctx = c.getContext('2d');
      const f = FRAMES.find((x) => x.id === frame);
      const grad = ctx.createLinearGradient(0, 0, c.width, c.height);
      grad.addColorStop(0, f.grad[0]);
      grad.addColorStop(1, f.grad[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, c.width, c.height);
      // 作品白底
      ctx.fillStyle = '#fff';
      ctx.fillRect(pad - 6, pad - 6, img.width + 12, img.height + 12);
      ctx.drawImage(img, pad, pad);
      // 文案
      ctx.fillStyle = '#3b3b5c';
      ctx.font = 'bold 30px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(caption, c.width / 2, img.height + pad + 42);
      // 水印
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = 'rgba(59,59,92,0.7)';
      ctx.fillText('🖐️ Air Doodle 手势涂鸦工坊', c.width / 2, img.height + pad + 74);
      setPosterUrl(c.toDataURL('image/png'));
    };
    img.src = src;
  }, [getImage, frame, caption]);

  async function handleSave() {
    if (!posterUrl) return;
    setSaving(true);
    setSavedMsg('');
    try {
      const blob = await (await fetch(getImage())).blob();
      const fd = new FormData();
      fd.append('file', blob, 'artwork.png');
      fd.append('name', name || '我的隔空涂鸦');
      fd.append('isPublic', String(isPublic));
      if (templateId) fd.append('templateId', templateId);
      if (brush) fd.append('brushType', brush);
      const r = await fetch('/api/artwork/upload', { method: 'POST', body: fd });
      const data = await r.json();
      if (data.ok) {
        setSavedMsg('✅ 已保存到画廊！');
        onSaved?.();
      } else {
        setSavedMsg('❌ 保存失败：' + (data.error || '未知错误'));
      }
    } catch (e) {
      setSavedMsg('❌ 保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function download(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  }

  async function nativeShare() {
    if (!posterUrl) return;
    try {
      const blob = await (await fetch(posterUrl)).blob();
      const file = new File([blob], 'air-doodle.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Air Doodle 手势涂鸦', text: caption });
      } else {
        download(posterUrl, 'air-doodle-poster.png');
      }
    } catch {
      /* 用户取消 */
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="card-soft rounded-3xl p-5 max-w-4xl w-full max-h-[92vh] overflow-y-auto animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-gradient">💾 保存与分享</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#6d6d9c]">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* 海报预览 */}
          <div>
            <canvas ref={posterCanvasRef} className="hidden" />
            {posterUrl ? (
              <img src={posterUrl} alt="分享海报" className="w-full rounded-2xl shadow" />
            ) : (
              <div className="aspect-square rounded-2xl bg-white/50 flex items-center justify-center">生成中…</div>
            )}
          </div>

          {/* 配置 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold">作品名称</label>
              <input
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="给作品起个名字"
                className="w-full mt-1 rounded-lg px-3 py-2 bg-white/80"
              />
            </div>
            <div>
              <label className="text-sm font-bold">分享文案</label>
              <input
                value={caption} onChange={(e) => setCaption(e.target.value)}
                className="w-full mt-1 rounded-lg px-3 py-2 bg-white/80"
              />
            </div>
            <div>
              <label className="text-sm font-bold">边框风格</label>
              <div className="flex gap-2 mt-1">
                {FRAMES.map((f) => (
                  <button
                    key={f.id} onClick={() => setFrame(f.id)}
                    className={`flex-1 rounded-lg py-2 text-xs font-semibold ${frame === f.id ? 'ring-2 ring-candy-purple' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${f.grad[0]}, ${f.grad[1]})` }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              公开投稿到社区（取消则仅自己可见）
            </label>

            {savedMsg && <p className="text-sm font-bold">{savedMsg}</p>}

            <div className="grid grid-cols-2 gap-2">
              <button className="btn-candy" onClick={handleSave} disabled={saving}>
                {saving ? '保存中…' : '☁️ 保存到画廊'}
              </button>
              <button className="btn-ghost" onClick={() => download(posterUrl, 'air-doodle-poster.png')}>
                🖼️ 下载海报
              </button>
              <button className="btn-ghost" onClick={() => download(getImage(), 'air-doodle.png')}>
                📥 下载原图
              </button>
              <button className="btn-ghost" onClick={nativeShare}>📤 一键分享</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
