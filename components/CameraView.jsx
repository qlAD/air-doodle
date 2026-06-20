'use client';

import { useEffect, useState } from 'react';

/**
 * 摄像头采集组件
 * ----------------------------------------------------------------------------
 * 通过 WebRTC getUserMedia 拉取视频流并挂载到外部传入的 videoRef。
 * 负责权限异常捕获与友好提示。视频画面在 CanvasBoard 中镜像渲染。
 */
export default function CameraView({ videoRef, onReady, facingMode = 'user' }) {
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
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 960 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
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
  }, [facingMode]);

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
