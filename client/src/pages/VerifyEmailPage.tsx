import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      // Auto-verify when token is present
      mutation.mutate(tokenParam);
    } else {
      // No token, redirect to login
      setLocation("/login");
    }
  }, [setLocation]);

  const mutation = useMutation({
    mutationFn: async (verifyToken: string) => {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: verifyToken }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to verify email");
      }
      
      return response.json();
    },
  });

  if (mutation.isPending) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-indigo-600 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verifying Your Email</h2>
            <p className="text-slate-600">Please wait...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
            <p className="text-slate-600 mb-6">
              Your email has been successfully verified. You can now access all features.
            </p>
            <Button onClick={() => setLocation("/login")} className="w-full">
              Go to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (mutation.isError) {
    return (
      <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Failed</h2>
            <p className="text-slate-600 mb-6">
              {mutation.error instanceof Error ? mutation.error.message : "The verification link is invalid or has expired."}
            </p>
            <div className="space-y-3">
              <Button onClick={() => setLocation("/login")} variant="outline" className="w-full">
                Go to Login
              </Button>
              <p className="text-sm text-slate-500">
                Need a new verification link?{" "}
                <button
                  onClick={() => setLocation("/login")}
                  className="text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Request from your profile
                </button>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return null;
}
