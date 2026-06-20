/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // 摄像头/Canvas 副作用在严格模式双调用下易出问题，关闭以保证体感交互稳定
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 允许浏览器访问摄像头需要的安全头；MediaPipe WASM 需要跨域隔离支持
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
