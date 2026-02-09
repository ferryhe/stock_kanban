import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import BacktestCenter from "@/pages/BacktestCenter";
import BacktestHistoryPage from "@/pages/BacktestHistoryPage";
import BacktestResultsPage from "@/pages/BacktestResultsPage";
import ComparePage from "@/pages/ComparePage";
import LiveTradingPage from "@/pages/LiveTradingPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import PortfoliosPage from "@/pages/PortfoliosPage";
import { useEffect } from "react";
import { LanguageProvider } from "./lib/i18n";
import { ErrorBoundary } from "./components/ErrorBoundary";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/backtest" component={BacktestCenter} />
      <Route path="/backtest/history" component={BacktestHistoryPage} />
      <Route path="/backtest/:id/results" component={BacktestResultsPage} />
      <Route path="/compare" component={ComparePage} />
      <Route path="/live" component={LiveTradingPage} />
      <Route path="/portfolios" component={PortfoliosPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Enforce dark mode by default for this fintech app
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}


export default App;
