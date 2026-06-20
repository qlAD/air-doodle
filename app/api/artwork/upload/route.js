import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getOrCreateUser } from '@/lib/user';

export const runtime = 'nodejs';

/**
 * 作品上传接口
 * 接收 FormData（file + 元信息），保存图片到 public/uploads，写入数据库。
 */
export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: '缺少图片文件' }, { status: 400 });
    }

    const name = form.get('name')?.toString().slice(0, 60) || '我的隔空涂鸦';
    const isPublic = form.get('isPublic') !== 'false';
    const templateId = form.get('templateId')?.toString() || null;
    const filterType = form.get('filterType')?.toString() || null;
    const brushType = form.get('brushType')?.toString() || null;

    // 校验类型与大小（≤ 8MB）
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: '图片过大（上限 8MB）' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });
    const filename = `${crypto.randomUUID()}.png`;
    await writeFile(path.join(uploadsDir, filename), bytes);
    const imgUrl = `/uploads/${filename}`;

    const user = await getOrCreateUser();
    const artwork = await prisma.artwork.create({
      data: { imgUrl, name, isPublic, templateId, filterType, brushType, userId: user.id },
    });

    return NextResponse.json({ ok: true, artwork });
  } catch (err) {
    console.error('[upload] 失败', err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
