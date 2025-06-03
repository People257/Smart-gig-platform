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

  // 移除SameSite和Secure设置，使Cookie在开发环境可靠工作
  document.cookie = `${name}=${value};${expires};path=/`;
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
  // 确保使用相同的path设置，不使用SameSite和Secure
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
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
      const errorMessage = data.error || data.message || `Error: ${response.status}`;
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
    
    // 处理后端返回的各种格式，确保返回统一的API响应格式
    let processedData;
    
    // 标准响应格式: {success: boolean, data: T, message: string}
    if (data.hasOwnProperty('success')) {
      processedData = data;
    } 
    // 嵌套结构的响应: {data: {user: {...}}}
    else if (data.hasOwnProperty('data')) {
      // 检查data是否为空对象或null
      if (!data.data || (typeof data.data === 'object' && Object.keys(data.data).length === 0)) {
        processedData = {
          success: false,
          error: "服务器返回空数据",
          message: data.message || "请求成功但返回了空数据",
          data: data.data
        };
      } else {
        processedData = {
          success: true,
          data: data.data,
          message: data.message || 'Success'
        };
      }
    } 
    // 直接响应结构: {user: {...}} 
    else {
      // 检查是否至少有一个有效的数据字段
      const hasValidData = Object.keys(data).some(key => {
        // 忽略常见的元数据字段
        if (['message', 'error', 'status', 'success', 'code'].includes(key)) {
          return false;
        }
        return data[key] !== null && data[key] !== undefined;
      });

      if (hasValidData) {
        processedData = {
          success: true,
          data: data,
          message: data.message || 'Success'
        };
      } else {
        processedData = {
          success: false,
          error: data.error || "数据格式无效",
          message: data.message || "响应中没有有效数据",
          data: {}
        };
      }
    }
    
    return processedData;
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

// Authentication API
export const authApi = {
  register: async (registerData: {
    method: string;
    user_type: string;
    username?: string;
    password?: string;
    phone_number?: string;
    email?: string;
    verification_code?: string;
    name?: string;
  }) => {
    console.log("Calling register API:", registerData);
    const response = await fetchApi<{ user: any; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(registerData),
    });
    
    // If registration is successful, save the token
    if (response.success && response.data?.token) {
      saveAuthToken(response.data.token);
    }
    
    return response;
  },
  
  login: async (credentials: { username: string; password: string }) => {
    console.log("Calling login API:", { username: credentials.username });
    const response = await fetchApi<{ token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    
    // 成功登录时保存token
    if (response.success && response.data && response.data.token) {
      saveAuthToken(response.data.token);
    }
    
    return response;
  },
  
  sendVerificationCode: async (data: {
    phone_number?: string;
    email?: string;
    method: string;
    target: string;
  }) => {
    console.log("Calling sendVerificationCode API:", data);
    // Use the updated endpoint that matches the backend
    return fetchApi<{ message: string }>("/auth/verification-code", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  logout: async () => {
    console.log("Calling logout API");
    // Call the API endpoint to invalidate token on the server
    const response = await fetchApi<{ success: boolean }>("/auth/logout", {
      method: "POST",
    });
    
    // Always remove the token from client storage regardless of API response
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
    return fetchApi<{ avatarUrl?: string; avatar_url?: string; avatar?: string }>("/users/profile/avatar", {
      method: "POST",
      body: formData,
      headers: {}, // Let the browser set the content type with boundary for FormData
    });
  },
  
  getMyTasks: async () => {
    console.log("Calling getMyTasks API");
    return fetchApi<{ applications: any[] }>("/users/my-tasks");
  },
  
  updateUserSettings: async (settingsData: {
    username?: string;
    email?: string;
    phone_number?: string;
    notification_preferences?: {
      email_notifications?: boolean;
      sms_notifications?: boolean;
      app_notifications?: boolean;
      task_notifications?: boolean;
      message_notifications?: boolean;
      payment_notifications?: boolean;
    };
    privacy_settings?: {
      profile_visibility?: boolean;
      show_hourly_rate?: boolean;
      show_contact_info?: boolean;
    };
  }) => {
    console.log("Calling updateUserSettings API:", settingsData);
    return fetchApi<{ user: any }>("/users/settings", {
      method: "PUT",
      body: JSON.stringify(settingsData),
    });
  },
  
  changePassword: async (passwordData: {
    current_password: string;
    new_password: string;
  }) => {
    console.log("Calling changePassword API");
    return fetchApi<{ success: boolean }>("/users/change-password", {
      method: "POST",
      body: JSON.stringify(passwordData),
    });
  },
  
  deleteAccount: async () => {
    console.log("Calling deleteAccount API");
    return fetchApi<{ success: boolean }>("/users/account", {
      method: "DELETE",
    });
  },
  
  realNameAuth: async (data: { real_name: string; id_card: string }) => {
    console.log("Calling realNameAuth API", { real_name: data.real_name, id_card: `${data.id_card.substring(0, 3)}****` });
    return fetchApi<{ success: boolean; data?: { real_name?: string; id_card?: string; is_identity_verified?: boolean } }>("/users/realname-auth", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get real name verification status
  getRealNameVerification: async () => {
    console.log("Calling getRealNameVerification API");
    return fetchApi<{ real_name?: string; id_card?: string; is_identity_verified?: boolean }>("/users/realname-auth");
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
    return fetchApi<{ application?: any; require_verification?: boolean; message?: string }>(`/tasks/${uuid}/apply`, {
      method: "POST",
      body: JSON.stringify(applicationData),
    });
  },
  
  completeTask: async (uuid: string) => {
    console.log("Calling completeTask API:", uuid);
    return fetchApi<{ message: string }>(`/tasks/${uuid}/complete`, { method: "PUT" });
  },
  
  confirmTaskCompletion: async (uuid: string) => {
    console.log("Calling confirmTaskCompletion API:", uuid);
    return fetchApi<{ message: string }>(`/tasks/${uuid}/confirm`, { method: "PUT" });
  },

  acceptApplication: async (applicationUUID: string) => {
    console.log("Calling acceptApplication API:", applicationUUID);
    return fetchApi<{ message: string }>(`/applications/${applicationUUID}/accept`, { method: "PUT" });
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
  
  requestWithdrawal: async (withdrawalData: { amount: number; alipay_account: string }) => {
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

// Reviews API
export const reviewsApi = {
  getUserReviews: async (userUUID: string) => {
    console.log("Calling getUserReviews API:", userUUID);
    return fetchApi<any>(`/reviews/user/${userUUID}`);
  },
  
  getPendingReviews: async () => {
    console.log("Calling getPendingReviews API");
    return fetchApi<any>("/reviews/pending");
  },
  
  createReview: async (reviewData: {
    rating: number;
    comment: string;
    task_uuid: string;
    reviewee_uuid: string;
  }) => {
    console.log("Calling createReview API:", reviewData);
    return fetchApi<any>("/reviews", {
      method: "POST",
      body: JSON.stringify(reviewData),
    });
  },
  
  getUserRatings: async (userUUID: string) => {
    console.log("Calling getUserRatings API:", userUUID);
    return fetchApi<any>(`/reviews/ratings/${userUUID}`);
  },
  
  reportReview: async (reviewUUID: string, reason: string) => {
    console.log("Calling reportReview API:", { reviewUUID, reason });
    return fetchApi<any>(`/reviews/report/${reviewUUID}`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }
}; 