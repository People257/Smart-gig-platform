'use client';

/**
 * API请求拦截补丁 - 强制使用服务器地址
 * 在应用启动时执行，会拦截所有fetch请求并修改localhost地址
 */

// 服务器地址
const SERVER_URL = 'http://47.99.147.94:8080/api';

// 只在客户端环境中执行
if (typeof window !== 'undefined') {
  // 保存原始fetch函数
  const originalFetch = window.fetch;

  // 创建拦截函数
  const interceptFetch = (...args) => {
    let [resource, options] = args;
    
    // 检查是否是localhost请求
    if (typeof resource === 'string' && resource.includes('localhost')) {
      console.warn('API PATCH - 检测到localhost请求，拦截并修改为服务器地址');
      console.warn('API PATCH - 原始URL:', resource);
      
      // 替换localhost部分为服务器地址
      resource = resource.replace(/http:\/\/localhost:[0-9]+\/api/, SERVER_URL);
      
      console.warn('API PATCH - 修改后URL:', resource);
    }
    
    // 调用原始fetch
    return originalFetch(resource, options);
  };

  // 覆盖全局fetch
  console.log('API PATCH - 安装全局API请求拦截器');
  window.fetch = interceptFetch;
}

// 导出服务器地址，可以在其他地方使用
export const API_SERVER_URL = SERVER_URL; 