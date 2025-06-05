'use client';

import { useEffect, useState } from 'react';
import { getApiBaseUrl, getApiDomain } from '../../config/api';

export function ApiDebug() {
  const [debugInfo, setDebugInfo] = useState({
    apiUrl: '',
    apiDomain: '',
    windowLocation: '',
    cookies: '',
  });

  useEffect(() => {
    // 收集调试信息
    const apiUrl = getApiBaseUrl();
    const apiDomain = getApiDomain();
    const windowLocation = window.location.href;
    const cookies = document.cookie;
    
    setDebugInfo({
      apiUrl,
      apiDomain,
      windowLocation,
      cookies,
    });
    
    // 输出到控制台
    console.log('==== API DEBUG INFO ====');
    console.log('API URL:', apiUrl);
    console.log('API Domain:', apiDomain);
    console.log('Window Location:', windowLocation);
    console.log('Cookies:', cookies);
    console.log('=======================');
  }, []);

  // 仅在开发环境或带有特定查询参数时显示
  const isDev = process.env.NODE_ENV !== 'production';
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debug = urlParams.get('debug');
    setShowDebug(isDev || debug === 'true');
  }, [isDev]);
  
  if (!showDebug) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      backgroundColor: 'rgba(0,0,0,0.8)', 
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px',
      maxHeight: '200px',
      overflow: 'auto'
    }}>
      <h4 style={{ margin: '0 0 5px 0' }}>API调试信息</h4>
      <div><strong>API URL:</strong> {debugInfo.apiUrl}</div>
      <div><strong>API Domain:</strong> {debugInfo.apiDomain}</div>
      <div><strong>Window:</strong> {debugInfo.windowLocation}</div>
      <div>
        <strong>Cookies:</strong>
        <div style={{ wordBreak: 'break-all', fontSize: '10px' }}>
          {debugInfo.cookies || '(无)'}
        </div>
      </div>
    </div>
  );
} 