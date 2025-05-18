import { toast } from "sonner";

// Base API URL - configure based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

// Debug API URL
console.log("Initialized API with URL:", API_BASE_URL);

// Default fetch options
const defaultOptions: RequestInit = {
  headers: {
    "Content-Type": "application/json",
  },
  credentials: "include", // This allows cookies to be sent with requests
};

// Interface for API response
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

// Cookie utility functions
const COOKIE_NAME = "auth_token";
const COOKIE_EXPIRES_DAYS = 7;

const setCookie = (name: string, value: string, days: number): void => {
  if (typeof window === 'undefined') return;
  
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;

  // 使用更强健的cookie设置，确保跨站场景下可正常工作
  // 不设置域名，让浏览器自动使用当前域
  // SameSite=Lax 比 Strict 更宽松，允许从外部链接跳转时携带Cookie
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax;Secure`;
  console.log(`Cookie set: ${name} with expiry ${date.toUTCString()}`);
};

const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  const cookieName = `${name}=`;
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.indexOf(cookieName) === 0) {
      return cookie.substring(cookieName.length, cookie.length);
    }
  }
  return null;
};

const deleteCookie = (name: string): void => {
  if (typeof window === 'undefined') return;
  // 确保使用相同的path和SameSite设置，否则可能删除失败
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax;Secure`;
  console.log(`Cookie deleted: ${name}`);
};

// Function to get token from storage (both localStorage and cookie for transition)
export const getAuthToken = (): string | null => {
  // First try to get from cookie
  const cookieToken = getCookie(COOKIE_NAME);
  if (cookieToken) return cookieToken;
  
  // Fallback to localStorage for backward compatibility
  if (typeof window !== 'undefined') {
    const localToken = localStorage.getItem('auth_token');
    
    // If found in localStorage, migrate it to cookie and remove from localStorage
    if (localToken) {
      console.log("Migrating token from localStorage to cookie");
      saveAuthToken(localToken);
      localStorage.removeItem('auth_token');
      return localToken;
    }
  }
  
  return null;
};

// Function to save token to cookie
export const saveAuthToken = (token: string): void => {
  setCookie(COOKIE_NAME, token, COOKIE_EXPIRES_DAYS);
  console.log("Token saved to cookie, expires in", COOKIE_EXPIRES_DAYS, "days");
};

// Function to remove token from storage
export const removeAuthToken = (): void => {
  deleteCookie(COOKIE_NAME);
  
  // Also clear from localStorage for good measure
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
  
  console.log("Auth token removed from storage");
};

// 增强API错误类型
interface ApiError extends Error {
  status?: number;
  httpStatus?: number;
  isNetworkError?: boolean;
}

// Function to handle API errors
const handleApiError = (error: any): ApiResponse<never> => {
  let apiError: ApiError;
  
  if (error instanceof Error) {
    apiError = error as ApiError;
  } else {
    apiError = new Error("An unexpected error occurred") as ApiError;
    apiError.message = error?.message || "An unexpected error occurred";
  }
  
  console.error("API Error:", apiError);
  toast.error(apiError.message);
  
  return { 
    success: false, 
    error: apiError.message,
    status: apiError.status || apiError.httpStatus 
  };
};

// Generic fetch function with error handling
async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const fetchOptions = { ...defaultOptions, ...options };
    
    // Add Authorization header if we have a token
    const token = getAuthToken();
    if (token) {
      fetchOptions.headers = {
        ...fetchOptions.headers,
        Authorization: `Bearer ${token}`
      };
    }
    
    console.log(`Request: ${options.method || 'GET'} ${url}`, {
      headers: fetchOptions.headers,
      body: options.body ? JSON.parse(options.body as string) : undefined
    });
    
    const response = await fetch(url, fetchOptions);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Handle special case for FormData (which is not JSON)
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
      console.log('Response data:', data);
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
        console.log('Response data (parsed from text):', data);
      } catch (e) {
        console.log('Response is not JSON:', text);
        data = { success: response.ok, message: text };
      }
    }
    
    if (!response.ok) {
      const errorMessage = data.error || `Error: ${response.status}`;
      const apiError = new Error(errorMessage) as ApiError;
      apiError.status = response.status;
      
      toast.error(errorMessage);
      
      // 只在401 Unauthorized时才移除token
      if (response.status === 401 && token) {
        console.log('Unauthorized error with token, removing token');
        removeAuthToken();
      }
      
      throw apiError;
    }
    
    return { 
      success: true, 
      data: data.data || data, 
      message: data.message 
    };
  } catch (error: any) {
    // 检查是否是网络错误
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      error.isNetworkError = true;
      error.message = '网络连接失败，请检查您的网络连接';
    }
    
    console.error(`API call error (${endpoint}):`, error);
    return handleApiError(error);
  }
}

// Auth API
export const authApi = {
  // Send verification code
  sendVerificationCode: async (data: { 
    phone_number: string;
    method: "login" | "register"; 
  }) => {
    console.log("Calling sendVerificationCode API:", data);
    return fetchApi<{ sent: boolean }>("/auth/send-verification-code", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // Login
  login: async (loginData: {
    method: "username" | "phone";
    username?: string;
    password?: string;
    phone_number?: string;
    verification_code?: string;
  }) => {
    console.log("Calling login API:", loginData);
    const response = await fetchApi<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(loginData),
    });
    
    // If login is successful and we have a token, store it
    if (response.success && response.data?.token) {
      saveAuthToken(response.data.token);
    }
    
    return response;
  },
  
  // Register
  register: async (registerData: {
    user_type: string;
    method: "username" | "phone";
    username?: string;
    password?: string;
    phone_number?: string;
    verification_code?: string;
  }) => {
    console.log("Calling register API:", registerData);
    const response = await fetchApi<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(registerData),
    });
    
    // If registration is successful and we have a token, store it
    if (response.success && response.data?.token) {
      saveAuthToken(response.data.token);
    }
    
    return response;
  },
  
  // Logout
  logout: async () => {
    console.log("Calling logout API");
    const response = await fetchApi("/auth/logout", { method: "POST" });
    
    // Remove token regardless of logout API response
    removeAuthToken();
    
    return response;
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    console.log("Calling getProfile API");
    return fetchApi<{ user: any }>("/users/profile");
  },
  
  updateProfile: async (profileData: any) => {
    console.log("Calling updateProfile API:", profileData);
    return fetchApi<{ user: any }>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },
  
  uploadAvatar: async (formData: FormData) => {
    console.log("Calling uploadAvatar API");
    return fetchApi<{ avatarUrl: string }>("/users/profile/avatar", {
      method: "POST",
      body: formData,
      headers: {}, // Let the browser set the content type with boundary for FormData
    });
  },
};

// Tasks API
export const tasksApi = {
  getTasks: async (params?: Record<string, string>) => {
    console.log("Calling getTasks API:", params);
    const queryString = params ? new URLSearchParams(params).toString() : "";
    return fetchApi<{ tasks: any[] }>(`/tasks${queryString ? `?${queryString}` : ""}`);
  },
  
  getTaskByUUID: async (uuid: string) => {
    console.log("Calling getTaskByUUID API:", uuid);
    return fetchApi<{ task: any }>(`/tasks/${uuid}`);
  },
  
  createTask: async (taskData: any) => {
    console.log("Calling createTask API:", taskData);
    return fetchApi<{ task: any }>("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  },
  
  applyToTask: async (uuid: string, applicationData: any) => {
    console.log("Calling applyToTask API:", { uuid, applicationData });
    return fetchApi<{ application: any }>(`/tasks/${uuid}/apply`, {
      method: "POST",
      body: JSON.stringify(applicationData),
    });
  },
};

// Dashboard API
export const dashboardApi = {
  getDashboardData: async () => {
    console.log("Calling getDashboardData API");
    return fetchApi<any>("/dashboard");
  },
};

// Payments API
export const paymentsApi = {
  getPaymentsData: async () => {
    console.log("Calling getPaymentsData API");
    return fetchApi<any>("/payments");
  },
  
  requestWithdrawal: async (withdrawalData: any) => {
    console.log("Calling requestWithdrawal API:", withdrawalData);
    return fetchApi<{ withdrawal: any }>("/payments/withdraw", {
      method: "POST",
      body: JSON.stringify(withdrawalData),
    });
  },
  
  addWithdrawalAccount: async (accountData: any) => {
    console.log("Calling addWithdrawalAccount API:", accountData);
    return fetchApi<{ account: any }>("/payments/withdrawal-accounts", {
      method: "POST",
      body: JSON.stringify(accountData),
    });
  },
};

// Admin API
export const adminApi = {
  getAdminDashboard: async () => {
    console.log("Calling getAdminDashboard API");
    return fetchApi<any>("/admin/dashboard");
  },
}; 