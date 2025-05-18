import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Check if the backend API is reachable
 */
export async function checkBackendConnection(): Promise<{connected: boolean, status?: number, message?: string}> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
  
  try {
    const start = Date.now();
    const response = await fetch(`${API_URL}/health`, { 
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
    });
    
    const elapsed = Date.now() - start;
    const status = response.status;
    
    if (response.ok) {
      console.log(`Backend API is reachable, status: ${status}, response time: ${elapsed}ms`);
      return { 
        connected: true,
        status,
        message: `Backend API connected in ${elapsed}ms`
      };
    }
    
    console.warn(`Backend API returned status ${status}, response time: ${elapsed}ms`);
    return { 
      connected: false,
      status,
      message: `Backend API returned status ${status}`
    };
  } catch (error) {
    console.error("Error connecting to backend API:", error);
    return { 
      connected: false,
      message: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
