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
  avatar_url?: string;
  name?: string;
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
            try {
              // 使用normalizeUserData函数处理用户数据
              const normalizedUser = normalizeUserData(response.data.user);
              
              if (normalizedUser) {
                console.log("Normalized user data:", normalizedUser);
                setUser(normalizedUser);
              } else {
                console.error("User data missing required fields:", response.data.user);
                toast.error("用户数据缺少必要信息，请重新登录");
                removeAuthToken();
                setIsLoading(false);
                return;
              }
            } catch (parseError) {
              console.error("Error parsing user data:", parseError, response.data.user);
              // 不要立即退出登录，让用户可以尝试刷新页面
              toast.error("解析用户数据出错，请刷新页面重试");
            }
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
        // 使用normalizeUserData处理用户数据
        const normalizedUser = normalizeUserData(response.data.user);
        
        if (normalizedUser) {
          setUser(normalizedUser);
          console.log("Login successful, normalized user:", normalizedUser);
          
          toast.success(response.message || "Login successful");
          return normalizedUser;
        } else {
          throw new Error("用户数据格式无效，请联系管理员");
        }
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
      
      // Ensure method is valid
      if (!["username", "phone", "email"].includes(registerData.method)) {
        throw new Error("Invalid registration method. Must be 'username', 'phone', or 'email'");
      }
      
      const response = await authApi.register(registerData);
      console.log("Register response:", response);
      
      if (response.data?.token) {
        saveAuthToken(response.data.token);
      }
      
      if (response.data?.user) {
        // 使用normalizeUserData处理用户数据
        const normalizedUser = normalizeUserData(response.data.user);
        
        if (normalizedUser) {
          setUser(normalizedUser);
          console.log("Registration successful, normalized user:", normalizedUser);
          
          toast.success(response.message || "Registration successful");
          return normalizedUser;
        } else {
          throw new Error("注册成功但用户数据格式无效，请联系管理员");
        }
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
      try {
        // 合并当前用户数据和更新数据
        const updatedUserData = { ...user, ...userData };
        
        // 规范化更新后的用户数据
        const normalizedUser = normalizeUserData(updatedUserData);
        
        if (normalizedUser) {
          console.log("Updating user data:", normalizedUser);
          setUser(normalizedUser);
        } else {
          console.error("Invalid user data after update:", updatedUserData);
          // 仍然更新，但记录错误
          setUser(updatedUserData as User);
        }
      } catch (error) {
        console.error("Error updating user data:", error);
        // 简单更新，即使数据可能不是最规范的
        const updatedUser = { ...user, ...userData };
        setUser(updatedUser);
      }
    } else {
      console.warn("Attempted to update user data, but no user is logged in");
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

// 标准化用户数据的辅助函数
function normalizeUserData(userData: any): User | null {
  if (!userData) return null;
  
  try {
    // 确保必要字段存在
    if (!userData.uuid) {
      console.error("User data missing required uuid field:", userData);
      return null;
    }
    
    // 标准化用户数据，处理字段名不一致的问题
    return {
      ...userData,
      // 确保头像字段存在，优先使用avatar，否则使用avatar_url
      avatar: userData.avatar || userData.avatar_url,
      avatar_url: userData.avatar_url || userData.avatar,
      // 确保用户类型字段存在
      user_type: userData.user_type || userData.userType || 'user',
      // 确保用户名字段存在
      username: userData.username || userData.user_name,
      // 确保名称字段存在
      name: userData.name || userData.full_name
    };
  } catch (error) {
    console.error("Error normalizing user data:", error);
    return null;
  }
} 