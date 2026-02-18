import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [useToken, setUseToken] = useState(false);
  const [, setLocation] = useLocation();

  const mutation = useMutation({
    mutationFn: async ({ email, password, token }: { email?: string; password?: string; token?: string }) => {
      if (token) {
        // Token-based authentication
        const response = await fetch("/api/admin/auth/token", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Invalid admin token");
        }
        
        return response.json();
      } else {
        // Email/password authentication
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Login failed");
        }
        
        const data = await response.json();
        
        // Check if user has admin role
        if (!data.user?.role || !["admin", "superadmin"].includes(data.user.role)) {
          throw new Error("Access denied: Admin privileges required");
        }
        
        return data;
      }
    },
    onSuccess: async () => {
      setLocation("/admin/dashboard");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useToken) {
      mutation.mutate({ token: adminToken });
    } else {
      mutation.mutate({ email, password });
    }
  };

  const errorMessage =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? String(mutation.error)
        : "";

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <Card className="w-full max-w-md p-8 bg-slate-800 border-slate-700">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="mr-2 text-slate-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Shield className="h-6 w-6 text-indigo-400 mr-2" />
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <Button
            variant={!useToken ? "default" : "outline"}
            className="flex-1"
            onClick={() => setUseToken(false)}
          >
            Email Login
          </Button>
          <Button
            variant={useToken ? "default" : "outline"}
            className="flex-1"
            onClick={() => setUseToken(true)}
          >
            Token Login
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {useToken ? (
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-200">Admin Token</label>
              <Input
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Enter admin token"
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-200">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-200">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {errorMessage}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-indigo-600 hover:bg-indigo-700" 
            disabled={mutation.isPending || (useToken ? !adminToken : !email || !password)}
          >
            {mutation.isPending ? "Authenticating..." : "Sign In"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
