import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function LoginRequiredPage() {
  const { t } = useI18n();
  const [, navigate] = useLocation();

  // If user is already logged in, redirect to requested page
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if we should redirect (this will be handled by App.tsx re-rendering)
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-3 items-start">
            <Lock className="h-6 w-6 text-warning flex-shrink-0 mt-1" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Authentication Required</h1>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground mb-6">
            Please log in to access this page. If you don't have an account yet, you can register for free.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Go to Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="w-full px-4 py-2 border border-border bg-secondary/50 text-foreground rounded-lg font-medium hover:bg-secondary transition-colors"
            >
              Register Now
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Back to Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
