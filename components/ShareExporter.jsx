'use client';

import { useEffect, useRef, useState } from 'react';
import { FILTER_TYPES } from '@/lib/filters';

const FRAMES = [
  { id: 'candy', name: '糖果边框', grad: ['#ff9a9e', '#a18cd1'] },
  { id: 'mint', name: '薄荷边框', grad: ['#a8edea', '#fed6e3'] },
  { id: 'sunny', name: '暖阳边框', grad: ['#fddb92', '#d1fdff'] },
];

export default function ShareExporter({ getImage, templateId, brush, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [frame, setFrame] = useState('candy');
  const [filter, setFilter] = useState('');
  const [caption, setCaption] = useState('我用隔空手势画出了这幅画');
  const [posterUrl, setPosterUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [tab, setTab] = useState('poster');
  const posterCanvasRef = useRef(null);

  // 视频录制状态
  const [recording, setRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(0);

  // 合成海报
  useEffect(() => {
    if (tab !== 'poster') return;
    const src = getImage();
    if (!src) return;
    const img = new Image();
    img.onload = async () => {
      const pad = 60, footer = 90;
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
      ctx.fillStyle = '#fff';
      ctx.fillRect(pad - 6, pad - 6, img.width + 12, img.height + 12);

      // 应用滤镜
      if (filter) {
        const tmp = document.createElement('canvas');
        tmp.width = img.width; tmp.height = img.height;
        const tctx = tmp.getContext('2d');
        tctx.drawImage(img, 0, 0);
        try {
          const { applyFilter } = await import('@/lib/filters');
          const srcData = tctx.getImageData(0, 0, tmp.width, tmp.height);
          tctx.putImageData(applyFilter(srcData, filter), 0, 0);
        } catch { /* fallback */ }
        ctx.drawImage(tmp, pad, pad);
      } else {
        ctx.drawImage(img, pad, pad);
      }

      ctx.fillStyle = '#3b3b5c';
      ctx.font = 'bold 30px "Baloo 2", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(caption, c.width / 2, img.height + pad + 42);
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = 'rgba(59,59,92,0.7)';
      ctx.fillText('🖐️ Air Doodle 手势涂鸦工坊', c.width / 2, img.height + pad + 74);
      setPosterUrl(c.toDataURL('image/png'));
    };
    img.src = src;
  }, [getImage, frame, caption, filter, tab]);

  // 录制
  function startRecording() {
    const canvases = document.querySelectorAll('canvas');
    if (canvases.length < 2) return;
    const combined = document.createElement('canvas');
    const [drawC, fxC] = canvases;
    combined.width = drawC.width || 800;
    combined.height = drawC.height || 600;
    const cctx = combined.getContext('2d');
    const stream = combined.captureStream(24);
    streamRef.current = stream;

    const drawLoop = () => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive') return;
      cctx.clearRect(0, 0, combined.width, combined.height);
      if (drawC) cctx.drawImage(drawC, 0, 0);
      if (fxC) cctx.drawImage(fxC, 0, 0);
      requestAnimationFrame(drawLoop);
    };
    drawLoop();

    const chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordedVideo({ url: URL.createObjectURL(blob), blob });
      stream.getTracks().forEach((t) => t.stop());
    };
    recorderRef.current = recorder;
    recorder.start(200);
    setRecording(true);
    setRecordDuration(0);
    setRecordedVideo(null);
    timerRef.current = setInterval(() => {
      setRecordDuration((d) => {
        if (d >= 10) { stopRecording(); return 10; }
        return d + 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  }

  useEffect(() => () => {
    clearInterval(timerRef.current);
    recorderRef.current?.state === 'recording' && recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

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
      if (filter) fd.append('filterType', filter);
      const r = await fetch('/api/artwork/upload', { method: 'POST', body: fd });
      const data = await r.json();
      setSavedMsg(data.ok ? '✅ 已保存到画廊！' : '❌ 保存失败：' + (data.error || '未知错误'));
      if (data.ok) onSaved?.();
    } catch (e) {
      setSavedMsg('❌ 保存失败：' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function download(url, filename) {
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
  }

  async function nativeShare() {
    if (!posterUrl) return;
    try {
      const blob = await (await fetch(posterUrl)).blob();
      const file = new File([blob], 'air-doodle.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Air Doodle', text: caption });
      } else {
        download(posterUrl, 'air-doodle-poster.png');
      }
    } catch { /* cancel */ }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-soft rounded-3xl p-5 max-w-4xl w-full max-h-[92vh] overflow-y-auto animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-extrabold text-gradient">💾 保存与分享</h2>
          <button onClick={onClose} className="text-2xl leading-none text-[#6d6d9c]">×</button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('poster')} className={`px-4 py-1.5 rounded-full font-bold text-sm ${tab === 'poster' ? 'btn-candy' : 'btn-ghost'}`}>🖼️ 海报</button>
          <button onClick={() => setTab('record')} className={`px-4 py-1.5 rounded-full font-bold text-sm ${tab === 'record' ? 'btn-candy' : 'btn-ghost'}`}>🎬 录屏</button>
        </div>

        {tab === 'poster' && (
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <canvas ref={posterCanvasRef} className="hidden" />
              {posterUrl ? <img src={posterUrl} alt="海报" className="w-full rounded-2xl shadow" /> : <div className="aspect-square rounded-2xl bg-white/50 flex items-center justify-center">生成中…</div>}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold">作品名称</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="给作品起个名字" className="w-full mt-1 rounded-lg px-3 py-2 bg-white/80" />
              </div>
              <div>
                <label className="text-sm font-bold">分享文案</label>
                <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full mt-1 rounded-lg px-3 py-2 bg-white/80" />
              </div>
              <div>
                <label className="text-sm font-bold">边框风格</label>
                <div className="flex gap-2 mt-1">
                  {FRAMES.map((f) => (
                    <button key={f.id} onClick={() => setFrame(f.id)} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${frame === f.id ? 'ring-2 ring-candy-purple' : ''}`} style={{ background: `linear-gradient(135deg, ${f.grad[0]}, ${f.grad[1]})` }}>{f.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-bold">🎨 AI 滤镜美化</label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button onClick={() => setFilter('')} className={`rounded-lg py-1.5 text-xs font-semibold ${!filter ? 'bg-candy-purple text-white' : 'bg-white/70'}`}>原图</button>
                  {FILTER_TYPES.map((ft) => (
                    <button key={ft.id} onClick={() => setFilter(ft.id)} className={`rounded-lg py-1.5 text-xs font-semibold ${filter === ft.id ? 'bg-candy-purple text-white' : 'bg-white/70 hover:bg-white'}`} title={ft.desc}>{ft.emoji} {ft.name}</button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} /> 公开投稿到社区
              </label>
              {savedMsg && <p className="text-sm font-bold">{savedMsg}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-candy" onClick={handleSave} disabled={saving}>{saving ? '保存中…' : '☁️ 保存到画廊'}</button>
                <button className="btn-ghost" onClick={() => download(posterUrl, 'air-doodle-poster.png')}>🖼️ 下载海报</button>
                <button className="btn-ghost" onClick={() => download(getImage(), 'air-doodle.png')}>📥 下载原图</button>
                <button className="btn-ghost" onClick={nativeShare}>📤 一键分享</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'record' && (
          <div className="text-center space-y-4">
            <div className="text-6xl mb-2">🎬</div>
            <p className="text-[#6d6d9c]">录制画布上的绘画过程，生成 3-10 秒短视频。</p>
            {!recording && !recordedVideo && (
              <button className="btn-candy text-lg px-8 py-3" onClick={startRecording}>🔴 开始录制</button>
            )}
            {recording && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /><span className="font-extrabold text-lg">录制中… {recordDuration}s</span></div>
                <button className="btn-candy" onClick={stopRecording}>⏹️ 停止录制</button>
                <p className="text-xs text-[#9a9ac0]">至少 3 秒，最多 10 秒</p>
              </div>
            )}
            {recordedVideo && (
              <div className="space-y-3">
                <video src={recordedVideo.url} controls className="w-full max-w-md mx-auto rounded-2xl shadow" loop />
                <div className="flex gap-2 justify-center">
                  <button className="btn-candy" onClick={() => download(recordedVideo.url, 'air-doodle-process.webm')}>📥 下载视频</button>
                  <button className="btn-ghost" onClick={() => { setRecordedVideo(null); setRecordDuration(0); }}>🔄 重新录制</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
