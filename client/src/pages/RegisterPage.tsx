import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { registerUser, loginUser } from "@/lib/stockApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [, setLocation] = useLocation();
  const { refetchUser } = useAuth();

  const mutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      // Register first
      await registerUser(username, password);
      // Then automatically log in
      return loginUser(username, password);
    },
    onSuccess: async () => {
      // Refresh user data and navigate
      await refetchUser();
      setLocation("/");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (username.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }

    mutation.mutate({ username, password });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              minLength={3}
            />
            <p className="text-xs text-slate-500 mt-1">At least 3 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Choose a password"
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-1">At least 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              required
            />
          </div>

          {mutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {mutation.error.message}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !username || !password || !confirmPassword}
          >
            {mutation.isPending ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-center mb-4">Already have an account?</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLocation("/login")}
          >
            Login
          </Button>
        </div>
      </Card>
    </div>
  );
}
