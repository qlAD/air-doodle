import { NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/** 获取单个作品详情（含评论） */
export async function GET(_req, { params }) {
  const { id } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    include: {
      user: { select: { nickname: true, avatarUrl: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { nickname: true } } },
      },
    },
  });
  if (!artwork) return NextResponse.json({ ok: false, error: '作品不存在' }, { status: 404 });
  return NextResponse.json({ ok: true, artwork });
}

/** 删除作品：同步删除数据库记录与磁盘图片 */
export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) return NextResponse.json({ ok: false, error: '作品不存在' }, { status: 404 });

    // 删除磁盘文件（忽略不存在）
    if (artwork.imgUrl?.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', artwork.imgUrl);
      await unlink(filePath).catch(() => {});
    }
    await prisma.artwork.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[delete] 失败', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
