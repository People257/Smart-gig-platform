import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 检查后端API连接状态
export async function checkBackendConnection() {
  try {
    console.log("Testing direct connection to backend...")
    // 简单的OPTIONS请求，不需要身份验证
    const response = await fetch('/api/auth/login', {
      method: 'OPTIONS',
    });
    
    console.log(`Backend connection test result: ${response.status} ${response.statusText}`);
    return {
      connected: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error("Backend connection test failed:", error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
