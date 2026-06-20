# 🖐️ AI 手势涂鸦工坊 · Air Doodle Studio

基于**浏览器摄像头 + MediaPipe 前端 AI + Next.js 全栈**的隔空手势涂鸦创意 Web 应用。
仅用设备自带摄像头，通过 WebRTC 实时采集视频，在浏览器本地完成手部 21 关键点识别，
实现无接触体感绘画，并提供模板临摹、特效画笔、体感小游戏、作品社区等完整玩法。

> 视频流全程在前端本地处理，不上传服务器，保护隐私。

## ✨ 功能一览

| 模块 | 说明 |
|------|------|
| 隔空绘画 | 食指作画、握拳暂停、手掌擦除、OK 换色、双手握拳清空（烟花反馈） |
| 特效画笔 | 经典 / 星光 / 彩虹 / 烟花 / 水彩 / 霓虹 / 像素 / 爱心（双手比心触发） |
| 模板临摹 | 内置分层模板库，半透明描线，完成自动解锁勋章 |
| 动态背景 | 星空 / 云朵 / 海浪 / 渐变 / 节日 |
| 贴纸 | 比耶呼出面板，捏合放置 |
| 体感小游戏 | 隔空抓星星 / 手势消消画 / 限时猜画 |
| 双手识别 | MediaPipe 多手检测，支持双人同屏协同手势 |
| 音效 & 震动 | Web Audio 合成音效 + 移动端触觉震动 |
| 作品社区 | 上传保存、画廊 SSR、点赞、评论、排行榜、复刻临摹 |
| 分享导出 | 一键合成带水印/边框/文案的分享海报，下载 / Web Share |
| 成就系统 | 连续打卡、画笔大师、临摹达人、游戏高手等 |
| 新手教程 | 首次进入分步手势引导 |

## 🛠️ 技术栈

- **前端**：Next.js 15 (App Router) · React 18 · Tailwind CSS · HTML5 Canvas 2D
- **AI**：MediaPipe Tasks-Vision（HandLandmarker，浏览器本地 WASM 推理）
- **采集/导出**：WebRTC MediaDevices · Web Audio API · html-to-image 思路自绘海报
- **后端**：Next.js API Routes · Prisma ORM · SQLite（开发）/ PostgreSQL（生产）

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 初始化数据库（生成 Prisma Client 并建表）
npx prisma migrate dev --name init

# 3. 启动开发服务器
npm run dev
```

浏览器访问 <http://localhost:3000>，允许摄像头权限即可开始隔空作画。

> 💡 没有摄像头或手势识别不便时，可直接用**鼠标/触屏**在画布上绘制作为兜底体验。
> 📷 摄像头权限仅在 `https://` 或 `localhost` 下可用。

## 📂 目录结构

```
air-doodle/
├── app/                  # 页面与 API 路由
│   ├── page.js           # 首页：手势涂鸦画板
│   ├── gallery/          # 作品画廊（SSR）
│   ├── community/        # 作品社区 + 排行榜（SSR）
│   ├── templates/        # 临摹模板库
│   ├── artwork/[id]/     # 作品详情 + 评论
│   └── api/              # 上传/查询/删除/点赞/评论/成就接口
├── components/           # CanvasBoard / HandDetector / MiniGame ...
├── lib/                  # gestures / brushes / audio / templates / db ...
├── prisma/schema.prisma  # 数据模型
└── public/uploads/       # 作品图片存储
```

## 🌐 部署

支持 Vercel 一键部署；生产环境需 HTTPS（摄像头权限要求）。
将 `prisma/schema.prisma` 的 `provider` 改为 `postgresql` 并配置 `DATABASE_URL` 即可切换数据库。

```bash
npm run build && npm start
```
