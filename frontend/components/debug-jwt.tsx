"use client";

import { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, RefreshCcwIcon } from "@/components/ui/icons";

interface JwtPayload {
  user_id: number;
  uuid: string;
  user_type: string;
  exp: number;
  iat: number;
}

export function DebugJwt() {
  const [token, setToken] = useState<string | null>(null);
  const [payload, setPayload] = useState<JwtPayload | null>(null);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [storageType, setStorageType] = useState<string>("");

  const refreshToken = () => {
    const authToken = getAuthToken();
    setToken(authToken);
    
    // 检测token存储位置
    if (authToken) {
      if (document.cookie.includes("auth_token=")) {
        setStorageType("Cookie");
      } else if (localStorage.getItem("auth_token")) {
        setStorageType("LocalStorage");
      } else {
        setStorageType("Unknown");
      }
      
      try {
        // 解析JWT (只解析payload部分，不验证签名)
        const parts = authToken.split('.');
        if (parts.length === 3) {
          // Base64解码payload部分
          const decodedPayload = JSON.parse(atob(parts[1]));
          setPayload(decodedPayload);
          
          // 检查是否过期
          const expiryDate = new Date(decodedPayload.exp * 1000);
          setIsExpired(expiryDate < new Date());
        }
      } catch (error) {
        console.error("Failed to parse JWT:", error);
        setPayload(null);
      }
    } else {
      setPayload(null);
      setIsExpired(false);
      setStorageType("");
    }
  };

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token)
        .then(() => {
          setIsCopied(true);
          toast.success("JWT copied to clipboard");
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(err => {
          console.error("Failed to copy token:", err);
          toast.error("Failed to copy token");
        });
    }
  };

  useEffect(() => {
    refreshToken();
    
    // 每分钟刷新一次，以更新过期状态
    const interval = setInterval(refreshToken, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!token) {
    return (
      <div className="p-4 border rounded-md bg-gray-50 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">JWT Token</h3>
          <Button size="sm" variant="outline" onClick={refreshToken}>
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Check Token
          </Button>
        </div>
        <p className="text-red-500 text-sm">No JWT token found. Please login first.</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-md bg-gray-50 mb-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-medium">JWT Token</h3>
          {storageType && (
            <span className="text-xs text-gray-500">Stored in {storageType}</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refreshToken}>
            <RefreshCcwIcon className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={copyToClipboard}
            className={isCopied ? "bg-green-100" : ""}
          >
            {isCopied ? (
              <CheckIcon className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <CopyIcon className="h-4 w-4 mr-2" />
            )}
            {isCopied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      
      <div className="bg-white p-2 rounded text-xs overflow-auto mb-2 max-h-24 border">
        <code className="whitespace-pre-wrap break-all">{token}</code>
      </div>
      
      {isExpired && (
        <p className="text-red-500 text-sm mb-2">This token is expired!</p>
      )}
      
      {payload && (
        <div className="mt-2">
          <h4 className="font-medium text-sm mb-1">Payload:</h4>
          <div className="bg-white p-2 rounded text-xs overflow-auto border">
            <pre>{JSON.stringify(payload, null, 2)}</pre>
          </div>
          <div className="mt-2 text-xs">
            <p>User ID: <span className="font-mono">{payload.user_id}</span></p>
            <p>UUID: <span className="font-mono">{payload.uuid}</span></p>
            <p>User Type: <span className="font-mono">{payload.user_type}</span></p>
            <p>Issued At: <span className="font-mono">{new Date(payload.iat * 1000).toLocaleString()}</span></p>
            <p>Expires At: <span className="font-mono">{new Date(payload.exp * 1000).toLocaleString()}</span></p>
          </div>
        </div>
      )}
    </div>
  );
} 