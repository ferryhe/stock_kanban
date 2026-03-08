import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { loginUser } from "@/lib/stockApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();
  const { refetchUser } = useAuth();
  const { lang, setLang, t } = useI18n();

  const mutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginUser(email, password),
    onSuccess: async () => {
      await refetchUser();
      setLocation("/");
    },
    onError: (_error: unknown) => {
      // Error is handled by mutation.error display below
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ email, password });
  };
  
  const errorMessage =
    mutation.error instanceof Error
      ? mutation.error.message
      : mutation.error
        ? String(mutation.error)
        : "";

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
            onClick={() => setLocation("/")}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">{t("authAppName")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("authEmail") || "Email"}</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("loginEmailPlaceholder") || "your@email.com"}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPassword")}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("loginPasswordPlaceholder")}
              required
            />
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={() => setLocation("/forgot-password")}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {errorMessage}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending || !email || !password}>
            {mutation.isPending ? t("loginSubmitting") : t("loginSubmit")}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-center mb-4">{t("loginNoAccount")}</p>
          <Button variant="outline" className="w-full" onClick={() => setLocation("/register")}>
            {t("loginCreateAccount")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
