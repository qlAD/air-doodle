import './globals.css';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'AI 手势涂鸦工坊 · Air Doodle Studio',
  description:
    '基于浏览器摄像头 + MediaPipe 前端 AI + Next.js 全栈的隔空手势涂鸦创意应用。隔空作画、模板临摹、体感小游戏、作品社区。',
  keywords: ['手势涂鸦', 'MediaPipe', 'Next.js', '隔空绘画', 'Air Doodle'],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavBar />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
      </body>
    </html>
  );
}
