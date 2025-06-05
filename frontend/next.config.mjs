/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  transpilePackages: ['antd', 'rc-util', '@ant-design/icons', 'rc-picker', 'rc-pagination', '@rc-component/util'],
  
  // 环境变量配置 - 强制使用服务器地址
  env: {
    NEXT_PUBLIC_API_URL: 'http://47.99.147.94:8080/api',
  },
  
  // 禁用默认的API路由代理
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://47.99.147.94:8080/api/:path*', // 始终使用服务器地址
      },
    ];
  },
  
  // 添加绝对路径配置
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-API-Server',
            value: 'http://47.99.147.94:8080/api',
          },
        ],
      },
    ];
  },
}

export default nextConfig
