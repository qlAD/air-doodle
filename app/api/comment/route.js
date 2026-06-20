import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user';

export const runtime = 'nodejs';

/** 新增评论 */
export async function POST(req) {
  try {
    const { artworkId, content } = await req.json();
    if (!artworkId || !content?.trim()) {
      return NextResponse.json({ ok: false, error: '参数缺失' }, { status: 400 });
    }
    const user = await getOrCreateUser();
    const comment = await prisma.comment.create({
      data: { artworkId, content: content.trim().slice(0, 200), userId: user.id },
      include: { user: { select: { nickname: true } } },
    });
    return NextResponse.json({ ok: true, comment });
  } catch (err) {
    console.error('[comment] 失败', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/** 查询某作品评论 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const artworkId = searchParams.get('artworkId');
  if (!artworkId) return NextResponse.json({ ok: false, error: '缺少 artworkId' }, { status: 400 });
  const comments = await prisma.comment.findMany({
    where: { artworkId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { nickname: true } } },
  });
  return NextResponse.json({ ok: true, comments });
}
