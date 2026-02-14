import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send reset email");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Always show success message to prevent email enumeration
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(email);
  };

  if (mutation.isSuccess) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Check Your Email</h2>
            <p className="text-slate-600 mb-6">
              If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              The link will expire in 1 hour.
            </p>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/login")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Forgot Password</h1>
        </div>

        <p className="text-slate-600 mb-6">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
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
            disabled={mutation.isPending || !email}
          >
            {mutation.isPending ? "Sending..." : "Send Reset Link"}
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
