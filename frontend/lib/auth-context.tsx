"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, userApi, saveAuthToken, removeAuthToken, getAuthToken } from "./api";
import { toast } from "sonner";

// User type definition
interface User {
  uuid: string;
  username?: string;
  user_type: string;
  avatar?: string;
  [key: string]: any;
}

// API response type
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Auth context type definition
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (loginData: any) => Promise<User>;
  register: (registerData: any) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => { throw new Error("Not implemented"); },
  register: async () => { throw new Error("Not implemented"); },
  logout: async () => {},
  updateUser: () => {},
});

// Hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // 首先检查是否有token存在
        const hasToken = !!getAuthToken();
        if (!hasToken) {
          console.log("No auth token found, skipping profile fetch");
          setIsLoading(false);
          return;
        }
        
        console.log("Checking authentication status...");
        try {
          const response = await userApi.getProfile();
          
          if (response.data?.user) {
            console.log("User is authenticated:", response.data.user);
            setUser(response.data.user);
          } else {
            console.log("User profile not found, but keeping token");
            // 不立即删除token，因为可能是临时网络问题
            toast.error("无法加载用户资料，请稍后重试");
          }
        } catch (profileError: any) {
          console.error("Profile fetch error:", profileError);
          
          // 只在特定情况下才删除token
          if (profileError.status === 401 || 
              profileError.message?.toLowerCase().includes('unauthorized') || 
              profileError.message?.toLowerCase().includes('invalid token')) {
            console.log("Token invalid, removing it");
            removeAuthToken();
            toast.error("登录已过期，请重新登录");
          } else {
            console.log("Network or server error, keeping token and user state");
            // 临时网络问题或服务器错误，不删除token
            toast.error("网络连接问题，请稍后重试");
          }
        }
      } catch (error: any) {
        console.error("Auth check failed (outer):", error);
        // 这里不删除token，因为可能是程序错误而非权限问题
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function that handles both username and phone methods
  const login = async (loginData: any): Promise<User> => {
    try {
      setIsLoading(true);
      console.log("Login attempt with data:", loginData);
      
      const response = await authApi.login(loginData);
      console.log("Login response:", response);
      
      if (response.data?.user) {
        setUser(response.data.user);
        console.log("Login successful, user:", response.data.user);
        
        toast.success(response.message || "Login successful");
        return response.data.user;
      } 
      
      throw new Error(response.error || "Login failed");
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error(error.message || "Login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (registerData: any): Promise<User> => {
    try {
      setIsLoading(true);
      console.log("Register attempt with data:", registerData);
      
      const response = await authApi.register(registerData);
      console.log("Register response:", response);
      
      if (response.data?.user) {
        setUser(response.data.user);
        console.log("Registration successful, user:", response.data.user);
        
        toast.success(response.message || "Registration successful");
        return response.data.user;
      }
      
      throw new Error(response.error || "Registration failed");
    } catch (error: any) {
      console.error("Registration failed:", error);
      toast.error(error.message || "Registration failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      console.log("Logout attempt");
      const response = await authApi.logout();
      console.log("Logout response:", response);
      
      setUser(null);
      removeAuthToken(); // 确保登出时移除token
      toast.success(response.message || "Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed");
      // 即使API调用失败，也要移除token并清除用户状态
      removeAuthToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      console.log("Updating user data:", updatedUser);
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 