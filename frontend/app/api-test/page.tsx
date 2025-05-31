"use client";

import { useState, useEffect } from "react";
import { authApi, userApi, saveAuthToken, getAuthToken } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ApiTestPage() {
  const [status, setStatus] = useState<string>("Checking API connection...");
  const [error, setError] = useState<string | null>(null);
  const [loginResult, setLoginResult] = useState<string | null>(null);
  
  useEffect(() => {
    const testApi = async () => {
      try {
        // Testing a simple API call
        const response = await fetch("/api/auth/login", {
          method: "OPTIONS",
        });
        
        if (response.ok) {
          setStatus(`API connection successful: ${response.status} ${response.statusText}`);
        } else {
          setStatus(`API connection failed: ${response.status} ${response.statusText}`);
          setError(`Failed to connect to API - status: ${response.status}`);
        }
      } catch (err: any) {
        setStatus("API connection failed with error");
        setError(err.message || "Unknown error");
        console.error("API test error:", err);
      }
    };

    testApi();
  }, []);

  const testLogin = async () => {
    try {
      setLoginResult("Testing login...");
      console.log("Testing login API via authApi.login method");
      
      const loginResponse = await authApi.login({
        method: "username",
        username: "testuser",
        password: "password123"
      });
      
      console.log("Login API response:", loginResponse);
      setLoginResult(JSON.stringify(loginResponse, null, 2));
      
      if (loginResponse.success && loginResponse.data?.user) {
        toast.success("Login successful!");
      } else {
        toast.error("Login failed: " + loginResponse.error);
      }
    } catch (err: any) {
      console.error("Login test error:", err);
      setLoginResult(`Error: ${err.message || JSON.stringify(err)}`);
      toast.error("Login test error: " + err.message);
    }
  };

  const testUserProfile = async () => {
    try {
      setLoginResult("Testing user profile API...");
      console.log("Testing userApi.getProfile method");
      
      const response = await userApi.getProfile();
      
      console.log("User profile API response:", response);
      setLoginResult(JSON.stringify(response, null, 2));
      
      if (response.success && response.data?.user) {
        toast.success("Profile fetched successfully!");
      } else {
        toast.error("Profile fetch failed: " + response.error);
      }
    } catch (err: any) {
      console.error("Profile test error:", err);
      setLoginResult(`Error: ${err.message || JSON.stringify(err)}`);
      toast.error("Profile test error: " + err.message);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Connection Test</h1>
      
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-bold">Status</h2>
        <p className={error ? "text-red-500" : "text-green-500"}>{status}</p>
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
      
      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-bold">API Configuration</h2>
        <p><strong>NEXT_PUBLIC_API_URL:</strong> {process.env.NEXT_PUBLIC_API_URL || "Not set"}</p>
        <p><strong>Default Fallback:</strong> http://localhost:8080/api</p>
      </div>

      <div className="mb-4 p-4 border rounded">
        <h2 className="text-xl font-bold">Test API Methods</h2>
        <div className="flex gap-2 mb-4">
          <Button onClick={testLogin} className="mb-2">Test Login API</Button>
          <Button onClick={testUserProfile} className="mb-2">Test User Profile</Button>
        </div>
        {loginResult && (
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {loginResult}
          </pre>
        )}
      </div>
      
      <div className="mb-4">
        <p className="text-gray-700">
          Ensure the backend server is running at http://localhost:8080 and CORS is properly configured.
        </p>
      </div>
    </div>
  );
} 