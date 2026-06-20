import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 作品查询接口
 * 支持分页、排序（最新/最热）、时间范围筛选（用于排行榜）。
 * query: page, pageSize, sort=new|hot, range=all|today|week, templateId
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(48, Math.max(1, parseInt(searchParams.get('pageSize') || '12', 10)));
    const sort = searchParams.get('sort') || 'new';
    const range = searchParams.get('range') || 'all';
    const templateId = searchParams.get('templateId');

    const where = { isPublic: true };
    if (templateId) where.templateId = templateId;
    if (range === 'today') {
      where.createdAt = { gte: new Date(Date.now() - 86400000) };
    } else if (range === 'week') {
      where.createdAt = { gte: new Date(Date.now() - 7 * 86400000) };
    }

    const orderBy =
      sort === 'hot' ? [{ likesCount: 'desc' }, { createdAt: 'desc' }] : [{ createdAt: 'desc' }];

    const [items, total] = await Promise.all([
      prisma.artwork.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { nickname: true, avatarUrl: true } }, _count: { select: { comments: true } } },
      }),
      prisma.artwork.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error('[get] 失败', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
