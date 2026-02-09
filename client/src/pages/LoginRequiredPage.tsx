import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function LoginRequiredPage() {
  const { lang, setLang, t } = useI18n();
  const [, navigate] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Redirect state is handled by App.tsx auth-aware routing.
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-background">
      <button
        onClick={() => setLang(lang === "en" ? "zh" : "en")}
        className="absolute right-4 top-4 rounded-md border border-border bg-secondary/30 px-3 py-1 text-sm text-foreground hover:bg-secondary"
      >
        {t("langToggle")}
      </button>

      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-start">
            <Lock className="h-6 w-6 text-warning flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("loginRequiredTitle")}</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground mb-6">
            {t("loginRequiredDescription")}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              {t("loginRequiredGoToLogin")}
            </button>
            <button
              onClick={() => navigate("/register")}
              className="w-full px-4 py-2 border border-border bg-secondary/50 text-foreground rounded-lg font-medium hover:bg-secondary transition-colors"
            >
              {t("loginRequiredRegisterNow")}
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              {t("loginRequiredBackToHome")}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
