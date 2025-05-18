import { toast } from "sonner";

// Base API URL - configure based on environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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
}

// Function to handle API errors
const handleApiError = (error: any) => {
  const message = error.message || "An unexpected error occurred";
  toast.error(message);
  return { success: false, error: message };
};

// Generic fetch function with error handling
async function fetchApi<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const fetchOptions = { ...defaultOptions, ...options };
    
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.error || `Error: ${response.status}`;
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
    
    return { 
      success: true, 
      data: data.data || data, 
      message: data.message 
    };
  } catch (error: any) {
    return handleApiError(error);
  }
}

// Auth API
export const authApi = {
  // 发送验证码
  sendVerificationCode: async (data: { phone_number: string }) => {
    return fetchApi<{ sent: boolean }>("/auth/send-verification-code", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // 登录
  login: async ({ 
    method, 
    username, 
    password,
    phone_number,
    verification_code 
  }: {
    method: "username" | "phone";
    username?: string;
    password?: string;
    phone_number?: string;
    verification_code?: string;
  }) => {
    return fetchApi<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        method,
        username,
        password,
        phone_number,
        verification_code
      }),
    });
  },
  
  // 注册
  register: async ({
    user_type,
    method,
    username,
    password,
    phone_number,
    verification_code
  }: {
    user_type: "worker" | "employer";
    method: "username" | "phone";
    username?: string;
    password?: string;
    phone_number?: string;
    verification_code?: string;
  }) => {
    return fetchApi<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        user_type,
        method,
        username,
        password,
        phone_number,
        verification_code
      }),
    });
  },
  
  // 登出
  logout: async () => {
    return fetchApi("/auth/logout", { method: "POST" });
  },
};

// User API
export const userApi = {
  getProfile: async () => {
    return fetchApi<{ user: any }>("/users/profile");
  },
  
  updateProfile: async (profileData: any) => {
    return fetchApi<{ user: any }>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
  },
  
  uploadAvatar: async (formData: FormData) => {
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
    const queryString = params ? new URLSearchParams(params).toString() : "";
    return fetchApi<{ tasks: any[] }>(`/tasks${queryString ? `?${queryString}` : ""}`);
  },
  
  getTaskByUUID: async (uuid: string) => {
    return fetchApi<{ task: any }>(`/tasks/${uuid}`);
  },
  
  createTask: async (taskData: any) => {
    return fetchApi<{ task: any }>("/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });
  },
  
  applyToTask: async (uuid: string, applicationData: any) => {
    return fetchApi<{ application: any }>(`/tasks/${uuid}/apply`, {
      method: "POST",
      body: JSON.stringify(applicationData),
    });
  },
};

// Dashboard API
export const dashboardApi = {
  getDashboardData: async () => {
    return fetchApi<any>("/dashboard");
  },
};

// Payments API
export const paymentsApi = {
  getPaymentsData: async () => {
    return fetchApi<any>("/payments");
  },
  
  requestWithdrawal: async (withdrawalData: any) => {
    return fetchApi<{ withdrawal: any }>("/payments/withdraw", {
      method: "POST",
      body: JSON.stringify(withdrawalData),
    });
  },
  
  addWithdrawalAccount: async (accountData: any) => {
    return fetchApi<{ account: any }>("/payments/withdrawal-accounts", {
      method: "POST",
      body: JSON.stringify(accountData),
    });
  },
};

// Admin API
export const adminApi = {
  getAdminDashboard: async () => {
    return fetchApi<any>("/admin/dashboard");
  },
}; 