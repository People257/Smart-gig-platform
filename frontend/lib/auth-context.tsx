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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on initial load
  useEffect(() => {
    console.log("AUTH DEBUG - Initial auth check running on page load");
    
    // 在页面刷新或关闭前记录状态
    const handleBeforeUnload = () => {
      console.log("AUTH DEBUG - Page about to unload/refresh");
      // 在这里不要执行会阻止页面刷新的操作
      // 只记录调试信息
    };
    
    // 记录页面加载/刷新事件
    const recordPageLoad = () => {
      console.log("AUTH DEBUG - Page loaded/refreshed at:", new Date().toISOString());
      const token = getAuthToken();
      console.log("AUTH DEBUG - Token after page load:", token ? "存在" : "不存在", 
                 "长度:", token?.length || 0);
    };
    
    // 监听页面刷新/关闭事件
    window.addEventListener('beforeunload', handleBeforeUnload);
    // 记录页面加载
    recordPageLoad();
    
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Get auth token first and log its presence
        const token = getAuthToken();
        console.log("AUTH CHECK - Token found:", token ? "YES" : "NO", "Token length:", token?.length || 0);
        
        if (!token) {
          console.log("AUTH CHECK - No auth token found, checking localStorage for cached user data");
          
          // 尝试从localStorage恢复用户数据
          try {
            const cachedUserData = localStorage.getItem('user_data');
            if (cachedUserData) {
              console.log("AUTH CHECK - Found cached user data, attempting to use it");
              const userData = JSON.parse(cachedUserData);
              const normalizedUser = normalizeUserData(userData);
              
              if (normalizedUser) {
                console.log("AUTH CHECK - Using cached user data temporarily while validating with backend");
                // 临时设置用户，然后尝试重新获取新token
                setUser(normalizedUser);
                setIsAuthenticated(true);
                
                // 继续执行API调用以验证会话，但不立即退出函数
              } else {
                console.log("AUTH CHECK - Cached user data invalid, clearing it");
                localStorage.removeItem('user_data');
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
              }
            } else {
              console.log("AUTH CHECK - No auth token found, not authenticated");
              setUser(null);
              setIsAuthenticated(false);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error("AUTH CHECK - Error processing cached user data:", e);
            localStorage.removeItem('user_data');
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
        }
        
        console.log("AUTH CHECK - Attempting to verify token with backend...");
        try {
          console.log("AUTH CHECK - Calling getProfile API");
          const response = await userApi.getProfile();
          console.log("AUTH CHECK - API response:", response);
          
          if (response.success && response.data) {
            console.log("AUTH CHECK - Authentication successful, user data:", response.data);
            const normalizedUser = normalizeUserData(response.data);
            
            if (normalizedUser) {
              console.log("AUTH CHECK - User data normalized successfully");
              
              // 主动更新token持久存储
              const token = getAuthToken();
              if (token) {
                console.log("AUTH CHECK - Re-saving token to ensure persistence");
                saveAuthToken(token); 
              }
              
              setUser(normalizedUser);
              setIsAuthenticated(true);
              
              // 将用户信息也保存到localStorage以增强持久性
              try {
                localStorage.setItem('user_data', JSON.stringify(normalizedUser));
                console.log("AUTH CHECK - User data saved to localStorage");
              } catch (err) {
                console.error("AUTH CHECK - Failed to save user data to localStorage", err);
              }
            } else {
              console.error("AUTH CHECK - Failed to normalize user data");
              setUser(null);
              setIsAuthenticated(false);
              // 删除无效的token
              removeAuthToken();
              console.log("AUTH CHECK - Token removed due to normalization failure");
            }
          } else {
            console.log("AUTH CHECK - No user data returned from profile API or response not successful");
            console.log("AUTH CHECK - Response details:", JSON.stringify(response));
            setUser(null);
            setIsAuthenticated(false);
            // 删除无效的token
            removeAuthToken();
            console.log("AUTH CHECK - Token removed due to invalid API response");
          }
        } catch (error) {
          console.error("AUTH CHECK - Profile API call failed:", error);
          setUser(null);
          setIsAuthenticated(false);
          // 删除无效的token
          removeAuthToken();
          console.log("AUTH CHECK - Token removed due to API error");
        }
      } catch (error) {
        console.error("AUTH CHECK - Authentication check overall error:", error);
        setUser(null);
        setIsAuthenticated(false);
        removeAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    console.log("AUTH CHECK - Starting authentication check on page load/refresh");
    checkAuth();
    
    // Set up a periodic refresh to keep the session alive
    const refreshInterval = setInterval(() => {
      const token = getAuthToken();
      if (token) {
        console.log("TOKEN REFRESH - Starting periodic token refresh");
        userApi.getProfile()
          .then(response => {
            if (!response.success || !response.data) {
              console.log("TOKEN REFRESH - Failed: Invalid response", response);
              setUser(null);
              setIsAuthenticated(false);
              removeAuthToken();
            } else {
              console.log("TOKEN REFRESH - Successful");
            }
          })
          .catch(err => {
            console.log("TOKEN REFRESH - Failed with error:", err);
            // 如果API调用失败，清除认证状态
            setUser(null);
            setIsAuthenticated(false);
            removeAuthToken();
          });
      } else {
        console.log("TOKEN REFRESH - Skipped, no token found");
      }
    }, 5 * 60 * 1000); // Refresh every 5 minutes
    
    // 在组件卸载时移除事件监听
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(refreshInterval);
    };
  }, []);

  // Login function that handles both username and phone methods
  const login = async (loginData: any): Promise<User> => {
    try {
      setIsLoading(true);
      const response = await authApi.login(loginData);
      
      if (response.success && response.data) {
        // Auth token is already saved by the API function
        
        // 修复: 用户数据直接在response.data中，不再需要检查response.data.user
        console.log("LOGIN - User data received:", response.data);
        const normalizedUser = normalizeUserData(response.data);
        if (normalizedUser) {
          setUser(normalizedUser);
          setIsAuthenticated(true);
          
          // 保存用户数据到localStorage
          try {
            localStorage.setItem('user_data', JSON.stringify(normalizedUser));
          } catch (e) {
            console.error("Failed to save user data to localStorage", e);
          }
          
          return normalizedUser;
        }
        
        // 如果无法正常化用户数据，尝试重新获取
        try {
          const profileResponse = await userApi.getProfile();
          if (profileResponse.success && profileResponse.data) {
            const normalizedUser = normalizeUserData(profileResponse.data);
            if (normalizedUser) {
              setUser(normalizedUser);
              setIsAuthenticated(true);
              
              // 保存用户数据到localStorage
              try {
                localStorage.setItem('user_data', JSON.stringify(normalizedUser));
              } catch (e) {
                console.error("Failed to save user data to localStorage", e);
              }
              
              return normalizedUser;
            }
          }
        } catch (profileError) {
          console.error("Failed to fetch profile after login:", profileError);
        }
        
        throw new Error("无法获取用户信息");
      } else {
        throw new Error(response.error || "登录失败");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (registerData: any): Promise<User> => {
    try {
      setIsLoading(true);
      
      // 确保注册方式为username
      const finalRegisterData = {
        ...registerData,
        method: "username",
      };
      
      const response = await authApi.register(finalRegisterData);
      
      if (response.success && response.data) {
        // Auth token is already saved by the API function
        
        // 修复: 用户数据直接在response.data中，不再需要检查response.data.user
        console.log("REGISTER - User data received:", response.data);
        const normalizedUser = normalizeUserData(response.data);
        if (normalizedUser) {
          setUser(normalizedUser);
          setIsAuthenticated(true);
          
          // 保存用户数据到localStorage
          try {
            localStorage.setItem('user_data', JSON.stringify(normalizedUser));
          } catch (e) {
            console.error("Failed to save user data to localStorage", e);
          }
          
          return normalizedUser;
        }
        
        // 如果无法正常化用户数据，尝试重新获取
        try {
          const profileResponse = await userApi.getProfile();
          if (profileResponse.success && profileResponse.data) {
            const normalizedUser = normalizeUserData(profileResponse.data);
            if (normalizedUser) {
              setUser(normalizedUser);
              setIsAuthenticated(true);
              
              // 保存用户数据到localStorage
              try {
                localStorage.setItem('user_data', JSON.stringify(normalizedUser));
              } catch (e) {
                console.error("Failed to save user data to localStorage", e);
              }
              
              return normalizedUser;
            }
          }
        } catch (profileError) {
          console.error("Failed to fetch profile after registration:", profileError);
        }
        
        throw new Error("无法获取用户信息");
      } else {
        throw new Error(response.error || "注册失败");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      // Call API to logout (invalidate token on server)
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
      // Continue with logout even if API fails
    } finally {
      // Remove token and clear user data
      removeAuthToken();
      setUser(null);
      setIsAuthenticated(false);
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
        isAuthenticated,
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