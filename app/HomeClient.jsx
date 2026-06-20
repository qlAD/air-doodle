'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

// CanvasBoard 依赖摄像头 / Canvas / MediaPipe，仅客户端渲染
const CanvasBoard = dynamic(() => import('@/components/CanvasBoard'), {
  ssr: false,
  loading: () => (
    <div className="p-10 text-center text-[#6d6d9c] animate-pulse">🎨 正在准备隔空画板…</div>
  ),
});

export default function HomeClient() {
  const params = useSearchParams();
  const template = params.get('template');
  return (
    <div className="h-full">
      <CanvasBoard initialTemplate={template} />
    </div>
  );
}
