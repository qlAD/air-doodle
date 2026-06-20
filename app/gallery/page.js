import Link from 'next/link';
import { prisma } from '@/lib/db';
import ArtworkCard from '@/components/ArtworkCard';

export const dynamic = 'force-dynamic';

/**
 * 作品画廊页（服务端 SSR 渲染）。
 * 首次加载时服务端直接查询数据库，预渲染所有公开作品卡片。
 */
export default async function GalleryPage({ searchParams }) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || '1', 10));
  const pageSize = 12;

  const where = { isPublic: true };
  const [items, total] = await Promise.all([
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { nickname: true } }, _count: { select: { comments: true } } },
    }),
    prisma.artwork.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-gradient">🖼️ 作品画廊</h1>
          <p className="text-[#6d6d9c] mt-1">共 {total} 幅隔空涂鸦作品 · 服务端渲染</p>
        </div>
        <Link href="/" className="btn-candy">✏️ 去创作</Link>
      </div>

      {items.length === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((a) => (
            <ArtworkCard key={a.id} artwork={a} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/gallery?page=${p}`}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                p === page ? 'btn-candy' : 'btn-ghost'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="card-soft rounded-3xl p-12 text-center">
      <div className="text-6xl mb-3">🎨</div>
      <h3 className="text-xl font-bold mb-2">还没有作品哦</h3>
      <p className="text-[#6d6d9c] mb-5">去画板隔空画一幅，保存后就会出现在这里。</p>
      <Link href="/" className="btn-candy">开始创作</Link>
    </div>
  );
}
