'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 作品卡片：展示缩略图、点赞、复刻临摹、删除、详情链接。
 */
export default function ArtworkCard({ artwork, showDelete = true }) {
  const router = useRouter();
  const [likes, setLikes] = useState(artwork.likesCount);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function toggleLike() {
    setBusy(true);
    try {
      const r = await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: artwork.id }),
      });
      const d = await r.json();
      if (d.ok) {
        setLikes(d.likesCount);
        setLiked(d.liked);
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('确定删除这幅作品吗？')) return;
    setBusy(true);
    const r = await fetch(`/api/artwork/${artwork.id}`, { method: 'DELETE' });
    const d = await r.json();
    if (d.ok) {
      setDeleted(true);
      router.refresh();
    }
    setBusy(false);
  }

  if (deleted) return null;

  return (
    <div className="card-soft rounded-2xl overflow-hidden group">
      <Link href={`/artwork/${artwork.id}`} className="block relative aspect-square bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork.imgUrl}
          alt={artwork.name || '隔空涂鸦'}
          className="w-full h-full object-contain"
          loading="lazy"
        />
        {artwork.templateId && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-candy-mint/90">
            临摹
          </span>
        )}
      </Link>
      <div className="p-3">
        <div className="font-bold text-sm truncate">{artwork.name || '未命名作品'}</div>
        <div className="text-[11px] text-[#9a9ac0] mb-2">
          {artwork.user?.nickname || '匿名'} · {new Date(artwork.createdAt).toLocaleDateString('zh-CN')}
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLike}
              disabled={busy}
              className={`flex items-center gap-1 font-bold ${liked ? 'text-candy-pink' : 'text-[#6d6d9c]'}`}
            >
              {liked ? '❤️' : '🤍'} {likes}
            </button>
            {typeof artwork._count?.comments === 'number' && (
              <span className="text-[#9a9ac0]">💬 {artwork._count.comments}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/?template=${artwork.id}`}
              title="复刻临摹"
              className="text-[#6d6d9c] hover:text-candy-purple"
            >
              🪄
            </Link>
            {showDelete && (
              <button onClick={remove} disabled={busy} title="删除" className="text-[#6d6d9c] hover:text-red-400">
                🗑️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
