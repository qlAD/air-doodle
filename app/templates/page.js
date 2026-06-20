'use client';

import { useState } from 'react';
import Link from 'next/link';
import TemplateOverlay from '@/components/TemplateOverlay';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '@/lib/templates';

const LEVELS = { easy: '幼儿简笔画', medium: '进阶插画', hard: '高手素描' };

/**
 * 临摹模板库页。分类/难度筛选，点击「去临摹」带模板参数进入画板。
 */
export default function TemplatesPage() {
  const [cat, setCat] = useState('all');

  const list = TEMPLATES.filter((t) => cat === 'all' || t.category === cat);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-gradient">✏️ 临摹模板库</h1>
        <p className="text-[#6d6d9c] mt-1">沿半透明轮廓隔空描线，零基础也能快速出片</p>
      </div>

      {/* 分类筛选 */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCat('all')}
          className={`px-4 py-2 rounded-full font-bold text-sm ${cat === 'all' ? 'btn-candy' : 'btn-ghost'}`}
        >
          全部
        </button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`px-4 py-2 rounded-full font-bold text-sm ${cat === c.id ? 'btn-candy' : 'btn-ghost'}`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((t) => (
          <div key={t.id} className="card-soft rounded-2xl overflow-hidden">
            <div className="relative aspect-[6/5] bg-white flex items-center justify-center">
              <TemplateOverlay templateId={t.id} opacity={0.7} className="w-full h-full" />
              <span className="absolute top-2 right-2 text-2xl">{t.emoji}</span>
            </div>
            <div className="p-3">
              <div className="font-bold">{t.name}</div>
              <div className="text-[11px] text-[#9a9ac0] mb-2">{LEVELS[t.level]}</div>
              <Link href={`/?template=${t.id}`} className="btn-candy w-full text-center text-sm block">
                🎨 去临摹
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
