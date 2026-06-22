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
import BrushWheel from './BrushWheel';
import {
  classifyHands,
  GESTURE,
  SmoothPoint,
  palmRegion,
  SequenceDetector,
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
  const drawCanvasRef = useRef(null);
  const fxCanvasRef = useRef(null);

  const stateRef = useRef({
    mode: 'cursor',
    brush: 'normal',
    color: BRUSH_COLORS[0],
    size: 8,
    templateId: initialTemplate,
    templateOpacity: 0.35,
    background: 'none',
    cursorSmooth: new SmoothPoint(0.5),
    drawSmooth: new SmoothPoint(0.4),
    lastDrawPoint: null,
    lastCursorPoint: null,
    particles: [],
    lastGesture: GESTURE.NONE,
    gestureCooldown: 0,
    doublePalmStart: 0,
    threeHoldStart: 0,
    threeTriggered: false,
    seqDetector: new SequenceDetector(),
    pendingSticker: null,
    placedStickers: [],
    panX: 0,
    panY: 0,
    panHandX: 0,
    panHandY: 0,
    lShapeActive: false,
    lShapeMask: null,
    lShapeStillStart: 0,
    soundOn: true,
    coverage: 0,
    cursorHoverStart: 0,
    cursorHoverPos: null,
  });

  const [modelStatus, setModelStatus] = useState('loading');
  const [running, setRunning] = useState(true);
  const [ui, setUi] = useState({
    mode: 'cursor',
    brush: 'normal',
    color: BRUSH_COLORS[0],
    gesture: 'none',
    hands: 0,
    combo: null,
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
  const [showBrushWheel, setShowBrushWheel] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState(null);
  const [achievement, setAchievement] = useState(null);
  const [streak, setStreak] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [camQuality, setCamQuality] = useState('high');
  const [dualMode, setDualMode] = useState(false);
  const [textMode, setTextMode] = useState(false);

  // 文字涂鸦缓冲
  const textBufferRef = useRef([]); // [{x,y}...] strokes for current character
  const textCharsRef = useRef([]);  // finalized characters [{glyph, x, y, size}]

  useEffect(() => { stateRef.current.brush = brush; }, [brush]);
  useEffect(() => { stateRef.current.color = color; }, [color]);
  useEffect(() => { stateRef.current.size = size; }, [size]);
  useEffect(() => { stateRef.current.templateId = templateId; }, [templateId]);
  useEffect(() => { stateRef.current.templateOpacity = templateOpacity; }, [templateOpacity]);
  useEffect(() => { stateRef.current.background = background; }, [background]);
  useEffect(() => { stateRef.current.soundOn = soundOn; Sound.setEnabled(soundOn); }, [soundOn]);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && localStorage.getItem('air-doodle-tutorial-seen');
    if (!seen) setShowTutorial(true);
    const { streak: s, newAchievement } = checkIn();
    setStreak(s);
    if (newAchievement) popAchievement(newAchievement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      [drawCanvasRef, fxCanvasRef].forEach((ref) => {
        const c = ref.current;
        if (!c) return;
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
    const b = BRUSHES.find((x) => x.id === id);
    popToast(`${b?.emoji || ''} ${b?.name || id}`);
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
    stateRef.current.panX = 0;
    stateRef.current.panY = 0;
    Sound.clear();
    if (withFirework) {
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

    fctx.clearRect(0, 0, W, H);

    dctx.save();
    dctx.setTransform(1, 0, 0, 1, S.panX, S.panY);

    if (S.templateId) {
      drawTemplate(fctx, S.templateId, W, H, S.templateOpacity);
    }

    for (const st of S.placedStickers) {
      fctx.font = `${st.size}px serif`;
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText(st.emoji, st.x, st.y);
    }

    const toPx = (p) => ({ x: (1 - p.x) * W, y: p.y * H });

    const { landmarks, handedness } = res;
    const { perHand, combo } = classifyHands(landmarks, handedness);

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
        fctx.fillStyle = i === 8 ? '#ff5c8a' : i === 12 ? '#5c7cff' : 'rgba(255,255,255,0.85)';
        fctx.beginPath();
        fctx.arc(p.x, p.y, i === 8 || i === 12 ? 6 : 3, 0, Math.PI * 2);
        fctx.fill();
      });
    });

    const now = performance.now();
    let displayGesture = 'none';
    let displayMode = S.mode;

    // ===== 双手组合手势（最高优先级） =====
    if (combo === 'double_palm') {
      if (!S.doublePalmStart) S.doublePalmStart = now;
      const held = now - S.doublePalmStart;

      if (perHand.length === 2) {
        const c0 = toPx(perHand[0].center);
        const c1 = toPx(perHand[1].center);
        const move = Math.hypot(
          c0.x - (S._lastDpX0 || c0.x), c0.y - (S._lastDpY0 || c0.y)
        ) + Math.hypot(
          c1.x - (S._lastDpX1 || c1.x), c1.y - (S._lastDpY1 || c1.y)
        );
        S._lastDpX0 = c0.x; S._lastDpY0 = c0.y;
        S._lastDpX1 = c1.x; S._lastDpY1 = c1.y;
        if (move > 30) S.doublePalmStart = now;
      }

      const cx = W / 2, cy = 60;
      const progress = Math.min(held / 2000, 1);
      fctx.strokeStyle = '#ff5c8a';
      fctx.lineWidth = 6;
      fctx.beginPath();
      fctx.arc(cx, cy, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      fctx.stroke();
      fctx.fillStyle = '#ff5c8a';
      fctx.font = 'bold 16px "Baloo 2", sans-serif';
      fctx.textAlign = 'center';
      fctx.fillText(progress < 1 ? '双手保持静止清空画布…' : '即将清空！', cx, cy - 40);

      displayGesture = '双手全张·清空中';
      displayMode = 'clear';
      S.lastDrawPoint = null;
      S.drawSmooth.reset();

      if (held > 2000) {
        clearCanvas(true);
        S.doublePalmStart = 0;
      }
    } else {
      S.doublePalmStart = 0;
      S._lastDpX0 = undefined;
    }

    if (combo === 'heart') {
      if (S.brush !== 'heart') {
        S.brush = 'heart';
        setBrush('heart');
        popToast('💗 爱心画笔已开启');
      }
      displayGesture = '双手比心·爱心笔';
      S.lastDrawPoint = null;
    }

    if (combo === 'l_shape_screenshot') {
      if (!S.lShapeActive) {
        S.lShapeActive = true;
        S.lShapeStillStart = now;
      }
      displayGesture = 'L型取景·截图';
      displayMode = 'screenshot';
    } else if (S.lShapeActive) {
      S.lShapeActive = false;
      S.lShapeMask = null;
      S.lShapeStillStart = 0;
    }

    // ===== L型取景框渲染 =====
    if (S.lShapeActive && perHand.length === 2) {
      const lHand = perHand.find((h) => h.gesture === GESTURE.L_SHAPE);
      const pinchHand = perHand.find((h) => h.gesture === GESTURE.PINCH);

      if (lHand && pinchHand) {
        const pTip = toPx(pinchHand.tip);
        const lTip = toPx(lHand.tip);
        const lThumb = toPx(lHand.thumbTip);

        const verts = [
          { x: lTip.x, y: lTip.y },
          { x: lThumb.x, y: lThumb.y },
          { x: pTip.x, y: pTip.y },
          { x: (pTip.x + lThumb.x) / 2, y: (lThumb.y + lTip.y) / 2 },
        ];

        // 遮罩
        fctx.save();
        fctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        fctx.fillRect(0, 0, W, H);
        fctx.globalCompositeOperation = 'destination-out';
        fctx.beginPath();
        fctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) fctx.lineTo(verts[i].x, verts[i].y);
        fctx.closePath();
        fctx.fill();
        fctx.restore();

        // 取景框边框
        fctx.save();
        fctx.strokeStyle = '#ffd54a';
        fctx.lineWidth = 3;
        fctx.setLineDash([10, 6]);
        fctx.beginPath();
        fctx.moveTo(verts[0].x, verts[0].y);
        for (let i = 1; i < verts.length; i++) fctx.lineTo(verts[i].x, verts[i].y);
        fctx.closePath();
        fctx.stroke();
        fctx.setLineDash([]);
        verts.forEach((v) => {
          fctx.fillStyle = '#ffd54a';
          fctx.beginPath();
          fctx.arc(v.x, v.y, 8, 0, Math.PI * 2);
          fctx.fill();
          fctx.strokeStyle = '#3b3b5c';
          fctx.lineWidth = 2;
          fctx.stroke();
        });
        fctx.restore();

        // 静置 3 秒截图
        const vMove = verts.reduce((s, v, i) => {
          const ov = S._lastLShapeVerts?.[i];
          return s + (ov ? Math.hypot(v.x - ov.x, v.y - ov.y) : 0);
        }, 0);
        S._lastLShapeVerts = verts.map((v) => ({ ...v }));

        if (vMove < 15) {
          const held = now - S.lShapeStillStart;
          const cx = W / 2, cy = H - 70;
          const remaining = Math.max(0, Math.ceil(3 - held / 1000));
          fctx.fillStyle = '#ffd54a';
          fctx.font = 'bold 18px "Baloo 2", sans-serif';
          fctx.textAlign = 'center';
          fctx.fillText(
            remaining > 0 ? `📸 保持静止 ${remaining}s 截图` : '📸 截图!',
            cx, cy
          );
          if (held > 3000) {
            S.lShapeActive = false;
            S.lShapeMask = null;
            S.lShapeStillStart = 0;
            setShowShare(true);
            Sound.achieve();
            popToast('📸 截图已生成！');
          }
        } else {
          S.lShapeStillStart = now;
        }
      }
    }

    // ===== 双人模式中线 =====
    if (dualMode) {
      fctx.strokeStyle = 'rgba(255,255,255,0.5)';
      fctx.lineWidth = 2;
      fctx.setLineDash([10, 8]);
      fctx.beginPath();
      fctx.moveTo(W / 2, 0);
      fctx.lineTo(W / 2, H);
      fctx.stroke();
      fctx.setLineDash([]);
      // 标签
      fctx.fillStyle = 'rgba(255,92,138,0.8)';
      fctx.font = 'bold 20px "Baloo 2", sans-serif';
      fctx.textAlign = 'center';
      fctx.fillText('P1', W * 0.25, 50);
      fctx.fillStyle = 'rgba(92,124,255,0.8)';
      fctx.fillText('P2', W * 0.75, 50);
    }

    // ===== 文字涂鸦缓冲渲染 =====
    if (textMode && textBufferRef.current.length > 1) {
      const buf = textBufferRef.current;
      fctx.strokeStyle = '#7c6cf0';
      fctx.lineWidth = 4;
      fctx.lineCap = 'round';
      fctx.lineJoin = 'round';
      fctx.shadowBlur = 8;
      fctx.shadowColor = '#a78bfa';
      fctx.beginPath();
      fctx.moveTo(buf[0].x, buf[0].y);
      for (let i = 1; i < buf.length; i++) fctx.lineTo(buf[i].x, buf[i].y);
      fctx.stroke();
      fctx.shadowBlur = 0;
      // 包围盒
      if (buf.length > 5) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of buf) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
        fctx.strokeStyle = 'rgba(124,108,240,0.4)';
        fctx.setLineDash([4, 4]);
        fctx.strokeRect(minX - 6, minY - 6, maxX - minX + 12, maxY - minY + 12);
        fctx.setLineDash([]);
      }
    }

    // 已完成的文字字符
    for (const ch of textCharsRef.current) {
      fctx.font = `bold ${ch.size}px "Baloo 2", cursive`;
      fctx.fillStyle = ch.color || '#3b3b5c';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.fillText(ch.char, ch.x, ch.y);
    }

    // ===== 单手/多人主操作 =====
    const activeHands = (!combo && !dualMode) ? perHand.slice(0, 1) :
                        (!combo && dualMode) ? perHand : [];
    for (const primary of activeHands) {
      const g = primary.gesture;
      const cooled = now > S.gestureCooldown;
      // 双人模式：按屏幕位置分配颜色
      const handX = toPx(primary.center).x;
      const playerColor = dualMode ? (handX < W / 2 ? BRUSH_COLORS[0] : BRUSH_COLORS[1]) : S.color;
      const playerBrush = dualMode ? (handX < W / 2 ? 'normal' : 'star') : S.brush;

      // 序列动作检测
      const seqResult = S.seqDetector.update(primary, now);
      if (seqResult === 'triggered' && cooled) {
        setShowStickers((v) => !v);
        Sound.pop();
        popToast('🎟️ 贴纸面板已' + (showStickers ? '关闭' : '打开'));
        S.gestureCooldown = now + 1000;
        displayGesture = '序列动作·贴纸面板';
      }

      switch (g) {
        case GESTURE.CURSOR: {
          displayMode = 'cursor';
          displayGesture = '光标模式';
          const tip = toPx(primary.tip);
          const sm = S.cursorSmooth.next(tip.x, tip.y);

          fctx.strokeStyle = S.color;
          fctx.lineWidth = 2.5;
          fctx.beginPath();
          fctx.arc(sm.x, sm.y, S.size + 6, 0, Math.PI * 2);
          fctx.stroke();
          const cr = S.size + 10;
          fctx.beginPath();
          fctx.moveTo(sm.x - cr, sm.y); fctx.lineTo(sm.x + cr, sm.y);
          fctx.moveTo(sm.x, sm.y - cr); fctx.lineTo(sm.x, sm.y + cr);
          fctx.stroke();

          if (S.cursorHoverPos && Math.hypot(sm.x - S.cursorHoverPos.x, sm.y - S.cursorHoverPos.y) < 15) {
            const hoverDur = now - (S.cursorHoverStart || now);
            if (hoverDur > 1000) {
              fctx.fillStyle = 'rgba(255,255,255,0.9)';
              fctx.font = 'bold 13px "Baloo 2", sans-serif';
              fctx.textAlign = 'center';
              fctx.fillText('🖐️ 食指+中指并拢开始绘画', sm.x, sm.y - S.size - 24);
            }
          } else {
            S.cursorHoverPos = { x: sm.x, y: sm.y };
            S.cursorHoverStart = now;
          }

          S.lastDrawPoint = null;
          S.drawSmooth.reset();
          break;
        }

        case GESTURE.DRAW: {
          displayMode = 'draw';
          displayGesture = textMode ? '文字涂鸦·书写中' : '食指+中指·绘画';
          const mTip = toPx(primary.middleTip);
          const tipPx = toPx(primary.tip);
          const sm = S.drawSmooth.next(mTip.x, mTip.y);

          if (textMode) {
            // 文字模式：收集笔迹到缓冲，不直接绘制到画布
            textBufferRef.current.push({ x: sm.x, y: sm.y });
            if (textBufferRef.current.length > 500) textBufferRef.current.shift();
            S.lastDrawPoint = sm;
            break;
          }

          fctx.fillStyle = playerColor;
          fctx.beginPath();
          fctx.arc(sm.x, sm.y, S.size, 0, Math.PI * 2);
          fctx.fill();
          fctx.strokeStyle = 'rgba(255,255,255,0.7)';
          fctx.lineWidth = 2;
          fctx.stroke();

          if (S.lastDrawPoint) {
            const seg = { from: S.lastDrawPoint, to: sm };
            drawSegment(dctx, seg, playerBrush, S.size, playerColor);
            if (['star', 'firework', 'heart'].includes(playerBrush)) {
              spawnParticles(S.particles, sm.x, sm.y, playerBrush, playerColor);
            }
            S.coverage += Math.hypot(seg.to.x - seg.from.x, seg.to.y - seg.from.y);
            if (Math.random() < 0.1) Sound.draw();
          } else {
            unlock('first_draw');
          }
          S.lastDrawPoint = sm;
          S.cursorHoverPos = null;
          S.cursorHoverStart = 0;
          break;
        }

        case GESTURE.PINCH: {
          displayMode = 'erase';
          displayGesture = '捏合·橡皮擦';

          const tip = toPx(primary.tip);
          const thumbPx = toPx(primary.thumbTip);
          const ex = (tip.x + thumbPx.x) / 2;
          const ey = (tip.y + thumbPx.y) / 2;
          const er = S.size * 3 + 10;

          dctx.save();
          dctx.globalCompositeOperation = 'destination-out';
          dctx.beginPath();
          dctx.arc(ex, ey, er, 0, Math.PI * 2);
          dctx.fill();
          dctx.restore();

          fctx.beginPath();
          fctx.arc(ex, ey, er, 0, Math.PI * 2);
          fctx.strokeStyle = 'rgba(255,92,138,0.7)';
          fctx.setLineDash([6, 4]);
          fctx.lineWidth = 2.5;
          fctx.stroke();
          fctx.setLineDash([]);
          fctx.beginPath();
          fctx.moveTo(ex - 8, ey); fctx.lineTo(ex + 8, ey);
          fctx.moveTo(ex, ey - 8); fctx.lineTo(ex, ey + 8);
          fctx.stroke();

          S.lastDrawPoint = null;
          S.drawSmooth.reset();
          if (S.lastGesture !== GESTURE.PINCH) Sound.erase();
          break;
        }

        case GESTURE.PALM: {
          displayMode = 'pan';
          displayGesture = '手掌·拖拽画布';

          const pc = toPx(primary.center);
          if (!S._panActive) {
            S._panActive = true;
            S.panHandX = pc.x;
            S.panHandY = pc.y;
            S._panOrigX = S.panX;
            S._panOrigY = S.panY;
          } else {
            const dx = pc.x - S.panHandX;
            const dy = pc.y - S.panHandY;
            S.panX = S._panOrigX + dx;
            S.panY = S._panOrigY + dy;
          }

          fctx.save();
          fctx.setTransform(1, 0, 0, 1, 0, 0);
          const arrows = ['↖️', '↗️', '↙️', '↘️'];
          arrows.forEach((a, i) => {
            const ax = (i % 2 === 0) ? 30 : W - 30;
            const ay = (i < 2) ? 30 : H - 30;
            fctx.font = '20px serif';
            fctx.textAlign = 'center';
            fctx.textBaseline = 'middle';
            fctx.fillText(a, ax, ay);
          });
          fctx.restore();

          S.lastDrawPoint = null;
          S.drawSmooth.reset();
          break;
        }

        case GESTURE.FIST: {
          displayMode = 'pause';
          displayGesture = '握拳·暂停';

          // 文字模式：握拳 = 完成当前字符
          if (textMode && textBufferRef.current.length > 5) {
            const buf = textBufferRef.current;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of buf) { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); }
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            const charSize = Math.max(24, Math.min(120, Math.max(maxX - minX, maxY - minY)));
            // 将路径烘焙到绘图层作为"规整后的文字"
            dctx.strokeStyle = playerColor || '#3b3b5c';
            dctx.lineWidth = charSize * 0.12;
            dctx.lineCap = 'round';
            dctx.lineJoin = 'round';
            dctx.beginPath();
            dctx.moveTo(buf[0].x, buf[0].y);
            for (let i = 1; i < buf.length; i++) dctx.lineTo(buf[i].x, buf[i].y);
            dctx.stroke();
            // 保存字符元数据
            textCharsRef.current.push({ char: '✍️', x: cx, y: cy, size: charSize, color: playerColor || '#3b3b5c' });
            textBufferRef.current = [];
            Sound.pop();
            popToast('✅ 文字已定型');
          }

          const ftip = toPx(primary.tip);
          fctx.fillStyle = 'rgba(255,255,255,0.8)';
          fctx.font = '32px serif';
          fctx.textAlign = 'center';
          fctx.textBaseline = 'middle';
          fctx.fillText('⏸️', ftip.x, ftip.y);

          S.lastDrawPoint = null;
          S.drawSmooth.reset();
          S.cursorSmooth.reset();
          S._panActive = false;
          break;
        }

        case GESTURE.OK: {
          displayGesture = 'OK·换色';
          if (cooled && S.lastGesture !== GESTURE.OK) {
            const side = primary.handedness === 'Left' ? 0 : 1;
            const c = BRUSH_COLORS[side === 0 ? 0 : side === 1 ? 1 : 2];
            S.color = c;
            switchColor(c);
            S.gestureCooldown = now + 800;
          }
          S.lastDrawPoint = null;
          S._panActive = false;
          break;
        }

        case GESTURE.THREE: {
          displayGesture = '三指·笔刷切换';
          if (!S.threeHoldStart) S.threeHoldStart = now;
          const threeHeld = now - S.threeHoldStart;

          const ttip = toPx(primary.tip);
          if (threeHeld < 1000) {
            const progress = threeHeld / 1000;
            fctx.beginPath();
            fctx.arc(ttip.x, ttip.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
            fctx.strokeStyle = '#a35cff';
            fctx.lineWidth = 3;
            fctx.stroke();
          } else if (!S.threeTriggered) {
            S.threeTriggered = true;
            setShowBrushWheel(true);
            Sound.pop();
          }

          S.lastDrawPoint = null;
          S._panActive = false;
          break;
        }

        case GESTURE.PEACE: {
          displayGesture = '比耶·滚动';
          const ptip = toPx(primary.tip);
          fctx.fillStyle = 'rgba(255,255,255,0.7)';
          fctx.font = 'bold 14px "Baloo 2", sans-serif';
          fctx.textAlign = 'center';
          fctx.fillText('⬆️ ⬇️ 滑动滚动', ptip.x, ptip.y - 30);

          S.lastDrawPoint = null;
          S.drawSmooth.reset();
          S._panActive = false;
          break;
        }

        default:
          S.lastDrawPoint = null;
          S.drawSmooth.reset();
          S._panActive = false;
          S.threeHoldStart = 0;
          break;
      }

      if (g !== GESTURE.THREE) {
        S.threeHoldStart = 0;
        S.threeTriggered = false;
      }
      if (g !== GESTURE.PALM) {
        S._panActive = false;
      }

      S.lastGesture = g;
    } // end for (activeHands)

    if (activeHands.length === 0 && !combo) {
      S.lastDrawPoint = null;
      S.drawSmooth.reset();
      S.cursorSmooth.reset();
      S.lastGesture = GESTURE.NONE;
      S.threeHoldStart = 0;
      S.threeTriggered = false;
      S._panActive = false;
    }

    dctx.restore();

    if (S.pendingSticker && perHand[0]) {
      const tip = toPx(perHand[0].tip);
      fctx.font = '48px serif';
      fctx.textAlign = 'center';
      fctx.textBaseline = 'middle';
      fctx.globalAlpha = 0.7;
      fctx.fillText(S.pendingSticker, tip.x, tip.y);
      fctx.globalAlpha = 1;
    }

    S.particles = updateParticles(fctx, S.particles);

    if (S.templateId && S.coverage > 2600) {
      S.coverage = 0;
      popAchievement(unlock('template_done'));
      popToast('🏅 临摹完成！');
    }

    if (now % 4 < 1.5) {
      setUi((prev) =>
        prev.gesture === displayGesture &&
        prev.hands === perHand.length &&
        prev.mode === displayMode &&
        prev.combo === combo
          ? prev
          : { ...prev, gesture: displayGesture, mode: displayMode, hands: perHand.length, combo }
      );
    }
  }, [switchBrush, switchColor, showStickers]);

  // ---------- 鼠标/触摸绘画兜底 ----------
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
      const S = stateRef.current;
      drawSegment(dctx, { from: last, to: p }, S.brush, S.size, S.color);
      if (['star', 'firework', 'heart'].includes(S.brush)) {
        spawnParticles(S.particles, p.x, p.y, S.brush, S.color);
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
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20 flex-wrap">
          <span className="px-3 py-1 rounded-full text-xs font-bold card-soft">
            {modelStatus === 'loading' && '🧠 AI 模型加载中…'}
            {modelStatus === 'ready' && `✋ 手势就绪 · ${ui.hands} 只手 · ${modeLabel(ui.mode)}`}
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
            {ui.gesture === 'none'
              ? '🖐️ 食指=光标 | 食指+中指=绘画 | 捏合=橡皮擦 | 五指=拖拽画布'
              : ui.gesture}
          </span>
        </div>

        {toast && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="px-6 py-3 rounded-2xl text-lg font-extrabold card-soft animate-pop">
              {toast}
            </div>
          </div>
        )}

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

        {showBrushWheel && (
          <BrushWheel
            brush={brush}
            onSelect={(id) => {
              switchBrush(id);
              setShowBrushWheel(false);
            }}
            onClose={() => setShowBrushWheel(false)}
          />
        )}

        {showStickers && (
          <StickerPanel
            onPick={(emoji) => {
              stateRef.current.pendingSticker = emoji;
              popToast(`${emoji} 捏合手势放置到画布`);
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

      {/* 底部浮动工具栏 */}
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
        <ToolBtn onClick={() => setDualMode((v) => { const n = !v; if (n) { setTextMode(false); popToast('👥 双人模式已开启'); } else { popToast('双人模式已关闭'); } return n; })()} activate={dualMode}>👥</ToolBtn>
        <ToolBtn onClick={() => setTextMode((v) => { const n = !v; if (n) { setDualMode(false); textBufferRef.current = []; popToast('✍️ 文字涂鸦：食指+中指书写，握拳定型'); } else { textBufferRef.current = []; popToast('文字模式已关闭'); } return n; })()} activate={textMode}>✍️</ToolBtn>
        <ToolBtn onClick={() => setShowSidebar((v) => !v)} activate>🎨</ToolBtn>
        <button className="btn-candy text-sm px-4 py-1.5" onClick={() => setShowShare(true)}>
          💾 保存
        </button>
      </div>

      {/* 浮动侧面板 */}
      <div
        className={`absolute top-0 right-0 h-full w-72 z-30 transition-transform duration-300 ${
          showSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto px-3 py-4 space-y-3 bg-white/90 backdrop-blur-xl border-l border-white/60">
          <button
            onClick={() => setShowSidebar(false)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full card-soft flex items-center justify-center font-bold text-[#6d6d9c] hover:text-candy-pink z-10"
          >
            ×
          </button>
          <GesturePanel gesture={ui.gesture} brush={brush} color={color} hands={ui.hands} mode={ui.mode} />
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

      {showSidebar && (
        <div className="absolute inset-0 z-25" onClick={() => setShowSidebar(false)} />
      )}

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

function modeLabel(m) {
  const map = {
    cursor: '🎯 光标模式',
    draw: '✏️ 绘画模式',
    erase: '🧹 橡皮擦',
    pan: '✋ 拖拽画布',
    pause: '⏸️ 暂停',
    screenshot: '📸 取景截图',
    clear: '🧹 清空中',
  };
  return map[m] || m;
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
