import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ArtworkDetailActions from '@/components/ArtworkDetailActions';

export const dynamic = 'force-dynamic';

/**
 * 作品详情页：大图预览、点赞、复刻临摹、评论。
 */
export default async function ArtworkPage({ params }) {
  const { id } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      user: { select: { nickname: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { nickname: true } } },
      },
    },
  });
  if (!artwork) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <Link href="/gallery" className="btn-ghost inline-block mb-4">← 返回画廊</Link>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-soft rounded-3xl p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={artwork.imgUrl} alt={artwork.name || ''} className="w-full rounded-2xl bg-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold mb-1">{artwork.name || '未命名作品'}</h1>
          <p className="text-[#9a9ac0] text-sm mb-4">
            {artwork.user?.nickname || '匿名画家'} · {new Date(artwork.createdAt).toLocaleString('zh-CN')}
          </p>
          <div className="flex flex-wrap gap-2 mb-4 text-xs">
            {artwork.templateId && <Tag>✏️ 临摹作品</Tag>}
            {artwork.brushType && <Tag>🖌️ {artwork.brushType}</Tag>}
            {artwork.filterType && <Tag>🎨 {artwork.filterType} 滤镜</Tag>}
            <Tag>{artwork.isPublic ? '🌍 公开' : '🔒 私密'}</Tag>
          </div>
          <ArtworkDetailActions artwork={JSON.parse(JSON.stringify(artwork))} />
        </div>
      </div>
    </div>
  );
}

function Tag({ children }) {
  return <span className="px-2 py-1 rounded-full bg-white/70 font-semibold">{children}</span>;
}
