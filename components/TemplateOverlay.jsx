'use client';

import { useEffect, useRef } from 'react';
import { drawTemplate } from '@/lib/templates';

/**
 * 临摹模板叠加组件（独立可复用）。
 * 在一个 canvas 上渲染指定模板的半透明轮廓，用于模板库预览卡片。
 */
export default function TemplateOverlay({ templateId, opacity = 0.5, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    if (templateId) drawTemplate(ctx, templateId, c.width, c.height, opacity);
  }, [templateId, opacity]);

  return <canvas ref={ref} width={240} height={200} className={className} />;
}
