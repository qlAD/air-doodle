import { cookies } from 'next/headers';
import { prisma } from './db';

const COOKIE = 'air_doodle_uid';

/**
 * 获取或创建匿名用户（基于 cookie）。
 * 项目无强制登录，用匿名用户承载点赞、成就、作品归属。
 * 需在 Route Handler / Server Action 中调用（可读写 cookie）。
 */
export async function getOrCreateUser() {
  const store = await cookies();
  let uid = store.get(COOKIE)?.value;

  if (uid) {
    const existing = await prisma.user.findUnique({ where: { id: uid } });
    if (existing) return existing;
  }

  const user = await prisma.user.create({
    data: { nickname: '涂鸦小画家' },
  });
  store.set(COOKIE, user.id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return user;
}

/** 只读取当前用户 id（不创建），用于查询场景。 */
export async function getCurrentUserId() {
  const store = await cookies();
  return store.get(COOKIE)?.value || null;
}
