'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import HandDetector from './HandDetector';
import { classifyHand, palmRegion, GESTURE } from '@/lib/gestures';
import { drawStar } from '@/lib/brushes';
import { TEMPLATES } from '@/lib/templates';
import Sound from '@/lib/audio';

const MODES = [
  { id: 'catch', name: '隔空抓星星', emoji: '⭐' },
  { id: 'pop', name: '手势消消画', emoji: '🟣' },
  { id: 'guess', name: '限时猜画', emoji: '🎭' },
];

const DOT_COLORS = ['#ff5c8a', '#5c7cff', '#39d98a', '#ffb13d'];

/**
 * 体感小游戏：复用手部关键点识别，内置三种轻量玩法。
 */
export default function MiniGame({ videoRef, onExit, onScore }) {
  const [mode, setMode] = useState('catch');
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [running, setRunning] = useState(true);
  const [word, setWord] = useState(null);
  const canvasRef = useRef(null);
  const gameRef = useRef({ entities: [], lastGrab: false, prevFist: false, drawCoverage: 0, last: null });
  const scoreRef = useRef(0);

  useEffect(() => { scoreRef.current = score; }, [score]);

  // 重置回合
  const reset = useCallback((m) => {
    setScore(0);
    setTime(m === 'guess' ? 20 : 30);
    setRunning(true);
    gameRef.current = { entities: [], lastGrab: false, prevFist: false, drawCoverage: 0, last: null };
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    if (m === 'guess') {
      const t = TEMPLATES[Math.floor((Date.now() / 1000) % TEMPLATES.length)];
      setWord(t.word);
    } else if (m === 'pop') {
      // 生成彩色圆点网格
      const ents = [];
      for (let i = 0; i < 14; i++) {
        ents.push({
          x: Math.random(), y: Math.random() * 0.8 + 0.1,
          color: DOT_COLORS[i % DOT_COLORS.length], r: 26, alive: true,
        });
      }
      gameRef.current.entities = ents;
    }
  }, []);

  useEffect(() => { reset(mode); }, [mode, reset]);

  // 画布尺寸
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const resize = () => {
      const p = c.parentElement;
      c.width = p.clientWidth;
      c.height = p.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // 倒计时
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTime((s) => {
        if (s <= 1) {
          setRunning(false);
          onScore?.(scoreRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running, onScore]);

  // 抓星星 / 消消画的实体生成与动画
  useEffect(() => {
    if (mode !== 'catch') return;
    const spawn = setInterval(() => {
      if (!running) return;
      const g = gameRef.current;
      g.entities.push({ x: Math.random(), y: -0.05, vy: 0.004 + Math.random() * 0.004, r: 18 + Math.random() * 12, alive: true });
    }, 700);
    return () => clearInterval(spawn);
  }, [mode, running]);

  const handleResults = useCallback((res) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;
    const g = gameRef.current;
    const toPx = (p) => ({ x: (1 - p.x) * W, y: p.y * H });

    if (mode !== 'guess') ctx.clearRect(0, 0, W, H);

    const hand = res.landmarks[0] ? classifyHand(res.landmarks[0]) : null;
    let cursor = null;
    let isFist = false;
    let region = null;
    if (hand) {
      cursor = toPx(hand.tip);
      isFist = hand.gesture === GESTURE.FIST;
      const r = palmRegion(res.landmarks[0]);
      region = { x: (1 - r.x) * W, y: r.y * H, r: r.r * Math.max(W, H) * 0.5 + 30 };
    }

    if (mode === 'catch') {
      // 更新下落星星
      const grabbing = isFist && g.prevFist === false; // 摊开->握拳瞬间触发抓取
      g.entities = g.entities.filter((e) => {
        e.y += e.vy;
        if (e.y > 1.1) return false;
        const ex = (1 - e.x) * W, ey = e.y * H; // 星星本身也镜像保持一致
        const px = e.x * W; // 直接用画布坐标更直观
        drawStar(ctx, px, ey, e.r, '#ffd54a');
        // 抓取判定：握拳且手掌区域覆盖星星
        if (region && isFist) {
          const d = Math.hypot(px - region.x, ey - region.y);
          if (d < region.r) {
            setScore((s) => s + 5);
            Sound.pop();
            return false;
          }
        }
        return true;
      });
      g.prevFist = isFist;
      // 手掌范围
      if (region) {
        ctx.beginPath();
        ctx.arc(region.x, region.y, region.r, 0, Math.PI * 2);
        ctx.strokeStyle = isFist ? '#ff5c8a' : 'rgba(124,108,240,0.6)';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    } else if (mode === 'pop') {
      g.entities.forEach((e) => {
        if (!e.alive) return;
        const px = e.x * W, py = e.y * H;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(px, py, e.r, 0, Math.PI * 2);
        ctx.fill();
        if (cursor && hand?.gesture === GESTURE.CURSOR) {
          if (Math.hypot(cursor.x - px, cursor.y - py) < e.r + 8) {
            e.alive = false;
            setScore((s) => s + 10);
            Sound.pop();
          }
        }
      });
      g.entities = g.entities.filter((e) => e.alive);
      if (g.entities.length === 0 && running) {
        // 自动补充新一波
        const ents = [];
        for (let i = 0; i < 14; i++) {
          ents.push({ x: Math.random(), y: Math.random() * 0.8 + 0.1, color: DOT_COLORS[i % DOT_COLORS.length], r: 26, alive: true });
        }
        g.entities = ents;
      }
      if (cursor) {
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 10, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
      }
    } else if (mode === 'guess') {
      // 限时绘画：食指画线，按覆盖度评分
      if (hand?.gesture === GESTURE.CURSOR && cursor && running) {
        if (g.last) {
          ctx.strokeStyle = '#ff5c8a';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(g.last.x, g.last.y);
          ctx.lineTo(cursor.x, cursor.y);
          ctx.stroke();
          g.drawCoverage += Math.hypot(cursor.x - g.last.x, cursor.y - g.last.y);
        }
        g.last = cursor;
      } else {
        g.last = null;
      }
      if (cursor) {
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(124,108,240,0.6)';
        ctx.fill();
      }
    }
  }, [mode, running]);

  // 猜画结束评分
  useEffect(() => {
    if (mode === 'guess' && !running && time === 0) {
      const cov = gameRef.current.drawCoverage;
      const s = Math.min(100, Math.round(cov / 30));
      setScore(s);
      onScore?.(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  return (
    <div className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm flex flex-col">
      <HandDetector videoRef={videoRef} running={running} onResults={handleResults} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between p-3">
        <div className="flex gap-1">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                mode === m.id ? 'bg-candy-purple text-white' : 'card-soft'
              }`}
            >
              {m.emoji} {m.name}
            </button>
          ))}
        </div>
        <button onClick={onExit} className="btn-ghost text-sm">✖️ 退出</button>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-6 px-4">
        <span className="px-4 py-1.5 rounded-full card-soft font-extrabold">⏱️ {time}s</span>
        <span className="px-4 py-1.5 rounded-full card-soft font-extrabold">🏅 {score} 分</span>
        {mode === 'guess' && word && (
          <span className="px-4 py-1.5 rounded-full card-soft font-extrabold">题目：{word}</span>
        )}
      </div>

      <div className="flex-1" />

      {!running && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="card-soft rounded-3xl p-8 text-center animate-pop">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="text-xl font-extrabold mb-1">时间到！</h3>
            <p className="text-lg mb-4">本局得分 <b className="text-candy-pink">{score}</b></p>
            <div className="flex gap-2 justify-center">
              <button className="btn-candy" onClick={() => reset(mode)}>🔄 再来一局</button>
              <button className="btn-ghost" onClick={onExit}>返回画布</button>
            </div>
          </div>
        </div>
      )}

      <p className="relative z-10 text-center text-white/90 text-xs pb-3 font-semibold">
        {mode === 'catch' && '🖐️ 摊开手掌靠近星星，握拳即可抓取得分'}
        {mode === 'pop' && '☝️ 食指点击彩色圆点消除得分'}
        {mode === 'guess' && '☝️ 食指隔空画出题目，结束按笔迹量评分'}
      </p>
    </div>
  );
}
