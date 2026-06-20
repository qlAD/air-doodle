'use client';

import { useEffect, useState } from 'react';

/**
 * 摄像头采集组件
 * ----------------------------------------------------------------------------
 * 通过 WebRTC getUserMedia 拉取视频流并挂载到外部传入的 videoRef。
 * 负责权限异常捕获与友好提示。视频画面在 CanvasBoard 中镜像渲染。
 */
/**
 * 摄像头分辨率预设。`ideal` 表示尽量匹配，达不到也不报错。
 * 低画质降低算力消耗，适合低配设备或追求极致帧率。
 */
export const CAM_QUALITY = {
  high: { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: 30, min: 24 } },
  medium: { width: { ideal: 1280, max: 1280 }, height: { ideal: 720, max: 720 }, frameRate: { ideal: 30 } },
  low: { width: { ideal: 640, max: 640 }, height: { ideal: 480, max: 480 }, frameRate: { ideal: 24 } },
};

export default function CameraView({ videoRef, onReady, facingMode = 'user', quality = 'high' }) {
  const [status, setStatus] = useState('idle'); // idle | requesting | ready | denied | nodevice | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let stream;
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMsg('当前浏览器不支持摄像头访问，请升级到最新版 Chrome / Edge / Safari。');
        return;
      }
      setStatus('requesting');
      try {
        const constraints = CAM_QUALITY[quality] || CAM_QUALITY.high;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, ...constraints },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => {});
          setStatus('ready');
          onReady?.(video);
        }
      } catch (err) {
        if (cancelled) return;
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          setStatus('denied');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setStatus('nodevice');
        } else {
          setStatus('error');
          setErrorMsg(err.message || String(err));
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode, quality]);

  if (status === 'ready' || status === 'requesting' || status === 'idle') {
    return status === 'requesting' ? (
      <Overlay icon="📷" title="正在请求摄像头权限…" desc="请在弹窗中点击「允许」即可开始隔空作画。" />
    ) : null;
  }

  const messages = {
    denied: {
      icon: '🚫',
      title: '摄像头权限被拒绝',
      desc: '请在浏览器地址栏的权限设置中允许摄像头访问，然后刷新页面。',
    },
    nodevice: {
      icon: '🔌',
      title: '未检测到摄像头',
      desc: '请连接一个可用的摄像头设备后重试。',
    },
    error: {
      icon: '⚠️',
      title: '摄像头启动失败',
      desc: errorMsg || '发生未知错误，请刷新页面重试。',
    },
  };
  const m = messages[status];
  return m ? <Overlay {...m} retry /> : null;
}

function Overlay({ icon, title, desc, retry }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
      <div className="card-soft rounded-3xl p-8 max-w-sm text-center animate-pop">
        <div className="text-5xl mb-3">{icon}</div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm text-[#6d6d9c] leading-relaxed">{desc}</p>
        {retry && (
          <button className="btn-candy mt-5" onClick={() => window.location.reload()}>
            🔄 刷新重试
          </button>
        )}
      </div>
    </div>
  );
}
