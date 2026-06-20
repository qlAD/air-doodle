'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * 作品详情页交互区：点赞、复刻临摹、评论增删查。
 */
export default function ArtworkDetailActions({ artwork }) {
  const [likes, setLikes] = useState(artwork.likesCount);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState(artwork.comments || []);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
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
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const r = await fetch('/api/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkId: artwork.id, content: text }),
    });
    const d = await r.json();
    if (d.ok) {
      setComments((c) => [d.comment, ...c]);
      setText('');
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button onClick={toggleLike} className={`btn-candy ${liked ? '' : 'opacity-90'}`}>
          {liked ? '❤️' : '🤍'} 点赞 {likes}
        </button>
        <Link href={`/?template=${artwork.id}`} className="btn-ghost">🪄 复刻临摹</Link>
      </div>

      <div>
        <h3 className="font-extrabold mb-2">💬 评论 ({comments.length})</h3>
        <form onSubmit={submitComment} className="flex gap-2 mb-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="说点什么吧…"
            maxLength={200}
            className="flex-1 rounded-full px-4 py-2 bg-white/80"
          />
          <button className="btn-candy" disabled={busy}>发送</button>
        </form>
        <ul className="space-y-2 max-h-72 overflow-y-auto">
          {comments.length === 0 && (
            <li className="text-[#9a9ac0] text-sm text-center py-4">还没有评论，来抢沙发～</li>
          )}
          {comments.map((c) => (
            <li key={c.id} className="card-soft rounded-xl px-3 py-2">
              <div className="text-xs font-bold text-candy-purple">
                {c.user?.nickname || '匿名'}
                <span className="text-[#9a9ac0] font-normal ml-2">
                  {new Date(c.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
              <div className="text-sm">{c.content}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
