import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOrCreateUser, getCurrentUserId } from '@/lib/user';

export const runtime = 'nodejs';

/**
 * 成就查询：返回当前用户已解锁成就列表。
 */
export async function GET() {
  const uid = await getCurrentUserId();
  if (!uid) return NextResponse.json({ ok: true, achievements: [] });
  const achievements = await prisma.achievement.findMany({
    where: { userId: uid },
    orderBy: { unlockedAt: 'desc' },
  });
  return NextResponse.json({ ok: true, achievements });
}

/**
 * 成就解锁：满足条件时写入成就记录（去重）。
 */
export async function POST(req) {
  try {
    const { key, name, desc, icon } = await req.json();
    if (!key || !name) {
      return NextResponse.json({ ok: false, error: '参数缺失' }, { status: 400 });
    }
    const user = await getOrCreateUser();
    const achievement = await prisma.achievement.upsert({
      where: { userId_key: { userId: user.id, key } },
      update: {},
      create: { userId: user.id, key, name, desc: desc || '', iconUrl: icon || null },
    });
    return NextResponse.json({ ok: true, achievement });
  } catch (err) {
    console.error('[achievement] 失败', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
