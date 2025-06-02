import React, { useState } from 'react';
import { userApi } from '../lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RealNameAuthFormProps {
  onSuccess?: () => void;
}

const RealNameAuthForm: React.FC<RealNameAuthFormProps> = ({ onSuccess }) => {
  const [realName, setRealName] = useState('');
  const [idCard, setIdCard] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!realName.trim()) {
      setError('请输入真实姓名');
      return;
    }
    
    if (realName.trim().length < 2 || realName.trim().length > 20) {
      setError('姓名长度应为2-20个字符');
      return;
    }
    
    if (!idCard.trim() || idCard.trim().length !== 18) {
      setError('身份证号必须为18位');
      return;
    }
    
    try {
      setLoading(true);
      const response = await userApi.realNameAuth({ 
        real_name: realName, 
        id_card: idCard 
      });
      
      if (response.success) {
        setSuccess('实名认证成功');
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        setError(response.error || '认证失败，请稍后再试');
      }
    } catch (err) {
      setError('提交数据时出错，请稍后再试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>实名认证</CardTitle>
        <CardDescription>
          请填写您的真实姓名和身份证号码进行认证，实名认证后才能申请任务。
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="realName">真实姓名</Label>
            <Input 
              id="realName"
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
              placeholder="请输入您的真实姓名"
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="idCard">身份证号</Label>
            <Input 
              id="idCard"
              value={idCard}
              onChange={(e) => setIdCard(e.target.value)}
              placeholder="请输入您的18位身份证号"
              maxLength={18}
              disabled={loading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? "提交中..." : "提交认证"}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start text-sm text-gray-500">
        <p className="font-semibold mb-2">注意：</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>请确保填写的身份信息真实有效</li>
          <li>您的个人信息将被安全加密存储</li>
          <li>实名信息将用于任务申请与结算</li>
        </ul>
      </CardFooter>
    </Card>
  );
};

export default RealNameAuthForm; 