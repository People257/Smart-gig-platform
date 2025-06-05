'use client';

import { useEffect } from 'react';
import { getApiBaseUrl } from '../config/api';

export function ApiUrlDebugger() {
  useEffect(() => {
    const apiUrl = getApiBaseUrl();
    console.log("API URL DEBUG - Using address:", apiUrl);
    console.log("API URL DEBUG - Environment variable:", process.env.NEXT_PUBLIC_API_URL);
    // 移除alert弹窗，避免影响用户体验
  }, []);

  return null; // 这个组件不渲染任何内容
} 