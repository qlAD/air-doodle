'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import CameraView from './CameraView';
import HandDetector from './HandDetector';
import BrushPanel from './BrushPanel';
import GesturePanel from './GesturePanel';
import StickerPanel from './StickerPanel';
import TutorialGuide from './TutorialGuide';
import ShareExporter from './ShareExporter';
import MiniGame from './MiniGame';
import Backgrounds from './Backgrounds';
import {
  classifyHands,
  GESTURE,
  SmoothPoint,
  palmRegion,
} from '@/lib/gestures';
import {
  BRUSHES,
  BRUSH_COLORS,
  drawSegment,
  spawnParticles,
  updateParticles,
} from '@/lib/brushes';
import { drawTemplate } from '@/lib/templates';
import Sound from '@/lib/audio';
import { unlock, recordBrush, checkIn } from '@/lib/achievements';

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export default function CanvasBoard({ initialTemplate = null }) {
  const wrapRef = useRef(null);
  const videoRef = useRef(null);
  const drawCanvasRef = useRef(null); // 持久化涂鸦层
  const fxCanvasRef = useRef(null); // 每帧重绘的特效/光标/关键点层

  // 可变状态用 ref（在每帧回调中读取，避免闭包陈旧）
  const stateRef = useRef({
    mode: 'draw', // draw | erase | pause | sticker | game
    brush: 'normal',
    color: BRUSH_COLORS[0],
    size: 8,
    templateId: initialTemplate,
    templateOpacity: 0.35,
    background: 'none',
    smooth: new SmoothPoint(0.5),
    lastPoint: null,
    particles: [],
    lastGesture: GESTURE.NONE,
    gestureCooldown: 0,
    doubleFistStart: 0,
    pendingSticker: null,
    placedStickers: [],
    soundOn: true,
    coverage: 0, // 临摹覆盖度（绘制像素累计）
  });

  // UI 状态
  const [modelStatus, setModelStatus] = useState('loading'); // loading | ready | error
  const [running, setRunning] = useState(true);
  const [ui, setUi] = useState({
    mode: 'draw',
    brush: 'normal',
    color: BRUSH_COLORS[0],
    gesture: 'none',
    hands: 0,
  });
  const [brush, setBrush] = useState('normal');
  const [color, setColor] = useState(BRUSH_COLORS[0]);
  const [size, setSize] = useState(8);
  const [templateId, setTemplateId] = useState(initialTemplate);
  const [templateOpacity, setTemplateOpacity] = useState(0.35);
  const [background, setBackground] = useState('none');
  const [showStickers, setShowStickers] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState(null);
  const [achievement, setAchievement] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [camQuality, setCamQuality] = useState('high'); // high | medium | low

  // 同步 React 状态到 ref
  useEffect(() => { stateRef.current.brush = brush; }, [brush]);
  useEffect(() => { stateRef.current.color = color; }, [color]);
  useEffect(() => { stateRef.current.size = size; }, [size]);
  useEffect(() => { stateRef.current.templateId = templateId; }, [templateId]);
  useEffect(() => { stateRef.current.templateOpacity = templateOpacity; }, [templateOpacity]);
  useEffect(() => { stateRef.current.background = background; }, [background]);
  useEffect(() => { stateRef.current.soundOn = soundOn; Sound.setEnabled(soundOn); }, [soundOn]);

  // 首次进入：新手引导 + 打卡
  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('air-doodle-tutorial-seen');
    if (!seen) setShowTutorial(true);
    const { streak: s, newAchievement } = checkIn();
    setStreak(s);
    if (newAchievement) popAchievement(newAchievement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 画布尺寸自适应
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      [drawCanvasRef, fxCanvasRef].forEach((ref) => {
        const c = ref.current;
        if (!c) return;
        // 保留已有绘制内容
        if (ref === drawCanvasRef && c.width && (c.width !== w || c.height !== h)) {
          const tmp = document.createElement('canvas');
          tmp.width = c.width;
          tmp.height = c.height;
          tmp.getContext('2d').drawImage(c, 0, 0);
          c.width = w;
          c.height = h;
          c.getContext('2d').drawImage(tmp, 0, 0);
        } else {
          c.width = w;
          c.height = h;
        }
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  function popToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  function popAchievement(def) {
    if (!def) return;
    Sound.achieve();
    setAchievement(def);
    setTimeout(() => setAchievement(null), 3500);
  }

  const switchBrush = useCallback((id) => {
    setBrush(id);
    Sound.color();
    popToast(`${BRUSHES.find((b) => b.id === id)?.emoji || ''} ${BRUSHES.find((b) => b.id === id)?.name}`);
    popAchievement(recordBrush(id));
  }, []);

  const switchColor = useCallback((c) => {
    setColor(c);
    Sound.color();
  }, []);

  function clearCanvas(withFirework = true) {
    const c = drawCanvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    stateRef.current.coverage = 0;
    stateRef.current.placedStickers = [];
    Sound.clear();
    if (withFirework) {
      // 全屏烟花
      const s = stateRef.current;
      const fx = fxCanvasRef.current;
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * (fx?.width || 800);
        const y = Math.random() * (fx?.height || 600) * 0.6;
        spawnParticles(s.particles, x, y, 'firework');
      }
      popToast('🎆 画布已清空');
    }
  }

  // ---------------- 每帧手势结果处理 ----------------
  const handleResults = useCallback((res) => {
    const draw = drawCanvasRef.current;
    const fx = fxCanvasRef.current;
    if (!draw || !fx) return;
    const dctx = draw.getContext('2d');
    const fctx = fx.getContext('2d');
    const W = fx.width;
    const H = fx.height;
    const S = stateRef.current;

    // 清空特效层
    fctx.clearRect(0, 0, W, H);

    // 模板描线引导（半透明）
    if (S.templateId) {
      drawTemplate(fctx, S.templateId, W, H, S.templateOpacity);
    }

    // 已放置贴纸
    for (const st of S.placedStickers) {
      fctx.font = `${st.size}px serif`;
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText(st.emoji, st.x, st.y);
    }

    // 镜像坐标映射：MediaPipe 原始坐标 -> 画面镜像后的像素
    const toPx = (p) => ({ x: (1 - p.x) * W, y: p.y * H });

    const { landmarks, handedness } = res;
    const { perHand, combo } = classifyHands(landmarks, handedness);

    // 绘制关键点骨架
    perHand.forEach((hand) => {
      const pts = hand.landmarks.map(toPx);
      fctx.strokeStyle = 'rgba(124,108,240,0.5)';
      fctx.lineWidth = 2;
      HAND_CONNECTIONS.forEach(([a, b]) => {
        fctx.beginPath();
        fctx.moveTo(pts[a].x, pts[a].y);
        fctx.lineTo(pts[b].x, pts[b].y);
        fctx.stroke();
      });
      pts.forEach((p, i) => {
        fctx.fillStyle = i === 8 ? '#ff5c8a' : 'rgba(255,255,255,0.85)';
        fctx.beginPath();
        fctx.arc(p.x, p.y, i === 8 ? 6 : 3, 0, Math.PI * 2);
        fctx.fill();
      });
    });

    const now = performance.now();
    let displayGesture = 'none';

    // ---------- 双手组合手势 ----------
    if (combo === 'double_fist') {
      if (!S.doubleFistStart) S.doubleFistStart = now;
      const held = now - S.doubleFistStart;
      // 进度环
      const cx = W / 2, cy = 60;
      fctx.strokeStyle = '#ff5c8a';
      fctx.lineWidth = 6;
      fctx.beginPath();
      fctx.arc(cx, cy, 24, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(held / 2000, 1)));
      fctx.stroke();
      displayGesture = '双手握拳·清空中';
      if (held > 2000) {
        clearCanvas(true);
        S.doubleFistStart = 0;
      }
    } else {
      S.doubleFistStart = 0;
    }

    if (combo === 'double_palm') {
      // 雾化擦除：整层降透明度
      dctx.save();
      dctx.globalCompositeOperation = 'destination-out';
      dctx.fillStyle = 'rgba(0,0,0,0.15)';
      dctx.fillRect(0, 0, W, H);
      dctx.restore();
      displayGesture = '双手摊开·雾化擦除';
      if (S.lastGesture !== 'double_palm') Sound.erase();
      S.lastGesture = 'double_palm';
    } else if (combo === 'heart') {
      // 爱心画笔自动激活
      if (S.brush !== 'heart') {
        S.brush = 'heart';
        setBrush('heart');
        popToast('💗 爱心画笔已开启');
      }
      displayGesture = '双手比心·爱心笔';
    }

    // ---------- 单手主操作（取第一只手） ----------
    const primary = perHand[0];
    if (primary && !combo) {
      const g = primary.gesture;
      const tip = toPx(primary.tip);

      // 光标
      fctx.beginPath();
      fctx.arc(tip.x, tip.y, S.size + 4, 0, Math.PI * 2);
      fctx.strokeStyle = S.color;
      fctx.lineWidth = 2;
      fctx.stroke();

      const cooled = now > S.gestureCooldown;

      switch (g) {
        case GESTURE.POINTING: {
          displayGesture = '食指·绘画';
          const sm = S.smooth.next(tip.x, tip.y);
          if (S.lastPoint) {
            const seg = { from: S.lastPoint, to: sm };
            drawSegment(dctx, seg, S.brush, S.size, S.color);
            // 粒子特效
            if (['star', 'firework', 'heart'].includes(S.brush)) {
              spawnParticles(S.particles, sm.x, sm.y, S.brush, S.color);
            }
            S.coverage += Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
            if (Math.random() < 0.1) Sound.draw();
          } else {
            unlock('first_draw');
          }
          S.lastPoint = sm;
          break;
        }
        case GESTURE.FIST: {
          displayGesture = '握拳·暂停';
          S.lastPoint = null;
          S.smooth.reset();
          break;
        }
        case GESTURE.PALM: {
          displayGesture = '手掌·橡皮擦';
          const region = palmRegion(primary.landmarks);
          const rx = (1 - region.x) * W;
          const ry = region.y * H;
          const rr = region.r * Math.max(W, H) * 0.5 + 20;
          dctx.save();
          dctx.globalCompositeOperation = 'destination-out';
          dctx.beginPath();
          dctx.arc(rx, ry, rr, 0, Math.PI * 2);
          dctx.fill();
          dctx.restore();
          // 擦除范围提示
          fctx.beginPath();
          fctx.arc(rx, ry, rr, 0, Math.PI * 2);
          fctx.strokeStyle = 'rgba(255,92,138,0.6)';
          fctx.setLineDash([6, 4]);
          fctx.stroke();
          fctx.setLineDash([]);
          S.lastPoint = null;
          if (S.lastGesture !== GESTURE.PALM) Sound.erase();
          break;
        }
        case GESTURE.OK: {
          displayGesture = 'OK·换色';
          if (cooled && S.lastGesture !== GESTURE.OK) {
            const side = primary.handedness === 'Left' ? 0 : 1;
            const c = BRUSH_COLORS[side === 0 ? 0 : 1];
            S.color = c;
            switchColor(c);
            S.gestureCooldown = now + 800;
          }
          S.lastPoint = null;
          break;
        }
        case GESTURE.THREE: {
          displayGesture = '三指·切换特效笔';
          if (cooled && S.lastGesture !== GESTURE.THREE) {
            const idx = BRUSHES.findIndex((b) => b.id === S.brush);
            const next = BRUSHES[(idx + 1) % BRUSHES.length];
            S.brush = next.id;
            switchBrush(next.id);
            S.gestureCooldown = now + 900;
          }
          S.lastPoint = null;
          break;
        }
        case GESTURE.PEACE: {
          displayGesture = '比耶·贴纸面板';
          if (cooled && S.lastGesture !== GESTURE.PEACE) {
            setShowStickers((v) => !v);
            Sound.pop();
            S.gestureCooldown = now + 900;
          }
          S.lastPoint = null;
          break;
        }
        case GESTURE.PINCH: {
          displayGesture = '捏合·放置贴纸';
          if (S.pendingSticker) {
            S.placedStickers.push({ emoji: S.pendingSticker, x: tip.x, y: tip.y, size: 56 });
            // 烘焙到绘图层
            dctx.font = '56px serif';
            dctx.textAlign = 'center';
            dctx.textBaseline = 'middle';
            dctx.fillText(S.pendingSticker, tip.x, tip.y);
            S.pendingSticker = null;
            Sound.pop();
          }
          S.lastPoint = null;
          break;
        }
        default:
          S.lastPoint = null;
          S.smooth.reset();
      }
      S.lastGesture = g;
    } else if (!combo) {
      S.lastPoint = null;
      S.smooth.reset();
      S.lastGesture = GESTURE.NONE;
    }

    // 跟随手指的待放置贴纸预览
    if (S.pendingSticker && primary) {
      const tip = toPx(primary.tip);
      fctx.font = '48px serif';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.globalAlpha = 0.7;
      fctx.fillText(S.pendingSticker, tip.x, tip.y);
      fctx.globalAlpha = 1;
    }

    // 更新粒子
    S.particles = updateParticles(fctx, S.particles);

    // 临摹完成判定
    if (S.templateId && S.coverage > 2600) {
      S.coverage = 0;
      popAchievement(unlock('template_done'));
      popToast('🏅 临摹完成！');
    }

    // 节流更新 UI 手势显示
    if (now % 4 < 1.5) {
      setUi((prev) =>
        prev.gesture === displayGesture && prev.hands === perHand.length
          ? prev
          : { ...prev, gesture: displayGesture, hands: perHand.length }
      );
    }
  }, [switchBrush, switchColor]);

  // ---------- 鼠标/触摸绘画兜底（无摄像头也可体验） ----------
  useEffect(() => {
    const c = fxCanvasRef.current;
    if (!c) return;
    let drawing = false;
    let last = null;
    const pos = (e) => {
      const rect = c.getBoundingClientRect();
      const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      return { x: (cx / rect.width) * c.width, y: (cy / rect.height) * c.height };
    };
    const down = (e) => {
      drawing = true;
      last = pos(e);
      Sound.unlock();
    };
    const move = (e) => {
      if (!drawing) return;
      const p = pos(e);
      const dctx = drawCanvasRef.current.getContext('2d');
      drawSegment(dctx, { from: last, to: p }, stateRef.current.brush, stateRef.current.size, stateRef.current.color);
      if (['star', 'firework', 'heart'].includes(stateRef.current.brush)) {
        spawnParticles(stateRef.current.particles, p.x, p.y, stateRef.current.brush, stateRef.current.color);
      }
      last = p;
    };
    const up = () => { drawing = false; last = null; };
    c.addEventListener('mousedown', down);
    c.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    c.addEventListener('touchstart', down, { passive: true });
    c.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => {
      c.removeEventListener('mousedown', down);
      c.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      c.removeEventListener('touchstart', down);
      c.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, []);

  // 导出当前画布为 PNG dataURL（合成背景+涂鸦）
  const exportImage = useCallback(() => {
    const draw = drawCanvasRef.current;
    if (!draw) return null;
    const out = document.createElement('canvas');
    out.width = draw.width;
    out.height = draw.height;
    const octx = out.getContext('2d');
    octx.fillStyle = '#ffffff';
    octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(draw, 0, 0);
    return out.toDataURL('image/png');
  }, []);

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* ======== 全屏画布舞台 ======== */}
      <div ref={wrapRef} className="absolute inset-0">
        <Backgrounds type={background} />
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover mirror opacity-80"
          playsInline
          muted
        />
        <canvas ref={drawCanvasRef} className="absolute inset-0 w-full h-full" />
        <canvas
          ref={fxCanvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
        />

        <CameraView videoRef={videoRef} onReady={() => Sound.unlock()} quality={camQuality} />

        {running && (
          <HandDetector
            videoRef={videoRef}
            running={running && !showGame}
            onResults={handleResults}
            onStatus={setModelStatus}
          />
        )}

        {/* 顶部状态条 */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
          <span className="px-3 py-1 rounded-full text-xs font-bold card-soft">
            {modelStatus === 'loading' && '🧠 AI 模型加载中…'}
            {modelStatus === 'ready' && `✋ 手势就绪 · ${ui.hands} 只手`}
            {modelStatus === 'error' && '⚠️ 模型加载失败（可用鼠标绘画）'}
          </span>
          {streak > 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-bold card-soft">
              🔥 连续 {streak} 天
            </span>
          )}
        </div>

        {/* 当前手势提示 */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
          <span className="px-4 py-1.5 rounded-full text-sm font-bold card-soft animate-pop">
            {ui.gesture === 'none' ? '🖐️ 伸出食指开始作画' : ui.gesture}
          </span>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="px-6 py-3 rounded-2xl text-lg font-extrabold card-soft animate-pop">
              {toast}
            </div>
          </div>
        )}

        {/* 成就弹窗 */}
        {achievement && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 animate-pop">
            <div className="card-soft rounded-2xl px-6 py-4 flex items-center gap-3 border-2 border-candy-yellow">
              <span className="text-4xl">{achievement.icon}</span>
              <div>
                <div className="text-xs text-candy-purple font-bold">🎉 解锁成就</div>
                <div className="font-extrabold">{achievement.name}</div>
                <div className="text-xs text-[#6d6d9c]">{achievement.desc}</div>
              </div>
            </div>
          </div>
        )}

        {showStickers && (
          <StickerPanel
            onPick={(emoji) => {
              stateRef.current.pendingSticker = emoji;
              popToast(`${emoji} 比划捏合手势放置`);
            }}
            onClose={() => setShowStickers(false)}
          />
        )}

        {showGame && (
          <MiniGame
            videoRef={videoRef}
            onExit={() => setShowGame(false)}
            onScore={(s) => {
              if (s >= 100) popAchievement(unlock('game_clear'));
            }}
          />
        )}
      </div>

      {/* ======== 底部浮动工具栏 ======== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-2 rounded-2xl card-soft">
        <ToolBtn onClick={() => setRunning((v) => !v)}>
          {running ? '⏸️' : '▶️'}
        </ToolBtn>
        <ToolBtn onClick={() => clearCanvas(true)}>🧹</ToolBtn>
        <ToolBtn onClick={() => setShowGame(true)}>🎮</ToolBtn>
        <ToolBtn onClick={() => setSoundOn((v) => !v)}>
          {soundOn ? '🔊' : '🔇'}
        </ToolBtn>
        <ToolBtn
          onClick={() => setCamQuality((q) => q === 'high' ? 'medium' : q === 'medium' ? 'low' : 'high')}
        >
          {camQuality === 'high' ? '📷' : camQuality === 'medium' ? '📹' : '🖥️'}
        </ToolBtn>
        <ToolBtn onClick={() => setShowTutorial(true)}>📖</ToolBtn>
        <ToolBtn onClick={() => setShowSidebar((v) => !v)} activate>🎨</ToolBtn>
        <button className="btn-candy text-sm px-4 py-1.5" onClick={() => setShowShare(true)}>
          💾 保存
        </button>
      </div>

      {/* ======== 浮动侧面板（右滑） ======== */}
      <div
        className={`absolute top-0 right-0 h-full w-72 z-30 transition-transform duration-300 ${
          showSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto px-3 py-4 space-y-3 bg-white/90 backdrop-blur-xl border-l border-white/60">
          {/* 关闭按钮 */}
          <button
            onClick={() => setShowSidebar(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full card-soft flex items-center justify-center font-bold text-[#6d6d9c] hover:text-candy-pink z-10"
          >
            ×
          </button>

          <GesturePanel gesture={ui.gesture} brush={brush} color={color} hands={ui.hands} />
          <BrushPanel
            brush={brush}
            color={color}
            size={size}
            background={background}
            templateId={templateId}
            templateOpacity={templateOpacity}
            onBrush={switchBrush}
            onColor={switchColor}
            onSize={setSize}
            onBackground={setBackground}
            onTemplate={setTemplateId}
            onTemplateOpacity={setTemplateOpacity}
          />
        </div>
      </div>

      {/* 侧边栏打开时的遮罩 */}
      {showSidebar && (
        <div className="absolute inset-0 z-25" onClick={() => setShowSidebar(false)} />
      )}

      {/* ======== 模态 ======== */}
      {showTutorial && (
        <TutorialGuide
          onClose={() => {
            setShowTutorial(false);
            if (typeof window !== 'undefined') localStorage.setItem('air-doodle-tutorial-seen', '1');
          }}
        />
      )}

      {showShare && (
        <ShareExporter
          getImage={exportImage}
          templateId={templateId}
          brush={brush}
          onClose={() => setShowShare(false)}
          onSaved={() => popAchievement(unlock('first_save'))}
        />
      )}
    </div>
  );
}

function ToolBtn({ onClick, children, activate }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition ${
        activate ? 'bg-candy-purple text-white' : 'bg-white/70 hover:bg-white text-[#6d6d9c]'
      }`}
    >
      {children}
    </button>
  );
}
