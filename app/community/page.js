import Link from 'next/link';
import { prisma } from '@/lib/db';
import ArtworkCard from '@/components/ArtworkCard';

export const dynamic = 'force-dynamic';

const TABS = [
  { id: 'today', label: '🔥 今日热门', range: 'today', sort: 'hot' },
  { id: 'week', label: '🏆 本周最佳', range: 'week', sort: 'hot' },
  { id: 'new', label: '✨ 最新创意', range: 'all', sort: 'new' },
];

/**
 * 作品社区页（含排行榜）。SSR 渲染公开作品，按维度切换排行榜。
 */
export default async function CommunityPage({ searchParams }) {
  const sp = await searchParams;
  const tabId = sp?.tab || 'today';
  const tab = TABS.find((t) => t.id === tabId) || TABS[0];

  const where = { isPublic: true };
  if (tab.range === 'today') where.createdAt = { gte: new Date(Date.now() - 86400000) };
  else if (tab.range === 'week') where.createdAt = { gte: new Date(Date.now() - 7 * 86400000) };

  const orderBy =
    tab.sort === 'hot' ? [{ likesCount: 'desc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }];

  const items = await prisma.artwork.findMany({
    where,
    orderBy,
    take: 24,
    include: { user: { select: { nickname: true } }, _count: { select: { comments: true } } },
  });

  // 排行榜前三
  const podium = items.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-gradient">🌈 作品社区</h1>
        <p className="text-[#6d6d9c] mt-1">点赞、评论、复刻临摹，发现更多隔空创意</p>
      </div>

      {/* 排行榜 Tab */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/community?tab=${t.id}`}
            className={`px-4 py-2 rounded-full font-bold text-sm ${t.id === tabId ? 'btn-candy' : 'btn-ghost'}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 领奖台 */}
      {tab.sort === 'hot' && podium.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto items-end">
          {[1, 0, 2].map((rank) => {
            const a = podium[rank];
            if (!a) return <div key={rank} />;
            const medals = ['🥇', '🥈', '🥉'];
            const heights = ['h-44', 'h-36', 'h-32'];
            return (
              <Link
                key={a.id}
                href={`/artwork/${a.id}`}
                className={`card-soft rounded-2xl overflow-hidden flex flex-col ${heights[rank]} ${rank === 0 ? 'order-2' : ''}`}
              >
                <div className="text-center text-2xl pt-1">{medals[rank]}</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.imgUrl} alt={a.name || ''} className="flex-1 w-full object-contain px-2" />
                <div className="text-center text-xs font-bold pb-1">❤️ {a.likesCount}</div>
              </Link>
            );
          })}
        </div>
      )}

      {items.length === 0 ? (
        <div className="card-soft rounded-3xl p-12 text-center">
          <div className="text-5xl mb-2">🌱</div>
          <p className="text-[#6d6d9c]">这个榜单暂时还没有作品，快去创作投稿吧！</p>
          <Link href="/" className="btn-candy mt-4 inline-block">去创作</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((a) => (
            <ArtworkCard key={a.id} artwork={a} showDelete={false} />
          ))}
        </div>
      )}
    </div>
  );
}
