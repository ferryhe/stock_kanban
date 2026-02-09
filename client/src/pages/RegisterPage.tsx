import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { registerUser, loginUser } from "@/lib/stockApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [, setLocation] = useLocation();
  const { refetchUser } = useAuth();
  const { lang, setLang, t } = useI18n();

  const mutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      await registerUser(username, password);
      return loginUser(username, password);
    },
    onSuccess: async () => {
      await refetchUser();
      setLocation("/");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert(t("registerPasswordMismatch"));
      return;
    }

    if (password.length < 6) {
      alert(t("registerPasswordTooShort"));
      return;
    }

    if (username.length < 3) {
      alert(t("registerUsernameTooShort"));
      return;
    }

    mutation.mutate({ username, password });
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
        <h1 className="text-2xl font-bold mb-6 text-center">{t("registerTitle")}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("authUsername")}</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("registerUsernamePlaceholder")}
              required
              minLength={3}
            />
            <p className="text-xs text-slate-500 mt-1">{t("registerUsernameHint")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("authPassword")}</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("registerPasswordPlaceholder")}
              required
              minLength={6}
            />
            <p className="text-xs text-slate-500 mt-1">{t("registerPasswordHint")}</p>
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
            disabled={mutation.isPending || !username || !password || !confirmPassword}
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
