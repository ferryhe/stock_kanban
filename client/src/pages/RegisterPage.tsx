import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { registerUser, loginUser } from "@/lib/stockApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [, setLocation] = useLocation();
  const { refetchUser } = useAuth();
  const { lang, setLang, t } = useI18n();

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
    mutationFn: async ({ email, password, displayName }: { email: string; password: string; displayName?: string }) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      // Show success message about email verification
      alert(data.message || "Registration successful! Please check your email to verify your account.");
      // Redirect to login
      setLocation("/login");
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

    mutation.mutate({ email, password, displayName: displayName || undefined });
  };

  const errorMessage =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? String(mutation.error)
        : "";

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

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <button
        onClick={() => setLang(lang === "en" ? "zh" : "en")}
        className="absolute right-4 top-4 rounded-md border border-slate-300 bg-white/90 px-3 py-1 text-sm text-slate-700 hover:bg-white"
      >
        {t("langToggle")}
      </button>

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
          <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
        </div>

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
            <p className="text-xs text-slate-500 mt-1">We'll send a verification email</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Display Name (Optional)</label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you want to be called"
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty for a random code</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPassword")}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("registerPasswordPlaceholder")}
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
            <label className="block text-sm font-medium mb-1">{t("registerConfirmPassword")}</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("registerConfirmPasswordPlaceholder")}
              required
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={mutation.isPending || !email || !password || !confirmPassword || passwordStrength < 60}
          >
            {mutation.isPending ? t("registerSubmitting") : t("registerSubmit")}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-center mb-4">{t("registerHasAccount")}</p>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/login")}>
            {t("registerLogin")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
