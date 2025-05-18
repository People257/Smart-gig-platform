"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authApi, userApi } from "./api";
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
  login: (username: string, password: string) => Promise<boolean>;
  loginWithPhone: (phoneNumber: string, verificationCode: string) => Promise<boolean>;
  register: (userType: "worker" | "employer", method: "username" | "phone", data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => false,
  loginWithPhone: async () => false,
  register: async () => false,
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
        const { success, data } = await userApi.getProfile();
        
        if (success && data?.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login with username and password
  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login({
        method: "username",
        username,
        password
      });
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success(response.message || "登录成功");
        return true;
      } else {
        toast.error(response.error || "登录失败");
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with phone and verification code
  const loginWithPhone = async (phoneNumber: string, verificationCode: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login({
        method: "phone",
        phone_number: phoneNumber,
        verification_code: verificationCode
      });
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success(response.message || "登录成功");
        return true;
      } else {
        toast.error(response.error || "登录失败");
        return false;
      }
    } catch (error) {
      console.error("Phone login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userType: "worker" | "employer", method: "username" | "phone", data: any) => {
    try {
      setIsLoading(true);
      
      const registerData = {
        user_type: userType,
        method,
        ...method === "username" 
          ? { username: data.username, password: data.password }
          : { phone_number: data.phoneNumber, verification_code: data.verificationCode }
      };
      
      const response = await authApi.register(registerData);
      
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        toast.success(response.message || "注册成功");
        return true;
      } else {
        toast.error(response.error || "注册失败");
        return false;
      }
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      const { success, message } = await authApi.logout();
      
      if (success) {
        setUser(null);
        toast.success(message || "已成功退出登录");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update user data function
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        loginWithPhone,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
} 