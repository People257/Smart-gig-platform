// API 配置
export const API_CONFIG = {
  BASE_URL: 'http://47.99.147.94:8080/api',
};

// 解析URL域名的辅助函数
const extractDomain = (url) => {
  try {
    if (!url) return '';
    // 创建URL对象提取主机名
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error('Invalid URL in extractDomain:', url, e);
    return '';
  }
};

// 调试API URL和域名解析
function debugApiUrl(url) {
  if (typeof window !== 'undefined') {
    console.log('API URL DEBUG - Using URL:', url);
    console.log('API URL DEBUG - Domain extracted:', extractDomain(url));
    console.log('API URL DEBUG - Window location:', window.location.hostname);
  }
}

// 导出函数获取 API URL，始终使用服务器IP
export function getApiBaseUrl() {
  // 强制使用服务器URL
  const apiUrl = API_CONFIG.BASE_URL;
  
  // 禁止使用本地地址
  if (apiUrl.includes('localhost')) {
    console.warn('API CONFIG - 检测到localhost地址，已强制替换为服务器地址');
    return 'http://47.99.147.94:8080/api';
  }
  
  // 调试信息
  console.log('API CONFIG - 使用服务器URL:', apiUrl);
  
  // 在客户端显示附加调试信息
  if (typeof window !== 'undefined') {
    debugApiUrl(apiUrl);
  }
  
  return apiUrl;
}

// 导出获取API域名的函数，用于cookie设置
export function getApiDomain() {
  // 强制返回服务器IP
  return '47.99.147.94';
} 