'use client';

import { useEffect, useRef } from 'react';

/**
 * 手势识别封装组件
 * ----------------------------------------------------------------------------
 * 基于 MediaPipe Tasks-Vision 的 HandLandmarker，在浏览器本地离线推理。
 * WASM 与模型文件从 CDN 加载（首次加载后浏览器缓存）。
 * 通过 detectForVideo 在每一帧解析最多两只手的 21 个关键点，回调给父组件。
 *
 * props:
 *  - videoRef: 摄像头 <video> 引用
 *  - running:  是否运行检测循环
 *  - onResults(result): result = { landmarks: [[{x,y,z}...]], handedness: [[...]] }
 *  - onStatus(status): 'loading' | 'ready' | 'error'
 */
export default function HandDetector({ videoRef, running = true, onResults, onStatus }) {
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const runningRef = useRef(running);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      onStatus?.('loading');
      try {
        const vision = await import('@mediapipe/tasks-vision');
        const { HandLandmarker, FilesetResolver } = vision;
        const filesetResolver = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
        const landmarker = await HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (disposed) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        onStatus?.('ready');
        loop();
      } catch (err) {
        console.error('[HandDetector] 初始化失败', err);
        onStatus?.('error');
      }
    }

    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!landmarker || !video || video.readyState < 2 || !runningRef.current) return;
      if (video.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = video.currentTime;

      try {
        const res = landmarker.detectForVideo(video, performance.now());
        onResults?.({
          landmarks: res.landmarks || [],
          handedness: res.handedness || res.handednesses || [],
        });
      } catch (err) {
        // 偶发的帧解析错误忽略，保持循环
      }
    }

    init();
    return () => {
      disposed = true;
      cancelAnimationFrame(rafRef.current);
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
