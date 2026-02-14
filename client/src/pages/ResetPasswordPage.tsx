import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      // Redirect if no token
      setLocation("/login");
    }
  }, [setLocation]);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 15;
    if (/[0-9]/.test(pwd)) strength += 20;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) strength += 25;
    return Math.min(strength, 100);
  };

  const passwordStrength = calculatePasswordStrength(password);
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const mutation = useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to reset password");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Success is handled in the render
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (passwordStrength < 60) {
      alert("Password is too weak. Please meet all requirements.");
      return;
    }

    mutation.mutate({ token, newPassword: password });
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 30) return "bg-red-500";
    if (strength < 60) return "bg-orange-500";
    if (strength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = (strength: number) => {
    if (strength < 30) return "Weak";
    if (strength < 60) return "Fair";
    if (strength < 80) return "Good";
    return "Strong";
  };

  if (mutation.isSuccess) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Password Reset Successful</h2>
            <p className="text-slate-600 mb-6">
              Your password has been successfully reset. You can now login with your new password.
            </p>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">Reset Your Password</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              required
              minLength={8}
            />
            
            {password && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-500">Password Strength:</span>
                  <span className={`text-xs font-medium ${
                    passwordStrength < 30 ? "text-red-600" :
                    passwordStrength < 60 ? "text-orange-600" :
                    passwordStrength < 80 ? "text-yellow-600" :
                    "text-green-600"
                  }`}>
                    {getStrengthLabel(passwordStrength)}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getStrengthColor(passwordStrength)} transition-all`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
                
                <div className="mt-2 space-y-1">
                  <div className="flex items-center text-xs">
                    {hasMinLength ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400 mr-1" />
                    )}
                    <span className={hasMinLength ? "text-green-600" : "text-slate-500"}>
                      At least 8 characters
                    </span>
                  </div>
                  <div className="flex items-center text-xs">
                    {hasUppercase ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400 mr-1" />
                    )}
                    <span className={hasUppercase ? "text-green-600" : "text-slate-500"}>
                      One uppercase letter
                    </span>
                  </div>
                  <div className="flex items-center text-xs">
                    {hasLowercase ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400 mr-1" />
                    )}
                    <span className={hasLowercase ? "text-green-600" : "text-slate-500"}>
                      One lowercase letter
                    </span>
                  </div>
                  <div className="flex items-center text-xs">
                    {hasNumber ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400 mr-1" />
                    )}
                    <span className={hasNumber ? "text-green-600" : "text-slate-500"}>
                      One number
                    </span>
                  </div>
                  <div className="flex items-center text-xs">
                    {hasSpecialChar ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 text-slate-400 mr-1" />
                    )}
                    <span className={hasSpecialChar ? "text-green-600" : "text-slate-500"}>
                      One special character (!@#$%...)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm New Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
            />
          </div>

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {mutation.error instanceof Error ? mutation.error.message : "An error occurred"}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !password || !confirmPassword || passwordStrength < 60}
          >
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-center">
            Remember your password?{" "}
            <button
              onClick={() => setLocation("/login")}
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Back to Login
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
