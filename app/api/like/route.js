import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user';

export const runtime = 'nodejs';

/**
 * 点赞 / 取消点赞接口
 * 事务更新 likesCount 冗余字段，保证计数与点赞记录一致。
 */
export async function POST(req) {
  try {
    const { artworkId } = await req.json();
    if (!artworkId) {
      return NextResponse.json({ ok: false, error: '缺少 artworkId' }, { status: 400 });
    }
    const user = await getOrCreateUser();

    const existing = await prisma.like.findUnique({
      where: { artworkId_userId: { artworkId, userId: user.id } },
    });

    let liked;
    let likesCount;
    if (existing) {
      // 取消点赞
      [, { likesCount }] = await prisma.$transaction([
        prisma.like.delete({ where: { id: existing.id } }),
        prisma.artwork.update({
          where: { id: artworkId },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);
      liked = false;
    } else {
      // 点赞
      [, { likesCount }] = await prisma.$transaction([
        prisma.like.create({ data: { artworkId, userId: user.id } }),
        prisma.artwork.update({
          where: { id: artworkId },
          data: { likesCount: { increment: 1 } },
        }),
      ]);
      liked = true;
    }

    return NextResponse.json({ ok: true, liked, likesCount });
  } catch (err) {
    console.error('[like] 失败', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
